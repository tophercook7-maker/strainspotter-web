/**
 * Grow Coach: turns unified plant insights into cautious, actionable next steps.
 * Never replaces expert or lab diagnosis.
 */

import type {
  GrowCoachLogSupport,
  GrowCoachPayload,
  PlantAnalysisPayload,
  RankedConfidenceTier,
} from "./rankedScanTypes";

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

export function getConfidenceLabelForCoach(confidence: number): string {
  if (confidence >= 80) return "High confidence";
  if (confidence >= 60) return "Moderate confidence";
  if (confidence >= 35) return "Low confidence";
  return "Low confidence";
}

/** Coach layer caps at 88; scales down with weak imagery or disagreeing signals. */
export function normalizeGrowCoachConfidence(
  raw: number,
  ctx: {
    poorImage: boolean;
    blur: "low" | "medium" | "high";
    summaryTier: RankedConfidenceTier;
    signalStrength: number;
    /** Healthy-looking health block vs deficiency/stress signals */
    insightDisagreement?: boolean;
  }
): number {
  let v = clamp(raw, 0, 100);
  v = 33 + (v / 100) * (88 - 33);
  if (ctx.poorImage) v *= 0.78;
  if (ctx.blur === "high") v *= 0.82;
  else if (ctx.blur === "medium") v *= 0.92;
  if (ctx.summaryTier === "very_low") v *= 0.85;
  if (ctx.insightDisagreement) v *= 0.9;
  v *= 0.92 + ctx.signalStrength * 0.08;
  return Math.round(clamp(v, 33, 88));
}

function insightDisagreement(plant: PlantAnalysisPayload): boolean {
  const h = plant.health?.label.toLowerCase() ?? "";
  const readsHealthy =
    /healthy|mostly healthy/.test(h) &&
    !/needs attention|stressed|poor|quality/.test(h);
  if (!readsHealthy) return false;
  if (plant.deficiencyAnalysis?.likelyIssues?.length) return true;
  if (plant.stressAnalysis?.patterns?.length) return true;
  return false;
}

function uniqStrings(arr: unknown, max: number): string[] {
  if (!Array.isArray(arr)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const x of arr) {
    if (typeof x !== "string") continue;
    const t = x.trim();
    if (!t || seen.has(t.toLowerCase())) continue;
    seen.add(t.toLowerCase());
    out.push(t);
    if (out.length >= max) break;
  }
  return out;
}

/** Average confidence from plant blocks to feed coach normalization. */
function pickFollowUpWindow(
  plant: PlantAnalysisPayload,
  limited: boolean
): string {
  if (limited) return "Re-scan when you can capture sharper, well-lit photos";
  const g = plant.growthStage?.label.toLowerCase() ?? "";
  if (g.includes("flower") || g.includes("harvest")) return "2 to 4 days";
  return "3 to 5 days";
}

/** Short label for UI / metadata */
function recommendedFollowUpWindowShort(
  plant: PlantAnalysisPayload,
  limited: boolean
): string {
  if (limited) return "Clearer photos first";
  const g = plant.growthStage?.label.toLowerCase() ?? "";
  if (g.includes("flower") || g.includes("harvest")) return "2 to 4 days";
  return "3 to 5 days";
}

function resolveTopStrainName(analysis: Record<string, unknown>): string | undefined {
  const ranked = Array.isArray(analysis.rankedMatches)
    ? (analysis.rankedMatches as { strainName?: string }[])
    : [];
  const first = ranked[0]?.strainName?.trim();
  if (first) return first;
  const id = (analysis.identity as { strainName?: string } | undefined)?.strainName?.trim();
  return id || undefined;
}

function buildTags(plant: PlantAnalysisPayload, topStrain?: string): string[] {
  const tags: string[] = [];
  if (topStrain) tags.push(`strain:${topStrain.slice(0, 40)}`);
  if (plant.growthStage?.label) tags.push(`stage:${plant.growthStage.label.slice(0, 32)}`);
  if (plant.health?.label) tags.push(`health:${plant.health.label.slice(0, 28)}`);
  return tags.slice(0, 8);
}

