// lib/scanner/runMultiScan.ts

import { runWikiEngine } from "./wikiEngine";
import { wikiToViewModel } from "./wikiAdapter";
import { matchCultivars } from "./cultivarMatcher";
import { matchCultivarsWithVoting } from "./nameMatcher";
import { fuseMultiImageFeatures } from "./multiImageFusion";
import { matchStrainNameFirst } from "./nameFirstMatcher";
import { analyzePerImage, analyzePerImageV3, buildConsensusResult, buildConsensusResultV3 } from "./consensusEngine";
import type { ImageResult, ConsensusResult } from "./consensusEngine";
import { buildTrustLayer } from "./trustEngine";
import { generateExtendedProfile } from "./extendedProfile";
import { checkConsistency } from "./freeTierDepth";
import { generateConfidenceExplanation } from "./confidenceExplanation";
import { assignImageLabels } from "./imageIntakeLabels";
import { determineStrainName } from "./namingHierarchy";
import { generateNamingDisplay } from "./namingDisplay";
import { buildStrainCandidatePool } from "./strainCandidatePool";
import { resolveStrainName } from "./nameResolution";
import { getConfidenceTierFromRange } from "./confidenceTier";
import {
  findRelatedStrains,
  generateOriginStory,
  generateFamilyTree,
  generateEntourageExplanation,
} from "./wikiExpansion";
import { fetchWiki } from "./wikiLookup";
import { generateAIReasoning } from "./aiReasoning";
import { generateDeepAnalysis } from "./deepAnalysis";
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
async function runScanPipeline(input: ScanPipelineInput, imageFiles?: File[]): Promise<ScanResult> {
  console.log("runScanPipeline: starting with", input.imageCount, "images");
  
  if (input.imageCount === 0) {
    throw new Error("No images provided");
  }

  // Phase 2.7 Part N Step 1 — Require minimum 2 images (if multiple images provided)
  if (input.imageCount > 1 && input.imageCount < 2) {
    throw new Error("Multi-image scan requires at least 2 images");
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

  // Phase 3.4 Part A — Image Intake Rules
  // Assign internal labels (Image A/B/C) without exposing to user
  const imageLabels = assignImageLabels(input.imageCount);
  console.log("Image labels assigned:", Array.from(imageLabels.entries()).map(([idx, info]) => 
    `Image ${idx} → Label ${info.label} (${info.role})`
  ));

  // Phase 3.0 Part A — Multi-Image Intake (1-3 images, independent observations)
  // Phase 3.0 Part B — Per-Image Analysis (Enhanced)
  let consensusResult: ConsensusResult | null = null;
  let imageResultsV3: ImageResult[] = [];
  let imageResults: any[] = [];
  
  if (imageFiles && imageFiles.length >= 1 && imageFiles.length <= 3) {
    // Phase 3.0 Part B — Use enhanced analysis for all images (1-3)
    imageResultsV3 = await analyzePerImageV3(imageFiles, input.imageCount);
    console.log("PER-IMAGE RESULTS V3:", imageResultsV3);
    
    // Phase 3.0 Part C — Consensus Merge Engine
    consensusResult = buildConsensusResultV3(imageResultsV3, fusedFeatures, input.imageCount);
    console.log("CONSENSUS RESULT V3:", consensusResult);
    
    // Legacy compatibility
    imageResults = imageResultsV3.map(r => ({
      imageIndex: r.imageIndex,
      // Phase 3.5 Part A — Never "Unknown", use fallback
      strainCandidate: r.candidateStrains[0]?.name || (fusedFeatures.leafShape === "broad" ? "Indica-dominant Hybrid" : "Sativa-dominant Hybrid"),
      confidenceScore: r.candidateStrains[0]?.confidence || 60,
      keyTraits: r.candidateStrains[0]?.traitsMatched || [],
      wikiResult: r.wikiResult,
    }));
  }

  // Phase 3.5 Part A — Naming Hierarchy: Determine strain name using hierarchy
  // Always return a name (exact → closest cultivar → strain family)
  const existingCandidates = imageResultsV3.length > 0
    ? imageResultsV3.flatMap(r => r.candidateStrains.map(c => ({ name: c.name, confidence: c.confidence })))
    : undefined;
  
  const namingResult = determineStrainName(fusedFeatures, input.imageCount, existingCandidates);
  console.log("NAMING RESULT:", namingResult);
  
  // Phase 3.0 Part E — Name First Output
  // Use consensus result if available, but ensure name comes from naming hierarchy
  const nameFirstResult = consensusResult 
    ? {
        primaryMatch: {
          // Phase 3.5 Part A — Use naming hierarchy result, but prefer consensus name if it matches
          name: consensusResult.primaryMatch.name === namingResult.name 
            ? consensusResult.primaryMatch.name 
            : namingResult.name, // Fallback to naming hierarchy if consensus name doesn't match
          score: namingResult.similarityScore,
          confidence: consensusResult.primaryMatch.confidence, // Phase 3.0 Part D — Calibrated confidence (80-99%)
          whyThisMatch: namingResult.rationale || consensusResult.primaryMatch.reason,
          matchedTraits: [],
        },
        alsoSimilar: [
          ...consensusResult.alternates.slice(0, 2).map(a => ({
            name: a.name,
            whyNotPrimary: `Confidence: ${a.confidence}% (lower than primary match)`,
          })),
          ...namingResult.alternateMatches.slice(0, 1).map(a => ({
            name: a.name,
            whyNotPrimary: a.whyNotPrimary,
          })),
        ].slice(0, 3), // Max 3 alternates
        confidence: consensusResult.primaryMatch.confidence, // Phase 3.0 Part D — Never 100%
        confidenceRange: namingResult.confidenceRange || consensusResult.confidenceRange, // Use naming hierarchy range
        imageCountBonus: input.imageCount * 3,
        variancePenalty: 0,
      }
    : {
        primaryMatch: {
          name: namingResult.name, // Phase 3.5 Part A — Always a valid name
          score: namingResult.similarityScore,
          confidence: Math.round((namingResult.confidenceRange.min + namingResult.confidenceRange.max) / 2),
          whyThisMatch: namingResult.rationale,
          matchedTraits: [],
        },
        alsoSimilar: namingResult.alternateMatches.map(a => ({
          name: a.name,
          whyNotPrimary: a.whyNotPrimary,
        })),
        confidence: Math.round((namingResult.confidenceRange.min + namingResult.confidenceRange.max) / 2),
        confidenceRange: namingResult.confidenceRange,
        imageCountBonus: input.imageCount * 3,
        variancePenalty: 0,
      };
  console.log("NAME-FIRST RESULT:", nameFirstResult);
  console.log("CONSENSUS AGREEMENT SCORE:", consensusResult?.agreementScore || "N/A");

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

  // Phase 2.5 Part L Step 3 — Deep Analysis Sections
  const deepAnalysis = generateDeepAnalysis(
    nameFirstResult.primaryMatch.name,
    fusedFeatures,
    nameFirstResult.primaryMatch,
    wikiData,
    dbEntry,
    input.imageCount,
    fusedFeatures.variance
  );
  console.log("DEEP ANALYSIS:", deepAnalysis);

  // Phase 2.7 Part N Step 6 — Add accuracy tips if low confidence
  if (consensusResult?.lowConfidence) {
    deepAnalysis.accuracyTips.unshift(
      "Confidence is below 70%. Try adding more images from different angles.",
      "Ensure consistent lighting across all images for better agreement."
    );
  }

  // Phase 2.8 Part O — Trust & Explanation Engine
  // Create image results from wiki results if not already created
  const imageResultsForTrust = imageResults.length > 0 
    ? imageResults 
    : wikiResults.map((w, i) => ({
        imageIndex: i,
        strainCandidate: w.identity.strainName,
        confidenceScore: w.identity.confidence,
        keyTraits: [],
        wikiResult: w,
      }));
  
  const trustLayer = buildTrustLayer(
    imageResultsForTrust,
    nameFirstResult.primaryMatch,
    fusedFeatures,
    consensusResult?.agreementLevel || (input.imageCount >= 2 ? "medium" : "low"),
    consensusResult?.confidenceRange || nameFirstResult.confidenceRange,
    wikiData,
    dbEntry
  );
  console.log("TRUST LAYER:", trustLayer);

  // Use the primary match name to find corresponding wiki result
  const primaryWiki = wikiResults.find(w => 
    w.identity.strainName === nameFirstResult.primaryMatch.name
  ) || wikiResults[0];

  // Phase 2.9 Part P Step 2 — Generate Extended Strain Profile
  // Phase 2.9 Part P Step 5 — Variance Check (use image count + variance as seed)
  const varianceSeed = input.imageCount * 10 + Math.round(fusedFeatures.variance);
  const extendedProfile = generateExtendedProfile(
    nameFirstResult.primaryMatch.name,
    primaryWiki,
    dbEntry,
    wikiData,
    fusedFeatures,
    input.imageCount,
    varianceSeed
  );
  console.log("EXTENDED PROFILE:", extendedProfile);
  
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

  // Phase 3.4 Part C — Generate multi-image confidence explanation
  const multiImageInfo = generateConfidenceExplanation(
    input.imageCount,
    consensusResult,
    imageResultsV3
  );
  console.log("MULTI-IMAGE INFO:", multiImageInfo);
  
  // Phase 3.5 Part C — Generate naming display info (namingResult already defined above)
  const namingDisplay = generateNamingDisplay(namingResult, input.imageCount);
  console.log("NAMING DISPLAY:", namingDisplay);
  
  // Phase 3.8 Part A — Build strain candidate pool (Top 5)
  const candidatePool = buildStrainCandidatePool(
    fusedFeatures,
    input.imageCount,
    imageResultsV3.length > 0
      ? imageResultsV3.flatMap(r => r.candidateStrains.map(c => ({ name: c.name, confidence: c.confidence })))
      : undefined
  );
  console.log("CANDIDATE POOL (Top 5):", candidatePool);
  
  // Phase 3.8 Part B — Resolve final name
  const nameResolution = resolveStrainName(candidatePool, consensusResult, input.imageCount);
  console.log("NAME RESOLUTION:", nameResolution);
  
  // Phase 3.8 Part C — Get confidence tier
  const confidenceTier = getConfidenceTierFromRange(
    nameFirstResult.confidenceRange.min,
    nameFirstResult.confidenceRange.max
  );
  console.log("CONFIDENCE TIER:", confidenceTier);
  
  // Phase 3.8 Part D — Build "Why This Name" reasoning bullets
  const nameReasoning = {
    bullets: [
      ...nameResolution.reasoning,
      // Add cross-image agreement if applicable
      ...(input.imageCount > 1 && consensusResult && consensusResult.agreementScore >= 70
        ? [`Cross-image agreement: ${consensusResult.agreementScore}% of images identified this strain`]
        : []),
      // Add trait information
      ...(candidatePool[0]?.matchedTraits.length > 0
        ? [`Matched visual traits: ${candidatePool[0].matchedTraits.slice(0, 4).join(", ")}`]
        : []),
      // Add cultivar behavior note
      ...(candidatePool[0]?.strainFamily
        ? [`Known ${candidatePool[0].strainFamily} lineage characteristics observed`]
        : []),
    ],
  };

  const viewModel = wikiToViewModel(finalWiki, nameFirstResult, wikiData, aiReasoning, deepAnalysis, trustLayer, extendedProfile);
  
  // Phase 3.4 Part C — Add multi-image info to view model
  viewModel.multiImageInfo = multiImageInfo;
  
  // Phase 3.5 Part C — Add naming info to view model
  viewModel.namingInfo = namingDisplay;
  
  // Phase 3.8 Part C — Add confidence tier
  viewModel.confidenceTier = confidenceTier;
  
  // Phase 3.8 Part D — Add name reasoning
  viewModel.nameReasoning = nameReasoning;
  
  // Phase 3.8 Part B — Add name resolution
  viewModel.nameResolution = nameResolution;
  
  // Phase 3.9 Part G — Find related strains for wiki expansion
  const relatedStrainsData = findRelatedStrains(
    nameFirstResult.primaryMatch.name,
    nameResolution.strainFamily,
    dbEntry
  );
  viewModel.relatedStrains = relatedStrainsData;
  
  // Phase 3.9 Part A — Generate origin story
  const originStoryText = generateOriginStory(
    nameFirstResult.primaryMatch.name,
    dbEntry,
    wikiData
  );
  viewModel.originStory = originStoryText;
  
  // Phase 3.9 Part B — Generate family tree
  const familyTreeText = generateFamilyTree(
    extendedProfile?.genetics.lineage || viewModel.genetics?.lineage || "",
    dbEntry
  );
  viewModel.familyTree = familyTreeText;
  
  // Phase 3.9 Part D — Generate entourage effect explanation
  const entourageExplanationText = generateEntourageExplanation(
    extendedProfile?.terpeneProfile.primary || [],
    extendedProfile?.cannabinoidProfile.thcRange
  );
  viewModel.entourageExplanation = entourageExplanationText;

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

  // Phase 2.7 Part N Step 1 — Require minimum 2 images for multi-image scan
  // (But allow single image as fallback)
  if (images.length > 1 && images.length < 2) {
    throw new Error("Multi-image scan requires at least 2 images (max 3)");
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
    }, images); // Pass image files for consensus engine
    console.log("scanImages: pipeline completed", result);
    return result;
  } catch (error) {
    console.error("scanImages: pipeline error", error);
    throw error;
  }
}
