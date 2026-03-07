// lib/scanner/effectExperiencePredictionV78.ts
// Phase 7.8 — Effects & Experience Prediction Engine

import type { CultivarReference } from "./cultivarLibrary";
import type { FusedFeatures } from "./multiImageFusion";

/**
 * Phase 7.8 — Effect Entry
 */
export type EffectEntryV78 = {
  name: string;
  category: "primary" | "secondary";
  intensity: "high" | "medium" | "low";
  reasoning: string[]; // Why this effect was predicted
};

/**
 * Phase 7.8 — Timing Curve
 */
export type TimingCurveV78 = {
  onsetSpeed: "Fast" | "Moderate" | "Slow";
  peakWindow: string; // "15–30 minutes" or "30–60 minutes"
  durationRange: string; // "2–3 hours" or "3–4 hours"
  reasoning: string[]; // Why this timing was predicted
};

/**
 * Phase 7.8 — Experience Prediction Result
 */
export type EffectExperiencePredictionV78 = {
  primaryEffects: EffectEntryV78[]; // Top 3
  secondaryEffects: EffectEntryV78[]; // 2–4
  timingCurve: TimingCurveV78;
  experienceSummary: string; // Natural-language paragraph
  varianceNotes: string[]; // Why effects may differ
  confidence: "very_high" | "high" | "medium" | "low";
  confidenceLabel: string;
  explanation: string[]; // Why this prediction was made
  source: "database_primary" | "database_blended" | "database_visual" | "database_visual_terpene" | "database_visual_terpene_consensus" | "inferred_visual" | "default";
};

/**
 * Phase 7.8 Step 7.8.1 — INPUTS
 * 
 * Consume outputs from:
 * - Phase 7.7 (Indica/Sativa ratio)
 * - Consensus strain match
 * - Terpene likelihoods
 * - Cannabinoid ranges (THC/CBD/CBG/etc)
 * - Confidence tier
 */
type EffectPredictionInputsV78 = {
  strainName: string;
  dbEntry?: CultivarReference;
  indicaPercent: number;
  sativaPercent: number;
  terpeneProfile?: Array<{ name: string; likelihood: string }>;
  cannabinoidRanges?: Array<{ compound: string; min: number; max: number }>;
  confidence: "very_high" | "high" | "medium" | "low";
  fusedFeatures?: FusedFeatures;
};

/**
 * Phase 7.8 Step 7.8.2 — EFFECT MODEL
 * 
 * Build effects using a layered model:
 * 
 * A) PRIMARY EFFECTS (Top 3)
 * Examples:
 * - Relaxation
 * - Euphoria
 * - Focus
 * - Creativity
 * - Sedation
 * - Uplift
 * 
 * B) SECONDARY EFFECTS (2–4)
 * Examples:
 * - Body heaviness
 * - Mental clarity
 * - Appetite stimulation
 * - Social ease
 * - Pain relief
 * 
 * C) VARIANCE NOTES
 * Explain why effects may differ:
 * - Phenotype variation
 * - User tolerance
 * - Harvest timing
 * - Cure quality
 */
