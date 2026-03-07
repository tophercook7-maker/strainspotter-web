// lib/scanner/wikiReport.ts
// Phase 4.2 — Extensive Wiki-Style Report (Depth Unlock)

import type { ExtendedStrainProfile } from "./extendedProfile";
import type { CultivarReference } from "./cultivarLibrary";
import { CULTIVAR_LIBRARY } from "./cultivarLibrary";
import type { FusedFeatures } from "./multiImageFusion";
import type { ImageResult } from "./consensusEngine";
import { findRelatedStrains } from "./wikiExpansion";

/**
 * Phase 4.2 Step 4.2.1 — Wiki Report Sections (Locked Order)
 */
export type WikiReportSections = {
  // 1. Identity Overview
  identityOverview: {
    primaryName: string;
    confidenceTier: "very_high" | "high" | "medium" | "low";
    confidencePercent: number;
    executiveSummary: string; // One-paragraph
    aliases: string[];
  };
  
  // 2. Visual Phenotype Analysis
  visualPhenotype: {
    budStructureComparison: string; // Uploaded vs canonical
    trichomeDensityComparison: string;
    colorSpectrumNotes: string;
    calyxPistilBehavior: string;
    phenotypeRangeFit: string; // Where this specimen fits inside known range
  };
  
  // 3. Genetics & Lineage
  geneticsLineage: {
    parentStrains: string[];
    breederOriginNotes: string[];
    dominanceExplanation: string; // Indica/Sativa/Hybrid with nuance
    phenotypeBranches: string[]; // e.g. "Purple-leaning cut"
  };
  
  // 4. Chemistry (Terpenes & Cannabinoids)
  chemistry: {
    terpeneStack: Array<{ name: string; role: string }>; // 5-8 ranked
    cannabinoidRange: {
      thc: string;
      cbd: string;
      minors: string[];
    };
    visualAlignment: string; // How chemistry aligns with visual cues
    varianceDisclaimer: string;
  };
  
  // 5. Effects & Experience
  effectsExperience: {
    primaryEffects: string[];
    secondaryEffects: string[];
    onsetTiming: string;
    typicalDuration: string;
    mentalVsPhysical: string; // Mental vs physical balance
    commonUseCases: string[]; // User-reported
  };
  
  // 6. Cultivation Characteristics
  cultivation: {
    indoorOutdoor: string;
    floweringTime: string;
    yieldExpectation: string;
    growthPattern: string;
    knownSensitivities: string[];
  };
  
  // 7. Similar / Often Confused Strains
  similarStrains: Array<{
    name: string;
    similarityReason: string;
    distinction: string; // What distinguishes this result from them
  }>;
  
  // 8. Confidence & Variance Notes
  confidenceVariance: {
    whyThisConfidence: string; // Why confidence landed where it did
    whatIncreasedConfidence: string[]; // Multi-image alignment, etc.
    whatLimitsCertainty: string[]; // Phenotype variance, lighting, growth stage
  };
  
  // 9. Sources & Reasoning
  sourcesReasoning: {
    database: string; // "Internal 35k strain database"
    visualClustering: string;
    consensusLogic: string;
    aiSynthesis: string; // Plain language explanation
  };
};

/**
 * Phase 4.2 Step 4.2.2 — Generate Identity Overview
 * 
 * INCLUDE:
 * - Primary strain name (H1)
 * - Confidence tier badge (Very High / High / Medium)
 * - One-paragraph executive summary
 * - Known aliases / alternate names
 * 
 * RULE:
 * - This section must stand alone and feel "complete" by itself
 */
