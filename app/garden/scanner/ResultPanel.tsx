// app/garden/scanner/ResultPanel.tsx
// PART B — Full report display (NO TRUNCATION)

import type { ScannerViewModel } from "@/lib/scanner/viewModel";

interface ResultPanelProps {
  result: ScannerViewModel;
  imageCount: number;
}

export default function ResultPanel({ result, imageCount }: ResultPanelProps) {
  const safeEffectsLong = Array.isArray(result.effectsLong) ? result.effectsLong : [];
  const safeReferenceStrains = Array.isArray(result.referenceStrains) ? result.referenceStrains : [];
  const safeGrowthTraits = Array.isArray(result.growthTraits) ? result.growthTraits : [];
  const safeTerpeneGuess = Array.isArray(result.terpeneGuess) ? result.terpeneGuess : [];
  
  // Phase 15.5.6 — Helper functions for ratio display
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
    : deriveRatio(result.genetics?.dominance);
  
  return (
    <section className="rounded-2xl border border-white/15 bg-white/5 backdrop-blur-xl shadow-xl shadow-black/30 p-5 sm:p-6 space-y-6 max-h-[80vh] overflow-y-auto">
      {/* Phase 2.3 Part H — Output Structure (Final Order) */}
      
      {/* Phase 3.5 Part C — Strain Name & Match Type Display */}
      {/* Phase 15.5.5 — Make strain name + confidence feel real */}
      {/* 1. STRAIN NAME (LARGE) */}
      <div className="mb-4">
        <div className="text-3xl sm:text-4xl font-extrabold tracking-tight">
          {result.strainName || result.name || result.title || "Unknown Cultivar"}
        </div>
        
        {/* Phase 15.5.5 — Confidence badge */}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-white/10 border border-white/15 px-3 py-1 text-sm text-white/90">
            Confidence · {result.nameConfidence ?? result.matchConfidence ?? result.confidence ?? "--"}%
          </span>
          
          {result.confidenceTier && (
            <span className={`inline-flex items-center rounded-full border px-3 py-1 text-sm ${
              result.confidenceTier.tier === "very_high" || result.confidenceTier.tier === "high"
                ? "bg-emerald-500/10 border-emerald-400/20 text-emerald-200"
                : result.confidenceTier.tier === "medium"
                ? "bg-yellow-500/10 border-yellow-400/20 text-yellow-200"
                : "bg-orange-500/10 border-orange-400/20 text-orange-200"
            }`}>
              {result.confidenceTier.label}
            </span>
          )}
        </div>
      </div>
      
      {/* Phase 15.5.6 — Add Indica/Sativa/Hybrid ratio display */}
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
        
        {/* Phase 3.5 Part C — Display "Closest known match" label */}
        {result.namingInfo && (
          <p className="text-lg text-white/80 font-medium">
            {result.namingInfo.displayLabel}
          </p>
        )}
      </div>
      
      {/* Phase 3.4 Part C — Multi-Image Confidence Display */}
      {result.multiImageInfo && (
        <div className="space-y-2">
          <p className="text-sm text-white/70">{result.multiImageInfo.imageCountText}</p>
          <p className="text-2xl text-green-400 font-semibold">
            {result.multiImageInfo.confidenceRange}
          </p>
          {result.multiImageInfo.improvementExplanation && (
            <p className="text-sm text-white/80 leading-relaxed">
              {result.multiImageInfo.improvementExplanation}
            </p>
          )}
        </div>
      )}
      {!result.multiImageInfo && (
        <>
          {/* 2. CONFIDENCE %} (Fallback for legacy results) */}
          <p className="text-2xl text-green-400 font-semibold">
            {result.confidenceRange ? `${result.confidenceRange.min}–${result.confidenceRange.max}%` : `${result.confidence}%`}
          </p>
        </>
      )}
      
      {/* Phase 3.5 Part C — One-sentence rationale */}
      {result.namingInfo?.rationale && (
        <p className="text-base text-white/90 leading-relaxed">
          {result.namingInfo.rationale}
        </p>
      )}

      {/* Phase 2.8 Part O — Trust Layer (Always Visible) */}
      {result.trustLayer && (
        <div className="rounded-2xl border border-white/15 bg-white/5 backdrop-blur-xl shadow-xl shadow-black/30 p-5 sm:p-6 space-y-2">
          <h3 className="text-lg font-semibold text-white mb-2">
            {result.trustLayer.confidenceLanguage}
          </h3>
          <div className="space-y-3">
            <div>
              <h4 className="text-sm font-semibold text-white/90 mb-1">Why This Match:</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-white/80">
                {result.trustLayer.whyThisMatch.map((bullet, idx) => (
                  <li key={idx}>{bullet}</li>
                ))}
              </ul>
            </div>
            {result.trustLayer.sourcesUsed.length > 0 && (
              <div className="pt-2 border-t border-white/10">
                <p className="text-xs text-white/60">
                  Sources: {(result.trustLayer.sourcesUsed ?? []).join(", ")}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. WHY THIS MATCH (PARAGRAPH) */}
      <div>
        <h3 className="text-xl font-semibold text-white mb-2">Why This Match</h3>
        <p className="text-white/90 leading-relaxed whitespace-pre-line">{result.whyThisMatch}</p>
      </div>

      {/* 4. GENETICS & LINEAGE */}
      <div>
        <h3 className="text-xl font-semibold text-white mb-2">Genetics & Lineage</h3>
        <p className="text-white/90">
          {result.genetics.dominance} {result.genetics.lineage && `• ${result.genetics.lineage}`}
        </p>
      </div>

      <div>
        <h3 className="text-xl font-semibold text-white mb-2">Visual & Structural Analysis</h3>
        <p className="text-white/90 leading-relaxed mb-2">{result.morphology}</p>
        <p className="text-white/90 leading-relaxed mb-2">{result.trichomes}</p>
        <p className="text-white/90 leading-relaxed mb-2">{result.pistils}</p>
        <p className="text-white/90 leading-relaxed mb-2">{result.structure}</p>
        {safeGrowthTraits.length > 0 && (
          <ul className="list-disc list-inside space-y-1 mt-2">
            {safeGrowthTraits.map((trait, idx) => (
              <li key={idx} className="text-white/90">{trait}</li>
            ))}
          </ul>
        )}
      </div>

      {/* 6. TERPENE LIKELIHOOD */}
      {safeTerpeneGuess.length > 0 && (
        <div>
          <h3 className="text-xl font-semibold text-white mb-2">Terpene Likelihood</h3>
          <p className="text-white/90">{safeTerpeneGuess.join(", ")}</p>
        </div>
      )}

      <div>
        <h3 className="text-xl font-semibold text-white mb-2">Likely Effects</h3>
        <ul className="list-disc list-inside space-y-1">
          {safeEffectsLong.map((effect, index) => (
            <li key={index} className="text-white/90">{effect}</li>
          ))}
        </ul>
      </div>

      {/* 7. SIMILAR STRAINS (2-3) */}
      {safeReferenceStrains.length > 0 && (
        <div>
          <h3 className="text-xl font-semibold text-white mb-2">Similar Strains</h3>
          <ul className="list-disc list-inside space-y-2">
            {safeReferenceStrains.slice(0, 3).map((strain, index) => (
              <li key={index} className="text-white/90">{strain}</li>
            ))}
          </ul>
        </div>
      )}

      {result.comparisons && result.comparisons.length > 0 && (
        <div>
          <h3 className="text-xl font-semibold text-white mb-2">Comparison</h3>
          <ul className="list-disc list-inside space-y-2">
            {result.comparisons.slice(0, 3).map((comp, index) => (
              <li key={index} className="text-white/90">{comp}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 8. SOURCES (Wiki / DB) */}
      {result.sources && result.sources.length > 0 && (
        <div>
          <h3 className="text-xl font-semibold text-white mb-2">Sources</h3>
          <p className="text-sm text-white/60">
            {(result.sources ?? []).join(", ")}
          </p>
        </div>
      )}

      <div>
        <h3 className="text-xl font-semibold text-white mb-2">Confidence & Limits</h3>
        <p className="text-white/90 leading-relaxed">{result.uncertaintyExplanation}</p>
        <p className="text-sm text-white/60 italic mt-2">{result.disclaimer}</p>
        <p className="text-sm text-white/60 mt-2">
          Based on visual similarity across {imageCount} photo{imageCount > 1 ? "s" : ""}
        </p>
      </div>
    </section>
  );
}
