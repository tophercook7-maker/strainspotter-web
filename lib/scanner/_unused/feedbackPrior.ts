import fs from "node:fs";
import path from "node:path";
import { getTrustWeight } from "@/lib/scanner/rewardSystem";

export type FeedbackPrior = {
  feedbackScore: number;
  selectedCount: number;
  wrongCount: number;
};

export type FeedbackPriorContext = {
  /** Top embedding neighbor slugs for this scan (ordering matters). */
  embeddingTopSlugs?: string[];
};

type FeedbackRow = {
  userId?: string | null;
  selectedMatchSlug?: string | null;
  selectedMatchName?: string | null;
  correctedStrainName?: string | null;
  correctStrainSlug?: string | null;
  noneOfThese?: boolean;
  predictedTopMatches?: Array<{ slug?: string; name?: string }>;
  topMatches?: Array<{ slug?: string; name?: string }>;
  wrongTopMatchSlug?: string | null;
};

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function feedbackPath(): string {
  return path.join(process.cwd(), "data", "scan-feedback-local.jsonl");
}

function readFeedback(): FeedbackRow[] {
  const file = feedbackPath();
  if (!fs.existsSync(file)) return [];
  return fs
    .readFileSync(file, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line) as FeedbackRow;
      } catch {
        return null;
      }
    })
    .filter((row): row is FeedbackRow => Boolean(row));
}

function rowTrust(row: FeedbackRow): number {
  const uid =
    typeof row.userId === "string" && row.userId.trim()
      ? row.userId
      : "anonymous";
  return getTrustWeight(uid);
}

/**
 * Conservative penalty when this slug was #1 but users confirmed a different strain.
 * If embedding neighbors exist for the current scan, only penalize when the corrected
 * strain appears in that neighborhood (similar visual context).
 */
function competitorWrongLeaderPenalty(
  slug: string,
  rows: FeedbackRow[],
  ctx?: FeedbackPriorContext
): number {
  const neighbors = ctx?.embeddingTopSlugs ?? [];
  let raw = 0;

  for (const row of rows) {
    if (!row.wrongTopMatchSlug || row.wrongTopMatchSlug !== slug) continue;
    const corrected =
      row.correctStrainSlug ||
      (row.correctedStrainName ? slugify(row.correctedStrainName) : "") ||
      "";
    if (!corrected) continue;

    const tw = rowTrust(row);
    if (neighbors.length > 0) {
      if (!neighbors.includes(corrected)) continue;
      raw += tw;
    } else {
      raw += 0.25 * tw;
    }
  }

  return Math.min(5, raw);
}

export function getFeedbackPrior(slug: string, ctx?: FeedbackPriorContext): FeedbackPrior {
  const rows = readFeedback();
  let selectedCount = 0;
  let wrongCount = 0;
  let selectedWeight = 0;
  let wrongWeight = 0;

  for (const row of rows) {
    const tw = rowTrust(row);
    const selectedSlug =
      row.correctStrainSlug ||
      row.selectedMatchSlug ||
      (row.correctedStrainName ? slugify(row.correctedStrainName) : "") ||
      "";
    if (selectedSlug === slug) {
      selectedCount += 1;
      selectedWeight += tw;
    }

    const topMatches = row.predictedTopMatches || row.topMatches || [];
    const wasPredicted = topMatches.some((match) => match.slug === slug);
    if (wasPredicted && row.noneOfThese) {
      wrongCount += 1;
      wrongWeight += tw;
    }
    if (wasPredicted && selectedSlug && selectedSlug !== slug) {
      wrongCount += 1;
      wrongWeight += tw;
    }
  }

  const positive = Math.min(8, Math.floor(Math.sqrt(selectedWeight) * 2));
  const penalty = Math.min(6, Math.floor(Math.sqrt(wrongWeight) * 2));
  const competitorPenalty = competitorWrongLeaderPenalty(slug, rows, ctx);

  return {
    feedbackScore: positive - penalty - competitorPenalty,
    selectedCount,
    wrongCount,
  };
}
