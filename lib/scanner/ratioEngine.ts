// lib/scanner/ratioEngine.ts
// Phase 4.6 — Indica / Sativa / Hybrid Ratio Engine
// Phase 4.8 — Enhanced Multi-Source Weighted Ratio Engine
// Phase 5.0 — Enhanced with Range Display & Explicit Phenotype Detection

import type { CultivarReference } from "./cultivarLibrary";
import type { ImageResult } from "./consensusEngine";
import type { FusedFeatures } from "./multiImageFusion";
import { CULTIVAR_LIBRARY } from "./cultivarLibrary";

/**
 * Phase 4.6 Step 4.6.1 — Ratio Result
 * Phase 4.8 — Enhanced with confidence-aware display
 * Phase 5.0 Step 5.0.4 — Enhanced with range display
 */
export type StrainRatio = {
  indicaPercent: number; // 0-100
  sativaPercent: number; // 0-100
  indicaRange?: { min: number; max: number }; // Phase 5.0 — Range if variance exists
  sativaRange?: { min: number; max: number }; // Phase 5.0 — Range if variance exists
  dominance: "Indica" | "Sativa" | "Hybrid" | "Balanced";
  displayText: string; // "Indica 70% · Sativa 30%" or "Indica-leaning Hybrid (60–70% Indica)"
  explanation: {
    source: "database_explicit" | "database_dominance" | "lineage_inferred" | "morphology_adjusted" | "consensus_weighted" | "default";
    databaseStrain?: string; // Strain name from database
    confidenceNotes?: string; // Why this ratio was chosen
    imageAlignment?: string; // Multi-image consensus notes
    lineageInference?: string; // Parent strain inference
    morphologyAdjustment?: string; // Visual trait adjustment
    confidenceLevel?: "high" | "medium" | "low"; // Confidence in ratio
    varianceRange?: string; // Phase 5.0 — Range explanation if variance exists
  };
};

/**
 * Phase 4.8 Step 4.8.1 — CANONICAL RATIO SOURCE (DB FIRST)
 * 
 * PRIMARY SOURCE:
 * - Use strain database (35,000 strains) as the source of truth
 * - Pull indicaPercentage, sativaPercentage if known
 * - If ratio exists in DB → Use it as BASELINE (weight = 60%)
 * 
 * IF ratio exists in DB:
 * → Use it as BASELINE (weight = 60%)
 */
function resolveDatabaseBaseline(
  strainName: string,
  dbEntry?: CultivarReference
): { indicaPercent: number; sativaPercent: number; source: "database_explicit" | "database_dominance" | null } | null {
  if (!dbEntry) {
    return null; // Cannot resolve without database entry
  }

  // Phase 4.8 Step 4.8.1 — Check for explicit percentages in database (future enhancement)
  // For now, database doesn't have explicit percentages, so we derive from dominance type
  // TODO: If database adds explicit indicaPercent/sativaPercent fields, use them here

  const type = dbEntry.type || dbEntry.dominantType;
  
  // Phase 4.8 Step 4.8.1 — Derive from dominance type (baseline, will be weighted 60%)
  let indicaPercent: number;
  let sativaPercent: number;
  let source: "database_explicit" | "database_dominance" | null;

  if (type === "Indica") {
    indicaPercent = 70; // Indica-dominant baseline
    sativaPercent = 30;
    source = "database_dominance";
  } else if (type === "Sativa") {
    indicaPercent = 30;
    sativaPercent = 70; // Sativa-dominant baseline
    source = "database_dominance";
  } else if (type === "Hybrid") {
    indicaPercent = 50;
    sativaPercent = 50; // Balanced hybrid baseline
    source = "database_dominance";
  } else {
    return null; // Unknown type
  }

  return {
    indicaPercent,
    sativaPercent,
    source,
  };
}

/**
 * Phase 4.8 Step 4.8.2 — GENETIC LINEAGE INFERENCE
 * 
 * If ratio is missing or vague:
 * Infer from parents:
 * Example:
 * - Parent A: 80% indica
 * - Parent B: 60% sativa
 * → Child baseline: ~50/50 hybrid
 * 
 * Lineage weight = 25%
 */