function buildEffectModelV78(
  inputs: EffectPredictionInputsV78
): {
  primaryEffects: EffectEntryV78[];
  secondaryEffects: EffectEntryV78[];
  varianceNotes: string[];
} {
  const primaryEffects: EffectEntryV78[] = [];
  const secondaryEffects: EffectEntryV78[] = [];
  const varianceNotes: string[] = [];
  
  const { indicaPercent, sativaPercent, dbEntry, terpeneProfile, confidence } = inputs;
  
  // Phase 7.8.2 — Determine dominance class
  const isIndicaDominant = indicaPercent > 55;
  const isSativaDominant = sativaPercent > 55;
  const isBalanced = indicaPercent >= 45 && indicaPercent <= 55;
  
  // Phase 7.8.2 — Base effects from database
  const dbEffects = dbEntry?.effects || [];
  const dbPrimaryEffects = dbEffects.slice(0, 3).map((effect, index) => ({
    name: effect,
    category: "primary" as const,
    intensity: index === 0 ? "high" as const : index === 1 ? "medium" as const : "low" as const,
    reasoning: ["Strain database: commonly reported effect"],
  }));
  
  // Phase 7.8.2 — Adjust based on ratio
  if (isIndicaDominant) {
    // Indica-dominant: Body relaxation, calm, sedation
    if (dbPrimaryEffects.length === 0) {
      primaryEffects.push(
        { name: "Relaxation", category: "primary", intensity: "high", reasoning: ["Indica-dominant ratio (65%+ Indica) suggests strong body relaxation"] },
        { name: "Calm", category: "primary", intensity: "medium", reasoning: ["Indica-dominant profile typically produces calming effects"] },
        { name: "Body heaviness", category: "primary", intensity: "medium", reasoning: ["Indica genetics favor physical relaxation"] }
      );
    } else {
      primaryEffects.push(...dbPrimaryEffects);
    }
    
    secondaryEffects.push(
      { name: "Sedation", category: "secondary", intensity: "medium", reasoning: ["Indica-dominant strains often produce sedating effects"] },
      { name: "Appetite stimulation", category: "secondary", intensity: "low", reasoning: ["Common secondary effect in indica-dominant strains"] },
      { name: "Pain relief", category: "secondary", intensity: "low", reasoning: ["Body-focused effects may include pain relief"] }
    );
  } else if (isSativaDominant) {
    // Sativa-dominant: Energy, creativity, focus
    if (dbPrimaryEffects.length === 0) {
      primaryEffects.push(
        { name: "Euphoria", category: "primary", intensity: "high", reasoning: ["Sativa-dominant ratio (65%+ Sativa) suggests uplifting cerebral effects"] },
        { name: "Energy", category: "primary", intensity: "medium", reasoning: ["Sativa-dominant profile typically produces energizing effects"] },
        { name: "Focus", category: "primary", intensity: "medium", reasoning: ["Sativa genetics favor mental clarity"] }
      );
    } else {
      primaryEffects.push(...dbPrimaryEffects);
    }
    
    secondaryEffects.push(
      { name: "Creativity", category: "secondary", intensity: "medium", reasoning: ["Sativa-dominant strains often enhance creative thinking"] },
      { name: "Social ease", category: "secondary", intensity: "low", reasoning: ["Uplifting effects may enhance social interactions"] },
      { name: "Mental clarity", category: "secondary", intensity: "low", reasoning: ["Cerebral effects may include mental clarity"] }
    );
  } else {
    // Balanced hybrid: Mix of both
    if (dbPrimaryEffects.length === 0) {
      primaryEffects.push(
        { name: "Relaxation", category: "primary", intensity: "medium", reasoning: ["Balanced hybrid combines body relaxation with cerebral effects"] },
        { name: "Euphoria", category: "primary", intensity: "medium", reasoning: ["Balanced profile produces mood elevation"] },
        { name: "Focus", category: "primary", intensity: "low", reasoning: ["Hybrid genetics may include mental clarity"] }
      );
    } else {
      primaryEffects.push(...dbPrimaryEffects);
    }
    
    secondaryEffects.push(
      { name: "Body heaviness", category: "secondary", intensity: "low", reasoning: ["Indica component provides physical relaxation"] },
      { name: "Creativity", category: "secondary", intensity: "low", reasoning: ["Sativa component provides mental stimulation"] },
      { name: "Social ease", category: "secondary", intensity: "low", reasoning: ["Balanced effects support social use"] }
    );
  }
  
  // Phase 7.8.2 — Terpene-driven adjustments
  if (terpeneProfile && terpeneProfile.length > 0) {
    terpeneProfile.forEach(terpene => {
      const nameLower = terpene.name.toLowerCase();
      const likelihood = terpene.likelihood.toLowerCase();
      
      if (nameLower === "myrcene" && (likelihood === "high" || likelihood === "medium")) {
        // Myrcene → deeper body relaxation
        const relaxationEffect = primaryEffects.find(e => e.name.toLowerCase().includes("relax"));
        if (relaxationEffect) {
          relaxationEffect.intensity = "high";
          relaxationEffect.reasoning.push("Myrcene enhances body relaxation");
        }
      } else if (nameLower === "limonene" && (likelihood === "high" || likelihood === "medium")) {
        // Limonene → mood lift
        const euphoriaEffect = primaryEffects.find(e => e.name.toLowerCase().includes("euphor") || e.name.toLowerCase().includes("uplift"));
        if (euphoriaEffect) {
          euphoriaEffect.intensity = "high";
          euphoriaEffect.reasoning.push("Limonene enhances mood elevation");
        }
      } else if (nameLower === "pinene" && (likelihood === "high" || likelihood === "medium")) {
        // Pinene → alertness / focus
        const focusEffect = primaryEffects.find(e => e.name.toLowerCase().includes("focus") || e.name.toLowerCase().includes("clarity"));
        if (focusEffect) {
          focusEffect.intensity = "high";
          focusEffect.reasoning.push("Pinene enhances mental clarity");
        }
      } else if (nameLower === "linalool" && (likelihood === "high" || likelihood === "medium")) {
        // Linalool → calm / anxiety relief
        const calmEffect = primaryEffects.find(e => e.name.toLowerCase().includes("calm"));
        if (calmEffect) {
          calmEffect.intensity = "high";
          calmEffect.reasoning.push("Linalool enhances calming effects");
        }
      }
    });
  }
  
  // Phase 7.8.2 — Variance notes
  varianceNotes.push("Effects vary by individual tolerance and phenotype");
  varianceNotes.push("Harvest timing and cure quality can influence effect intensity");
  if (confidence === "low" || confidence === "medium") {
    varianceNotes.push("Estimated effects based on visual traits and reference data");
  }
  
  return {
    primaryEffects: primaryEffects.slice(0, 3), // Top 3
    secondaryEffects: secondaryEffects.slice(0, 4), // 2–4
    varianceNotes,
  };
}

