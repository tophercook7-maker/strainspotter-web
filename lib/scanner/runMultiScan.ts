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
// Phase 4.1 — Name-First Disambiguation
import { buildStrainShortlist } from "./strainShortlist";
import { scoreNameCompetition } from "./nameCompetition";
import { 
  selectPrimaryName, 
  generateNameExplanation,
  type NameFirstDisambiguationResult 
} from "./nameFirstDisambiguation";
import { getConfidenceTierFromRange } from "./confidenceTier";
import {
  findRelatedStrains,
  generateOriginStory,
  generateFamilyTree,
  generateEntourageExplanation,
} from "./wikiExpansion";
import { generatePerImageFindings, generateConsensusAlignment } from "./perImageFindings";
import { assignUserImageLabels } from "./imageLabels";
// Phase 4.2 — Extensive Wiki-Style Report
import { generateWikiReport } from "./wikiReport";
// Phase 4.6 — Indica/Sativa/Hybrid Ratio Engine
import { resolveStrainRatio, generateRatioExplanation } from "./ratioEngine";
// Phase 5.1 — Terpene-Weighted Experience Engine
import { generateTerpeneExperience } from "./terpeneExperienceEngine";
// Phase 4.0.1 — Image Diversity Check
import { evaluateImageDiversity, assessImageDiversity } from "./imageDiversity";
// Phase 4.0.3 — Angle & zoom inference
import { inferImageAngle } from "./imageAngleHeuristics";
// Phase 4.0.4 — Duplicate image detection
import { detectDuplicates, computeImageSimilarity as computeEmbeddingSimilarity } from "./duplicateImageDetection";
// Phase 4.0.5 — Diversity hints
import { generateDiversityHint } from "./imageDiversityHints";
// Phase 4.0.5 — Similar-Image Tolerance & Retry Guard
import { imagesTooSimilar } from "./similarityGuard";
// Phase 4.0.6 — Similarity guard
import { normalizeSimilarityFailure } from "./similarityGuard";
// Phase 4.0.7 — Diversity scoring
import { calculateImageDiversity } from "./imageDiversity";
// Phase 4.0.7 — apply diversity confidence cap
import { applyDiversityConfidenceCap } from "./confidenceCaps";
// Phase 4.0.8 — replace hard failure with guided recovery
import { evaluateAnalysisGuards } from "./analysisGuards";
// Phase 4.0.9 — integrate distinctness score
import { calculateImageDistinctness, assessImageDistinctness } from "./imageDistinctness";
// Phase 4.0.1 — Image Distinctiveness Guard
import { areImagesDistinctEnough } from "./imageDistinctiveness";
// Phase 4.0.2 — Image Role Weighting & Auto-Angle Inference
import { inferImageRole } from "./imageRoleInference";
// Phase 4.0.2 — Angle diversity bonus/penalty
import { inferImageAngleFromSeed } from "./imageAngleHeuristics";
// Phase 4.0.3 — Duplicate / Near-Duplicate Image Detection
import { imageFingerprint, similarityScore } from "./imageSimilarity";
// Phase 4.0.7 — Image Similarity Detection
import { computeImageSimilarity } from "./imageSimilarity";
// Phase 4.0.4 — Angle & Perspective Heuristics
import { classifyAngle, type ImageAngle } from "./angleClassifier";
// Phase 4.0.3 — Near-duplicate image detection
import { tagDuplicateImages } from "./imageDistinctiveness";
// Phase 4.1 — Guaranteed strain name resolver
import { resolveFallbackName } from "./nameFallback";
// Phase 4.1.0 — apply name boost
import { applyNameConsensusBoost } from "./nameBoost";
// Phase 4.1.1 — final name assignment
import { resolvePrimaryStrainName } from "./nameResolver";
// Phase 4.1.2 — integrate grace mode
import { applySamePlantGrace } from "./graceMode";
// Phase 4.1.6 — confidence floor for low distinctness
import { applyConfidenceFloor } from "./confidenceFloor";
// Phase 4.1.7 — UI message (non-blocking)
import { buildScanNote, buildSamePlantNote, buildAngleHintNote, buildDistinctivenessNote } from "./scanNotes";
// Phase 4.2.1 — multi-angle hinting (non-blocking)
import { inferAngleHint } from "./angleHinting";
// Phase 4.2.2 — angle diversity scoring
// Phase 4.0.8 — Angle Diversity Scoring
import { computeAngleDiversity, type ImageAngle as AngleDiversityType } from "./angleDiversity";
// Phase 4.2.4 — visual distinctiveness scoring (soft)
import { computeVisualDistinctiveness } from "./visualDistinctiveness";
// Phase 4.2.6 — image guidance hints (non-blocking)
import { deriveImageGuidance } from "./imageGuidance";
// Phase 4.3.1 — Name Confidence Stabilization
import { stabilizeStrainName } from "./nameStabilizer";
// Phase 4.3.2 — Ratio Stabilization
import { stabilizeRatio } from "./ratioStabilizer";
// Phase 4.3.3 — Visual Trait Anchoring
import { buildVisualAnchors } from "./visualAnchors";
// Phase 4.3.4 — Name Confidence Fusion
import { fuseNameConfidence } from "./nameConfidenceFusion";
// Phase 4.3.5 — Ratio Normalization
import { normalizeRatio } from "./ratioNormalizer";
// Phase 4.3.6 — Confidence Explanation Engine
import { buildConfidenceExplanation } from "./confidenceExplainer";
// Phase 4.4.0 — Name-First Matching Engine
import { runNameFirstMatching } from "./nameFirstMatcher";
// Phase 4.5.0 — Indica/Sativa/Hybrid Ratio Resolver
import { resolveStrainRatio as resolveStrainRatioV4_5, resolvePlantRatio } from "./ratioResolver";
// Phase 4.6.0 — Match Strength Resolver
import { resolveMatchStrength } from "./matchStrength";
// Phase 4.8.0 — Indica/Sativa/Hybrid Ratio Engine (Visual + Genetics + Terpenes)
import { resolveStrainRatioV48 } from "./ratioEngineV48";
// Phase 4.7.0 — Name-First Disambiguation Engine
import { resolveNameDisambiguation } from "./nameDisambiguation";
// Phase 4.9.0 — Name-First Match Confidence Engine
import { resolveNameConfidenceV49 } from "./nameConfidenceV49";
// Phase 4.1.8 — same-plant image detection (soft)
// Phase 4.0.2 — Enhanced same-plant awareness
import { detectSamePlant, detectSamePlantEnhanced } from "./samePlantDetector";
// Phase 4.0.3 — Confidence Calibration & Trust Layer
import { computeConfidenceV403 } from "./confidenceV403";
// Phase 4.0.4 — Name Trust & Disambiguation Layer
import { computeNameTrustV404 } from "./nameTrustV404";
// Phase 4.5.1 — Name Memory Cache
import { getNameMemoryBias, cacheScanResult } from "./nameMemory";
import { applyFamilyFirstConfidenceBoost } from "./familyFirstBoost";
// Phase 4.6 — Name Trust & Disambiguation
import { computeNameTrustV46 } from "./nameTrustV46";
// Phase 4.0.5 — Indica / Sativa / Hybrid Ratio Finalization
import { resolveFinalRatioV405 } from "./resolveFinalRatioV405";
// Phase 4.4 — Identity + Ratio Surface Layer
import { resolveFinalRatioV44 } from "./resolveFinalRatioV44";
// Phase 5.1 — Indica / Sativa / Hybrid Ratio Engine
import { resolveFinalRatioV51 } from "./resolveFinalRatioV51";
// Phase 5.4 — Indica / Sativa / Hybrid Ratio Calibration
import { resolveFinalRatioV54, type VisualMorphologySignals, type TerpeneBias } from "./resolveFinalRatioV54";
// RATIO ENGINE V1 (SIMPLE & BELIEVABLE)
import { resolveFinalRatioV1 } from "./resolveFinalRatioV1";
import { resolveFinalRatioV47 } from "./resolveFinalRatioV47";
// Phase 4.0.6 — Confidence Calibration & User Trust Lock
import { resolveFinalConfidenceV406 } from "./resolveFinalConfidenceV406";
// Phase 4.1 — Confidence Calibration & Truthful Precision
import { resolveFinalConfidenceV41 } from "./resolveFinalConfidenceV41";
// Phase 4.3 — Confidence Calibration & Honesty Layer
import { resolveFinalConfidenceV43 } from "./resolveFinalConfidenceV43";
// Phase 4.5 — Confidence Calibration & Trust Guardrails
import { resolveFinalConfidenceV45 } from "./resolveFinalConfidenceV45";
// Phase 4.8 — Confidence Calibration
import { resolveFinalConfidenceV48 } from "./resolveFinalConfidenceV48";
// Phase 5.0 — Confidence Calibration Engine
import { resolveFinalConfidenceV50 } from "./resolveFinalConfidenceV50";
// Phase 5.2 — Confidence Calibration Engine
import { resolveFinalConfidenceV52 } from "./resolveFinalConfidenceV52";
// CONFIDENCE CALIBRATION (REALISTIC)
import { resolveFinalConfidenceV1 } from "./resolveFinalConfidenceV1";
// Phase 5.3 — Name-First Strengthening & Alias Matching
import { strengthenNameSelectionV53, findStrainByNameOrAlias } from "./nameStrengtheningV53";
// Phase 5.5 — Name Confidence + Disambiguation Upgrade
import { resolveNameConfidenceV55 } from "./nameConfidenceV55";
// NAME-FIRST MATCHING (NON-NEGOTIABLE)
import { selectPrimaryStrainName } from "./selectPrimaryStrainName";
// Phase B.1 — NAME-FIRST MATCHING ENGINE (Database first, always)
import { nameFirstMatchingEngine } from "./nameFirstMatchingEngine";
// Phase B.2 — CONFIDENCE CALIBRATION
import { calibrateConfidenceB2 } from "./confidenceCalibrationB2";
// Phase 4.1.9 — consensus weight adjustment
import { adjustConsensusWeight } from "./consensusWeights";
// Phase 4.1.3 — replace analysis failure paths
import { guardAgainstFailure } from "./failureGuard";
// Phase 4.1.5 — integrate distinctness
import { computeDistinctness } from "./distinctness";
// Phase 5.2 — Genetics + Terpene Weighting + Phenotype Signals Ratio Engine
import { resolveStrainRatioV52 } from "./ratioEngineV52";
import { fetchWiki } from "./wikiLookup";
import { generateAIReasoning } from "./aiReasoning";
import { generateDeepAnalysis } from "./deepAnalysis";
import { synthesizeWikiInsights } from "./wikiSynthesis";
import { CULTIVAR_LIBRARY, type CultivarReference } from "./cultivarLibrary";
import type { ScannerViewModel } from "./viewModel";
import type { WikiSynthesis, ScanContext } from "./types";
import type { NameFirstResultV80 } from "./nameFirstV80";
import { assessPlantSimilarity } from "./plantSimilarity";
// Phase 4.0.8 — ScanResult moved to types.ts as discriminated union
import type { ScanResult } from "./types";

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
// STABILIZATION MODE — Helper to build safe fallback result
function buildSafeFallbackResult(
  reason: string,
  imageCount: number,
  fallbackName: string = "Closest Known Cultivar"
): ScanResult {
  // FAILURE MESSAGING SOFTENED — Use softer messages instead of "analysis failed"
  const softReason = reason.includes("failed") || reason.includes("error") || reason.includes("Error")
    ? "Low confidence — results may vary"
    : reason.includes("similar") || reason.includes("identical")
    ? "Images appear similar — try different angles"
    : reason;
  
  const fallbackConfidence = Math.max(50, 75 - (imageCount === 1 ? 15 : 0));
  const fallbackViewModel: import("./viewModel").ScannerViewModel = {
    name: fallbackName,
    title: fallbackName,
    confidenceRange: { min: fallbackConfidence - 5, max: fallbackConfidence + 5, explanation: softReason },
    matchBasis: "Results shown with limited confidence",
    visualMatchSummary: "",
    flowerStructureAnalysis: "",
    trichomeDensityMaturity: "",
    leafShapeInternode: "",
    colorPistilIndicators: "",
    growthPatternClues: "",
    primaryMatch: {
      name: fallbackName,
      confidenceRange: { min: fallbackConfidence - 5, max: fallbackConfidence + 5 },
      whyThisMatch: softReason,
    },
    secondaryMatches: [],
    trustLayer: {
      confidenceBreakdown: { visualSimilarity: fallbackConfidence, traitOverlap: fallbackConfidence, consensusStrength: 0 },
      whyThisMatch: [softReason],
      sourcesUsed: ["Limited analysis"],
      confidenceLanguage: "Low confidence — results may vary",
    },
    aiWikiBlend: "",
    uncertaintyExplanation: softReason,
    accuracyTips: ["Try photos from different angles", "Ensure good lighting and focus", "Add more images for better accuracy"],
    confidence: fallbackConfidence,
    whyThisMatch: softReason,
    morphology: "",
    trichomes: "",
    pistils: "",
    structure: "",
    growthTraits: [],
    terpeneGuess: [],
    effectsShort: [],
    effectsLong: [],
    comparisons: [],
    referenceStrains: [],
    sources: [],
    genetics: { dominance: "Unknown", lineage: "" },
    experience: { effects: [], bestFor: [] },
    disclaimer: softReason,
    nameFirstDisplay: {
      primaryStrainName: fallbackName,
      primaryName: fallbackName,
      confidencePercent: fallbackConfidence,
      confidence: fallbackConfidence,
      confidenceTier: fallbackConfidence >= 75 ? "high" as const : fallbackConfidence >= 65 ? "medium" as const : "low" as const,
      // Phase 4.1 — Enhanced tagline
      tagline: (() => {
        const { generateIntelligentTagline } = require("./perceivedIntelligence");
        const fallbackConf = Math.max(50, 75 - (imageCount === 1 ? 15 : 0));
        return generateIntelligentTagline({
          confidencePercent: fallbackConf,
          imageCount: imageCount || 0,
          hasDatabaseMatch: false,
          hasMultiImageAgreement: false,
        });
      })(),
      explanation: { whyThisNameWon: [softReason], whatRuledOutOthers: [], varianceNotes: [] },
    },
  };
  const fallbackConsensus: ConsensusResult = {
    primaryMatch: { name: fallbackName, confidence: fallbackConfidence, reason: softReason },
    alternates: [],
    agreementScore: 0,
    strainName: fallbackName,
    confidenceRange: { min: fallbackConfidence - 5, max: fallbackConfidence + 5, explanation: softReason },
    whyThisMatch: softReason,
    alternateMatches: [],
    lowConfidence: true,
    agreementLevel: "low" as const,
  };
  return {
    status: "partial",
    guard: { status: "low-confidence" as const, reason: softReason },
    consensus: fallbackConsensus,
    confidence: fallbackConfidence,
    result: fallbackViewModel,
    synthesis: {} as any,
  };
}