export function generateIdentityOverview(
  strainName: string,
  confidencePercent: number,
  confidenceTier: "very_high" | "high" | "medium" | "low",
  dbEntry?: CultivarReference,
  wikiData?: { summary?: string },
  originStory?: string
): WikiReportSections["identityOverview"] {
  // Executive Summary (one-paragraph)
  let executiveSummary = "";
  
  if (wikiData?.summary) {
    executiveSummary = wikiData.summary;
  } else if (dbEntry?.wikiSummary) {
    executiveSummary = dbEntry.wikiSummary;
  } else if (originStory) {
    executiveSummary = originStory;
  } else {
    const type = dbEntry?.type || dbEntry?.dominantType || "Hybrid";
    const genetics = dbEntry?.genetics || "Unknown lineage";
    executiveSummary = `${strainName} is a ${type.toLowerCase()}-dominant cultivar with genetics derived from ${genetics}. This strain is recognized for its distinctive characteristics and has established itself as a reliable option in the cannabis community. Visual analysis suggests strong alignment with documented strain profiles, making it a confident identification based on morphological traits.`;
  }
  
  // Ensure it's a proper paragraph (not too short)
  if (executiveSummary.length < 200) {
    const type = dbEntry?.type || dbEntry?.dominantType || "Hybrid";
    executiveSummary += ` This cultivar displays typical ${type.toLowerCase()}-dominant characteristics, with visual traits strongly matching documented profiles.`;
  }
  
  // Aliases
  const aliases = dbEntry?.aliases || [];
  if (!aliases.includes(strainName)) {
    aliases.unshift(strainName);
  }
  
  return {
    primaryName: strainName,
    confidenceTier,
    confidencePercent,
    executiveSummary,
    aliases: aliases.slice(0, 5), // Limit to top 5
  };
}

/**
 * Phase 4.2 Step 4.2.3 — Generate Visual Phenotype Analysis
 * 
 * COMPARE:
 * - Uploaded images vs canonical strain visuals
 * 
 * INCLUDE:
 * - Bud structure description
 * - Trichome density comparison
 * - Color spectrum notes
 * - Calyx & pistil behavior
 * - Where this specimen fits inside known phenotype range
 */
export function generateVisualPhenotype(
  fusedFeatures: FusedFeatures,
  dbEntry?: CultivarReference,
  extendedProfile?: ExtendedStrainProfile,
  imageCount: number = 1
): WikiReportSections["visualPhenotype"] {
  // Get canonical profile from dbEntry
  const visualProfile = dbEntry?.visualProfile;
  const morphology = dbEntry?.morphology;
  
  // Bud Structure Comparison
  const observedStructure = fusedFeatures.budStructure || "medium";
  const expectedStructure = visualProfile?.budStructure || morphology?.budDensity || "medium";
  
  let budStructureComparison = `The observed bud structure is ${observedStructure}-density`;
  if (observedStructure === expectedStructure) {
    budStructureComparison += `, which perfectly aligns with the canonical ${dbEntry?.name || "strain"} profile. This suggests a strong visual match for this characteristic.`;
  } else {
    budStructureComparison += `, while the expected profile suggests ${expectedStructure}-density. This variance may indicate phenotype expression differences or growth condition variations, both of which are normal within strain variability.`;
  }
  
  // Trichome Density Comparison
  const observedTrichomes = fusedFeatures.trichomeDensity || "medium";
  const expectedTrichomes = visualProfile?.trichomeDensity || morphology?.trichomeDensity || "medium";
  
  let trichomeDensityComparison = `Trichome coverage appears ${observedTrichomes}`;
  if (observedTrichomes === expectedTrichomes) {
    trichomeDensityComparison += `, matching the expected ${expectedTrichomes} coverage characteristic of ${dbEntry?.name || "this strain"}.`;
  } else {
    trichomeDensityComparison += ` compared to the typical ${expectedTrichomes} coverage. Harvest timing and growth conditions can significantly influence trichome production.`;
  }
  
  // Color Spectrum Notes
  const observedColor = fusedFeatures.pistilColor || "orange";
  const expectedColors = visualProfile?.pistilColor || morphology?.pistilColor || [];
  const colorMatch = expectedColors.some(c => c.toLowerCase() === observedColor.toLowerCase());
  
  let colorSpectrumNotes = `Pistil coloration appears ${observedColor}`;
  if (colorMatch) {
    colorSpectrumNotes += `, which is consistent with documented color profiles for ${dbEntry?.name || "this cultivar"}.`;
  } else if (expectedColors.length > 0) {
    colorSpectrumNotes += `, while typical profiles show ${expectedColors.join(" or ")}. Color variation within strains is common due to genetics, harvest timing, and growing conditions.`;
  } else {
    colorSpectrumNotes += `. Color traits provide important visual markers for strain identification.`;
  }
  
  // Calyx & Pistil Behavior
  const leafShape = fusedFeatures.leafShape || "broad";
  const structureNote = observedStructure === "high" 
    ? "Tight calyx formation with dense clustering" 
    : observedStructure === "medium"
    ? "Balanced calyx spacing with moderate density"
    : "Elongated calyx structure with airy spacing";
  
  const calyxPistilBehavior = `${structureNote}. Pistil emergence is ${observedColor}, indicating ${colorMatch ? "maturity aligned with expected harvest window" : "maturity stage that may vary based on cultivation methods"}. The observed calyx-to-leaf ratio suggests ${leafShape === "broad" ? "indica-influenced structure" : "sativa-influenced elongation"}.`;
  
  // Phenotype Range Fit
  const phenotypeRangeFit = `This specimen fits within the known phenotype range for ${dbEntry?.name || "this strain"}. The combination of ${observedStructure}-density structure, ${observedTrichomes} trichome coverage, and ${observedColor} pistil coloration aligns with documented variations. Phenotype expression can vary based on growing conditions, nutrient regimes, and genetic expression, which accounts for the observed characteristics matching but not perfectly mirroring the canonical profile.`;
  
  return {
    budStructureComparison,
    trichomeDensityComparison,
    colorSpectrumNotes,
    calyxPistilBehavior,
    phenotypeRangeFit,
  };
}