/**
 * Phase 7.8 Step 7.8.3 — TIMING CURVE
 * 
 * Generate:
 * - Onset speed (Fast / Moderate / Slow)
 * - Peak window (minutes–hours)
 * - Duration range
 * 
 * Based on:
 * - Dominance ratio
 * - Terpene volatility
 * - Bud density (visual inference)
 */
function generateTimingCurveV78(
  inputs: EffectPredictionInputsV78
): TimingCurveV78 {
  const { indicaPercent, sativaPercent, terpeneProfile, fusedFeatures } = inputs;
  
  // Phase 7.8.3 — Base timing on dominance ratio
  const isIndicaDominant = indicaPercent > 55;
  const isSativaDominant = sativaPercent > 55;
  
  let onsetSpeed: "Fast" | "Moderate" | "Slow";
  let peakWindow: string;
  let durationRange: string;
  const reasoning: string[] = [];
  
  if (isSativaDominant) {
    // Sativa-dominant: Faster onset, shorter duration
    onsetSpeed = "Fast";
    peakWindow = "15–30 minutes";
    durationRange = "2–3 hours";
    reasoning.push("Sativa-dominant strains typically have faster onset and shorter duration");
  } else if (isIndicaDominant) {
    // Indica-dominant: Slower onset, longer duration
    onsetSpeed = "Slow";
    peakWindow = "30–60 minutes";
    durationRange = "3–4 hours";
    reasoning.push("Indica-dominant strains typically have slower onset and longer duration");
  } else {
    // Balanced hybrid: Moderate timing
    onsetSpeed = "Moderate";
    peakWindow = "20–40 minutes";
    durationRange = "2.5–3.5 hours";
    reasoning.push("Balanced hybrid produces moderate timing characteristics");
  }
  
  // Phase 7.8.3 — Terpene volatility adjustments
  if (terpeneProfile && terpeneProfile.length > 0) {
    const hasVolatileTerpenes = terpeneProfile.some(t => {
      const nameLower = t.name.toLowerCase();
      const likelihood = t.likelihood.toLowerCase();
      return (nameLower === "limonene" || nameLower === "pinene" || nameLower === "terpinolene") && 
             (likelihood === "high" || likelihood === "medium");
    });
    
    if (hasVolatileTerpenes && onsetSpeed === "Slow") {
      onsetSpeed = "Moderate";
      reasoning.push("Volatile terpenes (Limonene/Pinene/Terpinolene) may accelerate onset");
    }
  }
  
  // Phase 7.8.3 — Bud density (visual inference)
  if (fusedFeatures) {
    if (fusedFeatures.budStructure === "high") {
      // Dense buds → slower onset (more material to process)
      if (onsetSpeed === "Fast") {
        onsetSpeed = "Moderate";
        reasoning.push("Dense bud structure may slow onset slightly");
      }
    } else if (fusedFeatures.budStructure === "low") {
      // Airy buds → faster onset (less material, more surface area)
      if (onsetSpeed === "Slow") {
        onsetSpeed = "Moderate";
        reasoning.push("Airy bud structure may accelerate onset");
      }
    }
  }
  
  return {
    onsetSpeed,
    peakWindow,
    durationRange,
    reasoning,
  };
}

/**
 * Phase 7.8 Step 7.8.4 — EXPERIENCE SUMMARY
 * 
 * Produce a natural-language paragraph:
 * 
 * Example:
 * "Users typically report an uplifting cerebral onset followed by a calm body relaxation. Focus and mood elevation are common early, with a smooth transition into physical ease."
 * 
 * Tone rules:
 * - Neutral
 * - Educational
 * - Never medical
 * - Never guaranteed
 */
