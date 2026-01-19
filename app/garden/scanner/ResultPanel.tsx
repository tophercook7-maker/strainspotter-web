// app/garden/scanner/ResultPanel.tsx
// 🔒 A.2 — UI reads ONLY from ScannerViewModel (LOCKED)

import type { ScannerViewModel } from "@/lib/scanner/viewModel";
import type { WikiSynthesis } from "@/lib/scanner/types";

interface ResultPanelProps {
  result: ScannerViewModel;
  synthesis?: WikiSynthesis;
}

export default function ResultPanel({ result, synthesis }: ResultPanelProps) {
  const safeEffects = Array.isArray(result.experience.effects) ? result.experience.effects : [];
  const safeBestFor = Array.isArray(result.experience.bestFor) ? result.experience.bestFor : [];

  // Generate qualitative confidence language
  const getConfidenceLanguage = (confidence: number): string => {
    if (confidence >= 80) {
      return "Highly consistent with documented visual profiles";
    } else if (confidence >= 65) {
      return "Strong agreement across multiple observable traits";
    } else {
      return "Low visual contradiction detected";
    }
  };

  return (
    <div className="max-w-3xl mx-auto bg-black/80 backdrop-blur-md rounded-2xl p-6 md:p-8 mt-6 mb-12">
      {/* BEST MATCH NAME - AT TOP */}
      {synthesis?.bestMatch && (
        <div className="mb-8 pb-8">
          <h1 className="text-3xl font-extrabold tracking-tight mb-1">
            {synthesis.bestMatch.name}
          </h1>
          <p className="text-white/60 text-sm mb-4">
            Closest known cultivar match
          </p>
          <p className="text-base md:text-lg text-white/80">
            {synthesis.bestMatch.explanation}
          </p>
        </div>
      )}

      <hr />

      {/* 1. HEADLINE */}
      <h2 className="text-xl md:text-2xl font-semibold mb-4">What This Plant Is Likely To Feel Like</h2>
      
      {/* 2. CONFIDENCE SENTENCE */}
      <p className="text-base md:text-lg leading-relaxed text-white/80 mb-6">
        {getConfidenceLanguage(result.confidence)}. This assessment prioritizes visual consistency rather than strain naming.
      </p>

      {/* 3. EXPERIENCE PARAGRAPH */}
      <p className="text-base md:text-lg leading-relaxed text-white/90 mb-6">
        Based on observed visual characteristics and growth patterns, this plant shows traits commonly associated with {safeEffects.length > 0 ? safeEffects[0].toLowerCase() : "calming"} effects. The morphology suggests a profile that may provide {safeEffects.length > 1 ? safeEffects.slice(0, 2).join(" and ").toLowerCase() : safeEffects[0]?.toLowerCase() || "balanced"} experiences.
      </p>

      {/* 4. EFFECTS LIST */}
      {safeEffects.length > 0 && (
        <div className="mb-6">
          <ul className="space-y-2 text-base md:text-lg leading-relaxed text-white/90">
            {safeEffects.slice(0, 5).map((effect, index) => (
              <li key={index}>• {effect}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 5. BEST USE */}
      {safeBestFor.length > 0 && (
        <p className="text-base md:text-lg leading-relaxed text-white/80 mb-6">
          Best for: {safeBestFor[0]}
        </p>
      )}

      {/* 6. GENETICS - COLLAPSED */}
      <details className="mb-6">
        <summary className="text-base md:text-lg font-medium text-white/80 cursor-pointer hover:text-white/90">
          Genetics
        </summary>
        <div className="mt-3 space-y-2 text-base md:text-lg leading-relaxed text-white/80">
          <p>{result.genetics.dominance}</p>
          <p>{result.genetics.lineage}</p>
        </div>
      </details>

      {/* 7. CLOSEST KNOWN CULTIVAR - COLLAPSED */}
      <details>
        <summary className="text-base md:text-lg font-medium text-white/80 cursor-pointer hover:text-white/90">
          Closest Known Cultivar (Reference Only)
        </summary>
        <div className="mt-3 space-y-2">
          <p className="text-base md:text-lg font-semibold text-white/90">{result.title}</p>
          <p className="text-base md:text-lg leading-relaxed text-white/80 italic">
            This identification is an estimate based on visual similarity, not genetic testing.
          </p>
        </div>
      </details>
    </div>
  );
}
