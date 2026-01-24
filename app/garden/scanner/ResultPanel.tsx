// app/garden/scanner/ResultPanel.tsx
// PART B — Full report display (NO TRUNCATION)

import type { ScannerViewModel } from "@/lib/scanner/viewModel";
import type { FeatureFlag } from "@/lib/flags";

export default function ResultPanel({ result, flags }: { result: ScannerViewModel; flags?: Record<FeatureFlag, boolean> }) {
  // UI CONTRACT ENFORCEMENT — Only read from nameFirstDisplay and optional sections
  // Never assume: dominance, terpeneExperience, extendedProfile
  const ratio = result.ratio ?? null; // Optional section

  return (
    <div className="w-full max-w-[720px] mx-auto px-4">
      {/* UI FIX — Constrain width: max-w-[680px], mx-auto, px-4 */}
      
      {/* Phase 4.9 — 1. Name display rules (LOCKED): Primary strain name MUST render large, first, above all other content */}
      {/* STABILIZATION RESET — READ ONLY from nameFirstDisplay and confidence */}
      {(() => {
        // STABILIZATION RESET — Only read from nameFirstDisplay (no fallbacks to name/title)
        const primaryName = result.nameFirstDisplay?.primaryStrainName || "Closest Known Cultivar";
        const confidenceTier = result.confidenceTier?.label || (result.nameFirstDisplay as any)?.nameConfidenceTier || "Moderate Confidence";
        
        return (
          <section className="rounded-xl bg-white/5 border border-white/10 p-6 mb-4">
            {/* Phase 4.9 — 1. Primary name: Large, first, above all other content */}
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="flex-1">
                <div className="text-3xl md:text-4xl font-extrabold">
                  {/* Phase 4.2.1 — Always render name, no conditional hiding */}
                  {primaryName}
                </div>
                
                {/* Phase 4.9 — 2. Name confidence badge: Attach directly to name, color-coded but subtle */}
                <div className="mt-2 inline-flex items-center gap-2">
                  {/* Phase 4.2.1 — Always render confidence badge, even for low confidence */}
                  {confidenceTier === "Very High Confidence" && (
                    <span className="px-2 py-1 text-xs rounded-full bg-green-500/20 text-green-300 border border-green-500/40">
                      Very High
                    </span>
                  )}
                  {confidenceTier === "High Confidence" && (
                    <span className="px-2 py-1 text-xs rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/40">
                      High
                    </span>
                  )}
                  {confidenceTier === "Moderate Confidence" && (
                    <span className="px-2 py-1 text-xs rounded-full bg-yellow-500/20 text-yellow-300 border border-yellow-500/40">
                      Moderate
                    </span>
                  )}
                  {(confidenceTier === "Low Confidence" || confidenceTier === "Possible Match") && (
                    <span className="px-2 py-1 text-xs rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/40">
                      {confidenceTier === "Low Confidence" ? "Low" : "Possible"}
                    </span>
                  )}
                  {/* Fallback for any other tier or missing tier */}
                  {confidenceTier !== "Very High Confidence" && 
                   confidenceTier !== "High Confidence" && 
                   confidenceTier !== "Moderate Confidence" && 
                   confidenceTier !== "Low Confidence" && 
                   confidenceTier !== "Possible Match" && (
                    <span className="px-2 py-1 text-xs rounded-full bg-gray-500/20 text-gray-300 border border-gray-500/40">
                      {confidenceTier}
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            {/* Phase 4.9 — 3. Alias + lineage support */}
            {(() => {
              const dbEntry = (result as any).dbEntry;
              const aliases = dbEntry?.aliases || [];
              const lineage = dbEntry?.lineage || dbEntry?.parentStrains || (dbEntry?.genetics as any)?.lineage;
              
              if (aliases.length > 0 || lineage) {
                return (
                  <div className="mt-3 space-y-2">
                    {/* Show aliases if available */}
                    {aliases.length > 0 && (
                      <div className="text-sm opacity-60">
                        Also known as: {aliases.slice(0, 3).join(", ")}
                      </div>
                    )}
                    {/* Show lineage if available */}
                    {lineage && (
                      <div className="text-sm opacity-60">
                        Lineage: {typeof lineage === "string" ? lineage : Array.isArray(lineage) ? lineage.join(" × ") : "Unknown"}
                      </div>
                    )}
                  </div>
                );
              }
              return null;
            })()}
            
            {/* Phase 4.9 — 4. Disambiguation note (ONLY if needed) */}
            {result.nameFirstDisplay?.alternateNames && result.nameFirstDisplay.alternateNames.length > 0 && (
              <div className="mt-3 text-sm opacity-60 italic">
                Most likely among closely related cultivars
              </div>
            )}
            
            {/* Phase 4.8 — 1. Rename confidence concept: Displayed as "Confidence Level" */}
            {/* Phase 4.7 — 3. Confidence badge directly below (pill, subtle) */}
            {/* Phase 5.3.3 — USER-FACING CONFIDENCE COPY (no percentages) */}
            {(() => {
              const { getShortConfidenceCopy } = require("@/lib/scanner/confidenceCopy");
              const confidence = result.nameFirstDisplay?.confidencePercent ?? result.confidence ?? 0;
              const confidenceTier = confidence >= 90 ? "very_high" : confidence >= 75 ? "high" : confidence >= 60 ? "medium" : "low";
              const imageCount = (result as any).imageCount ?? 1;
              const confidenceCopy = getShortConfidenceCopy({
                confidence,
                confidenceTier,
                imageCount,
                hasStrongVisualMatch: confidence >= 75,
                hasDatabaseMatch: true,
              });
              
              return (
                <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20">
                  <span className="text-xs opacity-70">Confidence:</span>
                  <span className="text-sm font-medium">
                    {confidenceCopy}
                  </span>
                </div>
              );
            })()}
          {/* Phase 5.2 — 7. Explanation: Generate short explanation */}
          {result.confidenceExplanation && result.confidenceExplanation.explanation && result.confidenceExplanation.explanation.length > 0 && (
            <div className="mt-3 text-sm opacity-70">
              {result.confidenceExplanation.explanation[0]}
            </div>
          )}
          
          {/* Phase 4.7 — 3. One-line explanation under badge */}
          {result.nameFirstDisplay.explanation?.whyThisNameWon && result.nameFirstDisplay.explanation.whyThisNameWon.length > 0 && (
            <div className="mt-3 text-base opacity-80">
              {result.nameFirstDisplay.explanation.whyThisNameWon[0]}
            </div>
          )}
          
          {/* Phase 4.3 — 5. User-facing disclaimer (1 line only) */}
          <div className="text-xs opacity-50 mt-4 italic">
            Visual analysis with reference guidance — not lab verified.
          </div>
          </section>
        );
      })()}

      {/* Phase 5.1 — 5. Integration: Display near strain name */}
      {/* Phase 4.4 — 2. Indica / Sativa / Hybrid ratio (REQUIRED) */}
      {/* Phase 4.7.4 — UI Presentation (Trust-First) */}
      {/* Phase 4.7.5 — Failure Safety */}
      {/* FEATURE FLAG: Paid Tier Only */}
      {flags?.paid_tier && result.ratio && (
        <section className="rounded-xl bg-white/5 border border-white/10 p-6 mb-4">
          {/* Phase 4.7.4 — Trust-First Presentation: Visualization first, not raw numbers */}
          {/* Phase 4.7.5 — Failure Safety: Check confidence threshold */}
          {(() => {
            const ratioConfidence = (result.ratio as any).confidence ?? (result.finalRatio as any)?.confidence ?? 100;
            const CONFIDENCE_THRESHOLD = 60; // Below this, show fallback
            const hasLowConfidence = ratioConfidence < CONFIDENCE_THRESHOLD;
            
            // Phase 4.7.5 — Never fabricate dominance when confidence is low
            const displayLabel = hasLowConfidence
              ? "Balanced Hybrid (insufficient evidence to bias)"
              : ((result.ratio as any).dominantLabel || result.ratio.classification || "Balanced Hybrid");
            
            // Phase 4.7.5 — Force 50/50 when confidence is too low
            const displayIndica = hasLowConfidence ? 50 : result.ratio.indica;
            const displaySativa = hasLowConfidence ? 50 : result.ratio.sativa;
            const displayHybrid = hasLowConfidence ? 0 : (result.ratio.hybrid || 0);
            
            return (
              <div className="space-y-4">
                {/* Label: Dominance label (e.g., "Indica-leaning Hybrid") */}
                <div className="text-lg md:text-xl font-semibold text-white/95">
                  {displayLabel}
                </div>
            
                {/* Bar visualization (primary display) */}
                <div className="space-y-2">
                  <div className="h-4 bg-white/10 rounded-full overflow-hidden">
                    <div className="flex h-full">
                      <div 
                        style={{ width: `${displayIndica}%` }} 
                        className="bg-purple-600 transition-all" 
                        title={`Indica: ${displayIndica}%`}
                      />
                      <div 
                        style={{ width: `${displaySativa}%` }} 
                        className="bg-green-500 transition-all" 
                        title={`Sativa: ${displaySativa}%`}
                      />
                      {displayHybrid > 0 && (
                        <div 
                          style={{ width: `${displayHybrid}%` }} 
                          className="bg-yellow-500/60 transition-all" 
                          title={`Hybrid: ${displayHybrid}%`}
                        />
                      )}
                    </div>
                  </div>
              
                  {/* Subtext: "Based on genetics + visual structure" */}
                  {/* Phase 4.7.4 — Dynamic subtext based on available sources */}
                  {/* Phase 4.7.5 — Hide subtext when confidence is too low */}
                  {!hasLowConfidence && (() => {
                    const sourceBreakdown = (result.ratio as any)?.sourceBreakdown;
                    const sources: string[] = [];
                    
                    if (sourceBreakdown?.genetics && (sourceBreakdown.genetics.indica !== 50 || sourceBreakdown.genetics.sativa !== 50)) {
                      sources.push("genetics");
                    }
                    if (sourceBreakdown?.familyBaseline && (sourceBreakdown.familyBaseline.indica !== 50 || sourceBreakdown.familyBaseline.sativa !== 50)) {
                      sources.push("family baseline");
                    }
                    if (sourceBreakdown?.visualMorphology && (sourceBreakdown.visualMorphology.indica !== 50 || sourceBreakdown.visualMorphology.sativa !== 50)) {
                      sources.push("visual structure");
                    }
                    if (sourceBreakdown?.terpeneBias && (sourceBreakdown.terpeneBias.indica !== 50 || sourceBreakdown.terpeneBias.sativa !== 50)) {
                      sources.push("terpene profile");
                    }
                    
                    const subtext = sources.length > 0 
                      ? `Based on ${sources.join(" + ")}`
                      : "Based on genetics + visual structure";
                    
                    return (
                      <p className="text-xs text-white/60 font-medium">
                        {subtext}
                      </p>
                    );
                  })()}
                </div>
                
                {/* Phase 4.7.4 — Expandable exact % breakdown */}
                <details className="cursor-pointer group">
                  <summary className="text-sm text-white/70 hover:text-white/90 transition-colors list-none">
                    <span className="flex items-center gap-2">
                      <span>Show exact breakdown</span>
                      <span className="text-white/50 group-open:rotate-180 transition-transform">▼</span>
                    </span>
                  </summary>
                  <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white/80">Indica</span>
                      <span className="text-white/90 font-medium">{displayIndica}%</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white/80">Sativa</span>
                      <span className="text-white/90 font-medium">{displaySativa}%</span>
                    </div>
                    {displayHybrid > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-white/80">Hybrid</span>
                        <span className="text-white/90 font-medium">{displayHybrid}%</span>
                      </div>
                    )}
                    {hasLowConfidence && (
                      <div className="mt-2 pt-2 border-t border-white/5">
                        <p className="text-xs text-white/50 italic">
                          Confidence too low to determine genetic bias. Showing balanced hybrid as default.
                        </p>
                      </div>
                    )}
                  </div>
                </details>
              </div>
            );
          })()}
          
          {/* Phase 5.1 — 4. User-facing explanation: Generate 2–3 bullets (if available) */}
          {result.finalRatio && result.finalRatio.explanation && result.finalRatio.explanation.length > 0 && (
            <div className="mt-4 pt-4 border-t border-white/10 space-y-1">
              {result.finalRatio.explanation.map((line, i) => (
                <div key={i} className="text-sm text-white/70">
                  • {line}
                </div>
              ))}
            </div>
          )}
          {/* Phase 4.4 — Confidence note if confidence < 65% */}
          {(result.ratio as any).needsEstimationNote && (
            <div className="text-xs text-white/50 italic mt-3">
              Ratio estimated from visual traits and reference genetics.
            </div>
          )}
        </section>
      )}

      {/* Phase 4.2 — 4. Handle similar strains gracefully (collapsible, if present) */}
      {/* FEATURE FLAG: Paid Tier Only */}
      {flags?.paid_tier && result.nameDisambiguationV407 && result.nameDisambiguationV407.alternates.length > 0 && (
        <section className="rounded-xl bg-white/5 border border-white/10 p-6 mb-4">
          {/* Phase 4.7 — 4. Section separators: section cards */}
          <details className="cursor-pointer">
            <summary className="text-base md:text-lg font-semibold text-yellow-400 hover:text-yellow-300">
              Similar cultivars considered
            </summary>
            <div className="mt-4 space-y-3">
              <p className="text-base opacity-80">{result.nameDisambiguationV407.note}</p>
              <ul className="list-disc ml-5 space-y-2 text-sm md:text-base">
                {result.nameDisambiguationV407.alternates.slice(0, 3).map((alt, i) => (
                  <li key={i}>{alt.name}</li>
                ))}
              </ul>
            </div>
          </details>
        </section>
      )}

      {/* Phase 4.0.1 — render graceful fallback UI */}
      {result.softFail && (
        <section className="rounded-xl border border-yellow-500/40 bg-yellow-500/10 p-6 mb-4">
          {/* Phase 4.7 — 4. Section separators */}
          <div className="text-base md:text-lg font-semibold">Limited Scan Confidence</div>
          <div className="text-sm md:text-base mt-2 opacity-80">
            {result.softFail.recommendation}
          </div>
        </section>
      )}

      {/* Phase 4.9.0 — render name confidence display */}
      {result.nameConfidence && (
        <div className="mt-8 max-w-md">
          <h2 className="text-2xl font-extrabold">
            {result.nameConfidence.primaryName}
          </h2>

          <div className="mt-1 text-sm opacity-80">
            {result.nameConfidence.confidence}% match confidence
          </div>

          {result.nameConfidence.alternateNames.length > 0 && (
            <div className="mt-2 text-sm opacity-70">
              Also similar to: {result.nameConfidence.alternateNames.join(", ")}
            </div>
          )}
        </div>
      )}

      {/* Phase 4.0.5 — render final ratio (fallback if result.ratio not available) */}
      {!result.ratio && result.finalRatio && (
        <section className="rounded-xl bg-white/5 border border-white/10 p-6 mb-4">
          {/* Phase 4.7 — 4. Section separators */}
          <div className="text-lg md:text-xl font-semibold mb-3">
            {result.finalRatio.classification}
          </div>
          <div className="flex gap-4 text-sm md:text-base mb-3">
            <span>Indica {result.finalRatio.indica}%</span>
            <span>Sativa {result.finalRatio.sativa}%</span>
            <span>Hybrid {result.finalRatio.hybrid}%</span>
          </div>
          <div className="text-sm text-white/60 mb-2">
            Confidence: {result.finalRatio.confidence}%
          </div>
          {result.finalRatio.explanation && result.finalRatio.explanation.length > 0 && (
            <div className="text-sm text-white/50">
              {result.finalRatio.explanation.join(" · ")}
            </div>
          )}
        </section>
      )}

      {/* UI CONTRACT ENFORCEMENT — Never assume dominance */}
      {/* Use result.ratio or result.finalRatio only */}

      {/* Phase 4.3.2 — render stabilized ratio (legacy fallback - deprecated) */}
      {!result.finalRatio && result.stabilizedRatio && (
        <section className="rounded-xl bg-white/5 border border-white/10 p-6 mb-4">
          {/* Phase 4.7 — 4. Section separators */}
          <div className="text-base md:text-lg font-semibold mb-2">
            Indica / Sativa / Hybrid
          </div>
          <div className="text-sm md:text-base mb-2">
            {result.stabilizedRatio.indica}% Indica ·{" "}
            {result.stabilizedRatio.sativa}% Sativa ·{" "}
            {result.stabilizedRatio.hybrid}% Hybrid
          </div>
          <div className="text-sm text-white/60">
            Confidence: {result.stabilizedRatio.confidence}%
          </div>
        </section>
      )}
      
      {/* Fallback to existing ratio structure */}
      {!result.stabilizedRatio && ratio && (
        <section className="rounded-xl bg-white/5 border border-white/10 p-6 mb-4">
          {/* Phase 4.7 — 4. Section separators */}
          <div className="text-base md:text-lg font-semibold mb-2">Indica / Sativa / Hybrid</div>
          <div className="text-sm md:text-base text-white/70 mb-2">
            {ratio.indicaPercent}% indica · {ratio.sativaPercent}% sativa · {100 - ratio.indicaPercent - ratio.sativaPercent}% hybrid
          </div>
          {ratio.dominance && (
            <div className="text-sm text-white/60">{ratio.dominance}</div>
          )}
        </section>
      )}

      {/* Phase 4.3.3 — render visual anchors */}
      {/* FEATURE FLAG: Paid Tier Only */}
      {flags?.paid_tier && result.visualAnchors?.length ? (
        <section className="rounded-xl bg-white/5 border border-white/10 p-6 mb-4">
          {/* Phase 4.7 — 4. Section separators */}
          <div className="text-base md:text-lg font-semibold mb-3">
            Key Visual Anchors
          </div>
          <ul className="text-sm md:text-base space-y-2">
            {/* Phase 4.7 — 5. Text sizing: bullets text-sm/base */}
            {result.visualAnchors.map(anchor => (
              <li key={anchor.trait}>
                {anchor.trait} · {anchor.strength}% ·{" "}
                {anchor.sourceImages} images
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Phase 4.3.6 — render confidence explanation */}
      {result.confidenceExplanation && (
        <section className="rounded-xl bg-white/5 border border-white/10 p-6 mb-4">
          {/* Phase 4.7 — 4. Section separators */}
          <div className="text-lg md:text-xl font-semibold mb-3">
            Confidence: {result.confidenceExplanation.tier} (
            {result.confidenceExplanation.score}%)
          </div>
          <ul className="text-sm md:text-base list-disc ml-5 space-y-2">
            {/* Phase 4.7 — 5. Text sizing: bullets text-sm/base */}
            {result.confidenceExplanation.explanation.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </section>
      )}

      {/* Phase 4.4.0 — render name-first section */}
      {result.nameFirst && (
        <section className="rounded-xl bg-white/5 border border-white/10 p-6 mb-4">
          {/* Phase 4.7 — 4. Section separators */}
          <div className="text-2xl md:text-3xl font-bold mb-2">
            {result.nameFirst.primaryName}
          </div>

          <div className="text-sm md:text-base opacity-70 mb-3">
            Name confidence: {result.nameFirst.confidence}%
          </div>

          {result.nameFirst.alternateNames.length > 0 && (
            <div className="mb-4">
              <div className="text-sm md:text-base font-semibold mb-2">Possible alternatives</div>
              <ul className="text-sm md:text-base list-disc ml-5 space-y-2">
                {/* Phase 4.7 — 5. Text sizing: bullets text-sm/base */}
                {result.nameFirst.alternateNames.map((n, i) => (
                  <li key={i}>{n}</li>
                ))}
              </ul>
            </div>
          )}

          <ul className="text-sm md:text-base list-disc ml-5 space-y-2 opacity-80">
            {/* Phase 4.7 — 5. Text sizing: bullets text-sm/base (not text-xs) */}
            {result.nameFirst.reasoning.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </section>
      )}

      {/* Phase 4.5.0 — render ratio display */}
      {result.ratio && result.ratio.indica !== undefined && result.ratio.sativa !== undefined && result.ratio.hybrid !== undefined && !result.ratio.classification && (
        <div className="mt-8">
          <div className="text-lg font-semibold">
            {result.ratio.label}
          </div>

          <div className="flex gap-3 mt-2 text-sm">
            <span>Indica {result.ratio.indica}%</span>
            <span>Sativa {result.ratio.sativa}%</span>
            <span>Hybrid {result.ratio.hybrid}%</span>
          </div>

          {result.ratio.confidence !== undefined && (
            <div className="text-xs opacity-70 mt-1">
              Ratio confidence: {result.ratio.confidence}%
            </div>
          )}
        </div>
      )}

      {/* Phase 4.8.0 — render ratio display (V48 engine) */}
      {result.ratio && result.ratio.indica !== undefined && result.ratio.sativa !== undefined && result.ratio.hybrid !== undefined && result.ratio.classification && (
        <div className="mt-8 max-w-md">
          <h3 className="text-lg font-bold mb-2">Indica / Sativa Ratio</h3>

          <div className="flex gap-4 text-sm font-semibold">
            <span>Indica {result.ratio.indica}%</span>
            <span>Sativa {result.ratio.sativa}%</span>
            <span>Hybrid {result.ratio.hybrid}%</span>
          </div>

          <div className="mt-2 text-sm opacity-80">
            {result.ratio.classification} · {result.ratio.confidence}% confidence
          </div>
        </div>
      )}

      {/* Phase 4.2 — Ratio UI (compact, centered) */}
      {result.ratio && result.ratio.indica !== undefined && result.ratio.sativa !== undefined && result.ratio.hybrid !== undefined && (
        <div className="mt-6 max-w-md mx-auto">
          <div className="text-sm font-semibold mb-2 text-center">
            Indica / Sativa / Hybrid
          </div>

          <div className="flex h-3 rounded overflow-hidden">
            <div style={{ width: `${result.ratio.indica}%` }} className="bg-purple-600" />
            <div style={{ width: `${result.ratio.sativa}%` }} className="bg-green-500" />
            <div style={{ width: `${result.ratio.hybrid}%` }} className="bg-yellow-500" />
          </div>

          <div className="flex justify-between text-xs mt-1 opacity-70">
            <span>Indica {result.ratio.indica}%</span>
            <span>Sativa {result.ratio.sativa}%</span>
            <span>Hybrid {result.ratio.hybrid}%</span>
          </div>
        </div>
      )}

      {/* Phase 4.6.0 — render match strength UI */}
      {result.matchStrength && (
        <div className="mt-8 max-w-md">
          <div className="text-xl font-bold">
            Match Strength: {result.matchStrength.score}%
          </div>

          <div className="text-sm uppercase tracking-wide opacity-80">
            {result.matchStrength.tier} confidence
          </div>

          <ul className="mt-3 text-sm list-disc list-inside opacity-80">
            {result.matchStrength.explanation.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Phase 4.7.0 — render disambiguation UI */}
      {/* FEATURE FLAG: Paid Tier Only */}
      {flags?.paid_tier && result.nameDisambiguation && (
        <div className="mt-10 max-w-md">
          <h3 className="text-xl font-bold mb-2">Why this strain?</h3>

          <ul className="list-disc list-inside text-sm opacity-85 mb-4">
            {result.nameDisambiguation.primary.whyChosen.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>

          {result.nameDisambiguation.alternatives.length > 0 && (
            <>
              <h4 className="text-sm font-semibold uppercase tracking-wide opacity-70">
                Similar possibilities
              </h4>

              <div className="space-y-3 mt-3">
                {result.nameDisambiguation.alternatives.map((alt, i) => (
                  <div key={i} className="border border-white/10 rounded p-3">
                    <div className="font-semibold">
                      {alt.name} — {alt.confidence}%
                    </div>
                    <ul className="text-xs list-disc list-inside opacity-75 mt-1">
                      {alt.whyNotChosen.map((r, j) => (
                        <li key={j}>{r}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
