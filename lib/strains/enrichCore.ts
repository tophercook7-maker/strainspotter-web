// lib/strains/enrichCore.ts — server-side strain enrichment core.
//
// Same logic as scripts/enrich-strains.mjs but runs INSIDE the deployed app
// (via /api/admin/enrich), where the OpenAI key lives — so the owner can fill
// the library from the Admin console with one button, no local setup.
//
// Honesty rules: unknown strain → skipped entirely; unconfident field → null;
// only NULL fields are ever written; every touched row is provenance-stamped.

import { getSupabaseAdmin } from "@/lib/supabase/server";
import { CATALOG_10K } from "@/lib/data/catalog10k";

const PROMPT = (name: string) => `You are a cannabis strain encyclopedia. Report what is commonly known about the strain "${name}".

HONESTY RULES (critical):
- If you don't genuinely recognize this strain name, return {"knows": false} and nothing else.
- For every field you are not confident about, use null. Never guess numbers.
- The description must be factual and neutral (2-3 sentences: origin/lineage, character, what it's known for). No hype, no medical claims.

Return ONE JSON object:
{
  "knows": true,
  "description": "..." | null,
  "type": "Indica" | "Sativa" | "Hybrid" | null,
  "indica_percentage": 0-100 | null,
  "sativa_percentage": 0-100 | null,
  "thc_min": number | null,
  "thc_max": number | null,
  "genetics": "Parent A x Parent B" | null,
  "effects": ["relaxation"] | null,
  "flavors": ["earthy"] | null
}`;

function cleanArr(v: unknown): string[] | null {
  return Array.isArray(v)
    ? v.filter((x): x is string => typeof x === "string" && !!x.trim()).slice(0, 10)
    : null;
}

async function askModel(name: string, apiKey: string): Promise<Record<string, unknown>> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: PROMPT(name) }],
      response_format: { type: "json_object" },
      temperature: 0.2,
      max_tokens: 400,
    }),
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`openai ${res.status}`);
  const data = await res.json();
  return JSON.parse(data.choices[0].message.content);
}

/** Quality-ranked worklist: curated catalog strains first. */
const RANKED_SLUGS: string[] = [
  ...CATALOG_10K.filter((s) => s.curated).map((s) => s.slug),
  ...CATALOG_10K.filter((s) => !s.curated).map((s) => s.slug),
];

export interface EnrichBatchResult {
  enriched: number;
  skippedUnknown: number;
  alreadyGood: number;
  failed: number;
  scanned: number;
  exhausted: boolean;
}

export async function enrichBatch(batchSize: number): Promise<EnrichBatchResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not configured");
  const sb = getSupabaseAdmin();

  const out: EnrichBatchResult = { enriched: 0, skippedUnknown: 0, alreadyGood: 0, failed: 0, scanned: 0, exhausted: false };

  for (const slug of RANKED_SLUGS) {
    if (out.enriched >= batchSize || out.failed > 5) break;
    out.scanned++;
    const { data: row } = await sb
      .from("strains")
      .select("slug, name, description, type, indica_percentage, sativa_percentage, thc_min, thc_max, genetics, effects, flavors, enriched_at")
      .eq("slug", slug)
      .maybeSingle();
    if (!row) continue;
    // enriched_at set = already visited (even if skipped-unknown we stamp it,
    // so batches never re-pay for the same strain).
    if (row.enriched_at || (row.description && row.description.length > 50)) {
      out.alreadyGood++;
      continue;
    }

    try {
      const ai = await askModel(row.name, apiKey);
      const patch: Record<string, unknown> = {
        enriched_at: new Date().toISOString(),
        enrichment_source: "gpt-4o-mini/2026-07 model knowledge",
      };
      if (ai.knows === true) {
        if (!row.description && typeof ai.description === "string" && ai.description.length > 40) patch.description = ai.description.trim();
        if (!row.type && typeof ai.type === "string") patch.type = ai.type;
        if (row.indica_percentage == null && Number.isFinite(ai.indica_percentage)) patch.indica_percentage = Math.round(ai.indica_percentage as number);
        if (row.sativa_percentage == null && Number.isFinite(ai.sativa_percentage)) patch.sativa_percentage = Math.round(ai.sativa_percentage as number);
        if (row.thc_min == null && Number.isFinite(ai.thc_min)) patch.thc_min = ai.thc_min;
        if (row.thc_max == null && Number.isFinite(ai.thc_max)) patch.thc_max = ai.thc_max;
        if (!row.genetics && typeof ai.genetics === "string" && (ai.genetics as string).length > 3) patch.genetics = (ai.genetics as string).trim();
        const effects = cleanArr(ai.effects);
        const flavors = cleanArr(ai.flavors);
        if ((!row.effects || (row.effects as unknown[]).length === 0) && effects?.length) patch.effects = effects;
        if ((!row.flavors || (row.flavors as unknown[]).length === 0) && flavors?.length) patch.flavors = flavors;
      }

      const gotData = Object.keys(patch).length > 2;
      if (!gotData) {
        patch.enrichment_source = "gpt-4o-mini/2026-07 — unknown strain, skipped";
        out.skippedUnknown++;
      } else {
        out.enriched++;
      }
      await sb.from("strains").update(patch).eq("slug", slug);
    } catch {
      out.failed++;
    }
  }

  out.exhausted = out.scanned >= RANKED_SLUGS.length;
  return out;
}

export async function enrichmentStats(): Promise<{ withDescription: number; enriched: number; total: number }> {
  const sb = getSupabaseAdmin();
  const [descRes, enrRes, totalRes] = await Promise.all([
    sb.from("strains").select("slug", { count: "exact", head: true }).not("description", "is", null),
    sb.from("strains").select("slug", { count: "exact", head: true }).not("enriched_at", "is", null),
    sb.from("strains").select("slug", { count: "exact", head: true }),
  ]);
  return {
    withDescription: descRes.count ?? 0,
    enriched: enrRes.count ?? 0,
    total: totalRes.count ?? 0,
  };
}
