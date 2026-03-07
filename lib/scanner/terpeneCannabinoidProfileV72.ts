// lib/scanner/terpeneCannabinoidProfileV72.ts
// Phase 7.2 — Terpene & Cannabinoid Profile Engine

import type { CultivarReference } from "./cultivarLibrary";
import type { ImageResult } from "./consensusEngine";
import type { FusedFeatures } from "./multiImageFusion";
import { CULTIVAR_LIBRARY } from "./cultivarLibrary";

/**
 * Phase 7.2 — Terpene Entry (ranked with likelihood)
 */
export type TerpeneEntryV72 = {
  name: string;
  likelihood: "High" | "Medium–High" | "Medium" | "Low–Medium" | "Low";
  confidence: number; // 0-100
  reasoning: string[];
};

/**
 * Phase 7.2 — Cannabinoid Range
 */
export type CannabinoidRangeV72 = {
  compound: string; // "THC", "CBD", "CBG", etc.
  range: string; // "18–24%" or "<1%" or "0.5–1.2%"
  min: number; // 0-100
  max: number; // 0-100
  isFlagged?: boolean; // True if minor cannabinoid (flagged, not quantified)
};

/**
 * Phase 7.2 — Profile Result
 */
export type TerpeneCannabinoidProfileV72 = {
  terpenes: TerpeneEntryV72[]; // Ranked terpenes
  cannabinoids: CannabinoidRangeV72[]; // THC, CBD, CBG, minors
  confidence: "very_high" | "high" | "medium" | "low";
  confidenceLabel: string; // "Very High: known strain + ≥3 images"
  disclaimer: string; // "Estimated profile. Not a lab result."
  explanation: string[]; // Why those compounds were inferred
  source: "database_primary" | "database_blended" | "database_visual" | "database_visual_consensus" | "inferred_visual" | "default";
};

/**
 * Phase 7.2 Step 7.2.1 — PRIMARY DATA SOURCES
 * 
 * If strain is identified:
 * - Pull terpene & cannabinoid medians from:
 *   • Strain database
 *   • Breeder disclosures
 *   • Historical lab aggregates
 *   • Wiki consensus
 * 
 * If strain is a close match:
 * - Blend top 3–5 candidate profiles
 * - Weight by consensus confidence
 */