function generateExperienceSummaryV78(
  primaryEffects: EffectEntryV78[],
  secondaryEffects: EffectEntryV78[],
  timingCurve: TimingCurveV78,
  indicaPercent: number,
  sativaPercent: number,
  confidence: "very_high" | "high" | "medium" | "low"
): string {
  const isIndicaDominant = indicaPercent > 55;
  const isSativaDominant = sativaPercent > 55;
  
  // Phase 7.8.4 — Build summary based on dominance and effects
  const primaryNames = primaryEffects.map(e => e.name.toLowerCase());
  const secondaryNames = secondaryEffects.map(e => e.name.toLowerCase());
  
  let summary = "Users typically report ";
  
  if (isSativaDominant) {
    // Sativa-dominant experience
    if (primaryNames.some(n => n.includes("euphor") || n.includes("uplift"))) {
      summary += "an uplifting cerebral onset";
    } else if (primaryNames.some(n => n.includes("energ"))) {
      summary += "an energizing onset";
    } else {
      summary += "a cerebral onset";
    }
    
    if (primaryNames.some(n => n.includes("focus") || n.includes("creativ"))) {
      summary += " with enhanced focus and creativity";
    }
    
    if (secondaryNames.some(n => n.includes("social"))) {
      summary += ". Social ease and mood elevation are common";
    }
  } else if (isIndicaDominant) {
    // Indica-dominant experience
    if (primaryNames.some(n => n.includes("relax") || n.includes("calm"))) {
      summary += "a gradual body relaxation";
    } else {
      summary += "a physical onset";
    }
    
    if (primaryNames.some(n => n.includes("sedat"))) {
      summary += " that transitions into sedation";
    }
    
    if (secondaryNames.some(n => n.includes("appetite"))) {
      summary += ". Appetite stimulation may occur";
    }
  } else {
    // Balanced hybrid experience
    if (primaryNames.some(n => n.includes("euphor") || n.includes("uplift"))) {
      summary += "an uplifting onset";
    } else if (primaryNames.some(n => n.includes("relax"))) {
      summary += "a balanced onset";
    } else {
      summary += "a gradual onset";
    }
    
    if (primaryNames.some(n => n.includes("relax")) && primaryNames.some(n => n.includes("euphor") || n.includes("focus"))) {
      summary += " combining cerebral stimulation with body relaxation";
    }
  }
  
  // Phase 7.8.4 — Add timing context
  if (timingCurve.onsetSpeed === "Fast") {
    summary += ". Effects typically begin within " + timingCurve.peakWindow;
  } else if (timingCurve.onsetSpeed === "Slow") {
    summary += ". Effects typically develop over " + timingCurve.peakWindow;
  } else {
    summary += ". Effects typically peak within " + timingCurve.peakWindow;
  }
  
  summary += ", with a duration of approximately " + timingCurve.durationRange + ".";
  
  // Phase 7.8.4 — Adjust tone based on confidence
  if (confidence === "low" || confidence === "medium") {
    summary = summary.replace("typically report", "may experience");
    summary = summary.replace("typically", "often");
  }
  
  return summary;
}

/**
 * Phase 7.8 Step 7.8.5 — CONFIDENCE BINDING
 * 
 * Adjust specificity by confidence tier:
 * - Very High → Specific language
 * - High → Clear but cautious
 * - Medium → Broader phrasing
 * - Low → Emphasize uncertainty
 */
function applyConfidenceBindingV78(
  experienceSummary: string,
  primaryEffects: EffectEntryV78[],
  secondaryEffects: EffectEntryV78[],
  confidence: "very_high" | "high" | "medium" | "low"
): {
  experienceSummary: string;
  primaryEffects: EffectEntryV78[];
  secondaryEffects: EffectEntryV78[];
} {
  // Phase 7.8.5 — Adjust language based on confidence
  let adjustedSummary = experienceSummary;
  
  if (confidence === "very_high") {
    // Very High → Specific language (no changes needed, already specific)
    adjustedSummary = adjustedSummary;
  } else if (confidence === "high") {
    // High → Clear but cautious
    adjustedSummary = adjustedSummary.replace("typically", "often");
    adjustedSummary = adjustedSummary.replace("common", "frequently observed");
  } else if (confidence === "medium") {
    // Medium → Broader phrasing
    adjustedSummary = adjustedSummary.replace("typically", "may");
    adjustedSummary = adjustedSummary.replace("often", "sometimes");
    adjustedSummary = adjustedSummary.replace("frequently", "occasionally");
  } else {
    // Low → Emphasize uncertainty
    adjustedSummary = adjustedSummary.replace("typically", "may");
    adjustedSummary = adjustedSummary.replace("often", "possibly");
    adjustedSummary = adjustedSummary.replace("sometimes", "potentially");
    adjustedSummary = "Estimated experience: " + adjustedSummary;
  }
  
  // Phase 7.8.5 — Adjust effect intensity based on confidence
  const adjustedPrimary = primaryEffects.map(effect => {
    if (confidence === "low" && effect.intensity === "high") {
      return { ...effect, intensity: "medium" as const };
    }
    return effect;
  });
  
  const adjustedSecondary = secondaryEffects.map(effect => {
    if (confidence === "low" && effect.intensity === "medium") {
      return { ...effect, intensity: "low" as const };
    }
    return effect;
  });
  
  return {
    experienceSummary: adjustedSummary,
    primaryEffects: adjustedPrimary,
    secondaryEffects: adjustedSecondary,
  };
}

