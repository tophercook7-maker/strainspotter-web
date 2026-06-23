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

// Load local secrets (dev only; harmless when the suite is skipped).
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const REAL_DIR = path.resolve("data/real");
const REPORT_DIR = path.resolve("data/eval");
const MIME: Record<string, string> = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" };

type Candidate = { slug: string; strainName: string; confidence: number };

function labeledImages(): { strain: string; file: string }[] {
  if (!existsSync(REAL_DIR)) return [];
  const out: { strain: string; file: string }[] = [];
  for (const dir of readdirSync(REAL_DIR, { withFileTypes: true })) {
    if (!dir.isDirectory()) continue;
    // Skip iCloud "* 2" duplicate folders; canonical slug is the trimmed name.
    if (/\s\d+$/.test(dir.name)) continue;
    const strain = slugify(dir.name);
    const folder = path.join(REAL_DIR, dir.name);
    for (const f of readdirSync(folder)) {
      if (MIME[path.extname(f).toLowerCase()]) out.push({ strain, file: path.join(folder, f) });
    }
  }
  return out;
}

async function analyze(file: string): Promise<Candidate[]> {
  const ext = path.extname(file).toLowerCase();
  const dataUrl = `data:${MIME[ext]};base64,${readFileSync(file).toString("base64")}`;
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: JSON.stringify({
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
    }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const content = (await res.json()).choices?.[0]?.message?.content ?? "{}";
  const normalized = normalizeAnalysis(JSON.parse(content), undefined);
  return (normalized.candidates as Candidate[]) ?? [];
}

describe.skipIf(!process.env.RUN_SCAN_EVAL)("scanner accuracy (paid eval)", () => {
  it(
    "measures top-1 / top-3 against data/real",
    async () => {
      const cap = Number(process.env.MAX_EVAL_IMAGES ?? 40);
      const images = labeledImages().slice(0, cap);
      expect(images.length).toBeGreaterThan(0);

      let top1 = 0;
      let top3 = 0;
      const rows: Record<string, unknown>[] = [];
      for (const { strain, file } of images) {
        const cands = await analyze(file);
        const slugs = cands.map((c) => c.slug);
        const hit1 = slugs[0] === strain;
        const hit3 = slugs.slice(0, 3).includes(strain);
        if (hit1) top1++;
        if (hit3) top3++;
        rows.push({ file: path.basename(file), expected: strain, top: slugs.slice(0, 3), conf: cands[0]?.confidence ?? 0, hit1, hit3 });
        // eslint-disable-next-line no-console
        console.log(`${hit1 ? "✓" : hit3 ? "~" : "✗"} ${strain} <- ${path.basename(file)} | got: ${slugs.slice(0, 3).join(", ") || "(none)"} (${cands[0]?.confidence ?? 0}%)`);
      }

      const n = images.length;
      const report = {
        ranAt: new Date().toISOString(),
        model: "gpt-4o",
        images: n,
        strains: new Set(images.map((i) => i.strain)).size,
        top1Accuracy: +(top1 / n).toFixed(3),
        top3Accuracy: +(top3 / n).toFixed(3),
        estimatedCostUsd: +(n * 0.02).toFixed(2),
        rows,
      };
      mkdirSync(REPORT_DIR, { recursive: true });
      writeFileSync(path.join(REPORT_DIR, "scan-eval-report.json"), JSON.stringify(report, null, 2));
      // eslint-disable-next-line no-console
      console.log(`\n=== BASELINE: top-1 ${(report.top1Accuracy * 100).toFixed(0)}% · top-3 ${(report.top3Accuracy * 100).toFixed(0)}% over ${n} images / ${report.strains} strains · ~$${report.estimatedCostUsd} ===`);

      expect(n).toBeGreaterThan(0);
    },
    300_000,
  );
});