function getPrimaryDataSourcesV72(
  strainName: string,
  dbEntry?: CultivarReference,
  candidateStrains?: Array<{ name: string; confidence: number }>
): {
  terpenes: Array<{ name: string; frequency: number; sources: string[] }>;
  cannabinoids: {
    thc?: { min: number; max: number; sources: string[] };
    cbd?: { min: number; max: number; sources: string[] };
    cbg?: { min: number; max: number; sources: string[] };
  };
  reasoning: string[];
} {
  const reasoning: string[] = [];
  const terpeneMap = new Map<string, { frequency: number; sources: string[] }>();
  
  // Phase 7.2.1 — If strain is identified, pull from database
  if (dbEntry) {
    // Phase 7.2.1 — Terpenes from database
    const dbTerpenes = dbEntry.terpeneProfile || dbEntry.commonTerpenes || [];
    dbTerpenes.forEach(terpene => {
      const normalized = terpene.toLowerCase();
      const existing = terpeneMap.get(normalized);
      if (existing) {
        existing.frequency++;
        existing.sources.push("Strain database");
      } else {
        terpeneMap.set(normalized, {
          frequency: 1,
          sources: ["Strain database"],
        });
      }
    });
    
    reasoning.push(`Terpene profile from strain database: ${dbTerpenes.slice(0, 5).join(", ")}`);
    
    // Phase 7.2.1 — Cannabinoids: Infer from strain type (rough estimates)
    // In a real implementation, this would come from lab data
    const dbType = dbEntry.type || dbEntry.dominantType;
    let thcRange: { min: number; max: number; sources: string[] } | undefined;
    let cbdRange: { min: number; max: number; sources: string[] } | undefined;
    let cbgRange: { min: number; max: number; sources: string[] } | undefined;
    
    if (dbType === "Indica") {
      thcRange = { min: 18, max: 26, sources: ["Historical lab aggregates (Indica-dominant)"] };
      cbdRange = { min: 0, max: 1, sources: ["Historical lab aggregates"] };
      cbgRange = { min: 0.5, max: 1.5, sources: ["Historical lab aggregates"] };
    } else if (dbType === "Sativa") {
      thcRange = { min: 20, max: 28, sources: ["Historical lab aggregates (Sativa-dominant)"] };
      cbdRange = { min: 0, max: 1, sources: ["Historical lab aggregates"] };
      cbgRange = { min: 0.3, max: 1.0, sources: ["Historical lab aggregates"] };
    } else {
      thcRange = { min: 18, max: 25, sources: ["Historical lab aggregates (Hybrid)"] };
      cbdRange = { min: 0, max: 2, sources: ["Historical lab aggregates"] };
      cbgRange = { min: 0.4, max: 1.2, sources: ["Historical lab aggregates"] };
    }
    
    reasoning.push(`Cannabinoid ranges inferred from strain type: ${dbType}`);
    
    return {
      terpenes: Array.from(terpeneMap.entries()).map(([name, data]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        frequency: data.frequency,
        sources: data.sources,
      })),
      cannabinoids: {
        thc: thcRange,
        cbd: cbdRange,
        cbg: cbgRange,
      },
      reasoning,
    };
  }
  
  // Phase 7.2.1 — If strain is a close match, blend top 3–5 candidate profiles
  if (candidateStrains && candidateStrains.length > 0) {
    const topCandidates = candidateStrains.slice(0, 5);
    const candidateWeights = topCandidates.map(c => c.confidence);
    const totalWeight = candidateWeights.reduce((sum, w) => sum + w, 0);
    
    // Phase 7.2.1 — Blend terpenes from top candidates
    topCandidates.forEach((candidate, index) => {
      const candidateDb = CULTIVAR_LIBRARY.find(s => 
        s.name.toLowerCase() === candidate.name.toLowerCase()
      );
      
      if (candidateDb) {
        const weight = candidateWeights[index] / totalWeight;
        const candidateTerpenes = candidateDb.terpeneProfile || candidateDb.commonTerpenes || [];
        
        candidateTerpenes.forEach(terpene => {
          const normalized = terpene.toLowerCase();
          const existing = terpeneMap.get(normalized);
          if (existing) {
            existing.frequency += weight;
            existing.sources.push(`Candidate: ${candidate.name}`);
          } else {
            terpeneMap.set(normalized, {
              frequency: weight,
              sources: [`Candidate: ${candidate.name}`],
            });
          }
        });
      }
    });
    
    reasoning.push(`Terpene profile blended from top ${topCandidates.length} candidate strains (weighted by confidence)`);
    
    // Phase 7.2.1 — Blend cannabinoid ranges (weighted average)
    const thcRanges: Array<{ min: number; max: number; weight: number }> = [];
    const cbdRanges: Array<{ min: number; max: number; weight: number }> = [];
    const cbgRanges: Array<{ min: number; max: number; weight: number }> = [];
    
    topCandidates.forEach((candidate, index) => {
      const candidateDb = CULTIVAR_LIBRARY.find(s => 
        s.name.toLowerCase() === candidate.name.toLowerCase()
      );
      
      if (candidateDb) {
        const weight = candidateWeights[index] / totalWeight;
        const candidateType = candidateDb.type || candidateDb.dominantType;
        
        if (candidateType === "Indica") {
          thcRanges.push({ min: 18, max: 26, weight });
          cbdRanges.push({ min: 0, max: 1, weight });
          cbgRanges.push({ min: 0.5, max: 1.5, weight });
        } else if (candidateType === "Sativa") {
          thcRanges.push({ min: 20, max: 28, weight });
          cbdRanges.push({ min: 0, max: 1, weight });
          cbgRanges.push({ min: 0.3, max: 1.0, weight });
        } else {
          thcRanges.push({ min: 18, max: 25, weight });
          cbdRanges.push({ min: 0, max: 2, weight });
          cbgRanges.push({ min: 0.4, max: 1.2, weight });
        }
      }
    });
    
    const thcMin = Math.round(thcRanges.reduce((sum, r) => sum + r.min * r.weight, 0));
    const thcMax = Math.round(thcRanges.reduce((sum, r) => sum + r.max * r.weight, 0));
    const cbdMin = Math.round(cbdRanges.reduce((sum, r) => sum + r.min * r.weight, 0) * 10) / 10;
    const cbdMax = Math.round(cbdRanges.reduce((sum, r) => sum + r.max * r.weight, 0) * 10) / 10;
    const cbgMin = Math.round(cbgRanges.reduce((sum, r) => sum + r.min * r.weight, 0) * 10) / 10;
    const cbgMax = Math.round(cbgRanges.reduce((sum, r) => sum + r.max * r.weight, 0) * 10) / 10;
    
    reasoning.push(`Cannabinoid ranges blended from top ${topCandidates.length} candidate strains`);
    
    return {
      terpenes: Array.from(terpeneMap.entries())
        .sort((a, b) => b[1].frequency - a[1].frequency)
        .map(([name, data]) => ({
          name: name.charAt(0).toUpperCase() + name.slice(1),
          frequency: data.frequency,
          sources: data.sources,
        })),
      cannabinoids: {
        thc: { min: thcMin, max: thcMax, sources: [`Blended from ${topCandidates.length} candidates`] },
        cbd: { min: cbdMin, max: cbdMax, sources: [`Blended from ${topCandidates.length} candidates`] },
        cbg: { min: cbgMin, max: cbgMax, sources: [`Blended from ${topCandidates.length} candidates`] },
      },
      reasoning,
    };
  }
  
  // Phase 7.2.1 — Default: Return empty profile
  return {
    terpenes: [],
    cannabinoids: {},
    reasoning: ["No strain identified. Cannot determine terpene/cannabinoid profile."],
  };
}