function collectPossibleIssues(plant: PlantAnalysisPayload): string[] {
  const out: string[] = [];
  if (plant.deficiencyAnalysis?.likelyIssues?.length) {
    for (const li of plant.deficiencyAnalysis.likelyIssues.slice(0, 4)) {
      out.push(li.name);
    }
  }
  if (plant.stressAnalysis?.patterns?.length) {
    for (const p of plant.stressAnalysis.patterns.slice(0, 3)) {
      out.push(p.type);
    }
  }
  if (plant.health?.issues?.length) {
    for (const x of plant.health.issues.slice(0, 3)) {
      if (!out.some((o) => o.toLowerCase() === x.toLowerCase())) out.push(x);
    }
  }
  return out.slice(0, 8);
}

function buildLogSupport(
  plant: PlantAnalysisPayload,
  mergedPriority: string[],
  mergedWatch: string[],
  mergedSuggest: string[],
  topStrain: string | undefined,
  limited: boolean
): GrowCoachLogSupport {
  const stage = plant.growthStage?.label?.trim() || "Stage not clear";
  const health = plant.health?.label?.trim() || "Not assessed";
  const issues = collectPossibleIssues(plant);

  const suggestedEntryTitle = limited
    ? "Scan check-in (limited photo detail)"
    : `${stage}${topStrain ? ` · ${topStrain}` : ""}`.slice(0, 88);

  let suggestedSummary = limited
    ? "Photo detail was limited, so coaching stays cautious. Consider clearer full-plant and leaf close-ups next time."
    : `Visual read: ${stage}; health appears ${health.toLowerCase()} — estimates only, not a diagnosis. `;
  if (!limited && issues.length) {
    suggestedSummary += `Possible areas to watch: ${issues.slice(0, 3).join("; ")}. `;
  }
  if (!limited && mergedPriority.length) {
    suggestedSummary += `Coach focus: ${mergedPriority[0]}`;
    if (mergedPriority[1]) suggestedSummary += `; ${mergedPriority[1]}`;
    suggestedSummary += ".";
  }

  const followUpSuggestion = limited
    ? "Re-scan with sharper focus and even lighting when you can."
    : `Consider a follow-up scan in about ${recommendedFollowUpWindowShort(plant, false)} to compare visible changes with similar framing.`;

  return {
    suggestedEntryTitle,
    suggestedSummary: suggestedSummary.trim(),
    suggestedFields: {
      growthStage: stage,
      healthStatus: health,
      possibleIssues: issues,
      recommendedActions: mergedPriority.slice(0, 6),
      watchFor: mergedWatch.slice(0, 6),
    },
    followUpSuggestion,
    tags: buildTags(plant, topStrain),
  };
}

function mergeLogSupport(
  model: unknown,
  fallback: GrowCoachLogSupport
): GrowCoachLogSupport {
  const m = (model || {}) as Record<string, unknown>;
  const sf = (m.suggestedFields || {}) as Record<string, unknown>;
  const title =
    typeof m.suggestedEntryTitle === "string" && m.suggestedEntryTitle.trim()
      ? m.suggestedEntryTitle.trim()
      : fallback.suggestedEntryTitle;
  const summary =
    typeof m.suggestedSummary === "string" && m.suggestedSummary.trim()
      ? m.suggestedSummary.trim()
      : fallback.suggestedSummary;
  const follow =
    typeof m.followUpSuggestion === "string" && m.followUpSuggestion.trim()
      ? m.followUpSuggestion.trim()
      : fallback.followUpSuggestion;

  const mergedFields = {
    growthStage:
      typeof sf.growthStage === "string" && sf.growthStage.trim()
        ? sf.growthStage.trim()
        : fallback.suggestedFields.growthStage,
    healthStatus:
      typeof sf.healthStatus === "string" && sf.healthStatus.trim()
        ? sf.healthStatus.trim()
        : fallback.suggestedFields.healthStatus,
    possibleIssues: Array.isArray(sf.possibleIssues)
      ? sf.possibleIssues.filter((x) => typeof x === "string").slice(0, 8)
      : fallback.suggestedFields.possibleIssues,
    recommendedActions: Array.isArray(sf.recommendedActions)
      ? sf.recommendedActions.filter((x) => typeof x === "string").slice(0, 8)
      : fallback.suggestedFields.recommendedActions,
    watchFor: Array.isArray(sf.watchFor)
      ? sf.watchFor.filter((x) => typeof x === "string").slice(0, 8)
      : fallback.suggestedFields.watchFor,
  };

  const tagsRaw = Array.isArray(m.tags)
    ? m.tags.filter((x) => typeof x === "string").slice(0, 10)
    : [];
  const tags = tagsRaw.length ? tagsRaw : fallback.tags;

  return {
    suggestedEntryTitle: title,
    suggestedSummary: summary,
    suggestedFields: mergedFields,
    followUpSuggestion: follow,
    ...(tags?.length ? { tags } : {}),
  };
}

