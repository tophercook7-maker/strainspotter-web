// lib/scanner/runMultiScan.ts

import { runWikiEngine } from "./wikiEngine";
import { wikiToViewModel } from "./wikiAdapter";
import { matchCultivars } from "./cultivarMatcher";
import { matchCultivarsWithVoting } from "./nameMatcher";
import { fuseMultiImageFeatures } from "./multiImageFusion";
import { matchStrainNameFirst } from "./nameFirstMatcher";
import { fetchWiki } from "./wikiLookup";
import { generateAIReasoning } from "./aiReasoning";
import { synthesizeWikiInsights } from "./wikiSynthesis";
import { CULTIVAR_LIBRARY } from "./cultivarLibrary";
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
  console.log("runScanPipeline: starting with", input.imageCount, "images");
  
  if (input.imageCount === 0) {
    throw new Error("No images provided");
  }

  console.log("runScanPipeline: processing wiki results");
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
      const wiki = await runWikiEngine(syntheticFile, input.imageCount);
      console.log("runScanPipeline: wiki result for", seed.name, wiki.identity.strainName);
      return wiki;
    })
  );

  console.log("runScanPipeline: all wiki results processed", wikiResults.length);

  // Phase 2.2 Part C — Fuse features across ALL images
  const fusedFeatures = fuseMultiImageFeatures(wikiResults);
  console.log("FUSED FEATURES:", fusedFeatures);

  // Phase 2.2 Part D — Name-First Matching
  const nameFirstResult = matchStrainNameFirst(fusedFeatures, input.imageCount);
  console.log("NAME-FIRST RESULT:", nameFirstResult);

  // Phase 2.3 Part G Step 3 — Wiki Lookup (Name Locked)
  const dbEntry = CULTIVAR_LIBRARY.find(s => 
    s.name === nameFirstResult.primaryMatch.name || 
    s.aliases?.includes(nameFirstResult.primaryMatch.name)
  );
  const wikiData = fetchWiki(nameFirstResult.primaryMatch.name, dbEntry);
  console.log("WIKI DATA:", wikiData);

  // Phase 2.3 Part G Step 4 — AI Reasoning Layer
  const aiReasoning = generateAIReasoning(
    nameFirstResult.primaryMatch.name,
    fusedFeatures,
    wikiData,
    nameFirstResult.primaryMatch,
    dbEntry?.terpeneProfile || dbEntry?.commonTerpenes || []
  );
  console.log("AI REASONING:", aiReasoning);

  // Use the primary match name to find corresponding wiki result
  const primaryWiki = wikiResults.find(w => 
    w.identity.strainName === nameFirstResult.primaryMatch.name
  ) || wikiResults[0];
  
  // Update with name-first results and AI reasoning
  const finalWiki = {
    ...primaryWiki,
    identity: {
      ...primaryWiki.identity,
      strainName: nameFirstResult.primaryMatch.name,
      confidence: nameFirstResult.confidence,
    },
    reasoning: {
      ...primaryWiki.reasoning,
      whyThisMatch: aiReasoning.explanation,
    },
  };

  const viewModel = wikiToViewModel(finalWiki, nameFirstResult, wikiData, aiReasoning);

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
  console.log("scanImages called with", images.length, "images");
  
  if (!images || images.length === 0) {
    throw new Error("No images provided to scanImages");
  }

  const imageSeeds = images.map((img) => ({
    name: img.name,
    size: img.size,
  }));

  console.log("scanImages: imageSeeds created", imageSeeds.length);
  
  try {
    const result = await runScanPipeline({
      imageSeeds,
      imageCount: images.length,
    });
    console.log("scanImages: pipeline completed", result);
    return result;
  } catch (error) {
    console.error("scanImages: pipeline error", error);
    throw error;
  }
}