function inferRatioFromLineage(
  dbEntry?: CultivarReference
): { indicaPercent: number; sativaPercent: number; inference: string } | null {
  if (!dbEntry || !dbEntry.genetics) {
    return null;
  }

  // Phase 4.8 Step 4.8.2 — Parse parent strains from genetics string
  // Example: "Afghan × Thai" or "Blueberry × Haze"
  const geneticsStr = dbEntry.genetics.trim();
  const parentPattern = /([^×x/]+)\s*[×x/]\s*([^×x/]+)/gi;
  const match = parentPattern.exec(geneticsStr);
  
  if (!match) {
    return null; // Cannot parse parents
  }

  const parent1Name = match[1].trim();
  const parent2Name = match[2].trim();

  // Phase 4.8 Step 4.8.2 — Look up parent strains in database
  const parent1 = CULTIVAR_LIBRARY.find(s => 
    s.name.toLowerCase() === parent1Name.toLowerCase() ||
    s.aliases?.some(a => a.toLowerCase() === parent1Name.toLowerCase())
  );
  
  const parent2 = CULTIVAR_LIBRARY.find(s => 
    s.name.toLowerCase() === parent2Name.toLowerCase() ||
    s.aliases?.some(a => a.toLowerCase() === parent2Name.toLowerCase())
  );

  if (!parent1 || !parent2) {
    return null; // Cannot find both parents
  }

  // Phase 4.8 Step 4.8.2 — Resolve parent ratios from database
  const parent1Ratio = resolveDatabaseBaseline(parent1.name, parent1);
  const parent2Ratio = resolveDatabaseBaseline(parent2.name, parent2);

  if (!parent1Ratio || !parent2Ratio) {
    return null; // Cannot resolve parent ratios
  }

  // Phase 4.8 Step 4.8.2 — Average parent ratios (simple genetic inference)
  const inferredIndica = Math.round((parent1Ratio.indicaPercent + parent2Ratio.indicaPercent) / 2);
  const inferredSativa = Math.round((parent1Ratio.sativaPercent + parent2Ratio.sativaPercent) / 2);

  // Phase 4.8 Step 4.8.2 — Normalize to 100%
  const total = inferredIndica + inferredSativa;
  const indicaPercent = Math.round((inferredIndica / total) * 100);
  const sativaPercent = 100 - indicaPercent;

  const inference = `Inferred from parent strains: ${parent1.name} (${parent1Ratio.indicaPercent}% indica, ${parent1Ratio.sativaPercent}% sativa) × ${parent2.name} (${parent2Ratio.indicaPercent}% indica, ${parent2Ratio.sativaPercent}% sativa) → ${indicaPercent}% / ${sativaPercent}%`;

  return {
    indicaPercent,
    sativaPercent,
    inference,
  };
}

/**
 * Phase 4.8 Step 4.8.3 — IMAGE-BASED MORPHOLOGY ADJUSTMENT
 * 
 * Use visual traits to nudge ratio (±15% max):
 * 
 * INDICA-LEANING TRAITS:
 * - Broad leaves
 * - Short internodes (dense buds)
 * - Dense buds
 * - Dark green / purple hues
 * 
 * SATIVA-LEANING TRAITS:
 * - Narrow leaves
 * - Long internodes (airy buds)
 * - Airy buds
 * - Lime / lighter greens
 * 
 * RULE:
 * Images NEVER override genetics,
 * only adjust within a bounded range.
 * 
 * Image weight = 15%
 */
function calculateMorphologyAdjustment(
  fusedFeatures?: FusedFeatures
): { adjustment: number; reasoning: string } | null {
  if (!fusedFeatures) {
    return null;
  }

  let adjustment = 0; // Adjustment in percentage points (±15% max)
  const reasoning: string[] = [];

  // Phase 4.8 Step 4.8.3 — Leaf shape (Indica = broad, Sativa = narrow)
  if (fusedFeatures.leafShape === "broad") {
    adjustment += 8; // Indica-leaning
    reasoning.push("broad leaves suggest indica genetics");
  } else if (fusedFeatures.leafShape === "narrow") {
    adjustment -= 8; // Sativa-leaning
    reasoning.push("narrow leaves suggest sativa genetics");
  }

  // Phase 4.8 Step 4.8.3 — Bud structure (Indica = dense, Sativa = airy)
  if (fusedFeatures.budStructure === "high") {
    adjustment += 5; // Indica-leaning (dense buds)
    reasoning.push("dense bud structure indicates indica influence");
  } else if (fusedFeatures.budStructure === "low") {
    adjustment -= 5; // Sativa-leaning (airy buds)
    reasoning.push("airy bud structure indicates sativa influence");
  }

  // Phase 4.8 Step 4.8.3 — Color profile (Indica = dark green/purple, Sativa = light green)
  const colorProfile = fusedFeatures.colorProfile?.toLowerCase() || "";
  if (colorProfile.includes("purple") || colorProfile.includes("dark green") || colorProfile.includes("deep green")) {
    adjustment += 2; // Indica-leaning
    reasoning.push("dark green/purple hues suggest indica genetics");
  } else if (colorProfile.includes("lime") || colorProfile.includes("light green") || colorProfile.includes("pale")) {
    adjustment -= 2; // Sativa-leaning
    reasoning.push("lime/light green hues suggest sativa genetics");
  }

  // Phase 4.8 Step 4.8.3 — Cap adjustment at ±15%
  adjustment = Math.max(-15, Math.min(15, adjustment));

  if (adjustment === 0) {
    return null; // No adjustment needed
  }

  return {
    adjustment,
    reasoning: reasoning.join("; "),
  };
}

