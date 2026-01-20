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
// Phase 5.2 — Genetics + Terpene Weighting + Phenotype Signals Ratio Engine
import { resolveStrainRatioV52 } from "./ratioEngineV52";
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
  
  // Phase 4.3 Step 4.3.1 — NAME-FIRST PIPELINE (TOP PRIORITY)
  // Changed flow: Candidate Name Resolution happens FIRST
  // Everything else supports or challenges that name
  let nameFirstPipelineResult: ReturnType<typeof import("./nameFirstPipeline").runNameFirstPipeline> | null = null;
  let primaryStrainNameFromPipeline: string | null = null; // Phase 4.3 Step 4.3.1 — Lock name early
  let lockedStrainName: string | null = null; // Phase 4.3 Step 4.3.1 — Final locked name for all processing
  
  // Phase 4.0 Part B — Per-Image Analysis (supports 1-5 images)
  if (imageFiles && imageFiles.length >= 1 && imageFiles.length <= 5) {
    // Phase 3.0 Part B — Use enhanced analysis for all images (1-3)
    imageResultsV3 = await analyzePerImageV3(imageFiles, input.imageCount);
    console.log("PER-IMAGE RESULTS V3:", imageResultsV3);
    
    // Phase 4.3 Step 4.3.1 — Run Name-First Pipeline (Initial pass)
    // Phase 5.3 — Enhanced with terpene and ratio cross-validation
    // Phase 5.5 — Name-First Matching & Strain Disambiguation (Enhanced)
    // Phase 5.7 — Name-First Matching & Disambiguation Engine (Latest)
    // Note: Initial pass runs without terpene/ratio for speed
    // We'll re-run with validation after terpene/ratio are generated (Phase 5.3.3)
    if (imageResultsV3.length > 0 && imageResultsV3.length >= 1) {
      const { runNameFirstPipeline } = require("./nameFirstPipeline");
      try {
        // Phase 5.3 Step 5.3.1 & 5.3.2 — Initial pipeline run (name candidate extraction + multi-image consensus)
        nameFirstPipelineResult = runNameFirstPipeline(
          imageResultsV3,
          fusedFeatures,
          input.imageCount,
          undefined, // terpeneProfile - will be provided in validation pass
          undefined  // strainRatio - will be provided in validation pass
        );
        console.log("Phase 4.3 Step 4.3.1 — NAME-FIRST PIPELINE RESULT (initial):", nameFirstPipelineResult);
      } catch (error) {
        console.error("Phase 4.3 Step 4.3.1 — Name-first pipeline error:", error);
        nameFirstPipelineResult = null;
      }
    }
    
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
  
  // Phase 4.3 Step 4.3.1 — Name-First Result (PRIORITY: Use pipeline result if available)
  // RULE: UI MUST show a strain name immediately once resolved
  // Everything else supports or challenges that name
  const nameFirstResult = nameFirstPipelineResult
    ? {
        primaryMatch: {
          name: nameFirstPipelineResult.primaryStrainName, // Phase 4.3 Step 4.3.1 — Use pipeline name (locked)
          score: nameFirstPipelineResult.nameConfidencePercent,
          confidence: nameFirstPipelineResult.nameConfidencePercent,
          whyThisMatch: nameFirstPipelineResult.explanation.whyThisNameWon.join(". "),
          matchedTraits: [],
        },
        alsoSimilar: nameFirstPipelineResult.alternateMatches.map(a => ({
          name: a.name,
          whyNotPrimary: a.whyNotPrimary,
        })),
        confidence: nameFirstPipelineResult.nameConfidencePercent,
        confidenceRange: {
          min: Math.max(60, nameFirstPipelineResult.nameConfidencePercent - 4),
          max: Math.min(99, nameFirstPipelineResult.nameConfidencePercent + 4),
          explanation: nameFirstPipelineResult.explanation.whyThisNameWon[0] || "",
        },
        whyThisMatch: nameFirstPipelineResult.explanation.whyThisNameWon.join(". "),
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
      });
  console.log("NAME-FIRST RESULT:", nameFirstResult);
  console.log("CONSENSUS AGREEMENT SCORE:", consensusResult?.agreementScore || "N/A");

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
  
  // Phase 4.3 Step 4.3.6 — Add Name-First Display (TOP PRIORITY)
  // Phase 4.5 Step 4.5.1 — Include explanation for "Why this strain?" section
  // Phase 4.6 Step 4.6.2 — Include Indica/Sativa/Hybrid Ratio (FREE TIER)
  if (nameFirstPipelineResult) {
    // Phase 4.6 Step 4.6.2 — Resolve ratio from database
    // Phase 4.8 Step 4.8.4 — Enhanced with multi-source weighted calculation
    const strainRatio = resolveStrainRatio(
      lockedStrainName,
      dbEntry,
      imageResultsV3.length > 0 ? imageResultsV3 : undefined,
      input.imageCount,
      fusedFeatures // Phase 4.8 — Pass fused features for morphology adjustment
    );
    console.log("Phase 4.6 Step 4.6.2 — STRAIN RATIO RESOLVED:", strainRatio);

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

                // Phase 7.1 — INDICA / SATIVA / HYBRID RATIO ENGINE (Latest)
                // Use Phase 7.1 engine with terpene profile and effects from Phase 5.1
                const { resolveStrainRatioV71 } = require("./ratioEngineV71");
                const strainRatioV71 = resolveStrainRatioV71(
                  lockedStrainName,
                  dbEntry,
                  imageResultsV3.length > 0 ? imageResultsV3 : undefined,
                  input.imageCount,
                  fusedFeatures,
                  terpeneExperienceResult.terpeneProfile // Pass terpene profile for signals
                );
                console.log("Phase 7.1 — STRAIN RATIO V71 RESOLVED:", strainRatioV71);

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

                // Phase 7.1.5 — Determine which ratio to use (Phase 7.1 preferred, fallback to Phase 6.0, then Phase 5.8, then Phase 5.6, then Phase 5.2)
                const usePhase71ForRatio = strainRatioV71 && strainRatioV71.confidence !== "low";
                const usePhase60ForRatio = !usePhase71ForRatio && strainRatioV60 && strainRatioV60.confidence !== "low";
                const usePhase58ForRatio = !usePhase71ForRatio && !usePhase60ForRatio && strainRatioV58 && strainRatioV58.confidence !== "low";
                const usePhase56ForRatio = !usePhase71ForRatio && !usePhase60ForRatio && !usePhase58ForRatio && strainRatioV56 && strainRatioV56.confidence !== "low";

                // Phase 5.7 — NAME-FIRST MATCHING & DISAMBIGUATION ENGINE (Latest)
                // Try Phase 5.7 first, fallback to Phase 5.5, then Phase 5.3
                if (nameFirstPipelineResult && imageResultsV3.length > 0) {
                  const { runNameFirstV57 } = require("./nameFirstV57");
                  try {
                    // Phase 5.7 — Run enhanced name-first engine with terpene profile and ratio
                    const nameFirstV57Result = runNameFirstV57(
                      imageResultsV3,
                      fusedFeatures,
                      input.imageCount,
                      terpeneExperienceResult.terpeneProfile,
                      usePhase56ForRatio ? {
                        indicaPercent: strainRatioV56.indicaPercent,
                        sativaPercent: strainRatioV56.sativaPercent,
                        dominance: strainRatioV56.strainType.includes("Indica") && !strainRatioV56.strainType.includes("Hybrid") ? "Indica" 
                          : strainRatioV56.strainType.includes("Sativa") && !strainRatioV56.strainType.includes("Hybrid") ? "Sativa" 
                          : strainRatioV56.strainType.includes("Balanced") ? "Balanced" 
                          : "Hybrid",
                        displayText: `${strainRatioV56.strainType}: ${strainRatioV56.estimatedRatio}`,
                        confidence: strainRatioV56.confidence,
                        explanation: {
                          geneticBaseline: strainRatioV56.why[0] || "",
                          source: "database_baseline",
                        },
                      } : strainRatioV52
                    );
                    console.log("Phase 5.7 — NAME FIRST V57 RESULT:", nameFirstV57Result);
                    
                    // Phase 5.7 — Convert V57 result to pipeline format if confidence is high enough
                    if (nameFirstV57Result.primaryMatch.confidence >= 60) {
                      // Use Phase 5.7 result
                      nameFirstPipelineResult = {
                        primaryStrainName: nameFirstV57Result.primaryMatch.name,
                        nameConfidencePercent: nameFirstV57Result.primaryMatch.confidence,
                        nameConfidenceTier: nameFirstV57Result.primaryMatch.confidenceTier,
                        alternateMatches: nameFirstV57Result.alternateMatches?.map(a => ({
                          name: a.name,
                          score: a.confidence,
                          whyNotPrimary: a.whyNotPrimary,
                        })) || [],
                        explanation: {
                          whyThisNameWon: nameFirstV57Result.explanation.why,
                          whatRuledOutOthers: nameFirstV57Result.alternateMatches?.map(a => a.whyNotPrimary) || [],
                          varianceNotes: [],
                        },
                      };
                      console.log("Phase 5.7 — USING V57 RESULT (confidence >= 60%)");
                    } else {
                        // Phase 5.7 — Fallback to Phase 5.5 or Phase 5.3
                        console.log(`Phase 5.7 — V57 confidence too low (${nameFirstV57Result.primaryMatch.confidence}%), trying Phase 5.5...`);
                        const { runNameFirstV55 } = require("./nameFirstV55");
                      try {
                        const nameFirstV55Result = runNameFirstV55(
                          imageResultsV3,
                          fusedFeatures,
                          input.imageCount,
                      terpeneExperienceResult.terpeneProfile,
                      usePhase71ForRatio ? {
                        indicaPercent: strainRatioV71.indicaPercent,
                        sativaPercent: strainRatioV71.sativaPercent,
                        dominance: strainRatioV71.classification,
                        displayText: `${strainRatioV71.classification}${strainRatioV71.dominanceLabel ? ` (${strainRatioV71.dominanceLabel})` : ""}: ${strainRatioV71.ratio}`,
                        confidence: strainRatioV71.confidence,
                        explanation: {
                          geneticBaseline: strainRatioV71.explanation[0] || "",
                          source: "database_canonical",
                        },
                      } : usePhase60ForRatio ? {
                        indicaPercent: strainRatioV60.indicaPercent,
                        sativaPercent: strainRatioV60.sativaPercent,
                        dominance: strainRatioV60.type,
                        displayText: `${strainRatioV60.typeLabel}: ${strainRatioV60.ratio}`,
                        confidence: strainRatioV60.confidence,
                        explanation: {
                          geneticBaseline: strainRatioV60.explanation[0] || "",
                          source: "database_exact",
                        },
                      } : usePhase58ForRatio ? {
                            indicaPercent: strainRatioV58.indicaPercent,
                            sativaPercent: strainRatioV58.sativaPercent,
                            dominance: strainRatioV58.type,
                            displayText: `${strainRatioV58.type}: ${strainRatioV58.ratio}`,
                            confidence: strainRatioV58.confidence,
                            explanation: {
                              geneticBaseline: strainRatioV58.explanation[0] || "",
                              source: "database_primary",
                            },
                          } : usePhase56ForRatio ? {
                            indicaPercent: strainRatioV56.indicaPercent,
                            sativaPercent: strainRatioV56.sativaPercent,
                            dominance: strainRatioV56.strainType.includes("Indica") && !strainRatioV56.strainType.includes("Hybrid") ? "Indica" 
                              : strainRatioV56.strainType.includes("Sativa") && !strainRatioV56.strainType.includes("Hybrid") ? "Sativa" 
                              : strainRatioV56.strainType.includes("Balanced") ? "Balanced" 
                              : "Hybrid",
                            displayText: `${strainRatioV56.strainType}: ${strainRatioV56.estimatedRatio}`,
                            confidence: strainRatioV56.confidence,
                            explanation: {
                              geneticBaseline: strainRatioV56.why[0] || "",
                              source: "database_baseline",
                            },
                          } : strainRatioV52
                        );
                        
                        if (nameFirstV55Result.primaryMatch && nameFirstV55Result.primaryMatch.confidence >= 60) {
                          // Use Phase 5.5 result
                          nameFirstPipelineResult = {
                            primaryStrainName: nameFirstV55Result.primaryMatch.name,
                            nameConfidencePercent: nameFirstV55Result.primaryMatch.confidence,
                            nameConfidenceTier: nameFirstV55Result.primaryMatch.confidence >= 93 ? "very_high" 
                              : nameFirstV55Result.primaryMatch.confidence >= 85 ? "high"
                              : nameFirstV55Result.primaryMatch.confidence >= 70 ? "medium"
                              : "low",
                            alternateMatches: nameFirstV55Result.secondaryPossibility ? [{
                              name: nameFirstV55Result.secondaryPossibility.name,
                              score: nameFirstV55Result.secondaryPossibility.confidence,
                              whyNotPrimary: "Lower confidence than primary match",
                            }] : [],
                            explanation: {
                              whyThisNameWon: nameFirstV55Result.explanation.whyThisName,
                              whatRuledOutOthers: nameFirstV55Result.explanation.whatRuledOutOthers,
                              varianceNotes: [],
                            },
                          };
                          console.log("Phase 5.5 — USING V55 RESULT (confidence >= 60%)");
                        } else {
                          // Phase 5.3.3 — Fallback to Phase 5.3 validation pipeline
                          const { runNameFirstPipeline } = require("./nameFirstPipeline");
                          const validatedPipelineResult = runNameFirstPipeline(
                            imageResultsV3,
                            fusedFeatures,
                            input.imageCount,
                            terpeneExperienceResult.terpeneProfile,
                            strainRatioV52
                          );
                          console.log("Phase 5.3 Step 5.3.3 — VALIDATED PIPELINE RESULT (fallback):", validatedPipelineResult);
                          
                          if (validatedPipelineResult.primaryStrainName !== nameFirstPipelineResult.primaryStrainName) {
                            console.log(`Phase 5.3.3 — VALIDATION CHANGED PRIMARY NAME: "${nameFirstPipelineResult.primaryStrainName}" → "${validatedPipelineResult.primaryStrainName}"`);
                            nameFirstPipelineResult = validatedPipelineResult;
                          } else {
                            if (validatedPipelineResult.nameConfidencePercent < nameFirstPipelineResult.nameConfidencePercent) {
                              console.log(`Phase 5.3.3 — VALIDATION REDUCED CONFIDENCE: ${nameFirstPipelineResult.nameConfidencePercent}% → ${validatedPipelineResult.nameConfidencePercent}%`);
                              nameFirstPipelineResult = validatedPipelineResult;
                            } else {
                              nameFirstPipelineResult.explanation = validatedPipelineResult.explanation;
                            }
                          }
                        }
                      } catch (error) {
                        console.error("Phase 5.5 — V55 engine error:", error);
                        // Continue with original result
                      }
                    }
                  } catch (error) {
                    console.error("Phase 5.7 — V57 engine error:", error);
                    // Phase 5.3.3 — Fallback to Phase 5.3 validation pipeline
                    const { runNameFirstPipeline } = require("./nameFirstPipeline");
                    try {
                      const validatedPipelineResult = runNameFirstPipeline(
                        imageResultsV3,
                        fusedFeatures,
                        input.imageCount,
                        terpeneExperienceResult.terpeneProfile,
                        strainRatioV52
                      );
                      console.log("Phase 5.3 Step 5.3.3 — VALIDATED PIPELINE RESULT (fallback):", validatedPipelineResult);
                      
                      if (validatedPipelineResult.primaryStrainName !== nameFirstPipelineResult.primaryStrainName) {
                        console.log(`Phase 5.3.3 — VALIDATION CHANGED PRIMARY NAME: "${nameFirstPipelineResult.primaryStrainName}" → "${validatedPipelineResult.primaryStrainName}"`);
                        nameFirstPipelineResult = validatedPipelineResult;
                      } else {
                        if (validatedPipelineResult.nameConfidencePercent < nameFirstPipelineResult.nameConfidencePercent) {
                          console.log(`Phase 5.3.3 — VALIDATION REDUCED CONFIDENCE: ${nameFirstPipelineResult.nameConfidencePercent}% → ${validatedPipelineResult.nameConfidencePercent}%`);
                          nameFirstPipelineResult = validatedPipelineResult;
                        } else {
                          nameFirstPipelineResult.explanation = validatedPipelineResult.explanation;
                        }
                      }
                    } catch (fallbackError) {
                      console.error("Phase 5.3.3 — Validation pipeline error:", fallbackError);
                      // Continue with original result if validation fails
                    }
                  }
                }

                // Phase 7.1.5 — Convert Phase 7.1 result to Phase 4.6 format for backward compatibility
                // Use Phase 7.1 result (preferred) or fallback to Phase 6.0, then Phase 5.8, then Phase 5.6, then Phase 5.2
                // Note: usePhase71ForRatio, usePhase60ForRatio, usePhase58ForRatio, usePhase56ForRatio are already defined earlier
                
                const ratioExplanation = usePhase71ForRatio ? {
                  summary: `Ratio determined using base ratio sources (database genetics/lineage) + visual modulation + multi-image consensus (${strainRatioV71.confidence} confidence)`,
                  fullExplanation: [
                    `Classification: ${strainRatioV71.classification}${strainRatioV71.dominanceLabel ? ` (${strainRatioV71.dominanceLabel})` : ""}`,
                    `Ratio: ${strainRatioV71.ratio}`,
                    `Confidence: ${strainRatioV71.confidenceLabel}`,
                    ...strainRatioV71.explanation,
                  ],
                } : usePhase60ForRatio ? {
                  summary: `Ratio determined using ratio source model (database/lineage) + visual trait correlation + multi-image consensus (${strainRatioV60.confidence} confidence)`,
                  fullExplanation: [
                    `Type: ${strainRatioV60.typeLabel}`,
                    `Ratio: ${strainRatioV60.ratio}`,
                    `Confidence: ${strainRatioV60.confidenceLabel}`,
                    ...strainRatioV60.explanation,
                  ],
                } : usePhase58ForRatio ? {
                  summary: `Ratio determined using database signals (highest weight) + image phenotype + terpene/effect signals + multi-image consensus (${strainRatioV58.confidence} confidence)`,
                  fullExplanation: [
                    `Type: ${strainRatioV58.type}`,
                    `Ratio: ${strainRatioV58.ratio}`,
                    ...strainRatioV58.explanation,
                  ],
                } : usePhase56ForRatio ? {
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

                viewModel.nameFirstDisplay = {
                  primaryStrainName: nameFirstPipelineResult.primaryStrainName,
                  confidencePercent: nameFirstPipelineResult.nameConfidencePercent,
                  confidenceTier: nameFirstPipelineResult.nameConfidenceTier,
                  tagline: "Closest known match based on visual + database consensus",
                  alsoKnownAs, // Phase 5.5.5 — Include aliases
                  alternateMatches: nameFirstPipelineResult.alternateMatches.length > 0
                    ? nameFirstPipelineResult.alternateMatches.map(a => ({
                        name: a.name,
                        whyNotPrimary: a.whyNotPrimary,
                      }))
                    : undefined,
                  // Phase 4.5 Step 4.5.3 — Include explanation for "Why this strain?" section (FREE TIER)
                  explanation: nameFirstPipelineResult.explanation,
                  // Phase 7.1 Step 7.1.4 — Include ratio (using Phase 7.1 engine, fallback to Phase 6.0, then Phase 5.8, then Phase 5.6, then Phase 5.2)
                  ratio: usePhase71ForRatio ? {
                    indicaPercent: strainRatioV71.indicaPercent,
                    sativaPercent: strainRatioV71.sativaPercent,
                    dominance: strainRatioV71.classification,
                    displayText: `${strainRatioV71.classification}${strainRatioV71.dominanceLabel ? ` (${strainRatioV71.dominanceLabel})` : ""}: ${strainRatioV71.ratio}`,
                    explanation: ratioExplanation,
                  } : usePhase60ForRatio ? {
                    indicaPercent: strainRatioV60.indicaPercent,
                    sativaPercent: strainRatioV60.sativaPercent,
                    dominance: strainRatioV60.type,
                    displayText: `${strainRatioV60.typeLabel}: ${strainRatioV60.ratio}`,
                    explanation: ratioExplanation,
                  } : usePhase58ForRatio ? {
                    indicaPercent: strainRatioV58.indicaPercent,
                    sativaPercent: strainRatioV58.sativaPercent,
                    dominance: strainRatioV58.type,
                    displayText: `${strainRatioV58.type}: ${strainRatioV58.ratio}`,
                    explanation: ratioExplanation,
                  } : usePhase56ForRatio ? {
                    indicaPercent: strainRatioV56.indicaPercent,
                    sativaPercent: strainRatioV56.sativaPercent,
                    dominance: strainRatioV56.strainType.includes("Indica") && !strainRatioV56.strainType.includes("Hybrid") ? "Indica" 
                      : strainRatioV56.strainType.includes("Sativa") && !strainRatioV56.strainType.includes("Hybrid") ? "Sativa" 
                      : strainRatioV56.strainType.includes("Balanced") ? "Balanced" 
                      : "Hybrid",
                    displayText: `${strainRatioV56.strainType}: ${strainRatioV56.estimatedRatio}`,
                    explanation: ratioExplanation,
                  } : {
                    indicaPercent: strainRatioV52.indicaPercent,
                    sativaPercent: strainRatioV52.sativaPercent,
                    dominance: strainRatioV52.dominance,
                    displayText: strainRatioV52.displayText,
                    explanation: ratioExplanation,
                  },
                  // Phase 4.7 Step 4.7.2 — Include closely related variants if ambiguous
                  closelyRelatedVariants: nameFirstPipelineResult.closelyRelatedVariants,
                  isAmbiguous: nameFirstPipelineResult.isAmbiguous,
                  // Phase 5.1 — Include terpene experience (FREE TIER)
                  terpeneExperience: {
                    dominantTerpenes: terpeneExperienceResult.terpeneProfile.primaryTerpenes.map(t => t.name),
                    secondaryTerpenes: terpeneExperienceResult.terpeneProfile.secondaryTerpenes.map(t => t.name),
                    experience: terpeneExperienceResult.experience,
                    visualBoosts: terpeneExperienceResult.visualBoosts,
                    consensusNotes: terpeneExperienceResult.consensusNotes,
                  },
                  // Phase 7.2 — TERPENE & CANNABINOID PROFILE ENGINE
                  terpeneCannabinoidProfile: (() => {
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
                  })(),
                };
    console.log("Phase 4.3 Step 4.3.6 — NAME-FIRST DISPLAY:", viewModel.nameFirstDisplay);
    console.log("Phase 4.5 Step 4.5.3 — EXPLANATION INCLUDED (FREE TIER):", nameFirstPipelineResult.explanation);
    console.log("Phase 4.6 Step 4.6.2 — RATIO INCLUDED (FREE TIER):", viewModel.nameFirstDisplay.ratio);
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
  let strainRatioForWiki: ReturnType<typeof import("./ratioEngine").resolveStrainRatio> | undefined;
  if (!viewModel.nameFirstDisplay?.ratio && lockedStrainName) {
    const { resolveStrainRatio } = require("./ratioEngine");
    strainRatioForWiki = resolveStrainRatio(
      lockedStrainName,
      dbEntry,
      imageResultsV3.length > 0 ? imageResultsV3 : undefined,
      input.imageCount,
      fusedFeatures
    );
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