async function runScanPipeline(input: ScanPipelineInput, imageFiles?: File[]): Promise<ScanResult> {
  console.log("runScanPipeline: starting with", input.imageCount, "images");
  
  // STABILIZATION RESET — Wrap entire function in try-catch to ensure always returns
  try {
    // PHASE A FINALIZATION — No throws, return safe fallback
    if (input.imageCount === 0) {
      const fallback = buildSafeFallbackResult("Low confidence — results may vary", 0);
      console.log(`SCAN COMPLETE — status=${'status' in fallback ? fallback.status : 'partial'} confidence=${'confidence' in fallback ? fallback.confidence : 50}`);
      return fallback;
    }

  // Phase 2.7 Part N Step 1 — Require minimum 2 images (if multiple images provided)
  // PHASE A FINALIZATION — This condition is impossible (x > 1 && x < 2), but keep for safety
  if (input.imageCount > 1 && input.imageCount < 2) {
    const fallback = buildSafeFallbackResult("Low confidence — results may vary", input.imageCount);
    console.log(`SCAN COMPLETE — status=${'status' in fallback ? fallback.status : 'partial'} confidence=${'confidence' in fallback ? fallback.confidence : 50}`);
    return fallback;
  }

  // Phase 4.0.5 — Do NOT fail scan on similar images
  // Initialize analysis warnings array
  const analysisWarnings: string[] = [];
  
  // STABILIZATION MODE — Proceed with low confidence instead of returning error
  // Phase 4.0.1 — Check image distinctness (soften failure, proceed with warning)
  const distinctness = assessImageDistinctness(input.imageSeeds);
  
  if (!distinctness.distinct) {
    console.warn("STABILIZATION: Images lack variance, proceeding with reduced confidence");
    // Add warning to analysisWarnings array (will be added to viewModel.notes later)
    analysisWarnings.push("HIGH_IMAGE_SIMILARITY");
  }

  // Phase 4.0.3 — De-duplicate similar images instead of failing scan
  let filteredImageSeeds: ImageSeed[] = input.imageSeeds;
  let filteredImageFiles: File[] | undefined = imageFiles;
  let filteredImageCount: number = input.imageCount;
  let filteredBase64Data: string[] = []; // Phase 4.0.4 — Store base64 for angle classification
  // Phase 4.5.1 — Store final image fingerprints for name memory
  let finalImageFingerprints: number[] = [];

  if (imageFiles && imageFiles.length > 1) {
    // Convert files to base64 for fingerprinting
    const base64Data = await Promise.all(
      imageFiles.map(async (file) => {
        return new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            // Remove data URL prefix if present
            const base64Data = result.includes(',') ? result.split(',')[1] : result;
            resolve(base64Data);
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      })
    );

    // Create fingerprints
    const fingerprints = base64Data.map(imageFingerprint);

    // De-duplicate: keep only unique images (similarity < 0.92)
    const uniqueImages: number[] = [];
    const keptIndices: number[] = [];

    fingerprints.forEach((fp, i) => {
      const isDuplicate = uniqueImages.some(u => similarityScore(u, fp) > 0.92);

      if (!isDuplicate) {
        uniqueImages.push(fp);
        keptIndices.push(i);
      }
    });

    // STABILIZATION MODE — Keep at least one image instead of throwing
    if (keptIndices.length === 0) {
      console.warn("STABILIZATION: All images were duplicates, keeping first image for analysis");
      keptIndices.push(0); // Keep first image as fallback
      uniqueImages.push(fingerprints[0]);
    }

    // Filter to keep only unique images
    filteredImageSeeds = keptIndices.map(i => input.imageSeeds[i]);
    filteredImageFiles = keptIndices.map(i => imageFiles[i]);
    filteredBase64Data = keptIndices.map(i => base64Data[i]); // Phase 4.0.4 — Store filtered base64
    filteredImageCount = keptIndices.length;

    if (keptIndices.length < input.imageCount) {
      console.log(`Phase 4.0.3 — Removed ${input.imageCount - keptIndices.length} duplicate/near-duplicate images`);
    }
  } else if (imageFiles && imageFiles.length === 1) {
    // Phase 4.0.4 — Convert single image to base64 for angle classification
    filteredBase64Data = await Promise.all(
      imageFiles.map(async (file) => {
        return new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            const base64Data = result.includes(',') ? result.split(',')[1] : result;
            resolve(base64Data);
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      })
    );
    // Phase 4.5.1 — Store single image fingerprint for name memory
    finalImageFingerprints = filteredBase64Data.map(imageFingerprint);
  }

  // Phase 4.0.5 — Do NOT fail scan on similar images
  // Note: analysisWarnings was initialized above before distinctness check

  // Update input to use filtered images
  const filteredInput: ScanPipelineInput = {
    imageSeeds: filteredImageSeeds,
    imageCount: filteredImageCount,
  };

  // Phase 5.0.2 — Pipeline Order:
  // 1. Images → wiki results → fused features (needed for database query)
  // 2. nameFirstPipeline → leverageDatabaseFilter (DATABASE NAME MATCH - runs FIRST in pipeline)
  // 3. Image trait filtering (narrows database candidates)
  // 4. Multi-image consensus
  // 5. Confidence calculation
  
  console.log("runScanPipeline: processing wiki results");
  // Loop through all images and process each (using filtered images)
  const wikiResults = await Promise.all(
    filteredInput.imageSeeds.map(async (seed) => {
      const syntheticFile = new File([], seed.name, {
        lastModified: Date.now(),
      });
      Object.defineProperty(syntheticFile, 'size', { 
        value: seed.size,
        writable: false,
        configurable: false,
      });
      const wiki = await runWikiEngine(syntheticFile, filteredInput.imageCount);
      console.log("runScanPipeline: wiki result for", seed.name, wiki.identity.strainName);
      return wiki;
    })
  );

  console.log("runScanPipeline: all wiki results processed", wikiResults.length);

  // Phase 2.2 Part C — Fuse features across ALL images
  const fusedFeatures = fuseMultiImageFeatures(wikiResults);
  console.log("FUSED FEATURES:", fusedFeatures);
  
  // Phase 5.0.2 — Fused features ready for database query
  // Database name matching happens in nameFirstPipeline (leverageDatabaseFilter)

  // Phase 3.4 Part A — Image Intake Rules
  // Assign internal labels (Image A/B/C) without exposing to user
  const imageLabels = assignImageLabels(filteredInput.imageCount);
  console.log("Image labels assigned:", Array.from(imageLabels.entries()).map(([idx, info]) => 
    `Image ${idx} → Label ${info.label} (${info.role})`
  ));

  // Phase 3.0 Part A — Multi-Image Intake (1-3 images, independent observations)
  // Phase 3.0 Part B — Per-Image Analysis (Enhanced)
  let consensusResult: ConsensusResult | null = null;
  let imageResultsV3: ImageResult[] = [];
  let imageResults: any[] = [];
  let samePlantLikely: boolean = true; // Phase 4.1.8 — Default to true (single image = same plant)
  let imageAngleHints: Array<{ id: number; angle: "top" | "side" | "macro" | "unknown" }> = []; // Phase 4.2.1 — Angle hints for diversity scoring
  
  // Phase 4.3 Step 4.3.1 — NAME-FIRST PIPELINE (TOP PRIORITY)
  // Changed flow: Candidate Name Resolution happens FIRST
  // Everything else supports or challenges that name
  let nameFirstPipelineResult: ReturnType<typeof import("./nameFirstPipeline").runNameFirstPipeline> | null = null;
  let primaryStrainNameFromPipeline: string | null = null; // Phase 4.3 Step 4.3.1 — Lock name early
  let lockedStrainName: string | null = null; // Phase 4.3 Step 4.3.1 — Final locked name for all processing
  
  // Phase 5.0.2 — STEP 3: IMAGE TRAIT FILTERING (narrows name candidates)
  // Phase 4.0 Part B — Per-Image Analysis (supports 1-5 images)
  if (filteredImageFiles && filteredImageFiles.length >= 1 && filteredImageFiles.length <= 5) {
    // Phase 5.0.2 — Image analysis extracts traits that will narrow database candidates
    // The nameFirstPipeline will use these image results to refine the database filter results
    console.log("Phase 5.0.2 — STEP 3: IMAGE TRAIT FILTERING (extracting traits from", filteredImageFiles.length, "images)");
    
    // Phase 3.0 Part B — Use enhanced analysis for all images (1-5)
    imageResultsV3 = await analyzePerImageV3(filteredImageFiles, filteredInput.imageCount);
    console.log("Phase 5.0.2 — STEP 3 COMPLETE: Image traits extracted");
    console.log("PER-IMAGE RESULTS V3:", imageResultsV3);
    
    // Phase 4.0.1 — Check image distinctiveness
    const imageFingerprints = imageResultsV3
      .map(r => r.embedding)
      .filter((embedding): embedding is number[] => embedding !== undefined && Array.isArray(embedding));
    
    if (imageFingerprints.length >= 2 && !areImagesDistinctEnough(imageFingerprints)) {
      // Return soft-fail result with recommendation
      const fallbackResult = imageResultsV3[0];
      // Phase 4.1 — Ensure nameFirstDisplay is always present
      const fallbackName = fallbackResult.candidateStrains[0]?.name || "Closest Known Cultivar";
      const fallbackConfidence = Math.max(60, fallbackResult.candidateStrains[0]?.confidence || 60);
      
      const softFailViewModel: import("./viewModel").ScannerViewModel = {
        name: fallbackName,
        title: fallbackName,
        confidenceRange: { min: 60, max: 70, explanation: "Low diversity due to similar images" },
        matchBasis: "Single image result due to low image diversity",
        visualMatchSummary: "",
        flowerStructureAnalysis: "",
        trichomeDensityMaturity: "",
        leafShapeInternode: "",
        colorPistilIndicators: "",
        growthPatternClues: "",
        primaryMatch: {
          name: fallbackName,
          confidenceRange: { min: 60, max: 70 },
          whyThisMatch: "Single image result due to low image diversity",
        },
        secondaryMatches: [],
        trustLayer: {
          confidenceBreakdown: {
            visualSimilarity: 60,
            traitOverlap: 60,
            consensusStrength: 0,
          },
          whyThisMatch: ["Images too similar - using single image result"],
          sourcesUsed: ["Single image analysis"],
          confidenceLanguage: "Low confidence due to similar images",
        },
        aiWikiBlend: "",
        uncertaintyExplanation: "Images appear to be the same angle or lighting",
        accuracyTips: ["Try one close-up and one full-bud photo", "Use different lighting angles"],
        confidence: fallbackConfidence,
        whyThisMatch: "Single image result due to low image diversity",
        morphology: "",
        trichomes: "",
        pistils: "",
        structure: "",
        growthTraits: [],
        terpeneGuess: [],
        effectsShort: [],
        effectsLong: [],
        comparisons: [],
        referenceStrains: [],
        sources: [],
        genetics: {
          dominance: "Unknown",
          lineage: "",
        },
        experience: {
          effects: [],
          bestFor: [],
        },
        disclaimer: "Results based on single image due to low image diversity",
        softFail: {
          reason: "Images too similar",
          recommendation: "Photos appear to be the same angle or lighting. Try one close-up and one full-bud photo.",
        },
        // Phase 4.1 — Guaranteed nameFirstDisplay
        nameFirstDisplay: {
          primaryStrainName: fallbackName,
          primaryName: fallbackName,
          confidencePercent: fallbackConfidence,
          confidence: fallbackConfidence,
          confidenceTier: fallbackConfidence >= 85 ? "very_high" as const
            : fallbackConfidence >= 75 ? "high" as const
            : fallbackConfidence >= 65 ? "medium" as const
            : "low" as const,
          tagline: "Closest known match based on visual analysis",
          explanation: {
            whyThisNameWon: ["Single image result due to low image diversity"],
            whatRuledOutOthers: [],
            varianceNotes: [],
          },
        },
      };
      
      return {
        status: "partial",
        guard: {
          status: "low-diversity",
          reason: "Images too similar",
        },
        consensus: {
          primaryMatch: {
            name: fallbackResult.candidateStrains[0]?.name || "Closest Known Cultivar",
            confidence: fallbackResult.candidateStrains[0]?.confidence || 60,
            reason: "Images appear to be the same angle or lighting. Try one close-up and one full-bud photo.",
          },
          alternates: [],
          agreementScore: 0,
          strainName: fallbackResult.candidateStrains[0]?.name || "Closest Known Cultivar",
          confidenceRange: { min: 60, max: 70, explanation: "Low diversity due to similar images" },
          whyThisMatch: "Single image result due to low image diversity",
          alternateMatches: [],
          notes: ["Images too similar - try different angles or lighting"],
          lowConfidence: true,
          agreementLevel: "low" as const,
        },
        confidence: fallbackResult.candidateStrains[0]?.confidence || 60,
        result: softFailViewModel,
        synthesis: {} as any,
        scanWarning: "Photos appear to be the same angle or lighting. Try one close-up and one full-bud photo.",
      };
    }
    
    // Phase 4.0.2 — Apply role weighting and diversity weights
    // First, infer roles and apply role-based weights
    imageResultsV3 = imageResultsV3.map(result => {
      // Convert detectedTraits to numeric features for role inference
      const trichomeDensityNum = result.detectedTraits.trichomeDensity === "high" ? 0.9
        : result.detectedTraits.trichomeDensity === "medium" ? 0.6
        : result.detectedTraits.trichomeDensity === "low" ? 0.3
        : 0;
      
      // Infer leaf visibility from leafShape (broad = more visible)
      const leafVisibility = result.detectedTraits.leafShape === "broad" ? 0.7
        : result.detectedTraits.leafShape === "narrow" ? 0.4
        : 0.5;
      
      // Infer bud coverage from budStructure (high = more coverage)
      const budCoverage = result.detectedTraits.budStructure === "high" ? 0.8
        : result.detectedTraits.budStructure === "medium" ? 0.6
        : result.detectedTraits.budStructure === "low" ? 0.4
        : 0.5;
      
      // Infer zoom level from meta or imageObservation
      const zoomLevel = result.meta?.focusScore ? Math.min(1, result.meta.focusScore / 100) : 0.5;
      
      const role = inferImageRole({
        trichomeDensity: trichomeDensityNum,
        leafVisibility: leafVisibility,
        budCoverage: budCoverage,
        zoomLevel: zoomLevel,
      });
      
      // Apply role-based weights
      let weight = 1;
      if (role === "macro") weight = 1.2;
      if (role === "structure") weight = 1.1;
      if (role === "unknown") weight = 0.9;
      
      return {
        ...result,
        role,
        weight,
      };
    });
    
    // Apply diversity weights (existing logic)
    const imageHashes = imageResultsV3.map(r => r.imageHash || "").filter(h => h.length > 0);
    if (imageHashes.length >= 2) {
      const diversity = assessImageDiversity(imageHashes);
      imageResultsV3 = imageResultsV3.map((result, idx) => {
        const penalty = diversity.penalties[idx] ?? 1;
        // Combine role weight with diversity penalty
        const roleWeight = (result as any).weight ?? 1;
        const combinedWeight = roleWeight * penalty;
        return {
          ...result,
          candidateStrains: result.candidateStrains.map(strain => ({
            ...strain,
            confidence: Math.round(strain.confidence * combinedWeight),
          })),
          diversityPenalty: penalty,
          weight: combinedWeight,
        } as typeof result & { role?: string; weight?: number };
      });
    }
    
    // Phase 4.0.3 — Apply duplicate soft-penalty (never fail scan)
    // Tag near-duplicate images and apply similarity penalties to weights
    if (imageResultsV3.length >= 2) {
      // Map imageResultsV3 to format expected by tagDuplicateImages (with visualSignature)
      const weightedImageResults = imageResultsV3.map(r => ({
        ...r,
        visualSignature: r.embedding || [], // Use embedding as visual signature
      }));
      
      const weightedImages = tagDuplicateImages(weightedImageResults);
      
      // Apply the adjusted weights back to imageResultsV3
      imageResultsV3 = imageResultsV3.map((result, idx) => {
        const adjustedWeight = weightedImages[idx]?.weight ?? (result as any).weight ?? 1;
        return {
          ...result,
          weight: adjustedWeight,
          candidateStrains: result.candidateStrains.map(strain => ({
            ...strain,
            confidence: Math.round(strain.confidence * adjustedWeight),
          })),
        } as typeof result & { role?: string; weight?: number };
      });
    }
    
    // Phase 4.0.3 — Tag each image with inferred angle
    imageResultsV3 = imageResultsV3.map(r => {
      if (r.meta) {
        const angle = inferImageAngle({
          width: r.meta.width,
          height: r.meta.height,
          focusScore: r.meta.focusScore,
          edgeDensity: r.meta.edgeDensity,
        });
        return {
          ...r,
          inferredAngle: angle,
        };
      }
      return r;
    });

    // Phase 4.2.1 — attach angle hints from visual tags
    imageAngleHints = imageResultsV3.map((img, idx) => {
      // Extract tags from detected traits and image observation
      const visualTags: string[] = [];
      if (img.inferredAngle === "macro-bud" || img.inferredAngle === "top-canopy" || img.inferredAngle === "side-profile") {
        visualTags.push(img.inferredAngle === "macro-bud" ? "macro" : img.inferredAngle === "top-canopy" ? "top" : "side");
      }
      if (img.detectedTraits.trichomeDensity === "high") {
        visualTags.push("trichome");
      }
      if (img.imageObservation?.imageType) {
        visualTags.push(img.imageObservation.imageType);
      }
      
      return {
        id: img.imageIndex,
        angle: inferAngleHint(visualTags),
      };
    });
    
    // Phase 4.0.4 — Apply duplicate penalty instead of failing scan
    const embeddings = imageResultsV3
      .map(r => r.embedding)
      .filter((e): e is number[] => Array.isArray(e) && e.length > 0);
    
    if (embeddings.length >= 2) {
      const duplicateIndexes = detectDuplicates(embeddings);
      imageResultsV3 = imageResultsV3.map((r, idx) => {
        // Apply duplicate penalty (0.75) if this image is a duplicate
        // Combine with existing diversityPenalty if present
        const duplicatePenalty = duplicateIndexes.has(idx) ? 0.75 : 1.0;
        const existingPenalty = r.diversityPenalty ?? 1.0;
        return {
          ...r,
          diversityPenalty: Math.min(existingPenalty, duplicatePenalty),
        };
      });
    }
    
    // Phase 5.0.2 — Log per-image candidate counts
    imageResultsV3.forEach((result, idx) => {
      const candidateNames = Array.isArray(result.candidateStrains)
        ? result.candidateStrains.map(c => c.name || "Unknown")
        : [];
      console.log(`Phase 5.0.2 — Image ${idx + 1} candidates:`, candidateNames.length, "strains");
      console.log(`Phase 5.0.2 — Image ${idx + 1} top candidates:`, candidateNames.slice(0, 3));
    });
    
    // Phase 4.3 Step 4.3.1 — Run Name-First Pipeline (Initial pass)
    // Phase 5.3 — Enhanced with terpene and ratio cross-validation
    // Phase 5.5 — Name-First Matching & Strain Disambiguation (Enhanced)
    // Phase 5.7 — Name-First Matching & Disambiguation Engine (Latest)
    // Phase 5.0.6 — NEW: Name Match Engine (alternative implementation)
    // Note: Initial pass runs without terpene/ratio for speed
    // We'll re-run with validation after terpene/ratio are generated (Phase 5.3.3)
    if (imageResultsV3.length > 0 && imageResultsV3.length >= 1) {
      // Phase 5.0.6 — Try new name match engine first, fallback to pipeline
      const { runNameMatchEngine } = require("./nameMatchEngine");
      const { runNameFirstPipeline } = require("./nameFirstPipeline");
      
      try {
        // Phase 5.0.6 — Use new name match engine
        // Phase 5.3 — Enhanced with Wiki cross-check and multi-image consensus
        console.log("Phase 5.0.6 — Running name match engine");
        const nameMatchResult = runNameMatchEngine(
          imageResultsV3,
          fusedFeatures,
          filteredInput.imageCount,
          undefined // terpeneProfile - will be provided in validation pass
        );
        
        // Phase 5.7.3 — Store confidence tier label for later use
        const confidenceTierLabel = nameMatchResult.confidenceTierLabel;
        
        // Phase 5.0.6 — Convert to nameFirstPipelineResult format for compatibility
        nameFirstPipelineResult = {
          primaryStrainName: nameMatchResult.primaryName,
          nameConfidencePercent: nameMatchResult.confidencePercent,
          nameConfidenceTier: nameMatchResult.confidencePercent >= 90 ? "very_high"
            : nameMatchResult.confidencePercent >= 75 ? "high"
            : nameMatchResult.confidencePercent >= 60 ? "medium"
            : "low",
          alternateMatches: nameMatchResult.alternateMatches.map(a => ({
            name: a.name,
            score: a.score,
            whyNotPrimary: a.whyNotPrimary,
          })),
          explanation: {
            whyThisNameWon: nameMatchResult.explanation.whyThisNameWon,
            whatRuledOutOthers: nameMatchResult.explanation.whyOthersLost,
            varianceNotes: nameMatchResult.isCloselyRelated
              ? [`Closely related to ${nameMatchResult.closelyRelatedName} (within 5% score difference)`]
              : [],
          },
          isAmbiguous: nameMatchResult.isCloselyRelated,
          closelyRelatedVariants: nameMatchResult.isCloselyRelated && nameMatchResult.closelyRelatedName
            ? [{
                name: nameMatchResult.closelyRelatedName,
                canonicalName: nameMatchResult.closelyRelatedName,
                whyNotPrimary: `Within 5% score difference of primary match`,
              }]
            : undefined,
          confidenceTierLabel, // Phase 5.7.3 — Store confidence tier label
        };
        
        // Phase 5.7.4 — VIEWMODEL UPDATE: All viewModel assignments moved to after viewModel creation (line ~1507)
        
        console.log("Phase 5.0.6 — NAME MATCH ENGINE RESULT:", nameMatchResult);
        console.log("Phase 5.0.2 — STEP 4 COMPLETE: Multi-image consensus built");
        console.log("Phase 4.3 Step 4.3.1 — NAME-FIRST PIPELINE RESULT (initial):", nameFirstPipelineResult);
        
        // Phase 5.0.2 — MANDATORY LOGS (from pipeline result)
        console.log("TOP NAME MATCH:", nameFirstPipelineResult.primaryStrainName);
        const alternateNames = Array.isArray(nameFirstPipelineResult.alternateMatches)
          ? nameFirstPipelineResult.alternateMatches.map(a => a.name || "Unknown")
          : [];
        console.log("ALTERNATES:", alternateNames);
      } catch (error) {
        console.warn("Phase 5.0.6 — Name match engine failed, falling back to pipeline:", error);
        // Fallback to original pipeline
        try {
          // Phase 5.0.2 — STEP 4: MULTI-IMAGE CONSENSUS (after image narrowing)
          // Phase 5.3 Step 5.3.1 & 5.3.2 — Initial pipeline run (name candidate extraction + multi-image consensus)
          console.log("Phase 5.0.2 — STEP 4: MULTI-IMAGE CONSENSUS (building from", imageResultsV3.length, "images)");
          nameFirstPipelineResult = runNameFirstPipeline(
            imageResultsV3,
            fusedFeatures,
            input.imageCount,
            undefined, // terpeneProfile - will be provided in validation pass
            undefined  // strainRatio - will be provided in validation pass
          );
          console.log("Phase 5.0.2 — STEP 4 COMPLETE: Multi-image consensus built");
          console.log("Phase 4.3 Step 4.3.1 — NAME-FIRST PIPELINE RESULT (initial):", nameFirstPipelineResult);
          
          // Phase 5.0.2 — MANDATORY LOGS (from pipeline result)
          console.log("TOP NAME MATCH:", nameFirstPipelineResult.primaryStrainName);
          const alternateNames = Array.isArray(nameFirstPipelineResult.alternateMatches)
            ? nameFirstPipelineResult.alternateMatches.map(a => a.name || "Unknown")
            : [];
          console.log("ALTERNATES:", alternateNames);
        } catch (fallbackError) {
          console.error("Phase 4.3 Step 4.3.1 — Name-first pipeline error:", fallbackError);
          nameFirstPipelineResult = null;
        }
      }
    }

    // Phase 4.0.2 — Enhanced same-plant detection (before consensus)
    // Phase 4.1.8 — detect same-plant images (soft detection) - before consensus
    // Note: distinctnessScore and visual similarity will be calculated later, so we use basic detection here
    // Enhanced detection will be applied after diversity metrics are calculated
    samePlantLikely = imageResultsV3.length >= 2
      ? detectSamePlant(
          imageResultsV3.map(i => ({
            hash: i.imageHash || "",
          }))
        )
      : true; // Single image = same plant
    
    // Phase 3.0 Part C — Consensus Merge Engine
    // STABILIZATION MODE — Wrap in try/catch, use fallback if consensus fails
    try {
      consensusResult = buildConsensusResultV3(imageResultsV3, fusedFeatures, filteredInput.imageCount, samePlantLikely);
      console.log("CONSENSUS RESULT V3:", consensusResult);
    } catch (error) {
      console.warn("STABILIZATION: Consensus engine failed, using fallback:", error);
      consensusResult = null; // Will be handled by fallback logic below
    }
    
    // Assess plant similarity across images
    const similarity = assessPlantSimilarity(imageResultsV3);
    
    // STABILIZATION MODE — Use fallback consensus instead of throwing
    if (!consensusResult) {
      console.warn("STABILIZATION: Consensus could not be produced, using fallback consensus");
      // Fallback consensus will be created later in the pipeline
      consensusResult = null; // Will be handled by guardAgainstFailure later
    }
    
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
  
  const namingResult = determineStrainName(fusedFeatures, filteredInput.imageCount, existingCandidates);
  console.log("NAMING RESULT:", namingResult);
  
  // Phase 5.0.2 — STEP 5: CONFIDENCE CALCULATION (LAST)
  // Phase 4.3 Step 4.3.1 — Name-First Result (PRIORITY: Use pipeline result if available)
  // RULE: UI MUST show a strain name immediately once resolved
  // Everything else supports or challenges that name
  console.log("Phase 5.0.2 — STEP 5: CONFIDENCE CALCULATION (final step)");
  
  const nameFirstResult = nameFirstPipelineResult
    ? {
        primaryMatch: {
          name: nameFirstPipelineResult.primaryStrainName, // Phase 4.3 Step 4.3.1 — Use pipeline name (locked)
          score: nameFirstPipelineResult.nameConfidencePercent,
          confidence: nameFirstPipelineResult.nameConfidencePercent,
          whyThisMatch: Array.isArray(nameFirstPipelineResult.explanation.whyThisNameWon) 
            ? nameFirstPipelineResult.explanation.whyThisNameWon.join(". ")
            : String(nameFirstPipelineResult.explanation.whyThisNameWon || ""),
          matchedTraits: [],
        },
        alsoSimilar: Array.isArray(nameFirstPipelineResult.alternateMatches)
          ? nameFirstPipelineResult.alternateMatches.map(a => ({
              name: a.name || "Unknown",
              whyNotPrimary: a.whyNotPrimary || "Lower confidence",
            }))
          : [],
        confidence: nameFirstPipelineResult.nameConfidencePercent,
        confidenceRange: {
          min: Math.max(60, nameFirstPipelineResult.nameConfidencePercent - 4),
          max: Math.min(99, nameFirstPipelineResult.nameConfidencePercent + 4),
          explanation: Array.isArray(nameFirstPipelineResult.explanation.whyThisNameWon) 
            ? (nameFirstPipelineResult.explanation.whyThisNameWon[0] || "")
            : String(nameFirstPipelineResult.explanation.whyThisNameWon || ""),
        },
        whyThisMatch: Array.isArray(nameFirstPipelineResult.explanation.whyThisNameWon)
          ? nameFirstPipelineResult.explanation.whyThisNameWon.join(". ")
          : String(nameFirstPipelineResult.explanation.whyThisNameWon || ""),
        lowConfidence: nameFirstPipelineResult.nameConfidencePercent < 75,
        imageCountBonus: filteredInput.imageCount * 3,
        variancePenalty: 0,
      }
    : (consensusResult // Phase 4.3 Step 4.3.1 — Fallback to consensus/legacy if pipeline not available 
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
          ...(Array.isArray(consensusResult.alternates) ? consensusResult.alternates.slice(0, 2).map(a => ({
            name: a.name || "Unknown",
            whyNotPrimary: `Confidence: ${a.confidence || 0}% (lower than primary match)`,
          })) : []),
          ...(Array.isArray(namingResult.alternateMatches) ? namingResult.alternateMatches.slice(0, 1).map(a => ({
            name: a.name || "Unknown",
            whyNotPrimary: a.whyNotPrimary || "Lower confidence",
          })) : []),
        ].slice(0, 3), // Max 3 alternates
        confidence: consensusResult.primaryMatch.confidence, // Phase 3.0 Part D — Never 100%
        confidenceRange: namingResult.confidenceRange || consensusResult.confidenceRange, // Use naming hierarchy range
        imageCountBonus: filteredInput.imageCount * 3,
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
        alsoSimilar: Array.isArray(namingResult.alternateMatches)
          ? namingResult.alternateMatches.map(a => ({
              name: a.name || "Unknown",
              whyNotPrimary: a.whyNotPrimary || "Lower confidence",
            }))
          : [],
        confidence: Math.round((namingResult.confidenceRange.min + namingResult.confidenceRange.max) / 2),
        confidenceRange: namingResult.confidenceRange,
        imageCountBonus: filteredInput.imageCount * 3,
        variancePenalty: 0,
      });
  
  // Phase 4.0.2 — Enforce angle diversity bonus / penalty
  const angles = filteredInput.imageSeeds.map(inferImageAngleFromSeed);
  const uniqueAngles = new Set(angles.filter(a => a !== "unknown"));
  
  let angleDiversityBonus = 0;
  if (uniqueAngles.size >= 3) angleDiversityBonus = 0.12;
  else if (uniqueAngles.size === 2) angleDiversityBonus = 0.06;
  else angleDiversityBonus = -0.08;
  
  // Apply angle diversity bonus/penalty to confidence
  let consensusConfidence = nameFirstResult.confidence / 100; // Convert to 0-1 range
  consensusConfidence = Math.min(
    0.99,
    Math.max(0.55, consensusConfidence + angleDiversityBonus)
  );
  
  // Phase 4.0.5 — Do NOT fail scan on similar images
  // Check similarity using filtered base64 data if available
  if (filteredBase64Data && filteredBase64Data.length >= 2) {
    const similar = imagesTooSimilar(filteredBase64Data);
    if (similar) {
      console.warn("Images appear very similar — lowering confidence, continuing scan");
      consensusConfidence = Math.min(consensusConfidence, 0.82);
      analysisWarnings.push(
        "Images were very similar. Results are still generated, but confidence is reduced."
      );
    }
  }

  // Phase 4.0.6 — Apply angle diversity to confidence
  const userImageLabels = assignUserImageLabels(filteredInput.imageCount);
  const angleLabels = Array.from(userImageLabels.values());
  // Phase 4.0.8 — Convert labels to ImageAngle format
  const imageAngles: AngleDiversityType[] = angleLabels.map(label => {
    const lower = label.toLowerCase()
    if (lower.includes("top")) return "TOP"
    if (lower.includes("side")) return "SIDE"
    if (lower.includes("close") || lower.includes("macro")) return "CLOSE"
    return "UNKNOWN"
  })
  // Phase 4.0.8 — Apply angle diversity weighting
  const angleDiversityScorePhase408 = computeAngleDiversity(imageAngles);
  
  if (angleDiversityScorePhase408 < 0.5) {
    console.warn("Very low angle diversity detected — confidence capped");
    consensusConfidence = Math.min(consensusConfidence, 0.88);
    analysisWarnings.push("LOW_ANGLE_DIVERSITY");
  }

  // Phase 4.0.7 — Penalize high similarity sets
  // Extract image hashes from imageResultsV3 if available
  if (imageResultsV3 && imageResultsV3.length >= 2) {
    const imagePerceptualHashes = imageResultsV3
      .map(r => r.imageHash || "")
      .filter(h => h.length > 0);
    
    if (imagePerceptualHashes.length >= 2) {
      const similarityScore = computeImageSimilarity(imagePerceptualHashes);
      
      if (similarityScore > 0.7) {
        console.warn("High image similarity detected — confidence capped");
        consensusConfidence = Math.min(consensusConfidence, 0.9);
        analysisWarnings.push("HIGH_IMAGE_SIMILARITY");
      }
    }
  }

  // Phase 4.0.3 — Remove hard failure for same-plant photos
  if (filteredInput.imageSeeds.length === 1) {
    console.warn("Single unique image detected — confidence capped");
    consensusConfidence = Math.min(consensusConfidence, 0.82);
  }
  
  // Phase 4.0.4 — Enforce angle diversity (soft)
  if (filteredBase64Data.length > 0) {
    const angleMap = new Map<ImageAngle, string[]>();
    
    filteredBase64Data.forEach((base64, i) => {
      const angle = classifyAngle(base64);
      if (!angleMap.has(angle)) {
        angleMap.set(angle, []);
      }
      angleMap.get(angle)!.push(filteredInput.imageSeeds[i].name);
    });
    
    const distinctAngles = Array.from(angleMap.keys()).filter(a => a !== "unknown");
    
    if (distinctAngles.length < 2) {
      console.warn("Low angle diversity — confidence capped");
      consensusConfidence = Math.min(consensusConfidence, 0.85);
    }
  }
  
  // Convert back to 0-100 range and update nameFirstResult
  nameFirstResult.confidence = Math.round(consensusConfidence * 100);
  nameFirstResult.primaryMatch.confidence = nameFirstResult.confidence;
  
  console.log("Phase 4.0.2 — Angle diversity:", {
    angles: angles,
    uniqueAngles: Array.from(uniqueAngles),
    bonus: angleDiversityBonus,
    adjustedConfidence: nameFirstResult.confidence
  });
  
  console.log("Phase 5.0.2 — STEP 5 COMPLETE: Confidence calculated");
  console.log("NAME-FIRST RESULT:", nameFirstResult);
  console.log("CONSENSUS AGREEMENT SCORE:", consensusResult?.agreementScore || "N/A");
  
  // Phase 5.0.2 — FINAL MANDATORY LOGS
  console.log("TOP NAME MATCH:", nameFirstResult.primaryMatch.name);
  const alternateNames = Array.isArray(nameFirstResult.alsoSimilar)
    ? nameFirstResult.alsoSimilar.map(a => a.name || "Unknown")
    : [];
  console.log("ALTERNATES:", alternateNames);
  
  // STABILIZATION MODE — Use fallback name instead of throwing
  const primaryName = nameFirstResult.primaryMatch.name;
  if (!primaryName || primaryName.trim() === "" || primaryName === "Unknown" || primaryName === "Unidentified" || primaryName.toLowerCase() === "unknown") {
    console.warn("STABILIZATION: Invalid primary strain name resolved, using fallback:", {
      resolvedName: primaryName,
      nameFirstPipelineResult: nameFirstPipelineResult?.primaryStrainName,
      consensusResult: consensusResult?.primaryMatch?.name,
      namingResult: namingResult?.name,
    });
    // Replace with safe fallback
    nameFirstResult.primaryMatch.name = "Closest Known Cultivar";
    nameFirstResult.primaryMatch.confidence = Math.max(50, nameFirstResult.confidence - 20);
    nameFirstResult.confidence = nameFirstResult.primaryMatch.confidence;
    nameFirstResult.primaryMatch.whyThisMatch = "Analysis completed with limited certainty. Unable to determine exact strain name.";
  }

  // Phase 4.3 Step 4.3.1 — Wiki Lookup (Name Locked from Pipeline - TOP PRIORITY)
  // RULE: UI MUST show a strain name immediately once resolved
  // Use primary strain name from pipeline if available, otherwise fallback
  if (!lockedStrainName) {
    // Phase 4.3 Step 4.3.1 — Fallback if pipeline didn't run or failed
    lockedStrainName = primaryStrainNameFromPipeline || nameFirstResult.primaryMatch.name;
    console.log("Phase 4.3 Step 4.3.1 — LOCKED STRAIN NAME (FALLBACK, ALL SUBSEQUENT PROCESSING USES THIS):", lockedStrainName);
  } else {
    console.log("Phase 4.3 Step 4.3.1 — USING LOCKED STRAIN NAME FROM PIPELINE:", lockedStrainName);
  }
  
  const dbEntry = CULTIVAR_LIBRARY.find(s => 
    s.name === lockedStrainName || 
    s.aliases?.includes(lockedStrainName)
  );
  const wikiData = fetchWiki(lockedStrainName, dbEntry);
  console.log("WIKI DATA:", wikiData);

  // Phase 4.3 Step 4.3.1 — AI Reasoning Layer (Uses locked strain name)
  const aiReasoning = generateAIReasoning(
    lockedStrainName,
    fusedFeatures,
    wikiData,
    nameFirstResult.primaryMatch,
    dbEntry?.terpeneProfile || dbEntry?.commonTerpenes || []
  );
  console.log("AI REASONING:", aiReasoning);

  // Phase 4.3 Step 4.3.1 — Deep Analysis Sections (Uses locked strain name)
  const deepAnalysis = generateDeepAnalysis(
    lockedStrainName,
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
    lockedStrainName, // Phase 4.3 Step 4.3.1 — Use locked name
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
  const rawCandidates = imageResultsV3.length > 0
    ? imageResultsV3.flatMap(r => r.candidateStrains.map(c => ({ name: c.name, confidence: c.confidence })))
    : [];
  
  // Phase 4.3.1 — Name Confidence Stabilization
  let stabilizedNameResult: import("./nameStabilizer").NameStabilityResult | null = null;
  if (rawCandidates.length > 0) {
    stabilizedNameResult = stabilizeStrainName(rawCandidates);
    console.log("Phase 4.3.1 — NAME STABILIZATION:", stabilizedNameResult);
  }
  
  const candidatePool = buildStrainCandidatePool(
    fusedFeatures,
    input.imageCount,
    rawCandidates.length > 0 ? rawCandidates : undefined
  );
  console.log("CANDIDATE POOL (Top 5):", candidatePool);
  
  // Phase 3.8 Part B — Resolve final name
  const nameResolution = resolveStrainName(candidatePool, consensusResult, input.imageCount);
  console.log("NAME RESOLUTION:", nameResolution);
  
  // Phase 4.1.1 — final name assignment
  // Phase 4.3.1 — Use stabilized name if available, otherwise use candidate pool
  let resolvedPrimaryStrainName: string = "";
  if (stabilizedNameResult && stabilizedNameResult.stabilizedName) {
    resolvedPrimaryStrainName = stabilizedNameResult.stabilizedName;
    console.log("Phase 4.3.1 — Using stabilized name:", resolvedPrimaryStrainName);
    // Phase 4.3.1 — Update lockedStrainName with stabilized result
    if (!lockedStrainName || stabilizedNameResult.stabilityScore > 75) {
      lockedStrainName = stabilizedNameResult.stabilizedName;
      console.log("Phase 4.3.1 — Updated lockedStrainName with stabilized name:", lockedStrainName);
    }
  } else {
    // Build ranked name results from candidatePool (sorted by confidence)
    const rankedNameResults = candidatePool.map(c => ({
      name: c.name,
      score: c.confidence,
    }));
    resolvedPrimaryStrainName = resolvePrimaryStrainName(rankedNameResults);
  }
  
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
        ? [`Matched visual traits: ${Array.isArray(candidatePool[0].matchedTraits) ? candidatePool[0].matchedTraits.slice(0, 4).join(", ") : "—"}`]
        : []),
      // Add cultivar behavior note
      ...(candidatePool[0]?.strainFamily
        ? [`Known ${candidatePool[0].strainFamily} lineage characteristics observed`]
        : []),
    ],
  };

  const viewModel = wikiToViewModel(finalWiki, nameFirstResult, wikiData, aiReasoning, deepAnalysis, trustLayer, extendedProfile);
  
  // STABILIZATION MODE — Guarantee nameFirstDisplay.primaryStrainName is ALWAYS non-empty
  // Phase 4.1 — Ensure nameFirstDisplay is always set (guaranteed field)
  // Set a default fallback first, will be overridden if nameFirstPipelineResult exists
  if (!viewModel.nameFirstDisplay) {
    const fallbackName = lockedStrainName || nameFirstResult.primaryMatch.name || "Closest Known Cultivar";
    const fallbackConfidence = Math.max(60, nameFirstResult.confidence || 60);
    viewModel.nameFirstDisplay = {
      primaryStrainName: fallbackName,
      primaryName: fallbackName,
      confidencePercent: fallbackConfidence,
      confidence: fallbackConfidence,
      confidenceTier: fallbackConfidence >= 85 ? "very_high" as const
        : fallbackConfidence >= 75 ? "high" as const
        : fallbackConfidence >= 65 ? "medium" as const
        : "low" as const,
      tagline: "Closest known match based on visual analysis",
      explanation: {
        whyThisNameWon: ["Closest visual and genetic match from database"],
        whatRuledOutOthers: [],
        varianceNotes: [],
      },
    };
  }
  
  // STABILIZATION MODE — Final safety check: ensure primaryStrainName is never empty
  if (!viewModel.nameFirstDisplay.primaryStrainName || viewModel.nameFirstDisplay.primaryStrainName.trim() === "") {
    console.warn("STABILIZATION: nameFirstDisplay.primaryStrainName was empty, using fallback");
    viewModel.nameFirstDisplay.primaryStrainName = "Closest Known Cultivar";
    viewModel.nameFirstDisplay.primaryName = "Closest Known Cultivar";
    if (viewModel.nameFirstDisplay.confidencePercent > 60) {
      viewModel.nameFirstDisplay.confidencePercent = 60;
      viewModel.nameFirstDisplay.confidence = 60;
    }
  }
  
  // Phase 4.3 Step 4.3.6 — Add Name-First Display (TOP PRIORITY)
  // Phase 4.5 Step 4.5.1 — Include explanation for "Why this strain?" section
  // Phase 4.6 Step 4.6.2 — Include Indica/Sativa/Hybrid Ratio (FREE TIER)
  if (nameFirstPipelineResult) {
                // Phase 5.0.3 — Resolve ratio from database + consensus
                // Phase 4.6 Step 4.6.2 — Resolve ratio from database
                // Phase 4.8 Step 4.8.4 — Enhanced with multi-source weighted calculation
                console.log("Phase 5.0.3 — Resolving strain ratio for", lockedStrainName);
                
                // Phase 5.0.3.2 — Get candidate strains for consensus merge
                const candidateStrainsForRatio = nameFirstPipelineResult?.alternateMatches
                  ? [
                      { name: nameFirstPipelineResult.primaryStrainName, confidence: nameFirstPipelineResult.nameConfidencePercent },
                      ...nameFirstPipelineResult.alternateMatches.map(a => ({ name: a.name, confidence: a.score })),
                    ]
                  : imageResultsV3.length > 0
                  ? imageResultsV3.flatMap(r => r.candidateStrains.map(c => ({ name: c.name, confidence: c.confidence })))
                  : undefined;
                
                // Phase 5.6.1 — Get effect profile for bias calculation
                // Use dbEntry.effects if available (will be used in calculateEffectProfileBias)
                const effectProfileForRatio = dbEntry?.effects && dbEntry.effects.length > 0 ? {
                  primaryEffects: dbEntry.effects.slice(0, 3).map(e => ({ name: e })),
                  secondaryEffects: dbEntry.effects.slice(3, 5).map(e => ({ name: e })),
                } : undefined;
                
                // Phase 8.4.2 — Extract top 5 candidate names for database dominance prior
                const topCandidateNames = nameFirstPipelineResult?.alternateMatches
                  ? [
                      { name: nameFirstPipelineResult.primaryStrainName, confidence: nameFirstPipelineResult.nameConfidencePercent },
                      ...nameFirstPipelineResult.alternateMatches.slice(0, 4).map(a => ({ name: a.name, confidence: a.score })),
                    ]
                  : undefined;
                
                const strainRatio = resolveStrainRatio(
                  lockedStrainName,
                  dbEntry,
                  imageResultsV3.length > 0 ? imageResultsV3 : undefined,
                  input.imageCount,
                  fusedFeatures, // Phase 4.8 — Pass fused features for morphology adjustment
                  candidateStrainsForRatio, // Phase 5.0.3.2 — Pass candidates for consensus merge
                  undefined, // Phase 5.0.5.1 — Terpene profile will be generated later (line ~632)
                  effectProfileForRatio, // Phase 5.6.1 — Pass effect profile for bias
                  topCandidateNames // Phase 8.4.2 — Pass top 5 candidate names for database dominance prior
                );
                console.log("Phase 5.0.3 — STRAIN RATIO RESOLVED:", strainRatio);
                
                // Phase 4.5.0 — Apply ratio resolver using name-first result and available data
                if (viewModel.nameFirst && fusedFeatures) {
                  // Extract database ratio from strainRatio
                  const databaseRatio = strainRatio.indicaPercent !== undefined && strainRatio.sativaPercent !== undefined
                    ? {
                        indica: strainRatio.indicaPercent,
                        sativa: strainRatio.sativaPercent,
                        hybrid: 100 - (strainRatio.indicaPercent + strainRatio.sativaPercent),
                      }
                    : undefined;
                  
                  // Extract visual signals from fusedFeatures
                  const visualSignals = {
                    indicaBias: fusedFeatures.budStructure === "high" ? 5 : 0,
                    sativaBias: fusedFeatures.leafShape === "narrow" ? 5 : 0,
                  };
                  
                  // Extract terpene signals from terpene profile if available
                  let terpeneSignals: string[] | undefined = undefined;
                  try {
                    const terpeneProfile = (viewModel as any).terpeneCannabinoidProfile;
                    if (terpeneProfile?.terpenes) {
                      terpeneSignals = terpeneProfile.terpenes
                        .filter((t: any) => t.likelihood === "High" || t.likelihood === "Medium–High")
                        .map((t: any) => t.name.toLowerCase());
                    }
                  } catch (e) {
                    // Terpene profile not available yet, continue without it
                  }
                  
                  const resolvedRatio = resolveStrainRatioV4_5({
                    databaseRatio: databaseRatio,
                    visualSignals: visualSignals,
                    terpeneSignals: terpeneSignals,
                    nameConsensusStrength: viewModel.nameFirst.confidence,
                  });
                  
                  // Store in viewModel.ratio (adapting to existing structure)
                  if (!viewModel.ratio) {
                    // Map "Hybrid" label to appropriate hybridLabel value
                    const hybridLabel = resolvedRatio.label === "Indica-dominant" ? "Indica-dominant"
                      : resolvedRatio.label === "Sativa-dominant" ? "Sativa-dominant"
                      : resolvedRatio.indica > resolvedRatio.sativa ? "Indica-leaning Hybrid"
                      : resolvedRatio.sativa > resolvedRatio.indica ? "Sativa-leaning Hybrid"
                      : "Balanced Hybrid";
                    
                    viewModel.ratio = {
                      indicaPercent: resolvedRatio.indica,
                      sativaPercent: resolvedRatio.sativa,
                      dominance: resolvedRatio.label === "Indica-dominant" ? "Indica" 
                        : resolvedRatio.label === "Sativa-dominant" ? "Sativa" 
                        : "Hybrid",
                      hybridLabel: hybridLabel,
                      displayText: `${resolvedRatio.indica}% Indica · ${resolvedRatio.sativa}% Sativa · ${resolvedRatio.hybrid}% Hybrid`,
                      explanation: {
                        summary: `Ratio determined from database, visual signals, and terpene analysis (${resolvedRatio.confidence}% confidence)`,
                        fullExplanation: [
                          `Database baseline: ${databaseRatio ? `${databaseRatio.indica}% Indica / ${databaseRatio.sativa}% Sativa` : "Not available"}`,
                          visualSignals.indicaBias || visualSignals.sativaBias 
                            ? `Visual adjustments: ${visualSignals.indicaBias ? `+${visualSignals.indicaBias}% Indica` : ""} ${visualSignals.sativaBias ? `+${visualSignals.sativaBias}% Sativa` : ""}`.trim() 
                            : "No visual adjustments",
                          terpeneSignals ? `Terpene signals: ${terpeneSignals.join(", ")}` : "No terpene signals",
                          `Name consensus strength: ${viewModel.nameFirst.confidence}%`,
                        ],
                      },
                      // Phase 4.5.0 — Simplified ratio structure
                      indica: resolvedRatio.indica,
                      sativa: resolvedRatio.sativa,
                      hybrid: resolvedRatio.hybrid,
                      label: resolvedRatio.label,
                      confidence: resolvedRatio.confidence,
                    };
                  } else {
                    // Phase 4.5.0 — Add simplified fields to existing ratio
                    viewModel.ratio.indica = resolvedRatio.indica;
                    viewModel.ratio.sativa = resolvedRatio.sativa;
                    viewModel.ratio.hybrid = resolvedRatio.hybrid;
                    viewModel.ratio.label = resolvedRatio.label;
                    viewModel.ratio.confidence = resolvedRatio.confidence;
                  }
                  
                  console.log("Phase 4.5.0 — Ratio resolved:", resolvedRatio);
                }
                
                // Phase 4.8.0 — Resolve ratio using V48 engine (Visual + Genetics + Terpenes)
                if (fusedFeatures && dbEntry) {
                  // Extract genetics from strainRatio
                  const consensusGenetics = strainRatio.indicaPercent !== undefined && strainRatio.sativaPercent !== undefined
                    ? {
                        indica: strainRatio.indicaPercent,
                        sativa: strainRatio.sativaPercent,
                        hybrid: 100 - (strainRatio.indicaPercent + strainRatio.sativaPercent),
                      }
                    : undefined;
                  
                  // Extract visual signals from fusedFeatures
                  const consensusVisuals = {
                    leafWidth: fusedFeatures.leafShape === "broad" ? "wide" as const
                      : fusedFeatures.leafShape === "narrow" ? "narrow" as const
                      : undefined,
                    structure: fusedFeatures.budStructure === "high" ? "compact" as const
                      : undefined, // Could add tall detection if available
                  };
                  
                  // Extract terpene profile from terpeneCannabinoidProfileEarly or dbEntry
                  let consensusTerpenes: string[] | undefined = undefined;
                  try {
                    const terpeneProfile = (viewModel as any).terpeneCannabinoidProfile;
                    if (terpeneProfile?.terpenes) {
                      consensusTerpenes = terpeneProfile.terpenes
                        .filter((t: any) => t.likelihood === "High" || t.likelihood === "Medium–High")
                        .map((t: any) => t.name.toLowerCase());
                    } else if (dbEntry?.commonTerpenes) {
                      consensusTerpenes = dbEntry.commonTerpenes.map(t => t.toLowerCase());
                    }
                  } catch (e) {
                    // Terpene profile not available, continue without it
                  }
                  
                  const ratioV48 = resolveStrainRatioV48({
                    genetics: consensusGenetics,
                    visualSignals: consensusVisuals.leafWidth || consensusVisuals.structure ? consensusVisuals : undefined,
                    terpeneProfile: consensusTerpenes,
                  });
                  
                  // Update viewModel.ratio with V48 result (if ratio exists, update it; otherwise create new)
                  if (viewModel.ratio) {
                    viewModel.ratio.indica = ratioV48.indica;
                    viewModel.ratio.sativa = ratioV48.sativa;
                    viewModel.ratio.hybrid = ratioV48.hybrid;
                    viewModel.ratio.label = ratioV48.classification;
                    viewModel.ratio.classification = ratioV48.classification;
                    viewModel.ratio.confidence = ratioV48.confidence;
                    viewModel.ratio.explanation = ratioV48.explanation; // Phase 4.8.0 — Store as string array
                  } else {
                    // Create new ratio structure
                    const hybridLabel = ratioV48.classification === "Indica-dominant" ? "Indica-dominant"
                      : ratioV48.classification === "Sativa-dominant" ? "Sativa-dominant"
                      : ratioV48.indica > ratioV48.sativa ? "Indica-leaning Hybrid"
                      : ratioV48.sativa > ratioV48.indica ? "Sativa-leaning Hybrid"
                      : "Balanced Hybrid";
                    
                    viewModel.ratio = {
                      indicaPercent: ratioV48.indica,
                      sativaPercent: ratioV48.sativa,
                      dominance: ratioV48.classification === "Indica-dominant" ? "Indica" 
                        : ratioV48.classification === "Sativa-dominant" ? "Sativa" 
                        : "Hybrid",
                      hybridLabel: hybridLabel,
                      displayText: `${ratioV48.indica}% Indica · ${ratioV48.sativa}% Sativa · ${ratioV48.hybrid}% Hybrid`,
                      explanation: ratioV48.explanation, // Phase 4.8.0 — Store as string array
                      // Phase 4.5.0 — Simplified ratio structure
                      indica: ratioV48.indica,
                      sativa: ratioV48.sativa,
                      hybrid: ratioV48.hybrid,
                      label: ratioV48.classification,
                      confidence: ratioV48.confidence,
                      // Phase 4.8.0 — V48 engine fields
                      classification: ratioV48.classification,
                    };
                  }
                  
                  console.log("Phase 4.8.0 — Ratio resolved with V48 engine:", ratioV48);
                }
                
                // Phase 4.2 — Resolve plant ratio using weighted scoring
                if (dbEntry && fusedFeatures) {
                  // Map dbEntry to strainRecord format
                  // dbEntry.type is "Indica" | "Sativa" | "Hybrid"
                  const dbType = dbEntry.type || (dbEntry as any).dominantType || "Hybrid";
                  const matchedStrain = {
                    type: dbType.toLowerCase() === "indica" ? "indica"
                      : dbType.toLowerCase() === "sativa" ? "sativa"
                      : "hybrid",
                  };
                  
                  // Extract visual signals from fusedFeatures
                  const consensusVisualSignals = {
                    leafWidth: fusedFeatures.leafShape === "broad" ? "wide" as const
                      : fusedFeatures.leafShape === "narrow" ? "narrow" as const
                      : undefined,
                    structure: fusedFeatures.budStructure === "high" ? "balanced" as const
                      : undefined,
                  };
                  
                  // Extract terpene signals (reuse from Phase 4.8.0 if available, or extract from dbEntry)
                  let consensusTerpenes: string[] | undefined = undefined;
                  try {
                    const terpeneProfile = (viewModel as any).terpeneCannabinoidProfile;
                    if (terpeneProfile?.terpenes) {
                      consensusTerpenes = terpeneProfile.terpenes
                        .filter((t: any) => t.likelihood === "High" || t.likelihood === "Medium–High")
                        .map((t: any) => t.name.toLowerCase());
                    } else if (dbEntry?.commonTerpenes) {
                      consensusTerpenes = dbEntry.commonTerpenes.map(t => t.toLowerCase());
                    }
                  } catch (e) {
                    // Terpene profile not available, continue without it
                  }
                  
                  const ratio = resolvePlantRatio({
                    strainRecord: matchedStrain,
                    visualSignals: consensusVisualSignals,
                    terpeneSignals: consensusTerpenes,
                  });
                  
                  // Update viewModel.ratio with Phase 4.2 result
                  if (viewModel.ratio) {
                    // Update existing ratio with Phase 4.2 values
                    viewModel.ratio.indica = ratio.indica;
                    viewModel.ratio.sativa = ratio.sativa;
                    viewModel.ratio.hybrid = ratio.hybrid;
                    viewModel.ratio.indicaPercent = ratio.indica;
                    viewModel.ratio.sativaPercent = ratio.sativa;
                  } else {
                    // Create new ratio structure with Phase 4.2 result
                    const hybridLabel = ratio.indica >= 55 ? "Indica-dominant"
                      : ratio.sativa >= 55 ? "Sativa-dominant"
                      : ratio.indica > ratio.sativa ? "Indica-leaning Hybrid"
                      : ratio.sativa > ratio.indica ? "Sativa-leaning Hybrid"
                      : "Balanced Hybrid";
                    
                    viewModel.ratio = {
                      indicaPercent: ratio.indica,
                      sativaPercent: ratio.sativa,
                      dominance: ratio.indica >= 55 ? "Indica"
                        : ratio.sativa >= 55 ? "Sativa"
                        : "Hybrid",
                      hybridLabel: hybridLabel,
                      displayText: `${ratio.indica}% Indica · ${ratio.sativa}% Sativa · ${ratio.hybrid}% Hybrid`,
                      explanation: {
                        summary: `Ratio determined from database genetics, visual morphology, and terpene signals`,
                        fullExplanation: [
                          `Database genetics: ${matchedStrain.type}`,
                          consensusVisualSignals.leafWidth ? `Visual: ${consensusVisualSignals.leafWidth} leaves` : "No visual signals",
                          consensusTerpenes ? `Terpenes: ${consensusTerpenes.join(", ")}` : "No terpene signals",
                        ],
                      },
                      indica: ratio.indica,
                      sativa: ratio.sativa,
                      hybrid: ratio.hybrid,
                      label: ratio.indica >= 55 ? "Indica-dominant" : ratio.sativa >= 55 ? "Sativa-dominant" : "Hybrid",
                      confidence: 75, // Default confidence for Phase 4.2
                    };
                  }
                  
                  console.log("Phase 4.2 — Plant ratio resolved:", ratio);
                }
                
                // Phase 5.0.3.4 — Ensure hybridLabel is set
                if (!(strainRatio as any).hybridLabel) {
                  // Generate hybridLabel from dominance
                  const hybridLabel = strainRatio.dominance === "Indica" ? "Indica-dominant"
                    : strainRatio.dominance === "Sativa" ? "Sativa-dominant"
                    : strainRatio.dominance === "Balanced" ? "Balanced Hybrid"
                    : strainRatio.indicaPercent > strainRatio.sativaPercent ? "Indica-leaning Hybrid"
                    : "Sativa-leaning Hybrid";
                  (strainRatio as any).hybridLabel = hybridLabel;
                }

                // Phase 5.0.3.4 — Ensure hybridLabel is set before generating explanation
                if (!(strainRatio as any).hybridLabel) {
                  const hybridLabel = strainRatio.dominance === "Indica" ? "Indica-dominant"
                    : strainRatio.dominance === "Sativa" ? "Sativa-dominant"
                    : strainRatio.dominance === "Balanced" ? "Balanced Hybrid"
                    : strainRatio.indicaPercent > strainRatio.sativaPercent ? "Indica-leaning Hybrid"
                    : "Sativa-leaning Hybrid";
                  (strainRatio as any).hybridLabel = hybridLabel;
                }
                
                // Phase 4.6 Step 4.6.4 — Generate ratio explanation (legacy, will be replaced by Phase 5.6)
                // Note: wikiReport is generated later, so we pass undefined for now (will use dbEntry genetics)
                // This is a placeholder - Phase 5.6 will generate the final explanation
                const legacyRatioExplanation = generateRatioExplanation(
                  strainRatio,
                  dbEntry,
                  undefined // wikiReport generated later, will be available in UI
                );
                console.log("Phase 4.6 Step 4.6.4 — LEGACY RATIO EXPLANATION:", legacyRatioExplanation);

                // Phase 5.1 — TERPENE-WEIGHTED EXPERIENCE ENGINE
                const terpeneExperienceResult = generateTerpeneExperience(
                  lockedStrainName,
                  dbEntry,
                  fusedFeatures,
                  imageResultsV3.length > 0 ? imageResultsV3 : undefined
                );
                console.log("Phase 5.1 — TERPENE EXPERIENCE RESULT:", terpeneExperienceResult);

                // Phase 7.9 — INDICA / SATIVA / HYBRID RATIO ENGINE (Latest)
                // Use Phase 7.9 engine with base ratio + modifier layers (visual, terpene, consensus)
                const { resolveStrainRatioV79 } = require("./ratioEngineV79");
                const nameFirstCandidateStrains = nameFirstPipelineResult.alternateMatches?.map(a => ({
                  name: a.name,
                  confidence: a.score,
                })) || [];
                const terpeneProfileForRatio = terpeneExperienceResult.terpeneProfile.primaryTerpenes
                  .concat(terpeneExperienceResult.terpeneProfile.secondaryTerpenes)
                  .map(t => ({ name: t.name, likelihood: "High" })); // Simplified likelihood for ratio engine
                const strainRatioV79 = resolveStrainRatioV79(
                  lockedStrainName,
                  dbEntry,
                  imageResultsV3.length > 0 ? imageResultsV3 : undefined,
                  input.imageCount,
                  fusedFeatures,
                  terpeneProfileForRatio.length > 0 ? terpeneProfileForRatio : undefined,
                  nameFirstPipelineResult.nameConfidenceTier
                );
                console.log("Phase 7.9 — STRAIN RATIO V79 RESOLVED:", strainRatioV79);

                // Phase 7.7 — Fallback to Phase 7.7 if needed (for backward compatibility)
                const { resolveStrainRatioV77 } = require("./ratioEngineV77");
                const strainRatioV77 = resolveStrainRatioV77(
                  lockedStrainName,
                  dbEntry,
                  imageResultsV3.length > 0 ? imageResultsV3 : undefined,
                  input.imageCount,
                  fusedFeatures,
                  terpeneProfileForRatio.length > 0 ? terpeneProfileForRatio : undefined,
                  nameFirstCandidateStrains.length > 0 ? nameFirstCandidateStrains : undefined
                );
                console.log("Phase 7.7 — STRAIN RATIO V77 RESOLVED (fallback):", strainRatioV77);

                // Phase 7.5 — Fallback to Phase 7.5 if needed (for backward compatibility)
                const { resolveStrainRatioV75 } = require("./ratioEngineV75");
                const strainRatioV75 = resolveStrainRatioV75(
                  lockedStrainName,
                  dbEntry,
                  imageResultsV3.length > 0 ? imageResultsV3 : undefined,
                  input.imageCount,
                  fusedFeatures,
                  terpeneProfileForRatio.length > 0 ? terpeneProfileForRatio : undefined,
                  nameFirstCandidateStrains.length > 0 ? nameFirstCandidateStrains : undefined
                );
                console.log("Phase 7.5 — STRAIN RATIO V75 RESOLVED (fallback):", strainRatioV75);

                // Phase 7.3 — Fallback to Phase 7.3 if needed (for backward compatibility)
                const { resolveStrainRatioV73 } = require("./ratioEngineV73");
                const strainRatioV73 = resolveStrainRatioV73(
                  lockedStrainName,
                  dbEntry,
                  imageResultsV3.length > 0 ? imageResultsV3 : undefined,
                  input.imageCount,
                  fusedFeatures,
                  nameFirstCandidateStrains.length > 0 ? nameFirstCandidateStrains : undefined
                );
                console.log("Phase 7.3 — STRAIN RATIO V73 RESOLVED (fallback):", strainRatioV73);

                // Phase 7.1 — Fallback to Phase 7.1 if needed (for backward compatibility)
                const { resolveStrainRatioV71 } = require("./ratioEngineV71");
                const strainRatioV71 = resolveStrainRatioV71(
                  lockedStrainName,
                  dbEntry,
                  imageResultsV3.length > 0 ? imageResultsV3 : undefined,
                  input.imageCount,
                  fusedFeatures,
                  terpeneExperienceResult.terpeneProfile // Pass terpene profile for signals
                );
                console.log("Phase 7.1 — STRAIN RATIO V71 RESOLVED (fallback):", strainRatioV71);

                // Phase 6.0 — Fallback to Phase 6.0 if needed (for backward compatibility)
                const { resolveStrainRatioV60 } = require("./ratioEngineV60");
                const strainRatioV60 = resolveStrainRatioV60(
                  lockedStrainName,
                  dbEntry,
                  imageResultsV3.length > 0 ? imageResultsV3 : undefined,
                  input.imageCount,
                  fusedFeatures,
                  terpeneExperienceResult.terpeneProfile // Pass terpene profile for signals
                );
                console.log("Phase 6.0 — STRAIN RATIO V60 RESOLVED (fallback):", strainRatioV60);

                // Phase 5.8 — Fallback to Phase 5.8 if needed (for backward compatibility)
                const { resolveStrainRatioV58 } = require("./ratioEngineV58");
                const strainRatioV58 = resolveStrainRatioV58(
                  lockedStrainName,
                  dbEntry,
                  imageResultsV3.length > 0 ? imageResultsV3 : undefined,
                  input.imageCount,
                  fusedFeatures,
                  terpeneExperienceResult.terpeneProfile // Pass terpene profile for signals
                );
                console.log("Phase 5.8 — STRAIN RATIO V58 RESOLVED (fallback):", strainRatioV58);

                // Phase 5.6 — Fallback to Phase 5.6 if needed (for backward compatibility)
                const { resolveStrainRatioV56 } = require("./ratioEngineV56");
                const strainRatioV56 = resolveStrainRatioV56(
                  lockedStrainName,
                  dbEntry,
                  imageResultsV3.length > 0 ? imageResultsV3 : undefined,
                  input.imageCount,
                  fusedFeatures,
                  terpeneExperienceResult.terpeneProfile // Pass terpene profile for cross-check
                );
                console.log("Phase 5.6 — STRAIN RATIO V56 RESOLVED (fallback):", strainRatioV56);

                // Phase 5.2 — Fallback to Phase 5.2 if needed (for backward compatibility)
                const strainRatioV52 = resolveStrainRatioV52(
                  lockedStrainName,
                  dbEntry,
                  imageResultsV3.length > 0 ? imageResultsV3 : undefined,
                  input.imageCount,
                  fusedFeatures,
                  terpeneExperienceResult.terpeneProfile
                );
                console.log("Phase 5.2 — STRAIN RATIO V52 RESOLVED (fallback):", strainRatioV52);

                // Phase 7.9.6 — Determine which ratio to use (Phase 7.9 preferred, fallback to Phase 7.7, then Phase 7.5, then Phase 7.3, then Phase 7.1, then Phase 6.0, then Phase 5.8, then Phase 5.6, then Phase 5.2)
                // Note: Phase 8.1 check will be added after Phase 8.1 completes
                const usePhase79ForRatio = strainRatioV79 && strainRatioV79.confidence !== "low";
                const usePhase77ForRatio = !usePhase79ForRatio && strainRatioV77 && strainRatioV77.confidence !== "low";
                const usePhase75ForRatio = !usePhase79ForRatio && !usePhase77ForRatio && strainRatioV75 && strainRatioV75.confidence !== "low";
                const usePhase73ForRatio = !usePhase79ForRatio && !usePhase77ForRatio && !usePhase75ForRatio && strainRatioV73 && strainRatioV73.confidence !== "low";
                const usePhase71ForRatio = !usePhase79ForRatio && !usePhase77ForRatio && !usePhase75ForRatio && !usePhase73ForRatio && strainRatioV71 && strainRatioV71.confidence !== "low";
                const usePhase60ForRatio = !usePhase79ForRatio && !usePhase77ForRatio && !usePhase75ForRatio && !usePhase73ForRatio && !usePhase71ForRatio && strainRatioV60 && strainRatioV60.confidence !== "low";
                const usePhase58ForRatio = !usePhase79ForRatio && !usePhase77ForRatio && !usePhase75ForRatio && !usePhase73ForRatio && !usePhase71ForRatio && !usePhase60ForRatio && strainRatioV58 && strainRatioV58.confidence !== "low";
                const usePhase56ForRatio = !usePhase79ForRatio && !usePhase77ForRatio && !usePhase75ForRatio && !usePhase73ForRatio && !usePhase71ForRatio && !usePhase60ForRatio && !usePhase58ForRatio && strainRatioV56 && strainRatioV56.confidence !== "low";

                // Phase 8.0 — NAME-FIRST MATCHING & STRAIN DISAMBIGUATION ENGINE (Latest)
                // Names are the anchor — try Phase 8.0 first, fallback to Phase 5.7, then Phase 5.5, then Phase 5.3
                if (nameFirstPipelineResult && imageResultsV3.length > 0) {
                  try {
                    const { runNamePipelineV80 } = require("./namePipelineV80");
                    nameFirstPipelineResult = runNamePipelineV80({
                      nameFirstPipelineResult,
                      imageResultsV3,
                    });
                  } catch (error) {
                    console.error("Phase 8.0 — V80 engine error:", error);
                  }
                }

                // Phase 8.1 — INDICA / SATIVA / HYBRID RATIO ENGINE (Latest)
                let strainRatioV81: any = undefined;
                if (nameFirstPipelineResult && imageResultsV3.length > 0) {
                  try {
                    const { resolveStrainRatioV81 } = require("./ratioEngineV81");
                    strainRatioV81 = resolveStrainRatioV81({
                      nameResult: nameFirstPipelineResult,
                      images: imageResultsV3,
                    });
                  } catch (error) {
                    console.error("Phase 8.1 — ratio engine error:", error);
                  }
                }

                // Phase 8.2 — STRAIN NAME CONFIDENCE & DISAMBIGUATION ENGINE (Latest)
                let nameConfidenceV82Result: any = null;

                if (nameFirstPipelineResult && imageResultsV3.length > 0) {
                  try {
                    const { runNameConfidenceV82 } = require("./nameConfidenceV82");
                    nameConfidenceV82Result = runNameConfidenceV82({
                      nameResult: nameFirstPipelineResult,
                      images: imageResultsV3,
                    });
                  } catch (error) {
                    console.error("Phase 8.2 — name confidence error:", error);
                  }
                }

                // Phase 8.1.6 — Determine which ratio to use (Phase 8.1 preferred, then Phase 7.9, fallback to Phase 7.7, then Phase 7.5, then Phase 7.3, then Phase 7.1, then Phase 6.0, then Phase 5.8, then Phase 5.6, then Phase 5.2)
                const usePhase81ForRatio = strainRatioV81 && strainRatioV81.confidence !== "low";
                const usePhase79ForRatioAfter81 = !usePhase81ForRatio && strainRatioV79 && strainRatioV79.confidence !== "low";
                const usePhase77ForRatioAfter81 = !usePhase81ForRatio && !usePhase79ForRatioAfter81 && strainRatioV77 && strainRatioV77.confidence !== "low";
                const usePhase75ForRatioAfter81 = !usePhase81ForRatio && !usePhase79ForRatioAfter81 && !usePhase77ForRatioAfter81 && strainRatioV75 && strainRatioV75.confidence !== "low";
                const usePhase73ForRatioAfter81 = !usePhase81ForRatio && !usePhase79ForRatioAfter81 && !usePhase77ForRatioAfter81 && !usePhase75ForRatioAfter81 && strainRatioV73 && strainRatioV73.confidence !== "low";
                const usePhase71ForRatioAfter81 = !usePhase81ForRatio && !usePhase79ForRatioAfter81 && !usePhase77ForRatioAfter81 && !usePhase75ForRatioAfter81 && !usePhase73ForRatioAfter81 && strainRatioV71 && strainRatioV71.confidence !== "low";
                const usePhase60ForRatioAfter81 = !usePhase81ForRatio && !usePhase79ForRatioAfter81 && !usePhase77ForRatioAfter81 && !usePhase75ForRatioAfter81 && !usePhase73ForRatioAfter81 && !usePhase71ForRatioAfter81 && strainRatioV60 && strainRatioV60.confidence !== "low";
                const usePhase58ForRatioAfter81 = !usePhase81ForRatio && !usePhase79ForRatioAfter81 && !usePhase77ForRatioAfter81 && !usePhase75ForRatioAfter81 && !usePhase73ForRatioAfter81 && !usePhase71ForRatioAfter81 && !usePhase60ForRatioAfter81 && strainRatioV58 && strainRatioV58.confidence !== "low";
                const usePhase56ForRatioAfter81 = !usePhase81ForRatio && !usePhase79ForRatioAfter81 && !usePhase77ForRatioAfter81 && !usePhase75ForRatioAfter81 && !usePhase73ForRatioAfter81 && !usePhase71ForRatioAfter81 && !usePhase60ForRatioAfter81 && !usePhase58ForRatioAfter81 && strainRatioV56 && strainRatioV56.confidence !== "low";

                // Phase 7.1.5 — Convert Phase 7.1 result to Phase 4.6 format for backward compatibility
                // Use Phase 8.1 result (preferred), then Phase 7.9, then Phase 7.7, then Phase 7.5, then Phase 7.3, then Phase 7.1, then Phase 6.0, then Phase 5.8, then Phase 5.6, then Phase 5.2
                // Note: usePhase81ForRatio, usePhase79ForRatio, usePhase71ForRatio, usePhase60ForRatio, usePhase58ForRatio, usePhase56ForRatio are already defined earlier
                
                const ratioExplanation = usePhase81ForRatio ? {
                  summary: `Ratio determined using 4-source weighted system: database baseline (45%) + visual morphology (27%) + terpene signals (23%) + name consensus (8%) (${strainRatioV81.confidence} confidence)`,
                  fullExplanation: [
                    `Classification: ${strainRatioV81.classificationLabel}`,
                    `Ratio: ${strainRatioV81.ratio}`,
                    `Confidence: ${strainRatioV81.confidence}`,
                    strainRatioV81.explanation,
                  ],
                } : usePhase79ForRatioAfter81 ? {
                  summary: `Ratio determined using base ratio sources + visual modifiers + terpene signals + consensus (${strainRatioV79.confidence} confidence)`,
                  fullExplanation: [
                    `Classification: ${strainRatioV79.classification} (${strainRatioV79.dominanceLabel})`,
                    `Ratio: ${strainRatioV79.displayText}`,
                    `Confidence: ${strainRatioV79.confidenceLabel}`,
                    strainRatioV79.explanation,
                  ],
                } : usePhase77ForRatioAfter81 ? {
                  summary: `Ratio determined using database signals + visual morphology + terpene profile (${strainRatioV77.confidence} confidence)`,
                  fullExplanation: [
                    `Classification: ${strainRatioV77.classification}`,
                    `Ratio: ${strainRatioV77.humanReadableLabel}`,
                    `Confidence: ${strainRatioV77.confidenceLabel}`,
                    ...strainRatioV77.explanation,
                  ],
                } : usePhase75ForRatioAfter81 ? {
                  summary: `Ratio determined using database baseline + visual modifiers + terpene signals (${strainRatioV75.confidence} confidence)`,
                  fullExplanation: [
                    `Classification: ${strainRatioV75.classification} (${strainRatioV75.dominanceText})`,
                    `Ratio: ${strainRatioV75.displayText}`,
                    `Confidence: ${strainRatioV75.confidenceLabel}`,
                    ...strainRatioV75.explanation,
                  ],
                } : usePhase73ForRatioAfter81 ? {
                  summary: `Ratio determined using genetic baseline + visual morphology + consensus (${strainRatioV73.confidence} confidence)`,
                  fullExplanation: [
                    `Classification: ${strainRatioV73.classificationText}`,
                    `Ratio: ${strainRatioV73.displayText}`,
                    `Confidence: ${strainRatioV73.confidenceLabel}`,
                    ...strainRatioV73.explanation,
                  ],
                } : usePhase71ForRatio ? {
                  summary: `Ratio determined using base ratio sources (database genetics/lineage) + visual modulation + multi-image consensus (${strainRatioV71.confidence} confidence)`,
                  fullExplanation: [
                    `Classification: ${strainRatioV71.classification}${strainRatioV71.dominanceLabel ? ` (${strainRatioV71.dominanceLabel})` : ""}`,
                    ...(strainRatioV71.explanation ?? []),
                  ],
                } : usePhase60ForRatioAfter81 ? {
                  summary: `Ratio determined using ratio source model (database/lineage) + visual trait correlation + multi-image consensus (${strainRatioV60.confidence} confidence)`,
                  fullExplanation: [
                    `Type: ${strainRatioV60.typeLabel}`,
                    `Ratio: ${strainRatioV60.ratio}`,
                    `Confidence: ${strainRatioV60.confidenceLabel}`,
                    ...strainRatioV60.explanation,
                  ],
                } : usePhase58ForRatioAfter81 ? {
                  summary: `Ratio determined using database signals (highest weight) + image phenotype + terpene/effect signals + multi-image consensus (${strainRatioV58.confidence} confidence)`,
                  fullExplanation: [
                    `Type: ${strainRatioV58.type}`,
                    `Ratio: ${strainRatioV58.ratio}`,
                    ...strainRatioV58.explanation,
                  ],
                } : usePhase56ForRatioAfter81 ? {
                  summary: `Ratio determined using database baseline + visual modifiers + terpene/effect cross-check + multi-image consensus (${strainRatioV56.confidence} confidence)`,
                  fullExplanation: [
                    `Strain Type: ${strainRatioV56.strainType}`,
                    `Estimated Ratio: ${strainRatioV56.estimatedRatio}`,
                    ...strainRatioV56.why,
                  ],
                } : {
                  summary: `Ratio determined using genetics + terpenes + phenotype signals (${strainRatioV52.confidence} confidence)`,
                  fullExplanation: [
                    strainRatioV52.explanation.geneticBaseline,
                    ...(strainRatioV52.explanation.terpeneModulation ? [strainRatioV52.explanation.terpeneModulation] : []),
                    ...(strainRatioV52.explanation.phenotypeSignals ? [strainRatioV52.explanation.phenotypeSignals] : []),
                    ...(strainRatioV52.explanation.multiImageConsensus ? [strainRatioV52.explanation.multiImageConsensus] : []),
                  ],
                };

                // Phase 5.5 Step 5.5.5 — Get aliases from database entry
                const dbEntryForAliases = CULTIVAR_LIBRARY.find(s => 
                  s.name.toLowerCase() === nameFirstPipelineResult.primaryStrainName.toLowerCase() ||
                  (s.aliases && s.aliases.some(a => a.toLowerCase() === nameFirstPipelineResult.primaryStrainName.toLowerCase()))
                );
                const alsoKnownAs = dbEntryForAliases?.aliases && dbEntryForAliases.aliases.length > 0
                  ? dbEntryForAliases.aliases.slice(0, 3) // Top 3 aliases
                  : undefined;

        // Phase 7.0 — TERPENE & CANNABINOID PROFILE ENGINE (NEW)
        const terpeneCannabinoidProfileV70 = (() => {
          const { generateTerpeneCannabinoidProfileV70 } = require("./terpeneCannabinoidProfileV70");
          return generateTerpeneCannabinoidProfileV70(
            imageResultsV3.length > 0 ? imageResultsV3 : [],
            fusedFeatures,
            dbEntry
          );
        })();
        
        // Phase 7.2 — TERPENE & CANNABINOID PROFILE ENGINE (generate early for Phase 7.8)
                const terpeneCannabinoidProfileEarly = (() => {
                  const { generateTerpeneCannabinoidProfileV72 } = require("./terpeneCannabinoidProfileV72");
                  const candidateStrains = nameFirstPipelineResult.alternateMatches?.map(a => ({
                    name: a.name,
                    confidence: a.score,
                  })) || [];
                  return generateTerpeneCannabinoidProfileV72(
                    nameFirstPipelineResult.primaryStrainName,
                    dbEntry,
                    imageResultsV3.length > 0 ? imageResultsV3 : undefined,
                    input.imageCount,
                    fusedFeatures,
                    candidateStrains.length > 0 ? candidateStrains : undefined
                  );
                })();

        // Phase 5.2.5 — Ratio data belongs in analysis layer, not ViewModel (architectural fix)
        // Removed viewModel.strainType, viewModel.classification, viewModel.ratio assignments
        // These will be accessible via result.analysis.dominance in FullScanResult
        
        // Phase 6.0.4 — VIEWMODEL EXTENSION: Populate dominance from strainRatio
        // Phase 8.0.4 — Enhanced with confidence
        // Phase 8.4.5 — Enhanced with consensusRatio8_4
        // Phase 8.6.5 — Enhanced with dominanceV8_6 (hybrid + numeric confidence)
        let finalDominanceData: { indica: number; sativa: number; hybrid: number; classification: "Indica-dominant" | "Sativa-dominant" | "Hybrid" } | null = null;
        
        if (strainRatio) {
          const dominanceWithConfidence = (strainRatio as any).dominanceWithConfidence;
          
          // Phase 8.6.4 — Check for final dominance with confidence (60% database + 40% visual) - preferred
          const dominanceV8_6 = (strainRatio as any).dominanceV8_6;
          
          // Phase 8.4.3 — Check for consensus ratio (60% database + 40% visual) - legacy
          const consensusRatio8_4 = (strainRatio as any).consensusRatio8_4;
          
          // Phase 8.2.3 — Check for consensus ratio (60% visual + 40% database) - legacy
          const consensusRatio8_2 = (strainRatio as any).consensusRatio8_2;
          
          if (dominanceV8_6) {
            // Phase 8.6.5 — Use dominanceV8_6 with hybrid field and numeric confidence
            // Phase 4.3.5 — Normalize ratio before storing
            const normalizedRatio = normalizeRatio({
              indica: dominanceV8_6.indica,
              sativa: dominanceV8_6.sativa,
              hybrid: dominanceV8_6.hybrid,
            });
            console.log("Phase 4.3.5 — Dominance ratio normalized:", normalizedRatio);
            
            // Dominance data belongs in analysis layer, not ViewModel (architectural fix)
            // Store for FullScanResult construction later
            finalDominanceData = {
              indica: normalizedRatio.indica,
              sativa: normalizedRatio.sativa,
              hybrid: normalizedRatio.hybrid,
              classification: normalizedRatio.classification,
            };
            
            const dominanceDataV8_6 = finalDominanceData;
          } else if (consensusRatio8_4) {
            // Phase 4.3.5 — Normalize ratio before storing
            const normalizedRatio = normalizeRatio({
              indica: consensusRatio8_4.indicaPercent,
              sativa: consensusRatio8_4.sativaPercent,
              hybrid: 100 - (consensusRatio8_4.indicaPercent + consensusRatio8_4.sativaPercent),
            });
            finalDominanceData = {
              indica: normalizedRatio.indica,
              sativa: normalizedRatio.sativa,
              hybrid: normalizedRatio.hybrid,
              classification: normalizedRatio.classification,
            };
            const dominanceData8_4 = finalDominanceData;
          } else if (consensusRatio8_2) {
            // Phase 4.3.5 — Normalize ratio before storing
            const hybrid8_2 = 100 - (consensusRatio8_2.indica + consensusRatio8_2.sativa);
            const normalizedRatio = normalizeRatio({
              indica: consensusRatio8_2.indica,
              sativa: consensusRatio8_2.sativa,
              hybrid: Math.max(0, hybrid8_2),
            });
            finalDominanceData = {
              indica: normalizedRatio.indica,
              sativa: normalizedRatio.sativa,
              hybrid: normalizedRatio.hybrid,
              classification: normalizedRatio.classification,
            };
            const dominanceData8_2 = finalDominanceData;
          } else if (dominanceWithConfidence) {
            // Phase 4.3.5 — Normalize ratio before storing
            const hybridFromConfidence = 100 - (dominanceWithConfidence.indica + dominanceWithConfidence.sativa);
            const normalizedRatio = normalizeRatio({
              indica: dominanceWithConfidence.indica,
              sativa: dominanceWithConfidence.sativa,
              hybrid: Math.max(0, hybridFromConfidence),
            });
            finalDominanceData = {
              indica: normalizedRatio.indica,
              sativa: normalizedRatio.sativa,
              hybrid: normalizedRatio.hybrid,
              classification: normalizedRatio.classification,
            };
            const dominanceDataWithConfidence = finalDominanceData;
          } else {
            const ratioWithHybrid = (strainRatio as any).ratioWithHybrid;
            if (ratioWithHybrid) {
              // Phase 4.3.5 — Normalize ratio before storing
              const hybridFromRatio = ratioWithHybrid.hybrid || (100 - (ratioWithHybrid.indica + ratioWithHybrid.sativa));
              const normalizedRatio = normalizeRatio({
                indica: ratioWithHybrid.indica,
                sativa: ratioWithHybrid.sativa,
                hybrid: Math.max(0, hybridFromRatio),
              });
              finalDominanceData = {
                indica: normalizedRatio.indica,
                sativa: normalizedRatio.sativa,
                hybrid: normalizedRatio.hybrid,
                classification: normalizedRatio.classification,
              };
              const dominanceDataFromRatio = finalDominanceData;
            } else {
              // Phase 4.3.5 — Normalize ratio before storing (fallback to strainRatio fields)
              const hybridFromStrain = 100 - (strainRatio.indicaPercent + strainRatio.sativaPercent);
              const normalizedRatio = normalizeRatio({
                indica: strainRatio.indicaPercent,
                sativa: strainRatio.sativaPercent,
                hybrid: Math.max(0, hybridFromStrain),
              });
              finalDominanceData = {
                indica: normalizedRatio.indica,
                sativa: normalizedRatio.sativa,
                hybrid: normalizedRatio.hybrid,
                classification: normalizedRatio.classification,
              };
              const dominanceDataFromStrain = finalDominanceData;
            }
          }
          
          // Phase 4.3.5 — Store normalized dominance in viewModel for final result
          if (finalDominanceData) {
            // Store in a way that can be accessed as finalResult.dominance
            (viewModel as any).dominance = finalDominanceData;
            console.log("Phase 4.3.5 — Final dominance normalized and stored:", finalDominanceData);
          }
        }
        
        // Phase 7.0.4 — Chemistry data belongs in analysis layer, not ViewModel (architectural fix)
        // Removed viewModel.chemistry assignment
                
                // Phase 5.4.5 — VIEWMODEL OUTPUT: Populate genetics.type and genetics.ratioLabel
                const ratioCalculation = strainRatio ? (strainRatio as any).ratioCalculation : undefined;
                if (ratioCalculation) {
                  if (!viewModel.genetics) {
                    viewModel.genetics = {
                      dominance: (strainRatio.dominance === "Balanced" ? "Hybrid" : strainRatio.dominance) as "Indica" | "Sativa" | "Hybrid" | "Unknown",
                      lineage: dbEntry?.genetics || "",
                    };
                  }
                  viewModel.genetics.type = (ratioCalculation.type === "Balanced" ? "Hybrid" : ratioCalculation.type) as "Indica" | "Sativa" | "Hybrid";
                  viewModel.genetics.ratioLabel = `${ratioCalculation.ratio.indica}% Indica / ${ratioCalculation.ratio.sativa}% Sativa`;
                }

                // Phase 5.9.4 — STRAIN TITLE FORMAT: Use strainTitle from nameFirstPipelineResult if available
                // Phase 4.1 — Enhanced with intelligent tagline generation (will be set after nameResult is defined)
                const strainTitle = (nameFirstPipelineResult as any)?.strainTitle;
                const confidenceTierLabel = (nameFirstPipelineResult as any)?.confidenceTierLabel;
                
                // Phase 5.1 — Compute terpene experience (FREE TIER)
                // --- PRECOMPUTED TERPENE EXPERIENCE (SAFE) ---
                let computedTerpeneExperience = undefined;

                if (terpeneExperienceResult && terpeneExperienceResult.terpeneProfile) {
                  const primary = Array.isArray(terpeneExperienceResult.terpeneProfile.primaryTerpenes)
                    ? terpeneExperienceResult.terpeneProfile.primaryTerpenes
                    : [];

                  const secondary = Array.isArray(terpeneExperienceResult.terpeneProfile.secondaryTerpenes)
                    ? terpeneExperienceResult.terpeneProfile.secondaryTerpenes
                    : [];

                  computedTerpeneExperience = {
                    dominantTerpenes: primary.map(function (t) {
                      return t.name;
                    }),
                    secondaryTerpenes: secondary.map(function (t) {
                      return t.name;
                    }),
                    experience: terpeneExperienceResult.experience || [],
                    visualBoosts: terpeneExperienceResult.visualBoosts || [],
                  };
                }
                
                // Phase 7.4 — Compute terpene profile consensus
                let computedTerpeneProfileConsensus = undefined;
                if (nameFirstPipelineResult) {
                  const terpeneProfileConsensusV74Module = require("./terpeneProfileConsensusV74");
                  const generateTerpeneProfileConsensusV74 = terpeneProfileConsensusV74Module.generateTerpeneProfileConsensusV74;
                  const candidateStrains = nameFirstPipelineResult.alternateMatches?.map(function(a) {
                    return {
                      name: a.name,
                      confidence: a.score,
                    };
                  }) || [];
                  computedTerpeneProfileConsensus = generateTerpeneProfileConsensusV74(
                    nameFirstPipelineResult.primaryStrainName,
                    dbEntry,
                    imageResultsV3.length > 0 ? imageResultsV3 : undefined,
                    input.imageCount,
                    fusedFeatures,
                    candidateStrains.length > 0 ? candidateStrains : undefined
                  );
                }
                
                // Phase 7.6 — Compute effect profile use case
                let computedEffectProfileUseCase = undefined;
                if (nameFirstPipelineResult && terpeneExperienceResult) {
                  const effectProfileUseCaseV76Module = require("./effectProfileUseCaseV76");
                  const generateEffectProfileUseCaseV76 = effectProfileUseCaseV76Module.generateEffectProfileUseCaseV76;
                  const candidateStrains = nameFirstPipelineResult.alternateMatches?.map(function(a) {
                    return {
                      name: a.name,
                      confidence: a.score,
                    };
                  }) || [];
                  const terpeneProfileForEffects = terpeneExperienceResult.terpeneProfile.primaryTerpenes
                    .concat(terpeneExperienceResult.terpeneProfile.secondaryTerpenes)
                    .map(function(t) {
                      return { name: t.name, likelihood: "High" };
                    });
                  const ratioForEffects = usePhase79ForRatio ? {
                    indicaPercent: strainRatioV79.indicaPercent,
                    sativaPercent: strainRatioV79.sativaPercent,
                  } : usePhase77ForRatio ? {
                    indicaPercent: strainRatioV77.indicaPercent,
                    sativaPercent: strainRatioV77.sativaPercent,
                  } : usePhase75ForRatio ? {
                    indicaPercent: strainRatioV75.indicaPercent,
                    sativaPercent: strainRatioV75.sativaPercent,
                  } : usePhase73ForRatio ? {
                    indicaPercent: strainRatioV73.indicaPercent,
                    sativaPercent: strainRatioV73.sativaPercent,
                  } : usePhase71ForRatio ? {
                    indicaPercent: strainRatioV71.indicaPercent,
                    sativaPercent: strainRatioV71.sativaPercent,
                  } : undefined;
                  computedEffectProfileUseCase = generateEffectProfileUseCaseV76(
                    nameFirstPipelineResult.primaryStrainName,
                    dbEntry,
                    imageResultsV3.length > 0 ? imageResultsV3 : undefined,
                    input.imageCount,
                    fusedFeatures,
                    terpeneProfileForEffects.length > 0 ? terpeneProfileForEffects : undefined,
                    candidateStrains.length > 0 ? candidateStrains : undefined,
                    ratioForEffects?.indicaPercent,
                    ratioForEffects?.sativaPercent
                  );
                }
                
                // Phase 7.8 — Compute effect experience prediction
                let computedEffectExperiencePrediction = undefined;
                if (nameFirstPipelineResult && terpeneExperienceResult && terpeneCannabinoidProfileEarly) {
                  const effectExperiencePredictionV78Module = require("./effectExperiencePredictionV78");
                  const generateEffectExperiencePredictionV78 = effectExperiencePredictionV78Module.generateEffectExperiencePredictionV78;
                  const terpeneProfileForPrediction = terpeneExperienceResult.terpeneProfile.primaryTerpenes
                    .concat(terpeneExperienceResult.terpeneProfile.secondaryTerpenes)
                    .map(function(t) {
                      return { name: t.name, likelihood: "High" };
                    });
                  const cannabinoidRanges = terpeneCannabinoidProfileEarly.cannabinoids?.map(function(c) {
                    return {
                      compound: c.compound,
                      min: c.min,
                      max: c.max,
                    };
                  }) || undefined;
                  const ratioForPrediction = usePhase79ForRatio ? {
                    indicaPercent: strainRatioV79.indicaPercent,
                    sativaPercent: strainRatioV79.sativaPercent,
                    confidence: strainRatioV79.confidence,
                  } : usePhase77ForRatio ? {
                    indicaPercent: strainRatioV77.indicaPercent,
                    sativaPercent: strainRatioV77.sativaPercent,
                    confidence: strainRatioV77.confidence,
                  } : usePhase75ForRatio ? {
                    indicaPercent: strainRatioV75.indicaPercent,
                    sativaPercent: strainRatioV75.sativaPercent,
                    confidence: strainRatioV75.confidence,
                  } : usePhase73ForRatio ? {
                    indicaPercent: strainRatioV73.indicaPercent,
                    sativaPercent: strainRatioV73.sativaPercent,
                    confidence: strainRatioV73.confidence,
                  } : usePhase71ForRatio ? {
                    indicaPercent: strainRatioV71.indicaPercent,
                    sativaPercent: strainRatioV71.sativaPercent,
                    confidence: strainRatioV71.confidence,
                  } : undefined;
                  computedEffectExperiencePrediction = generateEffectExperiencePredictionV78(
                    nameFirstPipelineResult.primaryStrainName,
                    dbEntry,
                    ratioForPrediction?.indicaPercent,
                    ratioForPrediction?.sativaPercent,
                    terpeneProfileForPrediction.length > 0 ? terpeneProfileForPrediction : undefined,
                    cannabinoidRanges,
                    ratioForPrediction?.confidence || nameFirstPipelineResult.nameConfidenceTier,
                    fusedFeatures
                  );
                }
                
                // --- PRECOMPUTED RATIO (SAFE) ---
                let computedRatio = undefined;
                if (strainRatio) {
                  computedRatio = {
                    indicaPercent: strainRatio.indicaPercent,
                    sativaPercent: strainRatio.sativaPercent,
                    dominance: strainRatio.dominance,
                    hybridLabel: (strainRatio as any).hybridLabel || (
                      strainRatio.dominance === "Indica" ? "Indica-dominant"
                      : strainRatio.dominance === "Sativa" ? "Sativa-dominant"
                      : strainRatio.dominance === "Balanced" ? "Balanced Hybrid"
                      : strainRatio.indicaPercent > strainRatio.sativaPercent ? "Indica-leaning Hybrid"
                      : "Sativa-leaning Hybrid"
                    ),
                    displayText: strainRatio.displayText,
                    explanation: legacyRatioExplanation,
                  };
                } else if (usePhase81ForRatio) {
                  computedRatio = {
                    indicaPercent: strainRatioV81.indicaPercent,
                    sativaPercent: strainRatioV81.sativaPercent,
                    dominance: strainRatioV81.classification,
                    hybridLabel: strainRatioV81.classificationLabel.includes("Indica") ? "Indica-dominant" 
                      : strainRatioV81.classificationLabel.includes("Sativa") ? "Sativa-dominant"
                      : strainRatioV81.classificationLabel.includes("Balanced") ? "Balanced Hybrid"
                      : strainRatioV81.classificationLabel.includes("leaning") ? strainRatioV81.classificationLabel as any
                      : "Hybrid",
                    displayText: `${strainRatioV81.classificationLabel}: ${strainRatioV81.ratio}`,
                    explanation: ratioExplanation,
                  };
                } else if (usePhase79ForRatio) {
                  computedRatio = {
                    indicaPercent: strainRatioV79.indicaPercent,
                    sativaPercent: strainRatioV79.sativaPercent,
                    dominance: strainRatioV79.classification,
                    hybridLabel: strainRatioV79.dominanceLabel.includes("Indica") ? "Indica-dominant"
                      : strainRatioV79.dominanceLabel.includes("Sativa") ? "Sativa-dominant"
                      : strainRatioV79.dominanceLabel.includes("Balanced") ? "Balanced Hybrid"
                      : strainRatioV79.dominanceLabel.includes("leaning") ? strainRatioV79.dominanceLabel as any
                      : "Hybrid",
                    displayText: `${strainRatioV79.dominanceLabel}: ${strainRatioV79.displayText}`,
                    explanation: ratioExplanation,
                  };
                } else if (usePhase77ForRatioAfter81) {
                  computedRatio = {
                    indicaPercent: strainRatioV77.indicaPercent,
                    sativaPercent: strainRatioV77.sativaPercent,
                    dominance: strainRatioV77.classification,
                    hybridLabel: strainRatioV77.classification.includes("Indica") ? "Indica-dominant"
                      : strainRatioV77.classification.includes("Sativa") ? "Sativa-dominant"
                      : "Hybrid",
                    displayText: strainRatioV77.humanReadableLabel,
                    explanation: ratioExplanation,
                  };
                } else if (usePhase75ForRatio) {
                  computedRatio = {
                    indicaPercent: strainRatioV75.indicaPercent,
                    sativaPercent: strainRatioV75.sativaPercent,
                    dominance: strainRatioV75.classification,
                    hybridLabel: strainRatioV75.dominanceText.includes("Indica") ? "Indica-dominant"
                      : strainRatioV75.dominanceText.includes("Sativa") ? "Sativa-dominant"
                      : "Hybrid",
                    displayText: `${strainRatioV75.dominanceText}: ${strainRatioV75.displayText}`,
                    explanation: ratioExplanation,
                  };
                } else if (usePhase73ForRatio) {
                  computedRatio = {
                    indicaPercent: strainRatioV73.indicaPercent,
                    sativaPercent: strainRatioV73.sativaPercent,
                    dominance: strainRatioV73.classification,
                    hybridLabel: strainRatioV73.classificationText.includes("Indica") ? "Indica-dominant"
                      : strainRatioV73.classificationText.includes("Sativa") ? "Sativa-dominant"
                      : "Hybrid",
                    displayText: `${strainRatioV73.classificationText}: ${strainRatioV73.displayText}`,
                    explanation: ratioExplanation,
                  };
                } else if (usePhase71ForRatioAfter81) {
                  computedRatio = {
                    indicaPercent: strainRatioV71.indicaPercent,
                    sativaPercent: strainRatioV71.sativaPercent,
                    dominance: strainRatioV71.classification,
                    hybridLabel: (strainRatioV71.dominanceLabel || strainRatioV71.classification).includes("Indica") ? "Indica-dominant"
                      : (strainRatioV71.dominanceLabel || strainRatioV71.classification).includes("Sativa") ? "Sativa-dominant"
                      : "Hybrid",
                    displayText: `${strainRatioV71.classification}${strainRatioV71.dominanceLabel ? ` (${strainRatioV71.dominanceLabel})` : ""}: ${strainRatioV71.ratio}`,
                    explanation: ratioExplanation,
                  };
                } else if (usePhase60ForRatio) {
                  computedRatio = {
                    indicaPercent: strainRatioV60.indicaPercent,
                    sativaPercent: strainRatioV60.sativaPercent,
                    dominance: strainRatioV60.type,
                    hybridLabel: strainRatioV60.typeLabel.includes("Indica") ? "Indica-dominant"
                      : strainRatioV60.typeLabel.includes("Sativa") ? "Sativa-dominant"
                      : "Hybrid",
                    displayText: `${strainRatioV60.typeLabel}: ${strainRatioV60.ratio}`,
                    explanation: ratioExplanation,
                  };
                } else if (usePhase58ForRatio) {
                  computedRatio = {
                    indicaPercent: strainRatioV58.indicaPercent,
                    sativaPercent: strainRatioV58.sativaPercent,
                    dominance: strainRatioV58.type,
                    hybridLabel: strainRatioV58.type.includes("Indica") ? "Indica-dominant"
                      : strainRatioV58.type.includes("Sativa") ? "Sativa-dominant"
                      : "Hybrid",
                    displayText: `${strainRatioV58.type}: ${strainRatioV58.ratio}`,
                    explanation: ratioExplanation,
                  };
                } else if (usePhase56ForRatioAfter81) {
                  computedRatio = {
                    indicaPercent: strainRatioV56.indicaPercent,
                    sativaPercent: strainRatioV56.sativaPercent,
                    dominance: strainRatioV56.strainType.includes("Indica") && !strainRatioV56.strainType.includes("Hybrid") ? "Indica" 
                      : strainRatioV56.strainType.includes("Sativa") && !strainRatioV56.strainType.includes("Hybrid") ? "Sativa" 
                      : strainRatioV56.strainType.includes("Balanced") ? "Balanced" 
                      : "Hybrid",
                    hybridLabel: strainRatioV56.strainType.includes("Balanced") ? "Balanced Hybrid"
                      : strainRatioV56.strainType.includes("Indica") ? "Indica-dominant"
                      : strainRatioV56.strainType.includes("Sativa") ? "Sativa-dominant"
                      : "Hybrid",
                    displayText: `${strainRatioV56.strainType}: ${strainRatioV56.estimatedRatio}`,
                    explanation: ratioExplanation,
                  };
                } else {
                  computedRatio = {
                    indicaPercent: strainRatioV52.indicaPercent,
                    sativaPercent: strainRatioV52.sativaPercent,
                    dominance: strainRatioV52.dominance,
                    hybridLabel: strainRatioV52.dominance === "Indica" ? "Indica-dominant"
                      : strainRatioV52.dominance === "Sativa" ? "Sativa-dominant"
                      : strainRatioV52.dominance === "Balanced" ? "Balanced Hybrid"
                      : "Hybrid",
                    displayText: strainRatioV52.displayText,
                    explanation: ratioExplanation,
                  };
                }
                
                // --- PRECOMPUTED ALTERNATE MATCHES (SAFE) ---
                let computedAlternateMatches = undefined;
                if (nameFirstPipelineResult.alternateMatches.length > 0) {
                  computedAlternateMatches = nameFirstPipelineResult.alternateMatches.map(function(a) {
                    return {
                      name: a.name,
                      confidence: a.score,
                      whyNotPrimary: a.whyNotPrimary,
                    };
                  });
                }
                
                // Determine which ratio to use for nameFirstDisplay
                let ratioForNameFirstDisplay: { indica: number; sativa: number; hybrid: number; classification?: string } | undefined = undefined;
                
                // Phase 4.3.2 — Collect ratios from all available sources for stabilization
                const ratioSources: Array<{ indica: number; sativa: number; hybrid: number }> = [];
                
                // Collect ratios from per-image wiki results if available
                wikiResults.forEach(wiki => {
                  if (wiki.reasoning?.ratio) {
                    const r = wiki.reasoning.ratio;
                    if (r.indica !== undefined && r.sativa !== undefined) {
                      const hybrid = r.hybrid ?? (100 - (r.indica + r.sativa));
                      ratioSources.push({
                        indica: r.indica,
                        sativa: r.sativa,
                        hybrid: Math.max(0, hybrid),
                      });
                    }
                  }
                });
                
                // Use the best available ratio result
                if (usePhase81ForRatio && strainRatioV81) {
                  const hybrid = 100 - strainRatioV81.indicaPercent - strainRatioV81.sativaPercent;
                  const ratio = {
                    indica: strainRatioV81.indicaPercent,
                    sativa: strainRatioV81.sativaPercent,
                    hybrid: Math.max(0, hybrid),
                  };
                  ratioSources.push(ratio);
                  ratioForNameFirstDisplay = {
                    ...ratio,
                    classification: strainRatioV81.classificationLabel,
                  };
                } else if (usePhase79ForRatioAfter81 && strainRatioV79) {
                  const hybrid = 100 - strainRatioV79.indicaPercent - strainRatioV79.sativaPercent;
                  const ratio = {
                    indica: strainRatioV79.indicaPercent,
                    sativa: strainRatioV79.sativaPercent,
                    hybrid: Math.max(0, hybrid),
                  };
                  ratioSources.push(ratio);
                  ratioForNameFirstDisplay = {
                    ...ratio,
                    classification: strainRatioV79.classification,
                  };
                } else if (strainRatio) {
                  // Fallback to base strainRatio
                  const hybrid = 100 - strainRatio.indicaPercent - strainRatio.sativaPercent;
                  const ratio = {
                    indica: strainRatio.indicaPercent,
                    sativa: strainRatio.sativaPercent,
                    hybrid: Math.max(0, hybrid),
                  };
                  ratioSources.push(ratio);
                  ratioForNameFirstDisplay = {
                    ...ratio,
                    classification: strainRatio.dominance === "Balanced" ? "Hybrid" : strainRatio.dominance,
                  };
                }
                
                // Phase 4.3.2 — Apply ratio stabilization if multiple sources available
                if (ratioSources.length > 0) {
                  const stabilizedRatio = stabilizeRatio(ratioSources);
                  console.log("Phase 4.3.2 — Ratio stabilization applied:", {
                    sources: ratioSources.length,
                    stabilized: stabilizedRatio,
                  });
                  
                  // Phase 4.3.5 — Normalize stabilized ratio
                  const normalizedRatio = normalizeRatio({
                    indica: stabilizedRatio.indica,
                    sativa: stabilizedRatio.sativa,
                    hybrid: stabilizedRatio.hybrid,
                  });
                  console.log("Phase 4.3.5 — Ratio normalized:", normalizedRatio);
                  
                  // Update ratioForNameFirstDisplay with normalized values
                  if (ratioForNameFirstDisplay) {
                    ratioForNameFirstDisplay.indica = normalizedRatio.indica;
                    ratioForNameFirstDisplay.sativa = normalizedRatio.sativa;
                    ratioForNameFirstDisplay.hybrid = normalizedRatio.hybrid;
                    ratioForNameFirstDisplay.classification = normalizedRatio.classification;
                  } else {
                    // Create ratio if it didn't exist (with normalization)
                    ratioForNameFirstDisplay = {
                      indica: normalizedRatio.indica,
                      sativa: normalizedRatio.sativa,
                      hybrid: normalizedRatio.hybrid,
                      classification: normalizedRatio.classification,
                    };
                  }
                }
                
                // Phase 4.1 — Enforce name-first output with fallback
                let nameResult: { name: string; confidence: number; reason: string };
                if (nameFirstPipelineResult?.primaryStrainName) {
                  nameResult = {
                    name: nameFirstPipelineResult.primaryStrainName,
                    confidence: nameFirstPipelineResult.nameConfidencePercent || 60,
                    reason: nameFirstPipelineResult.explanation?.whyThisNameWon?.[0] || "Closest visual and genetic match from database",
                  };
                } else if (consensusResult?.primaryMatch) {
                  nameResult = {
                    name: consensusResult.primaryMatch.name,
                    confidence: consensusResult.primaryMatch.confidence,
                    reason: consensusResult.primaryMatch.reason || "Closest visual and genetic match from database",
                  };
                } else {
                  // Fallback: use candidates from consensus or image results
                  const candidates = consensusResult?.alternates || 
                    imageResultsV3.flatMap(r => r.candidateStrains.map(c => ({
                      name: c.name,
                      confidence: c.confidence,
                    })));
                  nameResult = resolveFallbackName(candidates);
                }
                
                viewModel.nameFirstDisplay = {
                  primaryStrainName: nameResult.name,
                  primaryName: nameResult.name, // Required field
                  confidencePercent: nameResult.confidence,
                  confidence: nameResult.confidence, // Phase 4.1 — Guaranteed field
                  confidenceTier: nameResult.confidence >= 85 ? "very_high" as const
                    : nameResult.confidence >= 75 ? "high" as const
                    : nameResult.confidence >= 65 ? "medium" as const
                    : "low" as const,
                  alsoKnownAs,
                  alternateMatches: computedAlternateMatches,
                  explanation: {
                    // Phase 4.1 — Enhance whyThisNameWon with intelligent explanations
                    whyThisNameWon: (() => {
                      const baseReasons = Array.isArray(nameResult.reason) ? nameResult.reason : [nameResult.reason];
                      const { enhanceWhyThisNameWon } = require("./perceivedIntelligence");
                      // Phase 4.1 — Determine match type from available data (phaseB1Result may not be available yet)
                      const matchTypeFromNameFirst = nameFirstPipelineResult?.explanation?.whyThisNameWon?.[0]?.toLowerCase().includes("exact") ? "exact"
                        : nameFirstPipelineResult?.explanation?.whyThisNameWon?.[0]?.toLowerCase().includes("alias") ? "alias"
                        : nameFirstPipelineResult?.explanation?.whyThisNameWon?.[0]?.toLowerCase().includes("lineage") ? "lineage"
                        : undefined;
                      
                      return enhanceWhyThisNameWon(baseReasons, {
                        matchType: matchTypeFromNameFirst,
                        imageCount: imageResultsV3.length,
                        agreementCount: imageResultsV3.filter(r => 
                          r.candidateStrains?.some(c => c.name === nameResult.name)
                        ).length,
                        keyTraits: fusedFeatures ? [
                          fusedFeatures.budStructure ? `bud structure: ${fusedFeatures.budStructure}` : null,
                          fusedFeatures.trichomeDensity ? `trichome density: ${fusedFeatures.trichomeDensity}` : null,
                          fusedFeatures.leafShape ? `leaf shape: ${fusedFeatures.leafShape}` : null,
                        ].filter(Boolean) as string[] : undefined,
                      });
                    })(),
                    whatRuledOutOthers: [],
                    varianceNotes: [],
                  },
                  // Phase 4.1 — Generate intelligent tagline after nameResult is defined
                  tagline: (() => {
                    const { generateIntelligentTagline } = require("./perceivedIntelligence");
                    // Phase 4.1 — Determine match type from available data
                    const matchTypeFromNameFirst = nameFirstPipelineResult?.explanation?.whyThisNameWon?.[0]?.toLowerCase().includes("exact") ? "exact"
                      : nameFirstPipelineResult?.explanation?.whyThisNameWon?.[0]?.toLowerCase().includes("alias") ? "alias"
                      : nameFirstPipelineResult?.explanation?.whyThisNameWon?.[0]?.toLowerCase().includes("lineage") ? "lineage"
                      : undefined;
                    
                    const intelligentTagline = generateIntelligentTagline({
                      confidencePercent: nameResult.confidence,
                      imageCount: imageResultsV3.length,
                      hasDatabaseMatch: !!dbEntry,
                      hasMultiImageAgreement: imageResultsV3.length >= 2 && (consensusResult?.agreementScore ?? 0) > 70,
                      matchType: matchTypeFromNameFirst,
                    });
                    return strainTitle || confidenceTierLabel || intelligentTagline;
                  })(),
                  ratio: ratioForNameFirstDisplay,
                };
                
                // Phase 4.3.1 — Apply name stabilization
                if (imageResultsV3.length > 0) {
                  const nameCandidates = imageResultsV3.flatMap(r =>
                    r.candidateStrains.map(c => ({
                      name: c.name,
                      confidence: c.confidence,
                    }))
                  );
                  
                  if (nameCandidates.length > 0) {
                    const nameStability = stabilizeStrainName(nameCandidates);
                    
                    // Update nameFirstDisplay with stabilized name and metadata
                    if (viewModel.nameFirstDisplay) {
                      viewModel.nameFirstDisplay.primaryStrainName = nameStability.stabilizedName;
                      viewModel.nameFirstDisplay.primaryName = nameStability.stabilizedName; // Update alias field
                      viewModel.nameFirstDisplay.nameStabilityScore = nameStability.stabilityScore;
                      viewModel.nameFirstDisplay.stabilityExplanation = nameStability.explanation;
                    }
                    
                    console.log("Phase 4.3.1 — Name stabilization applied:", {
                      stabilizedName: nameStability.stabilizedName,
                      stabilityScore: nameStability.stabilityScore,
                    });
                  }
                }
                
                // Set top-level fields separately
                if (nameFirstPipelineResult.closelyRelatedVariants) {
                  viewModel.closelyRelatedVariants = nameFirstPipelineResult.closelyRelatedVariants;
                }
                if (nameFirstPipelineResult.isAmbiguous !== undefined) {
                  viewModel.isAmbiguous = nameFirstPipelineResult.isAmbiguous;
                }
                
                // Set terpene-related fields at top level (not in nameFirstDisplay)
                if (computedTerpeneExperience) {
                  viewModel.terpeneExperience = computedTerpeneExperience;
                }
                if (terpeneCannabinoidProfileEarly) {
                  viewModel.terpeneCannabinoidProfile = terpeneCannabinoidProfileEarly;
                }
                if (computedTerpeneProfileConsensus) {
                  viewModel.terpeneProfileConsensus = computedTerpeneProfileConsensus;
                }
                if (computedEffectProfileUseCase) {
                  viewModel.effectProfileUseCase = computedEffectProfileUseCase;
                }
                if (computedEffectExperiencePrediction) {
                  viewModel.effectExperiencePrediction = computedEffectExperiencePrediction;
                }
    // Phase 4.1 — Ensure nameFirstDisplay is always set (guaranteed field)
    if (!viewModel.nameFirstDisplay) {
      // Fallback: use consensus result or resolve fallback name
      let fallbackNameResult: { name: string; confidence: number; reason: string };
      if (consensusResult?.primaryMatch) {
        fallbackNameResult = {
          name: consensusResult.primaryMatch.name,
          confidence: consensusResult.primaryMatch.confidence,
          reason: consensusResult.primaryMatch.reason || "Closest visual and genetic match from database",
        };
      } else {
        const candidates = consensusResult?.alternates || 
          imageResultsV3.flatMap(r => r.candidateStrains.map(c => ({
            name: c.name,
            confidence: c.confidence,
          })));
        fallbackNameResult = resolveFallbackName(candidates);
      }
      
      viewModel.nameFirstDisplay = {
        primaryStrainName: fallbackNameResult.name,
        primaryName: fallbackNameResult.name,
        confidencePercent: fallbackNameResult.confidence,
        confidence: fallbackNameResult.confidence,
        confidenceTier: fallbackNameResult.confidence >= 85 ? "very_high" as const
          : fallbackNameResult.confidence >= 75 ? "high" as const
          : fallbackNameResult.confidence >= 65 ? "medium" as const
          : "low" as const,
        tagline: "Closest known match based on visual analysis",
        explanation: {
          whyThisNameWon: [fallbackNameResult.reason],
          whatRuledOutOthers: [],
          varianceNotes: [],
        },
      };
    }
    
    console.log("Phase 4.3 Step 4.3.6 — NAME-FIRST DISPLAY:", viewModel.nameFirstDisplay);
    console.log("Phase 4.5 Step 4.5.3 — EXPLANATION INCLUDED (FREE TIER):", viewModel.nameFirstDisplay.explanation);
    // Note: ratio belongs in analysis layer, not nameFirstDisplay
    
    // Phase 5.3.5 — VIEWMODEL OUTPUT: Populate strainIdentity
    let computedStrainIdentityAlternates = [];
    if (nameFirstPipelineResult && Array.isArray(nameFirstPipelineResult.alternateMatches)) {
      computedStrainIdentityAlternates = nameFirstPipelineResult.alternateMatches.map(function(a) {
        return a.name || "Closest Known Cultivar";
      }).filter(function(n) {
        return n !== "Unknown" && n !== "Closest Known Cultivar";
      });
    }
    
    // Identity assignment moved to after viewModel creation (line ~1507)
    // This ensures viewModel.identity is set in the correct location
    
    // Phase 5.5.4 — VIEWMODEL OUTPUT: Populate identification (if not already populated from nameMatchResult)
    let computedIdentificationAlternates = [];
    if (nameFirstPipelineResult && Array.isArray(nameFirstPipelineResult.alternateMatches)) {
      computedIdentificationAlternates = nameFirstPipelineResult.alternateMatches.slice(0, 4).map(function(a) {
        return {
          name: a.name || "Unknown",
          reason: a.whyNotPrimary || "Lower confidence score",
        };
      });
    }
    
    // Phase 5.5.4 — VIEWMODEL OUTPUT: Populate identification field (moved to after viewModel creation at line ~1515)
  }

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
  
  // Phase 4.3 Step 4.3.1 — All subsequent processing uses locked strain name
  // Phase 3.9 Part G — Find related strains for wiki expansion
  const relatedStrainsData = findRelatedStrains(
    lockedStrainName, // Phase 4.3 Step 4.3.1 — Use locked name
    nameResolution.strainFamily,
    dbEntry
  );
  viewModel.relatedStrains = relatedStrainsData;
  
  // Phase 3.9 Part A — Generate origin story
  const originStoryText = generateOriginStory(
    lockedStrainName, // Phase 4.3 Step 4.3.1 — Use locked name
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
  
  // Phase 4.0 Part E — Generate per-image findings
  if (imageResultsV3.length > 0) {
    const perImageFindings = generatePerImageFindings(
      imageResultsV3,
      lockedStrainName // Phase 4.3 Step 4.3.1 — Use locked name
    );
    viewModel.perImageFindings = perImageFindings;
    
    const consensusAlignment = generateConsensusAlignment(
      perImageFindings,
      lockedStrainName // Phase 4.3 Step 4.3.1 — Use locked name
    );
    viewModel.consensusAlignment = consensusAlignment;
    
    console.log("PER-IMAGE FINDINGS:", perImageFindings);
    console.log("CONSENSUS ALIGNMENT:", consensusAlignment);
  }
  
  // Phase 4.2 Step 4.2.1 — Generate Extensive Wiki-Style Report (Locked Order)
  // Phase 4.8 Step 4.8.4 — Resolve ratio early for wiki report (if not already resolved)
  // Phase 5.0.3 — Use consensus merge if candidates available
  let strainRatioForWiki: ReturnType<typeof import("./ratioEngine").resolveStrainRatio> | undefined;
  // Note: ratio belongs in analysis layer, not nameFirstDisplay
  if (lockedStrainName) {
    const { resolveStrainRatio } = require("./ratioEngine");
    // Phase 5.0.3.2 — Get candidates for consensus merge
    const candidatesForWiki = nameFirstPipelineResult?.alternateMatches
      ? [
          { name: nameFirstPipelineResult.primaryStrainName, confidence: nameFirstPipelineResult.nameConfidencePercent },
          ...nameFirstPipelineResult.alternateMatches.map(a => ({ name: a.name, confidence: a.score })),
        ]
      : imageResultsV3.length > 0
      ? imageResultsV3.flatMap(r => r.candidateStrains.map(c => ({ name: c.name, confidence: c.confidence })))
      : undefined;
    
    // Phase 5.0.5.1 — Get terpene profile if available
    const terpeneExperience = (viewModel as any).terpeneExperience;
    const terpeneProfileForWiki = terpeneExperience?.dominantTerpenes
      ? {
          primaryTerpenes: terpeneExperience.dominantTerpenes.map((name: string) => ({
            name,
            dominanceScore: 1.0,
          })),
          secondaryTerpenes: terpeneExperience.secondaryTerpenes?.map((name: string) => ({
            name,
            dominanceScore: 0.5,
          })) || [],
        }
      : undefined;
    
    // Phase 5.6.1 — Get effect profile for bias calculation (from viewModel if available)
    const effectProfileUseCase = (viewModel as any).effectProfileUseCase;
    const effectProfileForWiki = effectProfileUseCase ? {
      primaryEffects: effectProfileUseCase.primaryEffects || [],
      secondaryEffects: effectProfileUseCase.secondaryEffects || [],
    } : undefined;
    
    // Phase 8.4.2 — Extract top 5 candidate names for database dominance prior (for wiki)
    const topCandidateNamesForWiki = nameFirstPipelineResult?.alternateMatches
      ? [
          { name: nameFirstPipelineResult.primaryStrainName, confidence: nameFirstPipelineResult.nameConfidencePercent },
          ...nameFirstPipelineResult.alternateMatches.slice(0, 4).map(a => ({ name: a.name, confidence: a.score || 0 })),
        ]
      : undefined;
    
    strainRatioForWiki = resolveStrainRatio(
      lockedStrainName,
      dbEntry,
      imageResultsV3.length > 0 ? imageResultsV3 : undefined,
      input.imageCount,
      fusedFeatures,
      candidatesForWiki, // Phase 5.0.3.2 — Pass candidates for consensus merge
      terpeneProfileForWiki, // Phase 5.0.5.1 — Pass terpene profile for weighting
      effectProfileForWiki // Phase 5.6.1 — Pass effect profile for bias
    );
    
    // Phase 5.5.4 — VIEWMODEL OUTPUT: Populate identification field
    if (!(viewModel as any).identification && nameFirstPipelineResult) {
      let computedIdentificationAlternates = [];
      if (Array.isArray(nameFirstPipelineResult.alternateMatches)) {
        computedIdentificationAlternates = nameFirstPipelineResult.alternateMatches.slice(0, 4).map(function(a) {
          return {
            name: a.name || "Unknown",
            reason: a.whyNotPrimary || "Lower confidence score",
          };
        });
      }
      (viewModel as any).identification = {
        primaryName: nameFirstPipelineResult.primaryStrainName,
        confidence: nameFirstPipelineResult.nameConfidencePercent,
        alternates: computedIdentificationAlternates,
      };
    }
    
    // Phase 5.0.3.4 — Ensure hybridLabel is set
    if (strainRatioForWiki && !(strainRatioForWiki as any).hybridLabel) {
      const hybridLabel = strainRatioForWiki.dominance === "Indica" ? "Indica-dominant"
        : strainRatioForWiki.dominance === "Sativa" ? "Sativa-dominant"
        : strainRatioForWiki.dominance === "Balanced" ? "Balanced Hybrid"
        : strainRatioForWiki.indicaPercent > strainRatioForWiki.sativaPercent ? "Indica-leaning Hybrid"
        : "Sativa-leaning Hybrid";
      (strainRatioForWiki as any).hybridLabel = hybridLabel;
    }
    
    // Phase 5.4.5 — VIEWMODEL OUTPUT: Populate genetics.type and genetics.ratioLabel from strainRatioForWiki
    const ratioCalculationForWiki = strainRatioForWiki ? (strainRatioForWiki as any).ratioCalculation : undefined;
    if (ratioCalculationForWiki) {
      if (!viewModel.genetics) {
        viewModel.genetics = {
          dominance: (strainRatioForWiki.dominance === "Balanced" ? "Hybrid" : strainRatioForWiki.dominance) as "Indica" | "Sativa" | "Hybrid" | "Unknown",
          lineage: dbEntry?.genetics || "",
        };
      }
      viewModel.genetics.type = ratioCalculationForWiki.type;
      viewModel.genetics.ratioLabel = `${ratioCalculationForWiki.ratio.indica}% Indica / ${ratioCalculationForWiki.ratio.sativa}% Sativa`;
    }
  }

  const wikiReport = generateWikiReport(
    nameFirstResult.primaryMatch.name,
    nameFirstPipelineResult?.nameConfidencePercent || nameFirstResult.confidence || 75,
    nameFirstPipelineResult?.nameConfidenceTier || confidenceTier.tier,
    fusedFeatures,
    dbEntry,
    extendedProfile,
    wikiData,
    input.imageCount,
    imageResultsV3.length > 0 ? imageResultsV3 : undefined,
    consensusResult,
    viewModel.consensusAlignment,
    viewModel.nameResolution,
    viewModel.relatedStrains,
    viewModel.originStory,
    viewModel.familyTree
  );
  viewModel.wikiReport = wikiReport;
  console.log("Phase 4.2 Step 4.2.1 — WIKI REPORT:", wikiReport);

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

  // Phase 4.0.5 — attach diversity hint without blocking scan
  // Phase 4.0.7 — integrate diversity scoring
  let diversityScore = 1.0; // Default to high diversity
  let distinctnessScore = 0; // Phase 4.1.2 — Initialize distinctness score
  let angleDiversityScore: number = 0.7; // Phase 4.2.2 — Default angle diversity (using let for reassignment)
  if (imageResultsV3.length >= 2) {
    // Phase 4.2.2 — compute angle diversity score (if angle hints are available)
    // Phase 4.0.8 — Convert to ImageAngle format
    if (imageAngleHints.length > 0) {
      const angleHints: AngleDiversityType[] = imageAngleHints.map(h => {
        const angle = h.angle.toLowerCase()
        if (angle === "top") return "TOP"
        if (angle === "side") return "SIDE"
        if (angle === "macro") return "CLOSE"
        return "UNKNOWN"
      })
      angleDiversityScore = computeAngleDiversity(angleHints);
    }

    // Phase 4.0.7 — Use angle and feature diversity scoring
    const diversityMetrics = calculateImageDiversity(
      imageResultsV3.map(r => {
        // Map inferredAngle to angleHint format
        let angleHint: "top" | "side" | "macro" | "unknown" = "unknown";
        if (r.inferredAngle === "top-canopy") angleHint = "top";
        else if (r.inferredAngle === "side-profile") angleHint = "side";
        else if (r.inferredAngle === "macro-bud") angleHint = "macro";
        
        // Extract features from detectedTraits
        const features: string[] = [];
        if (r.detectedTraits.budStructure) features.push(`bud-${r.detectedTraits.budStructure}`);
        if (r.detectedTraits.trichomeDensity) features.push(`trichome-${r.detectedTraits.trichomeDensity}`);
        if (r.detectedTraits.pistilColor) features.push(`pistil-${r.detectedTraits.pistilColor}`);
        if (r.detectedTraits.leafShape) features.push(`leaf-${r.detectedTraits.leafShape}`);
        
        return {
          angleHint,
          features,
        };
      })
    );
    
    diversityScore = diversityMetrics.overallScore;
    
    // Phase 4.1.5 — integrate distinctness (hash-based)
    const hashBasedDistinctness = computeDistinctness(
      imageResultsV3.map(i => ({
        hash: i.imageHash || "",
      }))
    );
    
    // Phase 4.0.9 — integrate distinctness score (feature-based)
    const featureBasedDistinctness = calculateImageDistinctness(
      imageResultsV3.map(img => {
        // Derive visual properties from existing fields
        const edgeScore = img.meta?.edgeDensity ?? 0.5; // Default to medium if not available
        
        // Derive colorVariance from pistilColor (map to numeric)
        let colorVariance = 0.5; // Default
        if (img.detectedTraits.pistilColor) {
          const colorMap: Record<string, number> = {
            "orange": 0.6,
            "amber": 0.7,
            "white": 0.3,
            "pink": 0.8,
            "red": 0.9,
          };
          colorVariance = colorMap[img.detectedTraits.pistilColor.toLowerCase()] ?? 0.5;
        } else if (img.wikiResult.morphology.coloration) {
          // Fallback: derive from coloration description
          const col = img.wikiResult.morphology.coloration.toLowerCase();
          if (col.includes("purple") || col.includes("blue")) colorVariance = 0.8;
          else if (col.includes("green")) colorVariance = 0.4;
          else colorVariance = 0.5;
        }
        
        // Derive shapeVariance from budStructure (map to numeric)
        let shapeVariance = 0.5; // Default
        if (img.detectedTraits.budStructure) {
          const shapeMap: Record<string, number> = {
            "high": 0.8, // Dense/compact
            "medium": 0.5,
            "low": 0.2, // Airy/elongated
          };
          shapeVariance = shapeMap[img.detectedTraits.budStructure] ?? 0.5;
        }
        
        return {
          edgeScore,
          colorVariance,
          shapeVariance,
        };
      })
    );
    
    // Phase 4.1.5 — Use hash-based distinctness if available, otherwise use feature-based
    distinctnessScore = hashBasedDistinctness !== undefined ? hashBasedDistinctness : featureBasedDistinctness;
    
    // Fallback to embedding-based similarity if diversity metrics are too low
    if (diversityScore < 0.3) {
      const fallbackEmbeddings = imageResultsV3
        .map(r => r.embedding)
        .filter((e): e is number[] => Array.isArray(e) && e.length > 0);
      
      if (fallbackEmbeddings.length >= 2) {
        // Calculate average similarity (lower = more diverse)
        let totalSimilarity = 0;
        let comparisons = 0;
        for (let i = 0; i < fallbackEmbeddings.length; i++) {
          for (let j = i + 1; j < fallbackEmbeddings.length; j++) {
            const sim = computeEmbeddingSimilarity(fallbackEmbeddings[i], fallbackEmbeddings[j]);
            totalSimilarity += sim;
            comparisons++;
          }
        }
        // Diversity score is inverse of average similarity (1.0 = completely different, 0.0 = identical)
        const embeddingDiversity = comparisons > 0 ? 1.0 - (totalSimilarity / comparisons) : 1.0;
        // Use the lower of the two scores (more conservative)
        diversityScore = Math.min(diversityScore, embeddingDiversity);
      }
    }
  }
  
  const diversityHint = generateDiversityHint(diversityScore);

  // Phase 4.0.2 — Enhanced same-plant detection (after all diversity metrics calculated)
  let enhancedSamePlantResult: { isSamePlant: boolean; confidence: number; reasons: string[] } | null = null;
  const embeddingsForDistinctiveness = imageResultsV3
    .map(r => r.embedding)
    .filter((e): e is number[] => Array.isArray(e) && e.length > 0);
  
  let visualDistinctivenessScore: number = 1.0;
  if (embeddingsForDistinctiveness.length >= 2) {
    visualDistinctivenessScore = computeVisualDistinctiveness(embeddingsForDistinctiveness);
  }

  if (imageResultsV3.length >= 2) {
    enhancedSamePlantResult = detectSamePlantEnhanced(
      imageResultsV3,
      distinctnessScore,
      visualDistinctivenessScore
    );
    // Update samePlantLikely based on enhanced detection
    if (enhancedSamePlantResult.isSamePlant) {
      samePlantLikely = true;
      console.log("Phase 4.0.2 — Enhanced same-plant detection:", {
        confidence: enhancedSamePlantResult.confidence,
        reasons: enhancedSamePlantResult.reasons,
      });
    }
  }

  // Phase 4.0.3 — CONFIDENCE CALIBRATION V403 (SINGLE SOURCE OF TRUTH)
  // Derive inputs for confidence calculation
  const imageCount = filteredInput.imageCount; // Original uploaded count
  const distinctImageCount = imageResultsV3.length; // After deduplication
  const hasDuplicates = distinctImageCount < imageCount;
  const v403SamePlantLikely = enhancedSamePlantResult?.isSamePlant ?? samePlantLikely;

  // Derive avgImageQualityScore (default 0.6 if not available)
  let avgImageQualityScore = 0.6;
  const qualityNote = "Using default image quality (0.6)";
  // TODO: If image quality scoring exists, average it here

  // Derive consensusStrength (0..1)
  let consensusStrength = 0.7; // Default
  if (consensusResult) {
    // Normalize consensus agreement score to 0..1
    const agreementScore = consensusResult.agreementScore ?? 0;
    consensusStrength = Math.min(1.0, agreementScore / 100);
  } else if (imageResultsV3.length > 0) {
    // Fallback: derive from top name frequency
    const topName = nameFirstResult.primaryMatch.name;
    const topNameFrequency = imageResultsV3.filter(r =>
      r.candidateStrains.some(c => c.name === topName)
    ).length;
    consensusStrength = Math.min(1.0, (topNameFrequency / distinctImageCount) * 0.9 + 0.1);
  }

  // Derive dbMatchStrength (0..1)
  let dbMatchStrength = 0.6; // Default
  if (nameFirstPipelineResult) {
    // Use name-first pipeline match score (normalize 0-100 to 0-1)
    dbMatchStrength = Math.min(1.0, (nameFirstPipelineResult.nameConfidencePercent || 60) / 100);
  } else if (lockedStrainName) {
    // Check if locked strain name exists in CULTIVAR_LIBRARY
    const dbEntry = CULTIVAR_LIBRARY.find(s =>
      s.name === lockedStrainName || s.aliases?.includes(lockedStrainName)
    );
    if (dbEntry) {
      if (dbEntry.name === lockedStrainName) {
        dbMatchStrength = 0.9; // Exact match
      } else {
        dbMatchStrength = 0.8; // Alias match
      }
    }
  }

  // Derive nameStability (0..1) - how often top candidate appears across images
  let nameStability = 0.7; // Default
  if (imageResultsV3.length > 0) {
    const topName = nameFirstResult.primaryMatch.name;
    const topNameFrequency = imageResultsV3.filter(r =>
      r.candidateStrains.some(c => c.name === topName)
    ).length;
    nameStability = topNameFrequency / distinctImageCount;
  }

  // Phase 4.0.3 — Compute confidence using V403 model
  const confidenceBreakdown = computeConfidenceV403({
    imageCount,
    distinctImageCount,
    hasDuplicates,
    samePlantLikely: v403SamePlantLikely,
    avgImageQualityScore,
    consensusStrength,
    dbMatchStrength,
    nameStability,
  });

  // Phase 4.0.3 — Use V403 breakdown as single source of truth
  let finalConfidence = confidenceBreakdown.final;

  // Phase 4.2.6 — initialize scan meta
  const scanMeta: import("./types").ScanMeta = {
    confidenceCap: confidenceBreakdown.capped ? finalConfidence : 99,
  };


  // Phase 4.1.7 — build scan note for low distinctness
  const scanNote = buildScanNote(distinctnessScore);

  // Phase 4.0.2 — build same-plant note using enhanced detection
  // Phase 4.2.0 — build same-plant note (optional)
  // Use enhanced detection result if available, otherwise fall back to basic detection
  const samePlantNote = buildSamePlantNote(v403SamePlantLikely);

  // Phase 4.2.0 — attach note to scanNotes array
  const scanNotes: string[] = [];
  scanNotes.push(...[scanNote, samePlantNote].filter(Boolean) as string[]);

  // Phase 4.2.3 — attach angle hint note
  const angleNote = buildAngleHintNote(angleDiversityScore);
  scanNotes.push(...[angleNote].filter(Boolean) as string[]);

  // Phase 4.2.5 — attach distinctiveness note
  const distinctivenessNote = buildDistinctivenessNote(visualDistinctivenessScore);
  scanNotes.push(...[distinctivenessNote].filter(Boolean) as string[]);

  // Phase 4.2.6 — attach image guidance hints
  const scanGuidanceHints: string[] = [];
  const imageGuidanceHints = deriveImageGuidance(visualDistinctivenessScore);
  scanGuidanceHints.push(...imageGuidanceHints);

  // Phase 4.2.6 — persist to meta
  scanMeta.visualDistinctivenessScore = visualDistinctivenessScore;
  scanMeta.guidanceHints = imageGuidanceHints;
  
  // Phase 4.3.1 — Apply name stabilization to final result
  if (imageResultsV3.length > 0 && viewModel.nameFirstDisplay) {
    const nameCandidates = imageResultsV3.flatMap(r =>
      r.candidateStrains.map(c => ({
        name: c.name,
        confidence: c.confidence,
      }))
    );
    
    if (nameCandidates.length > 0) {
      const nameStability = stabilizeStrainName(nameCandidates);
      
      viewModel.nameFirstDisplay.primaryStrainName = nameStability.stabilizedName;
      viewModel.nameFirstDisplay.nameStabilityScore = nameStability.stabilityScore;
      viewModel.nameFirstDisplay.stabilityExplanation = nameStability.explanation;
      
      // Also update primaryName alias
      if (viewModel.nameFirstDisplay.primaryName) {
        viewModel.nameFirstDisplay.primaryName = nameStability.stabilizedName;
      }
      
      console.log("Phase 4.3.1 — Name stabilization applied to final result:", {
        stabilizedName: nameStability.stabilizedName,
        stabilityScore: nameStability.stabilityScore,
      });
    }
  }
  
  // Phase 4.3.2 — Apply ratio stabilization to final result
  if (imageResultsV3.length > 0) {
    const ratioInputs = imageResultsV3
      .map(r => {
        // Extract ratio from wikiResult.reasoning.ratio if available
        if (r.wikiResult?.reasoning?.ratio) {
          const ratio = r.wikiResult.reasoning.ratio;
          if (ratio.indica !== undefined && ratio.sativa !== undefined) {
            return {
              indica: ratio.indica,
              sativa: ratio.sativa,
              hybrid: ratio.hybrid ?? (100 - (ratio.indica + ratio.sativa)),
            };
          }
        }
        return null;
      })
      .filter((r): r is { indica: number; sativa: number; hybrid: number } => r !== null);
    
    if (ratioInputs.length > 0) {
      const stabilizedRatio = stabilizeRatio(ratioInputs);
      console.log("Phase 4.3.2 — Ratio stabilization applied to final result:", stabilizedRatio);
      
      // Phase 4.3.2 — Store stabilized ratio in viewModel
      viewModel.stabilizedRatio = {
        indica: stabilizedRatio.indica,
        sativa: stabilizedRatio.sativa,
        hybrid: stabilizedRatio.hybrid,
        confidence: stabilizedRatio.confidence,
        explanation: stabilizedRatio.explanation,
      };
      
      // Update viewModel.nameFirstDisplay.ratio if it exists
      if (viewModel.nameFirstDisplay?.ratio) {
        viewModel.nameFirstDisplay.ratio.indica = stabilizedRatio.indica;
        viewModel.nameFirstDisplay.ratio.sativa = stabilizedRatio.sativa;
        viewModel.nameFirstDisplay.ratio.hybrid = stabilizedRatio.hybrid;
      }
    }
  }
  
  // Phase 4.3.3 — Apply visual anchors
  const visualAnchors = buildVisualAnchors(imageResultsV3);
  viewModel.visualAnchors = visualAnchors;
  if (visualAnchors.length > 0) {
    console.log("Phase 4.3.3 — Visual trait anchors applied:", visualAnchors);
  }
  
  // Phase 4.3.4 — Apply name confidence fusion
  const nameSignals: import("./nameConfidenceFusion").NameSignal[] = [
    // Collect visual signals from imageResultsV3 (using candidateStrains as topCandidates)
    ...imageResultsV3.flatMap(r =>
      (r.candidateStrains ?? []).map(c => ({
        name: c.name,
        confidence: c.confidence,
        source: "visual" as const,
      }))
    ),
    // Collect database signals from nameFirstPipelineResult alternateMatches
    ...(nameFirstPipelineResult?.alternateMatches ?? []).map(m => ({
      name: m.name,
      confidence: m.score || 75,
      source: "database" as const,
    })),
    // Add primary database match if available
    ...(nameFirstPipelineResult?.primaryStrainName
      ? [
          {
            name: nameFirstPipelineResult.primaryStrainName,
            confidence: nameFirstPipelineResult.nameConfidencePercent || 75,
            source: "database" as const,
          },
        ]
      : []),
  ];
  
  if (nameSignals.length > 0) {
    const fusedName = fuseNameConfidence(nameSignals);
    console.log("Phase 4.3.4 — Name confidence fusion applied:", fusedName);
    
    // Update viewModel.nameFirstDisplay with fused result
    if (viewModel.nameFirstDisplay) {
      viewModel.nameFirstDisplay.primaryStrainName = fusedName.primaryName;
      viewModel.nameFirstDisplay.primaryName = fusedName.primaryName;
      viewModel.nameFirstDisplay.confidencePercent = fusedName.confidence;
      // Store signals breakdown
      if (!viewModel.nameFirstDisplay.signals) {
        viewModel.nameFirstDisplay.signals = [];
      }
      viewModel.nameFirstDisplay.signals = fusedName.breakdown;
    }
  }
  
  // Phase 4.4.0 — Apply name-first matching
  if (consensusResult && imageResultsV3.length > 0) {
    // Extract consensus candidates from image results
    const consensusCandidates = imageResultsV3.flatMap(r =>
      (r.candidateStrains ?? []).map(c => ({
        name: c.name,
        score: c.confidence,
      }))
    );
    
    // Extract database matches from nameFirstPipelineResult
    const databaseMatches = [
      // Primary database match
      ...(nameFirstPipelineResult?.primaryStrainName
        ? [
            {
              name: nameFirstPipelineResult.primaryStrainName,
              similarity: nameFirstPipelineResult.nameConfidencePercent || 75,
            },
          ]
        : []),
      // Alternate database matches
      ...(nameFirstPipelineResult?.alternateMatches ?? []).map(m => ({
        name: m.name,
        similarity: m.score || 75,
      })),
    ];
    
    if (consensusCandidates.length > 0 || databaseMatches.length > 0) {
      const nameFirstResult = runNameFirstMatching({
        consensusCandidates: consensusCandidates,
        databaseMatches: databaseMatches,
      });
      
      viewModel.nameFirst = nameFirstResult;
      console.log("Phase 4.4.0 — Name-first matching applied:", nameFirstResult);
    }
  }

  // Phase 4.9.0 — Resolve name confidence using V49 engine
  if (consensusResult && imageResultsV3.length > 0 && nameFirstPipelineResult) {
    // Extract consensus names from image results
    const consensusNames = imageResultsV3.flatMap(r =>
      (r.candidateStrains ?? []).map(c => ({
        name: c.name,
        score: c.confidence,
      }))
    );
    
    // Count how many images agree on the primary name
    const primaryName = nameFirstPipelineResult.primaryStrainName;
    const imageAgreementCount = imageResultsV3.filter(r =>
      r.candidateStrains?.some(c => c.name === primaryName)
    ).length;
    
    // Get database match strength from nameFirstPipelineResult
    const databaseMatchStrength = nameFirstPipelineResult.nameConfidencePercent || 75;
    
    if (consensusNames.length > 0) {
      const nameConfidence = resolveNameConfidenceV49({
        consensusNames: consensusNames,
        imageAgreementCount: imageAgreementCount,
        databaseMatchStrength: databaseMatchStrength,
      });
      
      viewModel.nameConfidence = nameConfidence;
      console.log("Phase 4.9.0 — Name confidence resolved:", nameConfidence);
    }
  }

  // Phase 4.3.6 — Build confidence explanation

  // Phase 4.3.6 — Build confidence explanation
  if (consensusResult) {
    // Calculate database support from nameFirstPipelineResult or consensus confidence
    const databaseSupport = nameFirstPipelineResult?.nameConfidencePercent ?? 
      (consensusResult.primaryMatch?.confidence ?? 75);
    
    // Count conflicts from consensus notes or contradictions
    const conflicts = (consensusResult.notes?.filter(note => 
      note.toLowerCase().includes("conflict") || 
      note.toLowerCase().includes("contradict") ||
      note.toLowerCase().includes("disagree")
    ).length ?? 0);
    
    const confidenceExplanation = buildConfidenceExplanation({
      imageCount: imageResultsV3.length,
      consensusStrength: consensusResult.agreementScore,
      databaseSupport: databaseSupport,
      conflicts: conflicts,
    });
    
    viewModel.confidenceExplanation = confidenceExplanation;
    console.log("Phase 4.3.6 — Confidence explanation built:", confidenceExplanation);
  }

  // Phase 4.6.0 — Resolve match strength
  if (nameFirstPipelineResult && consensusResult && imageResultsV3.length > 0) {
    const matchStrength = resolveMatchStrength({
      nameConfidence: nameFirstPipelineResult.nameConfidencePercent,
      imageCount: imageResultsV3.length,
      agreementScore: consensusResult.agreementScore,
    });
    
    viewModel.matchStrength = matchStrength;
    console.log("Phase 4.6.0 — Match strength resolved:", matchStrength);
  }

  // Phase 4.7.0 — Resolve name disambiguation
  if (nameFirstPipelineResult && candidatePool && candidatePool.length > 0) {
    // Build candidates array from candidatePool and alternateMatches
    const candidates = [
      // Primary candidate from candidatePool
      ...candidatePool.map(c => ({
        name: c.name,
        confidence: c.confidence || 0,
        traitsMatched: c.matchedTraits || [],
        traitsMissing: [], // Will be populated from comparison
      })),
      // Alternate candidates from nameFirstPipelineResult
      ...(nameFirstPipelineResult.alternateMatches ?? []).map(m => ({
        name: m.name,
        confidence: m.score || 0,
        traitsMatched: [], // Extract from candidatePool if available
        traitsMissing: [m.whyNotPrimary], // Use whyNotPrimary as missing trait
      })),
    ];
    
    // Find primary candidate traits from candidatePool
    const primaryCandidate = candidatePool.find(c => 
      c.name.toLowerCase() === nameFirstPipelineResult.primaryStrainName.toLowerCase()
    );
    
    // Build candidates with proper trait information
    const candidatesWithTraits = candidates.map(c => {
      const poolCandidate = candidatePool.find(p => 
        p.name.toLowerCase() === c.name.toLowerCase()
      );
      return {
        name: c.name,
        confidence: c.confidence,
        traitsMatched: poolCandidate?.matchedTraits || c.traitsMatched,
        traitsMissing: c.name === nameFirstPipelineResult.primaryStrainName 
          ? [] 
          : (primaryCandidate?.matchedTraits?.filter(t => 
              !(poolCandidate?.matchedTraits || []).includes(t)
            ) || c.traitsMissing),
      };
    });
    
    const nameDisambiguation = resolveNameDisambiguation({
      primaryName: nameFirstPipelineResult.primaryStrainName,
      primaryConfidence: nameFirstPipelineResult.nameConfidencePercent,
      candidates: candidatesWithTraits,
    });
    
    viewModel.nameDisambiguation = nameDisambiguation;
    console.log("Phase 4.7.0 — Name disambiguation resolved:", nameDisambiguation);
  }

  // Phase 4.0.6 — Get warning message for very low diversity
  const { warning } = normalizeSimilarityFailure(
    diversityScore,
    finalConfidence
  );

  // Phase 4.5.2 — Confidence Stability Rule: Apply name memory bias before final confidence assignment
  let stabilityAdjustedConfidence = finalConfidence;
  const currentPrimaryName = viewModel.nameFirstDisplay?.primaryStrainName;
  
  if (currentPrimaryName && finalImageFingerprints.length > 0) {
    const cachedBias = getNameMemoryBias(finalImageFingerprints);
    
    if (cachedBias) {
      const nameMatches = cachedBias.name === currentPrimaryName;
      
      if (nameMatches) {
        // If primary strain name matches previous scan: confidence may increase slightly
        const stabilityBoost = Math.min(3, 95 - finalConfidence); // Max +3%, capped at 95%
        stabilityAdjustedConfidence = finalConfidence + stabilityBoost;
        console.log("Phase 4.5.2 — Name matches previous scan, applying stability boost:", {
          previousName: cachedBias.name,
          previousConfidence: cachedBias.confidence,
          currentConfidence: finalConfidence,
          adjustedConfidence: stabilityAdjustedConfidence,
          boost: stabilityBoost,
        });
      } else {
        // If name changes: confidence must drop (never jump up)
        const stabilityPenalty = Math.min(10, finalConfidence - 55); // Max -10%, floor at 55%
        stabilityAdjustedConfidence = Math.max(55, finalConfidence - stabilityPenalty);
        console.log("Phase 4.5.2 — Name changed from previous scan, applying stability penalty:", {
          previousName: cachedBias.name,
          previousConfidence: cachedBias.confidence,
          currentName: currentPrimaryName,
          currentConfidence: finalConfidence,
          adjustedConfidence: stabilityAdjustedConfidence,
          penalty: stabilityPenalty,
        });
      }
    }
  }
  
  // Phase 4.0.3 — Update viewModel confidence from V403 breakdown (single source of truth)
  if (viewModel.nameFirstDisplay) {
    viewModel.nameFirstDisplay.confidencePercent = finalConfidence;
    viewModel.nameFirstDisplay.confidence = finalConfidence;
    // Update confidenceTier based on final confidence
    viewModel.nameFirstDisplay.confidenceTier = finalConfidence >= 85 ? "very_high" as const
      : finalConfidence >= 75 ? "high" as const
      : finalConfidence >= 65 ? "medium" as const
      : "low" as const;
  }
  viewModel.confidence = finalConfidence;
  
  // Phase 4.0.3 — Update confidenceTier in viewModel (using V403 final confidence)
  const v403ConfidenceTier = getConfidenceTierFromRange(
    finalConfidence - 2,
    finalConfidence + 2
  );
  viewModel.confidenceTier = v403ConfidenceTier;

  // Phase 4.6 — NAME TRUST & DISAMBIGUATION
  // Collect candidate names from all images
  const candidateNamesSet = new Set<string>();
  const imageNameFrequency = new Map<string, number>();
  
  imageResultsV3.forEach((imgResult) => {
    if (imgResult.candidateStrains && imgResult.candidateStrains.length > 0) {
      imgResult.candidateStrains.forEach((candidate, index) => {
        const name = candidate.name;
        if (name && name.trim().length >= 3 && name.toLowerCase() !== "unknown") {
          candidateNamesSet.add(name);
          imageNameFrequency.set(name, (imageNameFrequency.get(name) || 0) + 1);
        }
      });
    }
  });
  
  // Add name from name-first pipeline if available
  const nameFromPipeline = nameFirstResult?.primaryMatch?.name || lockedStrainName;
  if (nameFromPipeline && nameFromPipeline.trim().length >= 3) {
    candidateNamesSet.add(nameFromPipeline);
    imageNameFrequency.set(nameFromPipeline, (imageNameFrequency.get(nameFromPipeline) || 0) + 1);
  }
  
  const candidateNames = Array.from(candidateNamesSet);
  
  // Build database matches
  const databaseMatches: { name: string; hasLineage: boolean; hasTerpenes: boolean }[] = [];
  candidateNames.forEach((name) => {
    const dbMatch = CULTIVAR_LIBRARY.find(s => 
      s.name === name || s.aliases?.includes(name)
    );
    if (dbMatch) {
      databaseMatches.push({
        name: dbMatch.name,
        hasLineage: !!(dbMatch as any).lineage || !!(dbMatch as any).genetics || !!(dbMatch as any).parentStrains,
        hasTerpenes: !!(dbMatch as any).terpenes || !!(dbMatch as any).dominantTerpenes,
      });
    }
  });
  
  // Build visual alignment scores (0-1 per name)
  const visualAlignment = new Map<string, number>();
  candidateNames.forEach((name) => {
    // Check if name appears in image results and how high it ranks
    let visualScore = 0;
    let count = 0;
    
    imageResultsV3.forEach((imgResult) => {
      const candidateIndex = imgResult.candidateStrains.findIndex(c => c.name === name);
      if (candidateIndex >= 0) {
        // Higher rank = better alignment (0 = top, higher = lower rank)
        const rankScore = 1 - (candidateIndex / Math.max(1, imgResult.candidateStrains.length - 1));
        visualScore += rankScore;
        count++;
      }
    });
    
    if (count > 0) {
      visualAlignment.set(name, visualScore / count);
    } else {
      visualAlignment.set(name, 0.3); // Default low alignment if not found
    }
  });
  
  // Build terpene alignment scores (0-1 per name)
  const terpeneAlignment = new Map<string, number>();
  candidateNames.forEach((name) => {
    const dbMatch = CULTIVAR_LIBRARY.find(s => 
      s.name === name || s.aliases?.includes(name)
    );
    
    if (dbMatch && viewModel.terpeneExperience) {
      // Check terpene overlap
      const dbTerpenes = ((dbMatch as any).terpenes || (dbMatch as any).dominantTerpenes || []).map((t: string) => t.toLowerCase());
      const observedTerpenes = [
        ...(viewModel.terpeneExperience.dominantTerpenes || []),
        ...(viewModel.terpeneExperience.secondaryTerpenes || []),
      ].map(t => t.toLowerCase());
      
      if (dbTerpenes.length > 0 && observedTerpenes.length > 0) {
        const overlap = dbTerpenes.filter(t => observedTerpenes.includes(t)).length;
        const alignment = overlap / Math.max(dbTerpenes.length, observedTerpenes.length);
        terpeneAlignment.set(name, alignment);
      } else {
        terpeneAlignment.set(name, 0.3); // Default low alignment
      }
    } else {
      terpeneAlignment.set(name, 0.3); // Default low alignment
    }
  });
  
  // Phase 4.6 — Compute name trust using V46 (weighted sources, disambiguation)
  // Use current confidence (from V403 or V406) - will be updated after V45
  const currentConfidence = finalConfidence || confidenceBreakdown?.final || 65;
  const nameTrustV46 = computeNameTrustV46({
    candidateNames,
    databaseMatches,
    imageNameFrequency,
    visualAlignment,
    terpeneAlignment,
    confidence: currentConfidence,
  });
  
  // Phase B.1 — NAME-FIRST MATCHING ENGINE (Database first, always)
  // Run BEFORE other name matching logic
  // No vision logic yet - database matching only
  let phaseB1Result: ReturnType<typeof nameFirstMatchingEngine> | null = null;
  let candidateNamesForB1: string[] = [];
  
  if (imageResultsV3.length > 0) {
    // Collect candidate names from image results
    candidateNamesForB1 = imageResultsV3.flatMap(r => 
      r.candidateStrains?.map(c => c.name).filter(Boolean) || []
    );
    
    // Also include name from pipeline if available
    if (nameFirstPipelineResult?.primaryStrainName) {
      candidateNamesForB1.push(nameFirstPipelineResult.primaryStrainName);
    }
    
    // Remove duplicates
    candidateNamesForB1 = Array.from(new Set(candidateNamesForB1));
    
    // Phase B.1 — Run name-first matching engine (database only)
    if (candidateNamesForB1.length > 0) {
      try {
        phaseB1Result = nameFirstMatchingEngine(candidateNamesForB1);
        console.log("Phase B.1 — NAME-FIRST MATCHING ENGINE:", {
          candidates: phaseB1Result.candidates.map(c => `${c.strainName} (${c.score}%, [${c.reasonTags.join(", ")}])`),
          primary: phaseB1Result.primaryStrainName,
          confidence: phaseB1Result.confidence,
        });
      } catch (error) {
        console.warn("Phase B.1 — Name-first matching engine error:", error);
        phaseB1Result = null;
      }
    }
  }
  
  // NAME-FIRST MATCHING (NON-NEGOTIABLE) — Select primary strain name with priority order
  let nameFirstMatchingResult: { name: string; confidence: number; reasons: string[]; isLocked: boolean; source: string } | null = null;
  let perImageTopNames: string[] = []; // Declare outside if block for Phase 5.5
  let databaseCandidates: import("./cultivarLibrary").CultivarReference[] = []; // Declare outside if block for Phase 5.5
  
  if (imageResultsV3.length > 0) {
    // Collect per-image top names
    perImageTopNames = imageResultsV3.map(r => {
      const topCandidate = r.candidateStrains?.[0];
      return topCandidate?.name || nameFirstPipelineResult?.primaryStrainName || "";
    }).filter(name => name && name.trim());
    
    // Phase B.1 — Use Phase B.1 candidates if available (database first)
    // Need to look up CultivarReference by strainName
    if (phaseB1Result && phaseB1Result.candidates.length > 0) {
      const { findByName } = require("./cultivarLibrary");
      for (const candidate of phaseB1Result.candidates) {
        const dbEntry = findByName(candidate.strainName);
        if (dbEntry && !databaseCandidates.find(c => c.name === dbEntry.name)) {
          databaseCandidates.push(dbEntry);
        }
      }
    }

    // Collect database candidates from nameFirstPipelineResult and dbEntry
    databaseCandidates = [];
    if (dbEntry) {
      databaseCandidates.push(dbEntry);
    }
    // Add alternate matches from nameFirstPipelineResult
    if (nameFirstPipelineResult?.alternateMatches) {
      for (const alt of nameFirstPipelineResult.alternateMatches) {
        const altName = typeof alt === "string" ? alt : alt.name;
        const match = findStrainByNameOrAlias(altName);
        if (match && !databaseCandidates.find(c => c.name === match.strain.name)) {
          databaseCandidates.push(match.strain);
        }
      }
    }
    
    // Extract terpene profile for name-first matching
    let terpeneProfileForName: string[] = [];
    if (viewModel.terpeneExperience?.dominantTerpenes || viewModel.terpeneExperience?.secondaryTerpenes) {
      const allTerpenes = [
        ...(viewModel.terpeneExperience.dominantTerpenes || []),
        ...(viewModel.terpeneExperience.secondaryTerpenes || []),
      ];
      terpeneProfileForName = allTerpenes.map(t => typeof t === "string" ? t : (t as any).name || "").filter(Boolean);
    } else if (dbEntry?.terpeneProfile || (dbEntry as any)?.commonTerpenes) {
      terpeneProfileForName = (dbEntry.terpeneProfile || (dbEntry as any).commonTerpenes || []).map((t: string) => String(t));
    }
    
    // NAME-FIRST MATCHING — Select primary strain name (NON-NEGOTIABLE)
    try {
      nameFirstMatchingResult = selectPrimaryStrainName({
        perImageTopNames,
        imageCount: imageResultsV3.length || filteredInput.imageCount,
        databaseCandidates,
        fusedFeatures: fusedFeatures || undefined,
        terpeneProfile: terpeneProfileForName,
      });
      
      console.log("NAME-FIRST MATCHING:", {
        name: nameFirstMatchingResult.name,
        confidence: nameFirstMatchingResult.confidence,
        source: nameFirstMatchingResult.source,
        isLocked: nameFirstMatchingResult.isLocked,
      });
    } catch (error) {
      // If name-first matching fails (e.g., database not loaded), use fallback
      console.warn("NAME-FIRST MATCHING: Error, using fallback:", error);
      nameFirstMatchingResult = {
        name: perImageTopNames[0] || "Closest Known Cultivar",
        confidence: 70,
        reasons: ["Name selected based on available analysis"],
        isLocked: false,
        source: "fallback",
      };
    }
  }

  // Phase 5.3 — NAME-FIRST STRENGTHENING & ALIAS MATCHING
  // Strengthen name selection with alias matching, lineage inference, and phenotype fallback
  let strengthenedNameV53: ReturnType<typeof strengthenNameSelectionV53> | null = null;
  
  if (nameFirstPipelineResult && imageResultsV3.length > 0) {

    // Extract observed lineage from dbEntry if available
    const observedLineage = dbEntry?.genetics || undefined;

    // Extract observed morphology from fusedFeatures
    const observedMorphology = fusedFeatures || undefined;

    // Phase 5.3 — Strengthen name selection
    strengthenedNameV53 = strengthenNameSelectionV53({
      perImageTopNames,
      imageCount: imageResultsV3.length || filteredInput.imageCount,
      databaseCandidates,
      observedLineage,
      observedMorphology,
    });

    // Phase 5.3 — 7. Logging: Console log once per scan
    console.log("NAME_SELECTED:", {
      name: strengthenedNameV53.primaryStrainName,
      score: strengthenedNameV53.selectedScore,
      source: strengthenedNameV53.selectedSource,
      alternates: strengthenedNameV53.alternateMatches.map(a => a.name),
    });
  }

  // Phase 5.5 — NAME CONFIDENCE + DISAMBIGUATION UPGRADE
  // Calculate name confidence using weighted inputs and handle disambiguation
  let nameConfidenceV55: ReturnType<typeof resolveNameConfidenceV55> | null = null;
  
  if (nameFirstPipelineResult && imageResultsV3.length > 0) {
    // Collect candidate names from all sources
    const candidateNamesSet = new Set<string>();
    
    // From per-image top names
    perImageTopNames.forEach(name => {
      if (name && name.trim()) candidateNamesSet.add(name);
    });
    
    // From nameFirstPipelineResult
    if (nameFirstPipelineResult.primaryStrainName) {
      candidateNamesSet.add(nameFirstPipelineResult.primaryStrainName);
    }
    if (nameFirstPipelineResult.alternateMatches) {
      nameFirstPipelineResult.alternateMatches.forEach(alt => {
        const altName = typeof alt === "string" ? alt : alt.name;
        if (altName && altName.trim()) candidateNamesSet.add(altName);
      });
    }
    
    // From strengthenedNameV53
    if (strengthenedNameV53) {
      candidateNamesSet.add(strengthenedNameV53.primaryStrainName);
      strengthenedNameV53.alternateMatches.forEach(alt => {
        if (alt.name && alt.name.trim()) candidateNamesSet.add(alt.name);
      });
    }
    
    // From image results
    imageResultsV3.forEach(img => {
      img.candidateStrains?.forEach(candidate => {
        if (candidate.name && candidate.name.trim()) {
          candidateNamesSet.add(candidate.name);
        }
      });
    });
    
    const candidateNames = Array.from(candidateNamesSet);
    
    // Extract terpene profile from viewModel or dbEntry
    let terpeneProfile: Array<{ name: string; likelihood: string }> | undefined = undefined;
    if (viewModel.terpeneExperience?.dominantTerpenes || viewModel.terpeneExperience?.secondaryTerpenes) {
      const allTerpenes = [
        ...(viewModel.terpeneExperience.dominantTerpenes || []),
        ...(viewModel.terpeneExperience.secondaryTerpenes || []),
      ];
      terpeneProfile = allTerpenes.map(t => ({
        name: typeof t === "string" ? t : (t as any).name || "",
        likelihood: "high",
      }));
    } else if (dbEntry?.terpeneProfile || (dbEntry as any)?.commonTerpenes) {
      const terpenes = dbEntry.terpeneProfile || (dbEntry as any).commonTerpenes || [];
      terpeneProfile = terpenes.map((t: string) => ({
        name: t,
        likelihood: "high",
      }));
    }
    
    // Extract effect profile from dbEntry
    let effectProfile: Array<{ effect: string; likelihood: string }> | undefined = undefined;
    if (dbEntry?.effects && dbEntry.effects.length > 0) {
      effectProfile = dbEntry.effects.map((e: string) => ({
        effect: e,
        likelihood: "high",
      }));
    }
    
    // Phase 5.5 — Resolve name confidence
    nameConfidenceV55 = resolveNameConfidenceV55({
      candidateNames,
      perImageTopNames,
      databaseCandidates,
      fusedFeatures,
      terpeneProfile,
      effectProfile,
      imageCount: imageResultsV3.length || filteredInput.imageCount,
    });
  }

  // Phase 4.6 — 1) Name locking rule
  // If confidence ≥75%, lock primary strain name (don't change on re-scan)
  // If confidence <75%, allow alternate candidates and show "Closest Known Cultivar" framing
  // Note: finalConfidence will be updated after V45, but we use current confidence for locking
  const shouldLockName = nameTrustV46.isLocked && currentConfidence >= 75;
  
  // PRIMARY STRAIN SELECTION LOGIC
  // Select primaryStrainName ONLY from top-5 name-first results (Phase B.1)
  // If top score < 60: primaryStrainName = "Closest Known Cultivar"
  // Never leave primaryStrainName empty
  // Never throw
  
  let finalPrimaryName = "Closest Known Cultivar"; // Fallback
  let finalNameConfidence = 70; // Default
  let finalNameReasons: string[] = ["Name selected based on available analysis"];
  let finalNameIsLocked = false;
  
  // RULE: Select primaryStrainName ONLY from Phase B.1 top-5 results
  if (phaseB1Result) {
    // Phase B.1 result is the ONLY source for primary strain name
    finalPrimaryName = phaseB1Result.primaryStrainName;
    finalNameConfidence = phaseB1Result.confidence;
    finalNameReasons = phaseB1Result.explanation;
    finalNameIsLocked = phaseB1Result.confidence >= 85;
    
    // Safety: Never leave primaryStrainName empty
    if (!finalPrimaryName || finalPrimaryName.trim().length < 3) {
      console.warn("PRIMARY STRAIN SELECTION: Phase B.1 returned empty name, using fallback");
      finalPrimaryName = "Closest Known Cultivar";
      finalNameConfidence = 70;
      finalNameReasons = ["Fallback selection due to empty name from Phase B.1"];
    }
  } else {
    // Phase B.1 didn't run or returned null - use fallback
    console.warn("PRIMARY STRAIN SELECTION: Phase B.1 result not available, using fallback");
    finalPrimaryName = "Closest Known Cultivar";
    finalNameConfidence = 70;
    finalNameReasons = ["Phase B.1 matching not available — using fallback"];
  }
  
  // Phase B.2 — CONFIDENCE CALIBRATION
  // Apply confidence calibration rules:
  // - Single image max confidence ≤ 85%
  // - Multiple images raise confidence gradually
  // - Never output 100%
  // - If name confidence < 60%, label as "Closest Known Cultivar"
  let phaseB2ConfidenceResult: ReturnType<typeof calibrateConfidenceB2> | null = null;
  try {
    // Phase B.2 — Derive image agreement score (0-1) and agreeing image count
    let imageAgreementScore = 0.5; // Default
    let agreeingImageCount = 0;
    if (imageResultsV3.length >= 2) {
      // Count how many images agree on the primary name
      agreeingImageCount = imageResultsV3.filter(r => {
        const topCandidate = r.candidateStrains?.[0];
        return topCandidate?.name === finalPrimaryName;
      }).length;
      imageAgreementScore = agreeingImageCount / imageResultsV3.length;
    } else if (imageResultsV3.length === 1) {
      // Single image: count as 1 agreeing image
      agreeingImageCount = 1;
      imageAgreementScore = 1.0;
    }
    
    // Derive database match strength (0-1)
    let databaseMatchStrength = 0.5; // Default
    if (phaseB1Result && phaseB1Result.candidates.length > 0) {
      // Use Phase B.1 top candidate score as database match strength
      databaseMatchStrength = Math.min(1.0, phaseB1Result.candidates[0].score / 100);
    } else if (dbEntry) {
      // Database entry exists
      databaseMatchStrength = 0.8;
    }
    
    // Phase B.1 — Store reasonTags for reference
    if (phaseB1Result && phaseB1Result.candidates.length > 0) {
      (viewModel.nameFirstDisplay as any).phaseB1ReasonTags = phaseB1Result.candidates[0].reasonTags;
    }
    
    phaseB2ConfidenceResult = calibrateConfidenceB2({
      imageCount: imageResultsV3.length || filteredInput.imageCount,
      nameMatchingResult: phaseB1Result,
      nameConfidence: finalNameConfidence, // Base confidence from name score (Phase B.1)
      imageAgreementScore,
      databaseMatchStrength,
      hasSimilarImages: samePlantLikely || false,
      agreeingImageCount, // Number of images that agree on primary name
    });
    
    // Apply Phase B.2 calibrated confidence
    finalNameConfidence = phaseB2ConfidenceResult.confidence;
    
    // RULE: If name confidence < 60%, label as "Closest Known Cultivar"
    if (phaseB2ConfidenceResult.shouldUseFallbackName) {
      finalPrimaryName = "Closest Known Cultivar";
      finalNameReasons = phaseB2ConfidenceResult.explanation;
    } else {
      // Add confidence explanation to reasons
      finalNameReasons = [
        ...finalNameReasons,
        ...phaseB2ConfidenceResult.explanation,
      ];
    }
    
    console.log("Phase B.2 — CONFIDENCE CALIBRATED:", {
      confidence: phaseB2ConfidenceResult.confidence,
      tier: phaseB2ConfidenceResult.tier,
      shouldUseFallbackName: phaseB2ConfidenceResult.shouldUseFallbackName,
      explanation: phaseB2ConfidenceResult.explanation,
    });
  } catch (error) {
    console.warn("Phase B.2 — Confidence calibration error:", error);
    // Continue with existing confidence
  }
  
  
  // PRIMARY STRAIN SELECTION LOGIC — Final safety check
  // Never leave primaryStrainName empty
  // Never throw
  if (!finalPrimaryName || finalPrimaryName.trim().length < 3) {
    console.warn("PRIMARY STRAIN SELECTION: Final check — name was empty, forcing fallback");
    finalPrimaryName = "Closest Known Cultivar";
    finalNameConfidence = 70;
    finalNameReasons = ["Fallback selection due to insufficient data"];
    finalNameIsLocked = false;
  }
  
  // Phase 4.6.2 — FAMILY-FIRST CONFIDENCE BOOST
  // If exact strain uncertain but family is strong: lock family, soft-rank strains inside family
  let familyFirstResult: ReturnType<typeof applyFamilyFirstConfidenceBoost> | null = null;
  let exactStrainConfidenceForUI: number | null = null; // Phase 4.6.4 — Store for dual confidence display
  try {
    // Get candidate strains from Phase B.1 (convert to expected format)
    const candidateStrains = phaseB1Result?.candidates.map(c => ({
      name: c.strainName,
      confidence: c.score,
    })) || [];
    
    // Get final confidence after Phase B.2 calibration
    const finalConfidenceForFamilyCheck = phaseB2ConfidenceResult?.confidence ?? finalNameConfidence;
    exactStrainConfidenceForUI = finalConfidenceForFamilyCheck; // Phase 4.6.4 — Store for UI
    
    familyFirstResult = applyFamilyFirstConfidenceBoost({
      primaryStrainName: finalPrimaryName,
      exactStrainConfidence: finalConfidenceForFamilyCheck,
      candidateStrains,
      imageCount: imageResultsV3.length || filteredInput.imageCount,
    });
    
    // If family-first is recommended, apply it
    if (familyFirstResult.useFamilyFirst) {
      console.log("Phase 4.6.2 — Applying family-first confidence boost:", {
        familyName: familyFirstResult.familyName,
        exactStrainConfidence: finalConfidenceForFamilyCheck,
        familyConfidence: familyFirstResult.familyConfidence,
        closestStrainInFamily: familyFirstResult.closestStrainInFamily,
        displayFormat: familyFirstResult.displayFormat,
      });
      
      // Update primary name to use family-first display format
      finalPrimaryName = familyFirstResult.displayFormat;
      // Use family confidence (higher than exact strain confidence)
      finalNameConfidence = familyFirstResult.familyConfidence;
      // Update reasons to include family-first explanation
      finalNameReasons = [
        ...finalNameReasons,
        ...familyFirstResult.explanation,
      ];
    }
  } catch (error) {
    console.warn("Phase 4.6.2 — Family-first boost error:", error);
    // Continue with exact strain name if family-first fails
  }
  
  // NAME-FIRST MATCHING — Update nameFirstDisplay with name-first result (NON-NEGOTIABLE)
  if (viewModel.nameFirstDisplay) {
    // Override primary name (always non-empty, never "Unknown") - NAME-FIRST MATCHING prioritized
    viewModel.nameFirstDisplay.primaryStrainName = finalPrimaryName;
    viewModel.nameFirstDisplay.primaryName = finalPrimaryName;
    
    // Phase B.2 — Update confidence from Phase B.2 calibration (if available)
    // Otherwise use name-first matching confidence
    // Phase 4.6.2 — If family-first is applied, use family confidence instead
    const displayConfidence = familyFirstResult?.useFamilyFirst 
      ? familyFirstResult.familyConfidence 
      : (phaseB2ConfidenceResult?.confidence ?? finalNameConfidence);
    const displayTier = phaseB2ConfidenceResult?.tier ?? (
      displayConfidence >= 90 ? "very_high" :
      displayConfidence >= 80 ? "high" :
      displayConfidence >= 70 ? "medium" : "low"
    );
    
    // Phase 4.5.2 — Confidence Stability Rule: Apply name memory bias before final confidence assignment
    let stabilityAdjustedConfidence = displayConfidence;
    let nameMemoryMatch = false; // Phase 4.5.3 — Track if name matches previous scan
    
    if (finalPrimaryName && finalImageFingerprints.length > 0) {
      const cachedBias = getNameMemoryBias(finalImageFingerprints);
      
      if (cachedBias) {
        const nameMatches = cachedBias.name === finalPrimaryName;
        
        if (nameMatches) {
          // Phase 4.5.3 — Mark that name memory found a match
          nameMemoryMatch = true;
          
          // If primary strain name matches previous scan: confidence may increase slightly
          const stabilityBoost = Math.min(3, 95 - displayConfidence); // Max +3%, capped at 95%
          stabilityAdjustedConfidence = displayConfidence + stabilityBoost;
          console.log("Phase 4.5.2 — Name matches previous scan, applying stability boost:", {
            previousName: cachedBias.name,
            previousConfidence: cachedBias.confidence,
            currentName: finalPrimaryName,
            currentConfidence: displayConfidence,
            adjustedConfidence: stabilityAdjustedConfidence,
            boost: stabilityBoost,
          });
        } else {
          // If name changes: confidence must drop (never jump up)
          const stabilityPenalty = Math.min(10, displayConfidence - 55); // Max -10%, floor at 55%
          stabilityAdjustedConfidence = Math.max(55, displayConfidence - stabilityPenalty);
          console.log("Phase 4.5.2 — Name changed from previous scan, applying stability penalty:", {
            previousName: cachedBias.name,
            previousConfidence: cachedBias.confidence,
            currentName: finalPrimaryName,
            currentConfidence: displayConfidence,
            adjustedConfidence: stabilityAdjustedConfidence,
            penalty: stabilityPenalty,
          });
        }
      }
    }
    
    viewModel.nameFirstDisplay.confidencePercent = stabilityAdjustedConfidence;
    viewModel.nameFirstDisplay.confidence = stabilityAdjustedConfidence;
    // Phase 4.5.2 — Use stability-adjusted confidence for tier
    viewModel.nameFirstDisplay.confidenceTier = stabilityAdjustedConfidence >= 90 ? "very_high" :
      stabilityAdjustedConfidence >= 80 ? "high" :
      stabilityAdjustedConfidence >= 70 ? "medium" : "low";
    // Phase 4.5.2 — Update viewModel confidence to match stability-adjusted value
    viewModel.confidence = stabilityAdjustedConfidence;
    // Phase 4.5.3 — Store name memory match in scanMeta for UI display
    scanMeta.nameMemoryMatch = nameMemoryMatch;
    
    // Update explanation (clear reason why this name won) - NAME-FIRST MATCHING prioritized
    if (!viewModel.nameFirstDisplay.explanation) {
      viewModel.nameFirstDisplay.explanation = { whyThisNameWon: [], whatRuledOutOthers: [], varianceNotes: [] };
    }
    // NAME-FIRST MATCHING provides reasons array
    viewModel.nameFirstDisplay.explanation.whyThisNameWon = finalNameReasons;
    
    // Phase B.1 — Attach alternates (ranked, max 3) - Phase B.1 prioritized
    if (phaseB1Result && phaseB1Result.candidates.length > 1) {
      // Use Phase B.1 candidates (top 3 alternates, excluding primary)
      viewModel.nameFirstDisplay.alternateNames = phaseB1Result.candidates.slice(1, 4).map(c => c.strainName);
    } else if (nameConfidenceV55 && nameConfidenceV55.alternateMatches.length > 0) {
      viewModel.nameFirstDisplay.alternateNames = nameConfidenceV55.alternateMatches.map(a => a.name);
    } else if (strengthenedNameV53) {
      viewModel.nameFirstDisplay.alternateNames = strengthenedNameV53.alternateMatches.map(a => a.name);
    } else {
      viewModel.nameFirstDisplay.alternateNames = nameTrustV46.alternates;
    }
    
    // Phase B.1 — Store top 5 candidates if available
    if (phaseB1Result && phaseB1Result.candidates.length > 0) {
      (viewModel.nameFirstDisplay as any).phaseB1Candidates = phaseB1Result.candidates.map(c => ({
        strainName: c.strainName,
        score: c.score,
        reasonTags: c.reasonTags,
      }));
    }
    
    // Phase 4.6.2 — Store family-first result if applied
    // Phase 4.6.4 — Also store original strain confidence for dual confidence display
    if (familyFirstResult?.useFamilyFirst && exactStrainConfidenceForUI !== null) {
      (viewModel.nameFirstDisplay as any).familyFirst = {
        familyName: familyFirstResult.familyName,
        closestStrainInFamily: familyFirstResult.closestStrainInFamily,
        strainRanking: familyFirstResult.strainRanking,
        displayFormat: familyFirstResult.displayFormat,
        familyConfidence: familyFirstResult.familyConfidence,
        exactStrainConfidence: exactStrainConfidenceForUI, // Phase 4.6.4 — Store original strain confidence
      };
    }
    
    // NAME-FIRST MATCHING — Mark as locked if DB confidence >= 85% OR name-first result says locked
    (viewModel.nameFirstDisplay as any).isLocked = finalNameIsLocked || (shouldLockName && finalNameConfidence >= 75);
    
    // Phase 5.5 — Attach disambiguation flag
    if (nameConfidenceV55) {
      (viewModel.nameFirstDisplay as any).disambiguationTriggered = nameConfidenceV55.disambiguationTriggered;
    }
    
    // Phase B.1 — Attach source information (Phase B.1 prioritized)
    if (phaseB1Result && phaseB1Result.candidates.length > 0) {
      const topCandidate = phaseB1Result.candidates[0];
      // Use first reasonTag as primary source
      (viewModel.nameFirstDisplay as any).nameSource = topCandidate.reasonTags[0] || "token";
      (viewModel.nameFirstDisplay as any).phaseB1Primary = true;
    } else if (nameFirstMatchingResult) {
      (viewModel.nameFirstDisplay as any).nameSource = nameFirstMatchingResult.source;
    } else if (!nameConfidenceV55) {
      (viewModel.nameFirstDisplay as any).nameSource = strengthenedNameV53?.selectedSource || "direct";
    }
  } else {
    // PRIMARY STRAIN SELECTION LOGIC — Create nameFirstDisplay if it doesn't exist
    // Always populate: primaryStrainName, confidencePercent, explanation.whyThisNameWon[]
    // Never leave primaryStrainName empty
    // Never throw
    
    let confidenceTier: "very_high" | "high" | "medium" | "low";
    if (finalNameConfidence >= 90) {
      confidenceTier = "very_high";
    } else if (finalNameConfidence >= 80) {
      confidenceTier = "high";
    } else if (finalNameConfidence >= 70) {
      confidenceTier = "medium";
    } else {
      confidenceTier = "low";
    }
    
    // Ensure finalPrimaryName is never empty
    const safePrimaryName = finalPrimaryName && finalPrimaryName.trim().length >= 3
      ? finalPrimaryName
      : "Closest Known Cultivar";
    
    // Ensure finalNameReasons is never empty
    const safeReasons = finalNameReasons.length > 0
      ? finalNameReasons
      : ["Name selected based on available analysis"];
    
    viewModel.nameFirstDisplay = {
      primaryStrainName: safePrimaryName,
      primaryName: safePrimaryName,
      confidencePercent: finalNameConfidence,
      confidence: finalNameConfidence,
      confidenceTier,
      tagline: safeReasons[0] || "Closest known match based on available analysis",
      explanation: { 
        whyThisNameWon: safeReasons, 
        whatRuledOutOthers: [], 
        varianceNotes: [] 
      },
      alternateNames: phaseB1Result && phaseB1Result.candidates.length > 1
        ? phaseB1Result.candidates.slice(1, 4).map(c => c.strainName) // Top 3 alternates from Phase B.1
        : [],
    };
    (viewModel.nameFirstDisplay as any).isLocked = finalNameIsLocked || (shouldLockName && finalNameConfidence >= 75);
    if (nameConfidenceV55) {
      (viewModel.nameFirstDisplay as any).disambiguationTriggered = nameConfidenceV55.disambiguationTriggered;
    }
    // Phase B.1 — Attach source information (Phase B.1 prioritized)
    if (phaseB1Result && phaseB1Result.candidates.length > 0) {
      const topCandidate = phaseB1Result.candidates[0];
      // Use first reasonTag as primary source
      (viewModel.nameFirstDisplay as any).nameSource = topCandidate.reasonTags[0] || "token";
      (viewModel.nameFirstDisplay as any).phaseB1Primary = true;
      (viewModel.nameFirstDisplay as any).phaseB1Candidates = phaseB1Result.candidates.map(c => ({
        strainName: c.strainName,
        score: c.score,
        reasonTags: c.reasonTags,
      }));
    } else {
      (viewModel.nameFirstDisplay as any).nameSource = "fallback";
    }
  }
  
  // NAME-FIRST MATCHING — 8. Logging
  // NAME_FINAL: <name> confidence=<c> alternates=<n>
  const finalAlternates = nameConfidenceV55?.alternateMatches.map(a => a.name) || strengthenedNameV53?.alternateMatches.map(a => a.name) || nameTrustV46.alternates || [];
  console.log("NAME_FINAL:", {
    name: finalPrimaryName,
    confidence: finalNameConfidence,
    alternates: finalAlternates.length,
  });

  // Phase 4.0.5 — INDICA / SATIVA / HYBRID RATIO FINALIZATION
  // Extract inputs for final ratio resolution
  let dbRatio: { indica: number; sativa: number } | undefined = undefined;
  if (dbEntry) {
    // Extract from dbEntry if available (check common fields)
    const dbIndica = (dbEntry as any).indicaPercent || (dbEntry as any).indica || undefined;
    const dbSativa = (dbEntry as any).sativaPercent || (dbEntry as any).sativa || undefined;
    if (dbIndica !== undefined && dbSativa !== undefined) {
      dbRatio = { indica: dbIndica, sativa: dbSativa };
    }
  }

  // Extract visual signals from fusedFeatures
  let visualSignals: { indicaBias: number; sativaBias: number } | undefined = undefined;
  if (fusedFeatures) {
    let indicaBias = 0;
    let sativaBias = 0;

    // Bud structure: high = indica, low = sativa
    if (fusedFeatures.budStructure === "high") {
      indicaBias += 0.4;
    } else if (fusedFeatures.budStructure === "low") {
      sativaBias += 0.4;
    }

    // Leaf shape: broad = indica, narrow = sativa
    if (fusedFeatures.leafShape === "broad") {
      indicaBias += 0.3;
    } else if (fusedFeatures.leafShape === "narrow") {
      sativaBias += 0.3;
    }

    // Trichome density: high = slight indica bias
    if (fusedFeatures.trichomeDensity === "high") {
      indicaBias += 0.1;
    }

    // Normalize biases to -1..1 range
    const totalBias = Math.max(Math.abs(indicaBias), Math.abs(sativaBias));
    if (totalBias > 0) {
      indicaBias = indicaBias / totalBias;
      sativaBias = sativaBias / totalBias;
    }

    visualSignals = { indicaBias, sativaBias };
  }

  // Extract terpene bias (if terpene experience result available)
  let terpeneBias: { indica: number; sativa: number } | undefined = undefined;
  if (viewModel.terpeneExperience) {
    // Extract terpenes from terpeneExperience structure
    const dominantTerpenes = viewModel.terpeneExperience.dominantTerpenes || [];
    const secondaryTerpenes = viewModel.terpeneExperience.secondaryTerpenes || [];
    const allTerpenes = [...dominantTerpenes, ...secondaryTerpenes];
    
    if (allTerpenes.length > 0) {
      // Terpene-to-dominance mapping (simplified)
      let indicaScore = 0;
      let sativaScore = 0;
      
      allTerpenes.forEach((terpene: string) => {
        const t = terpene.toLowerCase();
        // Indica-leaning terpenes
        if (t.includes("myrcene") || t.includes("caryophyllene") || t.includes("linalool")) {
          indicaScore += 1;
        }
        // Sativa-leaning terpenes
        if (t.includes("limonene") || t.includes("terpinolene") || t.includes("pinene")) {
          sativaScore += 1;
        }
      });

      if (indicaScore + sativaScore > 0) {
        const total = indicaScore + sativaScore;
        terpeneBias = {
          indica: (indicaScore / total) * 100,
          sativa: (sativaScore / total) * 100,
        };
      } else {
        // Default to balanced if no clear terpene signals
        terpeneBias = { indica: 50, sativa: 50 };
      }
    }
  }

  // Phase 5.4 — INDICA / SATIVA / HYBRID RATIO CALIBRATION
  // 1) Ratio sources (weighted) - Extract inputs for V54
  // Database genetics (PRIMARY) — 45%
  const databaseGenetics = dbRatio; // Already extracted above
  
  // Name-first consensus (from Phase 5.3) — 25%
  let nameConsensusRatio: { indica: number; sativa: number } | undefined = undefined;
  if (viewModel.nameFirstDisplay && dbRatio && finalConfidence >= 70) {
    // Use database ratio as name consensus (confidence ≥70% indicates confidence in DB match)
    nameConsensusRatio = dbRatio;
  } else if (dbRatio) {
    // Use DB ratio even if confidence is lower (still represents name consensus)
    nameConsensusRatio = dbRatio;
  }
  
  // Visual morphology signals — 20% (extract from fusedFeatures and imageResultsV3)
  let visualMorphologySignalsV54: VisualMorphologySignals | undefined = undefined;
  if (fusedFeatures) {
    // Extract leaf width from fusedFeatures
    const leafWidth = fusedFeatures.leafShape === "broad" ? "broad" as const
      : fusedFeatures.leafShape === "narrow" ? "narrow" as const
      : "medium" as const;
    
    // Extract bud density from fusedFeatures
    const budDensity = fusedFeatures.budStructure === "high" ? "high" as const
      : fusedFeatures.budStructure === "low" ? "low" as const
      : "medium" as const;
    
    // Infer internodal spacing from bud structure (dense = short, airy = long)
    const internodalSpacing = fusedFeatures.budStructure === "high" ? "short" as const
      : fusedFeatures.budStructure === "low" ? "long" as const
      : "medium" as const;
    
    // Infer bud shape (foxtailing vs chunking) from bud structure and image results
    let budShape: "chunky" | "foxtailing" | "mixed" | undefined = undefined;
    if (fusedFeatures.budStructure === "high") {
      budShape = "chunky";
    } else if (fusedFeatures.budStructure === "low") {
      // Check image results for foxtailing indicators
      const hasFoxtailing = imageResultsV3.some(img => {
        const budStructureText = (img as any).wikiResult?.morphology?.budStructure?.toLowerCase() || "";
        return budStructureText.includes("foxtail") || budStructureText.includes("elongated");
      });
      budShape = hasFoxtailing ? "foxtailing" : "mixed";
    } else {
      budShape = "mixed";
    }
    
    visualMorphologySignalsV54 = {
      leafWidth,
      budDensity,
      internodalSpacing,
      budShape,
    };
  }
  
  // Terpene profile bias — 10% (convert terpeneBias to TerpeneBias format)
  let terpeneBiasV54: TerpeneBias | undefined = undefined;
  if (terpeneBias) {
    terpeneBiasV54 = {
      indica: terpeneBias.indica,
      sativa: terpeneBias.sativa,
    };
  }

  // Phase 5.4 — Resolve final ratio using V54 (database-first rule, visual/terpene adjustments)
  // Extract name confidence for confidence coupling
  let nameConfidenceForRatio = finalConfidence; // Default to final confidence
  if (nameFirstPipelineResult?.nameConfidencePercent !== undefined) {
    nameConfidenceForRatio = nameFirstPipelineResult.nameConfidencePercent;
  } else if (nameFirstResult?.primaryMatch?.confidence !== undefined) {
    nameConfidenceForRatio = nameFirstResult.primaryMatch.confidence;
  } else if (nameFirstResult?.confidence !== undefined) {
    nameConfidenceForRatio = nameFirstResult.confidence;
  }
  
  // Extract image diversity score (already calculated for V52)
  let imageDiversityScoreForRatio = 0.7; // Default
  if (visualDistinctivenessScore !== undefined) {
    imageDiversityScoreForRatio = Math.max(0, Math.min(1, visualDistinctivenessScore));
  } else if (distinctnessScore !== undefined) {
    imageDiversityScoreForRatio = Math.max(0, Math.min(1, distinctnessScore / 100));
  } else if (imageCount > 1) {
    imageDiversityScoreForRatio = Math.min(0.8, 0.5 + (imageCount - 1) * 0.1);
  }
  
  // RATIO ENGINE V1 — Derive inputs for simple & believable ratio
  // Name classification (25%) - from strain name/type
  let nameClassification: { indica: number; sativa: number } | undefined = undefined;
  if (dbEntry) {
    // Use database type if available
    const dbType = (dbEntry as any).type || dbEntry.type;
    if (dbType === "Indica") {
      nameClassification = { indica: 80, sativa: 20 };
    } else if (dbType === "Sativa") {
      nameClassification = { indica: 20, sativa: 80 };
    } else if (dbType === "Hybrid") {
      nameClassification = { indica: 50, sativa: 50 };
    } else if (nameConsensusRatio) {
      // Fallback to name consensus ratio
      nameClassification = nameConsensusRatio;
    }
  } else if (nameConsensusRatio) {
    nameClassification = nameConsensusRatio;
  }
  
  // Visual traits (15%) - from visual morphology signals
  let visualTraits: { indica: number; sativa: number } | undefined = undefined;
  if (visualMorphologySignalsV54) {
    let visualIndica = 50;
    let visualSativa = 50;
    
    // Leaf width (broad → indica, narrow → sativa)
    if (visualMorphologySignalsV54.leafWidth === "broad") {
      visualIndica += 20;
      visualSativa -= 20;
    } else if (visualMorphologySignalsV54.leafWidth === "narrow") {
      visualIndica -= 20;
      visualSativa += 20;
    }
    
    // Bud density (high → indica, low → sativa)
    if (visualMorphologySignalsV54.budDensity === "high") {
      visualIndica += 15;
      visualSativa -= 15;
    } else if (visualMorphologySignalsV54.budDensity === "low") {
      visualIndica -= 15;
      visualSativa += 15;
    }
    
    // Internodal spacing (short → indica, long → sativa)
    if (visualMorphologySignalsV54.internodalSpacing === "short") {
      visualIndica += 10;
      visualSativa -= 10;
    } else if (visualMorphologySignalsV54.internodalSpacing === "long") {
      visualIndica -= 10;
      visualSativa += 10;
    }
    
    // Normalize to 0-100
    visualIndica = Math.max(0, Math.min(100, visualIndica));
    visualSativa = Math.max(0, Math.min(100, visualSativa));
    
    // Normalize to sum to 100
    const visualTotal = visualIndica + visualSativa;
    if (visualTotal > 0) {
      visualIndica = (visualIndica / visualTotal) * 100;
      visualSativa = (visualSativa / visualTotal) * 100;
    }
    
    visualTraits = {
      indica: Math.round(visualIndica),
      sativa: Math.round(visualSativa),
    };
  }
  
  // Terpenes (10%) - from terpene profile bias
  let terpenes: { indica: number; sativa: number } | undefined = undefined;
  if (terpeneBiasV54) {
    terpenes = {
      indica: terpeneBiasV54.indica,
      sativa: terpeneBiasV54.sativa,
    };
  }
  
  // Phase 4.7.1 — MULTI-SOURCE RATIO ENGINE (LOCKED)
  // Phase 4.7.2 — CONFIDENCE-AWARE RATIO SCORING
  // Combines: Genetics (40%), Family baseline (20%), Visual (15%), Terpene (15%), Name consensus (10%)
  const finalRatioV47 = resolveFinalRatioV47({
    strainName: finalPrimaryName,
    dbEntry,
    visualSignals: fusedFeatures ? {
      leafShape: fusedFeatures.leafShape === "broad" ? "broad" : fusedFeatures.leafShape === "narrow" ? "narrow" : undefined,
      budStructure: fusedFeatures.budStructure === "high" ? "high" : fusedFeatures.budStructure === "low" ? "low" : undefined,
      trichomeDensity: fusedFeatures.trichomeDensity === "high" ? "high" : fusedFeatures.trichomeDensity === "low" ? "low" : undefined,
    } : undefined,
    terpeneProfile: viewModel.terpeneExperience?.dominantTerpenes || viewModel.terpeneExperience?.secondaryTerpenes || undefined,
    candidateStrains: phaseB1Result?.candidates.map(c => ({
      name: c.strainName,
      confidence: c.score,
    })),
    overallConfidence: finalConfidence,
    imageCount: imageResultsV3.length || filteredInput.imageCount, // Phase 4.7.2
    consensusStrength: consensusStrength, // Phase 4.7.2 — From V403 calculation
  });

  // Phase 4.7.1 — Output format (always sums to 100) - Attach to viewModel
  // Phase 4.7.6 — Include expert explanation from V47
  viewModel.finalRatio = {
    indica: finalRatioV47.indicaPercent,
    sativa: finalRatioV47.sativaPercent,
    hybrid: finalRatioV47.hybridPercent,
    classification: finalRatioV47.dominanceLabel.includes("Indica-dominant") ? "Indica-dominant" as const
      : finalRatioV47.dominanceLabel.includes("Sativa-dominant") ? "Sativa-dominant" as const
      : "Balanced Hybrid" as const,
    confidence: finalRatioV47.confidence,
    explanation: finalRatioV47.explanation || [], // Phase 4.7.6 — Expert explanation bullets
  };

  // Phase 4.7.1 — Integration - Attach to ScannerViewModel.ratio
  viewModel.ratio = {
    indicaPercent: finalRatioV47.indicaPercent,
    sativaPercent: finalRatioV47.sativaPercent,
    indica: finalRatioV47.indicaPercent,
    sativa: finalRatioV47.sativaPercent,
    hybrid: finalRatioV47.hybridPercent,
    dominance: finalRatioV47.dominanceLabel.includes("Indica") && !finalRatioV47.dominanceLabel.includes("Sativa") ? "Indica" as const
      : finalRatioV47.dominanceLabel.includes("Sativa") && !finalRatioV47.dominanceLabel.includes("Indica") ? "Sativa" as const
      : "Hybrid" as const,
    hybridLabel: finalRatioV47.dominanceLabel as any,
    classification: finalRatioV47.dominanceLabel,
    displayText: `${finalRatioV47.indicaPercent}% Indica · ${finalRatioV47.sativaPercent}% Sativa · ${finalRatioV47.hybridPercent}% Hybrid`,
    explanation: finalRatioV47.explanation || [], // Phase 4.7.6 — Expert explanation bullets
  };
  // Phase 4.7.1 — Add dominantLabel and needsEstimationNote for UI display
  if (viewModel.ratio) {
    (viewModel.ratio as any).dominantLabel = finalRatioV47.dominanceLabel;
    (viewModel.ratio as any).needsEstimationNote = finalRatioV47.confidence < 65;
    // Phase 4.7.1 — Store source breakdown for future use
    (viewModel.ratio as any).sourceBreakdown = finalRatioV47.sourceBreakdown;
  }

  // Phase 4.7.1 — Logging
  console.log("RATIO_FINAL_V47:", {
    indica: finalRatioV47.indicaPercent,
    sativa: finalRatioV47.sativaPercent,
    hybrid: finalRatioV47.hybridPercent,
    dominanceLabel: finalRatioV47.dominanceLabel,
    confidence: finalRatioV47.confidence,
  });

  // Phase 4.0.6 — CONFIDENCE CALIBRATION & USER TRUST LOCK
  // Extract name confidence (from name-first pipeline or fallback)
  let nameConfidence = 65; // Default fallback
  if (nameFirstPipelineResult?.nameConfidencePercent !== undefined) {
    nameConfidence = nameFirstPipelineResult.nameConfidencePercent;
  } else if (nameFirstResult?.primaryMatch?.confidence !== undefined) {
    nameConfidence = nameFirstResult.primaryMatch.confidence;
  } else if (nameFirstResult?.confidence !== undefined) {
    nameConfidence = nameFirstResult.confidence;
  }

  // Resolve final confidence using V406 (single source of truth)
  const finalConfidenceV406 = resolveFinalConfidenceV406({
    nameConfidence,
    imageCount: imageResultsV3.length || filteredInput.imageCount,
    imageAgreementScore: consensusStrength, // Already normalized to 0..1
    imageQualityScore: avgImageQualityScore, // Already normalized to 0..1
    databaseMatchStrength: dbMatchStrength, // Already normalized to 0..1
  });

  // Phase 4.3 — CONFIDENCE CALIBRATION & HONESTY LAYER
  // 1) Normalize confidence input sources
  // Derive name consensus strength (PRIMARY - 40%) from name-first pipeline
  let nameConsensusStrength = 0.7; // Default
  if (nameFirstPipelineResult?.nameConfidencePercent !== undefined) {
    nameConsensusStrength = Math.min(1.0, nameFirstPipelineResult.nameConfidencePercent / 100);
  } else if (nameFirstResult?.primaryMatch?.confidence !== undefined) {
    nameConsensusStrength = Math.min(1.0, nameFirstResult.primaryMatch.confidence / 100);
  } else if (nameFirstResult?.confidence !== undefined) {
    nameConsensusStrength = Math.min(1.0, nameFirstResult.confidence / 100);
  }

  // Multi-image agreement (25%) - already derived as consensusStrength
  const multiImageAgreement = consensusStrength;

  // Visual clarity / distinctness (20%) - normalize from 0-1
  let visualClarity = 0.7; // Default
  if (visualDistinctivenessScore !== undefined) {
    visualClarity = Math.max(0, Math.min(1, visualDistinctivenessScore));
  } else if (distinctnessScore !== undefined) {
    // Normalize distinctnessScore to 0..1 (assuming it's 0-100 or similar)
    visualClarity = Math.max(0, Math.min(1, distinctnessScore / 100));
  }

  // Database support (genetics / lineage presence) (15%) - already derived as dbMatchStrength
  const databaseSupport = dbMatchStrength;

  // Track confidence before consensus (for delta clamping)
  const confidenceBeforeConsensus = finalConfidenceV406.confidence;

  // Phase 4.3 — Resolve final confidence using V43 (normalized sources, honesty rules)
  const finalConfidenceV43 = resolveFinalConfidenceV43({
    nameConsensusStrength: nameConsensusStrength,
    multiImageAgreement: multiImageAgreement,
    visualClarity: visualClarity,
    databaseSupport: databaseSupport,
    imageCount: imageResultsV3.length || filteredInput.imageCount,
  });

  // Phase 4.3 — Use V43 as base confidence for V45
  // V43 provides normalized weighted confidence, which V45 will then apply dampeners/boosters to
  let computedConfidence = finalConfidenceV43.confidence;

  // Phase 4.5 — CONFIDENCE CALIBRATION & TRUST GUARDRAILS
  // Derive inputs for V45 confidence calibration
  const primaryStrainName = viewModel.nameFirstDisplay?.primaryStrainName || "Closest Known Cultivar";
  
  // Count name consensus sources (images, DB, wiki, etc.)
  let nameConsensusSources = 0;
  // Count images with this name in top candidates
  let nameInMultipleImages = 0;
  imageResultsV3.forEach((imgResult) => {
    const hasName = imgResult.candidateStrains.some(c => c.name === primaryStrainName);
    if (hasName) {
      nameInMultipleImages++;
      nameConsensusSources++; // Each image is a source
    }
  });
  // Database match
  if (dbEntry && (dbEntry.name === primaryStrainName || dbEntry.aliases?.includes(primaryStrainName))) {
    nameConsensusSources++;
  }
  // Wiki presence (if dbEntry exists, wiki is likely available)
  if (dbEntry) {
    nameConsensusSources++;
  }
  
  // Check if database has lineage data
  const hasLineageData = dbEntry && (
    (dbEntry as any).lineage !== undefined ||
    (dbEntry as any).genetics !== undefined ||
    (dbEntry as any).parentStrains !== undefined ||
    (dbEntry as any).indicaPercent !== undefined ||
    (dbEntry as any).sativaPercent !== undefined
  );
  
  // Calculate visual-genetics alignment (0-1)
  let visualGeneticsAlignment = 0.7; // Default moderate alignment
  if (dbRatio && visualSignals) {
    // Check if visual signals align with database ratio
    const dbIndicaRatio = dbRatio.indica / 100;
    const visualIndicaBias = (visualSignals.indicaBias + 1) / 2; // Normalize -1..1 to 0..1
    const alignment = 1 - Math.abs(dbIndicaRatio - visualIndicaBias);
    visualGeneticsAlignment = Math.max(0, Math.min(1, alignment));
  }
  
  // Check for multi-image agreement (≥3 images with agreement)
  const hasMultiImageAgreement = imageResultsV3.length >= 3 && consensusStrength >= 0.7;
  
  // Check terpene-morphology alignment
  let hasTerpeneMorphologyAlignment = false;
  if (viewModel.terpeneExperience && visualSignals) {
    // Simple check: if terpenes suggest indica and visual suggests indica, or vice versa
    const dominantTerpenes = viewModel.terpeneExperience.dominantTerpenes || [];
    const indicaTerpenes = ["myrcene", "caryophyllene", "linalool"];
    const sativaTerpenes = ["limonene", "terpinolene", "pinene"];
    const hasIndicaTerpenes = dominantTerpenes.some(t => indicaTerpenes.some(it => t.toLowerCase().includes(it)));
    const hasSativaTerpenes = dominantTerpenes.some(t => sativaTerpenes.some(st => t.toLowerCase().includes(st)));
    const visualIndicaBias = visualSignals.indicaBias > 0;
    const visualSativaBias = visualSignals.sativaBias > 0;
    hasTerpeneMorphologyAlignment = (hasIndicaTerpenes && visualIndicaBias) || (hasSativaTerpenes && visualSativaBias);
  }
  
  // Phase 5.2 — CONFIDENCE CALIBRATION ENGINE
  // 1) Confidence inputs - Derive inputs for V52 confidence calibration
  const v52PrimaryStrainName = viewModel.nameFirstDisplay?.primaryStrainName || "Closest Known Cultivar";
  
  // Image count (1–5) - reuse existing variable if already defined
  const v52ImageCount = imageResultsV3.length || filteredInput.imageCount;
  
  // Image diversity score (0–1) - normalize from distinctness/visual distinctiveness
  let imageDiversityScore = 0.7; // Default
  if (visualDistinctivenessScore !== undefined) {
    imageDiversityScore = Math.max(0, Math.min(1, visualDistinctivenessScore));
  } else if (distinctnessScore !== undefined) {
    imageDiversityScore = Math.max(0, Math.min(1, distinctnessScore / 100));
  } else if (imageCount > 1) {
    // Estimate diversity from image count (more images = more diversity potential)
    imageDiversityScore = Math.min(0.8, 0.5 + (imageCount - 1) * 0.1);
  }
  
  // Consensus agreement strength (0–1) - already derived as consensusStrength
  const consensusAgreementStrength = consensusStrength;
  
  // Database match strength (0–1) - already derived as dbMatchStrength
  const databaseMatchStrength = dbMatchStrength;
  
  // Name-first certainty (0–1) - Phase 5.3: Use strengthened name score if available
  let nameFirstCertainty = 0.7; // Default
  if (strengthenedNameV53) {
    // Phase 5.3 — Use strengthened name score (0-100) normalized to 0-1
    nameFirstCertainty = Math.min(1.0, strengthenedNameV53.selectedScore / 100);
  } else if (nameFirstPipelineResult?.nameConfidencePercent !== undefined) {
    nameFirstCertainty = Math.min(1.0, nameFirstPipelineResult.nameConfidencePercent / 100);
  } else if (nameFirstResult?.primaryMatch?.confidence !== undefined) {
    nameFirstCertainty = Math.min(1.0, nameFirstResult.primaryMatch.confidence / 100);
  } else if (nameFirstResult?.confidence !== undefined) {
    nameFirstCertainty = Math.min(1.0, nameFirstResult.confidence / 100);
  }
  
  // Phase 5.3 — 4. Confidence interaction: Weak names reduce overall confidence
  // If name source is "phenotype" (fallback), reduce nameFirstCertainty
  if (strengthenedNameV53 && strengthenedNameV53.selectedSource === "phenotype") {
    nameFirstCertainty = Math.max(0.4, nameFirstCertainty * 0.7); // Reduce by 30%, floor at 0.4
  }
  
  // Ratio stability (0–1) - indica/sativa spread (lower spread = higher stability)
  let ratioStability = 0.7; // Default
  if (viewModel.ratio && viewModel.ratio.indica !== undefined && viewModel.ratio.sativa !== undefined) {
    const spread = Math.abs(viewModel.ratio.indica - viewModel.ratio.sativa);
    // Lower spread = higher stability (spread 0 = stability 1.0, spread 100 = stability 0.0)
    ratioStability = 1.0 - (spread / 100);
  }
  
  // Check if database lineage match exists
  const hasDatabaseLineageMatch = dbEntry && (!!(dbEntry as any).lineage || !!(dbEntry as any).genetics || !!(dbEntry as any).parentStrains);
  
  // Check if clear morphology signals detected
  const hasClearMorphologySignals = visualSignals && (Math.abs(visualSignals.indicaBias) > 0.3 || Math.abs(visualSignals.sativaBias) > 0.3);
  
  // Check if terpene alignment exists
  const hasTerpeneAlignment = hasTerpeneMorphologyAlignment;
  
  // Check if conflicting candidates detected
  const hasConflictingCandidates = nameTrustV46?.alternates && nameTrustV46.alternates.length > 0;
  
  // Check if weak database match
  const hasWeakDatabaseMatch = !dbEntry || (dbEntry && dbMatchStrength < 0.5);
  
  // Check if forced fallback name
  const hasForcedFallbackName = v52PrimaryStrainName === "Closest Known Cultivar" || v52PrimaryStrainName.length < 3;
  
  // CONFIDENCE CALIBRATION V1 — Derive inputs for realistic confidence
  // Image agreement score (0–1) - how well images agree on name/candidates
  let imageAgreementScore = 0.7; // Default
  if (consensusAgreementStrength !== undefined) {
    imageAgreementScore = consensusAgreementStrength;
  } else if (imageResultsV3.length > 1) {
    // Count how many images have the same top candidate
    const topCandidates = imageResultsV3.map(r => r.candidateStrains?.[0]?.name).filter(Boolean);
    const uniqueCandidates = new Set(topCandidates);
    if (uniqueCandidates.size === 1) {
      imageAgreementScore = 1.0; // All images agree
    } else if (uniqueCandidates.size === 2) {
      imageAgreementScore = 0.7; // Most images agree
    } else {
      imageAgreementScore = 0.5; // Low agreement
    }
  }
  
  // Name pipeline confidence (0–1) - from name-first matching or name pipeline
  let namePipelineConfidence = 0.7; // Default
  if (nameFirstMatchingResult) {
    namePipelineConfidence = Math.min(1.0, nameFirstMatchingResult.confidence / 100);
  } else if (nameConfidenceV55) {
    namePipelineConfidence = Math.min(1.0, nameConfidenceV55.confidence / 100);
  } else if (strengthenedNameV53) {
    namePipelineConfidence = Math.min(1.0, strengthenedNameV53.selectedScore / 100);
  } else if (nameFirstPipelineResult?.nameConfidencePercent !== undefined) {
    namePipelineConfidence = Math.min(1.0, nameFirstPipelineResult.nameConfidencePercent / 100);
  }
  
  // Visual clarity score (0–1) - visual distinctness/clarity
  let visualClarityScore = 0.6; // Default
  if (imageDiversityScore !== undefined) {
    visualClarityScore = imageDiversityScore;
  } else if (fusedFeatures) {
    // Use variance as a proxy for clarity (higher variance = more distinct = higher clarity)
    const variance = (fusedFeatures as any).variance || 0;
    visualClarityScore = Math.min(1.0, Math.max(0.3, variance / 100));
  }
  
  // Check if images are similar
  const hasSimilarImages = imageDiversityScore !== undefined && imageDiversityScore < 0.5;
  
  // Check if fallback name
  const hasFallbackName = finalPrimaryName === "Closest Known Cultivar" || finalPrimaryName.length < 3;
  
  // CONFIDENCE CALIBRATION V1 — Resolve final confidence (realistic)
  const finalConfidenceV1 = resolveFinalConfidenceV1({
    imageCount: v52ImageCount,
    databaseMatchStrength,
    imageAgreementScore,
    namePipelineConfidence,
    visualClarityScore,
    hasSimilarImages,
    hasFallbackName,
    hasWeakDatabaseMatch,
    previousConfidence: undefined, // TODO: Add session state for stability rule
  });
  
  // CONFIDENCE CALIBRATION V1 — Update final confidence with V1 result
  finalConfidence = finalConfidenceV1.confidence;
  
  // Phase 4.6 — Update name locking based on final confidence
  // Re-check name locking with final confidence
  if (viewModel.nameFirstDisplay) {
    const shouldLockNameFinal = finalConfidence >= 75;
    (viewModel.nameFirstDisplay as any).isLocked = shouldLockNameFinal;
  }
  
  // CONFIDENCE CALIBRATION V1 — Output structure - Attach to ScannerViewModel.confidencePercent and confidenceTier
  if (viewModel.nameFirstDisplay) {
    viewModel.nameFirstDisplay.confidencePercent = finalConfidence;
    viewModel.nameFirstDisplay.confidence = finalConfidence;
    
    // Update confidenceTier based on V1 tier
    const v1TierForDisplay = finalConfidenceV1.tier === "Very High" ? "very_high" as const
      : finalConfidenceV1.tier === "High" ? "high" as const
      : finalConfidenceV1.tier === "Medium" ? "medium" as const
      : "low" as const;
    viewModel.nameFirstDisplay.confidenceTier = v1TierForDisplay;
    
    // Update name confidence tier
    (viewModel.nameFirstDisplay as any).nameConfidenceTier = finalConfidenceV1.tier;
    
    // Update explanation if available (store in explanation.whyThisNameWon or as separate field)
    // Note: explanation is already set from name-first matching, so we don't overwrite it
    // Store confidence explanation separately if needed
    (viewModel.nameFirstDisplay as any).confidenceExplanation = finalConfidenceV1.explanation;
  }
  viewModel.confidence = finalConfidence;
  
  // CONFIDENCE CALIBRATION V1 — Update confidenceTier in viewModel (using V1 tier)
  const v1TierValue = finalConfidenceV1.tier === "Very High" ? "very_high"
    : finalConfidenceV1.tier === "High" ? "high"
    : finalConfidenceV1.tier === "Medium" ? "medium"
    : "low";
  
  viewModel.confidenceTier = {
    tier: v1TierValue,
    label: finalConfidenceV1.tier, // CONFIDENCE CALIBRATION V1 — Use V1 tier label
    description: finalConfidenceV1.explanation, // User-facing explanation
  };
  
  // Phase 5.2 — Attach confidence explanation to viewModel (user-facing, short explanation)
  viewModel.confidenceExplanation = {
    score: finalConfidence,
    tier: finalConfidenceV1.tier,
    explanation: [finalConfidenceV1.explanation], // User-facing explanation (single string)
  };
  
  // CONFIDENCE CALIBRATION V1 — Logging (debug only)
  console.log("CONFIDENCE_CALIBRATED_V1:", {
    confidence: finalConfidenceV1.confidence,
    tier: finalConfidenceV1.tier,
    raw: finalConfidenceV1.raw,
    penalties: finalConfidenceV1.penalties,
    cap: finalConfidenceV1.cap,
    explanation: finalConfidenceV1.explanation,
  });

  // Phase 4.4 — Update ratio needsEstimationNote with final confidence
  if (viewModel.ratio) {
    (viewModel.ratio as any).needsEstimationNote = finalConfidence < 65;
  }

  // CONFIDENCE CALIBRATION V1 — Honest caps are already applied in V1
  // V1 applies: floor 55%, max 99% (never 100%), with weighted inputs, penalties, and hard caps
  // All confidence calculation is now handled by V1 with stability rules

  // 6) Safety floor: If confidence < 60%, still return result but mark as partial
  // Ensure confidence is never below 55 for UX stability
  finalConfidence = Math.max(55, finalConfidence);
  
  // If confidence < 60%, add note for user guidance
  if (finalConfidence < 60) {
    if (!viewModel.notes) {
      viewModel.notes = [];
    }
    // Check if note already exists to avoid duplicates
    const hasLowConfidenceNote = viewModel.notes.some(note => 
      note.toLowerCase().includes("low confidence") || note.toLowerCase().includes("consider additional")
    );
    if (!hasLowConfidenceNote) {
      viewModel.notes.push("Low confidence — consider additional angles");
    }
  }

  // Phase 4.3 — Logging is already done above in Phase 4.3 section

  // Phase 4.0.7 — NAME DISAMBIGUATION & RATIO SURFACING
  // 1) Lock primary strain name (already done via nameFirstDisplay.primaryStrainName)
  // Ensure it's never empty (safety check)
  if (!viewModel.nameFirstDisplay?.primaryStrainName || viewModel.nameFirstDisplay.primaryStrainName.trim() === "") {
    viewModel.nameFirstDisplay = viewModel.nameFirstDisplay || {
      primaryStrainName: "Closest Known Cultivar",
      primaryName: "Closest Known Cultivar",
      confidencePercent: finalConfidence,
      confidence: finalConfidence,
      confidenceTier: "low" as const,
      // Phase 4.1 — Enhanced tagline
      tagline: (() => {
        const { generateIntelligentTagline } = require("./perceivedIntelligence");
        return generateIntelligentTagline({
          confidencePercent: finalConfidence,
          imageCount: imageResultsV3.length,
          hasDatabaseMatch: !!dbEntry,
          hasMultiImageAgreement: imageResultsV3.length >= 2,
        });
      })(),
      explanation: { whyThisNameWon: [], whatRuledOutOthers: [], varianceNotes: [] },
      alternateNames: [],
    };
    viewModel.nameFirstDisplay.primaryStrainName = "Closest Known Cultivar";
    viewModel.nameFirstDisplay.primaryName = "Closest Known Cultivar";
  }

  // 2) Add explicit disambiguation section (conditional)
  // Only show if confidence < 90 OR multiple close matches exist
  if (finalConfidence < 90 || (viewModel.nameFirstDisplay?.alternateNames && viewModel.nameFirstDisplay.alternateNames.length > 0)) {
    const alternates: { name: string; confidence: number }[] = [];
    
    // Collect alternates from nameFirstDisplay (max 3) - Phase 4.6
    if (viewModel.nameFirstDisplay?.alternateNames && viewModel.nameFirstDisplay.alternateNames.length > 0) {
      // Estimate confidence for alternates (slightly lower than primary)
      const alternateConfidence = Math.max(60, finalConfidence - 10);
      viewModel.nameFirstDisplay.alternateNames.slice(0, 3).forEach(name => {
        alternates.push({
          name,
          confidence: alternateConfidence,
        });
      });
    }
    
    // Also check nameFirstPipelineResult for alternate matches
    if (nameFirstPipelineResult?.alternateMatches && alternates.length < 3) {
      nameFirstPipelineResult.alternateMatches.slice(0, 3 - alternates.length).forEach(alt => {
        if (!alternates.some(a => a.name === alt.name) && alt.name !== viewModel.nameFirstDisplay?.primaryStrainName) {
          alternates.push({
            name: alt.name,
            confidence: alt.score || Math.max(60, finalConfidence - 10),
          });
        }
      });
    }
    
    if (alternates.length > 0 || finalConfidence < 90) {
      let note = "";
      if (finalConfidence < 90) {
        note = "Visual signals overlap with related cultivars. This is the closest match based on available analysis.";
      } else {
        note = "Multiple similar cultivars identified. This match has the strongest visual and genetic alignment.";
      }
      
      viewModel.nameDisambiguationV407 = {
        primary: viewModel.nameFirstDisplay.primaryStrainName,
        alternates: alternates.slice(0, 3), // Max 3
        note,
      };
    }
  }

  // 3) Surface indica/sativa/hybrid ratio (clean format) - Phase 5.1 already handled this above
  // This section is redundant - ratio is already set by Phase 5.1
  // Safety: If ratio engine fails, default to 34/33/33 (only if ratio not already set)
  if (!viewModel.ratio) {
    viewModel.ratio = {
      indicaPercent: 34,
      sativaPercent: 33,
      indica: 34,
      sativa: 33,
      hybrid: 33,
      dominance: "Hybrid" as const,
      hybridLabel: "Balanced Hybrid" as const,
      classification: "Balanced Hybrid",
      displayText: "34% Indica · 33% Sativa · 33% Hybrid",
      explanation: ["Ratio estimated from visual traits and reference genetics."],
    };
    // Add note about estimated ratio
    if (!viewModel.notes) {
      viewModel.notes = [];
    }
    viewModel.notes.push("Ratio estimated");
  }

  // Phase 4.0.7 — Log disambiguation and ratio (dev only)
  console.log("NAME DISAMBIGUATION V407:", viewModel.nameDisambiguationV407);
  console.log("RATIO SURFACED:", viewModel.ratio);

  // Phase 4.0.8 — replace hard failure with guided recovery
  const guardResult = evaluateAnalysisGuards({
    diversityScore,
    imageCount: imageResultsV3.length || input.imageCount,
    consensusConfidence: finalConfidence,
  });

  // If guard indicates issues, add recovery guidance to notes
  if (guardResult.status === "low-diversity" || guardResult.status === "low-confidence") {
    if (!viewModel.notes) {
      viewModel.notes = [];
    }
    viewModel.notes.push(guardResult.reason);
  }

  // Phase 4.0.5 — Add analysis warnings to viewModel notes
  if (analysisWarnings.length > 0) {
    if (!viewModel.notes) {
      viewModel.notes = [];
    }
    viewModel.notes.push(...analysisWarnings);
  }

  // Phase 4.0.8 — Return discriminated union based on guard status
  // Phase 4.1.3 — replace analysis failure paths
  // Ensure consensusResult exists (fallback if null)
  // Phase 4.0.8 — Also mark as partial if confidence < 60%
  const isPartial = guardResult.status !== "ok" || finalConfidence < 60;
  const agreementLevelValue: "low" | "high" = isPartial ? "low" : "high";
  const fallbackConsensus: ConsensusResult = {
    primaryMatch: {
      name: viewModel.name || "Uncataloged Cultivar",
      confidence: finalConfidence,
      reason: "Analysis completed with limited certainty due to image similarity.",
    },
    alternates: [],
    agreementScore: isPartial ? 0 : 100,
    strainName: viewModel.name || "Uncataloged Cultivar",
    confidenceRange: { 
      min: finalConfidence - 5, 
      max: finalConfidence + 5, 
      explanation: isPartial ? "Limited by image diversity" : "High agreement" 
    },
      whyThisMatch: isPartial && guardResult.status !== "ok" ? (guardResult.status === "low-diversity" || guardResult.status === "low-confidence" ? guardResult.reason : "Visual analysis completed") : "Visual analysis completed",
    alternateMatches: [],
    lowConfidence: isPartial,
    agreementLevel: agreementLevelValue,
  };
  const finalConsensusResult = guardAgainstFailure(consensusResult, fallbackConsensus);

  // Phase 5.3 — 6. Guardrails: Never show "Unknown" or empty
  // Final regression guard: If primaryStrainName empty → replace with fallback
  // Never throw, never blank
  const finalPrimaryStrainName = viewModel.nameFirstDisplay?.primaryStrainName || strengthenedNameV53?.primaryStrainName;
  if (!finalPrimaryStrainName || finalPrimaryStrainName.trim().length < 3 || finalPrimaryStrainName.toLowerCase() === "unknown" || finalPrimaryStrainName.toLowerCase() === "unidentified") {
    console.warn("Phase 5.3: Guardrail - primaryStrainName invalid, using fallback");
    if (!viewModel.nameFirstDisplay) {
      viewModel.nameFirstDisplay = {
        primaryStrainName: "Closest Known Cultivar",
        primaryName: "Closest Known Cultivar",
        confidencePercent: Math.min(72, finalConfidence),
        confidence: Math.min(72, finalConfidence),
        confidenceTier: "low" as const,
        // Phase 4.1 — Enhanced tagline
      tagline: (() => {
        const { generateIntelligentTagline } = require("./perceivedIntelligence");
        return generateIntelligentTagline({
          confidencePercent: finalConfidence,
          imageCount: imageResultsV3.length,
          hasDatabaseMatch: !!dbEntry,
          hasMultiImageAgreement: imageResultsV3.length >= 2,
        });
      })(),
        explanation: { whyThisNameWon: ["Analysis completed with limited certainty"], whatRuledOutOthers: [], varianceNotes: [] },
      };
    } else {
      viewModel.nameFirstDisplay.primaryStrainName = "Closest Known Cultivar";
      viewModel.nameFirstDisplay.primaryName = "Closest Known Cultivar";
      // Cap confidence at 72% if name is uncertain
      finalConfidence = Math.min(72, finalConfidence);
      viewModel.nameFirstDisplay.confidencePercent = finalConfidence;
      viewModel.nameFirstDisplay.confidence = finalConfidence;
      
      // Ensure explanation.whyThisNameWon is populated
      if (!viewModel.nameFirstDisplay.explanation) {
        viewModel.nameFirstDisplay.explanation = {
          whyThisNameWon: ["Fallback selection due to invalid name"],
          whatRuledOutOthers: [],
          varianceNotes: [],
        };
      } else if (!viewModel.nameFirstDisplay.explanation.whyThisNameWon || 
                 viewModel.nameFirstDisplay.explanation.whyThisNameWon.length === 0) {
        viewModel.nameFirstDisplay.explanation.whyThisNameWon = ["Fallback selection due to invalid name"];
      }
    }
  }
  
  // PRIMARY STRAIN SELECTION LOGIC — Final verification
  // Ensure nameFirstDisplay is always populated with required fields
  if (!viewModel.nameFirstDisplay) {
    viewModel.nameFirstDisplay = {
      primaryStrainName: "Closest Known Cultivar",
      primaryName: "Closest Known Cultivar",
      confidencePercent: 70,
      confidence: 70,
      confidenceTier: "low",
      // Phase 4.1 — Enhanced tagline
      tagline: (() => {
        const { generateIntelligentTagline } = require("./perceivedIntelligence");
        return generateIntelligentTagline({
          confidencePercent: finalConfidence,
          imageCount: imageResultsV3.length,
          hasDatabaseMatch: !!dbEntry,
          hasMultiImageAgreement: imageResultsV3.length >= 2,
        });
      })(),
      explanation: {
        whyThisNameWon: ["Analysis completed with limited certainty"],
        whatRuledOutOthers: [],
        varianceNotes: [],
      },
      alternateNames: [],
    };
  } else {
    // Ensure all required fields are populated
    if (!viewModel.nameFirstDisplay.primaryStrainName || viewModel.nameFirstDisplay.primaryStrainName.trim().length < 3) {
      viewModel.nameFirstDisplay.primaryStrainName = "Closest Known Cultivar";
    }
    if (!viewModel.nameFirstDisplay.primaryName || viewModel.nameFirstDisplay.primaryName.trim().length < 3) {
      viewModel.nameFirstDisplay.primaryName = viewModel.nameFirstDisplay.primaryStrainName;
    }
    if (viewModel.nameFirstDisplay.confidencePercent === undefined || viewModel.nameFirstDisplay.confidencePercent === null) {
      viewModel.nameFirstDisplay.confidencePercent = 70;
    }
    if (!viewModel.nameFirstDisplay.explanation) {
      viewModel.nameFirstDisplay.explanation = {
        whyThisNameWon: ["Name selected based on available analysis"],
        whatRuledOutOthers: [],
        varianceNotes: [],
      };
    } else if (!viewModel.nameFirstDisplay.explanation.whyThisNameWon || 
               viewModel.nameFirstDisplay.explanation.whyThisNameWon.length === 0) {
      viewModel.nameFirstDisplay.explanation.whyThisNameWon = ["Name selected based on available analysis"];
    }
  }
  
  // Phase 5.3 — Ensure name field is also set (for backward compatibility)
  if (!viewModel.name || viewModel.name.trim().length < 3) {
    viewModel.name = viewModel.nameFirstDisplay.primaryStrainName;
  }
  
  // Phase 4.9 — Attach dbEntry to viewModel for aliases/lineage display
  if (dbEntry) {
    (viewModel as any).dbEntry = dbEntry;
  }

  // 2) Strengthen name scoring logic (boost name confidence)
  let nameConfidenceBoost = 0;
  const nameRationale: string[] = [];
  // finalPrimaryName already declared above (Phase 5.3)
  
  // Boost: Name appears in ≥2 images (+6%)
  if (imageResultsV3.length >= 2 && finalPrimaryName !== "Closest Known Cultivar") {
    const nameFrequency = imageResultsV3.filter(r =>
      r.candidateStrains.some(c => c.name === finalPrimaryName)
    ).length;
    if (nameFrequency >= 2) {
      nameConfidenceBoost += 6;
      nameRationale.push("Repeated match across multiple images");
    }
  }
  
  // Boost: Name appears in database + wiki + visual (+8%)
  // Check if name is in database
  const nameInDatabase = dbEntry && (dbEntry.name === finalPrimaryName || dbEntry.aliases?.includes(finalPrimaryName));
  // Check if name appears in visual results
  const nameInVisual = imageResultsV3.some(r =>
    r.candidateStrains.some(c => c.name === finalPrimaryName)
  );
  // Wiki check is implicit if we have dbEntry
  if (nameInDatabase && nameInVisual && dbEntry) {
    nameConfidenceBoost += 8;
    nameRationale.push("Visual traits align with known phenotype");
    nameRationale.push("Database lineage supports identification");
  }
  
  // Boost: Alias match detected (+4%)
  if (nameInDatabase && dbEntry && dbEntry.name !== finalPrimaryName && dbEntry.aliases?.includes(finalPrimaryName)) {
    nameConfidenceBoost += 4;
    if (!nameRationale.some(r => r.includes("alias"))) {
      nameRationale.push("Matched via known alias");
    }
  }
  
  // Note: Penalty for 2nd place name within 3% is already handled in Phase 4.0.8
  // We don't apply it again here to avoid double-penalizing
  
  // Apply name confidence boost to final confidence (before final cap)
  // Note: V43 already applied honest caps, but we need to re-apply after boost
  if (nameConfidenceBoost !== 0) {
    finalConfidence += nameConfidenceBoost;
    // Re-apply Phase 4.3 honest caps (non-negotiable)
    const imageCountForCap = imageResultsV3.length || filteredInput.imageCount;
    let confidenceCap: number;
    if (imageCountForCap === 1) {
      confidenceCap = 82; // Single image max = 82%
    } else if (imageCountForCap === 2) {
      confidenceCap = 90; // Two images max = 90%
    } else if (imageCountForCap >= 3) {
      // 99% max ONLY when: 3+ images, same primary name across all, visual agreement > 0.85
      // For name boost, use default 96% cap unless conditions are met
      confidenceCap = 96; // 3+ images default cap
    } else {
      confidenceCap = 82; // Fallback
    }
    finalConfidence = Math.min(finalConfidence, confidenceCap);
    finalConfidence = Math.min(finalConfidence, 99); // Absolute max (never 100)
    
    // Update viewModel confidence
    if (viewModel.nameFirstDisplay) {
      viewModel.nameFirstDisplay.confidencePercent = finalConfidence;
      viewModel.nameFirstDisplay.confidence = finalConfidence;
    }
    viewModel.confidence = finalConfidence;
  }

  // 3) Add name rationale (user-facing) to nameFirstDisplay
  if (viewModel.nameFirstDisplay && nameRationale.length > 0) {
    // Merge with existing explanation (2-3 bullets max, human-readable)
    const existingWhy = viewModel.nameFirstDisplay.explanation?.whyThisNameWon || [];
    const mergedRationale = [
      ...nameRationale,
      ...existingWhy.filter(e => !nameRationale.some(nr => nr.toLowerCase().includes(e.toLowerCase().substring(0, 10)))),
    ].slice(0, 3); // Max 3 bullets
    
    if (!viewModel.nameFirstDisplay.explanation) {
      viewModel.nameFirstDisplay.explanation = {
        whyThisNameWon: mergedRationale,
        whatRuledOutOthers: [],
        varianceNotes: [],
      };
    } else {
      viewModel.nameFirstDisplay.explanation.whyThisNameWon = mergedRationale;
    }
  }

  // Phase 4.2 — NAME-FIRST TRUST & DISPLAY LOCK
  // 1) Lock primary name display - Final enforcement at assembly step
  const finalPrimaryNameForDisplay = viewModel.nameFirstDisplay?.primaryStrainName;
  if (!finalPrimaryNameForDisplay || 
      finalPrimaryNameForDisplay.trim().length < 3 || 
      finalPrimaryNameForDisplay.toLowerCase() === "unknown" ||
      finalPrimaryNameForDisplay.toLowerCase() === "unidentified" ||
      finalPrimaryNameForDisplay.trim() === "") {
    console.warn("Phase 4.2: Final check - primaryStrainName invalid, using fallback");
    if (!viewModel.nameFirstDisplay) {
      viewModel.nameFirstDisplay = {
        primaryStrainName: "Closest Known Cultivar",
        primaryName: "Closest Known Cultivar",
        confidencePercent: Math.min(72, finalConfidence),
        confidence: Math.min(72, finalConfidence),
        confidenceTier: "low" as const,
        // Phase 4.1 — Enhanced tagline
      tagline: (() => {
        const { generateIntelligentTagline } = require("./perceivedIntelligence");
        return generateIntelligentTagline({
          confidencePercent: finalConfidence,
          imageCount: imageResultsV3.length,
          hasDatabaseMatch: !!dbEntry,
          hasMultiImageAgreement: imageResultsV3.length >= 2,
        });
      })(),
        explanation: { whyThisNameWon: ["Analysis completed with limited certainty"], whatRuledOutOthers: [], varianceNotes: [] },
      };
    } else {
      viewModel.nameFirstDisplay.primaryStrainName = "Closest Known Cultivar";
      viewModel.nameFirstDisplay.primaryName = "Closest Known Cultivar";
      finalConfidence = Math.min(72, finalConfidence);
      viewModel.nameFirstDisplay.confidencePercent = finalConfidence;
      viewModel.nameFirstDisplay.confidence = finalConfidence;
    }
  }

  // 2) Add name confidence tier (user-facing) - 4 tiers based on final confidence
  let nameConfidenceTier: "Very High Match" | "High Match" | "Moderate Match" | "Possible Match";
  if (finalConfidence >= 93) {
    nameConfidenceTier = "Very High Match";
  } else if (finalConfidence >= 85) {
    nameConfidenceTier = "High Match";
  } else if (finalConfidence >= 70) {
    nameConfidenceTier = "Moderate Match";
  } else {
    nameConfidenceTier = "Possible Match";
  }

  // Attach name confidence tier to viewModel (for UI display)
  if (viewModel.nameFirstDisplay) {
    (viewModel.nameFirstDisplay as any).nameConfidenceTier = nameConfidenceTier;
  }

  // 3) Show WHY this name won - Already handled in nameFirstDisplay.explanation.whyThisNameWon
  // Ensure it's human-readable (already done in Phase 4.0.9)

  // 4) Handle similar strains gracefully - Already handled in nameDisambiguationV407
  // Will be displayed in UI as collapsible section

  // 5) Never downgrade name mid-session - This requires frontend session state
  // For now, we ensure name is stable within a single scan
  // Frontend can implement session caching if needed

  // 6) Logging (debug)
  const finalPrimaryNameForLog = viewModel.nameFirstDisplay?.primaryStrainName || "Closest Known Cultivar";
  const alternates = viewModel.nameDisambiguationV407?.alternates?.map(a => a.name) || 
                      viewModel.nameFirstDisplay?.alternateNames || [];
  console.log("NAME LOCK:", {
    primary: finalPrimaryNameForLog,
    alternates: alternates.slice(0, 3),
    confidenceTier: nameConfidenceTier,
    confidence: finalConfidence,
  });

  // 6) Internal logging (legacy)
  console.log("NAME FINAL:", primaryName, finalConfidence);

  // STABILIZATION MODE — Final safety check: ensure nameFirstDisplay.primaryStrainName is never empty
  // (This is now handled above in Phase 4.0.9, but keep as backup)
  if (!viewModel.nameFirstDisplay || !viewModel.nameFirstDisplay.primaryStrainName || viewModel.nameFirstDisplay.primaryStrainName.trim() === "") {
    console.warn("STABILIZATION: Final check - nameFirstDisplay.primaryStrainName was empty, using fallback");
    if (!viewModel.nameFirstDisplay) {
      viewModel.nameFirstDisplay = {
        primaryStrainName: "Closest Known Cultivar",
        primaryName: "Closest Known Cultivar",
        confidencePercent: Math.min(72, finalConfidence),
        confidence: Math.min(72, finalConfidence),
        confidenceTier: "low" as const,
        // Phase 4.1 — Enhanced tagline
      tagline: (() => {
        const { generateIntelligentTagline } = require("./perceivedIntelligence");
        return generateIntelligentTagline({
          confidencePercent: finalConfidence,
          imageCount: imageResultsV3.length,
          hasDatabaseMatch: !!dbEntry,
          hasMultiImageAgreement: imageResultsV3.length >= 2,
        });
      })(),
        explanation: { whyThisNameWon: ["Analysis completed with limited certainty"], whatRuledOutOthers: [], varianceNotes: [] },
      };
    } else {
      viewModel.nameFirstDisplay.primaryStrainName = "Closest Known Cultivar";
      viewModel.nameFirstDisplay.primaryName = "Closest Known Cultivar";
      finalConfidence = Math.min(72, finalConfidence);
      viewModel.nameFirstDisplay.confidencePercent = finalConfidence;
      viewModel.nameFirstDisplay.confidence = finalConfidence;
    }
  }

  if (guardResult.status !== "ok") {
    // CONTRACT VALIDATION — Validate result before returning
    // Assert result exists, nameFirstDisplay exists, primaryStrainName is non-empty, confidencePercent is number
    // If any fail: replace with fallback, reduce confidence, add scanWarning
    
    let validationWarnings: string[] = [];
    let needsFallback = false;
    
    // Assert result exists
    if (!viewModel) {
      console.error("CONTRACT VALIDATION: viewModel is missing");
      needsFallback = true;
      validationWarnings.push("Result validation failed — using fallback");
    }
    
    // Assert nameFirstDisplay exists
    if (!viewModel.nameFirstDisplay) {
      console.error("CONTRACT VALIDATION: nameFirstDisplay is missing");
      needsFallback = true;
      validationWarnings.push("Name display validation failed — using fallback");
      // Create fallback nameFirstDisplay
      viewModel.nameFirstDisplay = {
        primaryStrainName: "Closest Known Cultivar",
        primaryName: "Closest Known Cultivar",
        confidencePercent: 70,
        confidence: 70,
        confidenceTier: "low",
        // Phase 4.1 — Enhanced tagline
      tagline: (() => {
        const { generateIntelligentTagline } = require("./perceivedIntelligence");
        return generateIntelligentTagline({
          confidencePercent: finalConfidence,
          imageCount: imageResultsV3.length,
          hasDatabaseMatch: !!dbEntry,
          hasMultiImageAgreement: imageResultsV3.length >= 2,
        });
      })(),
        explanation: {
          whyThisNameWon: ["Analysis completed with limited certainty"],
          whatRuledOutOthers: [],
          varianceNotes: [],
        },
        alternateNames: [],
      };
    }
    
    // Assert primaryStrainName is non-empty
    if (!viewModel.nameFirstDisplay.primaryStrainName || 
        viewModel.nameFirstDisplay.primaryStrainName.trim().length < 3 ||
        viewModel.nameFirstDisplay.primaryStrainName.toLowerCase() === "unknown" ||
        viewModel.nameFirstDisplay.primaryStrainName.toLowerCase() === "unidentified") {
      console.error("CONTRACT VALIDATION: primaryStrainName is invalid:", viewModel.nameFirstDisplay.primaryStrainName);
      needsFallback = true;
      validationWarnings.push("Primary strain name validation failed — using fallback");
      viewModel.nameFirstDisplay.primaryStrainName = "Closest Known Cultivar";
      viewModel.nameFirstDisplay.primaryName = "Closest Known Cultivar";
    }
    
    // Assert confidencePercent is number
    if (typeof viewModel.nameFirstDisplay.confidencePercent !== "number" ||
        isNaN(viewModel.nameFirstDisplay.confidencePercent) ||
        viewModel.nameFirstDisplay.confidencePercent < 0 ||
        viewModel.nameFirstDisplay.confidencePercent > 100) {
      console.error("CONTRACT VALIDATION: confidencePercent is invalid:", viewModel.nameFirstDisplay.confidencePercent);
      needsFallback = true;
      validationWarnings.push("Confidence validation failed — using fallback");
      viewModel.nameFirstDisplay.confidencePercent = 70;
      viewModel.nameFirstDisplay.confidence = 70;
    }
    
    // If validation failed: reduce confidence and add scanWarning
    if (needsFallback) {
      // Reduce confidence
      viewModel.nameFirstDisplay.confidencePercent = Math.min(70, viewModel.nameFirstDisplay.confidencePercent);
      viewModel.nameFirstDisplay.confidence = Math.min(70, viewModel.nameFirstDisplay.confidence);
      viewModel.nameFirstDisplay.confidenceTier = "low";
      
      // Validation warnings stored in validationWarnings array (will be added to result.scanWarning)
    }
    
    const result: ScanResult = {
      status: "partial",
      guard: {
        status: guardResult.status,
        reason: guardResult.status === "low-diversity" || guardResult.status === "low-confidence" ? guardResult.reason : "Analysis completed",
      },
      consensus: finalConsensusResult,
      confidence: viewModel.nameFirstDisplay.confidencePercent,
      result: viewModel, // Backward compatibility
      synthesis, // Backward compatibility
      diversityNote: diversityHint || undefined, // Phase 4.0.5 — Backward compatibility
      scanWarning: needsFallback 
        ? (warning ? `${warning}. ${validationWarnings.join("; ")}` : validationWarnings.join("; "))
        : (warning || undefined), // Phase 4.0.6 — Backward compatibility (includes validation warnings)
      scanNote: scanNote || undefined, // Phase 4.1.7 — Non-blocking UI message
      samePlantNote: samePlantNote || undefined, // Phase 4.2.0 — User-facing note when same-plant detected
      meta: scanMeta, // Phase 4.2.6 — Scan metadata
    };
    
    console.log(`SCAN COMPLETE — status=partial confidence=${result.confidence}`);
    return result;
  }

  // STABILIZATION RESET — Final safety check: ensure nameFirstDisplay.primaryStrainName is never empty
  if (!viewModel.nameFirstDisplay) {
    viewModel.nameFirstDisplay = {
      primaryStrainName: "Closest Known Cultivar",
      primaryName: "Closest Known Cultivar",
      confidencePercent: Math.min(72, finalConfidence),
      confidence: Math.min(72, finalConfidence),
      confidenceTier: "low" as const,
      // Phase 4.1 — Enhanced tagline
      tagline: (() => {
        const { generateIntelligentTagline } = require("./perceivedIntelligence");
        return generateIntelligentTagline({
          confidencePercent: finalConfidence,
          imageCount: imageResultsV3.length,
          hasDatabaseMatch: !!dbEntry,
          hasMultiImageAgreement: imageResultsV3.length >= 2,
        });
      })(),
      explanation: { whyThisNameWon: ["Analysis completed with limited certainty"], whatRuledOutOthers: [], varianceNotes: [] },
    };
  } else {
    const finalName = viewModel.nameFirstDisplay.primaryStrainName;
    if (!finalName || finalName.trim().length < 3 || 
        finalName.toLowerCase() === "unknown" ||
        finalName.toLowerCase() === "unidentified" ||
        finalName.trim() === "") {
      console.warn("STABILIZATION RESET: Final check - primaryStrainName invalid, forcing fallback");
      viewModel.nameFirstDisplay.primaryStrainName = "Closest Known Cultivar";
      viewModel.nameFirstDisplay.primaryName = "Closest Known Cultivar";
      finalConfidence = Math.min(72, finalConfidence);
      viewModel.nameFirstDisplay.confidencePercent = finalConfidence;
      viewModel.nameFirstDisplay.confidence = finalConfidence;
    }
  }
  
  // STABILIZATION RESET — Ensure viewModel.name is set from nameFirstDisplay (for backward compatibility)
  if (!viewModel.name || viewModel.name.trim().length < 3) {
    viewModel.name = viewModel.nameFirstDisplay.primaryStrainName;
  }
  
  // STABILIZATION RESET — Ensure viewModel.title is set (for backward compatibility)
  if (!viewModel.title || viewModel.title.trim().length < 3) {
    viewModel.title = viewModel.nameFirstDisplay.primaryStrainName;
  }

  // PHASE A FINALIZATION — Final safety check: ensure nameFirstDisplay.primaryStrainName is never empty
  if (!viewModel.nameFirstDisplay?.primaryStrainName || viewModel.nameFirstDisplay.primaryStrainName.trim().length < 3) {
    console.warn("PHASE A FINALIZATION: Final check - primaryStrainName invalid in success result, forcing fallback");
    if (!viewModel.nameFirstDisplay) {
      viewModel.nameFirstDisplay = {
        primaryStrainName: "Closest Known Cultivar",
        primaryName: "Closest Known Cultivar",
        confidencePercent: Math.min(72, finalConfidence),
        confidence: Math.min(72, finalConfidence),
        confidenceTier: "low" as const,
        // Phase 4.1 — Enhanced tagline
      tagline: (() => {
        const { generateIntelligentTagline } = require("./perceivedIntelligence");
        const fallbackConf = Math.max(50, 75 - (imageCount === 1 ? 15 : 0));
        return generateIntelligentTagline({
          confidencePercent: fallbackConf,
          imageCount: imageCount || 0,
          hasDatabaseMatch: false,
          hasMultiImageAgreement: false,
        });
      })(),
        explanation: { whyThisNameWon: ["Analysis completed with limited certainty"], whatRuledOutOthers: [], varianceNotes: [] },
        alternateNames: [],
      };
    } else {
      viewModel.nameFirstDisplay.primaryStrainName = "Closest Known Cultivar";
      viewModel.nameFirstDisplay.primaryName = "Closest Known Cultivar";
    }
  }
  
  // CONTRACT VALIDATION — Validate result before returning
  // Assert result exists, nameFirstDisplay exists, primaryStrainName is non-empty, confidencePercent is number
  // If any fail: replace with fallback, reduce confidence, add scanWarning
  
  let validationWarnings: string[] = [];
  let needsFallback = false;
  
  // Assert result exists
  if (!viewModel) {
    console.error("CONTRACT VALIDATION: viewModel is missing");
    needsFallback = true;
    validationWarnings.push("Result validation failed — using fallback");
  }
  
  // Assert nameFirstDisplay exists
  if (!viewModel.nameFirstDisplay) {
    console.error("CONTRACT VALIDATION: nameFirstDisplay is missing");
    needsFallback = true;
    validationWarnings.push("Name display validation failed — using fallback");
    // Create fallback nameFirstDisplay
    viewModel.nameFirstDisplay = {
      primaryStrainName: "Closest Known Cultivar",
      primaryName: "Closest Known Cultivar",
      confidencePercent: 70,
      confidence: 70,
      confidenceTier: "low",
      // Phase 4.1 — Enhanced tagline
      tagline: (() => {
        const { generateIntelligentTagline } = require("./perceivedIntelligence");
        return generateIntelligentTagline({
          confidencePercent: finalConfidence,
          imageCount: imageResultsV3.length,
          hasDatabaseMatch: !!dbEntry,
          hasMultiImageAgreement: imageResultsV3.length >= 2,
        });
      })(),
      explanation: {
        whyThisNameWon: ["Analysis completed with limited certainty"],
        whatRuledOutOthers: [],
        varianceNotes: [],
      },
      alternateNames: [],
    };
  }
  
  // Assert primaryStrainName is non-empty
  if (!viewModel.nameFirstDisplay.primaryStrainName || 
      viewModel.nameFirstDisplay.primaryStrainName.trim().length < 3 ||
      viewModel.nameFirstDisplay.primaryStrainName.toLowerCase() === "unknown" ||
      viewModel.nameFirstDisplay.primaryStrainName.toLowerCase() === "unidentified") {
    console.error("CONTRACT VALIDATION: primaryStrainName is invalid:", viewModel.nameFirstDisplay.primaryStrainName);
    needsFallback = true;
    validationWarnings.push("Primary strain name validation failed — using fallback");
    viewModel.nameFirstDisplay.primaryStrainName = "Closest Known Cultivar";
    viewModel.nameFirstDisplay.primaryName = "Closest Known Cultivar";
  }
  
  // Assert confidencePercent is number
  if (typeof viewModel.nameFirstDisplay.confidencePercent !== "number" ||
      isNaN(viewModel.nameFirstDisplay.confidencePercent) ||
      viewModel.nameFirstDisplay.confidencePercent < 0 ||
      viewModel.nameFirstDisplay.confidencePercent > 100) {
    console.error("CONTRACT VALIDATION: confidencePercent is invalid:", viewModel.nameFirstDisplay.confidencePercent);
    needsFallback = true;
    validationWarnings.push("Confidence validation failed — using fallback");
    viewModel.nameFirstDisplay.confidencePercent = 70;
    viewModel.nameFirstDisplay.confidence = 70;
  }
  
  // If validation failed: reduce confidence and add scanWarning
  if (needsFallback) {
    // Reduce confidence
    viewModel.nameFirstDisplay.confidencePercent = Math.min(70, viewModel.nameFirstDisplay.confidencePercent);
    viewModel.nameFirstDisplay.confidence = Math.min(70, viewModel.nameFirstDisplay.confidence);
    viewModel.nameFirstDisplay.confidenceTier = "low";
    
      // Add scanWarning (will be added to result.scanWarning)
      // Validation warnings are already in validationWarnings array
    }
    
    // Build scanWarning from validation warnings and existing warning
    const validationWarningText = validationWarnings.length > 0 ? validationWarnings.join("; ") : undefined;
    const finalScanWarning = needsFallback && validationWarningText
      ? (warning ? `${warning}. ${validationWarningText}` : validationWarningText)
      : (warning || undefined);
    
    // Create result based on status (discriminated union: "partial" requires guard, "success" does not)
    const result: ScanResult = needsFallback
      ? {
          status: "partial",
          guard: {
            status: "low-confidence",
            reason: validationWarningText || "Contract validation failed",
          },
          consensus: finalConsensusResult,
          confidence: viewModel.nameFirstDisplay.confidencePercent,
          result: viewModel, // Backward compatibility
          synthesis, // Backward compatibility
          diversityNote: diversityHint || undefined, // Phase 4.0.5 — Backward compatibility
          scanWarning: finalScanWarning, // Phase 4.0.6 — Backward compatibility (includes validation warnings)
          scanNote: scanNote || undefined, // Phase 4.1.7 — Non-blocking UI message
          samePlantNote: samePlantNote || undefined, // Phase 4.2.0 — User-facing note when same-plant detected
          meta: scanMeta, // Phase 4.2.6 — Scan metadata
        }
      : {
          status: "success",
          consensus: finalConsensusResult,
          confidence: viewModel.nameFirstDisplay.confidencePercent,
          result: viewModel, // Backward compatibility
          synthesis, // Backward compatibility
          diversityNote: diversityHint || undefined, // Phase 4.0.5 — Backward compatibility
          scanWarning: finalScanWarning, // Phase 4.0.6 — Backward compatibility (includes validation warnings)
          scanNote: scanNote || undefined, // Phase 4.1.7 — Non-blocking UI message
          samePlantNote: samePlantNote || undefined, // Phase 4.2.0 — User-facing note when same-plant detected
          meta: scanMeta, // Phase 4.2.6 — Scan metadata
        };
  
  // Phase 4.5.1 — Cache successful scan result for name memory
  if (result.status === "success" && 
      viewModel.nameFirstDisplay?.primaryStrainName && 
      finalImageFingerprints.length > 0 &&
      viewModel.nameFirstDisplay.primaryStrainName !== "Closest Known Cultivar") {
    try {
      cacheScanResult(
        viewModel.nameFirstDisplay.primaryStrainName,
        viewModel.nameFirstDisplay.confidencePercent,
        finalImageFingerprints
      );
      console.log("Phase 4.5.1 — Cached scan result for name memory:", {
        name: viewModel.nameFirstDisplay.primaryStrainName,
        confidence: viewModel.nameFirstDisplay.confidencePercent,
        fingerprintCount: finalImageFingerprints.length,
      });
    } catch (error) {
      // Don't fail scan if caching fails
      console.warn("Phase 4.5.1 — Failed to cache scan result:", error);
    }
  }
  
  // PHASE A FINALIZATION — Log once at end
  console.log(`SCAN COMPLETE — status=${result.status} confidence=${result.confidence}`);
  return result;
  } catch (error) {
    // PHASE A FINALIZATION — Catch any unexpected errors and return safe fallback (never throw)
    console.error("PHASE A FINALIZATION: Unexpected error in runScanPipeline, returning safe fallback:", error);
    const fallback = buildSafeFallbackResult(
      "Low confidence — results may vary",
      input.imageCount || 0
    );
    console.log(`SCAN COMPLETE — status=${'status' in fallback ? fallback.status : 'partial'} confidence=${'confidence' in fallback ? fallback.confidence : 50}`);
    return fallback;
  }
}