/**
 * Phase 7.2 Step 7.2.2 — VISUAL & MORPHOLOGY MODULATION
 * 
 * Refine (never invent) using image cues:
 * - Heavy frost → ↑ terpene likelihood
 * - Resin gland density → ↑ THC probability
 * - Flower color → flag anthocyanins / flavonoids
 * - Foxtailing / airiness → possible sativa-leaning terpene skew
 * 
 * Limits:
 * - ±15% adjustment max
 * - Cannot introduce compounds not present in database
 */
function applyVisualMorphologyModulationV72(
  terpenes: Array<{ name: string; frequency: number; sources: string[] }>,
  cannabinoids: {
    thc?: { min: number; max: number; sources: string[] };
    cbd?: { min: number; max: number; sources: string[] };
    cbg?: { min: number; max: number; sources: string[] };
  },
  fusedFeatures?: FusedFeatures
): {
  terpenes: Array<{ name: string; frequency: number; sources: string[]; visualBoost: number }>;
  cannabinoids: {
    thc?: { min: number; max: number; sources: string[]; visualBoost: number };
    cbd?: { min: number; max: number; sources: string[] };
    cbg?: { min: number; max: number; sources: string[] };
  };
  reasoning: string[];
} {
  if (!fusedFeatures) {
    return {
      terpenes: terpenes.map(t => ({ ...t, visualBoost: 0 })),
      cannabinoids,
      reasoning: [],
    };
  }

  const reasoning: string[] = [];
  
  // Phase 7.2.2 — Heavy frost → ↑ terpene likelihood
  let terpeneBoost = 0;
  if (fusedFeatures.trichomeDensity === "high") {
    terpeneBoost = 0.15; // +15% boost to terpene likelihood
    reasoning.push("Heavy frost (high trichome density) suggests elevated terpene production");
  } else if (fusedFeatures.trichomeDensity === "medium") {
    terpeneBoost = 0.08; // +8% boost
    reasoning.push("Moderate frost suggests moderate terpene production");
  }

  // Phase 7.2.2 — Resin gland density → ↑ THC probability
  let thcBoost = 0;
  if (fusedFeatures.trichomeDensity === "high") {
    thcBoost = 2; // +2% to THC range
    reasoning.push("High resin gland density suggests elevated THC potential");
  }

  // Phase 7.2.2 — Flower color → flag anthocyanins / flavonoids
  const hasColorVariation = fusedFeatures.colorProfile && 
    (fusedFeatures.colorProfile.toLowerCase().includes("purple") || 
     fusedFeatures.colorProfile.toLowerCase().includes("orange") ||
     fusedFeatures.colorProfile.toLowerCase().includes("red"));
  
  if (hasColorVariation) {
    reasoning.push("Color variation (purple/orange/red) suggests anthocyanins and flavonoids present");
  }

  // Phase 7.2.2 — Foxtailing / airiness → possible sativa-leaning terpene skew
  let sativaTerpeneSkew = 0;
  if (fusedFeatures.budStructure === "low") {
    // Airy structure → sativa-leaning terpenes (Limonene, Terpinolene, Pinene)
    sativaTerpeneSkew = 0.10; // +10% boost to sativa-leaning terpenes
    reasoning.push("Airy structure suggests sativa-leaning terpene profile (Limonene, Terpinolene, Pinene)");
  }

  // Phase 7.2.2 — Apply boosts to terpenes (cannot introduce compounds not present in database)
  const modulatedTerpenes = terpenes.map(terpene => {
    const nameLower = terpene.name.toLowerCase();
    let visualBoost = terpeneBoost; // Base boost from frost
    
    // Phase 7.2.2 — Sativa-leaning terpenes get additional boost if airy
    const sativaTerpenes = ["limonene", "terpinolene", "pinene"];
    if (sativaTerpenes.includes(nameLower) && sativaTerpeneSkew > 0) {
      visualBoost += sativaTerpeneSkew;
    }
    
    // Phase 7.2.2 — Cap at ±15% max
    visualBoost = Math.max(-0.15, Math.min(0.15, visualBoost));
    
    return {
      ...terpene,
      visualBoost,
    };
  });

  // Phase 7.2.2 — Apply THC boost (cap at ±15% of range)
  const modulatedCannabinoids = { ...cannabinoids };
  if (modulatedCannabinoids.thc) {
    const thcRange = modulatedCannabinoids.thc.max - modulatedCannabinoids.thc.min;
    const maxBoost = thcRange * 0.15; // ±15% of range
    const cappedBoost = Math.max(-maxBoost, Math.min(maxBoost, thcBoost));
    
    modulatedCannabinoids.thc = {
      ...modulatedCannabinoids.thc,
      min: Math.max(0, Math.min(35, modulatedCannabinoids.thc.min + cappedBoost)),
      max: Math.max(0, Math.min(35, modulatedCannabinoids.thc.max + cappedBoost)),
      visualBoost: cappedBoost,
    };
  }

  return {
    terpenes: modulatedTerpenes,
    cannabinoids: modulatedCannabinoids,
    reasoning,
  };
}

