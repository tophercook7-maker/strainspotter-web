import crypto from "node:crypto";
import { createRequire } from "node:module";
import { promises as fs } from "node:fs";
import path from "node:path";

const require = createRequire(import.meta.url);
const storagePaths = require("../server/storagePaths.js") as {
  getTrainingImageStorageRoot: () => string;
  ensureStorageDirs: () => void;
};

const trainingRoot = () => path.join(process.cwd(), "data", "scanner-training");
export const confirmedScansJsonlPath = () =>
  path.join(trainingRoot(), "confirmed-scans.jsonl");

export type ConfirmedScanTrainingRecord = {
  scanId: string;
  createdAt: string;
  confirmedAt: string;
  correctStrainSlug: string;
  correctStrainName: string;
  previousTopMatches: unknown[];
  previousRank: number | null;
  previousConfidence: number | null;
  imageLocalPath: string;
  imageHash: string;
  visualTraits: Record<string, unknown>;
  embeddingNearestNeighbors: unknown[];
  provider: string;
  model: string;
  source: "user_feedback";
  wrongTopMatchSlug?: string | null;
  trainingWarnings?: string[];
};

function extFromContentType(ct: string): string {
  const m = ct.toLowerCase();
  if (m.includes("png")) return "png";
  if (m.includes("webp")) return "webp";
  return "jpg";
}

function slimTopMatches(matches: unknown[]): unknown[] {
  return matches.slice(0, 8).map((m) => {
    if (!m || typeof m !== "object") return m;
    const o = m as Record<string, unknown>;
    return {
      slug: o.slug,
      name: o.name,
      rank: o.rank,
      confidence: o.confidence,
    };
  });
}

export async function appendConfirmedScanTraining(input: {
  scanId: string | null;
  correctStrainSlug: string;
  correctStrainName: string;
  predictedTopMatches: unknown[];
  visualTraits: Record<string, unknown>;
  embeddingNearestNeighbors: unknown[];
  provider: string | null;
  model: string | null;
  trainingImageBase64?: string | null;
  trainingImageContentType?: string | null;
  wrongTopMatchSlug?: string | null;
  previousRank: number | null;
  previousConfidence: number | null;
  scanCreatedAt?: string | null;
}): Promise<{ warnings: string[]; imageSaved: boolean }> {
  const warnings: string[] = [];
  const confirmedAt = new Date().toISOString();
  let imageLocalPath = "";
  let imageHash = "";

  const slugSafe = input.correctStrainSlug.replace(/[^a-z0-9-]/g, "") || "unknown";

  if (input.trainingImageBase64 && input.trainingImageContentType) {
    try {
      storagePaths.ensureStorageDirs();
      const raw = input.trainingImageBase64
        .replace(/^data:[^;]+;base64,/i, "")
        .replace(/\s/g, "");
      const buf = Buffer.from(raw, "base64");
      if (buf.length > 0) {
        imageHash = crypto.createHash("sha256").update(buf).digest("hex");
        const ext = extFromContentType(input.trainingImageContentType);
        const trainingImagesRoot = storagePaths.getTrainingImageStorageRoot();
        const abs = path.join(trainingImagesRoot, slugSafe, `${imageHash}.${ext}`);
        await fs.mkdir(path.dirname(abs), { recursive: true });
        await fs.writeFile(abs, buf);
        imageLocalPath = abs;
      }
    } catch {
      warnings.push("Failed to persist training image copy.");
    }
  }

  if (!imageLocalPath) {
    warnings.push("No scan image available for training image store.");
  }

  const record: ConfirmedScanTrainingRecord = {
    scanId: input.scanId ?? "",
    createdAt: input.scanCreatedAt ?? confirmedAt,
    confirmedAt,
    correctStrainSlug: input.correctStrainSlug,
    correctStrainName: input.correctStrainName,
    previousTopMatches: slimTopMatches(input.predictedTopMatches),
    previousRank: input.previousRank,
    previousConfidence: input.previousConfidence,
    imageLocalPath,
    imageHash,
    visualTraits: input.visualTraits,
    embeddingNearestNeighbors: input.embeddingNearestNeighbors,
    provider: input.provider ?? "",
    model: input.model ?? "",
    source: "user_feedback",
    wrongTopMatchSlug: input.wrongTopMatchSlug ?? null,
    ...(warnings.length ? { trainingWarnings: warnings } : {}),
  };

  await fs.mkdir(trainingRoot(), { recursive: true });
  await fs.appendFile(confirmedScansJsonlPath(), `${JSON.stringify(record)}\n`, "utf8");
  return { warnings, imageSaved: Boolean(imageLocalPath) };
}
