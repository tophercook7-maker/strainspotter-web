import { createClient } from "@supabase/supabase-js";

export type SmartScannerMatch = {
  strain: {
    slug: string | null;
    name: string | null;
    type?: string | null;
    description?: string | null;
    effects?: string[] | null;
    flavors?: string[] | null;
  };
  score: number;
  confidence: number;
  reasoning: string[];
};

type SupabaseClient = ReturnType<typeof createClient>;

type FeedbackRow = {
  matched_strain_slug?: string | null;
  selected_strain_slug?: string | null;
  was_correct?: boolean | null;
};

type ReferenceRow = {
  strain_slug?: string | null;
};

export function requireScannerSupabase(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const missing = [
    !supabaseUrl ? "NEXT_PUBLIC_SUPABASE_URL" : null,
    !serviceRoleKey ? "SUPABASE_SERVICE_ROLE_KEY" : null,
  ].filter(Boolean);

  if (missing.length > 0) {
    throw new Error(`Missing required Supabase environment variable(s): ${missing.join(", ")}`);
  }

  return createClient(supabaseUrl!, serviceRoleKey!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export function normalizeSlug(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || null;
}

export function normalizeMatches(input: unknown): SmartScannerMatch[] {
  const rawMatches = extractRawMatches(input);

  const matches: SmartScannerMatch[] = [];

  for (const raw of rawMatches) {
    const row = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
    const strain = row.strain && typeof row.strain === "object"
      ? (row.strain as Record<string, unknown>)
      : {};

    const name =
      stringOrNull(strain.name) ??
      stringOrNull(row.strainName) ??
      stringOrNull(row.name) ??
      stringOrNull(row.strain_name);
    const slug =
      normalizeSlug(strain.slug) ??
      normalizeSlug(row.slug) ??
      normalizeSlug(row.strain_slug) ??
      normalizeSlug(name);

    if (!slug && !name) continue;

    const confidence = clampNumber(row.confidence, 0, 100, 0);
    const score = clampNumber(row.score, 0, 100, confidence);
    const reasoning = [
      ...stringArray(row.reasoning),
      ...stringArray(row.reasons),
      ...stringArray(row.whyItWon),
    ];
    const matchReasoning = stringOrNull(row.matchReasoning);
    if (matchReasoning) reasoning.push(matchReasoning);

    matches.push({
      strain: {
        slug,
        name: name ?? slug,
        type: stringOrNull(strain.type),
        description: stringOrNull(strain.description),
        effects: stringArray(strain.effects),
        flavors: stringArray(strain.flavors),
      },
      score,
      confidence,
      reasoning: reasoning.length ? reasoning : ["Existing scanner candidate."],
    });
  }

  return matches
    .sort((a, b) => b.confidence - a.confidence);
}

export async function applyLearningLayer(
  matches: SmartScannerMatch[],
  supabase: SupabaseClient
): Promise<SmartScannerMatch[]> {
  const slugs = [...new Set(matches.map((m) => m.strain.slug).filter(Boolean))] as string[];
  if (slugs.length === 0) return matches;

  const [referenceResult, feedbackResult] = await Promise.all([
    supabase
      .from("strain_reference_images")
      .select("strain_slug")
      .in("strain_slug", slugs)
      .eq("approved", true)
      .limit(500),
    supabase
      .from("scan_feedback")
      .select("matched_strain_slug, selected_strain_slug, was_correct")
      .or(`matched_strain_slug.in.(${slugs.join(",")}),selected_strain_slug.in.(${slugs.join(",")})`)
      .limit(1000),
  ]);

  const referenceCounts = countReferences((referenceResult.data ?? []) as ReferenceRow[]);
  const feedbackScores = scoreFeedback((feedbackResult.data ?? []) as FeedbackRow[]);

  return matches
    .map((match) => {
      const slug = match.strain.slug;
      if (!slug) return match;

      const referenceBoost = Math.min(3, referenceCounts.get(slug) ?? 0);
      const feedbackBoost = Math.max(-5, Math.min(5, feedbackScores.get(slug) ?? 0));
      const totalBoost = referenceBoost + feedbackBoost;
      const confidence = clampNumber(match.confidence + totalBoost, 0, 100, match.confidence);
      const reasoning = [...match.reasoning];

      if (referenceBoost > 0) {
        reasoning.push(`Approved reference images provide a small learning boost (+${referenceBoost}).`);
      }
      if (feedbackBoost > 0) {
        reasoning.push(`Prior user feedback supports this candidate (+${feedbackBoost}).`);
      }
      if (feedbackBoost < 0) {
        reasoning.push(`Prior user corrections reduce this candidate (${feedbackBoost}).`);
      }

      return {
        ...match,
        score: confidence,
        confidence,
        reasoning,
      };
    })
    .sort((a, b) => b.confidence - a.confidence);
}

function extractRawMatches(input: unknown): unknown[] {
  const body = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const result = body.result && typeof body.result === "object"
    ? (body.result as Record<string, unknown>)
    : {};
  const scanResult = body.scanResult && typeof body.scanResult === "object"
    ? (body.scanResult as Record<string, unknown>)
    : {};

  if (Array.isArray(body.matches)) return body.matches;
  if (Array.isArray(result.matches)) return result.matches;
  if (Array.isArray(scanResult.matches)) return scanResult.matches;
  if (Array.isArray(result.candidates)) return result.candidates;
  if (Array.isArray(scanResult.candidates)) return scanResult.candidates;
  if (Array.isArray(body.candidates)) return body.candidates;

  const single =
    body.match ??
    result.match ??
    scanResult.match ??
    (hasKeys(scanResult) ? scanResult : null) ??
    (hasKeys(result) ? result : null) ??
    body;
  return single ? [single] : [];
}

function hasKeys(value: Record<string, unknown>): boolean {
  return Object.keys(value).length > 0;
}

function countReferences(rows: ReferenceRow[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const slug = normalizeSlug(row.strain_slug);
    if (!slug) continue;
    counts.set(slug, (counts.get(slug) ?? 0) + 1);
  }
  return counts;
}

function scoreFeedback(rows: FeedbackRow[]): Map<string, number> {
  const scores = new Map<string, number>();
  for (const row of rows) {
    const matched = normalizeSlug(row.matched_strain_slug);
    const selected = normalizeSlug(row.selected_strain_slug);

    if (row.was_correct === true && matched) {
      scores.set(matched, (scores.get(matched) ?? 0) + 1);
    }
    if (row.was_correct === false && matched) {
      scores.set(matched, (scores.get(matched) ?? 0) - 1);
    }
    if (row.was_correct === false && selected) {
      scores.set(selected, (scores.get(selected) ?? 0) + 1.5);
    }
  }
  return scores;
}

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.round(n)));
}