/**
 * Phase 7.8 — MAIN FUNCTION
 */
export function generateEffectExperiencePredictionV78(
  strainName: string,
  dbEntry?: CultivarReference,
  indicaPercent?: number,
  sativaPercent?: number,
  terpeneProfile?: Array<{ name: string; likelihood: string }>,
  cannabinoidRanges?: Array<{ compound: string; min: number; max: number }>,
  confidence?: "very_high" | "high" | "medium" | "low",
  fusedFeatures?: FusedFeatures
): EffectExperiencePredictionV78 {
  // Phase 7.8.1 — INPUTS
  const inputs: EffectPredictionInputsV78 = {
    strainName,
    dbEntry,
    indicaPercent: indicaPercent || 50,
    sativaPercent: sativaPercent || 50,
    terpeneProfile,
    cannabinoidRanges,
    confidence: confidence || "medium",
    fusedFeatures,
  };
  
  // Phase 7.8.2 — EFFECT MODEL
  const effectModel = buildEffectModelV78(inputs);
  
  // Phase 7.8.3 — TIMING CURVE
  const timingCurve = generateTimingCurveV78(inputs);
  
  // Phase 7.8.4 — EXPERIENCE SUMMARY
  const experienceSummary = generateExperienceSummaryV78(
    effectModel.primaryEffects,
    effectModel.secondaryEffects,
    timingCurve,
    inputs.indicaPercent,
    inputs.sativaPercent,
    inputs.confidence
  );
  
  // Phase 7.8.5 — CONFIDENCE BINDING
  const confidenceBinding = applyConfidenceBindingV78(
    experienceSummary,
    effectModel.primaryEffects,
    effectModel.secondaryEffects,
    inputs.confidence
  );
  
  // Phase 7.8.5 — Build explanation
  const explanation: string[] = [
    `Effects predicted from ${inputs.indicaPercent}% Indica / ${inputs.sativaPercent}% Sativa ratio`,
    ...effectModel.primaryEffects.flatMap(e => e.reasoning),
    ...timingCurve.reasoning,
  ];
  
  // Phase 7.8.5 — Determine confidence label
  let confidenceLabel: string;
  if (inputs.confidence === "very_high") {
    confidenceLabel = "Very High: known strain + high confidence ratio";
  } else if (inputs.confidence === "high") {
    confidenceLabel = "High: known strain + moderate confidence ratio";
  } else if (inputs.confidence === "medium") {
    confidenceLabel = "Medium: estimated from ratio and visual traits";
  } else {
    confidenceLabel = "Low: estimated from visual cues";
  }
  
  // Phase 7.8.5 — Determine source
  let source: EffectExperiencePredictionV78["source"];
  if (inputs.dbEntry && inputs.terpeneProfile && inputs.terpeneProfile.length > 0 && inputs.fusedFeatures) {
    source = "database_visual_terpene_consensus";
  } else if (inputs.dbEntry && inputs.terpeneProfile && inputs.terpeneProfile.length > 0) {
    source = "database_visual_terpene";
  } else if (inputs.dbEntry && inputs.fusedFeatures) {
    source = "database_visual";
  } else if (inputs.dbEntry) {
    source = "database_primary";
  } else {
    source = "inferred_visual";
  }
  
  return {
    primaryEffects: confidenceBinding.primaryEffects,
    secondaryEffects: confidenceBinding.secondaryEffects,
    timingCurve,
    experienceSummary: confidenceBinding.experienceSummary,
    varianceNotes: effectModel.varianceNotes,
    confidence: inputs.confidence,
    confidenceLabel,
    explanation,
    source,
  };
}
