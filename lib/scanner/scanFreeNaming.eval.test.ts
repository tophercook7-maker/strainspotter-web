/**
 * Free-naming A/B (Phase 2 — does removing the 314-catalog constraint + resolving
 * to the 10k catalog change accuracy?).
 *
 * Constrained = current production SYSTEM_PROMPT (314 catalog inlined).
 * Free        = same prompt with the catalog stripped + "name any cultivar you
 *               recognize"; the model's free-text answer is then mapped to the
 *               catalog via resolveStrain(). Both arms scored on resolved slug.
 *
 * Same images for both arms; the model never saw them → no leakage either way.
 * Paid + gated behind RUN_SCAN_EVAL.
 *   RUN_SCAN_EVAL=1 npx vitest run lib/scanner/scanFreeNaming.eval.test.ts
 *   knobs: MAX_STRAINS (20), PER_STRAIN (1), EVAL_DELAY_MS (4000)
 */
import { existsSync, readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import dotenv from "dotenv";
import { SYSTEM_PROMPT, buildUserPrompt, normalizeAnalysis, slugify } from "@/app/api/scan/route";
import { resolveStrain } from "@/lib/data/catalog10k";
import strainDb from "@/lib/data/strains.json";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

// Free-naming variant: drop the inlined catalog, allow any cultivar.
const FREE_PROMPT = SYSTEM_PROMPT
  .replace(/═══ STRAINSPOTTER CATALOG[\s\S]*?═══ END CATALOG ═══/, "You may name ANY cannabis cultivar you recognize — you are NOT limited to a fixed list. Use your full knowledge of cannabis strains.")
  .replace(/from the catalog \(or "Unknown"\)/, 'from your full knowledge of cultivars (or "Unknown")')
  .replace(/string — from catalog when possible/, "string — the cultivar name");

const CACHE = path.resolve("data/strain-reference-images/cache");
const REPORT_DIR = path.resolve("data/eval");
const MIME: Record<string, string> = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" };
const CATALOG = new Set((strainDb as { name: string }[]).map((s) => slugify(s.name)));
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const MAX_STRAINS = Number(process.env.MAX_STRAINS ?? 20);
const PER_STRAIN = Number(process.env.PER_STRAIN ?? 1);
const DELAY = Number(process.env.EVAL_DELAY_MS ?? 4000);
const toDataUrl = (f: string) => `data:${MIME[path.extname(f).toLowerCase()]};base64,${readFileSync(f).toString("base64")}`;

async function call(systemPrompt: string, dataUrl: string): Promise<string[]> {
  const body = JSON.stringify({
    model: "gpt-4o",
    response_format: { type: "json_object" },
    temperature: 0.2,
    max_tokens: 1800,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: [{ type: "text", text: buildUserPrompt(1) }, { type: "image_url", image_url: { url: dataUrl, detail: "high" } }] },
    ],
  });
  for (let attempt = 0; attempt < 8; attempt++) {
    const res = await fetch("https://api.openai.com/v1/chat/completions", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY}` }, body });
    if (res.ok) {
      const content = (await res.json()).choices?.[0]?.message?.content ?? "{}";
      const cands = (normalizeAnalysis(JSON.parse(content), undefined).candidates as { strainName: string; slug: string }[]) ?? [];
      // Resolve each answer to a catalog slug (fall back to its own slug).
      return cands.slice(0, 3).map((c) => resolveStrain(c.strainName)?.slug ?? c.slug ?? slugify(c.strainName));
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

describe.skipIf(!process.env.RUN_SCAN_EVAL)("free-naming A/B", () => {
  it(
    "constrained (314 catalog) vs free-naming + resolve",
    async () => {
      const queries: { strain: string; file: string }[] = [];
      if (existsSync(CACHE)) {
        for (const d of readdirSync(CACHE, { withFileTypes: true })) {
          if (!d.isDirectory() || !CATALOG.has(d.name) || queries.filter((q) => q.strain === d.name).length) continue;
          const files = readdirSync(path.join(CACHE, d.name)).filter((f) => MIME[path.extname(f).toLowerCase()]).map((f) => path.join(CACHE, d.name, f));
          for (const f of files.slice(0, PER_STRAIN)) queries.push({ strain: d.name, file: f });
          if (new Set(queries.map((q) => q.strain)).size >= MAX_STRAINS) break;
        }
      }
      expect(queries.length).toBeGreaterThan(0);

      const acc = { c1: 0, c3: 0, f1: 0, f3: 0 };
      const rows: Record<string, unknown>[] = [];
      mkdirSync(REPORT_DIR, { recursive: true });
      let n = 0;
      for (const q of queries) {
        let con: string[], fre: string[];
        try {
          const url = toDataUrl(q.file);
          con = await call(SYSTEM_PROMPT, url);
          await sleep(DELAY);
          fre = await call(FREE_PROMPT, url);
          await sleep(DELAY);
        } catch (e) {
          // eslint-disable-next-line no-console
          console.log(`⚠ stop after ${n}: ${(e as Error).message}`);
          break;
        }
        const c1 = con[0] === q.strain, c3 = con.includes(q.strain);
        const f1 = fre[0] === q.strain, f3 = fre.includes(q.strain);
        if (c1) acc.c1++; if (c3) acc.c3++; if (f1) acc.f1++; if (f3) acc.f3++;
        n++;
        rows.push({ strain: q.strain, constrained: con, free: fre, c1, f1 });
        // eslint-disable-next-line no-console
        console.log(`${q.strain}: constrained[${c1 ? "✓" : "✗"}] ${con.slice(0, 2).join(",")} | free[${f1 ? "✓" : "✗"}] ${fre.slice(0, 2).join(",")}`);
        writeFileSync(path.join(REPORT_DIR, "free-naming-ab-report.json"), JSON.stringify({ ranAt: new Date().toISOString(), queries: n, pct: { constrainedTop1: +(acc.c1 / n).toFixed(3), constrainedTop3: +(acc.c3 / n).toFixed(3), freeTop1: +(acc.f1 / n).toFixed(3), freeTop3: +(acc.f3 / n).toFixed(3) }, rows }, null, 2));
      }
      // eslint-disable-next-line no-console
      console.log(`\n=== FREE-NAMING A/B over ${n} queries ===\n constrained (314): top1 ${((acc.c1 / n) * 100).toFixed(0)}% top3 ${((acc.c3 / n) * 100).toFixed(0)}%\n free + resolve:    top1 ${((acc.f1 / n) * 100).toFixed(0)}% top3 ${((acc.f3 / n) * 100).toFixed(0)}%`);
      expect(n).toBeGreaterThan(0);
    },
    3_600_000,
  );
});
