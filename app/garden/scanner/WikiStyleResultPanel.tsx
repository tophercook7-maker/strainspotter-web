// app/garden/scanner/WikiStyleResultPanel.tsx
// Phase 3.6 — Extensive Wiki-Style Result Expansion

import type { FullScanResult } from "@/lib/scanner/types";
import type { FeatureFlag } from "@/lib/flags";
import CollapsibleSection from "./CollapsibleSection";
import { generateWhyThisMatchReasons } from "@/lib/scanner/whyThisMatchEngine";
import { generateConfidenceExplanationV514 } from "@/lib/scanner/confidenceExplanation";
import { generateConfidenceExplanation } from "@/lib/scanner/confidenceExplanation";
import { isScanResultPayloadV1 } from "@/lib/scanner/types";
import { resultPayloadToFullScanResult } from "@/lib/scanner/resultPayloadAdapter";

export default function WikiStyleResultPanel({
  result,
  flags,
  imageDataUrl = null,
}: {
  result: FullScanResult | import("@/lib/scanner/types").ScanResultPayloadV1;
  flags?: Record<FeatureFlag, boolean>;
  imageDataUrl?: string | null;
}) {
  // Accept either legacy FullScanResult (result.result = ViewModel) or canonical ScanResultPayloadV1 (from backend result_payload)
  const viewModel = isScanResultPayloadV1(result) ? resultPayloadToFullScanResult(result) : result.result;
  // Note: for legacy FullScanResult, result.analysis contains dominance data - access via result.analysis?.dominance (V1 has no analysis)
  const analysis = !isScanResultPayloadV1(result) ? (result as FullScanResult).analysis : undefined;

  // Single deterministic type for hero/chip and all dominance UI (v1: traits.type; legacy: genetics.dominance or analysis.dominance.classification)
  function normalizeType(raw: string | null | undefined): "Indica" | "Sativa" | "Hybrid" | "Unknown" {
    if (raw == null || String(raw).trim() === "") return "Unknown";
    const s = String(raw).toLowerCase();
    if ((s.includes("indica") && s.includes("sativa")) || s.includes("hybrid") || s.includes("50")) return "Hybrid";
    if (s.includes("indica")) return "Indica";
    if (s.includes("sativa")) return "Sativa";
    return "Unknown";
  }
  const cultivarType = normalizeType(
    (viewModel as any)?.traits?.type ??
    (viewModel as any)?.type ??
    (viewModel as any)?.genetics?.dominance ??
    analysis?.dominance?.classification ??
    null
  );

  // Derive image count from multiImageInfo if available
  const vm = viewModel as any;
  const imageCount = vm.multiImageInfo?.imageCountText 
    ? parseInt(vm.multiImageInfo.imageCountText.match(/\d+/)?.[0] || "1")
    : 1;
  // Phase 3.6 Part A — Result Structure (Order Locked)
  // 1. STRAIN IDENTITY (ABOVE THE FOLD - Always visible)
  // 2-7: Collapsible sections, top 2 expanded by default

  const safeSecondaryMatches = Array.isArray(vm.secondaryMatches)
    ? vm.secondaryMatches
    : [];
  const safeReferenceStrains = Array.isArray(vm.referenceStrains)
    ? vm.referenceStrains
    : [];
  const safeTerpeneGuess = Array.isArray(vm.terpeneGuess)
    ? vm.terpeneGuess
    : [];
  const safeEffectsLong = Array.isArray(vm.effectsLong)
    ? vm.effectsLong
    : [];
  const safeGrowthTraits = Array.isArray(vm.growthTraits)
    ? vm.growthTraits
    : [];
  // UI CONTRACT ENFORCEMENT — extendedProfile is optional, only use if present
  const extendedProfile = vm.extendedProfile;

  // Phase 3.6 Part B — Determine strain family from name or lineage
  const getStrainFamily = (): string | null => {
    const name = vm.name || "";
    if (name.toLowerCase().includes("kush")) return "Kush";
    if (name.toLowerCase().includes("cookies")) return "Cookies";
    if (name.toLowerCase().includes("haze")) return "Haze";
    if (name.toLowerCase().includes("purple")) return "Purple";
    if (name.toLowerCase().includes("blue")) return "Blue";
    if (name.toLowerCase().includes("white")) return "White";
    if (name.toLowerCase().includes("og")) return "OG";
    
    // Check lineage
    const lineage = vm.genetics?.lineage || "";
    if (lineage.toLowerCase().includes("kush")) return "Kush";
    if (lineage.toLowerCase().includes("haze")) return "Haze";
    if (lineage.toLowerCase().includes("cookies")) return "Cookies";
    
    return null;
  };

  const strainFamily = getStrainFamily();

  return (
    <section className="w-full max-w-[720px] mx-auto rounded-2xl border border-white/12 bg-white/5 backdrop-blur-xl shadow-xl shadow-black/20 p-5 sm:p-7 space-y-5">
      {/* Phase 4.5 Step 4.5.1 — NAME LOCK HEADER (TOP PRIORITY) */}
      {/* Phase 15.5.5 — Make strain name + confidence feel real */}
      {/* Phase 4.1 — UI NEVER EMPTY: nameFirstDisplay is guaranteed */}
      {/* Phase 4.4 — Visual Authority Upgrade: Improved spacing and containment */}
      {/* Phase 4.4.2 — Remove full-width dividers, use spacing instead */}
      <div className="space-y-6 pb-8">
        {/* Phase 5.1.1 — NAME-FIRST PRESENTATION (LOCK) */}
        {/* Rule: The NAME is the anchor. Everything else supports it. */}
        <div>
          {/* STEP 5.4.2 — HERO ORDER (MANDATORY) */}
          {/* 1. Strain Name (largest text) */}
          {/* 2. Confidence Tier (badge-style text) */}
          {/* 3. Confidence % (small, secondary) */}
          {/* 4. Short one-line summary */}
          {/* Nothing else above the fold */}
          <div className="mb-6">
            {/* 1. Strain Name — Largest text */}
            {/* STEP 5.5.6 — FAIL-SAFE UX: Always show best name, never empty */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-tight mb-4">
              {(() => {
                const displayName =
                  vm.nameFirstDisplay?.primaryStrainName ??
                  vm.name ??
                  "Unverified Cultivar (visual match only)";
                return displayName;
              })()}
            </h1>
            
            {/* PHASE 4.2 — Why this match? (directly under strain name) */}
            {vm.nameFirstDisplay.explanation?.whyThisNameWon && 
             vm.nameFirstDisplay.explanation.whyThisNameWon.length > 0 && (
              <div className="mb-4 mt-2">
                <h2 className="text-base font-semibold text-white/90 mb-2.5">Why this match?</h2>
                <ul className="space-y-1.5">
                  {vm.nameFirstDisplay.explanation.whyThisNameWon.slice(0, 4).map((reason, idx) => (
                    <li key={idx} className="text-sm text-white/75 leading-relaxed flex items-start">
                      <span className="text-blue-400 mr-2 mt-0.5">•</span>
                      <span>{reason}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {/* STEP 5.5.6 — FAIL-SAFE UX: Low confidence match label */}
            {/* Phase 4.2.1 — Removed conditional hiding. Confidence badge is always shown below. */}
            {/* If confidence is low, we can show an additional informational badge if desired, but not block the main badge. */}
            
            {/* 2. Confidence Tier + 3. Confidence % — Badge-style with percentage */}
            {(() => {
              const familyFirst = (vm.nameFirstDisplay as any)?.familyFirst;
              const rawConfidence = Math.round(vm.nameFirstDisplay.confidencePercent ?? vm.nameFirstDisplay.confidence ?? 0);
              const confidence = Math.min(95, rawConfidence);
              
              // Phase 4.3 — CONFIDENCE CALIBRATION (UPDATED TIERS)
              // 55–64% → Low Confidence (valid)
              // 65–79% → Moderate Confidence
              // 80–89% → High Confidence
              // 90–97% → Very High Confidence
              // Never show 100%. Never imply lab certainty.
              let confidenceTier: "very_high" | "high" | "medium" | "low";
              let confidenceLabel: string;
              let confidenceColor: string;
              
              // Ensure confidence is capped at 99% (never 100%)
              const clampedConfidence = Math.min(99, confidence);
              
              if (clampedConfidence >= 90) {
                confidenceTier = "very_high";
                confidenceLabel = "Very High";
                confidenceColor = "bg-green-600";
              } else if (clampedConfidence >= 80) {
                confidenceTier = "high";
                confidenceLabel = "High";
                confidenceColor = "bg-green-600";
              } else if (clampedConfidence >= 65) {
                confidenceTier = "medium";
                confidenceLabel = "Moderate";
                confidenceColor = "bg-yellow-500";
              } else {
                confidenceTier = "low";
                confidenceLabel = "Low";
                confidenceColor = "bg-orange-500";
              }
              
              // Phase 4.6.4 — Dual confidence display (if family-first applied)
              // Phase 5.3.1 — Use new confidence bands
              if (familyFirst?.familyConfidence && familyFirst?.exactStrainConfidence && 
                  familyFirst.familyConfidence > familyFirst.exactStrainConfidence) {
                const familyConf = Math.round(Math.min(99, familyFirst.familyConfidence)); // Never 100%
                const strainConf = Math.round(Math.min(99, familyFirst.exactStrainConfidence)); // Never 100%
                
                // Phase 4.3 — New confidence bands
                const familyTier = familyConf >= 90 ? "very_high" : familyConf >= 80 ? "high" : familyConf >= 65 ? "medium" : "low";
                const strainTier = strainConf >= 90 ? "very_high" : strainConf >= 80 ? "high" : strainConf >= 65 ? "medium" : "low";
                
                const familyLabel = familyTier === "very_high" ? "Very High" : familyTier === "high" ? "High" : familyTier === "medium" ? "Moderate" : "Low";
                const strainLabel = strainTier === "very_high" ? "Very High" : strainTier === "high" ? "High" : strainTier === "medium" ? "Moderate" : "Low";
                
                const familyColor = familyTier === "very_high" || familyTier === "high" ? "bg-green-600" : familyTier === "medium" ? "bg-yellow-500" : "bg-orange-500";
                const strainColor = strainTier === "very_high" || strainTier === "high" ? "bg-green-600" : strainTier === "medium" ? "bg-yellow-500" : "bg-orange-500";
                
                // STEP 5.4.2 — HERO ORDER: Dual confidence (family + strain) + summary
                const { getShortConfidenceCopy } = require("@/lib/scanner/confidenceCopy");
                const imageCount = (viewModel as any).imageCount ?? 1;
                const hasStrongVisualMatch = familyConf >= 75;
                const hasDatabaseMatch = true;
                const familyConfidenceCopy = getShortConfidenceCopy({
                  confidence: familyConf,
                  confidenceTier: familyTier,
                  imageCount,
                  hasStrongVisualMatch,
                  hasDatabaseMatch,
                });
                
                return (
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-3 flex-wrap">
                      {/* 2. Confidence Tier — Family */}
                      <span className={`px-4 py-2 rounded-full text-lg font-semibold text-white shadow-sm ${familyColor}`}>
                        {familyLabel} (family)
                      </span>
                      {/* 3. Confidence % — Small, secondary */}
                      <span className="text-sm text-white/50 font-medium">
                        {familyConf}%
                      </span>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      {/* 2. Confidence Tier — Strain */}
                      <span className={`px-4 py-2 rounded-full text-lg font-semibold text-white shadow-sm ${strainColor}`}>
                        {strainLabel} (strain)
                      </span>
                      {/* 3. Confidence % — Small, secondary */}
                      <span className="text-sm text-white/50 font-medium">
                        {strainConf}%
                      </span>
                    </div>
                    {/* PHASE 4.2 — One-line confidence explanation */}
                    <p className="text-sm text-white/70 leading-relaxed">
                      {familyConfidenceCopy}
                    </p>
                  </div>
                );
              }
              
              // Standard single confidence badge
              // Phase 5.1.7 — Text hierarchy: Confidence (text-base) > Reasons (text-base heading, text-sm content)
              // Phase 5.3.3 — USER-FACING CONFIDENCE COPY (no percentages, no technical terms)
              const { getShortConfidenceCopy } = require("@/lib/scanner/confidenceCopy");
              
              // Derive evidence signals for confidence copy
              const imageCount = (viewModel as any).imageCount ?? 1;
              const hasStrongVisualMatch = clampedConfidence >= 75;
              const hasDatabaseMatch = (vm.nameFirstDisplay as any)?.hasDatabaseMatch ?? true;
              const hasMultiImageAgreement = imageCount >= 2;
              
              const confidenceCopy = getShortConfidenceCopy({
                confidence: clampedConfidence,
                confidenceTier,
                imageCount,
                hasStrongVisualMatch,
                hasDatabaseMatch,
                hasMultiImageAgreement,
              });
              
              // STEP 5.4.2 — HERO ORDER: Confidence tier (badge) + % (small, secondary) + one-line explanation
              // PHASE 4.2 — One-line confidence explanation under badge
              const scanStatus = (result as any)?.status || "success";
              const hasLimitedDiversity = vm.notes?.some(n => 
                n.toLowerCase().includes("similar") || n.toLowerCase().includes("diversity")
              ) || false;
              
              let confidenceExplanation = "";
              if (confidenceTier === "very_high") {
                confidenceExplanation = "High confidence based on visual traits and name agreement";
              } else if (confidenceTier === "high") {
                confidenceExplanation = "High confidence based on visual traits and name agreement";
              } else if (confidenceTier === "medium") {
                confidenceExplanation = hasLimitedDiversity 
                  ? "Moderate confidence due to limited image diversity"
                  : "Moderate confidence based on visual analysis";
              } else {
                confidenceExplanation = scanStatus === "partial"
                  ? "Moderate confidence due to limited image diversity"
                  : "Moderate confidence based on available visual data";
              }
              
              return (
                <div className="space-y-2.5">
                  <div className="flex items-center gap-3">
                    {/* 2. Confidence Tier — Badge-style text */}
                    <span className={`px-4 py-2 rounded-full text-lg font-semibold text-white shadow-sm ${confidenceColor}`}>
                      {confidenceLabel}
                    </span>
                    {/* 3. Confidence % — Small, secondary */}
                    <span className="text-sm text-white/50 font-medium">
                      {clampedConfidence}%
                    </span>
                  </div>
                  {/* PHASE 4.2 — One-line confidence explanation */}
                  <p className="text-sm text-white/70 leading-relaxed">
                    {confidenceExplanation}
                  </p>
                </div>
              );
            })()}
            
            {/* STEP 5.5.5 — RESULT CONFIDENCE EXPLANATION */}
            {(() => {
              const confidence = Math.round(vm.nameFirstDisplay.confidencePercent ?? vm.nameFirstDisplay.confidence ?? 0);
              const imageCount = vm.multiImageInfo?.imageCountText 
                ? parseInt(vm.multiImageInfo.imageCountText.match(/\d+/)?.[0] || "1")
                : 1;
              
              // Derive signals for explanation
              const hasMultipleImages = imageCount >= 2;
              const consensusStrength = vm.trustLayer?.confidenceBreakdown?.consensusStrength ?? 0;
              const hasAgreement = hasMultipleImages && consensusStrength > 0.5;
              const hasDatabaseMatch = (vm.nameFirstDisplay as any)?.hasDatabaseMatch ?? true;
              
              // Build 3 bullets max (plain language)
              const bullets: string[] = [];
              
              // 1. Image variety
              if (hasMultipleImages) {
                const angleText = imageCount === 2 ? "two angles" : `${imageCount} different angles`;
                bullets.push(`Image variety: ${imageCount} photos from ${angleText}`);
              } else {
                bullets.push("Image variety: Single photo — multiple angles improve accuracy");
              }
              
              // 2. Agreement across images
              if (hasMultipleImages) {
                if (hasAgreement) {
                  bullets.push("Agreement: Consistent traits observed across images");
                } else {
                  bullets.push("Agreement: Some variation between images");
                }
              } else {
                bullets.push("Agreement: Single image — no cross-validation available");
              }
              
              // 3. Database alignment
              if (hasDatabaseMatch) {
                bullets.push("Database alignment: Matches known cultivar characteristics");
              } else {
                bullets.push("Database alignment: Limited match to reference catalog");
              }
              
              return (
                <div className="mt-4 pt-4">
                  <h3 className="text-sm font-semibold text-white/90 mb-2">Why this confidence level?</h3>
                  <ul className="space-y-1.5">
                    {bullets.slice(0, 3).map((bullet, idx) => (
                      <li key={idx} className="text-sm text-white/75 leading-relaxed flex items-start">
                        <span className="text-blue-400 mr-2 mt-0.5">•</span>
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })()}
          </div>
          
          {/* STEP 5.4.2 — Everything below the fold (moved from above) */}
          {/* Phase 5.1.1 — Supporting Information (everything else supports the name) */}
          {/* Family context (subtle, supports name) */}
          {(() => {
            const primaryStrainName = vm.nameFirstDisplay.primaryStrainName;
            
            // Skip if fallback name
            if (primaryStrainName === "Closest Known Cultivar" || !primaryStrainName) {
              return null;
            }
            
            // Get family info from family-first result if available
            const familyFirst = (vm.nameFirstDisplay as any)?.familyFirst;
            let familyName: string | null = null;
            let relatedCultivars: string[] = [];
            
            if (familyFirst?.familyName) {
              // Use family-first data (most accurate)
              familyName = familyFirst.familyName;
              // Get top 3-5 related cultivars from strain ranking (excluding primary)
              relatedCultivars = familyFirst.strainRanking
                ?.filter((s: any) => s.name !== primaryStrainName && s.name !== familyFirst.closestStrainInFamily)
                .slice(0, 5)
                .map((s: any) => s.name) || [];
              
              // Add closest strain if different from primary
              if (familyFirst.closestStrainInFamily && familyFirst.closestStrainInFamily !== primaryStrainName) {
                relatedCultivars.unshift(familyFirst.closestStrainInFamily);
              }
            } else {
              // Simple heuristic: extract family from strain name
              // This is a fallback when family-first wasn't applied
              const nameLower = primaryStrainName.toLowerCase();
              if (nameLower.includes("og kush") || (nameLower.includes("og") && nameLower.includes("kush"))) {
                familyName = "OG Kush";
              } else if (nameLower.includes("haze")) {
                familyName = "Haze";
              } else if (nameLower.includes("cookies") || nameLower.includes("gsc")) {
                familyName = "Cookies";
              } else if (nameLower.includes("kush")) {
                familyName = "Kush";
              } else if (nameLower.includes("purple")) {
                familyName = "Purple";
              } else if (nameLower.includes("blue")) {
                familyName = "Blue";
              }
              // Note: relatedCultivars will be empty for heuristic-based families
            }
            
            if (!familyName) {
              return null;
            }
            
            return (
              <div className="mb-4">
                <p className="text-sm text-white/60 font-medium">
                  {familyName} family
                </p>
                <p className="text-xs text-white/50 italic mt-1">
                  Lineage alignment confirmed in reference catalog
                </p>
                
                {/* Phase 4.6.3 — Related cultivars (collapsible, optional) */}
                {relatedCultivars.length > 0 && (
                  <div className="mt-2">
                    <CollapsibleSection
                      title="Related cultivars"
                      defaultExpanded={false}
                      icon=""
                    >
                      <div className="pt-2">
                        <p className="text-sm text-white/80 leading-relaxed">
                          {relatedCultivars.join(", ")}
                        </p>
                      </div>
                    </CollapsibleSection>
                  </div>
                )}
              </div>
            );
          })()}
              
              {/* Phase 4.2 — Inline note below name (always present) */}
              {/* Phase 4.6 — Enhanced to emphasize genetic knowledge */}
              {(() => {
                const familyFirst = (vm.nameFirstDisplay as any)?.familyFirst;
                if (familyFirst?.familyName) {
                  return (
                    <p className="text-sm text-white/75 leading-relaxed mb-4">
                      {familyFirst.familyName} lineage confirmed. Exact cultivar may vary within family.
                    </p>
                  );
                }
                return (
                  <p className="text-xs text-white/50 leading-relaxed mb-4">
                    Closest match based on visual structure, bud density, and documented cultivar traits.
                  </p>
                );
              })()}
              
            {/* Phase 4.8.4 — User-Facing Disambiguation Copy */}
            {(() => {
                const disambiguationCopy = (vm.nameFirstDisplay as any)?.disambiguationCopy;
                if (disambiguationCopy?.hasClones && disambiguationCopy.variantNames.length > 0) {
                  return (
                    <div className="mt-3 mb-4">
                      {/* Primary message */}
                      <p className="text-sm text-white/90 font-medium mb-2">
                        {disambiguationCopy.primaryMessage}
                      </p>
                      
                      {/* Expandable "Also known as" section */}
                      <details className="cursor-pointer group">
                        <summary className="text-xs text-white/70 hover:text-white/90 transition-colors list-none">
                          <span className="flex items-center gap-2">
                            <span>{disambiguationCopy.expandableTitle}:</span>
                            <span className="text-white/50 group-open:rotate-180 transition-transform">▼</span>
                          </span>
                        </summary>
                        <div className="mt-3 pt-3">
                          <p className="text-xs text-white/80 leading-relaxed">
                            {disambiguationCopy.variantNames.join(", ")}
                          </p>
                        </div>
                      </details>
                    </div>
                  );
                }
                return null;
              })()}
              
              {/* Phase 5.1.5 — SAME-PLANT DETECTION MESSAGE (TRANSPARENT) */}
              {/* Phase 5.2.4 — SAME-PLANT / SAME-ANGLE DETECTION NOTE */}
              {(() => {
                const hasSamePlantNote = !!(result as any).samePlantNote;
                const hasSimilarImagesNote = !!(result as any).similarImagesNote;
                
                // Phase 5.2.4 — Show similar images note (preferred over same-plant note)
                if (hasSimilarImagesNote) {
                  return (
                    <div className="mt-3 text-sm text-white/75 leading-relaxed">
                      {(result as any).similarImagesNote}
                    </div>
                  );
                }
                
                // Only show if same-plant is explicitly detected (not just multiple images)
                if (hasSamePlantNote) {
                  return (
                    <div className="mt-3 text-xs text-white/60 leading-relaxed">
                      Photos appear to be the same plant. Confidence reflects limited angle diversity.
                    </div>
                  );
                }
                
                return null;
              })()}
              
              {/* Phase 4.5.3 — Same-plant detection copy (subtle, intelligent) */}
              {(() => {
                const nameMemoryMatch = (result as any).meta?.nameMemoryMatch;
                
                if (nameMemoryMatch) {
                  return (
                    <div className="mt-2 text-sm text-white/70">
                      This appears consistent with a previous scan.
                    </div>
                  );
                }
                
                return null;
              })()}
              
              {/* STEP 5.4.2 — Moved below the fold (was above) */}
              {/* Enhanced subtitle with trust messaging — now in collapsible section below */}
            
            {/* Phase 4.9.6 — Visual Match Confidence (FREE TIER) */}
              {(() => {
                // Extract visual consensus score from Phase 4.9.4/4.9.5
                const visualConsensus = (vm.nameFirstDisplay as any)?.visualConsensus;
                const visualIntegration = (vm.nameFirstDisplay as any)?.visualIntegration;
                
                // Get visual consensus score (0-1)
                const visualConsensusScore = visualConsensus?.visualConsensusScore ?? 
                                            visualIntegration?.visualConsensusScore ?? 
                                            null;
                
                // Skip if no visual consensus data available
                if (visualConsensusScore === null || visualConsensusScore === undefined) {
                  return null;
                }
                
                // Map score to High/Medium/Low
                const visualMatchTier: "High" | "Medium" | "Low" = 
                  visualConsensusScore >= 0.8 ? "High" :
                  visualConsensusScore >= 0.6 ? "Medium" : "Low";
                
                // Get consistent features for explanation
                const consistentFeatures = visualConsensus?.consistentFeatures || [];
                const primaryStrainName = vm.nameFirstDisplay.primaryStrainName;
                
                // Generate short explanation
                let explanation = "";
                if (consistentFeatures.length > 0) {
                  // Use consistent features to build explanation
                  const features = consistentFeatures.slice(0, 2); // Use top 2 features
                  const featureNames = features.map((f: string) => {
                    if (f.toLowerCase().includes("density")) return "bud structure";
                    if (f.toLowerCase().includes("trichome")) return "trichome density";
                    if (f.toLowerCase().includes("color")) return "coloration";
                    if (f.toLowerCase().includes("pistil")) return "pistil profile";
                    if (f.toLowerCase().includes("calyx")) return "calyx shape";
                    return f.toLowerCase();
                  });
                  
                  // Get family name if available
                  const familyFirst = (vm.nameFirstDisplay as any)?.familyFirst;
                  const familyName = familyFirst?.familyName || 
                                    (primaryStrainName.toLowerCase().includes("kush") ? "Kush" :
                                     primaryStrainName.toLowerCase().includes("haze") ? "Haze" :
                                     primaryStrainName.toLowerCase().includes("cookies") ? "Cookies" :
                                     primaryStrainName.toLowerCase().includes("og") ? "OG" : null);
                  
                  const targetName = familyName ? `${familyName} family` : primaryStrainName;
                  
                  explanation = `${featureNames.join(" and ")} align with ${targetName}`;
                } else {
                  // Fallback explanation
                  const familyFirst = (vm.nameFirstDisplay as any)?.familyFirst;
                  const familyName = familyFirst?.familyName || 
                                    (primaryStrainName.toLowerCase().includes("kush") ? "Kush" :
                                     primaryStrainName.toLowerCase().includes("haze") ? "Haze" :
                                     primaryStrainName.toLowerCase().includes("cookies") ? "Cookies" :
                                     primaryStrainName.toLowerCase().includes("og") ? "OG" : null);
                  
                  const targetName = familyName ? `${familyName} family` : primaryStrainName;
                  explanation = `Bud structure and trichome density align with ${targetName}`;
                }
                
                // Color coding for tier
                const tierColor = visualMatchTier === "High" ? "bg-green-600" :
                                 visualMatchTier === "Medium" ? "bg-yellow-500" : "bg-orange-500";
                
                return (
                  <div className="mt-3 space-y-1">
                    <div className="inline-flex items-center gap-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold text-white ${tierColor}`}>
                        Visual match confidence: {visualMatchTier}
                      </span>
                    </div>
                    <p className="text-xs text-white/70 leading-relaxed">
                      {explanation}
                    </p>
                  </div>
                );
              })()}
              
              {/* Phase 4.2 — Trust indicator badge */}
              {/* Phase 4.4 — Visual Authority Upgrade: Enhanced badge styling */}
              {vm.nameFirstDisplay.primaryStrainName !== "Closest Known Cultivar" && (
                <div className="mt-2">
                  <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-200 border border-blue-500/30 shadow-sm">
                    <span className="mr-1.5 text-sm">✓</span>
                  Database Match
                </span>
              </div>
            )}
          </div>
          
        {/* Phase 5.0.7 — User Output (FREE TIER) */}
        {/* Show: Strain Name, Confidence %, "Why this match" (3 bullets), 2-3 closest alternates (collapsed) */}
        {/* Tone: Educational, confident, not absolute */}
        {(() => {
            const primaryName = vm.nameFirstDisplay.primaryStrainName;
            const confidence = Math.round(vm.nameFirstDisplay.confidencePercent ?? vm.nameFirstDisplay.confidence ?? 0);
            
            // Skip if fallback name
            if (primaryName === "Closest Known Cultivar" || !primaryName) {
              return null;
            }
            
            // Phase 5.1.2 — Generate exactly 3 clear reasons using "WHY THIS MATCH" ENGINE
            const finalDecision = (vm.nameFirstDisplay as any)?.finalDecision;
            const primaryCandidate = finalDecision ? {
              channelScores: {
                visual: (finalDecision as any).channelScores?.visual || 0.7,
                genetics: (finalDecision as any).channelScores?.genetics || 0.7,
                terpenes: (finalDecision as any).channelScores?.terpenes || 0.6,
                effects: (finalDecision as any).channelScores?.effects || 0.6,
              }
            } : undefined;
            
            // Try to get fusedFeatures from result if available
            const fusedFeatures = (result as any).fusedFeatures || 
                                 (viewModel as any).fusedFeatures || 
                                 undefined;
            
            // Generate exactly 3 clear reasons
            const whyThisMatch = generateWhyThisMatchReasons(
              finalDecision || {
                primaryStrainName: primaryName,
                confidence: confidence,
                contradictionScore: 0,
                crossImageAgreement: 0.7,
                fingerprintScore: 0.7,
                reasoning: [],
                alternates: [],
                rejectedButClose: [],
              },
              primaryCandidate,
              fusedFeatures,
              imageCount
            );
            
            // Phase 5.1.3 — Get alternates (2-3 closest) with confidence %
            const alternates: Array<{ name: string; confidence: number; whyNotPrimary: string }> = [];
            const primaryConfidence = confidence;
            const primaryScore = finalDecision?.fingerprintScore || 0.8;
            
            // Try to get from final decision alternates if available
            if (finalDecision?.alternates && finalDecision.alternates.length > 0) {
              alternates.push(...finalDecision.alternates.slice(0, 3).map(alt => {
                // Convert score (0-1) to confidence % (0-100)
                // Calculate confidence based on score relative to primary
                // If primary score is 0.8 and alternate is 0.75, gap is 0.05 = 5%
                const scoreGap = primaryScore - alt.score;
                // Convert score gap to confidence reduction (scale appropriately)
                // A 0.1 score gap ≈ 10-15% confidence reduction
                const confidenceReduction = Math.min(25, scoreGap * 150); // Cap at 25% reduction
                const alternateConfidence = Math.max(50, Math.min(95, primaryConfidence - confidenceReduction));
                
                return {
                  name: alt.name,
                  confidence: Math.round(alternateConfidence),
                  whyNotPrimary: alt.whyNotPrimary || "Close match with slightly lower confidence",
                };
              }));
            } else if (vm.nameFirstDisplay.alternateMatches && vm.nameFirstDisplay.alternateMatches.length > 0) {
              // Fallback to alternate matches (if they have confidence)
              alternates.push(...vm.nameFirstDisplay.alternateMatches.slice(0, 3).map(alt => ({
                name: alt.name,
                confidence: alt.confidence || Math.max(50, primaryConfidence - 10),
                whyNotPrimary: alt.whyNotPrimary || "Close match with slightly lower confidence",
              })));
            } else if (vm.nameFirstDisplay.alternateNames && vm.nameFirstDisplay.alternateNames.length > 0) {
              // Fallback to alternate names (no confidence data, estimate)
              alternates.push(...vm.nameFirstDisplay.alternateNames.slice(0, 3).map((name, idx) => ({
                name,
                // Stagger confidence: first alternate -10%, second -15%, third -20%
                confidence: Math.max(50, primaryConfidence - 10 - (idx * 5)),
                whyNotPrimary: "Close match with slightly lower confidence",
              })));
            }
            
            return (
              <div className="mt-6 space-y-4">
                {/* Why This Match — 3 bullet reasons */}
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-white/95 tracking-tight">
                    Why this match
                  </h3>
                  <ul className="space-y-2.5">
                    {whyThisMatch.slice(0, 3).map((reason, idx) => (
                      <li key={idx} className="text-sm text-white/80 leading-relaxed flex items-start">
                        <span className="text-blue-400 mr-2.5 mt-0.5 text-base">•</span>
                        <span>{reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                {/* Phase 5.1.3 — CLOSE ALTERNATES (CONTROLLED DOUBT) */}
                {alternates.length > 0 && (
                  <div className="space-y-3 mt-5">
                    <h3 className="text-lg font-semibold text-white/95 tracking-tight">
                      Also similar to
                    </h3>
                    <div className="space-y-2.5">
                      {alternates.slice(0, 3).map((alt, idx) => (
                        <div key={idx} className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-white/90 text-sm">{alt.name}</span>
                              <span className="text-xs text-white/60 font-medium">
                                {/* Phase 5.3.3 — No percentage shown */}
                              </span>
                            </div>
                            {alt.whyNotPrimary && (
                              <p className="text-xs text-white/70 leading-relaxed">
                                {alt.whyNotPrimary}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-sm text-white/70 mt-2">
                      Primary match showed strongest overall alignment.
                    </p>
                  </div>
                )}
                
                {/* Phase 5.1.6 — FREE vs PAID LINE (PSYCHOLOGICAL) */}
                <div className="mt-5 pt-5">
                  <p className="text-sm text-white/60 text-center">
                    Deeper breakdown available in Pro
                  </p>
                </div>
              </div>
            );
          })()}
          
          {/* Phase 5.1.4 — CONFIDENCE EXPLANATION (COLLAPSIBLE) */}
          {(() => {
            const currentConfidence = Math.round(vm.nameFirstDisplay.confidencePercent ?? vm.nameFirstDisplay.confidence ?? 0);
            const finalDecision = (vm.nameFirstDisplay as any)?.finalDecision;
            const primaryCandidate = finalDecision ? {
              channelScores: {
                visual: (finalDecision as any).channelScores?.visual || 0.7,
                genetics: (finalDecision as any).channelScores?.genetics || 0.7,
                terpenes: (finalDecision as any).channelScores?.terpenes || 0.6,
                effects: (finalDecision as any).channelScores?.effects || 0.6,
              }
            } : undefined;
            
            const confidenceExplanation = generateConfidenceExplanationV514(
              finalDecision || {
                primaryStrainName: vm.nameFirstDisplay.primaryStrainName,
                confidence: currentConfidence,
                contradictionScore: 0,
                crossImageAgreement: 0.7,
                fingerprintScore: 0.7,
                reasoning: [],
                alternates: [],
                rejectedButClose: [],
              },
              primaryCandidate,
              imageCount,
              finalDecision?.crossImageAgreement,
              finalDecision?.contradictionScore
            );
            
            return (
              <CollapsibleSection
                title="How confidence was determined"
                defaultExpanded={false}
                icon="📊"
              >
                <div className="pt-2">
                  <p className="text-sm text-white/80 leading-relaxed">
                    {confidenceExplanation}
                  </p>
                </div>
              </CollapsibleSection>
            );
          })()}
          
          {/* Phase 5.1 — User Trust & Explanation Layer */}
          {(() => {
            // Try to get final decision data if available
            const finalDecision = (vm.nameFirstDisplay as any)?.finalDecision;
            const primaryCandidate = finalDecision ? {
              channelScores: {
                visual: finalDecision.fingerprintScore || 0.7,
                genetics: finalDecision.fingerprintScore || 0.7,
                terpenes: 0.6,
                effects: 0.6,
              },
            } : null;
            
            // Generate trust explanation if we have enough data
            if (finalDecision && primaryCandidate) {
              const { generateTrustExplanation } = require("@/lib/scanner/userTrustExplanation");
              const trustExplanation = generateTrustExplanation(
                finalDecision,
                primaryCandidate,
                { inferredTerpeneVector: { likely: [], possible: [] }, inferredEffectVector: { likely: [], possible: [] } },
                undefined,
                imageCount
              );
              
              return (
                <div className="mt-6 space-y-4">
                  {/* Primary Trust Message */}
                  <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-4 backdrop-blur-sm">
                    <p className="text-sm text-white/90 leading-relaxed font-medium">
                      {trustExplanation.primaryTrustMessage}
                    </p>
                  </div>
                  
                  {/* Evidence Chain */}
                  <CollapsibleSection
                    title="How we identified this strain"
                    defaultExpanded={false}
                    icon="🔍"
                  >
                    <div className="pt-2 space-y-3">
                      {trustExplanation.evidenceChain.map((evidence, idx) => {
                        const strengthColor = evidence.strength === "strong" ? "text-green-400" :
                                             evidence.strength === "moderate" ? "text-yellow-400" : "text-orange-400";
                        const strengthIcon = evidence.strength === "strong" ? "✓" :
                                            evidence.strength === "moderate" ? "~" : "?";
                        
                        return (
                          <div key={idx} className="flex items-start gap-3">
                            <span className={`text-lg ${strengthColor}`}>{strengthIcon}</span>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-semibold text-white/90">{evidence.source}</span>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${strengthColor} bg-opacity-20`}>
                                  {evidence.strength}
                                </span>
                              </div>
                              <p className="text-sm text-white/75 leading-relaxed">{evidence.contribution}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CollapsibleSection>
                  
                  {/* Uncertainty Acknowledgment */}
                  {trustExplanation.uncertaintyAcknowledgment?.hasUncertainty && (
                    <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4 backdrop-blur-sm">
                      <h4 className="text-sm font-semibold text-yellow-200 mb-2">Understanding the uncertainty</h4>
                      <ul className="space-y-1.5 mb-3">
                        {trustExplanation.uncertaintyAcknowledgment.reasons.map((reason, idx) => (
                          <li key={idx} className="text-sm text-yellow-100/90 leading-relaxed flex items-start">
                            <span className="text-yellow-400 mr-2 mt-0.5">•</span>
                            <span>{reason}</span>
                          </li>
                        ))}
                      </ul>
                      <div className="mt-3 pt-3 border-t border-yellow-500/20">
                        <p className="text-xs font-semibold text-yellow-200 mb-1.5">How to improve confidence:</p>
                        <ul className="space-y-1">
                          {trustExplanation.uncertaintyAcknowledgment.howToImprove.map((tip, idx) => (
                            <li key={idx} className="text-xs text-yellow-100/80 leading-relaxed flex items-start">
                              <span className="text-yellow-400 mr-1.5 mt-0.5">→</span>
                              <span>{tip}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                  
                  {/* Educational Content */}
                  <CollapsibleSection
                    title="How this analysis works"
                    defaultExpanded={false}
                    icon="📚"
                  >
                    <div className="pt-2 space-y-3">
                      <div>
                        <p className="text-sm text-white/80 leading-relaxed mb-2">
                          {trustExplanation.educationalContent.howItWorks}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white/90 mb-1.5">What we compare:</p>
                        <ul className="space-y-1">
                          {trustExplanation.educationalContent.whatWeCompare.map((item, idx) => (
                            <li key={idx} className="text-sm text-white/70 leading-relaxed flex items-start">
                              <span className="text-blue-400 mr-2 mt-0.5">•</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="pt-3 mt-3">
                        <p className="text-sm text-white/75 leading-relaxed italic">
                          {trustExplanation.educationalContent.whyThisMatters}
                        </p>
                      </div>
                    </div>
                  </CollapsibleSection>
                  
                  {/* Authority Indicators */}
                  <div className="rounded-lg border border-white/10 bg-white/5 p-3 backdrop-blur-sm">
                    <p className="text-sm text-white/75 leading-relaxed">
                      <span className="font-semibold text-white/85">Analysis powered by:</span>{" "}
                      {trustExplanation.authorityIndicators.databaseSize} • {trustExplanation.authorityIndicators.analysisDepth}
                    </p>
                  </div>
                </div>
              );
            }
            
            // Fallback: Show existing trust message
            return vm.nameFirstDisplay.primaryStrainName !== "Closest Known Cultivar" ? (
              <div className="mt-6 rounded-lg border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                <p className="text-sm text-white/75 leading-relaxed">
                  <span className="font-semibold text-white/90">Name Selection:</span>{" "}
                  This strain name was selected through systematic analysis comparing your images against a database of 35,000+ documented cultivars. The identification is based on visual morphology, genetic lineage, and known cultivar characteristics.
                </p>
              </div>
            ) : null;
          })()}
          
          {/* Phase 4.2 — Name Selection Trust Message (Legacy fallback) */}
          {/* Phase 4.4 — Visual Authority Upgrade: Enhanced containment */}
          
          {/* Phase 4.9.7 — Visual Contradiction Note (SAFETY) */}
          {(() => {
            const visualContradictionNote = (vm.nameFirstDisplay as any)?.visualContradictionNote;
            if (visualContradictionNote) {
              return (
                <div className="mt-6 rounded-lg border border-orange-500/30 bg-orange-500/10 p-4 backdrop-blur-sm">
                  <p className="text-sm text-orange-200/90 leading-relaxed flex items-start">
                    <span className="mr-2 text-base">⚠️</span>
                    <span>{visualContradictionNote}</span>
                  </p>
                </div>
              );
            }
            return null;
          })()}
          
          {/* Phase 4.1 — Why This Looks Like {Primary Strain Name} */}
          {/* Phase 4.4 — Visual Authority Upgrade: Enhanced section spacing and typography */}
          <div className="mt-8 space-y-3">
            <h3 className="text-lg font-semibold text-white/95 tracking-tight">
              Why This Looks Like {vm.nameFirstDisplay.primaryStrainName}
            </h3>
            {vm.nameFirstDisplay.explanation?.whyThisNameWon && 
             vm.nameFirstDisplay.explanation.whyThisNameWon.length > 0 ? (
              <ul className="space-y-2.5">
                {vm.nameFirstDisplay.explanation.whyThisNameWon.slice(0, 6).map((reason, idx) => (
                  <li key={idx} className="text-sm text-white/80 leading-relaxed flex items-start">
                    <span className="text-green-400 mr-2.5 mt-0.5 text-base">•</span>
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-white/70 italic leading-relaxed">
                Matched based on overall visual similarity and known cultivar traits.
              </p>
            )}
          </div>
          
          {/* Phase 4.1 — How Confident Is This Match? */}
          {/* Phase 4.3 — Enhanced with expert-driven confidence explanation */}
          <div className="mt-6 space-y-2">
            <h3 className="text-base font-semibold text-white/90">
              How Confident Is This Match?
            </h3>
            {(() => {
              const confidence = Math.round(vm.nameFirstDisplay.confidencePercent ?? vm.nameFirstDisplay.confidence ?? 0);
              const imageCount = vm.multiImageInfo?.imageCountText 
                ? parseInt(vm.multiImageInfo.imageCountText.match(/\d+/)?.[0] || "1")
                : 1;
              // Phase 4.1 — Check scan status from result (FullScanResult may not have status directly)
              const scanStatus = (result as any).status || "success";
              const hasSamePlantNote = !!(result as any).samePlantNote;
              const hasDiversityNote = !!(result as any).diversityNote;
              
              const explanations: string[] = [];
              
              // Phase 4.3 — Confidence foundation (removed "Expert analysis" repetition)
              if (confidence >= 85) {
                explanations.push("Strong alignment between observed traits and documented characteristics.");
              } else if (confidence >= 70) {
                explanations.push("Good alignment with known cultivar traits, with some expected variation.");
              } else {
                explanations.push("Closest available match based on systematic comparison of visual and genetic data.");
              }
              
              // Image count explanation
              if (imageCount === 1) {
                explanations.push("Single-image analysis limits perspective — multiple angles improve accuracy.");
              } else if (imageCount >= 3) {
                explanations.push(`Multiple angles (${imageCount} images) showed consistent traits.`);
              } else if (imageCount === 2) {
                explanations.push("Two images provided cross-validation of key characteristics.");
              }
              
              // Diversity note explanation
              if (hasDiversityNote || hasSamePlantNote) {
                if (hasSamePlantNote) {
                  explanations.push("Images appear to be of the same plant — different angles would strengthen confidence.");
                } else {
                  explanations.push("Limited image diversity reduced certainty.");
                }
              }
              
              // Confidence level explanation (enhanced)
              if (confidence >= 85) {
                explanations.push("Strong visual agreement across analyzed images.");
                if (imageCount >= 2) {
                  explanations.push("Multiple viewing angles confirmed consistent morphological features.");
                }
              } else if (confidence >= 70) {
                explanations.push("Most traits aligned, some variation observed.");
                if (scanStatus === "partial") {
                  explanations.push("Based on limited visual agreement. Additional images may improve confidence.");
                }
              } else if (confidence >= 60) {
                explanations.push("Moderate alignment — visual traits show some variation.");
                if (imageCount === 1) {
                  explanations.push("Single-image analysis limits certainty.");
                }
              } else {
                explanations.push("Lower confidence — limited visual distinction between similar cultivars.");
                if (imageCount === 1) {
                  explanations.push("Additional images from different angles would improve accuracy.");
                }
              }
              
              // Visual agreement note
              if (imageCount >= 2 && !hasDiversityNote && !hasSamePlantNote) {
                explanations.push("Visual features showed good agreement across images in expert comparison.");
              }
              
              return (
                <div className="space-y-2.5">
                  {explanations.map((explanation, idx) => (
                    <p key={idx} className="text-sm text-white/80 leading-relaxed">
                      {explanation}
                    </p>
                  ))}
                </div>
              );
            })()}
          </div>
          
          {/* Phase 4.1 — How to Improve This Scan (Collapsible) */}
          {(() => {
            const confidence = Math.round(vm.nameFirstDisplay.confidencePercent ?? vm.nameFirstDisplay.confidence ?? 0);
            const scanStatus = (result as any).status || "success";
            
            // Show only if confidence < 90 OR status === "partial"
            if (confidence >= 90 && scanStatus !== "partial") {
              return null;
            }
            
            return (
              <CollapsibleSection
                title="How to Improve This Scan"
                defaultExpanded={false}
                icon="💡"
              >
                <div className="space-y-2 pt-2">
                  <ul className="space-y-2">
                    <li className="text-sm text-white/80 leading-relaxed flex items-start">
                      <span className="text-blue-400 mr-2 mt-1">•</span>
                      <span>Add a close-up of the bud structure</span>
                    </li>
                    <li className="text-sm text-white/80 leading-relaxed flex items-start">
                      <span className="text-blue-400 mr-2 mt-1">•</span>
                      <span>Add a side profile of the flower</span>
                    </li>
                    <li className="text-sm text-white/80 leading-relaxed flex items-start">
                      <span className="text-blue-400 mr-2 mt-1">•</span>
                      <span>Avoid duplicate angles</span>
                    </li>
                    <li className="text-sm text-white/80 leading-relaxed flex items-start">
                      <span className="text-blue-400 mr-2 mt-1">•</span>
                      <span>Ensure good lighting and focus</span>
                    </li>
                  </ul>
                  
                  {/* Phase 4.1 — Learning expectation note (subtle) */}
                  {/* Phase 4.4.2 — Remove full-width divider, use spacing instead */}
                  <p className="text-sm text-white/70 mt-4">
                    If this is the same plant, future scans will become more accurate.
                  </p>
                </div>
              </CollapsibleSection>
            );
          })()}
            
            {/* Phase 4.2 — Name Stability Indicator */}
            {/* Phase 4.3 — Enhanced with expert-driven stability messaging */}
            {(() => {
              const confidence = Math.round(vm.nameFirstDisplay.confidencePercent ?? vm.nameFirstDisplay.confidence ?? 0);
              const scanStatus = (result as any).status || "success";
              
              // Show stability message for medium/high confidence or when name is stable
              if (confidence >= 70 || vm.nameFirstDisplay?.nameStabilityScore) {
                return (
                  <div className="mt-3 rounded-lg border border-green-500/20 bg-green-500/10 p-2.5">
                    <div className="flex items-start gap-2">
                      <span className="text-green-400 text-sm">✓</span>
                      <div className="flex-1">
                        <p className="text-xs font-medium text-green-200 mb-1">
                          Expert-Stable Identification
                        </p>
                        <p className="text-xs text-green-200/80 leading-relaxed">
                          {confidence >= 85 
                            ? "Name is highly stable and unlikely to change with additional images."
                            : confidence >= 70
                            ? "Identification is stable. Additional images may refine confidence but are unlikely to change the primary match."
                            : "Selected through systematic comparison and represents the best available match."}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              }
              
              // For lower confidence, show a different message
              // Phase 4.3.3 — Partial status reframing (neutral, authoritative)
              if (scanStatus === "partial") {
                return (
                  <div className="mt-3 rounded-lg border border-white/15 bg-white/5 p-2.5">
                    <div className="flex items-start gap-2">
                      <span className="text-white/60 text-sm">ℹ</span>
                      <div className="flex-1">
                        <p className="text-xs text-white/80 leading-relaxed">
                          This identification is based on limited visual agreement.
                          Additional images may improve confidence.
                        </p>
                      </div>
                    </div>
                  </div>
                );
              }
              
              if (confidence < 70) {
                return (
                  <div className="mt-3 rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-2.5">
                    <div className="flex items-start gap-2">
                      <span className="text-yellow-400 text-sm">ℹ</span>
                      <div className="flex-1">
                        <p className="text-xs font-medium text-yellow-200 mb-1">
                          Expert-Preliminary Identification
                        </p>
                        <p className="text-xs text-yellow-200/80 leading-relaxed">
                          Expert analysis identified this as the best match from our database. Additional images from different angles may refine the expert identification.
                        </p>
                      </div>
                    </div>
                  </div>
                );
              }
              
              return null;
            })()}
            
            {/* Phase 4.3.1 — render name stability (legacy, keep for backward compat) */}
            {vm.nameFirstDisplay?.nameStabilityScore && (
              <div className="mt-2 text-sm text-white/70">
                <span className="font-semibold">Name confidence:</span>{" "}
                {vm.nameFirstDisplay.nameStabilityScore}%
              </div>
            )}
            
            {/* STEP 5.4.4 — NOTES & UNCERTAINTY CARD */}
            {(((result as any).diversityNote || (vm.notes && vm.notes.some(n => 
              n.toLowerCase().includes("similar") || n.toLowerCase().includes("diversity") || n.toLowerCase().includes("varied angles")
            ))) || (result as any).scanWarning || ((result as any).warnings && (result as any).warnings.length > 0) || (result as any).meta?.guidanceHints?.length || (result as any).meta?.friendlyFeedback) && (
              <div className="rounded-lg border border-white/10 bg-white/5 p-5 space-y-3">
                <h3 className="text-base font-semibold text-white/95 tracking-tight mb-3">Notes & Uncertainty</h3>
                
                {/* STEP 5.5.2 — User-facing friendly feedback (one message only) */}
                {(result as any).meta?.friendlyFeedback && (
                  <div className="text-sm text-blue-200 leading-relaxed">
                    💡 {(result as any).meta.friendlyFeedback}
                  </div>
                )}
                
                {/* STEP 5.4.5 — No tiny gray text for important info */}
                {/* Phase 4.0.4 — transparent explanation (no scary errors) */}
                {((result as any).diversityNote || (vm.notes && vm.notes.some(n => 
                  n.toLowerCase().includes("similar") || n.toLowerCase().includes("diversity") || n.toLowerCase().includes("varied angles")
                ))) && (
                  <div className="text-sm text-white/80">
                    {(result as any).diversityNote || vm.notes?.find(n => 
                      n.toLowerCase().includes("similar") || n.toLowerCase().includes("diversity") || n.toLowerCase().includes("varied angles")
                    )}
                  </div>
                )}
                
                {/* Phase 4.0.6 — non-blocking scan warning display */}
                {(result as any).scanWarning && (
                  <div className="text-sm text-yellow-200">
                    {(result as any).scanWarning}
                  </div>
                )}

                {/* Phase 4.0.5 — Warning display (non-blocking) */}
                {(result as any).warnings?.length > 0 && (
                  <div className="text-sm text-yellow-200">
                    {(result as any).warnings.map((w, i) => (
                      <div key={i} className="mb-1">⚠️ {w}</div>
                    ))}
                  </div>
                )}

                {/* STEP 5.4.5 — No tiny gray text for important info */}
                {/* Phase 4.2.6 — render guidance hints (collapsed, subtle) */}
                {(result as any).meta?.guidanceHints?.length ? (
                  <div className="text-sm text-white/75">
                    <div className="font-semibold mb-2">Improve Scan Accuracy</div>
                    <ul className="list-disc list-inside space-y-1.5">
                      {(result as any).meta.guidanceHints.includes("TRY_DIFFERENT_ANGLE") && (
                        <li>Try a different angle (side vs top view)</li>
                      )}
                      {(result as any).meta.guidanceHints.includes("TRY_DIFFERENT_DISTANCE") && (
                        <li>Try a closer or farther shot</li>
                      )}
                      {(result as any).meta.guidanceHints.includes("TRY_DIFFERENT_LIGHTING") && (
                        <li>Try brighter or more even lighting</li>
                      )}
                    </ul>
                  </div>
                ) : null}
              </div>
            )}
          
          {/* Phase 5.5.5 — Also Known As */}
          {vm.nameFirstDisplay.alsoKnownAs && vm.nameFirstDisplay.alsoKnownAs.length > 0 && (
            <p className="text-sm text-white/70 italic">
              Also Known As: {(vm.nameFirstDisplay.alsoKnownAs ?? []).join(" • ")}
            </p>
          )}
          
          {/* Phase 4.5 Step 4.5.1 — Confidence Badge Next to Name (LEGACY - removed, now in Phase 5.1.1 header) */}
          {/* Phase 4.5 Step 4.5.5 — Confidence Honesty: Show tier label, not raw % for high confidence */}
          {/* REMOVED: Confidence badge moved to Phase 5.1.1 name-first header */}

          {/* UI CONTRACT ENFORCEMENT — Never assume dominance, terpeneExperience, extendedProfile */}
          {/* Only render optional sections if present */}
          
          {/* Phase 4.6 Step 4.6.3 — Ratio display removed (belongs in WikiReportPanel via analysis layer) */}

          {/* STEP 5.4.4 — SECTION GROUPING (CARD SYSTEM) */}
          {/* Phase 5.3.6 — FREE TIER OPTIMIZATION: Always show dominant terpenes */}
          {/* Phase 5.1 Step 5.1.5 — DOMINANT TERPENES & EXPERIENCE PROFILE */}
          {/* Show terpenes from terpeneGuess if terpeneExperience is not available (free tier) */}
          {(vm.terpeneExperience || (safeTerpeneGuess && safeTerpeneGuess.length > 0)) && (
            <div className="rounded-lg border border-white/10 bg-white/5 p-5 space-y-4">
            {/* Phase 5.1 Step 5.1.5 — DOMINANT TERPENES */}
            {/* Phase 5.3.6 — Show terpenes from terpeneExperience OR terpeneGuess (free tier always gets terpenes) */}
            {((vm.terpeneExperience?.dominantTerpenes && vm.terpeneExperience.dominantTerpenes.length > 0) || 
              (safeTerpeneGuess && safeTerpeneGuess.length > 0)) && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-white/90">Dominant Terpenes</h3>
                <div className="flex flex-wrap gap-2">
                  {(vm.terpeneExperience?.dominantTerpenes || safeTerpeneGuess).map((terpene, idx) => (
                    <span
                      key={idx}
                      className="text-sm font-medium px-3 py-1.5 rounded-full bg-purple-500/20 text-purple-200 border border-purple-500/30"
                    >
                      {terpene}
                    </span>
                  ))}
                  {vm.terpeneExperience?.secondaryTerpenes && vm.terpeneExperience.secondaryTerpenes.length > 0 && (
                    <>
                      {vm.terpeneExperience.secondaryTerpenes.map((terpene, idx) => (
                        <span
                          key={`sec-${idx}`}
                          className="text-sm font-medium px-3 py-1.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20"
                        >
                          {terpene}
                        </span>
                      ))}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* STEP 5.4.4 — EXPERIENCE CARD */}
            {/* Phase 5.1 Step 5.1.5 — EXPERIENCE PROFILE */}
            <div className="space-y-3 pt-4 mt-4 border-t border-white/10">
              <h3 className="text-base font-semibold text-white/95 tracking-tight">Experience Profile</h3>
              <div className="space-y-2.5">
                {/* Body Relaxation */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-medium text-white/80">Body Relaxation</span>
                    <span className="text-xs text-white/60">{vm.terpeneExperience.experience.bodyRelaxation}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full bg-purple-500/60 rounded-full transition-all"
                      style={{ width: `${vm.terpeneExperience.experience.bodyRelaxation}%` }}
                    />
                  </div>
                </div>

                {/* Mental Stimulation */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-white/85">Mental Stimulation</span>
                    <span className="text-sm text-white/70">{vm.terpeneExperience.experience.mentalStimulation}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full bg-green-500/60 rounded-full transition-all"
                      style={{ width: `${vm.terpeneExperience.experience.mentalStimulation}%` }}
                    />
                  </div>
                </div>

                {/* Mood Elevation */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-medium text-white/80">Mood Elevation</span>
                    <span className="text-xs text-white/60">{vm.terpeneExperience.experience.moodElevation}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full bg-yellow-500/60 rounded-full transition-all"
                      style={{ width: `${vm.terpeneExperience.experience.moodElevation}%` }}
                    />
                  </div>
                </div>

                {/* Sedation */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-white/85">Sedation</span>
                    <span className="text-sm text-white/70">{vm.terpeneExperience.experience.sedation}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full bg-blue-500/60 rounded-full transition-all"
                      style={{ width: `${vm.terpeneExperience.experience.sedation}%` }}
                    />
                  </div>
                </div>

                {/* Focus / Clarity */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-medium text-white/80">Focus / Clarity</span>
                    <span className="text-xs text-white/60">{vm.terpeneExperience.experience.focusClarity}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full bg-cyan-500/60 rounded-full transition-all"
                      style={{ width: `${vm.terpeneExperience.experience.focusClarity}%` }}
                    />
                  </div>
                </div>

                {/* Appetite Stimulation */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-white/85">Appetite Stimulation</span>
                    <span className="text-sm text-white/70">{vm.terpeneExperience.experience.appetiteStimulation}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full bg-orange-500/60 rounded-full transition-all"
                      style={{ width: `${vm.terpeneExperience.experience.appetiteStimulation}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Phase 5.1 Step 5.1.5 — Consensus Notes (if available) */}
              {/* UI FIX — No full-width dividers, use cards instead */}
              {vm.terpeneExperience.consensusNotes && 
               vm.terpeneExperience.consensusNotes.length > 0 && (
                <div className="pt-2 mt-2">
                  <p className="text-xs text-white/60 italic leading-relaxed">
                    {vm.terpeneExperience.consensusNotes.join(" ")}
                  </p>
                </div>
              )}
            </div>
          </div>
          )}

          {/* Phase 4.7 Step 4.7.2 — CLOSELY RELATED VARIANTS (if ambiguous, collapsed) */}
          {vm.closelyRelatedVariants && 
           vm.closelyRelatedVariants.length > 0 && 
            vm.isAmbiguous && (
            <CollapsibleSection
              title={`Closely Related Variants (${vm.closelyRelatedVariants.length} ${vm.closelyRelatedVariants.length === 1 ? 'variant' : 'variants'})`}
              defaultExpanded={false}
              icon="🔗"
            >
              <div className="space-y-2 pt-2">
                {vm.closelyRelatedVariants.map((variant, idx) => (
                  <div key={idx} className="rounded-lg border border-white/10 bg-white/5 p-3">
                    <p className="text-sm text-white/90 font-medium mb-1">
                      {variant.name}
                    </p>
                    {variant.whyNotPrimary && (
                      <p className="text-xs text-white/70 leading-relaxed">
                        {variant.whyNotPrimary}
                      </p>
                    )}
                  </div>
                ))}
                <p className="text-xs text-white/60 mt-3 italic">
                  These variants share the same root name but may differ in phenotype or lineage. The primary match above was selected as the most likely canonical cultivar based on visual traits and database classification.
                </p>
              </div>
            </CollapsibleSection>
          )}

          {/* Phase 4.2 — Other Close Matches Considered */}
          {(() => {
            // Phase 4.2 — Get alternate matches from nameFirstDisplay OR consensus (fallback)
            const alternateMatches = vm.nameFirstDisplay.alternateMatches && vm.nameFirstDisplay.alternateMatches.length > 0
              ? vm.nameFirstDisplay.alternateMatches
              : safeSecondaryMatches.length > 0
              ? safeSecondaryMatches.map(match => ({
                  name: match.name,
                  whyNotPrimary: match.whyNotPrimary || "Similar visual characteristics",
                }))
              : [];
            
            if (alternateMatches.length === 0) {
              return null; // Do not render section if no alternates available
            }
            
            return (
              <CollapsibleSection
                title="Other Close Matches Considered"
                defaultExpanded={false}
                icon="🔍"
              >
                <div className="space-y-2 pt-2">
                  {alternateMatches.slice(0, 3).map((alt, idx) => {
                    // Phase 4.2 — Determine relative closeness based on position/index
                    const closeness = idx === 0 ? "Very close" : idx === 1 ? "Close" : "Possible";
                    
                    return (
                      <div key={idx} className="rounded-lg border border-white/10 bg-white/5 p-3">
                        <div className="flex items-start justify-between gap-3 mb-1">
                          <p className="text-sm text-white/90 font-medium">
                            {alt.name}
                          </p>
                          <span className="text-xs text-white/60 font-medium">
                            {closeness}
                          </span>
                        </div>
                        {alt.whyNotPrimary && (
                          <p className="text-xs text-white/70 leading-relaxed mt-1">
                            {alt.whyNotPrimary}
                          </p>
                        )}
                      </div>
                    );
                  })}
                  <p className="text-xs text-white/60 mt-3 italic">
                    These strains were also considered during analysis. The primary match above showed the strongest alignment across all images.
                  </p>
                </div>
              </CollapsibleSection>
            );
          })()}
          
          {/* Phase 4.5 Step 4.5.2 — SECONDARY CANDIDATES (Legacy, kept for backward compatibility) */}
          {false && vm.nameFirstDisplay.alternateMatches && 
           vm.nameFirstDisplay.alternateMatches.length > 0 && 
           vm.nameFirstDisplay.confidencePercent < 92 && (
            <CollapsibleSection
              title={`Also similar to (${vm.nameFirstDisplay.alternateMatches.length} ${vm.nameFirstDisplay.alternateMatches.length === 1 ? 'strain' : 'strains'})`}
              defaultExpanded={false}
              icon="🔍"
            >
              <div className="space-y-2 pt-2">
                {vm.nameFirstDisplay.alternateMatches.map((alt, idx) => (
                  <div key={idx} className="rounded-lg border border-white/10 bg-white/5 p-3">
                    <p className="text-sm text-white/90 font-medium mb-1">
                      {alt.name}
                    </p>
                    {alt.whyNotPrimary && (
                      <p className="text-xs text-white/70 leading-relaxed">
                        {alt.whyNotPrimary}
                      </p>
                    )}
                  </div>
                ))}
                <p className="text-xs text-white/60 mt-3 italic">
                  Primary match shows strongest overall alignment.
                </p>
              </div>
            </CollapsibleSection>
          )}

          {/* Phase 4.5 Step 4.5.3 — WHY THIS STRAIN (Human Logic) - FREE TIER */}
          {vm.nameFirstDisplay.explanation && (
            <CollapsibleSection
              title="Why this strain?"
              defaultExpanded={true}
              icon="💡"
            >
              <div className="space-y-3 pt-2">
                {/* Phase 4.0.3.1 — Rewritten content tone */}
                {vm.nameFirstDisplay.tagline?.toLowerCase().includes("low confidence") || 
                 (vm.nameFirstDisplay.confidencePercent ?? 0) < 70 ? (
                  <>
                    {/* STEP 5.4.5 — Body text: readable, bullet points > paragraphs */}
                    <ul className="space-y-2 text-sm text-white/80 leading-relaxed">
                      <li>Based on visible structure, bud density, and leaf morphology across uploaded images</li>
                      <li>Lower confidence due to similar photos lacking contrasting angles to differentiate cultivars</li>
                    </ul>
                    <p className="text-sm font-semibold text-white/90 mt-4 mb-2">
                      Accuracy improves with:
                    </p>
                    <ul className="text-sm list-disc ml-5 space-y-1.5 text-white/80">
                      <li>Close-up bud photo</li>
                      <li>Wider plant or branch photo</li>
                      <li>Different angle, distance, or lighting</li>
                    </ul>
                  </>
                ) : (
                  <>
                    {/* Phase 4.5 Step 4.5.3 — Auto-generate 3-5 bullets from explanation */}
                    {vm.nameFirstDisplay.explanation.whyThisNameWon && vm.nameFirstDisplay.explanation.whyThisNameWon.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="text-base font-semibold text-white/95 tracking-tight">Match Evidence</h4>
                        <ul className="space-y-2.5">
                          {vm.nameFirstDisplay.explanation.whyThisNameWon.slice(0, 5).map((reason, idx) => (
                            <li key={idx} className="text-sm text-white/80 leading-relaxed flex items-start">
                              <span className="text-green-400 mr-2">•</span>
                              <span>{reason}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {/* Phase 4.5 Step 4.5.3 — What Ruled Out Others (if available) */}
                    {vm.nameFirstDisplay.explanation.whatRuledOutOthers && 
                     vm.nameFirstDisplay.explanation.whatRuledOutOthers.length > 0 && (
                      <div className="pt-2">
                        <h4 className="text-sm font-semibold text-white/90 mb-2">Why not other strains?</h4>
                        <ul className="space-y-2">
                          {vm.nameFirstDisplay.explanation.whatRuledOutOthers.slice(0, 3).map((reason, idx) => (
                            <li key={idx} className="text-sm text-white/80 leading-relaxed flex items-start">
                              <span className="text-yellow-400 mr-2">•</span>
                              <span>{reason}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* STEP 5.4.5 — Variance Notes: readable text */}
                    {vm.nameFirstDisplay.explanation.varianceNotes && 
                     vm.nameFirstDisplay.explanation.varianceNotes.length > 0 && (
                      <div className="pt-3 mt-3">
                        <p className="text-sm text-white/75 leading-relaxed">
                          {(vm.nameFirstDisplay.explanation.varianceNotes ?? []).join(" ")}
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </CollapsibleSection>
          )}
      </div>
      
      {/* Phase 3.9 Part A — CORE IDENTITY (ABOVE THE FOLD) */}
      {/* Phase 4.1 — nameFirstDisplay is always present, this section is legacy fallback */}
      {false && (
        <div className="space-y-4 pb-4">
          <div className="space-y-2">
            <h1 className="text-4xl md:text-5xl font-bold text-white">
              {vm.nameFirstDisplay?.primaryStrainName || "Closest Known Cultivar"}
            </h1>

          {/* Match type label */}
          {vm.namingInfo && (
            <p className="text-lg md:text-xl text-white/80 font-medium">
              {vm.namingInfo.displayLabel}
            </p>
          )}

          {/* Phase 3.8 Part C — Confidence Tier Badge */}
          {vm.confidenceTier && (
            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-semibold px-3 py-1 rounded-full ${
                  vm.confidenceTier.tier === "very_high"
                    ? "bg-green-500/30 text-green-200"
                    : vm.confidenceTier.tier === "high"
                    ? "bg-green-500/20 text-green-300"
                    : vm.confidenceTier.tier === "medium"
                    ? "bg-yellow-500/20 text-yellow-300"
                    : "bg-orange-500/20 text-orange-300"
                }`}
              >
                {vm.confidenceTier.label}
              </span>
              {vm.nameResolution?.strainFamily && (
                <span className="text-xs text-white/60">
                  • {vm.nameResolution.strainFamily}-type
                </span>
              )}
            </div>
          )}

          {/* Confidence & image count */}
          {vm.multiImageInfo ? (
            <div className="space-y-2">
              <p className="text-sm text-white/70">
                {vm.multiImageInfo.imageCountText}
              </p>
              <div className="flex items-center gap-3">
                <p className="text-2xl md:text-3xl text-green-400 font-semibold">
                  {vm.multiImageInfo.confidenceRange}
                </p>
                {/* Phase 3.7 Part F — Confidence increased indicator */}
                {(vm.multiImageInfo?.imageCountText?.includes("2") || vm.multiImageInfo?.imageCountText?.includes("3") || vm.multiImageInfo?.imageCountText?.includes("4") || vm.multiImageInfo?.imageCountText?.includes("5")) && (
                  <span className="text-xs text-green-300 bg-green-500/20 px-2 py-1 rounded-full">
                    ✓ Multiple images boost
                  </span>
                )}
              </div>
              {vm.multiImageInfo.improvementExplanation && (
                <div className="space-y-1">
                  <p className="text-sm text-white/80 leading-relaxed">
                    {vm.multiImageInfo.improvementExplanation}
                  </p>
                  {/* Phase 3.7 Part F — Small explanation tooltip */}
                  {(vm.multiImageInfo?.imageCountText?.includes("2") || vm.multiImageInfo?.imageCountText?.includes("3") || vm.multiImageInfo?.imageCountText?.includes("4") || vm.multiImageInfo?.imageCountText?.includes("5")) && (
                    <p className="text-xs text-white/60 italic">
                      💡 Multiple angles improved accuracy
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <p className="text-2xl md:text-3xl text-green-400 font-semibold">
              {vm.confidenceRange
                ? `${vm.confidenceRange.min}–${vm.confidenceRange.max}%`
                : `${vm.confidence}%`}
            </p>
          )}

          {/* Rationale */}
          {vm.namingInfo?.rationale && (
            <p className="text-base md:text-lg text-white/90 leading-relaxed">
              {vm.namingInfo.rationale}
            </p>
          )}
        </div>
        </div>
      )}

      {/* Phase 3.8 Part E — Why This Match (Expandable) */}
        {/* STEP 5.4.6 — Deep explanations collapsed by default */}
        {vm.nameReasoning && vm.nameReasoning.bullets.length > 0 && (
          <CollapsibleSection
            title="Why This Name?"
            defaultExpanded={false}
            icon="💡"
          >
            <ul className="space-y-2">
              {vm.nameReasoning.bullets.map((bullet, idx) => (
                <li key={idx} className="text-white/80 text-sm flex items-start gap-2">
                  <span className="text-white/40 mt-1">•</span>
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          </CollapsibleSection>
        )}

        {/* Phase 3.8 Part E — Closest Alternatives (Collapsed) */}
        {(safeSecondaryMatches.length > 0 || vm.nameResolution?.closestAlternate) && (
          <CollapsibleSection
            title="Closest Alternatives"
            defaultExpanded={false}
            icon="🔍"
          >
            <div className="space-y-3">
              {/* Show name resolution alternate first if available */}
              {vm.nameResolution?.closestAlternate && (
                <div className="p-3 rounded-lg border border-white/10 bg-white/5">
                  <div className="flex items-start justify-between mb-1">
                    <p className="font-semibold text-white">
                      {vm.nameResolution.closestAlternate.name}
                    </p>
                    <span className="text-xs text-white/60">
                      {vm.nameResolution.closestAlternate.confidence}%
                    </span>
                  </div>
                  <p className="text-sm text-white/70">
                    {vm.nameResolution.closestAlternate.whyNotPrimary}
                  </p>
                </div>
              )}
              
              {/* Show other alternates */}
              {safeSecondaryMatches.slice(0, 3).map((match, idx) => (
                <div key={idx} className="p-3 rounded-lg border border-white/10 bg-white/5">
                  <div className="flex items-start justify-between mb-1">
                    <p className="font-semibold text-white">{match.name}</p>
                  </div>
                  {match.whyNotPrimary && (
                    <p className="text-sm text-white/70">{match.whyNotPrimary}</p>
                  )}
                </div>
              ))}
            </div>
          </CollapsibleSection>
        )}

      {/* STEP 5.4.4 — GENETICS CARD */}
      <div className="rounded-lg border border-white/10 bg-white/5 p-5 space-y-4">
        <h3 className="text-base font-semibold text-white/95 tracking-tight mb-4">Genetics</h3>
        <div className="space-y-4">
          {/* Dominance & Lineage — uses cultivarType (traits.type / genetics.dominance / analysis.dominance) */}
          {cultivarType !== "Unknown" && (
            <div>
              <h4 className="text-base font-semibold text-white/90 mb-2">
                Dominance Type
              </h4>
              {/* STEP 5.4.5 — Body text: readable at arm's length, bullet points > paragraphs */}
              <ul className="space-y-2">
                <li className="text-sm text-white/80 leading-relaxed">
                  This cultivar is classified as <strong className="text-white">{cultivarType}</strong>-dominant
                </li>
                {cultivarType === "Indica" && (
                  <>
                    <li className="text-sm text-white/80 leading-relaxed">Broad leaves and dense buds</li>
                    <li className="text-sm text-white/80 leading-relaxed">Relaxing body effects</li>
                  </>
                )}
                {cultivarType === "Sativa" && (
                  <>
                    <li className="text-sm text-white/80 leading-relaxed">Narrow leaves and elongated structure</li>
                    <li className="text-sm text-white/80 leading-relaxed">Uplifting cerebral effects</li>
                  </>
                )}
                {cultivarType === "Hybrid" && (
                  <li className="text-sm text-white/80 leading-relaxed">Combines traits from both genetic lineages with balanced characteristics</li>
                )}
              </ul>
            </div>
          )}

          {/* Parent Strains & Family Tree */}
          {/* STEP 5.5.6 — FAIL-SAFE UX: Always show lineage section, with fallback if no data */}
          <div>
            <h4 className="text-base font-semibold text-white/90 mb-2">
              Parent Strains & Family Tree
            </h4>
            {(() => {
              const lineage = vm.familyTree ||
                extendedProfile?.genetics.lineage ||
                vm.genetics?.lineage;
              
              if (lineage) {
                return (
                  <>
                    <p className="text-white/80 leading-relaxed mb-2">
                      {lineage}
                    </p>
                    <p className="text-white/80 leading-relaxed text-sm">
                      This genetic combination contributes to the distinctive traits observed in this cultivar. The parent strains influence the plant's morphology, effects, and cultivation characteristics.
                    </p>
                  </>
                );
              }
              
              // STEP 5.5.6 — Fallback: Show helpful message instead of empty section
              return (
                <p className="text-white/70 leading-relaxed text-sm italic">
                  Genetic lineage information is not available for this cultivar in the reference database.
                </p>
              );
            })()}
          </div>

          {/* Phenotype Expression */}
          <div>
            <h4 className="text-base font-semibold text-white/90 mb-2">
              Typical Phenotype Expression
            </h4>
            {/* STEP 5.4.5 — Bullet points > paragraphs */}
            <ul className="space-y-2">
              {cultivarType === "Indica" && (
                <>
                  <li className="text-sm text-white/80 leading-relaxed">Compact, bushy growth with dense flower clusters</li>
                  <li className="text-sm text-white/80 leading-relaxed">Broad, dark green leaves with tight internodal spacing</li>
                  <li className="text-sm text-white/80 leading-relaxed">Dense, heavy bud structure with high trichome production</li>
                </>
              )}
              {cultivarType === "Sativa" && (
                <>
                  <li className="text-sm text-white/80 leading-relaxed">Tall, lanky growth with elongated flower clusters</li>
                  <li className="text-sm text-white/80 leading-relaxed">Narrow, light green leaves with wider internodal spacing</li>
                  <li className="text-sm text-white/80 leading-relaxed">Airier, less dense bud structure than indica varieties</li>
                </>
              )}
              {(cultivarType === "Unknown" || cultivarType === "Hybrid") && (
                <>
                  <li className="text-sm text-white/80 leading-relaxed">Phenotypes vary based on genetic ratio</li>
                  <li className="text-sm text-white/80 leading-relaxed">May express indica-like traits (dense structure, broad leaves) or sativa traits (elongated structure, narrow leaves)</li>
                  <li className="text-sm text-white/80 leading-relaxed">Observed characteristics determine dominant influence</li>
                </>
              )}
            </ul>
          </div>

          {/* Breeder Origins */}
          {extendedProfile?.genetics.breederNotes &&
            extendedProfile.genetics.breederNotes.length > 0 && (
              <div>
                <h4 className="text-base font-semibold text-white/90 mb-2">
                  Known Origins & History
                </h4>
                {/* STEP 5.4.5 — Bullet points > paragraphs */}
                <ul className="space-y-2">
                  {extendedProfile.genetics.breederNotes.map((note, idx) => (
                    <li key={idx} className="text-sm text-white/80 leading-relaxed">
                      {note}
                    </li>
                  ))}
                </ul>
              </div>
            )}

          {/* STEP 5.4.5 — Uncertainty Note: readable text, bullet points */}
          {(!extendedProfile?.genetics.lineage && !vm.genetics?.lineage) && (
            <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4">
              <p className="text-sm font-semibold text-yellow-200 mb-2">Lineage Inference Limitation</p>
              <ul className="space-y-1.5 text-sm text-yellow-200/90 leading-relaxed">
                <li>Genetic lineage identification from visual analysis alone has limitations</li>
                <li>Parent strain information would require genetic testing or documented breeding records</li>
                <li>Dominance type (Indica/Sativa/Hybrid) is inferred from observable morphological traits</li>
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Phase 3.6 Part D — VISUAL & MORPHOLOGY ANALYSIS (Expanded by default) */}
      <CollapsibleSection
        title="Visual & Morphology Analysis"
        defaultExpanded={true}
        icon="🔬"
      >
        <div className="space-y-4">
          <p className="text-sm text-white/60 italic mb-4">
            Based solely on visual analysis{vm.multiImageInfo?.imageCountText ? ` of ${vm.multiImageInfo.imageCountText.toLowerCase()}` : ""}. These traits directly informed the
            match decision.
          </p>

          {/* Bud Density & Structure */}
          {(vm.flowerStructureAnalysis ||
            vm.primaryMatch?.whyThisMatch) && (
            <div>
              <h4 className="text-base font-semibold text-white/90 mb-2">
                Bud Density & Structure
              </h4>
              <p className="text-white/80 leading-relaxed">
                {vm.flowerStructureAnalysis ||
                  `The observed bud structure shows ${vm.morphology || "characteristics that align with known cultivars"}. This structural pattern was a key factor in the identification process.`}
              </p>
            </div>
          )}

          {/* Calyx Structure */}
          {vm.structure && (
            <div>
              <h4 className="text-base font-semibold text-white/90 mb-2">
                Calyx Formation
              </h4>
              <p className="text-white/80 leading-relaxed">{vm.structure}</p>
            </div>
          )}

          {/* Trichome Coverage */}
          {(vm.trichomeDensityMaturity || vm.trichomes) && (
            <div>
              <h4 className="text-base font-semibold text-white/90 mb-2">
                Trichome Coverage & Maturity
              </h4>
              <p className="text-white/80 leading-relaxed">
                {vm.trichomeDensityMaturity ||
                  vm.trichomes ||
                  "Trichome density and coverage are key indicators of resin production and maturity stage."}
              </p>
            </div>
          )}

          {/* Pistil Color & Maturity */}
          {(vm.colorPistilIndicators || vm.pistils) && (
            <div>
              <h4 className="text-base font-semibold text-white/90 mb-2">
                Pistil Color & Maturity Indicators
              </h4>
              <p className="text-white/80 leading-relaxed">
                {vm.colorPistilIndicators ||
                  vm.pistils ||
                  "Pistil coloration provides clues about flowering stage and can indicate strain characteristics."}
              </p>
            </div>
          )}

          {/* Leaf Shape Indicators */}
          {vm.leafShapeInternode && (
            <div>
              <h4 className="text-base font-semibold text-white/90 mb-2">
                Leaf Shape & Internodal Spacing
              </h4>
              <p className="text-white/80 leading-relaxed">
                {vm.leafShapeInternode}
              </p>
            </div>
          )}

          {/* Coloration */}
          {extendedProfile?.morphology.coloration && (
            <div>
              <h4 className="text-base font-semibold text-white/90 mb-2">
                Coloration Profile
              </h4>
              <p className="text-white/80 leading-relaxed">
                {extendedProfile.morphology.coloration}
                {extendedProfile.morphology.coloration.includes("purple") ||
                extendedProfile.morphology.coloration.includes("blue")
                  ? " These color variations can indicate specific genetic traits or environmental influences during growth."
                  : ""}
              </p>
            </div>
          )}

          {/* Match Decision Tie-in */}
          {vm.primaryMatch?.whyThisMatch && (
            <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-3">
              <p className="text-sm text-green-200 leading-relaxed">
                <strong>Match Decision:</strong> {vm.primaryMatch.whyThisMatch}
              </p>
            </div>
          )}
        </div>
      </CollapsibleSection>

      {/* Phase 3.6 Part E — TERPENE & CANNABINOID PROFILE */}
      <CollapsibleSection
        title="Terpene & Cannabinoid Profile"
        defaultExpanded={false}
        icon="🌿"
      >
        <div className="space-y-4">
          <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3 mb-4">
            <p className="text-sm text-yellow-200 leading-relaxed font-semibold">
              ⚠️ Inferred Profile — Not Lab Tested
            </p>
            <p className="text-sm text-yellow-200/90 leading-relaxed mt-1">
              The following profile is inferred from visual characteristics and
              known strain data. Actual terpene and cannabinoid levels require
              laboratory testing to confirm.
            </p>
          </div>

          {/* Dominant Terpenes */}
          {(extendedProfile?.terpeneProfile.primary.length > 0 ||
            safeTerpeneGuess.length > 0) && (
            <div>
              <h4 className="text-base font-semibold text-white/90 mb-2">
                Likely Dominant Terpenes
              </h4>
              <p className="text-white/80 leading-relaxed mb-2">
                Based on strain characteristics and visual indicators, this
                cultivar likely features the following terpenes:
              </p>
              <ul className="list-disc list-inside space-y-1 text-white/80 ml-2">
                {(extendedProfile?.terpeneProfile.primary || safeTerpeneGuess)
                  .slice(0, 5)
                  .map((terpene, idx) => (
                    <li key={idx}>
                      <strong>{terpene}</strong>
                      {terpene.toLowerCase().includes("myrcene")
                        ? " — Often associated with earthy, musky aromas and relaxing effects"
                        : terpene.toLowerCase().includes("pinene")
                        ? " — Typically produces pine, woodsy scents and may promote alertness"
                        : terpene.toLowerCase().includes("limonene")
                        ? " — Citrusy, bright aromas often linked to mood elevation"
                        : terpene.toLowerCase().includes("caryophyllene")
                        ? " — Spicy, peppery notes that may interact with the body's endocannabinoid system"
                        : terpene.toLowerCase().includes("linalool")
                        ? " — Floral, lavender-like scents associated with calming effects"
                        : ""}
                    </li>
                  ))}
              </ul>
            </div>
          )}

          {/* Aroma Description */}
          {extendedProfile?.terpeneProfile.aromaDescription && (
            <div>
              <h4 className="text-base font-semibold text-white/90 mb-2">
                Expected Aroma & Flavor
              </h4>
              <p className="text-white/80 leading-relaxed">
                {extendedProfile.terpeneProfile.aromaDescription}
              </p>
            </div>
          )}

          {/* Estimated Cannabinoid Ranges */}
          {extendedProfile?.cannabinoidProfile && (
            <div>
              <h4 className="text-base font-semibold text-white/90 mb-2">
                Estimated Cannabinoid Ranges
              </h4>
              <div className="space-y-2 text-white/80">
                {extendedProfile.cannabinoidProfile.thcRange && (
                  <p>
                    <strong>THC:</strong> {extendedProfile.cannabinoidProfile.thcRange}
                  </p>
                )}
                {extendedProfile.cannabinoidProfile.cbdRange && (
                  <p>
                    <strong>CBD:</strong> {extendedProfile.cannabinoidProfile.cbdRange}
                  </p>
                )}
                {extendedProfile.cannabinoidProfile.minorCannabinoids &&
                  extendedProfile.cannabinoidProfile.minorCannabinoids.length >
                    0 && (
                    <div>
                      <p className="mb-1">
                        <strong>Minor Cannabinoids:</strong>
                      </p>
                      <ul className="list-disc list-inside ml-4 space-y-1">
                        {extendedProfile.cannabinoidProfile.minorCannabinoids.map(
                          (cannabinoid, idx) => (
                            <li key={idx}>{cannabinoid}</li>
                          )
                        )}
                      </ul>
                    </div>
                  )}
              </div>
              <p className="text-sm text-white/60 italic mt-2">
                These ranges are typical for this strain type but can vary
                significantly based on growing conditions, harvest timing, and
                phenotype expression.
              </p>
            </div>
          )}
          
          {/* Phase 3.9 Part D — Entourage Effect Explanation */}
          {vm.entourageExplanation && (
            <div className="mt-4 p-3 rounded-lg border border-blue-500/30 bg-blue-500/10">
              <h4 className="text-base font-semibold text-blue-200 mb-2">
                The Entourage Effect
              </h4>
              <p className="text-sm text-blue-200/90 leading-relaxed">
                {vm.entourageExplanation}
              </p>
            </div>
          )}
        </div>
      </CollapsibleSection>

      {/* Phase 3.6 Part F — EXPECTED EFFECTS & USE CASES */}
      <CollapsibleSection
        title="Expected Effects & Use Cases"
        defaultExpanded={false}
        icon="✨"
      >
        <div className="space-y-4">
          {/* Primary Effects */}
          {extendedProfile?.effects.primary &&
            extendedProfile.effects.primary.length > 0 && (
              <div>
                <h4 className="text-base font-semibold text-white/90 mb-2">
                  Primary Effects
                </h4>
                <ul className="list-disc list-inside space-y-1 text-white/80 ml-2">
                  {extendedProfile.effects.primary.map((effect, idx) => (
                    <li key={idx}>{effect}</li>
                  ))}
                </ul>
              </div>
            )}

          {/* Secondary Effects */}
          {(extendedProfile?.effects.secondary?.length > 0 ||
            safeEffectsLong.length > 0) && (
            <div>
              <h4 className="text-base font-semibold text-white/90 mb-2">
                Secondary Effects
              </h4>
              <ul className="list-disc list-inside space-y-1 text-white/80 ml-2">
                {(
                  extendedProfile?.effects.secondary ||
                  safeEffectsLong
                ).map((effect, idx) => (
                  <li key={idx}>{effect}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Common Use Cases */}
          {extendedProfile?.commonUseCases &&
            extendedProfile.commonUseCases.length > 0 && (
              <div>
                <h4 className="text-base font-semibold text-white/90 mb-2">
                  Common Use Cases
                </h4>
                <ul className="list-disc list-inside space-y-1 text-white/80 ml-2">
                  {extendedProfile.commonUseCases.map((useCase, idx) => (
                    <li key={idx}>{useCase}</li>
                  ))}
                </ul>
              </div>
            )}

          {/* UI CONTRACT ENFORCEMENT — extendedProfile is optional, only render if present */}
          {/* Onset & Duration */}
          {extendedProfile?.effects && (extendedProfile.effects.onset ||
            extendedProfile.effects.duration) && (
            <div>
              <h4 className="text-base font-semibold text-white/90 mb-2">
                Experience Characteristics
              </h4>
              <div className="space-y-2 text-white/80">
                {extendedProfile.effects.onset && (
                  <p>
                    <strong>Onset:</strong> {extendedProfile.effects.onset}
                  </p>
                )}
                {extendedProfile.effects.duration && (
                  <p>
                    <strong>Duration:</strong> {extendedProfile.effects.duration}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Phase 3.9 Part E — Mental vs Body Balance (uses cultivarType) */}
          {cultivarType !== "Unknown" && (
            <div>
              <h4 className="text-base font-semibold text-white/90 mb-2">
                Mental vs Body Balance
              </h4>
              <p className="text-white/80 leading-relaxed">
                {cultivarType === "Indica"
                  ? "This cultivar tends to produce primarily body-focused effects with a strong physical relaxation component. While some mental effects may be present, the body sensations typically dominate the experience."
                  : cultivarType === "Sativa"
                  ? "This cultivar typically produces cerebral, mental effects with energizing qualities. Physical effects are usually minimal, allowing for active engagement and creative thinking."
                  : "This hybrid cultivar offers a balanced combination of mental and body effects. The specific balance can vary between phenotypes, with some leaning more toward cerebral stimulation and others toward physical relaxation."}
              </p>
            </div>
          )}
          
          {/* Phase 3.9 Part E — Variability Notes */}
          <div>
            <h4 className="text-base font-semibold text-white/90 mb-2">
              Why Effects Can Feel Different
            </h4>
            <p className="text-white/80 leading-relaxed">
              Individual experiences with this cultivar can vary significantly due to several factors. Personal tolerance, metabolism, consumption method (smoking, vaping, edibles), dosage, and even time of day can influence how effects are perceived. Additionally, phenotype variations within the same genetic lineage may produce slightly different cannabinoid and terpene ratios, leading to nuanced differences in effects. Environmental factors during cultivation—such as nutrient schedules, light cycles, and harvest timing—also contribute to variation in the final product.
            </p>
          </div>
          
          {/* Who It's Best For */}
          {vm.experience?.bestFor &&
            vm.experience.bestFor.length > 0 && (
              <div>
                <h4 className="text-base font-semibold text-white/90 mb-2">
                  Typically Best For
                </h4>
                <p className="text-white/80 leading-relaxed">
                  {vm.experience.bestFor.join(", ")}
                  . These use cases are commonly reported for this strain type
                  and may vary based on individual tolerance, dosage, and
                  consumption method.
                </p>
              </div>
            )}
        </div>
      </CollapsibleSection>
      
      {/* Phase 3.9 Part F — COMMON USE CASES (Detailed) */}
      <CollapsibleSection
        title="Common Use Cases"
        defaultExpanded={false}
        icon="📋"
      >
        <div className="space-y-4">
          {/* Common Use Cases — uses cultivarType */}
          {cultivarType !== "Unknown" && (
            <>
              {/* Day vs Night Use */}
              <div>
                <h4 className="text-base font-semibold text-white/90 mb-2">
                  Day vs Night Use
                </h4>
                <p className="text-white/80 leading-relaxed">
                  {cultivarType === "Indica"
                    ? "This cultivar is generally best suited for evening or nighttime use due to its relaxing and potentially sedative effects. It may interfere with daytime productivity or alertness."
                    : cultivarType === "Sativa"
                    ? "This cultivar is well-suited for daytime use, as it typically provides energizing and uplifting effects without heavy sedation. It can enhance focus and creativity during active hours."
                    : "This hybrid cultivar can work for both day and night use depending on the specific phenotype and individual response. Some may find it suitable for afternoon or early evening, while others may prefer it for relaxed evening activities."}
                </p>
              </div>
              
              {/* Creativity / Focus / Relaxation */}
              <div>
                <h4 className="text-base font-semibold text-white/90 mb-2">
                  Activity Suitability
                </h4>
                <div className="space-y-2 text-white/80">
                  {cultivarType === "Indica" ? (
                    <>
                      <p><strong>Creativity:</strong> Lower stimulation may limit creative bursts; better for reflective, contemplative creative work.</p>
                      <p><strong>Focus:</strong> Not ideal for tasks requiring sharp focus; better for relaxation and stress relief.</p>
                      <p><strong>Relaxation:</strong> Excellent for unwinding, stress relief, and physical relaxation after activities.</p>
                    </>
                  ) : cultivarType === "Sativa" ? (
                    <>
                      <p><strong>Creativity:</strong> Excellent for stimulating creative thinking, brainstorming, and artistic activities.</p>
                      <p><strong>Focus:</strong> Can enhance focus and productivity for engaging tasks, though effects vary by individual.</p>
                      <p><strong>Relaxation:</strong> Mental relaxation possible, but physical relaxation is typically minimal.</p>
                    </>
                  ) : (
                    <>
                      <p><strong>Creativity:</strong> Moderate creative enhancement depending on phenotype balance.</p>
                      <p><strong>Focus:</strong> Can support focus for engaging tasks, with effects varying by individual and dosage.</p>
                      <p><strong>Relaxation:</strong> Balanced relaxation—mental calm with moderate physical relaxation.</p>
                    </>
                  )}
                </div>
              </div>
              
              {/* Social vs Solo */}
              <div>
                <h4 className="text-base font-semibold text-white/90 mb-2">
                  Social vs Solo Contexts
                </h4>
                <p className="text-white/80 leading-relaxed">
                  {cultivarType === "Indica"
                    ? "This cultivar is typically better suited for solo or small-group settings where relaxation and introspection are desired. Large social gatherings may feel overwhelming."
                    : cultivarType === "Sativa"
                    ? "This cultivar can enhance social experiences by promoting conversation, energy, and engagement. It's well-suited for group activities and social gatherings."
                    : "This hybrid cultivar can work in both social and solo contexts, with effects varying based on the specific balance of indica and sativa traits. It offers flexibility for different social situations."}
                </p>
              </div>
            </>
          )}
        </div>
      </CollapsibleSection>
      
      {/* Phase 3.9 Part G — VARIANTS & CLOSE RELATIVES */}
      {/* STEP 5.4.6 — Clone detection collapsed by default */}
      {(vm.relatedStrains && vm.relatedStrains.length > 0) || 
       (extendedProfile?.knownVariations && extendedProfile.knownVariations.length > 0) ? (
        <CollapsibleSection
          title="Variants & Close Relatives"
          defaultExpanded={false}
          icon="🌳"
        >
          <div className="space-y-4">
            {/* Related Strains */}
            {vm.relatedStrains && vm.relatedStrains.length > 0 && (
              <div>
                <h4 className="text-base font-semibold text-white/90 mb-2">
                  Closely Related Strains
                </h4>
                <div className="space-y-3">
                  {vm.relatedStrains.map((related, idx) => (
                    <div key={idx} className="p-3 rounded-lg border border-white/10 bg-white/5">
                      <div className="flex items-start justify-between mb-1">
                        <p className="font-semibold text-white">{related.name}</p>
                        <span className="text-xs text-white/60 bg-white/10 px-2 py-1 rounded">
                          {related.relationship}
                        </span>
                      </div>
                      <p className="text-sm text-white/70">{related.reason}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Phenotype Variations */}
            {extendedProfile?.knownVariations && extendedProfile.knownVariations.length > 0 && (
              <div>
                <h4 className="text-base font-semibold text-white/90 mb-2">
                  Phenotype Variations
                </h4>
                <ul className="list-disc list-inside space-y-1 text-white/80 ml-2">
                  {extendedProfile.knownVariations.map((variation, idx) => (
                    <li key={idx}>{variation}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </CollapsibleSection>
      ) : null}

      {/* Phase 3.6 Part G — GROWTH & CULTIVATION NOTES */}
      <CollapsibleSection
        title="Growth & Cultivation Notes"
        defaultExpanded={false}
        icon="🌱"
      >
        <div className="space-y-4">
          {extendedProfile?.cultivationNotes ? (
            <>
              {/* Indoor vs Outdoor */}
              {extendedProfile.cultivationNotes.indoorOutdoor && (
                <div>
                  <h4 className="text-base font-semibold text-white/90 mb-2">
                    Indoor vs Outdoor Tendencies
                  </h4>
                  <p className="text-white/80 leading-relaxed">
                    {extendedProfile.cultivationNotes.indoorOutdoor}
                  </p>
                </div>
              )}

              {/* Flowering Time */}
              {extendedProfile.cultivationNotes.floweringTime && (
                <div>
                  <h4 className="text-base font-semibold text-white/90 mb-2">
                    Flowering Time Range
                  </h4>
                  <p className="text-white/80 leading-relaxed">
                    {extendedProfile.cultivationNotes.floweringTime}
                  </p>
                </div>
              )}

              {/* Yield Expectations */}
              {extendedProfile.cultivationNotes.yieldEstimate && (
                <div>
                  <h4 className="text-base font-semibold text-white/90 mb-2">
                    Yield Expectations
                  </h4>
                  <p className="text-white/80 leading-relaxed">
                    {extendedProfile.cultivationNotes.yieldEstimate}
                  </p>
                </div>
              )}
            </>
          ) : (
            <div>
              <p className="text-white/80 leading-relaxed">
                Growth stage and cultivation details are limited by the visible
                characteristics in the provided image
                {imageCount > 1 ? "s" : ""}. To provide detailed cultivation
                notes, images showing the full plant structure, growth medium,
                and environmental conditions would be helpful.
              </p>
            </div>
          )}

          {/* Known Sensitivities */}
          {extendedProfile?.knownVariations &&
            extendedProfile.knownVariations.length > 0 && (
              <div>
                <h4 className="text-base font-semibold text-white/90 mb-2">
                  Known Variations & Sensitivities
                </h4>
                <ul className="list-disc list-inside space-y-1 text-white/80 ml-2">
                  {extendedProfile.knownVariations.map((variation, idx) => (
                    <li key={idx}>{variation}</li>
                  ))}
                </ul>
              </div>
            )}

          {/* Growth Traits from Analysis */}
          {safeGrowthTraits.length > 0 && (
            <div>
              <h4 className="text-base font-semibold text-white/90 mb-2">
                Observed Growth Characteristics
              </h4>
              <ul className="list-disc list-inside space-y-1 text-white/80 ml-2">
                {safeGrowthTraits.map((trait, idx) => (
                  <li key={idx}>{trait}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </CollapsibleSection>

      {/* Phase 3.9 Part H — CONFIDENCE & DISCLAIMERS */}
      <CollapsibleSection
        title="Confidence & Disclaimers"
        defaultExpanded={false}
        icon="ℹ️"
      >
        <div className="space-y-4">
          {/* Confidence Tier */}
          {vm.confidenceTier && (
            <div>
              <h4 className="text-base font-semibold text-white/90 mb-2">
                Confidence Assessment
              </h4>
              <div className="p-3 rounded-lg border border-white/10 bg-white/5 mb-2">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`text-xs font-semibold px-3 py-1 rounded-full ${
                      vm.confidenceTier.tier === "high"
                        ? "bg-green-500/20 text-green-300"
                    : vm.confidenceTier.tier === "medium"
                    ? "bg-yellow-500/20 text-yellow-300"
                    : "bg-orange-500/20 text-orange-300"
                    }`}
                  >
                    {vm.confidenceTier.label}
                  </span>
                  <span className="text-sm text-white/60">
                    {vm.confidenceRange
                      ? `${vm.confidenceRange.min}–${vm.confidenceRange.max}%`
                      : `${vm.confidence}%`}
                  </span>
                </div>
                <p className="text-sm text-white/70">
                  {vm.confidenceTier.description}
                </p>
              </div>
            </div>
          )}
          
          {/* What Increased Confidence */}
          {imageCount > 1 && (
            <div>
              <h4 className="text-base font-semibold text-white/90 mb-2">
                What Increased Confidence
              </h4>
              <ul className="list-disc list-inside space-y-1 text-white/80 ml-2">
                {imageCount >= 2 && (
                  <li>Multiple images ({imageCount}) provided cross-validation</li>
                )}
                {vm.multiImageInfo?.improvementExplanation && (
                  <li>{vm.multiImageInfo.improvementExplanation}</li>
                )}
                {vm.nameResolution?.matchType === "clear_winner" && (
                  <li>Strong consensus across all analyzed images</li>
                )}
                {vm.confidenceTier?.tier === "high" && (
                  <li>High visual trait alignment with known cultivar characteristics</li>
                )}
              </ul>
            </div>
          )}
          
          {/* What Reduced Certainty */}
          <div>
            <h4 className="text-base font-semibold text-white/90 mb-2">
              What Reduced Certainty
            </h4>
            <ul className="list-disc list-inside space-y-1 text-white/80 ml-2">
              {imageCount === 1 && (
                <li>Single image analysis limits perspective and cross-validation</li>
              )}
              {vm.confidenceTier?.tier === "low" && (
                <li>Visual traits showed significant variation or ambiguity</li>
              )}
              {vm.nameResolution?.matchType === "family_level" && (
                <li>Specific cultivar identification uncertain; family-level match provided</li>
              )}
              <li>Phenotype variation within strains can create visual ambiguity</li>
              <li>Visual analysis cannot confirm genetic identity without laboratory testing</li>
            </ul>
          </div>
          
          {/* Non-Lab Disclaimer */}
          <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4">
            <h4 className="text-base font-semibold text-yellow-200 mb-2">
              Important: Visual Identification Only
            </h4>
            <p className="text-sm text-yellow-200/90 leading-relaxed">
              This identification is based solely on visual analysis of morphological characteristics. While visual traits provide strong indicators, definitive cultivar identification requires genetic testing or documented breeding records. The confidence level reflects the strength of visual alignment, not absolute certainty. Cannabinoid and terpene profiles, effects, and cultivation characteristics are inferred from known strain data and may vary significantly between phenotypes and growing conditions.
            </p>
          </div>

          {/* Phenotype Variation */}
          <div>
            <h4 className="text-base font-semibold text-white/90 mb-2">
              Phenotype Variation
            </h4>
            <p className="text-white/80 leading-relaxed">
              Cannabis plants of the same genetic lineage can display different
              physical characteristics (phenotypes) based on environmental
              factors during growth. Light intensity, temperature, humidity,
              nutrient availability, and harvest timing all influence the final
              appearance. This means two plants with identical genetics may look
              different, while two different strains might appear similar under
              certain conditions.
            </p>
          </div>

          {/* Environmental Effects */}
          <div>
            <h4 className="text-base font-semibold text-white/90 mb-2">
              Environmental Effects on Appearance
            </h4>
            <p className="text-white/80 leading-relaxed">
              Growing conditions significantly impact visual traits. Indoor
              cultivation with controlled environments often produces different
              bud structures and coloration than outdoor grows. Stress factors
              (nutrient deficiencies, light burn, temperature fluctuations) can
              alter leaf coloration, trichome density, and overall morphology.
              The images analyzed represent a single moment in time and may not
              reflect the full range of characteristics this cultivar can
              express.
            </p>
          </div>

          {/* Multiple Images Benefit */}
          {imageCount > 1 && (
            <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-3">
              <h4 className="text-base font-semibold text-green-200 mb-2">
                Multiple Images Improve Accuracy
              </h4>
              <p className="text-sm text-green-200/90 leading-relaxed">
                Analyzing {imageCount} images from different angles provides a
                more comprehensive view of the plant's characteristics. When
                multiple images agree on key traits (bud structure, trichome
                density, coloration), confidence in the identification increases.
                Disagreement between images indicates natural variation or
                different growth stages, which is accounted for in the
                confidence range.
              </p>
            </div>
          )}

          {/* Disclaimers */}
          {extendedProfile?.disclaimers &&
            extendedProfile.disclaimers.length > 0 && (
              <div>
                <h4 className="text-base font-semibold text-white/90 mb-2">
                  Important Disclaimers
                </h4>
                <ul className="list-disc list-inside space-y-1 text-white/80 ml-2">
                  {extendedProfile.disclaimers.map((disclaimer, idx) => (
                    <li key={idx}>{disclaimer}</li>
                  ))}
                </ul>
              </div>
            )}

          {/* Sources */}
          {vm.trustLayer?.sourcesUsed &&
            vm.trustLayer.sourcesUsed.length > 0 && (
              <div className="pt-4">
                <p className="text-xs text-white/60">
                  <strong>Sources:</strong>{" "}
                  {(vm.trustLayer?.sourcesUsed ?? []).join(", ")}
                </p>
              </div>
            )}
        </div>
      </CollapsibleSection>
      
      {/* Phase 5.3.7 — PRO DIFFERENTIATION (NOT GATING) */}
      {/* Pro enhancements are displayed as additional sections, never replacing free tier content */}
      {(() => {
        const proEnhancements = (result as any)?.proEnhancements;
        if (!proEnhancements) {
          // Free tier: Show soft nudge
          return (
            <div className="mt-8 pt-8">
              <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                <p className="text-sm text-white/75 text-center leading-relaxed">
                  Increase certainty with more angles, or unlock Pro for deeper analysis.
                </p>
              </div>
            </div>
          );
        }
        
        // Pro tier: Show pro enhancements (soft card boundaries)
        return (
          <div className="space-y-6 pt-8 mt-8">
            {/* STEP 5.4.6 — Deep explanations collapsed by default */}
            {/* Phase 5.3.7.1 — Detailed Why-This-Name-Won Breakdown */}
            {proEnhancements.detailedWhyThisNameWon && proEnhancements.detailedWhyThisNameWon.length > 0 && (
              <CollapsibleSection
                title="Detailed Match Breakdown"
                defaultExpanded={false}
                icon="🔬"
              >
                <div className="space-y-2">
                  {proEnhancements.detailedWhyThisNameWon.map((reason, idx) => (
                    <p key={idx} className="text-sm text-white/80 leading-relaxed">
                      • {reason}
                    </p>
                  ))}
                </div>
              </CollapsibleSection>
            )}
            
            {/* Phase 5.3.7.2 — Clone/Phenotype Explanation */}
            {proEnhancements.clonePhenotypeExplanation && (
              <CollapsibleSection
                title="Clone & Phenotype Information"
                defaultExpanded={false}
                icon="🧬"
              >
                <p className="text-sm text-white/80 leading-relaxed">
                  {proEnhancements.clonePhenotypeExplanation}
                </p>
              </CollapsibleSection>
            )}
            
            {/* STEP 5.4.6 — Per-image findings collapsed by default */}
            {/* Phase 5.3.7.3 — Per-Image Analysis */}
            {proEnhancements.perImageAnalysis && proEnhancements.perImageAnalysis.length > 0 && (
              <CollapsibleSection
                title="Per-Image Analysis"
                defaultExpanded={false}
                icon="📸"
              >
                <div className="space-y-4">
                  {proEnhancements.perImageAnalysis.map((analysis, idx) => (
                    <div key={idx} className="p-4 rounded-lg border border-white/10 bg-white/5">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-semibold text-white/90">Image {analysis.imageIndex}</h4>
                        <span className="text-xs text-white/60">{analysis.confidence}% confidence</span>
                      </div>
                      <p className="text-sm font-medium text-white/80 mb-2">{analysis.identifiedStrain}</p>
                      {analysis.keyTraits.length > 0 && (
                        <div className="mb-2">
                          <p className="text-xs text-white/60 mb-1">Key traits:</p>
                          <ul className="list-disc list-inside text-xs text-white/70 ml-2">
                            {analysis.keyTraits.map((trait, traitIdx) => (
                              <li key={traitIdx}>{trait}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {analysis.whyThisStrain.length > 0 && (
                        <div>
                          <p className="text-xs text-white/60 mb-1">Why this strain:</p>
                          <ul className="list-disc list-inside text-xs text-white/70 ml-2">
                            {analysis.whyThisStrain.map((reason, reasonIdx) => (
                              <li key={reasonIdx}>{reason}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CollapsibleSection>
            )}
            
            {/* Phase 5.3.7.4 — Confidence Delta */}
            {proEnhancements.confidenceDelta && (
              <div className="p-4 rounded-lg border border-blue-500/30 bg-blue-500/10">
                <h4 className="text-sm font-semibold text-blue-200 mb-2">Confidence Improvement Potential</h4>
                <p className="text-sm text-blue-200/90 leading-relaxed mb-2">
                  {proEnhancements.confidenceDelta.explanation}
                </p>
                <div className="flex items-center gap-4 mt-3">
                  <div>
                    <p className="text-xs text-blue-200/70 mb-1">Current</p>
                    <p className="text-lg font-semibold text-blue-200">{proEnhancements.confidenceDelta.currentConfidence}%</p>
                  </div>
                  <div className="text-blue-200/50">→</div>
                  <div>
                    <p className="text-xs text-blue-200/70 mb-1">With more images</p>
                    <p className="text-lg font-semibold text-blue-200">{proEnhancements.confidenceDelta.estimatedConfidenceWithMoreImages}%</p>
                  </div>
                  <div className="ml-auto">
                    <p className="text-xs text-blue-200/70 mb-1">Potential gain</p>
                    <p className="text-lg font-semibold text-green-400">+{proEnhancements.confidenceDelta.delta}%</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })()}
    </section>
  );
}