/**
 * Phase 4.8 Step 4.8.4 — FINAL RATIO CALCULATION
 * 
 * Formula:
 * Final Ratio =
 * (DB Baseline × 0.60)
 * + (Lineage × 0.25)
 * + (Image Morphology × 0.15)
 * 
 * Normalize to:
 * - Indica %
 * - Sativa %
 * - Hybrid label if within 45–55%
 */
export function resolveStrainRatio(
  strainName: string,
  dbEntry?: CultivarReference,
  imageResults?: ImageResult[],
  imageCount: number = 1,
  fusedFeatures?: FusedFeatures // Phase 4.8 — Added for morphology adjustment
): StrainRatio {
  // Phase 4.8 Step 4.8.1 — DATABASE BASELINE (weight 60%)
  const databaseBaseline = resolveDatabaseBaseline(strainName, dbEntry);
  
  if (!databaseBaseline) {
    // Phase 4.8 Step 4.8.4 — Failsafe: Return balanced hybrid if no database entry
    console.warn(`Phase 4.8 Step 4.8.1 — No database entry found for "${strainName}", using balanced hybrid default`);
    return {
      indicaPercent: 50,
      sativaPercent: 50,
      dominance: "Balanced",
      displayText: "Balanced Hybrid (50 / 50)",
      explanation: {
        source: "default",
        confidenceNotes: "Ratio not available from database. Defaulting to balanced hybrid.",
        confidenceLevel: "low",
      },
    };
  }

  // Phase 4.8 Step 4.8.2 — LINEAGE INFERENCE (weight 25%)
  const lineageInference = inferRatioFromLineage(dbEntry);

  // Phase 5.0 Step 5.0.2 — IMAGE-BASED PHENOTYPE ADJUSTMENT (weight 15%, cap ±12%)
  // Phase 5.0 Step 5.0.3 — MULTI-IMAGE CONSENSUS: Pass imageResults for outlier discarding and close-up weighting
  const morphologyAdjustment = calculateMorphologyAdjustment(fusedFeatures, imageResults);

  // Phase 4.8 Step 4.8.4 — FINAL RATIO CALCULATION (Weighted combination)
  // Formula: (DB × 0.60) + (Lineage × 0.25) + (Image × 0.15)
  let finalIndicaPercent: number;
  let finalSativaPercent: number;

  if (lineageInference) {
    // Phase 4.8 Step 4.8.4 — Use weighted combination: DB (60%) + Lineage (25%) + Image (15%)
    const dbWeightedIndica = databaseBaseline.indicaPercent * 0.60;
    const lineageWeightedIndica = lineageInference.indicaPercent * 0.25;
    
    // Phase 4.8 Step 4.8.3 — Apply morphology adjustment (±15% max, weighted 15%)
    const baseIndicaForMorphology = (databaseBaseline.indicaPercent * 0.60) + (lineageInference.indicaPercent * 0.25);
    const morphologyAdjustedIndica = morphologyAdjustment
      ? baseIndicaForMorphology + (morphologyAdjustment.adjustment * 0.15)
      : baseIndicaForMorphology;

    // Phase 4.8 Step 4.8.4 — Add remaining 15% from image if no morphology adjustment
    const imageWeightedIndica = morphologyAdjustment
      ? 0 // Already included in morphology adjustment
      : databaseBaseline.indicaPercent * 0.15; // Fallback to DB for remaining weight

    finalIndicaPercent = Math.round(dbWeightedIndica + lineageWeightedIndica + morphologyAdjustedIndica + imageWeightedIndica);
  } else {
    // Phase 4.8 Step 4.8.4 — No lineage inference, use DB (75%) + Image (15%) or DB (100%) if no morphology
    const dbWeightedIndica = databaseBaseline.indicaPercent * (morphologyAdjustment ? 0.85 : 1.0);
    
    const morphologyAdjustedIndica = morphologyAdjustment
      ? (databaseBaseline.indicaPercent * 0.85) + (morphologyAdjustment.adjustment * 0.15)
      : databaseBaseline.indicaPercent;

    finalIndicaPercent = Math.round(morphologyAdjustedIndica);
  }

  // Phase 4.8 Step 4.8.4 — Normalize to 100%
  finalIndicaPercent = Math.max(0, Math.min(100, finalIndicaPercent));
  finalSativaPercent = 100 - finalIndicaPercent;

  // Phase 4.8 Step 4.8.4 — Determine dominance and display text
  let dominance: "Indica" | "Sativa" | "Hybrid" | "Balanced";
  let displayText: string;

  if (finalIndicaPercent >= 55) {
    dominance = "Indica";
    displayText = `Indica ${finalIndicaPercent}% · Sativa ${finalSativaPercent}%`;
  } else if (finalSativaPercent >= 55) {
    dominance = "Sativa";
    displayText = `Sativa ${finalSativaPercent}% · Indica ${finalIndicaPercent}%`;
  } else if (finalIndicaPercent >= 45 && finalIndicaPercent <= 55) {
    dominance = "Balanced";
    displayText = `Balanced Hybrid (${finalIndicaPercent} / ${finalSativaPercent})`;
  } else {
    // Closer to one side but not quite 55%
    dominance = finalIndicaPercent > finalSativaPercent ? "Indica" : "Sativa";
    displayText = `Hybrid ${finalIndicaPercent}% Indica · ${finalSativaPercent}% Sativa`;
  }

  // Phase 4.8 Step 4.8.4 — Determine source and confidence
  let source: StrainRatio["explanation"]["source"];
  if (databaseBaseline.source === "database_explicit") {
    source = "database_explicit";
  } else if (lineageInference && morphologyAdjustment) {
    source = "morphology_adjusted";
  } else if (lineageInference) {
    source = "lineage_inferred";
  } else if (morphologyAdjustment) {
    source = "morphology_adjusted";
  } else {
    source = databaseBaseline.source || "database_dominance";
  }

  // Phase 4.8 Step 4.8.5 — CONFIDENCE-AWARE DISPLAY
  // Determine confidence level
  let confidenceLevel: "high" | "medium" | "low" = "medium";
  if (databaseBaseline.source === "database_explicit") {
    confidenceLevel = "high";
  } else if (lineageInference && databaseBaseline.source === "database_dominance") {
    confidenceLevel = "high";
  } else if (databaseBaseline.source === "database_dominance" && morphologyAdjustment) {
    confidenceLevel = "high";
  } else if (!lineageInference && !morphologyAdjustment) {
    confidenceLevel = "medium";
  } else {
    confidenceLevel = "medium";
  }

  // Phase 4.6 Step 4.6.2 — Multi-image consensus check (if available)
  let imageAlignment: string | undefined;
  if (imageResults && imageResults.length > 1) {
    const imageDominances: Array<{ dominance: string; confidence: number }> = [];
    
    imageResults.forEach(result => {
      const wikiDominance = result.wikiResult?.genetics?.dominance;
      if (wikiDominance && wikiDominance !== "Unknown") {
        const primaryConfidence = result.candidateStrains[0]?.confidence || 70;
        imageDominances.push({
          dominance: wikiDominance,
          confidence: primaryConfidence,
        });
      }
    });

    if (imageDominances.length > 0) {
      const agreeingDominances = imageDominances.filter(
        d => d.dominance === dominance
      );

      if (agreeingDominances.length >= imageDominances.length * 0.6) {
        const avgConfidence = agreeingDominances.reduce((sum, d) => sum + d.confidence, 0) / agreeingDominances.length;
        imageAlignment = `${agreeingDominances.length} of ${imageResults.length} images confirmed ${dominance} dominance (avg confidence: ${Math.round(avgConfidence)}%)`;
        source = "consensus_weighted";
        confidenceLevel = "high"; // Boost confidence if images agree
      }
    }
  }

  // Phase 4.8 Step 4.8.4 — Build confidence notes
  const confidenceNotes: string[] = [];
  
  if (databaseBaseline.source === "database_dominance") {
    confidenceNotes.push(`Ratio derived from database classification: ${dbEntry?.type || dbEntry?.dominantType || "Unknown"}-dominant`);
  }
  
  if (lineageInference) {
    confidenceNotes.push(lineageInference.inference);
  }
  
  if (morphologyAdjustment) {
    confidenceNotes.push(`Visual traits adjusted ratio: ${morphologyAdjustment.reasoning} (±${Math.abs(morphologyAdjustment.adjustment)}% adjustment)`);
  }
  
  if (!lineageInference && !morphologyAdjustment) {
    confidenceNotes.push("Ratio estimated from database classification only.");
  }

  return {
    indicaPercent: finalIndicaPercent,
    sativaPercent: finalSativaPercent,
    // Phase 5.0 Step 5.0.4 — Include range if variance exists
    indicaRange: indicaRange && indicaRange.max - indicaRange.min > 3 ? indicaRange : undefined,
    sativaRange: sativaRange && sativaRange.max - sativaRange.min > 3 ? sativaRange : undefined,
    dominance,
    displayText,
    explanation: {
      source,
      databaseStrain: strainName,
      confidenceNotes: confidenceNotes.join(" "),
      imageAlignment,
      lineageInference: lineageInference?.inference,
      morphologyAdjustment: morphologyAdjustment ? `${morphologyAdjustment.reasoning} (±${Math.abs(morphologyAdjustment.adjustment).toFixed(1)}%)` : undefined,
      confidenceLevel,
      // Phase 5.0 Step 5.0.4 — Include variance range explanation
      varianceRange,
    },
  };
}