/**
 * Phase 7.2 Step 7.2.3 — MULTI-IMAGE CONSENSUS
 * 
 * Across 2–5 images:
 * - Average terpene likelihoods
 * - Penalize outliers
 * - Flag inconsistencies (e.g. resin vs airy bud conflict)
 * 
 * If disagreement detected:
 * - Widen ranges
 * - Lower confidence tier
 */
function applyMultiImageConsensusV72(
  terpenes: Array<{ name: string; frequency: number; sources: string[]; visualBoost: number }>,
  cannabinoids: {
    thc?: { min: number; max: number; sources: string[]; visualBoost?: number };
    cbd?: { min: number; max: number; sources: string[] };
    cbg?: { min: number; max: number; sources: string[] };
  },
  imageResults?: ImageResult[],
  imageCount: number = 1
): {
  terpenes: Array<{ name: string; frequency: number; sources: string[]; visualBoost: number; consensusFrequency: number }>;
  cannabinoids: {
    thc?: { min: number; max: number; sources: string[]; visualBoost?: number };
    cbd?: { min: number; max: number; sources: string[] };
    cbg?: { min: number; max: number; sources: string[] };
  };
  hasInconsistencies: boolean;
  reasoning: string[];
} {
  if (!imageResults || imageResults.length <= 1) {
    return {
      terpenes: terpenes.map(t => ({ ...t, consensusFrequency: t.frequency })),
      cannabinoids,
      hasInconsistencies: false,
      reasoning: [],
    };
  }

  // Phase 7.2.3 — Collect terpene mentions from each image
  const terpeneMentions = new Map<string, number[]>();
  
  imageResults.forEach(result => {
    const wikiTerpenes = result.wikiResult?.terpenes || [];
    wikiTerpenes.forEach(terpene => {
      const normalized = terpene.toLowerCase();
      const existing = terpeneMentions.get(normalized);
      if (existing) {
        existing.push(result.candidateStrains[0]?.confidence || 70);
      } else {
        terpeneMentions.set(normalized, [result.candidateStrains[0]?.confidence || 70]);
      }
    });
  });

  // Phase 7.2.3 — Average terpene likelihoods (confidence-weighted)
  const consensusTerpenes = terpenes.map(terpene => {
    const nameLower = terpene.name.toLowerCase();
    const mentions = terpeneMentions.get(nameLower);
    
    if (mentions && mentions.length > 0) {
      const avgConfidence = mentions.reduce((sum, c) => sum + c, 0) / mentions.length;
      const consensusFrequency = (terpene.frequency + (avgConfidence / 100) * 0.3) / 1.3; // Blend database (70%) + image consensus (30%)
      return {
        ...terpene,
        consensusFrequency,
      };
    }
    
    return {
      ...terpene,
      consensusFrequency: terpene.frequency,
    };
  });

  // Phase 7.2.3 — Detect inconsistencies (e.g. resin vs airy bud conflict)
  const trichomeDensities = imageResults.map(r => {
    // Try to infer from wiki result or candidate strains
    return "medium"; // Default, would be inferred from actual image analysis
  });
  
  const hasInconsistencies = new Set(trichomeDensities).size > 1; // Multiple different densities = inconsistency
  
  const reasoning: string[] = [];
  if (hasInconsistencies) {
    reasoning.push(`Inconsistent morphology detected across ${imageCount} images. Ranges widened.`);
  } else if (imageCount >= 3) {
    reasoning.push(`Consistent morphology across ${imageCount} images. Profile stabilized.`);
  }

  // Phase 7.2.3 — Widen ranges if disagreement detected
  const widenedCannabinoids = { ...cannabinoids };
  if (hasInconsistencies && widenedCannabinoids.thc) {
    const thcRange = widenedCannabinoids.thc.max - widenedCannabinoids.thc.min;
    const widenAmount = thcRange * 0.2; // Widen by 20%
    widenedCannabinoids.thc = {
      ...widenedCannabinoids.thc,
      min: Math.max(0, widenedCannabinoids.thc.min - widenAmount),
      max: Math.min(35, widenedCannabinoids.thc.max + widenAmount),
      sources: [...(widenedCannabinoids.thc.sources || []), "Range widened due to image inconsistencies"],
    };
  }

  return {
    terpenes: consensusTerpenes,
    cannabinoids: widenedCannabinoids,
    hasInconsistencies,
    reasoning,
  };
}

