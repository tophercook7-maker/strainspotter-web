/**
 * Ranked scan: confidence normalization, slug resolution, and payload building.
 * Used by /api/scan (edge) and optionally the client orchestrator.
 */

import strainDb from "@/lib/data/strains.json";
import type {
  DeficiencyLikelyIssue,
  GrowCoachPayload,
  HarvestTimingInsight,
  PlantAnalysisPayload,
  PlantDeficiencyInsight,
  PlantHealthInsight,
  PlantInsightBlock,
  PlantStressInsight,
  RankedConfidenceTier,
  RankedMatchRow,
  RankedScanSummary,
  SexEstimateInsight,
  StressPatternInsight,
  UnifiedScanPayload,
  UnifiedScanSummary,
} from "./rankedScanTypes";
import { RANKED_DISCLAIMER } from "./rankedScanTypes";
import { buildGrowCoachPayload } from "./growCoachBuilder";

const CARD_LABELS: RankedMatchRow["cardLabel"][] = [
  "Best overall match",
  "Close alternative",
  "Another possible match",
];

/** Unified scanner — improve tips (product spec) */
export const DEFAULT_IMPROVE_TIPS = [
  "Upload 3 angles for better certainty",
  "Use natural light",
  "Include one close-up of the flower",
  "Include one full-plant photo when possible",
  "Avoid blurry photos",
];

interface StrainJsonRow {
  name: string;
  aliases?: string[];
}

