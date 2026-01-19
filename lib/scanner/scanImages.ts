// lib/scanner/scanImages.ts
// Scan multiple images and return result + synthesis

import { runWikiEngine } from "./wikiEngine";
import { wikiToViewModel } from "./wikiAdapter";
import { matchCultivars } from "./cultivarMatcher";
import { synthesizeWikiInsights } from "./wikiSynthesis";
import type { ScannerViewModel } from "./viewModel";
import type { WikiSynthesis, ScanContext } from "./types";

export type ScanResult = {
  result: ScannerViewModel;
  synthesis: WikiSynthesis;
};

/**
 * Scan images and return result + synthesis
 */
export async function scanImages(images: File[]): Promise<ScanResult> {
  if (images.length === 0) {
    throw new Error("No images provided");
  }

  // Use first image for now (can be extended to process multiple)
  const wiki = await runWikiEngine(images[0]);
  const viewModel = wikiToViewModel(wiki);

  // Generate context for cultivar matching and synthesis
  const context: ScanContext = {
    imageQuality: {
      focus: "moderate",
      noise: "moderate",
      lighting: "good",
    },
    detectedFeatures: {
      leafShape: wiki.morphology.visualTraits?.find(t => {
        const lower = t.toLowerCase();
        return lower.includes("leaf") || lower.includes("broad") || lower.includes("narrow");
      }) || undefined,
      trichomeDensity: wiki.morphology.trichomes,
      pistilColor: wiki.morphology.coloration.includes("pistil") 
        ? wiki.morphology.coloration 
        : undefined,
    },
    uncertaintySignals: wiki.reasoning?.conflictingSignals && wiki.reasoning.conflictingSignals.length > 0
      ? { conflictingTraits: wiki.reasoning.conflictingSignals }
      : undefined,
  };

  // Generate synthesis
  const synthesis = synthesizeWikiInsights(wiki, context);

  // Log identification report
  const identificationReport = matchCultivars(wiki, context);
  console.log("IDENTIFICATION REPORT", identificationReport);

  return {
    result: viewModel,
    synthesis,
  };
}
