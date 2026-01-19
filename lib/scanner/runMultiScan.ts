// lib/scanner/runMultiScan.ts

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

type ImageSeed = {
  name: string;
  size: number;
};

type ScanPipelineInput = {
  imageSeeds: ImageSeed[];
  imageCount: number;
};

/**
 * Run the scan pipeline with image seeds
 */
async function runScanPipeline(input: ScanPipelineInput): Promise<ScanResult> {
  if (input.imageCount === 0) {
    throw new Error("No images provided");
  }

  // Use first image seed for now (can be extended to process multiple)
  const firstSeed = input.imageSeeds[0];
  // Create a minimal File object from seed data
  const syntheticFile = new File([], firstSeed.name, {
    lastModified: Date.now(),
  });
  Object.defineProperty(syntheticFile, 'size', { 
    value: firstSeed.size,
    writable: false,
    configurable: false,
  });

  const wiki = await runWikiEngine(syntheticFile, input.imageCount);
  const viewModel = wikiToViewModel(wiki);

  // Generate context for cultivar matching and synthesis
  const context: ScanContext = {
    imageCount: input.imageCount,
    anglesInferred: input.imageCount > 1,
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

/**
 * Scan images and return result + synthesis
 */
export async function scanImages(images: File[]): Promise<ScanResult> {
  const imageSeeds = images.map((img) => ({
    name: img.name,
    size: img.size,
  }));

  return runScanPipeline({
    imageSeeds,
    imageCount: images.length,
  });
}
