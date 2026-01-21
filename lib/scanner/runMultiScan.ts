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
import type { NameFirstResultV80 } from "./nameFirstV80";

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
        
        // Phase 5.5.4 — VIEWMODEL OUTPUT: Populate identification field
        if (nameMatchResult) {
          viewModel.identification = {
            primaryName: nameMatchResult.primaryName,
            confidence: nameMatchResult.confidencePercent,
            alternates: nameMatchResult.alternates.map(a => ({
              name: a.name,
              reason: a.whyNotPrimary || `${a.whyClose ? `Close because: ${a.whyClose}. ` : ''}Lost because: ${a.whyLost || 'lower score'}.`,
            })),
          };
        }
        
        // Phase 5.7.4 — VIEWMODEL UPDATE: Populate primaryStrainName and alternateMatches
        if (nameMatchResult) {
          viewModel.primaryStrainName = nameMatchResult.primaryName;
          viewModel.alternateMatches = nameMatchResult.alternates.map(a => ({
            name: a.name,
            confidence: a.confidence || a.score,
          }));
        }
        
        // Phase 5.9.5 — VIEWMODEL UPDATE: Populate strainName, matchType, matchConfidence, alternateMatchNames
        if (nameMatchResult) {
          viewModel.strainName = nameMatchResult.primaryName;
          viewModel.matchType = nameMatchResult.matchType || "Likely";
          viewModel.matchConfidence = nameMatchResult.confidencePercent;
          // Phase 5.9.5 — Alternate matches as string array
          viewModel.alternateMatchNames = nameMatchResult.alternates.map(a => a.name);
        }
        
        // Phase 8.3.5 — VIEWMODEL LOCK: Populate strainName, nameConfidence, alternateMatches
        if (nameMatchResult) {
          viewModel.strainName = nameMatchResult.primaryName; // Phase 8.3.5 — Name is largest text on page
          viewModel.nameConfidence = nameMatchResult.confidencePercent; // Phase 8.3.5 — Confidence shown directly under
          viewModel.alternateMatchNames = nameMatchResult.alternates.map(a => a.name); // Phase 8.3.5 — Alternate matches
        }
        
        // Phase 8.5.5 — VIEWMODEL UPDATE: Populate primaryMatch and alternateMatches
        if (nameMatchResult) {
          viewModel.primaryMatch = {
            name: nameMatchResult.primaryName,
            confidence: nameMatchResult.confidencePercent,
          };
          viewModel.alternateMatches = nameMatchResult.alternates.map(a => ({
            name: a.name,
            confidence: a.confidence || a.score,
          }));
        }
        
        // Phase 8.1.4 — VIEWMODEL EXTENSION: Populate identity from nameMatchResult
        if (nameMatchResult) {
          viewModel.identity = {
            name: nameMatchResult.primaryName,
            confidence: nameMatchResult.confidencePercent,
            alternates: nameMatchResult.alternates.map(a => a.name),
          };
        }
        
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
        ? [`Matched visual traits: ${Array.isArray(candidatePool[0].matchedTraits) ? candidatePool[0].matchedTraits.slice(0, 4).join(", ") : "—"}`]
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
                const topCandidateNames = nameMatchResult?.alternates
                  ? [
                      { name: nameMatchResult.primaryName, confidence: nameMatchResult.confidencePercent },
                      ...nameMatchResult.alternates.slice(0, 4).map(a => ({ name: a.name, confidence: a.confidence || a.score })),
                    ]
                  : undefined;
                
                const strainRatio = resolveStrainRatio(
                  lockedStrainName,
                  dbEntry,
                  imageResultsV3.length > 0 ? imageResultsV3 : undefined,
                  input.imageCount,
                  fusedFeatures, // Phase 4.8 — Pass fused features for morphology adjustment
                  candidateStrainsForRatio, // Phase 5.0.3.2 — Pass candidates for consensus merge
                  terpeneExperienceResult?.terpeneProfile, // Phase 5.0.5.1 — Pass terpene profile for weighting
                  effectProfileForRatio, // Phase 5.6.1 — Pass effect profile for bias
                  topCandidateNames // Phase 8.4.2 — Pass top 5 candidate names for database dominance prior
                );
                console.log("Phase 5.0.3 — STRAIN RATIO RESOLVED:", strainRatio);
                
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
                  const { runNameFirstV80 } = require("./nameFirstV80");
                  try {
                    // Phase 8.0 — Run name-first engine (names are the anchor)
                    const terpeneProfileForName = terpeneExperienceResult.terpeneProfile.primaryTerpenes
                      .concat(terpeneExperienceResult.terpeneProfile.secondaryTerpenes)
                      .map(t => ({ name: t.name, likelihood: "High" })); // Simplified likelihood
                    const ratioForName = usePhase79ForRatio ? {
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
                    } : usePhase60ForRatio ? {
                      indicaPercent: strainRatioV60.indicaPercent,
                      sativaPercent: strainRatioV60.sativaPercent,
                    } : usePhase58ForRatio ? {
                      indicaPercent: strainRatioV58.indicaPercent,
                      sativaPercent: strainRatioV58.sativaPercent,
                    } : usePhase56ForRatio ? {
                      indicaPercent: strainRatioV56.indicaPercent,
                      sativaPercent: strainRatioV56.sativaPercent,
                    } : undefined;
                    const nameFirstV80Result = runNameFirstV80(
                      imageResultsV3,
                      fusedFeatures,
                      input.imageCount,
                      terpeneProfileForName.length > 0 ? terpeneProfileForName : undefined,
                      ratioForName
                    );
                    console.log("Phase 8.0 — NAME FIRST V80 RESULT:", nameFirstV80Result);
                    
                    // Phase 8.1 — Store V80 result for ratio engine
                    nameFirstV80ResultForRatio = nameFirstV80Result;
                    
                    // Phase 8.0 — Use V80 result if confidence is acceptable
                    if (nameFirstV80Result.primaryMatch.confidence >= 55) {
                      // Use Phase 8.0 result (names are the anchor)
                      nameFirstPipelineResult = {
                        primaryStrainName: nameFirstV80Result.primaryMatch.name,
                        nameConfidencePercent: nameFirstV80Result.primaryMatch.confidence,
                        nameConfidenceTier: nameFirstV80Result.confidenceTier,
                        alternateMatches: nameFirstV80Result.alternateMatches.map(a => ({
                          name: a.name,
                          score: a.confidence,
                          whyNotPrimary: a.whySimilar,
                        })),
                        explanation: {
                          whyThisNameWon: [nameFirstV80Result.explanation],
                          whatRuledOutOthers: nameFirstV80Result.alternateMatches.map(a => a.whySimilar),
                          varianceNotes: nameFirstV80Result.isCloselyRelated ? ["Closely related cultivar"] : [],
                        },
                        closelyRelatedVariants: nameFirstV80Result.isCloselyRelated ? nameFirstV80Result.alternateMatches.slice(0, 2).map(a => a.name) : undefined,
                        isAmbiguous: nameFirstV80Result.isCloselyRelated,
                      };
                      console.log("Phase 8.0 — USING V80 RESULT (names are the anchor, confidence >= 55%)");
                    } else {
                      // Phase 8.0 — Fallback to Phase 5.7 if V80 confidence too low
                      console.log(`Phase 8.0 — V80 confidence too low (${nameFirstV80Result.primaryMatch.confidence}%), trying Phase 5.7...`);
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
                      usePhase79ForRatio ? {
                        indicaPercent: strainRatioV79.indicaPercent,
                        sativaPercent: strainRatioV79.sativaPercent,
                        dominance: strainRatioV79.classification,
                        displayText: strainRatioV79.displayText,
                        confidence: strainRatioV79.confidence,
                        explanation: {
                          geneticBaseline: strainRatioV79.explanation,
                          source: "database_primary",
                        },
                      } : usePhase77ForRatio ? {
                        indicaPercent: strainRatioV77.indicaPercent,
                        sativaPercent: strainRatioV77.sativaPercent,
                        dominance: strainRatioV77.classification,
                        displayText: strainRatioV77.humanReadableLabel,
                        confidence: strainRatioV77.confidence,
                        explanation: {
                          geneticBaseline: strainRatioV77.explanation[0] || "",
                          source: "database_primary",
                        },
                      } : usePhase75ForRatio ? {
                        indicaPercent: strainRatioV75.indicaPercent,
                        sativaPercent: strainRatioV75.sativaPercent,
                        dominance: strainRatioV75.classification,
                        displayText: `${strainRatioV75.dominanceText}: ${strainRatioV75.displayText}`,
                        confidence: strainRatioV75.confidence,
                        explanation: {
                          geneticBaseline: strainRatioV75.explanation[0] || "",
                          source: "database_primary",
                        },
                      } : usePhase73ForRatio ? {
                        indicaPercent: strainRatioV73.indicaPercent,
                        sativaPercent: strainRatioV73.sativaPercent,
                        dominance: strainRatioV73.classification,
                        displayText: `${strainRatioV73.classificationText}: ${strainRatioV73.displayText}`,
                        confidence: strainRatioV73.confidence,
                        explanation: {
                          geneticBaseline: strainRatioV73.explanation[0] || "",
                          source: "database_primary",
                        },
                      } : usePhase71ForRatio ? {
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
                  } catch (error) {
                    console.error("Phase 8.0 — V80 engine error:", error);
                    // Continue with original result if Phase 8.0 fails
                  }
                }

                // Phase 8.2 — STRAIN NAME CONFIDENCE & DISAMBIGUATION ENGINE (Latest)
                // Enhanced confidence scoring and disambiguation
                let nameConfidenceV82Result: any = undefined;
                
                if (nameFirstPipelineResult && imageResultsV3.length > 0) {
                  const { runNameConfidenceV82 } = require("./nameConfidenceV82");
                  try {
                    // Phase 8.2 — Run confidence and disambiguation engine
                    const terpeneProfileForNameV82 = terpeneExperienceResult.terpeneProfile.primaryTerpenes
                      .concat(terpeneExperienceResult.terpeneProfile.secondaryTerpenes)
                      .map(t => ({ name: t.name, likelihood: "High" })); // Simplified likelihood
                    
                    nameConfidenceV82Result = runNameConfidenceV82(
                      imageResultsV3,
                      fusedFeatures,
                      input.imageCount,
                      terpeneProfileForNameV82.length > 0 ? terpeneProfileForNameV82 : undefined,
                      nameFirstV80ResultForRatio,
                      strainRatioV81
                    );
                    console.log("Phase 8.2 — NAME CONFIDENCE V82 RESULT:", nameConfidenceV82Result);
                    
                    // Phase 8.2 — Use V82 result if confidence is acceptable (>= 55%)
                    if (nameConfidenceV82Result.primaryName.confidence >= 55) {
                      // Update nameFirstPipelineResult with Phase 8.2 enhanced results
                      nameFirstPipelineResult = {
                        primaryStrainName: nameConfidenceV82Result.primaryName.name,
                        nameConfidencePercent: nameConfidenceV82Result.primaryName.confidence,
                        nameConfidenceTier: nameConfidenceV82Result.primaryName.confidenceTier,
                        alternateMatches: nameConfidenceV82Result.alternateMatches.map(a => ({
                          name: a.name,
                          score: a.confidence,
                          whyNotPrimary: a.whyNotPrimary,
                        })),
                        explanation: {
                          whyThisNameWon: [nameConfidenceV82Result.explanation],
                          whatRuledOutOthers: nameConfidenceV82Result.alternateMatches.map(a => a.difference),
                          varianceNotes: nameConfidenceV82Result.isAmbiguous ? ["Multiple close matches identified"] : [],
                        },
                        closelyRelatedVariants: nameConfidenceV82Result.isAmbiguous
                          ? nameConfidenceV82Result.alternateMatches.slice(0, 2).map(a => a.name)
                          : undefined,
                        isAmbiguous: nameConfidenceV82Result.isAmbiguous,
                      };
                      console.log("Phase 8.2 — USING V82 RESULT (enhanced confidence and disambiguation)");
                    } else {
                      console.log(`Phase 8.2 — V82 confidence too low (${nameConfidenceV82Result.primaryName.confidence}%), keeping Phase 8.0 result`);
                    }
                  } catch (error) {
                    console.error("Phase 8.2 — V82 engine error:", error);
                    // Continue with Phase 8.0 result if Phase 8.2 fails
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

        // Phase 5.2.5 — VIEWMODEL INTEGRATION: Populate strainType from ratioOutput
        const ratioOutput = strainRatio ? (strainRatio as any).ratioOutput : undefined;
        if (ratioOutput) {
          viewModel.strainType = {
            indica: ratioOutput.indica,
            sativa: ratioOutput.sativa,
            label: ratioOutput.label,
          };
        }
        
        // Phase 5.6.4 — VIEWMODEL EXTENSION: Populate classification from strainRatio
        if (strainRatio) {
          const ratioCalculation = (strainRatio as any).ratioCalculation;
          if (ratioCalculation) {
            viewModel.classification = {
              indicaPercent: ratioCalculation.ratio.indica,
              sativaPercent: ratioCalculation.ratio.sativa,
              type: ratioCalculation.type,
            };
          } else {
            // Fallback to strainRatio fields if ratioCalculation not available
            viewModel.classification = {
              indicaPercent: strainRatio.indicaPercent,
              sativaPercent: strainRatio.sativaPercent,
              type: strainRatio.dominance === "Indica" ? "Indica" : strainRatio.dominance === "Sativa" ? "Sativa" : "Hybrid",
            };
          }
        }
        
        // Phase 5.8.4 — VIEWMODEL ADDITION: Populate ratio with hybrid score
        if (strainRatio) {
          const ratioWithHybrid = (strainRatio as any).ratioWithHybrid;
          if (ratioWithHybrid) {
            viewModel.ratio = {
              indica: ratioWithHybrid.indica,
              sativa: ratioWithHybrid.sativa,
              hybrid: ratioWithHybrid.hybrid,
              ratioLabel: ratioWithHybrid.ratioLabel,
            };
          }
        }
        
        // Phase 6.0.4 — VIEWMODEL EXTENSION: Populate dominance from strainRatio
        // Phase 8.0.4 — Enhanced with confidence
        // Phase 8.4.5 — Enhanced with consensusRatio8_4
        // Phase 8.6.5 — Enhanced with dominanceV8_6 (hybrid + numeric confidence)
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
            const dominanceLabel = dominanceV8_6.indica > 65 ? "Indica-dominant" 
              : dominanceV8_6.sativa > 65 ? "Sativa-dominant" 
              : "Balanced Hybrid";
            const dominanceType = dominanceV8_6.indica > 65 ? "Indica" 
              : dominanceV8_6.sativa > 65 ? "Sativa" 
              : "Hybrid";
            
            viewModel.dominance = {
              indica: dominanceV8_6.indica,
              sativa: dominanceV8_6.sativa,
              hybrid: dominanceV8_6.hybrid, // Phase 8.6.5 — Hybrid percentage
              type: dominanceType,
              label: dominanceLabel,
              confidence: dominanceV8_6.confidence, // Phase 8.6.5 — Numeric confidence (0-100)
            };
          } else if (consensusRatio8_4) {
            // Phase 8.4.5 — Use consensus ratio 8.4 with dominanceLabel
            viewModel.dominance = {
              indica: consensusRatio8_4.indicaPercent,
              sativa: consensusRatio8_4.sativaPercent,
              hybrid: 100 - (consensusRatio8_4.indicaPercent + consensusRatio8_4.sativaPercent), // Phase 8.6.5 — Calculate hybrid
              type: consensusRatio8_4.dominanceLabel, // Phase 8.4.5 — Type field
              label: consensusRatio8_4.dominanceLabel === "Indica" ? "Indica-dominant" : consensusRatio8_4.dominanceLabel === "Sativa" ? "Sativa-dominant" : "Balanced Hybrid",
              confidence: dominanceWithConfidence?.confidence || "Medium", // Phase 8.0.4 — Include confidence
            };
          } else if (consensusRatio8_2) {
            // Phase 8.2.4 — Use consensus ratio with type field
            const hybrid8_2 = 100 - (consensusRatio8_2.indica + consensusRatio8_2.sativa);
            viewModel.dominance = {
              indica: consensusRatio8_2.indica,
              sativa: consensusRatio8_2.sativa,
              hybrid: Math.max(0, hybrid8_2), // Phase 8.6.5 — Calculate hybrid
              type: consensusRatio8_2.type, // Phase 8.2.4 — Type field
              label: consensusRatio8_2.type === "Indica" ? "Indica-dominant" : consensusRatio8_2.type === "Sativa" ? "Sativa-dominant" : "Balanced Hybrid",
              confidence: dominanceWithConfidence?.confidence || "Medium", // Phase 8.0.4 — Include confidence
            };
          } else if (dominanceWithConfidence) {
            const hybridFromConfidence = 100 - (dominanceWithConfidence.indica + dominanceWithConfidence.sativa);
            viewModel.dominance = {
              indica: dominanceWithConfidence.indica,
              sativa: dominanceWithConfidence.sativa,
              hybrid: Math.max(0, hybridFromConfidence), // Phase 8.6.5 — Calculate hybrid
              type: dominanceWithConfidence.label === "Indica-dominant" ? "Indica" : dominanceWithConfidence.label === "Sativa-dominant" ? "Sativa" : "Hybrid", // Phase 8.2.4 — Infer type from label
              label: dominanceWithConfidence.label,
              confidence: dominanceWithConfidence.confidence, // Phase 8.0.4 — Include confidence
            };
          } else {
            const ratioWithHybrid = (strainRatio as any).ratioWithHybrid;
            if (ratioWithHybrid) {
              const label = ratioWithHybrid.ratioLabel || (strainRatio.indicaPercent >= 70 ? "Indica-dominant" : strainRatio.sativaPercent >= 70 ? "Sativa-dominant" : "Balanced Hybrid");
              const hybridFromRatio = ratioWithHybrid.hybrid || (100 - (ratioWithHybrid.indica + ratioWithHybrid.sativa));
              viewModel.dominance = {
                indica: ratioWithHybrid.indica,
                sativa: ratioWithHybrid.sativa,
                hybrid: Math.max(0, hybridFromRatio), // Phase 8.6.5 — Include hybrid
                type: label === "Indica-dominant" ? "Indica" : label === "Sativa-dominant" ? "Sativa" : "Hybrid", // Phase 8.2.4 — Infer type from label
                label,
                confidence: "Medium", // Phase 8.0.4 — Default confidence
              };
            } else {
              // Fallback to strainRatio fields
              const label = strainRatio.indicaPercent >= 70 ? "Indica-dominant" : strainRatio.sativaPercent >= 70 ? "Sativa-dominant" : "Balanced Hybrid";
              const hybridFromStrain = 100 - (strainRatio.indicaPercent + strainRatio.sativaPercent);
              viewModel.dominance = {
                indica: strainRatio.indicaPercent,
                sativa: strainRatio.sativaPercent,
                hybrid: Math.max(0, hybridFromStrain), // Phase 8.6.5 — Calculate hybrid
                type: label === "Indica-dominant" ? "Indica" : label === "Sativa-dominant" ? "Sativa" : "Hybrid", // Phase 8.2.4 — Infer type from label
                label,
                confidence: "Medium", // Phase 8.0.4 — Default confidence
              };
            }
          }
        }
        
        // Phase 7.0.4 — VIEWMODEL EXTENSION: Populate chemistry from terpeneCannabinoidProfileV70
        if (terpeneCannabinoidProfileV70) {
          viewModel.chemistry = {
            primaryTerpenes: terpeneCannabinoidProfileV70.primaryTerpenes,
            secondaryTerpenes: terpeneCannabinoidProfileV70.secondaryTerpenes,
            thcRange: terpeneCannabinoidProfileV70.thcRange,
            cbdPresence: terpeneCannabinoidProfileV70.cbdPresence,
          };
        }
                
                // Phase 5.4.5 — VIEWMODEL OUTPUT: Populate genetics.type and genetics.ratioLabel
                const ratioCalculation = strainRatio ? (strainRatio as any).ratioCalculation : undefined;
                if (ratioCalculation) {
                  if (!viewModel.genetics) {
                    viewModel.genetics = {
                      dominance: strainRatio.dominance,
                      lineage: dbEntry?.genetics || "",
                    };
                  }
                  viewModel.genetics.type = ratioCalculation.type;
                  viewModel.genetics.ratioLabel = `${ratioCalculation.ratio.indica}% Indica / ${ratioCalculation.ratio.sativa}% Sativa`;
                }

                // Phase 5.9.4 — STRAIN TITLE FORMAT: Use strainTitle from nameMatchResult if available
                const strainTitle = (nameMatchResult as any)?.strainTitle;
                const confidenceTierLabel = (nameFirstPipelineResult as any)?.confidenceTierLabel;
                const displayTagline = strainTitle || confidenceTierLabel || "Closest known match based on visual + database consensus";
                
                viewModel.nameFirstDisplay = {
                  primaryStrainName: nameFirstPipelineResult.primaryStrainName,
                  confidencePercent: nameFirstPipelineResult.nameConfidencePercent,
                  confidenceTier: nameFirstPipelineResult.nameConfidenceTier,
                  tagline: displayTagline, // Phase 5.7.3 — Use confidence tier label if available
                  alsoKnownAs, // Phase 5.5.5 — Include aliases
                  alternateMatches: nameFirstPipelineResult.alternateMatches.length > 0
                    ? nameFirstPipelineResult.alternateMatches.map(a => ({
                        name: a.name,
                        confidence: a.score, // Phase 5.7.4 — Include confidence
                        whyNotPrimary: a.whyNotPrimary,
                      }))
                    : undefined,
                  // Phase 4.5 Step 4.5.3 — Include explanation for "Why this strain?" section (FREE TIER)
                  explanation: nameFirstPipelineResult.explanation,
                  // Phase 8.1 Step 8.1.6 — Include ratio (using Phase 8.1 engine, fallback to Phase 7.9, then Phase 7.7, then Phase 7.5, then Phase 7.3, then Phase 7.1, then Phase 6.0, then Phase 5.8, then Phase 5.6, then Phase 5.2)
                  // Phase 5.0.3.4 — Use base ratioEngine result (with consensus merge) as PRIMARY
                  // Phase 5.0.3 — Database + Consensus ratio (preferred over versioned engines)
                  ratio: strainRatio ? {
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
                  } : (usePhase81ForRatio ? {
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
                  } : usePhase79ForRatio ? {
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
                  } : usePhase77ForRatioAfter81 ? {
                    indicaPercent: strainRatioV77.indicaPercent,
                    sativaPercent: strainRatioV77.sativaPercent,
                    dominance: strainRatioV77.classification,
                    hybridLabel: strainRatioV77.classification.includes("Indica") ? "Indica-dominant"
                      : strainRatioV77.classification.includes("Sativa") ? "Sativa-dominant"
                      : "Hybrid",
                    displayText: strainRatioV77.humanReadableLabel,
                    explanation: ratioExplanation,
                  } : usePhase75ForRatio ? {
                    indicaPercent: strainRatioV75.indicaPercent,
                    sativaPercent: strainRatioV75.sativaPercent,
                    dominance: strainRatioV75.classification,
                    hybridLabel: strainRatioV75.dominanceText.includes("Indica") ? "Indica-dominant"
                      : strainRatioV75.dominanceText.includes("Sativa") ? "Sativa-dominant"
                      : "Hybrid",
                    displayText: `${strainRatioV75.dominanceText}: ${strainRatioV75.displayText}`,
                    explanation: ratioExplanation,
                  } : usePhase73ForRatio ? {
                    indicaPercent: strainRatioV73.indicaPercent,
                    sativaPercent: strainRatioV73.sativaPercent,
                    dominance: strainRatioV73.classification,
                    hybridLabel: strainRatioV73.classificationText.includes("Indica") ? "Indica-dominant"
                      : strainRatioV73.classificationText.includes("Sativa") ? "Sativa-dominant"
                      : "Hybrid",
                    displayText: `${strainRatioV73.classificationText}: ${strainRatioV73.displayText}`,
                    explanation: ratioExplanation,
                  } : usePhase71ForRatioAfter81 ? {
                    indicaPercent: strainRatioV71.indicaPercent,
                    sativaPercent: strainRatioV71.sativaPercent,
                    dominance: strainRatioV71.classification,
                    hybridLabel: (strainRatioV71.dominanceLabel || strainRatioV71.classification).includes("Indica") ? "Indica-dominant"
                      : (strainRatioV71.dominanceLabel || strainRatioV71.classification).includes("Sativa") ? "Sativa-dominant"
                      : "Hybrid",
                    displayText: `${strainRatioV71.classification}${strainRatioV71.dominanceLabel ? ` (${strainRatioV71.dominanceLabel})` : ""}: ${strainRatioV71.ratio}`,
                    explanation: ratioExplanation,
                  } : usePhase60ForRatio ? {
                    indicaPercent: strainRatioV60.indicaPercent,
                    sativaPercent: strainRatioV60.sativaPercent,
                    dominance: strainRatioV60.type,
                    hybridLabel: strainRatioV60.typeLabel.includes("Indica") ? "Indica-dominant"
                      : strainRatioV60.typeLabel.includes("Sativa") ? "Sativa-dominant"
                      : "Hybrid",
                    displayText: `${strainRatioV60.typeLabel}: ${strainRatioV60.ratio}`,
                    explanation: ratioExplanation,
                  } : usePhase58ForRatio ? {
                    indicaPercent: strainRatioV58.indicaPercent,
                    sativaPercent: strainRatioV58.sativaPercent,
                    dominance: strainRatioV58.type,
                    hybridLabel: strainRatioV58.type.includes("Indica") ? "Indica-dominant"
                      : strainRatioV58.type.includes("Sativa") ? "Sativa-dominant"
                      : "Hybrid",
                    displayText: `${strainRatioV58.type}: ${strainRatioV58.ratio}`,
                    explanation: ratioExplanation,
                  } : usePhase56ForRatioAfter81 ? {
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
                  } : {
                    indicaPercent: strainRatioV52.indicaPercent,
                    sativaPercent: strainRatioV52.sativaPercent,
                    dominance: strainRatioV52.dominance,
                    hybridLabel: strainRatioV52.dominance === "Indica" ? "Indica-dominant"
                      : strainRatioV52.dominance === "Sativa" ? "Sativa-dominant"
                      : strainRatioV52.dominance === "Balanced" ? "Balanced Hybrid"
                      : "Hybrid",
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
                  terpeneCannabinoidProfile: terpeneCannabinoidProfileEarly,
                  // Phase 7.4 — TERPENE PROFILE CONSENSUS ENGINE
                  terpeneProfileConsensus: (() => {
                    const { generateTerpeneProfileConsensusV74 } = require("./terpeneProfileConsensusV74");
                    const candidateStrains = nameFirstPipelineResult.alternateMatches?.map(a => ({
                      name: a.name,
                      confidence: a.score,
                    })) || [];
                    return generateTerpeneProfileConsensusV74(
                      nameFirstPipelineResult.primaryStrainName,
                      dbEntry,
                      imageResultsV3.length > 0 ? imageResultsV3 : undefined,
                      input.imageCount,
                      fusedFeatures,
                      candidateStrains.length > 0 ? candidateStrains : undefined
                    );
                  })(),
                  // Phase 7.6 — EFFECT PROFILE & USE-CASE ENGINE
                  effectProfileUseCase: (() => {
                    const { generateEffectProfileUseCaseV76 } = require("./effectProfileUseCaseV76");
                    const candidateStrains = nameFirstPipelineResult.alternateMatches?.map(a => ({
                      name: a.name,
                      confidence: a.score,
                    })) || [];
                    const terpeneProfileForEffects = terpeneExperienceResult.terpeneProfile.primaryTerpenes
                      .concat(terpeneExperienceResult.terpeneProfile.secondaryTerpenes)
                      .map(t => ({ name: t.name, likelihood: "High" })); // Simplified likelihood for effect engine
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
                    return generateEffectProfileUseCaseV76(
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
                  })(),
                  // Phase 7.8 — EFFECTS & EXPERIENCE PREDICTION ENGINE
                  effectExperiencePrediction: (() => {
                    const { generateEffectExperiencePredictionV78 } = require("./effectExperiencePredictionV78");
                    const terpeneProfileForPrediction = terpeneExperienceResult.terpeneProfile.primaryTerpenes
                      .concat(terpeneExperienceResult.terpeneProfile.secondaryTerpenes)
                      .map(t => ({ name: t.name, likelihood: "High" })); // Simplified likelihood
                    const cannabinoidRanges = terpeneCannabinoidProfileEarly.cannabinoids?.map(c => ({
                      compound: c.compound,
                      min: c.min,
                      max: c.max,
                    })) || undefined;
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
                    return generateEffectExperiencePredictionV78(
                      nameFirstPipelineResult.primaryStrainName,
                      dbEntry,
                      ratioForPrediction?.indicaPercent,
                      ratioForPrediction?.sativaPercent,
                      terpeneProfileForPrediction.length > 0 ? terpeneProfileForPrediction : undefined,
                      cannabinoidRanges,
                      ratioForPrediction?.confidence || nameFirstPipelineResult.nameConfidenceTier,
                      fusedFeatures
                    );
                  })(),
                };
    console.log("Phase 4.3 Step 4.3.6 — NAME-FIRST DISPLAY:", viewModel.nameFirstDisplay);
    console.log("Phase 4.5 Step 4.5.3 — EXPLANATION INCLUDED (FREE TIER):", nameFirstPipelineResult.explanation);
    console.log("Phase 4.6 Step 4.6.2 — RATIO INCLUDED (FREE TIER):", viewModel.nameFirstDisplay.ratio);
    
    // Phase 5.3.5 — VIEWMODEL OUTPUT: Populate strainIdentity
    if (nameFirstPipelineResult) {
      viewModel.strainIdentity = {
        name: nameFirstPipelineResult.primaryStrainName,
        confidence: nameFirstPipelineResult.nameConfidencePercent,
        alternates: Array.isArray(nameFirstPipelineResult.alternateMatches)
          ? nameFirstPipelineResult.alternateMatches.map(a => a.name || "Unknown").filter(n => n !== "Unknown")
          : [],
      };
    }
    
    // Phase 5.5.4 — VIEWMODEL OUTPUT: Populate identification (if not already populated from nameMatchResult)
    if (!viewModel.identification && nameFirstPipelineResult) {
      viewModel.identification = {
        primaryName: nameFirstPipelineResult.primaryStrainName,
        confidence: nameFirstPipelineResult.nameConfidencePercent,
        alternates: Array.isArray(nameFirstPipelineResult.alternateMatches)
          ? nameFirstPipelineResult.alternateMatches.slice(0, 4).map(a => ({
              name: a.name || "Unknown",
              reason: a.whyNotPrimary || "Lower confidence score",
            }))
          : [],
      };
    }
  }

  // Phase 8.1 — INDICA / SATIVA / HYBRID RATIO ENGINE (Latest)
  // 4-Source Weighted System: Database + Visual + Terpene + Name Consensus
  let nameFirstV80ResultForRatio: any = undefined;
  let strainRatioV81: any = undefined;
  
  if (nameFirstPipelineResult && imageResultsV3.length > 0) {
    const { resolveStrainRatioV81 } = require("./ratioEngineV81");
    try {
      // Phase 8.1 — Run ratio engine with Phase 8.0 name result
      const terpeneProfileForRatioV81 = terpeneExperienceResult.terpeneProfile.primaryTerpenes
        .concat(terpeneExperienceResult.terpeneProfile.secondaryTerpenes)
        .map(t => ({ name: t.name, likelihood: "High" })); // Simplified likelihood
      
      // Get updated dbEntry based on Phase 8.0 primary match
      const updatedStrainName = nameFirstPipelineResult.primaryStrainName;
      const updatedDbEntry = CULTIVAR_LIBRARY.find(
        c => c.name.toLowerCase() === updatedStrainName.toLowerCase() ||
            c.aliases.some(a => a.toLowerCase() === updatedStrainName.toLowerCase())
      ) || dbEntry;
      
      strainRatioV81 = resolveStrainRatioV81(
        updatedStrainName,
        updatedDbEntry,
        imageResultsV3.length > 0 ? imageResultsV3 : undefined,
        input.imageCount,
        fusedFeatures,
        terpeneProfileForRatioV81.length > 0 ? terpeneProfileForRatioV81 : undefined,
        nameFirstV80ResultForRatio
      );
      console.log("Phase 8.1 — STRAIN RATIO V81 RESOLVED:", strainRatioV81);
    } catch (error) {
      console.error("Phase 8.1 — ratio engine error:", error);
      // Continue with fallback ratio engines if Phase 8.1 fails
    }
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
  if (!viewModel.nameFirstDisplay?.ratio && lockedStrainName) {
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
    const terpeneProfileForWiki = viewModel.terpeneExperience?.dominantTerpenes
      ? {
          primaryTerpenes: viewModel.terpeneExperience.dominantTerpenes.map(name => ({
            name,
            dominanceScore: 1.0,
          })),
          secondaryTerpenes: viewModel.terpeneExperience.secondaryTerpenes?.map(name => ({
            name,
            dominanceScore: 0.5,
          })) || [],
        }
      : undefined;
    
    // Phase 5.6.1 — Get effect profile for bias calculation (from viewModel if available)
    const effectProfileForWiki = viewModel.effectProfileUseCase ? {
      primaryEffects: viewModel.effectProfileUseCase.primaryEffects,
      secondaryEffects: viewModel.effectProfileUseCase.secondaryEffects,
    } : undefined;
    
    // Phase 8.4.2 — Extract top 5 candidate names for database dominance prior (for wiki)
    const topCandidateNamesForWiki = nameMatchResult?.alternates
      ? [
          { name: nameMatchResult.primaryName, confidence: nameMatchResult.confidencePercent },
          ...nameMatchResult.alternates.slice(0, 4).map(a => ({ name: a.name, confidence: a.confidence || a.score })),
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
          dominance: strainRatioForWiki.dominance,
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