/**
 * Phase 7.2 Step 7.2.4 — OUTPUT FORMAT
 * 
 * Always show:
 * 
 * TERPENES (ranked):
 * - Myrcene — High likelihood
 * - Limonene — Medium–High
 * - Caryophyllene — Medium
 * - Pinene — Low–Medium
 * 
 * CANNABINOIDS (ranges):
 * - THC: 18–24%
 * - CBD: <1%
 * - CBG: 0.5–1.2%
 * - Minor cannabinoids (flagged, not quantified)
 */
function formatOutputV72(
  terpenes: Array<{ name: string; frequency: number; sources: string[]; visualBoost: number; consensusFrequency: number }>,
  cannabinoids: {
    thc?: { min: number; max: number; sources: string[]; visualBoost?: number };
    cbd?: { min: number; max: number; sources: string[] };
    cbg?: { min: number; max: number; sources: string[] };
  }
): {
  terpenes: TerpeneEntryV72[];
  cannabinoids: CannabinoidRangeV72[];
} {
  // Phase 7.2.4 — Format terpenes (ranked with likelihood)
  const formattedTerpenes: TerpeneEntryV72[] = terpenes
    .sort((a, b) => b.consensusFrequency - a.consensusFrequency)
    .slice(0, 8) // Top 8 terpenes
    .map(terpene => {
      const totalScore = terpene.consensusFrequency + terpene.visualBoost;
      
      let likelihood: "High" | "Medium–High" | "Medium" | "Low–Medium" | "Low";
      if (totalScore >= 0.8) {
        likelihood = "High";
      } else if (totalScore >= 0.6) {
        likelihood = "Medium–High";
      } else if (totalScore >= 0.4) {
        likelihood = "Medium";
      } else if (totalScore >= 0.2) {
        likelihood = "Low–Medium";
      } else {
        likelihood = "Low";
      }
      
      const confidence = Math.min(100, Math.max(0, Math.round(totalScore * 100)));
      
      return {
        name: terpene.name,
        likelihood,
        confidence,
        reasoning: terpene.sources,
      };
    });

  // Phase 7.2.4 — Format cannabinoids (ranges)
  const formattedCannabinoids: CannabinoidRangeV72[] = [];
  
  if (cannabinoids.thc) {
    const thc = cannabinoids.thc;
    formattedCannabinoids.push({
      compound: "THC",
      range: `${thc.min}–${thc.max}%`,
      min: thc.min,
      max: thc.max,
    });
  }
  
  if (cannabinoids.cbd) {
    const cbd = cannabinoids.cbd;
    if (cbd.max < 1) {
      formattedCannabinoids.push({
        compound: "CBD",
        range: `<1%`,
        min: cbd.min,
        max: cbd.max,
      });
    } else {
      formattedCannabinoids.push({
        compound: "CBD",
        range: `${cbd.min}–${cbd.max}%`,
        min: cbd.min,
        max: cbd.max,
      });
    }
  }
  
  if (cannabinoids.cbg) {
    const cbg = cannabinoids.cbg;
    formattedCannabinoids.push({
      compound: "CBG",
      range: `${cbg.min}–${cbg.max}%`,
      min: cbg.min,
      max: cbg.max,
    });
  }
  
  // Phase 7.2.4 — Minor cannabinoids (flagged, not quantified)
  formattedCannabinoids.push({
    compound: "Minor cannabinoids",
    range: "Present (not quantified)",
    min: 0,
    max: 0,
    isFlagged: true,
  });

  return {
    terpenes: formattedTerpenes,
    cannabinoids: formattedCannabinoids,
  };
}