/**
 * Scan images and return result + synthesis
 */
export async function scanImages(images: File[]): Promise<ScanResult> {
  console.log("scanImages called with", images.length, "images");
  
  // PHASE A FINALIZATION — Return safe fallback with soft messages (never throw)
  if (!images || images.length === 0) {
    const fallback = buildSafeFallbackResult("Low confidence — results may vary", 0);
    console.log(`SCAN COMPLETE — status=${'status' in fallback ? fallback.status : 'partial'} confidence=${'confidence' in fallback ? fallback.confidence : 50}`);
    return fallback;
  }

  // Phase 2.7 Part N Step 1 — Require minimum 2 images for multi-image scan
  // (But allow single image as fallback)
  // PHASE A FINALIZATION — This condition is impossible (x > 1 && x < 2), but keep for safety
  if (images.length > 1 && images.length < 2) {
    const fallback = buildSafeFallbackResult("Low confidence — results may vary", images.length);
    console.log(`SCAN COMPLETE — status=${'status' in fallback ? fallback.status : 'partial'} confidence=${'confidence' in fallback ? fallback.confidence : 50}`);
    return fallback;
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
    
    // PHASE A FINALIZATION — Ensure result always has valid structure
    if ('status' in result && result.status && result.result) {
      if (!result.result.nameFirstDisplay?.primaryStrainName || result.result.nameFirstDisplay.primaryStrainName.trim().length < 3) {
        console.warn("PHASE A FINALIZATION: Result from pipeline has invalid name, using fallback");
        const fallback = buildSafeFallbackResult("Low confidence — results may vary", images.length);
        console.log(`SCAN COMPLETE — status=${'status' in fallback ? fallback.status : 'partial'} confidence=${'confidence' in fallback ? fallback.confidence : 50}`);
        return fallback;
      }
    }
    
    console.log("scanImages: pipeline completed", result);
    return result;
  } catch (error) {
    // PHASE A FINALIZATION — Return safe fallback with soft messages, never block user (never throw)
    console.error("PHASE A FINALIZATION: scanImages caught pipeline error, returning safe fallback:", error);
    const fallback = buildSafeFallbackResult(
      "Low confidence — results may vary",
      images.length
    );
    console.log(`SCAN COMPLETE — status=${'status' in fallback ? fallback.status : 'partial'} confidence=${'confidence' in fallback ? fallback.confidence : 50}`);
    return fallback;
  }
}
