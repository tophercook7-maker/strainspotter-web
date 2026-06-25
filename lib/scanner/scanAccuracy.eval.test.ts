/**
 * Production scanner accuracy eval (Phase 1 keystone — ROADMAP §Phase 1).
 *
 * Measures the REAL /api/scan model path (same SYSTEM_PROMPT + buildUserPrompt +
 * normalizeAnalysis the route uses) against labeled photos in data/real/<slug>/,
 * reporting top-1 / top-3 accuracy.
 *
 * Makes PAID OpenAI calls, so it is GATED: it only runs when RUN_SCAN_EVAL=1.
 * In CI (env unset) the whole suite is skipped → zero cost, zero flake.
 *
 *   RUN_SCAN_EVAL=1 npx vitest run lib/scanner/scanAccuracy.eval.test.ts
 *
 * Budget guard: caps total images via MAX_EVAL_IMAGES (default 40).
 */
import { existsSync, readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import dotenv from "dotenv";
import { SYSTEM_PROMPT, buildUserPrompt, normalizeAnalysis, slugify } from "@/app/api/scan/route";
import strainDb from "@/lib/data/strains.json";

// Load local secrets (dev only; harmless when the suite is skipped).
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

// Dataset of labeled images, organized as <dir>/<strain-slug>/<image> (and
// optionally <strain-slug>/buds/<image>). Configurable so we can point at the
// reference cache, the raw dataset, or a curated holdout.
//   DATASET_DIR     default data/real
//   PER_STRAIN      max images per strain (default 3)
//   FILTER_CATALOG  "1" → only strains the model's catalog knows (fair eval)
const DATASET_DIR = path.resolve(process.env.DATASET_DIR ?? "data/real");
const PER_STRAIN = Number(process.env.PER_STRAIN ?? 3);
const FILTER_CATALOG = process.env.FILTER_CATALOG === "1";
const REPORT_DIR = path.resolve("data/eval");
const MIME: Record<string, string> = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" };

type Candidate = { slug: string; strainName: string; confidence: number };

const CATALOG = new Set((strainDb as { name: string }[]).map((s) => slugify(s.name)));

function imagesIn(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => MIME[path.extname(f).toLowerCase()])
    .map((f) => path.join(dir, f));
}

