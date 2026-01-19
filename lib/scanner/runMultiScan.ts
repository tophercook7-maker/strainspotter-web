// lib/scanner/runMultiScan.ts

import { runWikiEngine } from "./wikiEngine";
import { wikiToViewModel } from "./wikiAdapter";
import { matchCultivars } from "./cultivarMatcher";
import { matchCultivarsWithVoting } from "./nameMatcher";
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
 * STEP 2.1.E — Process multiple images, average confidence, pick dominant candidate
 */
async function runScanPipeline(input: ScanPipelineInput): Promise<ScanResult> {
  if (input.imageCount === 0) {
    throw new Error("No images provided");
  }

  // Loop through all images and process each
  const wikiResults = await Promise.all(
    input.imageSeeds.map(async (seed) => {
      const syntheticFile = new File([], seed.name, {
        lastModified: Date.now(),
      });
      Object.defineProperty(syntheticFile, 'size', { 
        value: seed.size,
        writable: false,
        configurable: false,
      });
      return await runWikiEngine(syntheticFile, input.imageCount);
    })
  );

  // Average confidence across all images
  const avgConfidence = Math.round(
    wikiResults.reduce((sum, wiki) => sum + wiki.identity.confidence, 0) / wikiResults.length
  );

  // Pick dominant candidate (most common strain name, or highest confidence if tied)
  const strainCounts = new Map<string, { count: number; maxConfidence: number }>();
  wikiResults.forEach((wiki) => {
    const name = wiki.identity.strainName;
    const existing = strainCounts.get(name) || { count: 0, maxConfidence: 0 };
    strainCounts.set(name, {
      count: existing.count + 1,
      maxConfidence: Math.max(existing.maxConfidence, wiki.identity.confidence),
    });
  });

  let dominantStrain = wikiResults[0].identity.strainName;
  let maxCount = 0;
  let maxConf = 0;
  strainCounts.forEach((value, name) => {
    if (value.count > maxCount || (value.count === maxCount && value.maxConfidence > maxConf)) {
      maxCount = value.count;
      maxConf = value.maxConfidence;
      dominantStrain = name;
    }
  });

  // Use the dominant strain's wiki result for full data
  const dominantWiki = wikiResults.find(w => w.identity.strainName === dominantStrain) || wikiResults[0];
  
  // Update confidence to averaged value
  const finalWiki = {
    ...dominantWiki,
    identity: {
      ...dominantWiki.identity,
      confidence: avgConfidence,
    },
  };

  const viewModel = wikiToViewModel(finalWiki);

  // Generate context for cultivar matching and synthesis
  const context: ScanContext = {
    imageCount: input.imageCount,
    anglesInferred: input.imageCount >= 3,
  };

  // Generate synthesis
  const synthesis = synthesizeWikiInsights(finalWiki, context);

  // Phase 2.2 — Use visual-feature voting for multi-image matching
  const nameMatchResult = matchCultivarsWithVoting(wikiResults, context);
  console.log("NAME MATCH RESULT (Phase 2.2)", nameMatchResult);

  // Also log legacy report for comparison
  const identificationReport = matchCultivars(finalWiki, context);
  console.log("IDENTIFICATION REPORT (Legacy)", identificationReport);

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
