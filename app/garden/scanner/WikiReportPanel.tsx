// app/garden/scanner/WikiReportPanel.tsx
// Phase 4.2 — Extensive Wiki-Style Report (Depth Unlock)

"use client";

import type { ScannerViewModel } from "@/lib/scanner/viewModel";
import CollapsibleSection from "./CollapsibleSection";

interface WikiReportPanelProps {
  result: ScannerViewModel;
  imageCount: number;
}

/**
 * Phase 4.2 Step 4.2.10 — Wiki Report Panel
 * 
 * UI PRESENTATION RULES:
 * - Centered content column (max-width)
 * - No full-width divider lines
 * - Section headers large and readable
 * - Paragraph text comfortable (not tiny)
 * - Collapsible sections allowed, but OPEN by default for Free Tier
 */
export default function WikiReportPanel({
  result,
  imageCount,
}: WikiReportPanelProps) {
  const wikiReport = result.wikiReport;
  
  if (!wikiReport) {
    // Fallback to legacy display if wikiReport not available
    return null;
  }
  
  return (
    <section className="rounded-2xl border border-white/15 bg-white/5 backdrop-blur-xl shadow-xl shadow-black/30 p-5 sm:p-6 space-y-8 max-h-[85vh] overflow-y-auto">
      {/* Phase 4.2 Step 4.2.1 — REPORT SECTIONS (LOCKED ORDER) */}
      
      {/* Phase 4.5 Step 4.5.1 — NAME LOCK HEADER (TOP PRIORITY) */}
      {/* Phase 15.5.5 — Make strain name + confidence feel real */}
      {result.nameFirstDisplay && (
        <div className="mb-8 space-y-4 pb-6">
          {/* Phase 15.5.5 — Large Strain Name */}
          <div className="mb-4">
            <div className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              {result.nameFirstDisplay.primaryStrainName || result.strainName || "Unknown Cultivar"}
            </div>
            
            {/* Phase 15.5.5 — Confidence badge */}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-white/10 border border-white/15 px-3 py-1 text-sm text-white/90">
                Confidence · {result.nameFirstDisplay.confidencePercent ?? result.nameConfidence ?? result.matchConfidence ?? "--"}%
              </span>
              
              {result.nameFirstDisplay.confidenceTier && (
                <span className={`inline-flex items-center rounded-full border px-3 py-1 text-sm ${
                  result.nameFirstDisplay.confidenceTier === "very_high"
                    ? "bg-emerald-500/10 border-emerald-400/20 text-emerald-200"
                    : result.nameFirstDisplay.confidenceTier === "high"
                    ? "bg-green-500/10 border-green-400/20 text-green-200"
                    : result.nameFirstDisplay.confidenceTier === "medium"
                    ? "bg-yellow-500/10 border-yellow-400/20 text-yellow-200"
                    : "bg-orange-500/10 border-orange-400/20 text-orange-200"
                }`}>
                  {result.nameFirstDisplay.confidenceTier === "very_high"
                    ? "Very High Confidence"
                    : result.nameFirstDisplay.confidenceTier === "high"
                    ? "High Confidence"
                    : result.nameFirstDisplay.confidenceTier === "medium"
                    ? "Medium Confidence"
                    : "Low Confidence"}
                </span>
              )}
            </div>
          </div>
          
          {/* Phase 5.5.5 — Also Known As */}
          {result.nameFirstDisplay.alsoKnownAs && result.nameFirstDisplay.alsoKnownAs.length > 0 && (
            <p className="text-sm text-white/70 italic">
              Also Known As: {(result.nameFirstDisplay.alsoKnownAs ?? []).join(" • ")}
            </p>
          )}
          
          {/* Phase 4.5 Step 4.5.1 — Confidence Badge Next to Name */}
          {/* Phase 4.5 Step 4.5.5 — Confidence Honesty: Show tier label, not raw % for high confidence */}
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`text-sm font-semibold px-4 py-2 rounded-full ${
                result.nameFirstDisplay.confidenceTier === "very_high"
                  ? "bg-green-500/30 text-green-200"
                  : result.nameFirstDisplay.confidenceTier === "high"
                  ? "bg-green-500/20 text-green-300"
                  : result.nameFirstDisplay.confidenceTier === "medium"
                  ? "bg-yellow-500/20 text-yellow-300"
                  : "bg-orange-500/20 text-orange-300"
              }`}
            >
              {result.nameFirstDisplay.confidenceTier === "very_high"
                ? "Very High Confidence"
                : result.nameFirstDisplay.confidenceTier === "high"
                ? "High Confidence"
                : result.nameFirstDisplay.confidenceTier === "medium"
                ? "Medium Confidence"
                : "Low Confidence"}
              {result.nameFirstDisplay.confidencePercent < 70 && (
                <span className="ml-2 opacity-80">({result.nameFirstDisplay.confidencePercent}%)</span>
              )}
            </span>
          {/* Phase 4.5 Step 4.5.1 — Subtext Tagline */}
          <p className="text-sm text-white/70 italic">
            {result.nameFirstDisplay.tagline}
          </p>

          {/* Phase 15.5.6 — Add Indica/Sativa/Hybrid ratio display */}
          {(() => {
            function clampPct(n: number) {
              return Math.max(0, Math.min(100, n));
            }
            
            function deriveRatio(dominance?: string) {
              const d = (dominance ?? "").toLowerCase();
              if (d.includes("indica")) return { indica: 70, sativa: 15, hybrid: 15 };
              if (d.includes("sativa")) return { indica: 15, sativa: 70, hybrid: 15 };
              if (d.includes("hybrid")) return { indica: 40, sativa: 40, hybrid: 20 };
              return { indica: 34, sativa: 33, hybrid: 33 };
            }
            
            // Phase 15.5.6 — Get ratio from result
            const ratio = result.dominance 
              ? { 
                  indica: result.dominance.indica ?? 0, 
                  sativa: result.dominance.sativa ?? 0, 
                  hybrid: result.dominance.hybrid ?? (100 - ((result.dominance.indica ?? 0) + (result.dominance.sativa ?? 0)))
                }
              : result.nameFirstDisplay?.ratio
              ? {
                  indica: result.nameFirstDisplay.ratio.indicaPercent,
                  sativa: result.nameFirstDisplay.ratio.sativaPercent,
                  hybrid: 100 - (result.nameFirstDisplay.ratio.indicaPercent + result.nameFirstDisplay.ratio.sativaPercent)
                }
              : deriveRatio(result.genetics?.dominance);
            
            return (
              <div className="mt-6 rounded-2xl border border-white/15 bg-white/5 p-5 sm:p-6">
                <div className="text-lg font-semibold mb-3">Dominance</div>
                <div className="space-y-3">
                  {[
                    ["Indica", ratio.indica],
                    ["Sativa", ratio.sativa],
                    ["Hybrid", ratio.hybrid],
                  ].map(([label, value]) => (
                    <div key={label} className="flex items-center gap-3">
                      <div className="w-16 text-sm text-white/70">{label}</div>
                      <div className="flex-1 h-3 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className="h-3 rounded-full bg-white/60"
                          style={{ width: `${clampPct(Number(value))}%` }}
                        />
                      </div>
                      <div className="w-12 text-right text-sm text-white/70">{clampPct(Number(value))}%</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
          
          {/* Phase 4.6 Step 4.6.3 — Legacy ratio display text (if nameFirstDisplay.ratio exists) */}
          {result.nameFirstDisplay?.ratio && (
            <>
              <p className="text-sm text-white/90 font-medium">
                {result.nameFirstDisplay.ratio.displayText}
              </p>
              
              {/* Phase 4.6 Step 4.6.4 — EXPLANATION (Optional, Collapsed) */}
              {result.nameFirstDisplay.ratio.explanation && (
                <CollapsibleSection
                  title="How this ratio was determined"
                  defaultExpanded={false}
                  icon="📊"
                >
                  <div className="space-y-2 pt-2">
                    <ul className="space-y-2">
                      {result.nameFirstDisplay.ratio.explanation.fullExplanation.map((bullet, idx) => (
                        <li key={idx} className="text-sm text-white/80 leading-relaxed flex items-start">
                          <span className="text-purple-400 mr-2">•</span>
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                    
                    {/* Phase 4.6 Step 4.6.4 — Enhance explanation with wiki report genetics if available */}
                    {wikiReport?.geneticsLineage?.dominanceExplanation && (
                      <div className="pt-2 mt-2">
                        <p className="text-xs text-white/70 leading-relaxed italic">
                          {wikiReport.geneticsLineage.dominanceExplanation}
                        </p>
                      </div>
                    )}
                  </div>
                </CollapsibleSection>
              )}
            </>
          )}

          {/* Phase 5.1 Step 5.1.5 — DOMINANT TERPENES & EXPERIENCE PROFILE */}
          {result?.nameFirstDisplay?.terpeneExperience && (
            <div className="mt-6 max-w-xl mx-auto">
              <CollapsibleSection title="Terpenes & Experience">
                <div className="space-y-2 text-sm text-white/80">
                  {(result.nameFirstDisplay.terpeneExperience.dominantTerpenes ?? []).map((terpene, idx) => (
                    <div key={idx}>{terpene}</div>
                  ))}
                </div>
              </CollapsibleSection>
            </div>
          )}
          
                  
          {/* Phase 4.7 Step 4.7.2 — CLOSELY RELATED VARIANTS (if ambiguous, collapsed) */}
          {result.nameFirstDisplay.closelyRelatedVariants && 
           result.nameFirstDisplay.closelyRelatedVariants.length > 0 && 
           result.nameFirstDisplay.isAmbiguous && (
            <CollapsibleSection
              title={`Closely Related Variants (${result.nameFirstDisplay.closelyRelatedVariants.length} ${result.nameFirstDisplay.closelyRelatedVariants.length === 1 ? 'variant' : 'variants'})`}
              defaultExpanded={false}
              icon="🔗"
            >
              <div className="space-y-2 pt-2">
                {result.nameFirstDisplay.closelyRelatedVariants.map((variant, idx) => (
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

          {/* Phase 4.5 Step 4.5.2 — SECONDARY CANDIDATES (Optional, Collapsed if confidence < 92%) */}
          {result.nameFirstDisplay.alternateMatches && 
           result.nameFirstDisplay.alternateMatches.length > 0 && 
           result.nameFirstDisplay.confidencePercent < 92 && (
            <CollapsibleSection
              title={`Also similar to (${result.nameFirstDisplay.alternateMatches.length} ${result.nameFirstDisplay.alternateMatches.length === 1 ? 'strain' : 'strains'})`}
              defaultExpanded={false}
              icon="🔍"
            >
              <div className="space-y-2 pt-2">
                {result.nameFirstDisplay.alternateMatches.map((alt, idx) => (
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

          {/* Phase 4.5 Step 4.5.3 — WHY THIS STRAIN (Human Logic) */}
          {result.nameFirstDisplay.explanation && (
            <CollapsibleSection
              title="Why this strain?"
              defaultExpanded={true}
              icon="💡"
            >
              <div className="space-y-3 pt-2">
                {/* Phase 4.5 Step 4.5.3 — Auto-generate 3-5 bullets from explanation */}
                {result.nameFirstDisplay.explanation.whyThisNameWon && result.nameFirstDisplay.explanation.whyThisNameWon.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-white/90 mb-2">Match Evidence:</h4>
                    <ul className="space-y-2">
                      {result.nameFirstDisplay.explanation.whyThisNameWon.slice(0, 5).map((reason, idx) => (
                        <li key={idx} className="text-sm text-white/80 leading-relaxed flex items-start">
                          <span className="text-green-400 mr-2">•</span>
                          <span>{reason}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {/* Phase 4.5 Step 4.5.3 — What Ruled Out Others (if available) */}
                {result.nameFirstDisplay.explanation.whatRuledOutOthers && 
                 result.nameFirstDisplay.explanation.whatRuledOutOthers.length > 0 && (
                  <div className="pt-2">
                    <h4 className="text-sm font-semibold text-white/90 mb-2">Why not other strains?</h4>
                    <ul className="space-y-2">
                      {result.nameFirstDisplay.explanation.whatRuledOutOthers.slice(0, 3).map((reason, idx) => (
                        <li key={idx} className="text-sm text-white/80 leading-relaxed flex items-start">
                          <span className="text-yellow-400 mr-2">•</span>
                          <span>{reason}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Phase 4.5 Step 4.5.3 — Variance Notes (if available) */}
                {result.nameFirstDisplay.explanation.varianceNotes && 
                 result.nameFirstDisplay.explanation.varianceNotes.length > 0 && (
                  <div className="pt-2">
                    <p className="text-xs text-white/70 leading-relaxed italic">
                      {(result.nameFirstDisplay.explanation.varianceNotes ?? []).join(" ")}
                    </p>
                  </div>
                )}
              </div>
            </CollapsibleSection>
          )}
        </div>
      
      {/* 1. IDENTITY OVERVIEW (Phase 4.2 Step 4.2.2) */}
      <CollapsibleSection
        title="Identity Overview"
        defaultExpanded={true}
        icon="🏷️"
      >
        <div className="space-y-4">
          {/* Primary Strain Name (H1) - Only show if nameFirstDisplay not shown */}
          {!result.nameFirstDisplay && (
            <h1 className="text-4xl md:text-5xl font-bold text-white">
              {wikiReport.identityOverview.primaryName}
            </h1>
          )}
          
          {/* Confidence Tier Badge - Only show if nameFirstDisplay not shown */}
          {!result.nameFirstDisplay && (
            <div className="flex items-center gap-3">
              <span
                className={`text-sm font-semibold px-4 py-2 rounded-full ${
                  wikiReport.identityOverview.confidenceTier === "very_high"
                    ? "bg-green-500/30 text-green-200"
                    : wikiReport.identityOverview.confidenceTier === "high"
                    ? "bg-green-500/20 text-green-300"
                    : wikiReport.identityOverview.confidenceTier === "medium"
                    ? "bg-yellow-500/20 text-yellow-300"
                    : "bg-orange-500/20 text-orange-300"
                }`}
              >
                {wikiReport.identityOverview.confidenceTier.replace("_", " ")} Confidence ({wikiReport.identityOverview.confidencePercent}%)
              </span>
            </div>
          )}
          
          {/* Executive Summary (one-paragraph) */}
          <p className="text-base md:text-lg text-white/90 leading-relaxed">
            {wikiReport.identityOverview.executiveSummary}
          </p>
          
          {/* Known Aliases */}
          {wikiReport.identityOverview.aliases.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-white/70 mb-2">Also Known As:</h3>
              <p className="text-sm text-white/80">
                {(wikiReport.identityOverview.aliases ?? []).join(", ")}
              </p>
            </div>
          )}
        </div>
      </CollapsibleSection>
      
      {/* 2. VISUAL PHENOTYPE ANALYSIS (Phase 4.2 Step 4.2.3) */}
      <CollapsibleSection
        title="Visual Phenotype Analysis"
        defaultExpanded={true}
        icon="🔬"
      >
        <div className="space-y-4">
          {/* Bud Structure Comparison */}
          <div>
            <h3 className="text-base font-semibold text-white/90 mb-2">
              Bud Structure
            </h3>
            <p className="text-white/80 leading-relaxed">
              {wikiReport.visualPhenotype.budStructureComparison}
            </p>
          </div>
          
          {/* Trichome Density Comparison */}
          <div>
            <h3 className="text-base font-semibold text-white/90 mb-2">
              Trichome Density
            </h3>
            <p className="text-white/80 leading-relaxed">
              {wikiReport.visualPhenotype.trichomeDensityComparison}
            </p>
          </div>
          
          {/* Color Spectrum Notes */}
          <div>
            <h3 className="text-base font-semibold text-white/90 mb-2">
              Color Spectrum
            </h3>
            <p className="text-white/80 leading-relaxed">
              {wikiReport.visualPhenotype.colorSpectrumNotes}
            </p>
          </div>
          
          {/* Calyx & Pistil Behavior */}
          <div>
            <h3 className="text-base font-semibold text-white/90 mb-2">
              Calyx & Pistil Behavior
            </h3>
            <p className="text-white/80 leading-relaxed">
              {wikiReport.visualPhenotype.calyxPistilBehavior}
            </p>
          </div>
          
          {/* Phenotype Range Fit */}
          <div>
            <h3 className="text-base font-semibold text-white/90 mb-2">
              Phenotype Range Fit
            </h3>
            <p className="text-white/80 leading-relaxed">
              {wikiReport.visualPhenotype.phenotypeRangeFit}
            </p>
          </div>
        </div>
      </CollapsibleSection>
      
      {/* 3. GENETICS & LINEAGE (Phase 4.2 Step 4.2.4) */}
      <CollapsibleSection
        title="Genetics & Lineage"
        defaultExpanded={true}
        icon="🧬"
      >
        <div className="space-y-4">
          {/* Parent Strains */}
          {wikiReport.geneticsLineage.parentStrains.length > 0 && (
            <div>
              <h3 className="text-base font-semibold text-white/90 mb-2">
                Parent Strains
              </h3>
              <p className="text-white/80 leading-relaxed">
                {(wikiReport.geneticsLineage.parentStrains ?? []).join(" × ")}
              </p>
            </div>
          )}
          
          {/* Breeder / Origin Notes */}
          {wikiReport.geneticsLineage.breederOriginNotes.length > 0 && (
            <div>
              <h3 className="text-base font-semibold text-white/90 mb-2">
                Breeder & Origin
              </h3>
              <div className="space-y-2">
                {wikiReport.geneticsLineage.breederOriginNotes.map((note, idx) => (
                  <p key={idx} className="text-white/80 leading-relaxed">
                    {note}
                  </p>
                ))}
              </div>
            </div>
          )}
          
          {/* Dominance Explanation */}
          <div>
            <h3 className="text-base font-semibold text-white/90 mb-2">
              Dominance Explanation
            </h3>
            <p className="text-white/80 leading-relaxed">
              {wikiReport.geneticsLineage.dominanceExplanation}
            </p>
          </div>
          
          {/* Phenotype Branches */}
          {wikiReport.geneticsLineage.phenotypeBranches.length > 0 && (
            <div>
              <h3 className="text-base font-semibold text-white/90 mb-2">
                Known Phenotype Branches
              </h3>
              <ul className="list-disc list-inside space-y-1 text-white/80 ml-2">
                {wikiReport.geneticsLineage.phenotypeBranches.map((branch, idx) => (
                  <li key={idx}>{branch}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </CollapsibleSection>
      
      {/* 4. CHEMISTRY (TERPENES & CANNABINOIDS) (Phase 4.2 Step 4.2.5) */}
      <CollapsibleSection
        title="Chemistry (Terpenes & Cannabinoids)"
        defaultExpanded={true}
        icon="🌿"
      >
        <div className="space-y-4">
          {/* Terpene Stack (5-8 ranked) */}
          {wikiReport.chemistry.terpeneStack.length > 0 && (
            <div>
              <h3 className="text-base font-semibold text-white/90 mb-2">
                Likely Terpene Stack
              </h3>
              <ol className="list-decimal list-inside space-y-2 text-white/80 ml-2">
                {wikiReport.chemistry.terpeneStack.map((terpene, idx) => (
                  <li key={idx} className="leading-relaxed">
                    <strong className="text-white/90">{terpene.name}:</strong> {terpene.role}
                  </li>
                ))}
              </ol>
            </div>
          )}
          
          {/* Cannabinoid Range */}
          <div>
            <h3 className="text-base font-semibold text-white/90 mb-2">
              Cannabinoid Range
            </h3>
            <div className="space-y-1 text-white/80">
              <p><strong className="text-white/90">THC:</strong> {wikiReport.chemistry.cannabinoidRange.thc}</p>
              <p><strong className="text-white/90">CBD:</strong> {wikiReport.chemistry.cannabinoidRange.cbd}</p>
              {wikiReport.chemistry.cannabinoidRange.minors.length > 0 && (
                <p><strong className="text-white/90">Minor Cannabinoids:</strong> {(wikiReport.chemistry.cannabinoidRange.minors ?? []).join(", ")}</p>
              )}
            </div>
          </div>
          
          {/* Visual Alignment */}
          <div>
            <h3 className="text-base font-semibold text-white/90 mb-2">
              Visual Alignment
            </h3>
            <p className="text-white/80 leading-relaxed">
              {wikiReport.chemistry.visualAlignment}
            </p>
          </div>
          
          {/* Variance Disclaimer */}
          <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3">
            <p className="text-sm text-yellow-200 leading-relaxed">
              {wikiReport.chemistry.varianceDisclaimer}
            </p>
          </div>
        </div>
      </CollapsibleSection>
      
      {/* 5. EFFECTS & EXPERIENCE (Phase 4.2 Step 4.2.6) */}
      <CollapsibleSection
        title="Effects & Experience"
        defaultExpanded={true}
        icon="✨"
      >
        <div className="space-y-4">
          {/* Primary Effects */}
          {wikiReport.effectsExperience.primaryEffects.length > 0 && (
            <div>
              <h3 className="text-base font-semibold text-white/90 mb-2">
                Primary Effects
              </h3>
              <ul className="list-disc list-inside space-y-1 text-white/80 ml-2">
                {wikiReport.effectsExperience.primaryEffects.map((effect, idx) => (
                  <li key={idx}>{effect}</li>
                ))}
              </ul>
            </div>
          )}
          
          {/* Secondary Effects */}
          {wikiReport.effectsExperience.secondaryEffects.length > 0 && (
            <div>
              <h3 className="text-base font-semibold text-white/90 mb-2">
                Secondary Effects
              </h3>
              <ul className="list-disc list-inside space-y-1 text-white/80 ml-2">
                {wikiReport.effectsExperience.secondaryEffects.map((effect, idx) => (
                  <li key={idx}>{effect}</li>
                ))}
              </ul>
            </div>
          )}
          
          {/* Onset Timing */}
          <div>
            <h3 className="text-base font-semibold text-white/90 mb-2">
              Onset Timing
            </h3>
            <p className="text-white/80 leading-relaxed">
              {wikiReport.effectsExperience.onsetTiming}
            </p>
          </div>
          
          {/* Typical Duration */}
          <div>
            <h3 className="text-base font-semibold text-white/90 mb-2">
              Typical Duration
            </h3>
            <p className="text-white/80 leading-relaxed">
              {wikiReport.effectsExperience.typicalDuration}
            </p>
          </div>
          
          {/* Mental vs Physical Balance */}
          <div>
            <h3 className="text-base font-semibold text-white/90 mb-2">
              Mental vs Physical Balance
            </h3>
            <p className="text-white/80 leading-relaxed">
              {wikiReport.effectsExperience.mentalVsPhysical}
            </p>
          </div>
          
          {/* Common Use Cases */}
          {wikiReport.effectsExperience.commonUseCases.length > 0 && (
            <div>
              <h3 className="text-base font-semibold text-white/90 mb-2">
                Common Use Cases
              </h3>
              <ul className="list-disc list-inside space-y-1 text-white/80 ml-2">
                {wikiReport.effectsExperience.commonUseCases.map((useCase, idx) => (
                  <li key={idx}>{useCase}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </CollapsibleSection>
      
      {/* 6. CULTIVATION CHARACTERISTICS (Phase 4.2 Step 4.2.7) */}
      <CollapsibleSection
        title="Cultivation Characteristics"
        defaultExpanded={false}
        icon="🌱"
      >
        <div className="space-y-4">
          {/* Indoor/Outdoor */}
          <div>
            <h3 className="text-base font-semibold text-white/90 mb-2">
              Indoor vs Outdoor
            </h3>
            <p className="text-white/80 leading-relaxed">
              {wikiReport.cultivation.indoorOutdoor}
            </p>
          </div>
          
          {/* Flowering Time */}
          <div>
            <h3 className="text-base font-semibold text-white/90 mb-2">
              Flowering Time
            </h3>
            <p className="text-white/80 leading-relaxed">
              {wikiReport.cultivation.floweringTime}
            </p>
          </div>
          
          {/* Yield Expectation */}
          <div>
            <h3 className="text-base font-semibold text-white/90 mb-2">
              Yield Expectation
            </h3>
            <p className="text-white/80 leading-relaxed">
              {wikiReport.cultivation.yieldExpectation}
            </p>
          </div>
          
          {/* Growth Pattern */}
          <div>
            <h3 className="text-base font-semibold text-white/90 mb-2">
              Growth Pattern
            </h3>
            <p className="text-white/80 leading-relaxed">
              {wikiReport.cultivation.growthPattern}
            </p>
          </div>
          
          {/* Known Sensitivities */}
          {wikiReport.cultivation.knownSensitivities.length > 0 && (
            <div>
              <h3 className="text-base font-semibold text-white/90 mb-2">
                Known Sensitivities
              </h3>
              <ul className="list-disc list-inside space-y-1 text-white/80 ml-2">
                {wikiReport.cultivation.knownSensitivities.map((sensitivity, idx) => (
                  <li key={idx}>{sensitivity}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </CollapsibleSection>
      
      {/* 7. SIMILAR / OFTEN CONFUSED STRAINS (Phase 4.2 Step 4.2.7) */}
      {wikiReport.similarStrains.length > 0 && (
        <CollapsibleSection
          title="Similar / Often Confused Strains"
          defaultExpanded={false}
          icon="🔍"
        >
          <div className="space-y-4">
            {wikiReport.similarStrains.map((similar, idx) => (
              <div key={idx} className="p-4 rounded-lg border border-white/10 bg-white/5">
                <h3 className="text-base font-semibold text-white/90 mb-2">
                  {similar.name}
                </h3>
                <p className="text-sm text-white/70 mb-2">
                  <strong>Why Similar:</strong> {similar.similarityReason}
                </p>
                <p className="text-sm text-white/80 leading-relaxed">
                  <strong>Distinction:</strong> {similar.distinction}
                </p>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}
      
      {/* 8. CONFIDENCE & VARIANCE NOTES (Phase 4.2 Step 4.2.8) */}
      <CollapsibleSection
        title="Confidence & Variance Notes"
        defaultExpanded={false}
        icon="📊"
      >
        <div className="space-y-4">
          {/* Why This Confidence */}
          <div>
            <h3 className="text-base font-semibold text-white/90 mb-2">
              Why This Confidence Level
            </h3>
            <p className="text-white/80 leading-relaxed">
              {wikiReport.confidenceVariance.whyThisConfidence}
            </p>
          </div>
          
          {/* What Increased Confidence */}
          {wikiReport.confidenceVariance.whatIncreasedConfidence.length > 0 && (
            <div>
              <h3 className="text-base font-semibold text-green-300 mb-2">
                ✓ What Increased Confidence
              </h3>
              <ul className="list-disc list-inside space-y-1 text-white/80 ml-2">
                {wikiReport.confidenceVariance.whatIncreasedConfidence.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </div>
          )}
          
          {/* What Limits Certainty */}
          {wikiReport.confidenceVariance.whatLimitsCertainty.length > 0 && (
            <div>
              <h3 className="text-base font-semibold text-yellow-300 mb-2">
                ⚠️ What Limits Certainty
              </h3>
              <ul className="list-disc list-inside space-y-1 text-white/80 ml-2">
                {wikiReport.confidenceVariance.whatLimitsCertainty.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </CollapsibleSection>
      
      {/* 9. SOURCES & REASONING (Phase 4.2 Step 4.2.9) */}
      <CollapsibleSection
        title="Sources & Reasoning"
        defaultExpanded={false}
        icon="📚"
      >
        <div className="space-y-4">
          {/* Database */}
          <div>
            <h3 className="text-base font-semibold text-white/90 mb-2">
              Internal Database
            </h3>
            <p className="text-white/80 leading-relaxed">
              {wikiReport.sourcesReasoning.database}
            </p>
          </div>
          
          {/* Visual Clustering */}
          <div>
            <h3 className="text-base font-semibold text-white/90 mb-2">
              Visual Trait Clustering
            </h3>
            <p className="text-white/80 leading-relaxed">
              {wikiReport.sourcesReasoning.visualClustering}
            </p>
          </div>
          
          {/* Consensus Logic */}
          <div>
            <h3 className="text-base font-semibold text-white/90 mb-2">
              Cross-Image Consensus Logic
            </h3>
            <p className="text-white/80 leading-relaxed">
              {wikiReport.sourcesReasoning.consensusLogic}
            </p>
          </div>
          
          {/* AI Synthesis */}
          <div>
            <h3 className="text-base font-semibold text-white/90 mb-2">
              AI Synthesis
            </h3>
            <p className="text-white/80 leading-relaxed">
              {wikiReport.sourcesReasoning.aiSynthesis}
            </p>
          </div>
        </div>
      </CollapsibleSection>
    </section>
  );
}