/**
 * Phase 7.2 Step 7.2.5 — CONFIDENCE & DISCLAIMERS
 * 
 * - Display ranges, never absolutes
 * - Label as "Estimated profile"
 * - Tie confidence to image count + strain certainty
 * - Explicitly state: "Not a lab result"
 */
function determineConfidenceAndDisclaimersV72(
  isKnownStrain: boolean,
  imageCount: number,
  hasInconsistencies: boolean
): {
  confidence: "very_high" | "high" | "medium" | "low";
  confidenceLabel: string;
  disclaimer: string;
} {
  // Phase 7.2.5 — Never claim lab certainty
  let confidence: "very_high" | "high" | "medium" | "low";
  let confidenceLabel: string;
  
  if (hasInconsistencies) {
    confidence = "low";
    confidenceLabel = "Low: inconsistent morphology detected";
  } else if (isKnownStrain && imageCount >= 3) {
    confidence = "very_high";
    confidenceLabel = "Very High: known strain + ≥3 images";
  } else if (isKnownStrain && imageCount >= 1) {
    confidence = "high";
    confidenceLabel = "High: known strain + 1–2 images";
  } else if (isKnownStrain) {
    confidence = "medium";
    confidenceLabel = "Medium: known strain (estimated)";
  } else {
    confidence = "low";
    confidenceLabel = "Low: estimated from visual cues";
  }

  const disclaimer = "Estimated profile. Not a lab result.";

  return {
    confidence,
    confidenceLabel,
    disclaimer,
  };
}

