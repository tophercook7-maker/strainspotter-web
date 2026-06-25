/**
 * Retrieval-grounding A/B eval (Phase 1 — ROADMAP §Phase 1).
 *
 * Leakage-free: for each strain we hold out ONE image as the query and embed the
 * strain's OTHER cache images (local CLIP) into the reference index — so the
 * query is never in the index it's retrieved against. For each query we compare:
 *   - retrieval-only top-1/top-3 (CLIP nearest strain)
 *   - UNGROUNDED  GPT-4o (current production prompt)
 *   - GROUNDED    GPT-4o (prompt + the retrieval shortlist)
 *
 * Paid (2 GPT calls/query) + gated behind RUN_SCAN_EVAL so CI never spends.
 *   RUN_SCAN_EVAL=1 npx vitest run lib/scanner/retrievalGrounding.eval.test.ts
 *   knobs: MAX_STRAINS (default 15), REFS_PER_STRAIN (4), TOPK (5), EVAL_DELAY_MS (4000)
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
const TOPK = Number(process.env.TOPK ?? 5);
const DELAY = Number(process.env.EVAL_DELAY_MS ?? 4000);

function toDataUrl(file: string): string {
  return `data:${MIME[path.extname(file).toLowerCase()]};base64,${readFileSync(file).toString("base64")}`;
}
function cosine(a: number[], b: number[]): number {
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i]! * b[i]!;
  return dot; // embeddings are L2-normalized by getImageEmbedding
}

async function gpt(dataUrl: string, groundingNames?: string[]): Promise<{ slug: string; confidence: number }[]> {
  let userText = buildUserPrompt(1);
  if (groundingNames?.length) {
    userText += `\n\nIMAGE-RETRIEVAL SHORTLIST — the catalog strains whose reference photos are visually nearest to this image (by embedding similarity), most-similar first: ${groundingNames.join(", ")}. Treat this as a strong prior: if the photo is consistent with one of these, prefer it; if clearly not, ignore the shortlist.`;
  }
  const body = JSON.stringify({
    model: "gpt-4o",
    response_format: { type: "json_object" },
    temperature: 0.2,
    max_tokens: 1800,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: [{ type: "text", text: userText }, { type: "image_url", image_url: { url: dataUrl, detail: "high" } }] },
    ],
  });
  for (let attempt = 0; attempt < 8; attempt++) {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body,
    });
    if (res.ok) {
      const content = (await res.json()).choices?.[0]?.message?.content ?? "{}";
      return (normalizeAnalysis(JSON.parse(content), undefined).candidates as { slug: string; confidence: number }[]) ?? [];
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

describe.skipIf(!process.env.RUN_SCAN_EVAL)("retrieval grounding A/B", () => {
  it(
    "compares ungrounded vs grounded vs retrieval-only (leave-one-out)",
    async () => {
      // Eligible strains: in catalog, with >=3 cache images (LOO needs >=2 refs).
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
      console.log(`Building reference index (local CLIP) for ${chosen.length} strains…`);

      // Build index from each strain's reference images (query held out = files[0]).
      const index: { slug: string; vec: number[] }[] = [];
      const queries: { slug: string; file: string }[] = [];
      for (const s of chosen) {
        queries.push({ slug: s.slug, file: s.files[0]! });
        for (const ref of s.files.slice(1, 1 + REFS_PER_STRAIN)) {
          try {
            index.push({ slug: s.slug, vec: await getImageEmbedding(toDataUrl(ref)) });
          } catch (e) {
            // eslint-disable-next-line no-console
            console.log(`   (skip ref ${path.basename(ref)}: ${(e as Error).message})`);
          }
        }
      }
      // eslint-disable-next-line no-console
      console.log(`Index: ${index.length} reference vectors across ${new Set(index.map((i) => i.slug)).size} strains. Running ${queries.length} queries…`);

      const acc = { retrieval1: 0, retrieval3: 0, un1: 0, un3: 0, gr1: 0, gr3: 0 };
      const rows: Record<string, unknown>[] = [];
      mkdirSync(REPORT_DIR, { recursive: true });
      let n = 0;

      for (const q of queries) {
        let qvec: number[];
        try {
          qvec = await getImageEmbedding(toDataUrl(q.file));
        } catch {
          continue;
        }
        // Retrieve: best cosine per strain → top-K.
        const best = new Map<string, number>();
        for (const e of index) {
          if (e.slug === q.slug && e.vec === qvec) continue; // never compare to itself
          const s = cosine(qvec, e.vec);
          if (!best.has(e.slug) || s > best.get(e.slug)!) best.set(e.slug, s);
        }
        const ranked = [...best.entries()].sort((a, b) => b[1] - a[1]).map(([slug]) => slug);
        const shortlist = ranked.slice(0, TOPK);
        const r1 = shortlist[0] === q.slug;
        const r3 = shortlist.slice(0, 3).includes(q.slug);

        const dataUrl = toDataUrl(q.file);
        const un = (await gpt(dataUrl)).map((c) => c.slug);
        await sleep(DELAY);
        const gr = (await gpt(dataUrl, shortlist)).map((c) => c.slug);
        await sleep(DELAY);

        const u1 = un[0] === q.slug, u3 = un.slice(0, 3).includes(q.slug);
        const g1 = gr[0] === q.slug, g3 = gr.slice(0, 3).includes(q.slug);
        if (r1) acc.retrieval1++; if (r3) acc.retrieval3++;
        if (u1) acc.un1++; if (u3) acc.un3++;
        if (g1) acc.gr1++; if (g3) acc.gr3++;
        n++;
        rows.push({ strain: q.slug, retrievalTop: shortlist.slice(0, 3), ungrounded: un.slice(0, 3), grounded: gr.slice(0, 3), r1, u1, g1 });
        // eslint-disable-next-line no-console
        console.log(`${q.slug}: retrieval[${r1 ? "✓" : "✗"}] ${shortlist.slice(0, 3).join(",")} | ungrounded[${u1 ? "✓" : "✗"}] ${un.slice(0, 2).join(",")} | grounded[${g1 ? "✓" : "✗"}] ${gr.slice(0, 2).join(",")}`);

        writeFileSync(path.join(REPORT_DIR, "grounding-ab-report.json"), JSON.stringify({ ranAt: new Date().toISOString(), queries: n, topK: TOPK, pct: { retrievalTop1: +(acc.retrieval1 / n).toFixed(3), retrievalTop3: +(acc.retrieval3 / n).toFixed(3), ungroundedTop1: +(acc.un1 / n).toFixed(3), ungroundedTop3: +(acc.un3 / n).toFixed(3), groundedTop1: +(acc.gr1 / n).toFixed(3), groundedTop3: +(acc.gr3 / n).toFixed(3) }, rows }, null, 2));
      }

      // eslint-disable-next-line no-console
      console.log(`\n=== A/B over ${n} queries ===\n retrieval-only: top1 ${((acc.retrieval1 / n) * 100).toFixed(0)}% top3 ${((acc.retrieval3 / n) * 100).toFixed(0)}%\n ungrounded:     top1 ${((acc.un1 / n) * 100).toFixed(0)}% top3 ${((acc.un3 / n) * 100).toFixed(0)}%\n grounded:       top1 ${((acc.gr1 / n) * 100).toFixed(0)}% top3 ${((acc.gr3 / n) * 100).toFixed(0)}%`);
      expect(n).toBeGreaterThan(0);
    },
    3_600_000,
  );
});
