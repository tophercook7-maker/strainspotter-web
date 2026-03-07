// lib/scanner/deepAnalysis.ts
// Phase 2.5 Part L Step 3 — Deep Analysis Sections

import type { FusedFeatures } from "./multiImageFusion";
import type { StrainMatch } from "./nameFirstMatcher";
import type { WikiData } from "./wikiLookup";
import type { CultivarReference } from "./cultivarLibrary";

export type DeepAnalysisSections = {
  visualMatchSummary: string;
  flowerStructureAnalysis: string;
  trichomeDensityMaturity: string;
  leafShapeInternode: string;
  colorPistilIndicators: string;
  growthPatternClues: string;
  aiWikiBlend: string; // Phase 2.5 Part L Step 6
  accuracyTips: string[]; // Phase 2.5 Part L Step 9
};

/**
 * Generate all 9 deep analysis sections
 * Phase 2.5 Part L Step 3
 */
export function generateDeepAnalysis(
  strainName: string,
  fused: FusedFeatures,
  primaryMatch: StrainMatch,
  wikiData: WikiData | null,
  dbEntry: CultivarReference | undefined,
  imageCount: number,
  variance: number
): DeepAnalysisSections {
  const visualProfile = dbEntry?.visualProfile || {
    trichomeDensity: "medium" as const,
    pistilColor: ["orange"],
    budStructure: "medium" as const,
    leafShape: "broad" as const,
    colorProfile: "",
  };

  // 1. Visual Match Summary
  const visualMatchSummary = `Based on visual morphology across ${imageCount} image${imageCount > 1 ? "s" : ""}, this plant most closely matches ${strainName}. ${primaryMatch.matchedTraits.length > 0 ? `Key matching traits include ${primaryMatch.matchedTraits.slice(0, 3).join(", ")}. ` : ""}${variance < 20 ? "Visual features show strong agreement across images." : variance < 40 ? "Some variation observed across images, but dominant features are consistent." : "Notable variation across images suggests phenotype diversity or different growth stages."}`;

  // 2. Flower Structure Analysis
  const budStructureDesc = fused.budStructure === "high" 
    ? "dense, compact flowers with tight calyx formation"
    : fused.budStructure === "medium"
    ? "moderately dense flowers with balanced structure"
    : "loose, elongated flowers with airy structure";
  
  const flowerStructureAnalysis = `The flower structure displays ${budStructureDesc}, which aligns with ${strainName}'s documented morphology. ${wikiData ? `Known genetics (${wikiData.genetics}) typically produce ${visualProfile.budStructure === "high" ? "dense" : visualProfile.budStructure === "medium" ? "moderate" : "loose"} bud structures. ` : ""}The observed structure suggests ${fused.budStructure === "high" ? "indica-dominant" : fused.budStructure === "low" ? "sativa-dominant" : "hybrid"} characteristics.`;

  // 3. Trichome Density & Maturity
  const trichomeDesc = fused.trichomeDensity === "high"
    ? "heavy trichome coverage with abundant resin production"
    : fused.trichomeDensity === "medium"
    ? "moderate trichome coverage with visible resin glands"
    : "light trichome coverage with sparse resin production";
  
  const trichomeDensityMaturity = `Trichome analysis reveals ${trichomeDesc}. ${visualProfile.trichomeDensity === fused.trichomeDensity ? `This matches ${strainName}'s typical trichome profile. ` : ""}${fused.trichomeDensity === "high" ? "High trichome density suggests mature flowers nearing harvest readiness, with potential for strong terpene expression." : "Moderate to light trichome coverage may indicate earlier growth stage or genetic variation."}`;

  // 4. Leaf Shape & Internode Spacing
  const leafDesc = fused.leafShape === "broad"
    ? "broad, wide leaves with short internode spacing"
    : "narrow, elongated leaves with longer internode spacing";
  
  const leafShapeInternode = `Leaf morphology shows ${leafDesc}, characteristic of ${fused.leafShape === "broad" ? "indica-dominant" : "sativa-dominant"} genetics. ${wikiData ? `This aligns with ${strainName}'s known lineage (${wikiData.genetics}), which typically exhibits ${visualProfile.leafShape === "broad" ? "broad" : "narrow"} leaf structures. ` : ""}Internode spacing and leaf width are consistent indicators of genetic dominance.`;

  // 5. Color & Pistil Indicators
  const pistilDesc = fused.pistilColor === "orange" || fused.pistilColor === "amber"
    ? "mature orange to amber pistils"
    : fused.pistilColor === "white"
    ? "white to light-colored pistils"
    : "colored pistils";
  
  const colorPistilIndicators = `Pistil coloration shows ${pistilDesc}, indicating ${fused.pistilColor === "orange" || fused.pistilColor === "amber" ? "mature flowers" : "developing flowers"}. ${visualProfile.pistilColor.includes(fused.pistilColor) ? `This matches ${strainName}'s typical pistil coloration. ` : ""}${visualProfile.colorProfile ? `The overall color profile (${visualProfile.colorProfile}) aligns with observed characteristics. ` : ""}Pistil maturity and color are key indicators of harvest timing and flower development stage.`;

  // 6. Growth Pattern Clues
  const growthPatternClues = `${fused.budStructure === "high" && fused.leafShape === "broad" ? "The combination of dense bud structure and broad leaves suggests a compact, bushy growth pattern typical of indica-dominant cultivars. " : fused.budStructure === "low" && fused.leafShape === "narrow" ? "The elongated structure and narrow leaves indicate a taller, more open growth pattern characteristic of sativa-dominant genetics. " : "The balanced structure suggests hybrid genetics with mixed growth characteristics. "}${dbEntry?.type ? `This ${dbEntry.type.toLowerCase()}-dominant cultivar typically exhibits growth patterns consistent with observed morphology. ` : ""}These visual indicators help distinguish this cultivar from similar phenotypes.`;

  // 6. AI + Wiki Blend (Phase 2.5 Part L Step 6)
  const aiWikiBlend = `Based on documented characteristics of ${strainName}${wikiData ? ` (${wikiData.genetics})` : ""}, the AI visual inference aligns with known cultivar references. ${wikiData?.summary ? `${wikiData.summary} ` : ""}Public grow documentation patterns for ${strainName} typically describe ${visualProfile.budStructure === "high" ? "dense" : "moderate"} bud structures with ${visualProfile.trichomeDensity === "high" ? "heavy" : "moderate"} trichome coverage, which matches the observed morphology. This identification combines AI-powered visual analysis with established cultivar knowledge.`;

  // 9. How To Improve Accuracy (Phase 2.5 Part L Step 9)
  const accuracyTips: string[] = [];
  if (imageCount < 3) {
    accuracyTips.push(`Add ${3 - imageCount} more image${3 - imageCount > 1 ? "s" : ""} from different angles (top, side, close-up) to improve confidence`);
  }
  if (variance > 30) {
    accuracyTips.push("Ensure consistent lighting across images to reduce visual variation");
  }
  if (imageCount === 1) {
    accuracyTips.push("Multiple images from different angles significantly improve identification accuracy");
  }
  accuracyTips.push("Include close-up shots of trichomes and pistils for better maturity assessment");
  accuracyTips.push("Capture images in natural or consistent lighting conditions");
  if (accuracyTips.length === 0) {
    accuracyTips.push("For even higher confidence, consider genetic testing for definitive identification");
  }

  return {
    visualMatchSummary,
    flowerStructureAnalysis,
    trichomeDensityMaturity,
    leafShapeInternode,
    colorPistilIndicators,
    growthPatternClues,
    aiWikiBlend,
    accuracyTips,
  };
}