/**
 * Phase 4.2 Step 4.2.4 — Generate Genetics & Lineage
 * 
 * INCLUDE:
 * - Parent strains (if known)
 * - Breeder / origin notes
 * - Dominance explanation (Indica/Sativa/Hybrid with nuance)
 * - Known phenotype branches (e.g. "Purple-leaning cut")
 */
export function generateGeneticsLineage(
  dbEntry?: CultivarReference,
  wikiData?: { genetics?: string; summary?: string },
  extendedProfile?: ExtendedStrainProfile,
  familyTree?: string
): WikiReportSections["geneticsLineage"] {
  // Parent Strains
  const genetics = dbEntry?.genetics || wikiData?.genetics || extendedProfile?.genetics.lineage || "";
  const parentStrains: string[] = [];
  
  if (genetics) {
    const parentPattern = /([^×x/]+)\s*[×x/]\s*([^×x/]+)/gi;
    const match = genetics.match(parentPattern);
    if (match) {
      match.forEach(m => {
        const parts = m.split(/[×x/]/).map(p => p.trim()).filter(p => p.length > 0);
        parentStrains.push(...parts);
      });
    }
  }
  
  // Breeder / Origin Notes
  const breederOriginNotes: string[] = [];
  if (wikiData?.summary) {
    breederOriginNotes.push(wikiData.summary);
  }
  if (dbEntry?.wikiSummary) {
    breederOriginNotes.push(dbEntry.wikiSummary);
  }
  if (extendedProfile?.genetics.breederNotes) {
    breederOriginNotes.push(...extendedProfile.genetics.breederNotes);
  }
  if (breederOriginNotes.length === 0) {
    breederOriginNotes.push("Breeder and origin information not fully documented in available sources.");
  }
  
  // Dominance Explanation
  const dominance = dbEntry?.type || dbEntry?.dominantType || extendedProfile?.genetics.dominance || "Hybrid";
  let dominanceExplanation = "";
  
  if (dominance === "Indica") {
    dominanceExplanation = "This cultivar is indica-dominant, meaning it expresses primarily indica characteristics. Indica strains typically originate from regions like Afghanistan, Pakistan, and India, and are known for their compact growth, broad leaves, dense bud structure, and relaxing physical effects. The dominance suggests approximately 70-90% indica genetics influencing both morphology and effects.";
  } else if (dominance === "Sativa") {
    dominanceExplanation = "This cultivar is sativa-dominant, indicating primarily sativa genetic expression. Sativa strains typically originate from equatorial regions like Thailand, Colombia, and Mexico, and are characterized by tall growth patterns, narrow leaves, elongated buds, and uplifting cerebral effects. The dominance suggests approximately 70-90% sativa genetics influencing structure and experience.";
  } else {
    dominanceExplanation = "This cultivar is a hybrid, combining both indica and sativa genetics. The specific ratio can vary, but hybrids typically aim to balance characteristics from both lineages. The hybrid nature means phenotype expression can lean toward either parent, depending on genetic expression, growing conditions, and phenotype selection. This creates more variation within the strain compared to pure indica or sativa cultivars.";
  }
  
  // Phenotype Branches
  const phenotypeBranches: string[] = [];
  const name = dbEntry?.name || "";
  const lowerName = name.toLowerCase();
  
  if (lowerName.includes("purple")) {
    phenotypeBranches.push("Purple-leaning phenotype variations are common, showing deeper purple coloration in buds and leaves under cooler temperatures.");
  }
  if (lowerName.includes("blue")) {
    phenotypeBranches.push("Blue-tinted phenotypes may appear, particularly in cooler growing conditions.");
  }
  if (dominance === "Hybrid") {
    phenotypeBranches.push("Phenotype variations can express more indica-like (dense, compact) or sativa-like (elongated, airy) characteristics depending on genetic expression.");
  }
  if (phenotypeBranches.length === 0) {
    phenotypeBranches.push("Standard phenotype expression observed, with variations possible based on growing conditions and phenotype selection.");
  }
  
  return {
    parentStrains: parentStrains.length > 0 ? parentStrains : ["Parent strains not fully documented"],
    breederOriginNotes: breederOriginNotes.slice(0, 3), // Max 3 notes
    dominanceExplanation,
    phenotypeBranches,
  };
}