function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normKey(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Resolve slug from local catalog (name + aliases). */
export function resolveStrainSlug(strainName: string): string {
  const want = normKey(strainName);
  if (!want) return slugify(strainName);
  const rows = strainDb as StrainJsonRow[];
  for (const row of rows) {
    if (normKey(row.name) === want) return slugify(row.name);
    const aliases = row.aliases || [];
    for (const a of aliases) {
      if (normKey(a) === want) return slugify(row.name);
    }
  }
  return slugify(strainName);
}

export function getConfidenceLabel(confidence: number): string {
  if (confidence >= 80) return "High confidence";
  if (confidence >= 60) return "Moderate confidence";
  if (confidence >= 35) return "Low confidence";
  return "Low confidence";
}

/** Tier for summary when max visible confidence is in 33–34 range */
export function isVeryLowConfidenceSet(maxConfidence: number): boolean {
  return maxConfidence < 35;
}

export function getConfidenceTierForValue(
  confidence: number
): RankedConfidenceTier {
  if (confidence >= 80) return "high";
  if (confidence >= 60) return "moderate";
  if (confidence >= 35) return "low";
  return "very_low";
}

/** Summary tier from the ranked list (max confidence). */
export function getResultTier(
  matches: Pick<RankedMatchRow, "confidence">[]
): RankedConfidenceTier {
  if (!matches.length) return "very_low";
  const max = Math.max(...matches.map((m) => m.confidence));
  return getConfidenceTierForValue(max);
}

/** Map raw bucket sum (0–100) to honest display % with caps. */
export function normalizeConfidence(
  rawScore: number,
  context: {
    strongOcrLabelAlignment: boolean;
    /** Same top candidates reinforced across multiple photos */
    multiImageAgreementBoost: boolean;
  }
): number {
  const raw = Math.max(0, Math.min(100, rawScore));
  // Map raw bucket sum → honest display % (floor ~33, visual cap applied below)
  let v = 33 + (raw / 100) * 59;
  if (context.multiImageAgreementBoost) {
    v += 3;
  }
  const cap = context.strongOcrLabelAlignment ? 95 : 92;
  v = Math.min(cap, v);
  let rounded = Math.round(v);
  if (rounded > cap) rounded = cap;
  if (rounded < 33) rounded = 33;
  if (rounded > 95) rounded = 95;
  return rounded;
}

function uniqReasons(reasons: unknown, fallback: string[]): string[] {
  const arr = Array.isArray(reasons)
    ? reasons.filter((r) => typeof r === "string" && String(r).trim().length > 0)
    : [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const r of arr.length ? arr : fallback) {
    const t = String(r).trim();
    const k = t.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(t);
    if (out.length >= 4) break;
  }
  while (out.length < 2 && fallback.length) {
    const f = fallback[out.length % fallback.length];
    if (!seen.has(f.toLowerCase())) out.push(f);
    break;
  }
  return out.slice(0, 4);
}

type AiRanked = {
  strainName?: string;
  scoreBuckets?: {
    visualFlower?: number;
    structure?: number;
    ocr?: number;
    secondary?: number;
  };
  reasons?: string[];
  appearsInMultipleImagesConsistent?: boolean;
};

type AiImageSignals = {
  usableVisualSignal?: boolean;
  blurOrDarkness?: "low" | "medium" | "high";
  textDetected?: boolean;
  strongOcrAgreementWithVisualTopPick?: boolean;
  wholePlantDetected?: boolean;
  flowerDetected?: boolean;
  leafDetailDetected?: boolean;
  packagedProductDetected?: boolean;
};

/** Plant / growth / health — caps: type 90, growth 92, health 88 */
export function normalizePlantAnalysisConfidence(
  rawScore: number,
  kind: "type" | "growth" | "health",
  ctx: {
    poorImage: boolean;
    blur: "low" | "medium" | "high";
    multiReinforcement: boolean;
  }
): number {
  const caps = { type: 90, growth: 92, health: 88 } as const;
  const cap = caps[kind];
  const raw = Math.max(0, Math.min(100, rawScore));
  let v = 33 + (raw / 100) * (cap - 33);
  if (ctx.multiReinforcement) v += 2;
  if (ctx.poorImage) v *= 0.72;
  if (ctx.blur === "high") v *= 0.78;
  else if (ctx.blur === "medium") v *= 0.88;
  let rounded = Math.round(Math.min(cap, Math.max(33, v)));
  if (rounded > cap) rounded = cap;
  return rounded;
}

function parsePlantBlock(
  block: unknown,
  kind: "type" | "growth" | "health",
  ctx: {
    poorImage: boolean;
    blur: "low" | "medium" | "high";
    multiReinforcement: boolean;
  },
  fallbackLabel: string,
  fallbackReasons: string[]
): PlantInsightBlock {
  const b = (block || {}) as Record<string, unknown>;
  const label =
    typeof b.label === "string" && b.label.trim()
      ? b.label.trim()
      : fallbackLabel;
  const raw =
    Number(b.rawScore ?? b.confidenceScore ?? b.confidence ?? 55) || 55;
  const reasons = uniqReasons(b.reasons, fallbackReasons);
  const conf = normalizePlantAnalysisConfidence(raw, kind, ctx);
  return {
    label,
    confidence: conf,
    confidenceLabel: getConfidenceLabel(conf),
    reasons,
  };
}

function parseHealthBlock(
  block: unknown,
  ctx: {
    poorImage: boolean;
    blur: "low" | "medium" | "high";
    multiReinforcement: boolean;
  },
  fallback: PlantHealthInsight
): PlantHealthInsight {
  const b = (block || {}) as Record<string, unknown>;
  const label =
    typeof b.label === "string" && b.label.trim()
      ? b.label.trim()
      : fallback.label;
  const raw =
    Number(b.rawScore ?? b.confidenceScore ?? b.confidence ?? 55) || 55;
  const reasons = uniqReasons(
    b.reasons,
    fallback.reasons.length ? fallback.reasons : ["Limited detail in frame"]
  );
  const issues = Array.isArray(b.issues)
    ? b.issues.filter((x) => typeof x === "string").slice(0, 6)
    : fallback.issues;
  const conf = normalizePlantAnalysisConfidence(raw, "health", ctx);
  return {
    label,
    confidence: conf,
    confidenceLabel: getConfidenceLabel(conf),
    reasons,
    ...(issues && issues.length ? { issues } : {}),
  };
}

/** Optional plant blocks — caps keep auxiliary insights conservative. */
function normalizeAuxBlockConfidence(
  rawScore: number,
  cap: number,
  ctx: {
    poorImage: boolean;
    blur: "low" | "medium" | "high";
    multiReinforcement: boolean;
  }
): number {
  const raw = Math.max(0, Math.min(100, rawScore));
  let v = 33 + (raw / 100) * (cap - 33);
  if (ctx.multiReinforcement) v += 1.5;
  if (ctx.poorImage) v *= 0.72;
  if (ctx.blur === "high") v *= 0.78;
  else if (ctx.blur === "medium") v *= 0.88;
  return Math.round(Math.min(cap, Math.max(33, v)));
}

function parseLikelyIssues(
  raw: unknown,
  ctx: {
    poorImage: boolean;
    blur: "low" | "medium" | "high";
    multiReinforcement: boolean;
  }
): DeficiencyLikelyIssue[] {
  if (!Array.isArray(raw)) return [];
  const out: DeficiencyLikelyIssue[] = [];
  for (const item of raw.slice(0, 4)) {
    const o = (item || {}) as Record<string, unknown>;
    const name = typeof o.name === "string" ? o.name.trim() : "";
    if (!name) continue;
    const subRaw = Number(o.rawScore ?? o.confidence ?? 50) || 50;
    const confidence = normalizeAuxBlockConfidence(subRaw, 85, ctx);
    const reasons = uniqReasons(o.reasons, [
      `Possible signs related to ${name}`,
      "Lighting and angle can change how color reads on camera",
    ]);
    out.push({ name, confidence, reasons });
  }
  return out;
}

function parseDeficiencyBlock(
  block: unknown,
  ctx: {
    poorImage: boolean;
    blur: "low" | "medium" | "high";
    multiReinforcement: boolean;
  }
): PlantDeficiencyInsight | null {
  if (block == null || typeof block !== "object") return null;
  const b = block as Record<string, unknown>;
  const likelyIssues = parseLikelyIssues(b.likelyIssues, ctx);
  if (!likelyIssues.length) return null;
  const label =
    typeof b.label === "string" && b.label.trim()
      ? b.label.trim()
      : "Possible nutrient issue";
  const raw = Number(b.rawScore ?? b.confidence ?? 55) || 55;
  const confidence = normalizeAuxBlockConfidence(raw, 87, ctx);
  return {
    label,
    confidence,
    confidenceLabel: getConfidenceLabel(confidence),
    likelyIssues,
  };
}

function parseHarvestBlock(
  block: unknown,
  ctx: {
    poorImage: boolean;
    blur: "low" | "medium" | "high";
    multiReinforcement: boolean;
  }
): HarvestTimingInsight | null {
  if (block == null || typeof block !== "object") return null;
  const b = block as Record<string, unknown>;
  const label =
    typeof b.label === "string" && b.label.trim() ? b.label.trim() : "";
  if (!label) return null;
  const raw = Number(b.rawScore ?? b.confidence ?? 55) || 55;
  const confidence = normalizeAuxBlockConfidence(raw, 85, ctx);
  const reasons = uniqReasons(b.reasons, [
    "Bud and pistil appearance suggests maturity cues",
    "Timing is a visual estimate only",
  ]);
  const estimate =
    typeof b.estimate === "string" && b.estimate.trim()
      ? b.estimate.trim()
      : undefined;
  return {
    label,
    confidence,
    confidenceLabel: getConfidenceLabel(confidence),
    ...(estimate ? { estimate } : {}),
    reasons,
  };
}

function parseSexBlock(
  block: unknown,
  ctx: {
    poorImage: boolean;
    blur: "low" | "medium" | "high";
    multiReinforcement: boolean;
  }
): SexEstimateInsight | null {
  if (block == null || typeof block !== "object") return null;
  const b = block as Record<string, unknown>;
  const label =
    typeof b.label === "string" && b.label.trim() ? b.label.trim() : "";
  if (!label) return null;
  const raw = Number(b.rawScore ?? b.confidence ?? 55) || 55;
  const confidence = normalizeAuxBlockConfidence(raw, 82, ctx);
  const reasons = uniqReasons(b.reasons, [
    "Reproductive cues may be partly visible",
    "Node-level close-ups can help clarify sex cues",
  ]);
  return {
    label,
    confidence,
    confidenceLabel: getConfidenceLabel(confidence),
    reasons,
  };
}

function parseStressPatterns(
  raw: unknown,
  ctx: {
    poorImage: boolean;
    blur: "low" | "medium" | "high";
    multiReinforcement: boolean;
  }
): StressPatternInsight[] {
  if (!Array.isArray(raw)) return [];
  const out: StressPatternInsight[] = [];
  for (const item of raw.slice(0, 4)) {
    const o = (item || {}) as Record<string, unknown>;
    const typeStr = typeof o.type === "string" ? o.type.trim() : "";
    if (!typeStr) continue;
    const subRaw = Number(o.rawScore ?? o.confidence ?? 50) || 50;
    const confidence = normalizeAuxBlockConfidence(subRaw, 82, ctx);
    const reasons = uniqReasons(o.reasons, [
      "May reflect environment or camera angle",
      "Small changes are easier to interpret than big swings",
    ]);
    out.push({ type: typeStr, confidence, reasons });
  }
  return out;
}

function parseStressBlock(
  block: unknown,
  ctx: {
    poorImage: boolean;
    blur: "low" | "medium" | "high";
    multiReinforcement: boolean;
  }
): PlantStressInsight | null {
  if (block == null || typeof block !== "object") return null;
  const b = block as Record<string, unknown>;
  const patterns = parseStressPatterns(b.patterns, ctx);
  if (!patterns.length) return null;
  const label =
    typeof b.label === "string" && b.label.trim()
      ? b.label.trim()
      : "Mild stress detected";
  const raw = Number(b.rawScore ?? b.confidence ?? 55) || 55;
  const confidence = normalizeAuxBlockConfidence(raw, 86, ctx);
  return {
    label,
    confidence,
    confidenceLabel: getConfidenceLabel(confidence),
    patterns,
  };
}

function attachGrowCoach(
  analysis: Record<string, unknown>,
  plant: PlantAnalysisPayload,
  summary: UnifiedScanSummary,
  signals: AiImageSignals,
  imageCount: number,
  opts: {
    poorImage: boolean;
    blur: "low" | "medium" | "high";
    usable: boolean;
  }
): GrowCoachPayload {
  return buildGrowCoachPayload(analysis, plant, {
    poorImage: opts.poorImage,
    blur: opts.blur,
    usable: opts.usable,
    summaryTier: summary.confidenceTier,
    imageCount,
    wholePlant: !!signals.wholePlantDetected,
    flower: !!signals.flowerDetected,
    leaf: !!signals.leafDetailDetected,
  });
}

export function buildPlantAnalysisPayload(
  analysis: Record<string, unknown>,
  signals: AiImageSignals,
  imageCount: number,
  opts: {
    poorImage: boolean;
    blur: "low" | "medium" | "high";
    usable: boolean;
  }
): PlantAnalysisPayload {
  const pa = (analysis.plantAnalysis || {}) as Record<string, unknown>;
  const multiR =
    imageCount > 1 && !!(pa as { multiImageReinforcement?: boolean }).multiImageReinforcement;
  const ctx = {
    poorImage: opts.poorImage,
    blur: opts.blur,
    multiReinforcement: multiR,
  };

  const whole = !!signals.wholePlantDetected;
  const flower = !!signals.flowerDetected;
  const leaf = !!signals.leafDetailDetected;

  const genetics = (analysis.genetics || {}) as { dominance?: string };
  const dom = genetics.dominance || "Hybrid";
  const typeFallback =
    dom === "Indica"
      ? "Indica-leaning hybrid"
      : dom === "Sativa"
        ? "Sativa-leaning hybrid"
        : "Balanced hybrid";

  let typeBlock: PlantInsightBlock | null = parsePlantBlock(
    pa.typeEstimate,
    "type",
    ctx,
    typeFallback,
    whole || leaf
      ? [
          "Leaf and structure cues from the images",
          "Compared against typical indica vs sativa morphology patterns",
        ]
      : [
          "Limited structural view — estimate from visible cues only",
          "Most cultivars present as hybrids today",
        ]
  );
  if (!whole && !leaf && !flower) {
    typeBlock = {
      ...typeBlock,
      confidence: Math.min(typeBlock.confidence, 58),
      confidenceLabel: getConfidenceLabel(Math.min(typeBlock.confidence, 58)),
      reasons: [
        ...typeBlock.reasons.slice(0, 2),
        "Whole-plant or leaf detail would sharpen this estimate",
      ].slice(0, 4),
    };
  }

  let growthBlock: PlantInsightBlock | null = parsePlantBlock(
    pa.growthStage,
    "growth",
    ctx,
    flower ? "Mid flowering" : whole ? "Vegetative" : "Early flowering",
    flower
      ? [
          "Flower development visible in frame",
          "Pistil and bud cues inform stage",
        ]
      : [
          "Limited flowering cues in frame",
          "Stage is a visual estimate only",
        ]
  );
  if (!flower && !whole) {
    growthBlock = {
      ...growthBlock,
      confidence: Math.min(growthBlock.confidence, 62),
      confidenceLabel: getConfidenceLabel(Math.min(growthBlock.confidence, 62)),
    };
  }

  let healthFallback: PlantHealthInsight = {
    label: opts.poorImage ? "Poor image quality for health analysis" : "Mostly healthy",
    confidence: normalizePlantAnalysisConfidence(52, "health", ctx),
    confidenceLabel: "Moderate confidence",
    reasons: opts.poorImage
      ? [
          "Image clarity limits what can be assessed",
          "No expert diagnosis implied",
        ]
      : ["No obvious severe stress patterns in visible areas", "Visual pass only"],
    issues: opts.poorImage
      ? undefined
      : ["Possible minor variation — not a diagnosis"],
  };

  let healthBlock = parseHealthBlock(pa.health, ctx, healthFallback);
  if (opts.poorImage && !((pa.health || {}) as { label?: string }).label) {
    healthBlock = {
      label: "Poor image quality for health analysis",
      confidence: normalizePlantAnalysisConfidence(38, "health", {
        ...ctx,
        poorImage: true,
      }),
      confidenceLabel: "Low confidence",
      reasons: [
        "Fine detail needed to assess foliage health",
        "Visible signs may be missed at this resolution",
      ],
    };
  }

  const deficiencyAnalysis = parseDeficiencyBlock(pa.deficiencyAnalysis, ctx);
  const harvestTiming = parseHarvestBlock(pa.harvestTiming, ctx);
  const sexEstimate = parseSexBlock(pa.sexEstimate, ctx);
  const stressAnalysis = parseStressBlock(pa.stressAnalysis, ctx);

  return {
    typeEstimate: typeBlock,
    growthStage: growthBlock,
    health: healthBlock,
    ...(deficiencyAnalysis ? { deficiencyAnalysis } : {}),
    ...(harvestTiming ? { harvestTiming } : {}),
    ...(sexEstimate ? { sexEstimate } : {}),
    ...(stressAnalysis ? { stressAnalysis } : {}),
  };
}

function sumBuckets(b?: AiRanked["scoreBuckets"]): number {
  if (!b || typeof b !== "object") return 42;
  const vf = Number(b.visualFlower) || 0;
  const st = Number(b.structure) || 0;
  const oc = Number(b.ocr) || 0;
  const se = Number(b.secondary) || 0;
  const s = vf + st + oc + se;
  if (s <= 0) return 42;
  return Math.min(100, s);
}

/** Prefer 3 rows: fill from identity.alternateMatches when the model returns fewer ranked rows. */
function padCandidatesFromAlternates(
  candidates: AiRanked[],
  analysis: Record<string, unknown>
): AiRanked[] {
  if (candidates.length >= 3) return candidates.slice(0, 3);
  const seen = new Set(
    candidates
      .map((c) => normKey(String(c.strainName || "")))
      .filter(Boolean)
  );
  const alts = (analysis.identity as { alternateMatches?: { strainName?: string }[] })
    ?.alternateMatches;
  if (!Array.isArray(alts)) return candidates;
  const out = [...candidates];
  let slot = out.length;
  for (const a of alts) {
    if (out.length >= 3) break;
    const n = String(a?.strainName || "").trim();
    if (!n) continue;
    const k = normKey(n);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push({
      strainName: n,
      scoreBuckets: {
        visualFlower: Math.max(12, 22 - slot * 3),
        structure: 7,
        ocr: 4,
        secondary: 4,
      },
      reasons: [`Overlapping traits with the closest visual match`],
    });
    slot++;
  }
  return out.slice(0, 3);
}

function sanitizeMatchRows(rows: RankedMatchRow[]): RankedMatchRow[] {
  return rows
    .filter((r) => r && typeof r.name === "string" && r.name.trim().length > 0)
    .map((r, i) => {
      const conf = Math.min(95, Math.max(33, Number(r.confidence) || 50));
      return {
        rank: (i + 1) as 1 | 2 | 3,
        slug: typeof r.slug === "string" && r.slug ? r.slug : slugify(r.name),
        name: String(r.name).trim(),
        confidence: conf,
        confidenceLabel: getConfidenceLabel(conf),
        cardLabel: CARD_LABELS[i] ?? "Another possible match",
        reasons:
          Array.isArray(r.reasons) && r.reasons.length
            ? r.reasons.filter((x) => typeof x === "string").slice(0, 4)
            : ["Visual similarity to database cultivars"],
      };
    })
    .slice(0, 3);
}

function mergeUnifiedSummary(
  base: RankedScanSummary,
  signals: AiImageSignals
): UnifiedScanSummary {
  return {
    ...base,
    wholePlantDetected: !!signals.wholePlantDetected,
    flowerDetected: !!signals.flowerDetected,
    leafDetailDetected: !!signals.leafDetailDetected,
    packagedProductDetected: !!signals.packagedProductDetected,
  };
}

/**
 * Unified scan: top-3 strains + plant type / stage / health. Single pipeline.
 */
export function buildUnifiedScanPayload(
  analysis: Record<string, unknown>,
  imageCount: number
): UnifiedScanPayload {
  const signals = (analysis.imageSignals || {}) as AiImageSignals;
  const usable =
    signals.usableVisualSignal !== undefined ? !!signals.usableVisualSignal : true;
  const blur = signals.blurOrDarkness || "low";
  const textDetected = !!signals.textDetected;
  const strongOcr = !!signals.strongOcrAgreementWithVisualTopPick;

  const rankedRaw = Array.isArray(analysis.rankedMatches)
    ? (analysis.rankedMatches as AiRanked[])
    : [];

  if (!usable && rankedRaw.length === 0) {
    const sum = mergeUnifiedSummary(
      {
        confidenceTier: "very_low",
        multiPhotoUsed: imageCount > 1,
        textDetected,
        disclaimer: RANKED_DISCLAIMER,
      },
      signals
    );
    const plantAnalysis = buildPlantAnalysisPayload(analysis, signals, imageCount, {
      poorImage: true,
      blur,
      usable: false,
    });
    return {
      status: "poor_image",
      resultType: "unified_scan_analysis",
      summary: sum,
      matches: [],
      plantAnalysis,
      growCoach: attachGrowCoach(analysis, plantAnalysis, sum, signals, imageCount, {
        poorImage: true,
        blur,
        usable: false,
      }),
      improveTips: DEFAULT_IMPROVE_TIPS,
      poorImageMessage:
        "We couldn’t generate reliable matches from this image. Try a brighter, sharper close-up and include multiple angles if possible.",
    };
  }

  const poorImage =
    !usable ||
    blur === "high" ||
    (blur === "medium" && signals.usableVisualSignal === false);

  const fallbackName = String(
    (analysis.identity as { strainName?: string })?.strainName || "Unknown cultivar"
  );

  const fallbackReasons = [
    String(
      (analysis.reasoning as { whyThisMatch?: string })?.whyThisMatch ||
        "Visual similarity to database cultivars"
    ).slice(0, 200),
  ];

  let candidates: AiRanked[] = rankedRaw.slice(0, 3);
  candidates = padCandidatesFromAlternates(candidates, analysis);

  if (candidates.length === 0) {
    const alts = (analysis.identity as { alternateMatches?: { strainName?: string }[] })
      ?.alternateMatches;
    const altNames = Array.isArray(alts)
      ? alts.map((a) => String(a.strainName || "").trim()).filter(Boolean)
      : [];
    candidates = [
      {
        strainName: fallbackName,
        scoreBuckets: { visualFlower: 28, structure: 10, ocr: 6, secondary: 6 },
        reasons: fallbackReasons,
      },
      ...altNames.slice(0, 2).map((n, i) => ({
        strainName: n,
        scoreBuckets: {
          visualFlower: 22 - i * 2,
          structure: 8,
          ocr: 4,
          secondary: 5,
        },
        reasons: [`Related visual profile to ${fallbackName}`],
      })),
    ].slice(0, 3);
  }

  candidates = padCandidatesFromAlternates(candidates, analysis);

  const multiPhoto = imageCount > 1;

  let rows: RankedMatchRow[] = candidates.map((c, i) => {
    const name = String(c.strainName || fallbackName).trim() || fallbackName;
    const raw = sumBuckets(c.scoreBuckets);
    const multiBoost =
      multiPhoto && !!c.appearsInMultipleImagesConsistent;

    const conf = normalizeConfidence(raw, {
      strongOcrLabelAlignment: strongOcr && i === 0,
      multiImageAgreementBoost: multiBoost,
    });

    const slug = resolveStrainSlug(name);
    const reasons = uniqReasons(c.reasons, [
      ...fallbackReasons,
      "Comparable bud structure in the database",
      "Terpene and color cues align loosely",
    ]);

    const rank = (i + 1) as 1 | 2 | 3;
    return {
      rank,
      slug,
      name,
      confidence: conf,
      confidenceLabel: getConfidenceLabel(conf),
      cardLabel: CARD_LABELS[i] ?? "Another possible match",
      reasons,
    };
  });

  rows = sanitizeMatchRows(rows);

  const maxConf = rows.length ? Math.max(...rows.map((r) => r.confidence)) : 0;

  const summary: RankedScanSummary = {
    confidenceTier: getResultTier(rows),
    multiPhotoUsed: multiPhoto,
    textDetected,
    disclaimer: RANKED_DISCLAIMER,
  };

  if (isVeryLowConfidenceSet(maxConf) && rows.length > 0) {
    summary.setLabel = "Low-confidence visual suggestions";
  }

  if (poorImage && maxConf < 50) {
    const sum = mergeUnifiedSummary(
      {
        ...summary,
        confidenceTier: "very_low",
      },
      signals
    );
    const plantAnalysis = buildPlantAnalysisPayload(analysis, signals, imageCount, {
      poorImage: true,
      blur,
      usable,
    });
    return {
      status: "poor_image",
      resultType: "unified_scan_analysis",
      summary: sum,
      matches: rows,
      plantAnalysis,
      growCoach: attachGrowCoach(analysis, plantAnalysis, sum, signals, imageCount, {
        poorImage: true,
        blur,
        usable,
      }),
      improveTips: DEFAULT_IMPROVE_TIPS,
      poorImageMessage:
        "We couldn’t generate reliable matches from this image. Try a brighter, sharper close-up and include multiple angles if possible.",
    };
  }

  const mergedSummary = mergeUnifiedSummary(summary, signals);
  const plantAnalysis = buildPlantAnalysisPayload(analysis, signals, imageCount, {
    poorImage,
    blur,
    usable,
  });
  return {
    status: "ok",
    resultType: "unified_scan_analysis",
    summary: mergedSummary,
    matches: rows,
    plantAnalysis,
    growCoach: attachGrowCoach(analysis, plantAnalysis, mergedSummary, signals, imageCount, {
      poorImage,
      blur,
      usable,
    }),
    improveTips: DEFAULT_IMPROVE_TIPS,
  };
}

/** @deprecated use buildUnifiedScanPayload — same implementation */
export const buildRankedScanPayload = buildUnifiedScanPayload;

/** Legacy `result` blob for older view-model consumers (primary = rank 1). */
export function buildLegacyResultBlob(
  analysis: Record<string, unknown>,
  matches: RankedMatchRow[]
): Record<string, unknown> {
  const first = matches[0];
  const identity = (analysis.identity as Record<string, unknown>) || {};
  const primaryName = first?.name || identity.strainName || "Unknown Cultivar";
  const confidence =
    first?.confidence ?? (Number(identity.confidence) || 55);

  const alt = matches.slice(1, 3).map((m) => ({
    strainName: m.name,
    confidence: m.confidence,
  }));

  return {
    ...analysis,
    identity: {
      ...identity,
      strainName: primaryName,
      confidence: Math.min(95, confidence),
      alternateMatches: alt,
    },
  };
}
