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
      return "Highly consistent with documented visual profiles";
    } else if (confidence >= 65) {
      return "Strong agreement across multiple observable traits";
    } else {
      return "Low visual contradiction detected";
    }
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-4 md:p-6">

      <div className="h-6" />

      {/* 1. HEADLINE */}
      <h2 className="text-xl font-semibold mb-2">
        What This Plant Is Likely To Feel Like
      </h2>

      <p className="text-white/80 leading-relaxed">
        {result.experience.summary}
      </p>

      {/* 4. EFFECTS LIST - SHORTER (2-3 bullets max) */}
      {safeEffects.length > 0 && (
        <div className="mb-4">
          <ul className="space-y-1.5">
            {safeEffects.slice(0, 3).map((effect, index) => (
              <li key={index} className="text-sm text-white/80">• {effect}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 5. BEST USE - SHORTER (1-2 bullets) */}
      {safeBestFor.length > 0 && (
        <div className="mb-4">
          <ul className="space-y-1.5">
            {safeBestFor.slice(0, 2).map((use, index) => (
              <li key={index} className="text-sm text-white/80">• {use}</li>
            ))}
          </ul>
        </div>
      )}

      {/* TECHNICAL DETAILS - COLLAPSED */}
      <details className="mt-6">
        <summary className="cursor-pointer text-white/70 hover:text-white">
          View technical details
        </summary>

        <div className="mt-4 space-y-4">
          {/* Genetics */}
          <div>
            <h3 className="text-base font-medium text-white/90 mb-2">Genetics</h3>
            <p className="text-sm text-white/80">{result.genetics.dominance}</p>
            <p className="text-sm text-white/80">{result.genetics.lineage}</p>
          </div>

          {/* Closest Known Cultivar */}
          <div>
            <h3 className="text-base font-medium text-white/90 mb-2">Closest Known Cultivar</h3>
            <p className="text-sm font-semibold text-white/90">{result.title}</p>
            <p className="text-sm text-white/80 italic">
              This identification is an estimate based on visual similarity, not genetic testing.
            </p>
          </div>
        </div>
      </details>
    </div>
  );
}