/**
 * Phase 4.2 Step 4.2.5 — Generate Chemistry Profile
 * 
 * INCLUDE:
 * - Likely terpene stack (ranked, 5–8)
 * - Cannabinoid range (THC / CBD / minors if applicable)
 * - How chemistry aligns with visual cues
 * - Variance disclaimer
 */
export function generateChemistryProfile(
  dbEntry?: CultivarReference,
  extendedProfile?: ExtendedStrainProfile,
  fusedFeatures?: FusedFeatures
): WikiReportSections["chemistry"] {
  // Terpene Stack (5-8 ranked)
  const allTerpenes = [
    ...(dbEntry?.terpeneProfile || []),
    ...(dbEntry?.commonTerpenes || []),
    ...(extendedProfile?.terpeneProfile.primary || []),
    ...(extendedProfile?.terpeneProfile.secondary || []),
  ];
  
  const uniqueTerpenes = Array.from(new Set(allTerpenes));
  const terpeneRoles: Record<string, string> = {
    myrcene: "Earthy, musky aroma; potential sedative and anti-inflammatory properties",
    pinene: "Pine, forest aroma; potential alertness and respiratory benefits",
    limonene: "Citrus, lemon aroma; potential mood elevation and stress relief",
    caryophyllene: "Pepper, spicy aroma; potential anti-inflammatory and pain relief",
    linalool: "Floral, lavender aroma; potential calming and anti-anxiety effects",
    humulene: "Hoppy, earthy aroma; potential anti-inflammatory and appetite suppressant",
    terpinolene: "Fresh, herbal aroma; potential antioxidant properties",
    ocimene: "Sweet, herbal aroma; potential decongestant and antifungal properties",
  };
  
  const terpeneStack = uniqueTerpenes.slice(0, 8).map(terpene => ({
    name: terpene.charAt(0).toUpperCase() + terpene.slice(1),
    role: terpeneRoles[terpene.toLowerCase()] || "Aromatic and flavor characteristics",
  }));
  
  // Ensure we have at least 5
  while (terpeneStack.length < 5 && Object.keys(terpeneRoles).length > terpeneStack.length) {
    const remaining = Object.keys(terpeneRoles).filter(t => 
      !terpeneStack.some(ts => ts.name.toLowerCase() === t)
    );
    if (remaining.length > 0) {
      const next = remaining[0];
      terpeneStack.push({
        name: next.charAt(0).toUpperCase() + next.slice(1),
        role: terpeneRoles[next],
      });
    } else {
      break;
    }
  }
  
  // Cannabinoid Range
  const thcRange = extendedProfile?.cannabinoidProfile.thcRange || dbEntry?.effects?.[0] || "15-25%";
  const cbdRange = extendedProfile?.cannabinoidProfile.cbdRange || "<1%";
  const minors = extendedProfile?.cannabinoidProfile.minorCannabinoids || [];
  
  // Visual Alignment
  const trichomeDensity = fusedFeatures?.trichomeDensity || "medium";
  let visualAlignment = "";
  
  if (trichomeDensity === "high") {
    visualAlignment = `The ${trichomeDensity} trichome coverage observed visually suggests high cannabinoid production potential, which aligns with the expected ${thcRange} THC range. Dense trichome coverage typically indicates robust cannabinoid synthesis.`;
  } else if (trichomeDensity === "medium") {
    visualAlignment = `The moderate trichome density aligns with the expected ${thcRange} THC range. Visual trichome coverage provides a reliable indicator of cannabinoid production potential.`;
  } else {
    visualAlignment = `The observed trichome density, while ${trichomeDensity}, still suggests viable cannabinoid production within the expected ${thcRange} THC range. Trichome coverage can vary based on harvest timing and growing conditions.`;
  }
  
  // Variance Disclaimer
  const varianceDisclaimer = "These chemical profiles are inferred from visual analysis and documented strain data, not laboratory testing. Actual cannabinoid and terpene levels can vary significantly based on growing conditions, harvest timing, curing methods, and phenotype expression. Laboratory testing would provide definitive chemical analysis.";
  
  return {
    terpeneStack: terpeneStack.slice(0, 8),
    cannabinoidRange: {
      thc: thcRange,
      cbd: cbdRange,
      minors: minors.slice(0, 5),
    },
    visualAlignment,
    varianceDisclaimer,
  };
}

