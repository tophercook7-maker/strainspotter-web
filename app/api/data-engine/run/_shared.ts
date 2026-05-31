import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { join } from "node:path";
import { NextResponse } from "next/server";
import { dataEnginePaths } from "@/lib/data-engine/dataPaths";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROOT = process.cwd();
const VAULT_INDEX_PATH = dataEnginePaths.vaultIndexPath();
const COVERAGE_PATH = dataEnginePaths.coverageReportPath();
const PREFILTER_REPORT_PATH = dataEnginePaths.prefilterReportPath();
const REVIEW_MANIFEST_PATH = dataEnginePaths.reviewManifestPath();
const REVIEW_PREFERENCES_PATH = dataEnginePaths.reviewPreferencesPath();
const EMBEDDINGS_PATH = join(dataEnginePaths.projectDataRoot, "embeddings", "strain-embeddings.json");

type PipelineStep =
  | "index-vault"
  | "prefilter"
  | "review"
  | "learn"
  | "build-embeddings"
  | "audit";

type PipelineRun = {
  step: PipelineStep;
  startedAt: string;
};

type PipelineGlobal = typeof globalThis & {
  __strainspotterPipelineRun?: PipelineRun | null;
};

type RunOptions = {
  step: PipelineStep;
  label: string;
  command: string;
  args: string[];
  timeoutMs?: number;
};

function localOnly() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Data engine is local-only." }, { status: 404 });
  }
  return null;
}

async function readJson(path: string, fallback: any) {
  if (!existsSync(path)) return fallback;
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch {
    return fallback;
  }
}

function sanitizeText(value: string) {
  return value
    .replaceAll(ROOT, ".")
    .replace(/\/Volumes\/[^\s"'`]+/g, "[vault]")
    .replace(/\/Users\/[^\s"'`]+/g, "[local]");
}

function summarizeOutput(stdout: string, stderr: string) {
  const text = sanitizeText([stdout, stderr].filter(Boolean).join("\n"));
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(-40);
}

async function summaryForStep(step: PipelineStep) {
  if (step === "index-vault") {
    const index = await readJson(VAULT_INDEX_PATH, { totalImages: 0, items: [] });
    return {
      indexedImages: Number(index.totalImages ?? index.items?.length ?? 0),
      guessedStrains: new Set((index.items ?? []).map((item: any) => item.guessedStrainSlug).filter(Boolean)).size,
    };
  }

  if (step === "prefilter") {
    const report = await readJson(PREFILTER_REPORT_PATH, {});
    return {
      indexedImagesProcessed: Number(report.indexedImagesProcessed ?? 0),
      candidatesKeptForReview: Number(report.candidatesKeptForReview ?? 0),
      glossyBadAutoRejected: Number(report.glossyBadAutoRejected ?? 0),
      nonTargetImagesSkipped: Number(report.nonTargetImagesSkipped ?? 0),
    };
  }

  if (step === "review") {
    const manifest = await readJson(REVIEW_MANIFEST_PATH, { items: [] });
    const items = Array.isArray(manifest.items) ? manifest.items : [];
    return {
      trainingApprovals: items.filter((item: any) => item.approvedForTraining === true).length,
      evalApprovals: items.filter((item: any) => item.approvedForEval === true).length,
      rejected: items.filter((item: any) => item.rejectReason).length,
    };
  }

  if (step === "learn") {
    const preferences = await readJson(REVIEW_PREFERENCES_PATH, {
      approvedSignals: {},
      rejectedSignals: {},
      sourceScores: {},
      summaries: {},
    });
    return {
      approvedSignals: Object.keys(preferences.approvedSignals ?? {}).length,
      rejectedSignals: Object.keys(preferences.rejectedSignals ?? {}).length,
      trustedSources: Object.values(preferences.sourceScores ?? {}).filter((row: any) => Number(row.weight ?? 0) > 0).length,
      approvedPatterns: preferences.summaries?.approvedPatterns ?? [],
      rejectedPatterns: preferences.summaries?.rejectedPatterns ?? [],
    };
  }

  if (step === "build-embeddings") {
    const embeddings = await readJson(EMBEDDINGS_PATH, { strains: [] });
    const strains = Array.isArray(embeddings.strains) ? embeddings.strains : [];
    return {
      embeddedStrains: strains.length,
      embeddedImages: strains.reduce((sum: number, row: any) => sum + Number(row.imageCount ?? 0), 0),
      model: embeddings.model ?? null,
    };
  }

  const coverage = await readJson(COVERAGE_PATH, {});
  return {
    targetStrains: Number(coverage.targetCount ?? 0),
    trainingStrains: Number(coverage.totalTrainingStrains ?? 0),
    trainingImages: Number(coverage.totalTrainingImages ?? 0),
    evalImages: Number(coverage.totalEvalImages ?? 0),
    missingTrainingTargets: Array.isArray(coverage.targetStrainsMissingTrainingData)
      ? coverage.targetStrainsMissingTrainingData.length
      : 0,
  };
}

export async function getVaultRoot() {
  const fromEnv = process.env.DATA_ENGINE_VAULT_ROOT || process.env.STRAINSPOTTER_VAULT_ROOT;
  if (fromEnv) return fromEnv;
  const index = await readJson(VAULT_INDEX_PATH, {});
  return typeof index.root === "string" ? index.root : null;
}

export async function runPipelineStep(options: RunOptions) {
  const blocked = localOnly();
  if (blocked) return blocked;

  const globalState = globalThis as PipelineGlobal;
  if (globalState.__strainspotterPipelineRun) {
    return NextResponse.json(
      {
        status: "error",
        error: `${globalState.__strainspotterPipelineRun.step} is already running.`,
        running: globalState.__strainspotterPipelineRun,
      },
      { status: 409 }
    );
  }

  const startedAt = new Date().toISOString();
  globalState.__strainspotterPipelineRun = { step: options.step, startedAt };

  try {
    const result = await new Promise<{
      code: number | null;
      stdout: string;
      stderr: string;
      timedOut: boolean;
    }>((resolve) => {
      const child = spawn(options.command, options.args, {
        cwd: ROOT,
        env: process.env,
      });
      let stdout = "";
      let stderr = "";
      let timedOut = false;
      const timeout = setTimeout(() => {
        timedOut = true;
        child.kill("SIGTERM");
      }, options.timeoutMs ?? 10 * 60 * 1000);

      child.stdout.on("data", (chunk) => {
        stdout += String(chunk);
      });
      child.stderr.on("data", (chunk) => {
        stderr += String(chunk);
      });
      child.on("close", (code) => {
        clearTimeout(timeout);
        resolve({ code, stdout, stderr, timedOut });
      });
    });

    const finishedAt = new Date().toISOString();
    const ok = result.code === 0 && !result.timedOut;
    return NextResponse.json(
      {
        status: ok ? "success" : "error",
        step: options.step,
        label: options.label,
        startedAt,
        finishedAt,
        summary: ok ? await summaryForStep(options.step) : null,
        output: summarizeOutput(result.stdout, result.stderr),
        error: ok
          ? null
          : result.timedOut
            ? `${options.label} timed out.`
            : `${options.label} exited with code ${result.code}.`,
      },
      { status: ok ? 200 : 500 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        step: options.step,
        label: options.label,
        startedAt,
        finishedAt: new Date().toISOString(),
        summary: null,
        output: [],
        error: error instanceof Error ? sanitizeText(error.message) : "Pipeline step failed.",
      },
      { status: 500 }
    );
  } finally {
    globalState.__strainspotterPipelineRun = null;
  }
}
