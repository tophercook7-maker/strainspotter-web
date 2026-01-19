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
      <h2 className="text-3xl font-bold text-white">
        {result.name || result.title}
      </h2>
      
      <p className="text-lg text-green-400 font-semibold">
        Confidence: {result.confidence}%
      </p>

      <div>
        <h3 className="text-xl font-semibold text-white mb-2">Why This Strain</h3>
        <p className="text-white/90 leading-relaxed whitespace-pre-line">{result.whyThisMatch}</p>
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

      {safeTerpeneGuess.length > 0 && (
        <div>
          <h3 className="text-xl font-semibold text-white mb-2">Likely Terpenes</h3>
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

      {safeReferenceStrains.length > 0 && (
        <div>
          <h3 className="text-xl font-semibold text-white mb-2">Also Similar</h3>
          <ul className="list-disc list-inside space-y-2">
            {safeReferenceStrains.map((strain, index) => (
              <li key={index} className="text-white/90">{strain}</li>
            ))}
          </ul>
        </div>
      )}

      {result.comparisons && result.comparisons.length > 0 && (
        <div>
          <h3 className="text-xl font-semibold text-white mb-2">Comparison</h3>
          <ul className="list-disc list-inside space-y-2">
            {result.comparisons.map((comp, index) => (
              <li key={index} className="text-white/90">{comp}</li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <h3 className="text-xl font-semibold text-white mb-2">Genetics</h3>
        <p className="text-white/90">
          {result.genetics.dominance} {result.genetics.lineage && `• ${result.genetics.lineage}`}
        </p>
      </div>

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