export type ProgressionNotePriorKind = "saved" | "session";

export function buildProgressionNoteForClient(
  prior: { capturedAt: string; plantAnalysis: PlantAnalysisPayload },
  plant: PlantAnalysisPayload,
  options?: { priorKind?: ProgressionNotePriorKind }
): string | undefined {
  return progressionNoteFromPrior(
    {
      capturedAt: prior.capturedAt,
      growthStageLabel: prior.plantAnalysis.growthStage?.label,
      healthLabel: prior.plantAnalysis.health?.label,
    },
    plant,
    options?.priorKind ?? "session"
  );
}

function progressionNoteFromPrior(
  prior: { capturedAt: string; growthStageLabel?: string; healthLabel?: string } | undefined,
  plant: PlantAnalysisPayload,
  priorKind: ProgressionNotePriorKind = "session"
): string | undefined {
  if (!prior?.capturedAt) return undefined;
  const prevG = prior.growthStageLabel?.trim();
  const currG = plant.growthStage?.label?.trim();
  const prevH = prior.healthLabel?.trim();
  const currH = plant.health?.label?.trim();
  const prevDate = new Date(prior.capturedAt).toLocaleDateString();
  const ref =
    priorKind === "saved"
      ? "your previous saved scan"
      : "your last scan";
  if (prevG && currG && prevG !== currG) {
    return `Compared with ${ref} (${prevDate}), estimated stage shifted from “${prevG}” to “${currG}” — visual estimates only.`;
  }
  if (prevH && currH && prevH !== currH) {
    return `Compared with ${ref} (${prevDate}), the health read changed from “${prevH}” to “${currH}” — photo conditions affect this.`;
  }
  if (prevG && currG && prevG === currG) {
    return `Estimated stage matches ${ref} (${prevDate}). Compare photos side-by-side for gradual changes.`;
  }
  return priorKind === "saved"
    ? `Previous saved scan on ${prevDate}. Re-scanning on a similar schedule helps track progression — not a guarantee of change.`
    : `Last scan on ${prevDate}. Re-scanning on a similar schedule helps track progression — not a guarantee of change.`;
}

function computeSignalStrength(plant: PlantAnalysisPayload): number {
  const vals: number[] = [];
  if (plant.typeEstimate) vals.push(plant.typeEstimate.confidence);
  if (plant.growthStage) vals.push(plant.growthStage.confidence);
  if (plant.health) vals.push(plant.health.confidence);
  if (plant.deficiencyAnalysis) vals.push(plant.deficiencyAnalysis.confidence);
  if (plant.harvestTiming) vals.push(plant.harvestTiming.confidence);
  if (plant.sexEstimate) vals.push(plant.sexEstimate.confidence);
  if (plant.stressAnalysis) vals.push(plant.stressAnalysis.confidence);
  if (vals.length === 0) return 0.35;
  return vals.reduce((a, b) => a + b, 0) / vals.length / 100;
}