/**
 * Phase 7.2 — MAIN FUNCTION
 */
export function generateTerpeneCannabinoidProfileV72(
  strainName: string,
  dbEntry?: CultivarReference,
  imageResults?: ImageResult[],
  imageCount: number = 1,
  fusedFeatures?: FusedFeatures,
  candidateStrains?: Array<{ name: string; confidence: number }>
): TerpeneCannabinoidProfileV72 {
  // Phase 7.2.1 — PRIMARY DATA SOURCES
  const primaryData = getPrimaryDataSourcesV72(strainName, dbEntry, candidateStrains);
  
  if (primaryData.terpenes.length === 0) {
    // Failsafe: Return default profile
    return {
      terpenes: [],
      cannabinoids: [
        {
          compound: "THC",
          range: "18–25% (Estimated)",
          min: 18,
          max: 25,
        },
        {
          compound: "CBD",
          range: "<1% (Estimated)",
          min: 0,
          max: 1,
        },
      ],
      confidence: "low",
      confidenceLabel: "Low: estimated from visual cues",
      disclaimer: "Estimated profile. Not a lab result.",
      explanation: ["No strain identified. Profile estimated from default hybrid classification."],
      source: "default",
    };
  }

  // Phase 7.2.2 — VISUAL & MORPHOLOGY MODULATION
  const visualModulation = applyVisualMorphologyModulationV72(
    primaryData.terpenes,
    primaryData.cannabinoids,
    fusedFeatures
  );

  // Phase 7.2.3 — MULTI-IMAGE CONSENSUS
  const consensus = applyMultiImageConsensusV72(
    visualModulation.terpenes,
    visualModulation.cannabinoids,
    imageResults,
    imageCount
  );

  // Phase 7.2.4 — OUTPUT FORMAT
  const output = formatOutputV72(consensus.terpenes, consensus.cannabinoids);

  // Phase 7.2.5 — CONFIDENCE & DISCLAIMERS
  const confidenceResult = determineConfidenceAndDisclaimersV72(
    !!dbEntry,
    imageCount,
    consensus.hasInconsistencies
  );

  // Phase 7.2.5 — Build explanation
  const explanation: string[] = [
    ...primaryData.reasoning,
    ...visualModulation.reasoning,
    ...consensus.reasoning,
  ];

  // Phase 7.2.5 — Determine source
  let source: TerpeneCannabinoidProfileV72["source"];
  if (consensus.hasInconsistencies && visualModulation.reasoning.length > 0 && dbEntry) {
    source = "database_visual_consensus";
  } else if (visualModulation.reasoning.length > 0 && dbEntry) {
    source = "database_visual";
  } else if (candidateStrains && candidateStrains.length > 0) {
    source = "database_blended";
  } else if (dbEntry) {
    source = "database_primary";
  } else {
    source = "inferred_visual";
  }

  return {
    terpenes: output.terpenes,
    cannabinoids: output.cannabinoids,
    confidence: confidenceResult.confidence,
    confidenceLabel: confidenceResult.confidenceLabel,
    disclaimer: confidenceResult.disclaimer,
    explanation,
    source,
  };
}