function labeledImages(): { strain: string; file: string }[] {
  if (!existsSync(DATASET_DIR)) return [];
  const out: { strain: string; file: string }[] = [];
  for (const dir of readdirSync(DATASET_DIR, { withFileTypes: true })) {
    if (!dir.isDirectory()) continue;
    if (/\s\d+$/.test(dir.name)) continue; // skip iCloud "* 2" dup folders
    const strain = slugify(dir.name.replace(/_/g, " "));
    if (FILTER_CATALOG && !CATALOG.has(strain)) continue;
    const folder = path.join(DATASET_DIR, dir.name);
    const files = [...imagesIn(folder), ...imagesIn(path.join(folder, "buds"))].slice(0, PER_STRAIN);
    for (const file of files) out.push({ strain, file });
  }
  return out;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function analyze(file: string): Promise<Candidate[]> {
  const ext = path.extname(file).toLowerCase();
  const dataUrl = `data:${MIME[ext]};base64,${readFileSync(file).toString("base64")}`;
  const body = JSON.stringify({
    model: "gpt-4o",
    response_format: { type: "json_object" },
    temperature: 0.2,
    max_tokens: 1800,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: [
          { type: "text", text: buildUserPrompt(1) },
          { type: "image_url", image_url: { url: dataUrl, detail: "high" } },
        ],
      },
    ],
  });

  // Retry on rate-limit / transient errors with exponential backoff (low-tier
  // OpenAI accounts have tight per-minute vision limits).
  for (let attempt = 0; attempt < 8; attempt++) {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body,
    });
    if (res.ok) {
      const content = (await res.json()).choices?.[0]?.message?.content ?? "{}";
      return (normalizeAnalysis(JSON.parse(content), undefined).candidates as Candidate[]) ?? [];
    }
    if (res.status === 429 || res.status >= 500) {
      const retryAfter = Number(res.headers.get("retry-after")) || 0;
      const wait = retryAfter ? retryAfter * 1000 : Math.min(5000 * 2 ** attempt, 60000);
      // eslint-disable-next-line no-console
      console.log(`   ⏳ ${res.status} — backing off ${Math.round(wait / 1000)}s (attempt ${attempt + 1}/8)`);
      await sleep(wait);
      continue;
    }
    throw new Error(`OpenAI ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  throw new Error("OpenAI: exhausted retries (still rate-limited)");
}

describe.skipIf(!process.env.RUN_SCAN_EVAL)("scanner accuracy (paid eval)", () => {
  it(
    "measures top-1 / top-3 against data/real",
    async () => {
      const cap = Number(process.env.MAX_EVAL_IMAGES ?? 40);
      const images = labeledImages().slice(0, cap);
      expect(images.length).toBeGreaterThan(0);

      mkdirSync(REPORT_DIR, { recursive: true });
      const reportPath = path.join(REPORT_DIR, "scan-eval-report.json");
      const delay = Number(process.env.EVAL_DELAY_MS ?? 1500);
      let top1 = 0;
      let top3 = 0;
      let stoppedEarly = false;
      const rows: Record<string, unknown>[] = [];

      const writeReport = () => {
        const n = rows.length || 1;
        writeFileSync(
          reportPath,
          JSON.stringify(
            {
              ranAt: new Date().toISOString(),
              model: "gpt-4o",
              dataset: path.basename(DATASET_DIR),
              filterCatalog: FILTER_CATALOG,
              perStrain: PER_STRAIN,
              requested: images.length,
              images: rows.length,
              stoppedEarly,
              strains: new Set(rows.map((r) => r.expected)).size,
              top1Accuracy: +(top1 / n).toFixed(3),
              top3Accuracy: +(top3 / n).toFixed(3),
              estimatedCostUsd: +(rows.length * 0.02).toFixed(2),
              rows,
            },
            null,
            2,
          ),
        );
      };

      for (const { strain, file } of images) {
        let cands: Candidate[];
        try {
          cands = await analyze(file);
        } catch (e) {
          stoppedEarly = true;
          // eslint-disable-next-line no-console
          console.log(`⚠ stopping early after ${rows.length} images: ${(e as Error).message}`);
          break;
        }
        const slugs = cands.map((c) => c.slug);
        const hit1 = slugs[0] === strain;
        const hit3 = slugs.slice(0, 3).includes(strain);
        if (hit1) top1++;
        if (hit3) top3++;
        rows.push({ file: path.basename(file), expected: strain, top: slugs.slice(0, 3), conf: cands[0]?.confidence ?? 0, hit1, hit3 });
        // eslint-disable-next-line no-console
        console.log(`${hit1 ? "✓" : hit3 ? "~" : "✗"} ${strain} <- ${path.basename(file)} | got: ${slugs.slice(0, 3).join(", ") || "(none)"} (${cands[0]?.confidence ?? 0}%)`);
        writeReport(); // incremental: survives a rate-limit cutoff
        await sleep(delay);
      }

      const n = rows.length || 1;
      // eslint-disable-next-line no-console
      console.log(`\n=== BASELINE: top-1 ${((top1 / n) * 100).toFixed(0)}% · top-3 ${((top3 / n) * 100).toFixed(0)}% over ${rows.length} images / ${new Set(rows.map((r) => r.expected)).size} strains${stoppedEarly ? " (stopped early on rate limit)" : ""} · ~$${(rows.length * 0.02).toFixed(2)} ===`);
      expect(rows.length).toBeGreaterThan(0);
    },
    3_600_000, // up to 60 min — slow pacing for low-tier rate limits
  );
});