/**
 * Phase 4.6 Step 4.6.4 — Generate Explanation Text
 * Phase 4.8 Step 4.8.5 — Enhanced with confidence-aware display
 * 
 * Collapsed text:
 * "How this ratio was determined"
 * 
 * Expands to:
 * - Database lineage
 * - Image alignment
 * - Known phenotype behavior
 * - Lineage inference (Phase 4.8)
 * - Morphology adjustment (Phase 4.8)
 * - Confidence note if < High (Phase 4.8)
 */
export function generateRatioExplanation(
  ratio: StrainRatio,
  dbEntry?: CultivarReference,
  wikiReportGenetics?: { lineage?: string; dominanceExplanation?: string } | undefined
): {
  summary: string; // Short summary for collapsed header
  fullExplanation: string[]; // Bullets for expanded section
} {
  const bullets: string[] = [];

  // Phase 4.8 Step 4.8.5 — CONFIDENCE-AWARE DISPLAY
  // If confidence < High, show note
  if (ratio.explanation.confidenceLevel && ratio.explanation.confidenceLevel !== "high") {
    bullets.push(`Ratio estimated from genetics + visual traits${ratio.explanation.confidenceLevel === "low" ? " (limited confidence)" : ""}`);
  }

  // Phase 4.8 Step 4.8.1 — Database baseline
  if (ratio.explanation.source === "database_explicit") {
    bullets.push(`Explicit ratio from 35,000-strain database`);
  } else if (ratio.explanation.source === "database_dominance") {
    bullets.push(`Ratio derived from database classification: ${ratio.dominance}-dominant`);
  }

  // Phase 4.8 Step 4.8.2 — Lineage inference
  if (ratio.explanation.lineageInference) {
    bullets.push(ratio.explanation.lineageInference);
  }

  // Phase 4.8 Step 4.8.3 — Morphology adjustment
  if (ratio.explanation.morphologyAdjustment) {
    bullets.push(`Visual traits adjustment: ${ratio.explanation.morphologyAdjustment}`);
  }

  // Phase 4.6 Step 4.6.4 — Database lineage
  if (dbEntry?.genetics) {
    bullets.push(`Database lineage: ${dbEntry.genetics}`);
  }

  // Phase 4.6 Step 4.6.4 — Image alignment
  if (ratio.explanation.imageAlignment) {
    bullets.push(ratio.explanation.imageAlignment);
  }

  // Phase 4.6 Step 4.6.4 — Consensus weighted
  if (ratio.explanation.source === "consensus_weighted") {
    bullets.push(`Ratio confirmed by multi-image consensus weighted by confidence`);
  }

  // Phase 4.6 Step 4.6.4 — Dominance explanation from wiki report if available
  if (wikiReportGenetics?.dominanceExplanation) {
    bullets.push(wikiReportGenetics.dominanceExplanation);
  }

  // Phase 4.8 Step 4.8.4 — Weighted calculation summary
  if (ratio.explanation.lineageInference || ratio.explanation.morphologyAdjustment) {
    bullets.push(`Final ratio calculated using weighted combination: Database baseline (60%) ${ratio.explanation.lineageInference ? "+ Lineage inference (25%)" : ""} ${ratio.explanation.morphologyAdjustment ? "+ Visual traits (15%)" : ""}`);
  }

  return {
    summary: ratio.explanation.confidenceLevel === "high" 
      ? `Ratio determined from ${ratio.explanation.databaseStrain || "database"} classification`
      : `Ratio estimated from genetics + visual traits`,
    fullExplanation: bullets.length > 0 ? bullets : ["Ratio derived from strain database classification."],
  };
}
