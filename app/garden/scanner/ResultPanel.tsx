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
  
  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-4 md:p-6 space-y-6 max-h-[80vh] overflow-y-auto">
      {/* Phase 2.3 Part H — Output Structure (Final Order) */}
      
      {/* 1. STRAIN NAME (LARGE) */}
      <h1 className="text-4xl font-bold text-white">
        {result.name || result.title}
      </h1>
      
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

      {/* Phase 2.8 Part O — Trust Layer (Always Visible) */}
      {result.trustLayer && (
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-5 space-y-2">
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
                  Sources: {result.trustLayer.sourcesUsed.join(", ")}
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
            {result.sources.join(", ")}
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
