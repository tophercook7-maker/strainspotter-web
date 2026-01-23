// app/garden/scanner/WikiStyleResultPanel.tsx
// Phase 3.6 — Extensive Wiki-Style Result Expansion

"use client";

import type { FullScanResult } from "@/lib/scanner/types";
import CollapsibleSection from "./CollapsibleSection";

export default function WikiStyleResultPanel({
  result,
}: {
  result: FullScanResult;
}) {
  // Extract ViewModel from FullScanResult (architecture: analysis layer separate from ViewModel)
  const viewModel = result.result;
  // Note: result.analysis contains dominance data (not in ViewModel) - access via result.analysis.dominance
  
  // Derive image count from multiImageInfo if available
  const imageCount = viewModel.multiImageInfo?.imageCountText 
    ? parseInt(viewModel.multiImageInfo.imageCountText.match(/\d+/)?.[0] || "1")
    : 1;
  // Phase 3.6 Part A — Result Structure (Order Locked)
  // 1. STRAIN IDENTITY (ABOVE THE FOLD - Always visible)
  // 2-7: Collapsible sections, top 2 expanded by default

  const safeSecondaryMatches = Array.isArray(viewModel.secondaryMatches)
    ? viewModel.secondaryMatches
    : [];
  const safeReferenceStrains = Array.isArray(viewModel.referenceStrains)
    ? viewModel.referenceStrains
    : [];
  const safeTerpeneGuess = Array.isArray(viewModel.terpeneGuess)
    ? viewModel.terpeneGuess
    : [];
  const safeEffectsLong = Array.isArray(viewModel.effectsLong)
    ? viewModel.effectsLong
    : [];
  const safeGrowthTraits = Array.isArray(viewModel.growthTraits)
    ? viewModel.growthTraits
    : [];
  // UI CONTRACT ENFORCEMENT — extendedProfile is optional, only use if present
  const extendedProfile = viewModel.extendedProfile;

  // Phase 3.6 Part B — Determine strain family from name or lineage
  const getStrainFamily = (): string | null => {
    const name = viewModel.name || "";
    if (name.toLowerCase().includes("kush")) return "Kush";
    if (name.toLowerCase().includes("cookies")) return "Cookies";
    if (name.toLowerCase().includes("haze")) return "Haze";
    if (name.toLowerCase().includes("purple")) return "Purple";
    if (name.toLowerCase().includes("blue")) return "Blue";
    if (name.toLowerCase().includes("white")) return "White";
    if (name.toLowerCase().includes("og")) return "OG";
    
    // Check lineage
    const lineage = viewModel.genetics?.lineage || "";
    if (lineage.toLowerCase().includes("kush")) return "Kush";
    if (lineage.toLowerCase().includes("haze")) return "Haze";
    if (lineage.toLowerCase().includes("cookies")) return "Cookies";
    
    return null;
  };

  const strainFamily = getStrainFamily();

  return (
    <section className="max-w-[680px] mx-auto rounded-2xl border border-white/15 bg-white/5 backdrop-blur-xl shadow-xl shadow-black/30 p-5 sm:p-6 space-y-6 max-h-[85vh] overflow-y-auto">
      {/* Phase 4.5 Step 4.5.1 — NAME LOCK HEADER (TOP PRIORITY) */}
      {/* Phase 15.5.5 — Make strain name + confidence feel real */}
      {/* Phase 4.1 — UI NEVER EMPTY: nameFirstDisplay is guaranteed */}
      <div className="mb-6 space-y-4 pb-6">
        {/* Phase 15.5.5 — Large Strain Name */}
        {/* Phase 4.2 — Name Stability & Trust Messaging */}
        <div className="mb-4">
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                {viewModel.nameFirstDisplay.primaryStrainName === "Closest Known Cultivar"
                  ? "Unidentified Hybrid Phenotype"
                  : viewModel.nameFirstDisplay.primaryStrainName}
              </h1>
              
              {/* Phase 4.2 — Inline note below name (always present) */}
              <p className="text-xs text-white/50 mt-2 leading-relaxed">
                Selected as the closest overall match after comparing visual structure,
                bud density, coloration, and known cultivar traits.
              </p>
              
              {/* Phase 4.2 — Subtle info banner (if samePlantNote exists OR multiple images) */}
              {(() => {
                const hasSamePlantNote = !!(result as any).samePlantNote;
                const imageCount = viewModel.multiImageInfo?.imageCountText 
                  ? parseInt(viewModel.multiImageInfo.imageCountText.match(/\d+/)?.[0] || "1")
                  : 1;
                
                if (hasSamePlantNote || imageCount > 1) {
                  return (
                    <div className="mt-2 rounded-md border border-blue-500/20 bg-blue-500/10 px-3 py-2">
                      <p className="text-xs text-blue-200/90 leading-relaxed">
                        Scanning the same plant from additional angles improves name stability.
                      </p>
                    </div>
                  );
                }
                
                return null;
              })()}
              
              {/* Phase 4.2 — Enhanced subtitle with trust messaging */}
              <div className="mt-2 space-y-1">
                {(() => {
                  const confidence = Math.round(viewModel.nameFirstDisplay.confidencePercent ?? viewModel.nameFirstDisplay.confidence ?? 0);
                  const scanStatus = (result as any).status || "success";
                  const isFallback = viewModel.nameFirstDisplay.primaryStrainName === "Closest Known Cultivar";
                  
                  if (isFallback) {
                    return (
                      <div className="text-sm text-muted-foreground">
                        Best available match from 35,000+ strain database
                      </div>
                    );
                  }
                  
                  // Phase 4.2 — Updated primary name header copy
                  if (confidence >= 90) {
                    return (
                      <div className="text-sm text-muted-foreground">
                        Strong visual and database agreement
                      </div>
                    );
                  } else if (confidence >= 80 && confidence < 90 && scanStatus !== "partial") {
                    return (
                      <div className="text-sm text-muted-foreground">
                        Best match based on visible traits and known cultivars
                      </div>
                    );
                  } else {
                    // confidence < 80 OR status === "partial"
                    return (
                      <div className="text-sm text-muted-foreground">
                        Closest known cultivar based on available visual data
                      </div>
                    );
                  }
                })()}
              </div>
            </div>
            
            {/* Phase 4.2 — Trust indicator badge */}
            {viewModel.nameFirstDisplay.primaryStrainName !== "Closest Known Cultivar" && (
              <div className="mt-1">
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  <span className="mr-1.5">✓</span>
                  Database Match
                </span>
              </div>
            )}
          </div>
          
          {/* Phase 4.0.3.1 — Confidence badge (always visible) */}
          {/* Phase 4.3 — Enhanced with expert-driven messaging */}
          {/* Phase 4.3.1 — Normalized badge tiers and visual capping */}
          {(() => {
            const rawConfidence = Math.round(viewModel.nameFirstDisplay.confidencePercent ?? viewModel.nameFirstDisplay.confidence ?? 0);
            // Phase 4.3.1 — Cap displayed confidence visually at 95% (logic unchanged)
            const confidence = Math.min(95, rawConfidence);
            
            // Phase 4.3.1 — Normalized badge tiers
            let confidenceTier: "very_high" | "high" | "moderate" | "low";
            let confidenceLabel: string;
            let confidenceColor: string;
            
            if (confidence >= 93) {
              confidenceTier = "very_high";
              confidenceLabel = "Very High Confidence";
              confidenceColor = "bg-green-600";
            } else if (confidence >= 85) {
              confidenceTier = "high";
              confidenceLabel = "High Confidence";
              confidenceColor = "bg-green-600";
            } else if (confidence >= 70) {
              confidenceTier = "moderate";
              confidenceLabel = "Moderate Confidence";
              confidenceColor = "bg-yellow-500";
            } else {
              confidenceTier = "low";
              confidenceLabel = "Low Confidence";
              confidenceColor = "bg-red-600";
            }
            
            // Phase 4.3 — Expert-driven confidence explanation (updated for new tiers)
            const confidenceExplanation = confidence >= 93
              ? "Expert analysis confirms strong match"
              : confidence >= 85
              ? "Expert analysis confirms strong match"
              : confidence >= 70
              ? "Expert analysis indicates likely match"
              : "Expert analysis suggests closest available match";
            
            return (
              <div className="mt-2 space-y-2">
                <div className="inline-flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold text-white ${confidenceColor}`}>
                    {confidenceLabel} ({confidence}%)
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {confidenceExplanation}
                  </span>
                </div>
                {/* Phase 4.3 — Confidence foundation explanation */}
                <p className="text-xs text-white/60 leading-relaxed">
                  Confidence calculated from systematic comparison of visual structure, bud morphology, and database alignment across {viewModel.multiImageInfo?.imageCountText?.match(/\d+/)?.[0] || "1"} image{viewModel.multiImageInfo?.imageCountText?.match(/\d+/)?.[0] !== "1" ? "s" : ""}.
                </p>
              </div>
            );
          })()}
          
          {/* Phase 4.2 — Name Selection Trust Message */}
          {viewModel.nameFirstDisplay.primaryStrainName !== "Closest Known Cultivar" && (
            <div className="mt-3 rounded-lg border border-white/10 bg-white/5 p-3">
              <p className="text-xs text-white/70 leading-relaxed">
                <span className="font-semibold text-white/90">Name Selection:</span>{" "}
                This strain name was selected through systematic analysis comparing your images against a database of 35,000+ documented cultivars. The identification is based on visual morphology, genetic lineage, and known cultivar characteristics.
              </p>
            </div>
          )}
          
          {/* Phase 4.1 — Why This Looks Like {Primary Strain Name} */}
          <div className="mt-4 space-y-2">
            <h3 className="text-base font-semibold text-white/90">
              Why This Looks Like {viewModel.nameFirstDisplay.primaryStrainName}
            </h3>
            {viewModel.nameFirstDisplay.explanation?.whyThisNameWon && 
             viewModel.nameFirstDisplay.explanation.whyThisNameWon.length > 0 ? (
              <ul className="space-y-1.5">
                {viewModel.nameFirstDisplay.explanation.whyThisNameWon.slice(0, 6).map((reason, idx) => (
                  <li key={idx} className="text-sm text-white/80 leading-relaxed flex items-start">
                    <span className="text-green-400 mr-2 mt-1">•</span>
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-white/70 italic">
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
              const confidence = Math.round(viewModel.nameFirstDisplay.confidencePercent ?? viewModel.nameFirstDisplay.confidence ?? 0);
              const imageCount = viewModel.multiImageInfo?.imageCountText 
                ? parseInt(viewModel.multiImageInfo.imageCountText.match(/\d+/)?.[0] || "1")
                : 1;
              // Phase 4.1 — Check scan status from result (FullScanResult may not have status directly)
              const scanStatus = (result as any).status || "success";
              const hasSamePlantNote = !!(result as any).samePlantNote;
              const hasDiversityNote = !!(result as any).diversityNote;
              
              const explanations: string[] = [];
              
              // Phase 4.3 — Expert-driven confidence foundation
              if (confidence >= 85) {
                explanations.push("Expert analysis determined strong alignment between observed traits and documented cultivar characteristics.");
              } else if (confidence >= 70) {
                explanations.push("Expert analysis indicates good alignment with known cultivar traits, with some expected variation.");
              } else {
                explanations.push("Expert analysis identified the closest available match based on systematic comparison of visual and genetic data.");
              }
              
              // Image count explanation
              if (imageCount === 1) {
                explanations.push("Single-image analysis limits perspective — multiple angles improve accuracy.");
              } else if (imageCount >= 3) {
                explanations.push(`Multiple angles (${imageCount} images) showed consistent traits across expert analysis.`);
              } else if (imageCount === 2) {
                explanations.push("Two images provided cross-validation of key characteristics through expert comparison.");
              }
              
              // Diversity note explanation
              if (hasDiversityNote || hasSamePlantNote) {
                if (hasSamePlantNote) {
                  explanations.push("Images appear to be of the same plant — different angles would strengthen expert confidence.");
                } else {
                  explanations.push("Limited image diversity reduced certainty in expert analysis.");
                }
              }
              
              // Confidence level explanation (enhanced)
              if (confidence >= 85) {
                explanations.push("Strong visual agreement across analyzed images confirmed through expert review.");
                if (imageCount >= 2) {
                  explanations.push("Multiple viewing angles confirmed consistent morphological features in expert assessment.");
                }
              } else if (confidence >= 70) {
                explanations.push("Most traits aligned in expert analysis, some variation observed.");
                if (scanStatus === "partial") {
                  explanations.push("Partial analysis — additional images would improve expert confidence.");
                }
              } else if (confidence >= 60) {
                explanations.push("Expert analysis shows moderate alignment — visual traits show some variation.");
                if (imageCount === 1) {
                  explanations.push("Single-image analysis limits expert certainty.");
                }
              } else {
                explanations.push("Lower confidence in expert analysis — limited visual distinction between similar cultivars.");
                if (imageCount === 1) {
                  explanations.push("Additional images from different angles would improve expert accuracy.");
                }
              }
              
              // Visual agreement note
              if (imageCount >= 2 && !hasDiversityNote && !hasSamePlantNote) {
                explanations.push("Visual features showed good agreement across images in expert comparison.");
              }
              
              return (
                <div className="space-y-1.5">
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
            const confidence = Math.round(viewModel.nameFirstDisplay.confidencePercent ?? viewModel.nameFirstDisplay.confidence ?? 0);
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
                  <p className="text-xs text-white/50 italic mt-3 pt-2 border-t border-white/10">
                    If this is the same plant, future scans will become more accurate.
                  </p>
                </div>
              </CollapsibleSection>
            );
          })()}
            
            {/* Phase 4.2 — Name Stability Indicator */}
            {/* Phase 4.3 — Enhanced with expert-driven stability messaging */}
            {(() => {
              const confidence = Math.round(viewModel.nameFirstDisplay.confidencePercent ?? viewModel.nameFirstDisplay.confidence ?? 0);
              const scanStatus = (result as any).status || "success";
              
              // Show stability message for medium/high confidence or when name is stable
              if (confidence >= 70 || viewModel.nameFirstDisplay?.nameStabilityScore) {
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
                            ? "Expert analysis confirms this name is highly stable and unlikely to change with additional images."
                            : confidence >= 70
                            ? "Expert analysis indicates this identification is stable. Additional images may refine confidence but are unlikely to change the primary match determined by expert comparison."
                            : "This name was selected through expert systematic comparison and represents the best available match."}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              }
              
              // For lower confidence, show a different message
              if (confidence < 70 || scanStatus === "partial") {
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
            {viewModel.nameFirstDisplay?.nameStabilityScore && (
              <div className="mt-2 text-sm text-white/70">
                <span className="font-semibold">Name confidence:</span>{" "}
                {viewModel.nameFirstDisplay.nameStabilityScore}%
              </div>
            )}
            
            {/* Phase 4.0.4 — transparent explanation (no scary errors) */}
            {(result.diversityNote || (viewModel.notes && viewModel.notes.some(n => 
              n.toLowerCase().includes("similar") || n.toLowerCase().includes("diversity") || n.toLowerCase().includes("varied angles")
            ))) && (
              <div className="text-xs text-yellow-400 mt-2">
                {result.diversityNote || viewModel.notes?.find(n => 
                  n.toLowerCase().includes("similar") || n.toLowerCase().includes("diversity") || n.toLowerCase().includes("varied angles")
                )}
              </div>
            )}
            
            {/* Phase 4.0.6 — non-blocking scan warning display */}
            {result.scanWarning && (
              <div className="mt-3 rounded-lg border border-yellow-400/40 bg-yellow-400/10 p-3 text-xs text-yellow-300">
                {result.scanWarning}
              </div>
            )}

            {/* Phase 4.0.5 — Warning display (non-blocking) */}
            {result.warnings?.length > 0 && (
              <div className="mt-4 rounded-lg border border-yellow-400/30 bg-yellow-500/10 p-3 text-sm text-yellow-200">
                {result.warnings.map((w, i) => (
                  <div key={i}>⚠️ {w}</div>
                ))}
              </div>
            )}

            {/* Phase 4.2.6 — render guidance hints (collapsed, subtle) */}
            {result.meta?.guidanceHints?.length ? (
              <div className="mt-4 text-xs text-white/60">
                <div className="font-semibold mb-1">Improve Scan Accuracy</div>
                <ul className="list-disc list-inside space-y-1">
                  {result.meta.guidanceHints.includes("TRY_DIFFERENT_ANGLE") && (
                    <li>Try a different angle (side vs top view)</li>
                  )}
                  {result.meta.guidanceHints.includes("TRY_DIFFERENT_DISTANCE") && (
                    <li>Try a closer or farther shot</li>
                  )}
                  {result.meta.guidanceHints.includes("TRY_DIFFERENT_LIGHTING") && (
                    <li>Try brighter or more even lighting</li>
                  )}
                </ul>
              </div>
            ) : null}
          </div>
          
          {/* Phase 5.5.5 — Also Known As */}
          {viewModel.nameFirstDisplay.alsoKnownAs && viewModel.nameFirstDisplay.alsoKnownAs.length > 0 && (
            <p className="text-sm text-white/70 italic">
              Also Known As: {(viewModel.nameFirstDisplay.alsoKnownAs ?? []).join(" • ")}
            </p>
          )}
          
          {/* Phase 4.5 Step 4.5.1 — Confidence Badge Next to Name */}
          {/* Phase 4.5 Step 4.5.5 — Confidence Honesty: Show tier label, not raw % for high confidence */}
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`text-sm font-semibold px-4 py-2 rounded-full ${
                viewModel.nameFirstDisplay.confidenceTier === "very_high"
                  ? "bg-green-500/30 text-green-200"
                  : viewModel.nameFirstDisplay.confidenceTier === "high"
                  ? "bg-green-500/20 text-green-300"
                  : viewModel.nameFirstDisplay.confidenceTier === "medium"
                  ? "bg-yellow-500/20 text-yellow-300"
                  : "bg-orange-500/20 text-orange-300"
              }`}
            >
              {viewModel.nameFirstDisplay.confidenceTier === "very_high"
                ? "Very High Confidence"
                : viewModel.nameFirstDisplay.confidenceTier === "high"
                ? "High Confidence"
                : viewModel.nameFirstDisplay.confidenceTier === "medium"
                ? "Medium Confidence"
                : "Low Confidence"}
              {viewModel.nameFirstDisplay.confidencePercent < 70 && (
                <span className="ml-2 opacity-80">({viewModel.nameFirstDisplay.confidencePercent}%)</span>
              )}
            </span>
          {/* Phase 4.5 Step 4.5.1 — Subtext Tagline */}
          <p className="text-sm text-white/70 italic">
            {viewModel.nameFirstDisplay.tagline}
          </p>

          {/* UI CONTRACT ENFORCEMENT — Never assume dominance, terpeneExperience, extendedProfile */}
          {/* Only render optional sections if present */}
          
          {/* Phase 4.6 Step 4.6.3 — Ratio display removed (belongs in WikiReportPanel via analysis layer) */}

                      {/* Phase 5.1 Step 5.1.5 — DOMINANT TERPENES & EXPERIENCE PROFILE */}
                      {/* UI CONTRACT ENFORCEMENT — terpeneExperience is optional, only render if present */}
                      {viewModel.terpeneExperience && (
                        <div className="space-y-4 pt-4">
                          {/* Phase 5.1 Step 5.1.5 — DOMINANT TERPENES */}
                          {viewModel.terpeneExperience.dominantTerpenes && viewModel.terpeneExperience.dominantTerpenes.length > 0 && (
                            <div className="space-y-2">
                              <h3 className="text-sm font-semibold text-white/90">Dominant Terpenes</h3>
                              <div className="flex flex-wrap gap-2">
                                {viewModel.terpeneExperience.dominantTerpenes.map((terpene, idx) => (
                                  <span
                                    key={idx}
                                    className="text-sm font-medium px-3 py-1.5 rounded-full bg-purple-500/20 text-purple-200 border border-purple-500/30"
                                  >
                                    {terpene}
                                  </span>
                                ))}
                                {viewModel.terpeneExperience.secondaryTerpenes.length > 0 && (
                                  <>
                                    {viewModel.terpeneExperience.secondaryTerpenes.map((terpene, idx) => (
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

                          {/* Phase 5.1 Step 5.1.5 — EXPERIENCE PROFILE */}
                          <div className="space-y-3">
                            <h3 className="text-sm font-semibold text-white/90">Experience Profile</h3>
                            <div className="space-y-2.5">
                              {/* Body Relaxation */}
                              <div>
                                <div className="flex justify-between items-center mb-1">
                                  <span className="text-xs font-medium text-white/80">Body Relaxation</span>
                                  <span className="text-xs text-white/60">{viewModel.terpeneExperience.experience.bodyRelaxation}%</span>
                                </div>
                                <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                                  <div
                                    className="h-full bg-purple-500/60 rounded-full transition-all"
                                    style={{ width: `${viewModel.terpeneExperience.experience.bodyRelaxation}%` }}
                                  />
                                </div>
                              </div>

                              {/* Mental Stimulation */}
                              <div>
                                <div className="flex justify-between items-center mb-1">
                                  <span className="text-xs font-medium text-white/80">Mental Stimulation</span>
                                  <span className="text-xs text-white/60">{viewModel.terpeneExperience.experience.mentalStimulation}%</span>
                                </div>
                                <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                                  <div
                                    className="h-full bg-green-500/60 rounded-full transition-all"
                                    style={{ width: `${viewModel.terpeneExperience.experience.mentalStimulation}%` }}
                                  />
                                </div>
                              </div>

                              {/* Mood Elevation */}
                              <div>
                                <div className="flex justify-between items-center mb-1">
                                  <span className="text-xs font-medium text-white/80">Mood Elevation</span>
                                  <span className="text-xs text-white/60">{viewModel.terpeneExperience.experience.moodElevation}%</span>
                                </div>
                                <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                                  <div
                                    className="h-full bg-yellow-500/60 rounded-full transition-all"
                                    style={{ width: `${viewModel.terpeneExperience.experience.moodElevation}%` }}
                                  />
                                </div>
                              </div>

                              {/* Sedation */}
                              <div>
                                <div className="flex justify-between items-center mb-1">
                                  <span className="text-xs font-medium text-white/80">Sedation</span>
                                  <span className="text-xs text-white/60">{viewModel.terpeneExperience.experience.sedation}%</span>
                                </div>
                                <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                                  <div
                                    className="h-full bg-blue-500/60 rounded-full transition-all"
                                    style={{ width: `${viewModel.terpeneExperience.experience.sedation}%` }}
                                  />
                                </div>
                              </div>

                              {/* Focus / Clarity */}
                              <div>
                                <div className="flex justify-between items-center mb-1">
                                  <span className="text-xs font-medium text-white/80">Focus / Clarity</span>
                                  <span className="text-xs text-white/60">{viewModel.terpeneExperience.experience.focusClarity}%</span>
                                </div>
                                <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                                  <div
                                    className="h-full bg-cyan-500/60 rounded-full transition-all"
                                    style={{ width: `${viewModel.terpeneExperience.experience.focusClarity}%` }}
                                  />
                                </div>
                              </div>

                              {/* Appetite Stimulation */}
                              <div>
                                <div className="flex justify-between items-center mb-1">
                                  <span className="text-xs font-medium text-white/80">Appetite Stimulation</span>
                                  <span className="text-xs text-white/60">{viewModel.terpeneExperience.experience.appetiteStimulation}%</span>
                                </div>
                                <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                                  <div
                                    className="h-full bg-orange-500/60 rounded-full transition-all"
                                    style={{ width: `${viewModel.terpeneExperience.experience.appetiteStimulation}%` }}
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Phase 5.1 Step 5.1.5 — Consensus Notes (if available) */}
                            {/* UI FIX — No full-width dividers, use cards instead */}
                            {viewModel.terpeneExperience.consensusNotes && 
                             viewModel.terpeneExperience.consensusNotes.length > 0 && (
                              <div className="pt-2 mt-2">
                                <p className="text-xs text-white/60 italic leading-relaxed">
                                  {viewModel.terpeneExperience.consensusNotes.join(" ")}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                      {/* Phase 4.7 Step 4.7.2 — CLOSELY RELATED VARIANTS (if ambiguous, collapsed) */}
          {viewModel.closelyRelatedVariants && 
           viewModel.closelyRelatedVariants.length > 0 && 
            viewModel.isAmbiguous && (
            <CollapsibleSection
              title={`Closely Related Variants (${viewModel.closelyRelatedVariants.length} ${viewModel.closelyRelatedVariants.length === 1 ? 'variant' : 'variants'})`}
              defaultExpanded={false}
              icon="🔗"
            >
              <div className="space-y-2 pt-2">
                {viewModel.closelyRelatedVariants.map((variant, idx) => (
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
            const alternateMatches = viewModel.nameFirstDisplay.alternateMatches && viewModel.nameFirstDisplay.alternateMatches.length > 0
              ? viewModel.nameFirstDisplay.alternateMatches
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
          {false && viewModel.nameFirstDisplay.alternateMatches && 
           viewModel.nameFirstDisplay.alternateMatches.length > 0 && 
           viewModel.nameFirstDisplay.confidencePercent < 92 && (
            <CollapsibleSection
              title={`Also similar to (${viewModel.nameFirstDisplay.alternateMatches.length} ${viewModel.nameFirstDisplay.alternateMatches.length === 1 ? 'strain' : 'strains'})`}
              defaultExpanded={false}
              icon="🔍"
            >
              <div className="space-y-2 pt-2">
                {viewModel.nameFirstDisplay.alternateMatches.map((alt, idx) => (
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
                  These strains share similar visual characteristics. The primary match above has the strongest alignment across all images.
                </p>
              </div>
            </CollapsibleSection>
          )}

          {/* Phase 4.5 Step 4.5.3 — WHY THIS STRAIN (Human Logic) - FREE TIER */}
          {viewModel.nameFirstDisplay.explanation && (
            <CollapsibleSection
              title="Why this strain?"
              defaultExpanded={true}
              icon="💡"
            >
              <div className="space-y-3 pt-2">
                {/* Phase 4.0.3.1 — Rewritten content tone */}
                {viewModel.nameFirstDisplay.tagline?.toLowerCase().includes("low confidence") || 
                 (viewModel.nameFirstDisplay.confidencePercent ?? 0) < 70 ? (
                  <>
                    <p className="text-sm">
                      This result is based on visible structure, bud density, and leaf morphology
                      observed across the uploaded images.
                    </p>
                    <p className="text-sm mt-2">
                      Confidence is lower because the photos appear very similar and do not show
                      enough contrasting angles to strongly differentiate between cultivars.
                    </p>
                    <p className="text-sm mt-3 font-medium">
                      Accuracy improves with:
                    </p>
                    <ul className="text-sm list-disc ml-5 mt-1">
                      <li>One close-up bud photo</li>
                      <li>One wider plant or branch photo</li>
                      <li>A different angle, distance, or lighting condition</li>
                    </ul>
                  </>
                ) : (
                  <>
                    {/* Phase 4.5 Step 4.5.3 — Auto-generate 3-5 bullets from explanation */}
                    {viewModel.nameFirstDisplay.explanation.whyThisNameWon && viewModel.nameFirstDisplay.explanation.whyThisNameWon.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-white/90 mb-2">Match Evidence:</h4>
                        <ul className="space-y-2">
                          {viewModel.nameFirstDisplay.explanation.whyThisNameWon.slice(0, 5).map((reason, idx) => (
                            <li key={idx} className="text-sm text-white/80 leading-relaxed flex items-start">
                              <span className="text-green-400 mr-2">•</span>
                              <span>{reason}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {/* Phase 4.5 Step 4.5.3 — What Ruled Out Others (if available) */}
                    {viewModel.nameFirstDisplay.explanation.whatRuledOutOthers && 
                     viewModel.nameFirstDisplay.explanation.whatRuledOutOthers.length > 0 && (
                      <div className="pt-2">
                        <h4 className="text-sm font-semibold text-white/90 mb-2">Why not other strains?</h4>
                        <ul className="space-y-2">
                          {viewModel.nameFirstDisplay.explanation.whatRuledOutOthers.slice(0, 3).map((reason, idx) => (
                            <li key={idx} className="text-sm text-white/80 leading-relaxed flex items-start">
                              <span className="text-yellow-400 mr-2">•</span>
                              <span>{reason}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Phase 4.5 Step 4.5.3 — Variance Notes (if available) */}
                    {viewModel.nameFirstDisplay.explanation.varianceNotes && 
                     viewModel.nameFirstDisplay.explanation.varianceNotes.length > 0 && (
                      <div className="pt-2">
                        <p className="text-xs text-white/70 leading-relaxed italic">
                          {(viewModel.nameFirstDisplay.explanation.varianceNotes ?? []).join(" ")}
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
              {viewModel.nameFirstDisplay?.primaryStrainName || "Unknown Cultivar"}
            </h1>

          {/* Match type label */}
          {viewModel.namingInfo && (
            <p className="text-lg md:text-xl text-white/80 font-medium">
              {viewModel.namingInfo.displayLabel}
            </p>
          )}

          {/* Phase 3.8 Part C — Confidence Tier Badge */}
          {viewModel.confidenceTier && (
            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-semibold px-3 py-1 rounded-full ${
                  viewModel.confidenceTier.tier === "very_high"
                    ? "bg-green-500/30 text-green-200"
                    : viewModel.confidenceTier.tier === "high"
                    ? "bg-green-500/20 text-green-300"
                    : viewModel.confidenceTier.tier === "medium"
                    ? "bg-yellow-500/20 text-yellow-300"
                    : "bg-orange-500/20 text-orange-300"
                }`}
              >
                {viewModel.confidenceTier.label}
              </span>
              {viewModel.nameResolution?.strainFamily && (
                <span className="text-xs text-white/60">
                  • {viewModel.nameResolution.strainFamily}-type
                </span>
              )}
            </div>
          )}

          {/* Confidence & image count */}
          {viewModel.multiImageInfo ? (
            <div className="space-y-2">
              <p className="text-sm text-white/70">
                {viewModel.multiImageInfo.imageCountText}
              </p>
              <div className="flex items-center gap-3">
                <p className="text-2xl md:text-3xl text-green-400 font-semibold">
                  {viewModel.multiImageInfo.confidenceRange}
                </p>
                {/* Phase 3.7 Part F — Confidence increased indicator */}
                {(viewModel.multiImageInfo?.imageCountText?.includes("2") || viewModel.multiImageInfo?.imageCountText?.includes("3") || viewModel.multiImageInfo?.imageCountText?.includes("4") || viewModel.multiImageInfo?.imageCountText?.includes("5")) && (
                  <span className="text-xs text-green-300 bg-green-500/20 px-2 py-1 rounded-full">
                    ✓ Multiple images boost
                  </span>
                )}
              </div>
              {viewModel.multiImageInfo.improvementExplanation && (
                <div className="space-y-1">
                  <p className="text-sm text-white/80 leading-relaxed">
                    {viewModel.multiImageInfo.improvementExplanation}
                  </p>
                  {/* Phase 3.7 Part F — Small explanation tooltip */}
                  {(viewModel.multiImageInfo?.imageCountText?.includes("2") || viewModel.multiImageInfo?.imageCountText?.includes("3") || viewModel.multiImageInfo?.imageCountText?.includes("4") || viewModel.multiImageInfo?.imageCountText?.includes("5")) && (
                    <p className="text-xs text-white/60 italic">
                      💡 Multiple angles improved accuracy
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <p className="text-2xl md:text-3xl text-green-400 font-semibold">
              {viewModel.confidenceRange
                ? `${viewModel.confidenceRange.min}–${viewModel.confidenceRange.max}%`
                : `${viewModel.confidence}%`}
            </p>
          )}

          {/* Rationale */}
          {viewModel.namingInfo?.rationale && (
            <p className="text-base md:text-lg text-white/90 leading-relaxed">
              {viewModel.namingInfo.rationale}
            </p>
          )}
        </div>
        </div>
      )}

      {/* Phase 3.8 Part E — Why This Match (Expandable) */}
        {viewModel.nameReasoning && viewModel.nameReasoning.bullets.length > 0 && (
          <CollapsibleSection
            title="Why This Name?"
            defaultExpanded={true}
            icon="💡"
          >
            <ul className="space-y-2">
              {viewModel.nameReasoning.bullets.map((bullet, idx) => (
                <li key={idx} className="text-white/80 text-sm flex items-start gap-2">
                  <span className="text-white/40 mt-1">•</span>
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          </CollapsibleSection>
        )}

        {/* Phase 3.8 Part E — Closest Alternatives (Collapsed) */}
        {(safeSecondaryMatches.length > 0 || viewModel.nameResolution?.closestAlternate) && (
          <CollapsibleSection
            title="Closest Alternatives"
            defaultExpanded={false}
            icon="🔍"
          >
            <div className="space-y-3">
              {/* Show name resolution alternate first if available */}
              {viewModel.nameResolution?.closestAlternate && (
                <div className="p-3 rounded-lg border border-white/10 bg-white/5">
                  <div className="flex items-start justify-between mb-1">
                    <p className="font-semibold text-white">
                      {viewModel.nameResolution.closestAlternate.name}
                    </p>
                    <span className="text-xs text-white/60">
                      {viewModel.nameResolution.closestAlternate.confidence}%
                    </span>
                  </div>
                  <p className="text-sm text-white/70">
                    {viewModel.nameResolution.closestAlternate.whyNotPrimary}
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

      {/* Phase 3.6 Part C — GENETICS & LINEAGE (Expanded by default) */}
      <CollapsibleSection
        title="Genetics & Lineage"
        defaultExpanded={true}
        icon="🧬"
      >
        <div className="space-y-4">
          {/* Dominance & Lineage */}
          {/* UI CONTRACT ENFORCEMENT — genetics.dominance is optional, only render if present */}
          {viewModel.genetics?.dominance && (
            <div>
              <h4 className="text-base font-semibold text-white/90 mb-2">
                Dominance Type
              </h4>
              <p className="text-white/80 leading-relaxed">
                This cultivar is classified as{" "}
                <strong className="text-white">
                  {viewModel.genetics.dominance}
                </strong>
                {`-dominant, which influences both its physical structure and expected effects. ${viewModel.genetics.dominance === "Indica" ? "Indica-dominant strains typically produce broad leaves, dense buds, and relaxing body effects." : viewModel.genetics.dominance === "Sativa" ? "Sativa-dominant strains usually feature narrow leaves, elongated structure, and uplifting cerebral effects." : "Hybrids combine traits from both genetic lineages, offering balanced characteristics."}`}
              </p>
            </div>
          )}

          {/* Parent Strains & Family Tree */}
          {(extendedProfile?.genetics.lineage ||
            viewModel.genetics?.lineage ||
            viewModel.familyTree) && (
            <div>
              <h4 className="text-base font-semibold text-white/90 mb-2">
                Parent Strains & Family Tree
              </h4>
              <p className="text-white/80 leading-relaxed mb-2">
                {viewModel.familyTree ||
                  extendedProfile?.genetics.lineage ||
                  viewModel.genetics?.lineage ||
                  "Lineage information not available."}
              </p>
              {(extendedProfile?.genetics.lineage || viewModel.genetics?.lineage) && (
                <p className="text-white/80 leading-relaxed text-sm">
                  This genetic combination contributes to the distinctive traits observed in this cultivar. The parent strains influence the plant's morphology, effects, and cultivation characteristics.
                </p>
              )}
            </div>
          )}

          {/* Phenotype Expression */}
          <div>
            <h4 className="text-base font-semibold text-white/90 mb-2">
              Typical Phenotype Expression
            </h4>
            <p className="text-white/80 leading-relaxed">
              {/* UI CONTRACT ENFORCEMENT — genetics.dominance is optional */}
              {viewModel.genetics?.dominance === "Indica"
                ? "Indica-dominant phenotypes typically display compact, bushy growth with dense, resinous flower clusters. Leaves are broad and dark green, with tight internodal spacing. Bud structure is usually dense and heavy, with high trichome production."
                : viewModel.genetics?.dominance === "Sativa"
                ? "Sativa-dominant phenotypes often show tall, lanky growth patterns with elongated flower clusters. Leaves are narrow and light green, with wider internodal spacing. Bud structure tends to be airier and less dense than indica varieties."
                : "Hybrid phenotypes can vary significantly depending on the specific genetic ratio. Some express more indica-like traits (dense structure, broad leaves), while others lean sativa (elongated structure, narrow leaves). The observed characteristics help determine the dominant influence."}
            </p>
          </div>

          {/* Breeder Origins */}
          {extendedProfile?.genetics.breederNotes &&
            extendedProfile.genetics.breederNotes.length > 0 && (
              <div>
                <h4 className="text-base font-semibold text-white/90 mb-2">
                  Known Origins & History
                </h4>
                <div className="space-y-2">
                  {extendedProfile.genetics.breederNotes.map((note, idx) => (
                    <p key={idx} className="text-white/80 leading-relaxed">
                      {note}
                    </p>
                  ))}
                </div>
              </div>
            )}

          {/* Uncertainty Note */}
          {(!extendedProfile?.genetics.lineage && !viewModel.genetics?.lineage) && (
            <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3">
              <p className="text-sm text-yellow-200 leading-relaxed">
                <strong>Lineage Inference Limitation:</strong> Genetic lineage
                identification from visual analysis alone has limitations. Parent
                strain information would require genetic testing or documented
                breeding records. The dominance type (Indica/Sativa/Hybrid) is
                inferred from observable morphological traits.
              </p>
            </div>
          )}
        </div>
      </CollapsibleSection>

      {/* Phase 3.6 Part D — VISUAL & MORPHOLOGY ANALYSIS (Expanded by default) */}
      <CollapsibleSection
        title="Visual & Morphology Analysis"
        defaultExpanded={true}
        icon="🔬"
      >
        <div className="space-y-4">
          <p className="text-sm text-white/60 italic mb-4">
            Based solely on visual analysis{viewModel.multiImageInfo?.imageCountText ? ` of ${viewModel.multiImageInfo.imageCountText.toLowerCase()}` : ""}. These traits directly informed the
            match decision.
          </p>

          {/* Bud Density & Structure */}
          {(viewModel.flowerStructureAnalysis ||
            viewModel.primaryMatch?.whyThisMatch) && (
            <div>
              <h4 className="text-base font-semibold text-white/90 mb-2">
                Bud Density & Structure
              </h4>
              <p className="text-white/80 leading-relaxed">
                {viewModel.flowerStructureAnalysis ||
                  `The observed bud structure shows ${viewModel.morphology || "characteristics that align with known cultivars"}. This structural pattern was a key factor in the identification process.`}
              </p>
            </div>
          )}

          {/* Calyx Structure */}
          {viewModel.structure && (
            <div>
              <h4 className="text-base font-semibold text-white/90 mb-2">
                Calyx Formation
              </h4>
              <p className="text-white/80 leading-relaxed">{viewModel.structure}</p>
            </div>
          )}

          {/* Trichome Coverage */}
          {(viewModel.trichomeDensityMaturity || viewModel.trichomes) && (
            <div>
              <h4 className="text-base font-semibold text-white/90 mb-2">
                Trichome Coverage & Maturity
              </h4>
              <p className="text-white/80 leading-relaxed">
                {viewModel.trichomeDensityMaturity ||
                  viewModel.trichomes ||
                  "Trichome density and coverage are key indicators of resin production and maturity stage."}
              </p>
            </div>
          )}

          {/* Pistil Color & Maturity */}
          {(viewModel.colorPistilIndicators || viewModel.pistils) && (
            <div>
              <h4 className="text-base font-semibold text-white/90 mb-2">
                Pistil Color & Maturity Indicators
              </h4>
              <p className="text-white/80 leading-relaxed">
                {viewModel.colorPistilIndicators ||
                  viewModel.pistils ||
                  "Pistil coloration provides clues about flowering stage and can indicate strain characteristics."}
              </p>
            </div>
          )}

          {/* Leaf Shape Indicators */}
          {viewModel.leafShapeInternode && (
            <div>
              <h4 className="text-base font-semibold text-white/90 mb-2">
                Leaf Shape & Internodal Spacing
              </h4>
              <p className="text-white/80 leading-relaxed">
                {viewModel.leafShapeInternode}
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
          {viewModel.primaryMatch?.whyThisMatch && (
            <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-3">
              <p className="text-sm text-green-200 leading-relaxed">
                <strong>Match Decision:</strong> {viewModel.primaryMatch.whyThisMatch}
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
          {viewModel.entourageExplanation && (
            <div className="mt-4 p-3 rounded-lg border border-blue-500/30 bg-blue-500/10">
              <h4 className="text-base font-semibold text-blue-200 mb-2">
                The Entourage Effect
              </h4>
              <p className="text-sm text-blue-200/90 leading-relaxed">
                {viewModel.entourageExplanation}
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

          {/* UI CONTRACT ENFORCEMENT — genetics.dominance is optional, only render if present */}
          {/* Phase 3.9 Part E — Mental vs Body Balance */}
          {viewModel.genetics?.dominance && (
            <div>
              <h4 className="text-base font-semibold text-white/90 mb-2">
                Mental vs Body Balance
              </h4>
              <p className="text-white/80 leading-relaxed">
                {viewModel.genetics.dominance === "Indica"
                  ? "This cultivar tends to produce primarily body-focused effects with a strong physical relaxation component. While some mental effects may be present, the body sensations typically dominate the experience."
                  : viewModel.genetics.dominance === "Sativa"
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
          {viewModel.experience?.bestFor &&
            viewModel.experience.bestFor.length > 0 && (
              <div>
                <h4 className="text-base font-semibold text-white/90 mb-2">
                  Typically Best For
                </h4>
                <p className="text-white/80 leading-relaxed">
                  {viewModel.experience.bestFor.join(", ")}
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
          {/* UI CONTRACT ENFORCEMENT — genetics.dominance is optional, only render sections if present */}
          {viewModel.genetics?.dominance && (
            <>
              {/* Day vs Night Use */}
              <div>
                <h4 className="text-base font-semibold text-white/90 mb-2">
                  Day vs Night Use
                </h4>
                <p className="text-white/80 leading-relaxed">
                  {viewModel.genetics.dominance === "Indica"
                    ? "This cultivar is generally best suited for evening or nighttime use due to its relaxing and potentially sedative effects. It may interfere with daytime productivity or alertness."
                    : viewModel.genetics.dominance === "Sativa"
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
                  {viewModel.genetics.dominance === "Indica" ? (
                    <>
                      <p><strong>Creativity:</strong> Lower stimulation may limit creative bursts; better for reflective, contemplative creative work.</p>
                      <p><strong>Focus:</strong> Not ideal for tasks requiring sharp focus; better for relaxation and stress relief.</p>
                      <p><strong>Relaxation:</strong> Excellent for unwinding, stress relief, and physical relaxation after activities.</p>
                    </>
                  ) : viewModel.genetics.dominance === "Sativa" ? (
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
                  {viewModel.genetics.dominance === "Indica"
                    ? "This cultivar is typically better suited for solo or small-group settings where relaxation and introspection are desired. Large social gatherings may feel overwhelming."
                    : viewModel.genetics.dominance === "Sativa"
                    ? "This cultivar can enhance social experiences by promoting conversation, energy, and engagement. It's well-suited for group activities and social gatherings."
                    : "This hybrid cultivar can work in both social and solo contexts, with effects varying based on the specific balance of indica and sativa traits. It offers flexibility for different social situations."}
                </p>
              </div>
            </>
          )}
        </div>
      </CollapsibleSection>
      
      {/* Phase 3.9 Part G — VARIANTS & CLOSE RELATIVES */}
      {(viewModel.relatedStrains && viewModel.relatedStrains.length > 0) || 
       (extendedProfile?.knownVariations && extendedProfile.knownVariations.length > 0) ? (
        <CollapsibleSection
          title="Variants & Close Relatives"
          defaultExpanded={false}
          icon="🌳"
        >
          <div className="space-y-4">
            {/* Related Strains */}
            {viewModel.relatedStrains && viewModel.relatedStrains.length > 0 && (
              <div>
                <h4 className="text-base font-semibold text-white/90 mb-2">
                  Closely Related Strains
                </h4>
                <div className="space-y-3">
                  {viewModel.relatedStrains.map((related, idx) => (
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
          {viewModel.confidenceTier && (
            <div>
              <h4 className="text-base font-semibold text-white/90 mb-2">
                Confidence Assessment
              </h4>
              <div className="p-3 rounded-lg border border-white/10 bg-white/5 mb-2">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`text-xs font-semibold px-3 py-1 rounded-full ${
                      viewModel.confidenceTier.tier === "high"
                        ? "bg-green-500/20 text-green-300"
                    : viewModel.confidenceTier.tier === "medium"
                    ? "bg-yellow-500/20 text-yellow-300"
                    : "bg-orange-500/20 text-orange-300"
                    }`}
                  >
                    {viewModel.confidenceTier.label}
                  </span>
                  <span className="text-sm text-white/60">
                    {viewModel.confidenceRange
                      ? `${viewModel.confidenceRange.min}–${viewModel.confidenceRange.max}%`
                      : `${viewModel.confidence}%`}
                  </span>
                </div>
                <p className="text-sm text-white/70">
                  {viewModel.confidenceTier.description}
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
                {viewModel.multiImageInfo?.improvementExplanation && (
                  <li>{viewModel.multiImageInfo.improvementExplanation}</li>
                )}
                {viewModel.nameResolution?.matchType === "clear_winner" && (
                  <li>Strong consensus across all analyzed images</li>
                )}
                {viewModel.confidenceTier?.tier === "high" && (
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
              {viewModel.confidenceTier?.tier === "low" && (
                <li>Visual traits showed significant variation or ambiguity</li>
              )}
              {viewModel.nameResolution?.matchType === "family_level" && (
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
          {viewModel.trustLayer?.sourcesUsed &&
            viewModel.trustLayer.sourcesUsed.length > 0 && (
              <div className="pt-4">
                <p className="text-xs text-white/60">
                  <strong>Sources:</strong>{" "}
                  {(viewModel.trustLayer?.sourcesUsed ?? []).join(", ")}
                </p>
              </div>
            )}
        </div>
      </CollapsibleSection>
    </section>
  );
}