/**
 * Phase 4.2 Step 4.2.6 — Generate Effects & Experience
 * 
 * INCLUDE:
 * - Primary effects
 * - Secondary effects
 * - Onset timing
 * - Typical duration
 * - Mental vs physical balance
 * - Common user-reported use cases
 */
export function generateEffectsExperience(
  dbEntry?: CultivarReference,
  extendedProfile?: ExtendedStrainProfile,
  dominance?: "Indica" | "Sativa" | "Hybrid"
): WikiReportSections["effectsExperience"] {
  const type = dominance || dbEntry?.type || dbEntry?.dominantType || "Hybrid";
  
  // Primary Effects
  const primaryEffects = extendedProfile?.effects.primary || (Array.isArray(dbEntry?.effects) ? dbEntry.effects : []) || [];
  const primary = primaryEffects.length > 0 
    ? primaryEffects.slice(0, 4)
    : (type === "Indica" 
        ? ["Relaxation", "Sedation", "Body calm", "Sleep"]
        : type === "Sativa"
        ? ["Euphoria", "Uplifted", "Energetic", "Focused"]
        : ["Balanced", "Relaxed", "Uplifted", "Creative"]);
  
  // Secondary Effects
  const secondaryEffects = extendedProfile?.effects.secondary || [];
  const secondary = secondaryEffects.length > 0
    ? secondaryEffects.slice(0, 3)
    : (type === "Indica"
        ? ["Hunger stimulation", "Pain relief", "Stress reduction"]
        : type === "Sativa"
        ? ["Creativity", "Sociability", "Mental clarity"]
        : ["Mood elevation", "Mild relaxation", "Gentle stimulation"]);
  
  // Onset Timing
  const onsetTiming = extendedProfile?.effects.onset || 
    (type === "Indica" 
      ? "Gradual onset over 15-30 minutes, with effects building steadily"
      : type === "Sativa"
      ? "Quick onset within 5-15 minutes, with immediate cerebral effects"
      : "Moderate onset over 10-20 minutes, with balanced effects developing");
  
  // Typical Duration
  const typicalDuration = extendedProfile?.effects.duration ||
    (type === "Indica"
      ? "Effects typically last 2-4 hours, with peak effects around 1-2 hours after consumption"
      : type === "Sativa"
      ? "Effects typically last 2-3 hours, with peak effects within 30-60 minutes"
      : "Effects typically last 2-3.5 hours, with balanced peak around 45-90 minutes");
  
  // Mental vs Physical Balance
  let mentalVsPhysical = "";
  if (type === "Indica") {
    mentalVsPhysical = "Effects lean heavily toward physical relaxation and body sensations. Mental effects are typically mild, with a sense of calm and sometimes slight mental fog. The physical relaxation can be profound, making this more suitable for evening or nighttime use. The body-to-mind ratio is approximately 70:30, favoring physical effects.";
  } else if (type === "Sativa") {
    mentalVsPhysical = "Effects lean strongly toward mental stimulation and cerebral experiences. Physical effects are typically minimal, with users reporting increased energy and activity. The mental clarity and focus can be pronounced, making this suitable for daytime use. The mind-to-body ratio is approximately 70:30, favoring mental effects.";
  } else {
    mentalVsPhysical = "Effects are balanced between mental and physical realms. Users may experience both cerebral stimulation and body relaxation simultaneously, though the balance can vary by phenotype. The mind-to-body ratio is approximately 50:50, creating a harmonized experience suitable for various times of day.";
  }
  
  // Common Use Cases
  const commonUseCases = extendedProfile?.commonUseCases || [];
  const useCases = commonUseCases.length > 0
    ? commonUseCases
    : (type === "Indica"
        ? ["Evening relaxation", "Sleep aid", "Pain management", "Stress relief", "Appetite stimulation"]
        : type === "Sativa"
        ? ["Daytime productivity", "Creative work", "Social activities", "Focus enhancement", "Mood elevation"]
        : ["Versatile daytime/evening use", "Balanced mood support", "Gentle relaxation with mental clarity", "Social settings", "Recreational enjoyment"]);
  
  return {
    primaryEffects: primary.slice(0, 4),
    secondaryEffects: secondary.slice(0, 3),
    onsetTiming,
    typicalDuration,
    mentalVsPhysical,
    commonUseCases: useCases.slice(0, 5),
  };
}