export function buildGrowCoachPayload(
  analysis: Record<string, unknown>,
  plant: PlantAnalysisPayload,
  ctx: {
    poorImage: boolean;
    blur: "low" | "medium" | "high";
    usable: boolean;
    summaryTier: RankedConfidenceTier;
    imageCount: number;
    wholePlant: boolean;
    flower: boolean;
    leaf: boolean;
    /** Optional — client may supply last scan for continuity wording */
    priorScanSnapshot?: {
      capturedAt: string;
      growthStageLabel?: string;
      healthLabel?: string;
    };
  }
): GrowCoachPayload {
  const modelGc = (analysis.growCoach || {}) as Record<string, unknown>;
  const modelLs = modelGc.logSupport;
  const signalStrength = computeSignalStrength(plant);

  const rawCoachConf =
    Number(modelGc.confidence ?? modelGc.rawScore ?? 65) || 65;
  const disagree = insightDisagreement(plant);
  const confidence = normalizeGrowCoachConfidence(rawCoachConf, {
    poorImage: ctx.poorImage,
    blur: ctx.blur,
    summaryTier: ctx.summaryTier,
    signalStrength,
    insightDisagreement: disagree,
  });

  const limited =
    !ctx.usable ||
    ctx.poorImage ||
    ctx.blur === "high" ||
    (!ctx.wholePlant && !ctx.leaf && !ctx.flower) ||
    ctx.summaryTier === "very_low";

  const priorityActions: string[] = [];
  const suggestions: string[] = [];
  const watchFor: string[] = [];
  const cautions: string[] = [];

  const h = plant.health?.label?.toLowerCase() ?? "";
  const healthHigh =
    /healthy|mostly healthy/.test(h) && !/needs attention|stressed|poor/.test(h);

  if (plant.deficiencyAnalysis?.likelyIssues?.length) {
    priorityActions.push(
      "Consider checking nutrient balance before the next feeding — based on visible signs only"
    );
    priorityActions.push(
      "Monitor whether new growth looks healthier over the next few days"
    );
    watchFor.push("Spreading yellowing or discoloration on newer leaves");
    suggestions.push(
      "If issues continue, reviewing pH may help — photo-based only"
    );
  }

  if (plant.stressAnalysis?.patterns?.length) {
    for (const p of plant.stressAnalysis.patterns.slice(0, 2)) {
      const t = p.type.toLowerCase();
      if (t.includes("heat") || t.includes("light")) {
        priorityActions.push(
          "Consider checking canopy heat and light distance — small adjustments may help"
        );
        watchFor.push("Continued upward leaf curl or bleaching");
      }
      if (t.includes("water")) {
        priorityActions.push(
          "Let the medium dry more evenly between waterings if leaf posture suggests overwatering"
        );
        watchFor.push("Whether leaf posture improves after the next watering cycle");
      }
    }
  }

  if (plant.harvestTiming) {
    const hl = plant.harvestTiming.label.toLowerCase();
    if (hl.includes("harvest") || hl.includes("approaching")) {
      suggestions.push(
        "Keep checking pistil darkening and overall bud maturity — timing is a visual estimate"
      );
      suggestions.push(
        "A close-up flower photo may help refine harvest-window guidance"
      );
      watchFor.push("Rapid changes in pistil color and resin appearance");
    }
  }

  if (plant.sexEstimate && plant.sexEstimate.confidence < 70) {
    suggestions.push(
      "A closer node-level photo may help clarify sex cues — avoid hard conclusions from one frame"
    );
  }

  if (healthHigh && plant.deficiencyAnalysis == null && !plant.stressAnalysis) {
    priorityActions.push(
      "Stay consistent with your current environment and feeding routine based on what looks stable"
    );
    suggestions.push(
      "Keep monitoring new growth color and leaf posture over the next few days"
    );
  }

  if (ctx.flower && !plant.harvestTiming) {
    suggestions.push(
      "Continue observing flower development — harvest timing needs clear bud and pistil detail"
    );
  }

  if (!ctx.wholePlant && (ctx.leaf || ctx.flower)) {
    suggestions.push(
      "Include one full-plant photo when possible for stronger plant coaching"
    );
  }

  if (ctx.imageCount >= 2 && signalStrength > 0.55) {
    suggestions.push(
      "Multiple angles may help — keep lighting consistent between checks"
    );
  }

  cautions.push(
    "These suggestions are based only on visible signs in the uploaded images"
  );
  if (limited) {
    cautions.push(
      "Photo-based coaching is most reliable when leaves and overall plant structure are clearly visible"
    );
  }

  const seedPriority = uniqStrings(modelGc.priorityActions, 3);
  const seedSuggest = uniqStrings(modelGc.suggestions, 4);
  const seedWatch = uniqStrings(modelGc.watchFor, 4);
  const seedCaution = uniqStrings(modelGc.cautions, 2);

  const mergedPriority = [...seedPriority, ...priorityActions].filter(
    (x, i, a) => a.indexOf(x) === i
  ).slice(0, 3);
  const mergedSuggest = [...seedSuggest, ...suggestions].filter(
    (x, i, a) => a.indexOf(x) === i
  ).slice(0, 4);
  const mergedWatch = [...seedWatch, ...watchFor].filter(
    (x, i, a) => a.indexOf(x) === i
  ).slice(0, 4);
  const mergedCaution = [...seedCaution, ...cautions].filter(
    (x, i, a) => a.indexOf(x) === i
  ).slice(0, 2);

  const headline =
    typeof modelGc.headline === "string" && modelGc.headline.trim()
      ? modelGc.headline.trim()
      : limited
        ? "Limited coaching available from this scan"
        : "Suggested next steps";

  const topStrain = resolveTopStrainName(analysis);

  const baseLog = buildLogSupport(
    plant,
    mergedPriority,
    mergedWatch,
    mergedSuggest,
    topStrain,
    limited
  );
  const logSupport = mergeLogSupport(modelLs, baseLog);
  const followWindowLabel = recommendedFollowUpWindowShort(plant, limited);
  const progressionNote = progressionNoteFromPrior(ctx.priorScanSnapshot, plant, "session");

  if (limited && mergedPriority.length === 0 && mergedSuggest.length < 2) {
    const limConf = normalizeGrowCoachConfidence(42, {
      poorImage: true,
      blur: ctx.blur,
      summaryTier: ctx.summaryTier,
      signalStrength: 0.25,
      insightDisagreement: false,
    });
    const limLog = mergeLogSupport(modelLs, {
      ...baseLog,
      suggestedEntryTitle: "Scan check-in (limited photo detail)",
      suggestedSummary:
        "Limited detail in-frame — log what you observed and plan a clearer re-scan when possible.",
      followUpSuggestion:
        "Re-scan with sharper focus and even lighting when you can.",
    });
    return {
      headline: "Limited coaching available from this scan",
      confidence: limConf,
      confidenceLabel: getConfidenceLabelForCoach(limConf),
      priorityActions: [
        "Use one full-plant photo, one close leaf photo, and one flower close-up for stronger guidance",
      ],
      suggestions: [
        "Natural light and sharp focus may help interpret leaf color and posture",
        "Re-scan after small environmental changes to compare visible signs",
      ],
      watchFor: ["Whether clarity improves on retake"],
      cautions: mergedCaution.length
        ? mergedCaution
        : [
            "These suggestions are based only on visible signs in the uploaded images",
          ],
      limited: true,
      logSupport: limLog,
      recommendedFollowUpWindow: followWindowLabel,
      ...(progressionNote ? { progressionNote } : {}),
    };
  }

  return {
    headline,
    confidence,
    confidenceLabel: getConfidenceLabelForCoach(confidence),
    priorityActions: mergedPriority,
    suggestions: mergedSuggest,
    watchFor: mergedWatch,
    cautions: mergedCaution,
    limited: limited ? true : undefined,
    logSupport,
    recommendedFollowUpWindow: followWindowLabel,
    ...(progressionNote ? { progressionNote } : {}),
  };
}
