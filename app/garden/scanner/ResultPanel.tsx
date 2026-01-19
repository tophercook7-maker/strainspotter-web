// app/garden/scanner/ResultPanel.tsx
// 🔒 A.2 — UI reads ONLY from ScannerViewModel (LOCKED)

import type { ScannerViewModel } from "@/lib/scanner/viewModel";

interface ResultPanelProps {
  result: ScannerViewModel;
}

export default function ResultPanel({ result }: ResultPanelProps) {
  const safeEffects = Array.isArray(result.experience.effects) ? result.experience.effects : [];
  const safeBestFor = Array.isArray(result.experience.bestFor) ? result.experience.bestFor : [];

  // Generate qualitative confidence language
  const getConfidenceLanguage = (confidence: number): string => {
    if (confidence >= 80) {
      return "Strong visual alignment with calming cultivars";
    } else if (confidence >= 65) {
      return "Moderate alignment with uplifting profiles";
    } else {
      return "Some variability expected due to phenotype and lighting";
    }
  };

  return (
    <div className="w-full bg-black/50 backdrop-blur rounded-2xl p-6 shadow-xl">
      {/* LEAD WITH EXPERIENCE */}
      <section className="mb-6">
        <h2 className="text-xl md:text-2xl font-semibold mb-3">What This Plant Is Likely To Feel Like</h2>
        
        {/* Qualitative confidence */}
        <p className="text-base md:text-lg leading-relaxed text-white/80 mb-4 italic">
          {getConfidenceLanguage(result.confidence)}
        </p>

        {/* Experience explanation paragraph */}
        <p className="text-base md:text-lg leading-relaxed text-white/90 mb-4">
          Based on the observed visual characteristics and growth patterns, this plant shows traits commonly associated with {safeEffects.length > 0 ? safeEffects[0].toLowerCase() : "calming"} effects. The morphology suggests a profile that may provide {safeEffects.length > 1 ? safeEffects.slice(0, 2).join(" and ").toLowerCase() : safeEffects[0]?.toLowerCase() || "balanced"} experiences.
        </p>

        {/* Effects list */}
        {safeEffects.length > 0 && (
          <div className="mb-4">
            <p className="text-base md:text-lg font-medium text-white/90 mb-2">Likely Effects:</p>
            <ul className="list-disc list-inside space-y-1 text-base md:text-lg leading-relaxed text-white/80">
              {safeEffects.map((effect, index) => (
                <li key={index}>{effect}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Best for */}
        {safeBestFor.length > 0 && (
          <div className="mb-4">
            <p className="text-base md:text-lg font-medium text-white/90 mb-2">Best For:</p>
            <ul className="list-disc list-inside space-y-1 text-base md:text-lg leading-relaxed text-white/80">
              {safeBestFor.map((use, index) => (
                <li key={index}>{use}</li>
              ))}
            </ul>
          </div>
        )}

        {result.experience.bestTime && (
          <p className="text-base md:text-lg leading-relaxed text-white/80">
            Optimal timing: {result.experience.bestTime}
          </p>
        )}
      </section>

      {/* GENETICS */}
      <section className="mb-6">
        <h3 className="text-lg md:text-xl font-semibold mb-2">Genetics</h3>
        <p className="text-base md:text-lg leading-relaxed text-white/90">{result.genetics.dominance}</p>
        <p className="text-base md:text-lg leading-relaxed text-white/90">{result.genetics.lineage}</p>
      </section>

      {/* STRAIN NAME - DE-EMPHASIZED */}
      <section className="border-t border-white/10 pt-4">
        <h3 className="text-sm md:text-base font-medium mb-2 text-white/70">Closest Known Cultivar (Reference Only)</h3>
        <p className="text-base md:text-lg font-semibold text-white/90 mb-2">{result.title}</p>
        <p className="text-sm md:text-base leading-relaxed text-white/60 italic">
          This identification is an estimate based on visual similarity, not genetic testing.
        </p>
      </section>
    </div>
  );
}