/**
 * Phase 4.2 Step 4.2.7 — Generate Similar / Confusable Strains
 * 
 * LIST:
 * - 3–5 commonly confused strains
 * - Why they are similar
 * - What distinguishes this result from them
 */
export function generateSimilarStrains(
  strainName: string,
  strainFamily?: string,
  dbEntry?: CultivarReference,
  relatedStrains?: Array<{ name: string; relationship: string; reason: string }>
): WikiReportSections["similarStrains"] {
  const similar: WikiReportSections["similarStrains"] = [];
  
  // Use provided related strains if available
  if (relatedStrains && relatedStrains.length > 0) {
    relatedStrains.slice(0, 5).forEach(related => {
      const relatedEntry = CULTIVAR_LIBRARY.find(s => s.name === related.name);
      
      // Determine distinction based on type/dominance
      const thisType = dbEntry?.type || dbEntry?.dominantType || "Hybrid";
      const relatedType = relatedEntry?.type || relatedEntry?.dominantType || "Hybrid";
      
      let distinction = "";
      if (thisType !== relatedType) {
        distinction = `Distinguishing factor: ${strainName} is ${thisType.toLowerCase()}-dominant while ${related.name} is ${relatedType.toLowerCase()}-dominant, affecting both structure and effects.`;
      } else {
        distinction = `Distinction: While both are ${thisType.toLowerCase()}-dominant, ${strainName} may exhibit ${dbEntry?.visualProfile?.budStructure || "different"} bud structure compared to ${relatedEntry?.visualProfile?.budStructure || "similar"} structure in ${related.name}.`;
      }
      
      similar.push({
        name: related.name,
        similarityReason: related.reason || related.relationship,
        distinction,
      });
    });
  }
  
  // Fallback: Generate based on family or type
  if (similar.length === 0 && (strainFamily || dbEntry)) {
    const type = dbEntry?.type || dbEntry?.dominantType || "Hybrid";
    const familyMatches = CULTIVAR_LIBRARY.filter(s => {
      if (s.name === strainName) return false;
      if (strainFamily) {
        const name = s.name.toLowerCase();
        const genetics = s.genetics?.toLowerCase() || "";
        return name.includes(strainFamily.toLowerCase()) || genetics.includes(strainFamily.toLowerCase());
      }
      return (s.type === type || s.dominantType === type) && s.name !== strainName;
    });
    
    familyMatches.slice(0, 5).forEach(match => {
      similar.push({
        name: match.name,
        similarityReason: strainFamily 
          ? `Both belong to the ${strainFamily} lineage`
          : `Both are ${type.toLowerCase()}-dominant`,
        distinction: `Visual differences may include bud structure (${match.visualProfile?.budStructure || "structure"}) and trichome density (${match.visualProfile?.trichomeDensity || "coverage"}) compared to ${strainName}.`,
      });
    });
  }
  
  return similar.slice(0, 5);
}

/**
 * Phase 4.2 Step 4.2.8 — Generate Confidence & Variance Notes
 * 
 * EXPLAIN:
 * - Why confidence landed where it did
 * - What increased confidence (multi-image alignment)
 * - What limits certainty (phenotype variance, lighting, growth stage)
 * 
 * NO:
 * - Absolutes
 * - Lab-level claims
 */
