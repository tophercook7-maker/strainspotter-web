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
import { detectDuplicates, computeImageSimilarity } from "./duplicateImageDetection";
// Phase 4.0.5 — Diversity hints
import { generateDiversityHint } from "./imageDiversityHints";
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
import { computeAngleDiversity } from "./angleDiversity";
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
import { detectSamePlant } from "./samePlantDetector";
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
import { CULTIVAR_LIBRARY } from "./cultivarLibrary";
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
async function runScanPipeline(input: ScanPipelineInput, imageFiles?: File[]): Promise<ScanResult> {
  console.log("runScanPipeline: starting with", input.imageCount, "images");
  
  if (input.imageCount === 0) {
    throw new Error("No images provided");
  }

  // Phase 2.7 Part N Step 1 — Require minimum 2 images (if multiple images provided)
  if (input.imageCount > 1 && input.imageCount < 2) {
    throw new Error("Multi-image scan requires at least 2 images");
  }

  // Phase 4.0.1 — Block scan if images lack variance
  const distinctness = assessImageDistinctness(input.imageSeeds);
  
  if (!distinctness.distinct) {
    return {
      error: true,
      userMessage:
        "These photos look too similar. Try different angles (top, side, close-up) for better accuracy.",
    };
  }

  // Phase 5.0.2 — Pipeline Order:
  // 1. Images → wiki results → fused features (needed for database query)
  // 2. nameFirstPipeline → leverageDatabaseFilter (DATABASE NAME MATCH - runs FIRST in pipeline)
  // 3. Image trait filtering (narrows database candidates)
  // 4. Multi-image consensus
  // 5. Confidence calculation
  
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
  
  // Phase 5.0.2 — Fused features ready for database query
  // Database name matching happens in nameFirstPipeline (leverageDatabaseFilter)

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
  if (imageFiles && imageFiles.length >= 1 && imageFiles.length <= 5) {
    // Phase 5.0.2 — Image analysis extracts traits that will narrow database candidates
    // The nameFirstPipeline will use these image results to refine the database filter results
    console.log("Phase 5.0.2 — STEP 3: IMAGE TRAIT FILTERING (extracting traits from", imageFiles.length, "images)");
    
    // Phase 3.0 Part B — Use enhanced analysis for all images (1-5)
    imageResultsV3 = await analyzePerImageV3(imageFiles, input.imageCount);
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
      const fallbackName = fallbackResult.candidateStrains[0]?.name || "Unknown Hybrid";
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
            name: fallbackResult.candidateStrains[0]?.name || "Unknown Cultivar",
            confidence: fallbackResult.candidateStrains[0]?.confidence || 60,
            reason: "Images appear to be the same angle or lighting. Try one close-up and one full-bud photo.",
          },
          alternates: [],
          agreementScore: 0,
          strainName: fallbackResult.candidateStrains[0]?.name || "Unknown Cultivar",
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
          input.imageCount,
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

    // Phase 4.1.8 — detect same-plant images (soft detection) - before consensus
    samePlantLikely = imageResultsV3.length >= 2
      ? detectSamePlant(
          imageResultsV3.map(i => ({
            hash: i.imageHash || "",
          }))
        )
      : true; // Single image = same plant
    
    // Phase 3.0 Part C — Consensus Merge Engine
    consensusResult = buildConsensusResultV3(imageResultsV3, fusedFeatures, input.imageCount, samePlantLikely);
    console.log("CONSENSUS RESULT V3:", consensusResult);
    
    // Assess plant similarity across images
    const similarity = assessPlantSimilarity(imageResultsV3);
    
    // Fail fast if consensus cannot be produced
    if (!consensusResult) {
      throw new Error(
        "No valid analysis could be produced. Images may be unreadable."
      );
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
  
  const namingResult = determineStrainName(fusedFeatures, input.imageCount, existingCandidates);
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
        imageCountBonus: input.imageCount * 3,
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
        alsoSimilar: Array.isArray(namingResult.alternateMatches)
          ? namingResult.alternateMatches.map(a => ({
              name: a.name || "Unknown",
              whyNotPrimary: a.whyNotPrimary || "Lower confidence",
            }))
          : [],
        confidence: Math.round((namingResult.confidenceRange.min + namingResult.confidenceRange.max) / 2),
        confidenceRange: namingResult.confidenceRange,
        imageCountBonus: input.imageCount * 3,
        variancePenalty: 0,
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
  
  // Phase 5.0.2 — FAIL HARD if no primary name or if name is "Unknown"
  const primaryName = nameFirstResult.primaryMatch.name;
  if (!primaryName || primaryName.trim() === "" || primaryName === "Unknown" || primaryName === "Unidentified") {
    const error = new Error(
      `Phase 5.0.2 — CRITICAL: Invalid primary strain name resolved: "${primaryName}". ` +
      "Name-first matching must always return a valid name from database. " +
      "If database is loaded, this should never happen."
    );
    console.error(error.message);
    console.error("Phase 5.0.2 — Debug info:", {
      nameFirstPipelineResult: nameFirstPipelineResult?.primaryStrainName,
      consensusResult: consensusResult?.primaryMatch?.name,
      namingResult: namingResult?.name,
    });
    throw error;
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
  const     extendedProfile = generateExtendedProfile(
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
  let primaryStrainName: string;
  if (stabilizedNameResult && stabilizedNameResult.stabilizedName) {
    primaryStrainName = stabilizedNameResult.stabilizedName;
    console.log("Phase 4.3.1 — Using stabilized name:", primaryStrainName);
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
    primaryStrainName = resolvePrimaryStrainName(rankedNameResults);
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
  
  // Phase 4.1 — Ensure nameFirstDisplay is always set (guaranteed field)
  // Set a default fallback first, will be overridden if nameFirstPipelineResult exists
  if (!viewModel.nameFirstDisplay) {
    const fallbackName = lockedStrainName || nameFirstResult.primaryMatch.name || "Unknown Hybrid";
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
                const strainTitle = (nameFirstPipelineResult as any)?.strainTitle;
                const confidenceTierLabel = (nameFirstPipelineResult as any)?.confidenceTierLabel;
                const displayTagline = strainTitle || confidenceTierLabel || "Closest known match based on visual + database consensus";
                
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
                  tagline: displayTagline,
                  alsoKnownAs,
                  alternateMatches: computedAlternateMatches,
                  explanation: {
                    whyThisNameWon: Array.isArray(nameResult.reason) ? nameResult.reason : [nameResult.reason],
                    whatRuledOutOthers: [],
                    varianceNotes: [],
                  },
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
        return a.name || "Unknown";
      }).filter(function(n) {
        return n !== "Unknown";
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
  let angleDiversityScore: number = 0.7; // Phase 4.2.2 — Default angle diversity
  if (imageResultsV3.length >= 2) {
    // Phase 4.2.2 — compute angle diversity score (if angle hints are available)
    if (imageAngleHints.length > 0) {
      const angleHints = imageAngleHints.map(h => h.angle);
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
            const sim = computeImageSimilarity(fallbackEmbeddings[i], fallbackEmbeddings[j]);
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

  // Phase 4.0.6 — apply similarity guard instead of throwing
  // Phase 4.0.7 — apply diversity confidence cap
  // Get final confidence from viewModel (use nameFirstDisplay confidence if available, else top-level)
  let finalConfidence = viewModel.nameFirstDisplay?.confidencePercent ?? viewModel.confidence ?? 75;
  
  // Phase 4.0.7 — apply diversity confidence cap
  const confidenceCap = applyDiversityConfidenceCap(
    finalConfidence,
    diversityScore
  );

  // Phase 4.2.6 — initialize scan meta
  const scanMeta: import("./types").ScanMeta = {
    confidenceCap,
  };

  // Phase 4.2.2 — apply angle diversity to confidence
  if (imageAngleHints.length > 0) {
    const angleDiversityScore = computeAngleDiversity(
      imageAngleHints.map(a => a.angle)
    );
    finalConfidence = Math.min(
      finalConfidence * angleDiversityScore,
      confidenceCap
    );
  } else {
    finalConfidence = confidenceCap;
  }

  // Phase 4.2.4 — apply visual distinctiveness to confidence
  const embeddingsForDistinctiveness = imageResultsV3
    .map(r => r.embedding)
    .filter((e): e is number[] => Array.isArray(e) && e.length > 0);
  
  let visualDistinctivenessScore: number = 1.0;
  if (embeddingsForDistinctiveness.length >= 2) {
    visualDistinctivenessScore = computeVisualDistinctiveness(embeddingsForDistinctiveness);
    finalConfidence = Math.min(
      finalConfidence * visualDistinctivenessScore,
      confidenceCap
    );
  }
  
  // Phase 4.1.0 — apply name boost
  // Build candidate vote map from imageResultsV3
  const nameVoteMap: Record<string, number> = {};
  if (imageResultsV3.length > 0) {
    imageResultsV3.forEach(result => {
      result.candidateStrains.forEach(candidate => {
        const name = candidate.name;
        if (name && name !== "Unknown") {
          nameVoteMap[name] = (nameVoteMap[name] || 0) + 1;
        }
      });
    });
  }
  
  finalConfidence = applyNameConsensusBoost({
    candidateCounts: nameVoteMap,
    baseConfidence: finalConfidence,
  });
  
  // Phase 4.1.2 — integrate grace mode
  const graceResult = applySamePlantGrace({
    distinctnessScore,
    confidence: finalConfidence,
  });
  finalConfidence = graceResult.adjustedConfidence;
  // Note: graceResult.note can be added to viewModel.notes if needed

  // Phase 4.1.6 — apply confidence floor for low distinctness
  finalConfidence = applyConfidenceFloor({
    confidence: finalConfidence,
    distinctnessScore,
  });


  // Phase 4.1.7 — build scan note for low distinctness
  const scanNote = buildScanNote(distinctnessScore);

  // Phase 4.2.0 — build same-plant note (optional)
  const samePlantNote = buildSamePlantNote(samePlantLikely);

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

  // Update viewModel confidence if it was capped
  if (finalConfidence < (viewModel.nameFirstDisplay?.confidencePercent ?? viewModel.confidence ?? 75)) {
    if (viewModel.nameFirstDisplay) {
      viewModel.nameFirstDisplay.confidencePercent = finalConfidence;
    }
    viewModel.confidence = finalConfidence;
  }

  // Phase 4.0.8 — replace hard failure with guided recovery
  const guardResult = evaluateAnalysisGuards({
    diversityScore,
    imageCount: imageResultsV3.length || input.imageCount,
    consensusConfidence: finalConfidence,
  });

  // If guard indicates issues, add recovery guidance to notes
  if (guardResult.status !== "ok") {
    if (!viewModel.notes) {
      viewModel.notes = [];
    }
    viewModel.notes.push(guardResult.reason);
  }

  // Phase 4.0.8 — Return discriminated union based on guard status
  // Phase 4.1.3 — replace analysis failure paths
  // Ensure consensusResult exists (fallback if null)
  const isPartial = guardResult.status !== "ok";
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
    whyThisMatch: isPartial ? guardResult.reason : "Visual analysis completed",
    alternateMatches: [],
    lowConfidence: isPartial,
    agreementLevel: agreementLevelValue,
  };
  const finalConsensusResult = guardAgainstFailure(consensusResult, fallbackConsensus);

  if (guardResult.status !== "ok") {
    return {
      status: "partial",
      guard: {
        status: guardResult.status,
        reason: guardResult.reason,
      },
      consensus: finalConsensusResult,
      confidence: finalConfidence,
      result: viewModel, // Backward compatibility
      synthesis, // Backward compatibility
      diversityNote: diversityHint || undefined, // Phase 4.0.5 — Backward compatibility
      scanWarning: warning || undefined, // Phase 4.0.6 — Backward compatibility
      scanNote: scanNote || undefined, // Phase 4.1.7 — Non-blocking UI message
      samePlantNote: samePlantNote || undefined, // Phase 4.2.0 — User-facing note when same-plant detected
      meta: scanMeta, // Phase 4.2.6 — Scan metadata
    };
  }

  return {
    status: "success",
    consensus: finalConsensusResult,
    confidence: finalConfidence,
    result: viewModel, // Backward compatibility
    synthesis, // Backward compatibility
    diversityNote: diversityHint || undefined, // Phase 4.0.5 — Backward compatibility
    scanWarning: warning || undefined, // Phase 4.0.6 — Backward compatibility
    scanNote: scanNote || undefined, // Phase 4.1.7 — Non-blocking UI message
    samePlantNote: samePlantNote || undefined, // Phase 4.2.0 — User-facing note when same-plant detected
    meta: scanMeta, // Phase 4.2.6 — Scan metadata
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
