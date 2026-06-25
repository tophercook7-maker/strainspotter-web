/**
 * Image-grounding A/B (Phase 1 — ROADMAP §Phase 1, experiment #1).
 *
 * Instead of feeding the VLM a text shortlist, feed it the actual REFERENCE
 * PHOTOS of the top-K retrieved strains so it can visually compare. Query image
 * at detail:high; reference images at detail:low (token/rate-limit control).
 * Leakage-free leave-one-out (query never in the index it's retrieved against).
 *
 * Compares, per query: ungrounded GPT-4o  vs  image-grounded GPT-4o.
 * Paid + gated behind RUN_SCAN_EVAL.
 *   RUN_SCAN_EVAL=1 npx vitest run lib/scanner/imageGrounding.eval.test.ts
 *   knobs: MAX_STRAINS (15), REFS_PER_STRAIN (4), TOPK (4), EVAL_DELAY_MS (5000)
 */
import { existsSync, readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import dotenv from "dotenv";
import { SYSTEM_PROMPT, buildUserPrompt, normalizeAnalysis, slugify } from "@/app/api/scan/route";
import { getImageEmbedding } from "@/lib/scanner/embeddingService";
import strainDb from "@/lib/data/strains.json";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const CACHE = path.resolve("data/strain-reference-images/cache");
const REPORT_DIR = path.resolve("data/eval");
const MIME: Record<string, string> = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" };
const CATALOG = new Set((strainDb as { name: string }[]).map((s) => slugify(s.name)));
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const MAX_STRAINS = Number(process.env.MAX_STRAINS ?? 15);
const REFS_PER_STRAIN = Number(process.env.REFS_PER_STRAIN ?? 4);
const TOPK = Number(process.env.TOPK ?? 4);
const DELAY = Number(process.env.EVAL_DELAY_MS ?? 5000);

const toDataUrl = (f: string) => `data:${MIME[path.extname(f).toLowerCase()]};base64,${readFileSync(f).toString("base64")}`;
const cosine = (a: number[], b: number[]) => { let d = 0; for (let i = 0; i < a.length; i++) d += a[i]! * b[i]!; return d; };

type Ref = { name: string; dataUrl: string };

async function gpt(queryUrl: string, refs?: Ref[]): Promise<{ slug: string }[]> {
  let text = buildUserPrompt(1);
  const content: unknown[] = [];
  if (refs?.length) {
    text +=
      "\n\nThe FIRST image is the photo to identify. The images after it are REFERENCE photos of candidate strains found by visual similarity (each labeled). Compare the first image to them: if it clearly matches one, prefer that strain; if none fit, use your own judgment.";
    content.push({ type: "text", text });
    content.push({ type: "image_url", image_url: { url: queryUrl, detail: "high" } });
    for (const r of refs) {
      content.push({ type: "text", text: `Reference — ${r.name}:` });
      content.push({ type: "image_url", image_url: { url: r.dataUrl, detail: "low" } });
    }
  } else {
    content.push({ type: "text", text });
    content.push({ type: "image_url", image_url: { url: queryUrl, detail: "high" } });
  }
  const body = JSON.stringify({ model: "gpt-4o", response_format: { type: "json_object" }, temperature: 0.2, max_tokens: 1800, messages: [{ role: "system", content: SYSTEM_PROMPT }, { role: "user", content }] });
  for (let attempt = 0; attempt < 8; attempt++) {
    const res = await fetch("https://api.openai.com/v1/chat/completions", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY}` }, body });
    if (res.ok) {
      const c = (await res.json()).choices?.[0]?.message?.content ?? "{}";
      return (normalizeAnalysis(JSON.parse(c), undefined).candidates as { slug: string }[]) ?? [];
    }
    if (res.status === 429 || res.status >= 500) {
      const wait = Math.min(5000 * 2 ** attempt, 60000);
      // eslint-disable-next-line no-console
      console.log(`   ⏳ ${res.status} backoff ${Math.round(wait / 1000)}s`);
      await sleep(wait);
      continue;
    }
    throw new Error(`OpenAI ${res.status}: ${(await res.text()).slice(0, 160)}`);
  }
  throw new Error("OpenAI: exhausted retries");
}

describe.skipIf(!process.env.RUN_SCAN_EVAL)("image grounding A/B", () => {
  it(
    "ungrounded vs image-grounded (leave-one-out)",
    async () => {
      const strains: { slug: string; files: string[] }[] = [];
      if (existsSync(CACHE)) {
        for (const d of readdirSync(CACHE, { withFileTypes: true })) {
          if (!d.isDirectory() || !CATALOG.has(d.name)) continue;
          const files = readdirSync(path.join(CACHE, d.name)).filter((f) => MIME[path.extname(f).toLowerCase()]).map((f) => path.join(CACHE, d.name, f));
          if (files.length >= 3) strains.push({ slug: d.name, files });
        }
      }
      const chosen = strains.slice(0, MAX_STRAINS);
      expect(chosen.length).toBeGreaterThan(0);
      // eslint-disable-next-line no-console
      console.log(`Embedding reference index (local CLIP) for ${chosen.length} strains…`);

      // Index entries keep a file path so a retrieved strain can supply a ref image.
      const index: { slug: string; vec: number[]; file: string }[] = [];
      const queries: { slug: string; file: string }[] = [];
      for (const s of chosen) {
        queries.push({ slug: s.slug, file: s.files[0]! });
        for (const ref of s.files.slice(1, 1 + REFS_PER_STRAIN)) {
          try { index.push({ slug: s.slug, vec: await getImageEmbedding(toDataUrl(ref)), file: ref }); } catch { /* skip */ }
        }
      }
      // eslint-disable-next-line no-console
      console.log(`Index ready: ${index.length} vectors / ${new Set(index.map((i) => i.slug)).size} strains. Running ${queries.length} queries…`);

      const acc = { un1: 0, un3: 0, g1: 0, g3: 0 };
      const rows: Record<string, unknown>[] = [];
      mkdirSync(REPORT_DIR, { recursive: true });
      let n = 0;

      for (const q of queries) {
        let qvec: number[];
        try { qvec = await getImageEmbedding(toDataUrl(q.file)); } catch { continue; }
        const best = new Map<string, { score: number; file: string }>();
        for (const e of index) {
          if (e.file === q.file) continue;
          const s = cosine(qvec, e.vec);
          if (!best.has(e.slug) || s > best.get(e.slug)!.score) best.set(e.slug, { score: s, file: e.file });
        }
        const ranked = [...best.entries()].sort((a, b) => b[1].score - a[1].score).slice(0, TOPK);
        const refs: Ref[] = ranked.map(([slug, v]) => ({ name: slug, dataUrl: toDataUrl(v.file) }));

        const queryUrl = toDataUrl(q.file);
        const un = (await gpt(queryUrl)).map((c) => c.slug);
        await sleep(DELAY);
        const gr = (await gpt(queryUrl, refs)).map((c) => c.slug);
        await sleep(DELAY);

        const u1 = un[0] === q.slug, u3 = un.slice(0, 3).includes(q.slug);
        const g1 = gr[0] === q.slug, g3 = gr.slice(0, 3).includes(q.slug);
        if (u1) acc.un1++; if (u3) acc.un3++; if (g1) acc.g1++; if (g3) acc.g3++;
        n++;
        rows.push({ strain: q.slug, refsShown: ranked.map(([s]) => s), ungrounded: un.slice(0, 3), grounded: gr.slice(0, 3), u1, g1 });
        // eslint-disable-next-line no-console
        console.log(`${q.slug}: ungrounded[${u1 ? "✓" : "✗"}] ${un.slice(0, 2).join(",")} | img-grounded[${g1 ? "✓" : "✗"}] ${gr.slice(0, 2).join(",")} (refs: ${ranked.map(([s]) => s).join(",")})`);
        writeFileSync(path.join(REPORT_DIR, "image-grounding-ab-report.json"), JSON.stringify({ ranAt: new Date().toISOString(), queries: n, topK: TOPK, pct: { ungroundedTop1: +(acc.un1 / n).toFixed(3), ungroundedTop3: +(acc.un3 / n).toFixed(3), groundedTop1: +(acc.g1 / n).toFixed(3), groundedTop3: +(acc.g3 / n).toFixed(3) }, rows }, null, 2));
      }

      // eslint-disable-next-line no-console
      console.log(`\n=== IMAGE-GROUNDING A/B over ${n} queries ===\n ungrounded:     top1 ${((acc.un1 / n) * 100).toFixed(0)}% top3 ${((acc.un3 / n) * 100).toFixed(0)}%\n image-grounded: top1 ${((acc.g1 / n) * 100).toFixed(0)}% top3 ${((acc.g3 / n) * 100).toFixed(0)}%`);
      expect(n).toBeGreaterThan(0);
    },
    3_600_000,
  );
});