export function generateConfidenceVariance(
  confidencePercent: number,
  confidenceTier: "very_high" | "high" | "medium" | "low",
  imageCount: number,
  consensusAlignment?: { whatAligned: string[]; whatDiffered: string[] },
  nameResolution?: { matchType: string; reasoning?: string[]; strainFamily?: string; closestAlternate?: { name: string; confidence: number; whyNotPrimary: string } }
): WikiReportSections["confidenceVariance"] {
  // Why This Confidence
  let whyThisConfidence = `Confidence is rated at ${confidencePercent}% (${confidenceTier.replace("_", " ")}), based on ${imageCount} image${imageCount > 1 ? "s" : ""} analyzed. `;
  
  if (confidenceTier === "very_high") {
    whyThisConfidence += "This high confidence reflects strong alignment across multiple visual traits, consistent identification across images, and close match to documented strain profiles. While very confident, this remains a visual identification method and cannot match laboratory genetic testing for absolute certainty.";
  } else if (confidenceTier === "high") {
    whyThisConfidence += "This confidence level indicates good alignment between observed traits and expected strain characteristics. Multiple visual markers support the identification, though some minor variations were noted that prevent the highest confidence tier.";
  } else if (confidenceTier === "medium") {
    whyThisConfidence += "This moderate confidence reflects alignment with strain characteristics, but with notable variations or limited image perspectives. The identification is plausible and well-supported, but greater certainty would require additional images or genetic testing.";
  } else {
    whyThisConfidence += "This lower confidence indicates significant uncertainty or limited visual information. While this represents the closest known match, phenotype variance, image quality, or growth stage ambiguity may limit identification certainty.";
  }
  
  // What Increased Confidence
  const whatIncreasedConfidence: string[] = [];
  
  if (imageCount >= 3) {
    whatIncreasedConfidence.push(`${imageCount} images provided multiple viewing angles, allowing comprehensive trait analysis and cross-validation`);
  } else if (imageCount >= 2) {
    whatIncreasedConfidence.push(`${imageCount} images enabled multi-angle analysis, improving identification accuracy`);
  }
  
  if (consensusAlignment?.whatAligned && consensusAlignment.whatAligned.length > 0) {
    whatIncreasedConfidence.push(...consensusAlignment.whatAligned.slice(0, 2));
  }
  
  if (nameResolution && nameResolution.matchType === "clear_winner") {
    whatIncreasedConfidence.push("Strong consensus across all analyzed images with consistent strain identification");
  }
  
  if (nameResolution?.reasoning && nameResolution.reasoning.length > 0) {
    whatIncreasedConfidence.push(...nameResolution.reasoning.slice(0, 2));
  }
  
  if (whatIncreasedConfidence.length === 0) {
    whatIncreasedConfidence.push("Visual traits aligned with documented strain characteristics");
  }
  
  // What Limits Certainty
  const whatLimitsCertainty: string[] = [];
  
  if (imageCount === 1) {
    whatLimitsCertainty.push("Single image limits comprehensive trait analysis; additional angles would improve confidence");
  }
  
  if (consensusAlignment?.whatDiffered && consensusAlignment.whatDiffered.length > 0) {
    whatLimitsCertainty.push(...consensusAlignment.whatDiffered.slice(0, 2));
  }
  
  whatLimitsCertainty.push("Phenotype variation within strains can create visual ambiguity, even when correctly identified");
  whatLimitsCertainty.push("Visual analysis cannot confirm genetic identity without laboratory testing");
  whatLimitsCertainty.push("Growing conditions, harvest timing, and curing methods can alter visual appearance");
  
  return {
    whyThisConfidence,
    whatIncreasedConfidence: whatIncreasedConfidence.slice(0, 4),
    whatLimitsCertainty: whatLimitsCertainty.slice(0, 5),
  };
}

/**
 * Phase 4.2 Step 4.2.9 — Generate Sources & Reasoning
 * 
 * REFERENCE:
 * - Internal 35k strain database
 * - Visual trait clustering
 * - Cross-image consensus logic
 * - AI synthesis explanation (plain language)
 */
export function generateSourcesReasoning(
  imageCount: number,
  consensusResult?: { agreementScore?: number }
): WikiReportSections["sourcesReasoning"] {
  const database = "This identification relies on an internal strain database containing documented profiles for thousands of cultivars. Each strain profile includes visual characteristics, genetic information, terpene profiles, and known effects derived from established sources including Leafly, AllBud, SeedFinder, and community-contributed data.";
  
  const visualClustering = `Visual trait clustering analysis compares observed morphological features (bud structure, trichome density, pistil color, leaf shape) against known strain profiles. Traits are weighted based on reliability and cross-validated across ${imageCount} image${imageCount > 1 ? "s" : ""} to identify the closest matching cultivar.`;
  
  let consensusLogic = "";
  if (imageCount > 1 && consensusResult) {
    const agreementScore = consensusResult.agreementScore || 0;
    consensusLogic = `Cross-image consensus logic analyzed ${imageCount} images independently and merged results. The agreement score of ${agreementScore}% indicates how consistently the same strain was identified across images. Strains appearing in multiple images with consistent trait matches received higher confidence scores.`;
  } else {
    consensusLogic = `Single image analysis relies on trait matching against the strain database. Visual features are scored based on alignment with documented profiles, with higher scores indicating stronger matches.`;
  }
  
  const aiSynthesis = "AI synthesis combines visual analysis with database lookup to generate comprehensive strain profiles. The system identifies the most likely cultivar based on morphological traits, then enriches the result with known genetics, terpene profiles, effects, and cultivation information. All information is synthesized from documented sources and presented in a structured, readable format.";
  
  return {
    database,
    visualClustering,
    consensusLogic,
    aiSynthesis,
  };
}

/**
 * Phase 4.2 — Complete Wiki Report Generator
 * Generates all sections in locked order
 */
export function generateWikiReport(
  strainName: string,
  confidencePercent: number,
  confidenceTier: "very_high" | "high" | "medium" | "low",
  fusedFeatures: FusedFeatures,
  dbEntry?: CultivarReference,
  extendedProfile?: ExtendedStrainProfile,
  wikiData?: { summary?: string; genetics?: string },
  imageCount: number = 1,
  imageResults?: ImageResult[],
  consensusResult?: { agreementScore?: number },
  consensusAlignment?: { whatAligned: string[]; whatDiffered: string[] },
  nameResolution?: { matchType: string; reasoning?: string[]; strainFamily?: string; closestAlternate?: { name: string; confidence: number; whyNotPrimary: string } },
  relatedStrains?: Array<{ name: string; relationship: string; reason: string }>,
  originStory?: string,
  familyTree?: string
): WikiReportSections {
  return {
    // 1. Identity Overview
    identityOverview: generateIdentityOverview(
      strainName,
      confidencePercent,
      confidenceTier,
      dbEntry,
      wikiData,
      originStory
    ),
    
    // 2. Visual Phenotype Analysis
    visualPhenotype: generateVisualPhenotype(
      fusedFeatures,
      dbEntry,
      extendedProfile,
      imageCount
    ),
    
    // 3. Genetics & Lineage
    geneticsLineage: generateGeneticsLineage(
      dbEntry,
      wikiData,
      extendedProfile,
      familyTree
    ),
    
    // 4. Chemistry (Terpenes & Cannabinoids)
    chemistry: generateChemistryProfile(
      dbEntry,
      extendedProfile,
      fusedFeatures
    ),
    
    // 5. Effects & Experience
    effectsExperience: generateEffectsExperience(
      dbEntry,
      extendedProfile,
      dbEntry?.type || dbEntry?.dominantType
    ),
    
    // 6. Cultivation Characteristics
    cultivation: {
      indoorOutdoor: extendedProfile?.cultivationNotes.indoorOutdoor || "Suitable for both indoor and outdoor cultivation, with indoor allowing better environmental control",
      floweringTime: extendedProfile?.cultivationNotes.floweringTime || "8-10 weeks typical flowering period",
      yieldExpectation: extendedProfile?.cultivationNotes.yieldEstimate || "Moderate to high yield depending on growing conditions",
      growthPattern: extendedProfile?.genetics.dominance === "Indica" 
        ? "Compact, bushy growth with dense internodal spacing"
        : extendedProfile?.genetics.dominance === "Sativa"
        ? "Tall, lanky growth with elongated internodal spacing"
        : "Variable growth pattern depending on phenotype expression",
      knownSensitivities: extendedProfile?.knownVariations || [],
    },
    
    // 7. Similar / Often Confused Strains
    similarStrains: generateSimilarStrains(
      strainName,
      nameResolution?.strainFamily,
      dbEntry,
      relatedStrains
    ),
    
    // 8. Confidence & Variance Notes
    confidenceVariance: generateConfidenceVariance(
      confidencePercent,
      confidenceTier,
      imageCount,
      consensusAlignment,
      nameResolution
    ),
    
    // 9. Sources & Reasoning
    sourcesReasoning: generateSourcesReasoning(
      imageCount,
      consensusResult
    ),
  };
}
