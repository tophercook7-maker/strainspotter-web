// app/garden/scanner/ResultPanel.tsx
// STEP 2.1.F — Simplified result display

import type { ScannerViewModel } from "@/lib/scanner/viewModel";

interface ResultPanelProps {
  result: ScannerViewModel;
  imageCount: number;
}

export default function ResultPanel({ result, imageCount }: ResultPanelProps) {
  const safeEffects = Array.isArray(result.experience.effects) ? result.experience.effects : [];
  
  // Calculate confidence range (simple ±5% around confidence)
  const confidence = result.confidence;
  const minConf = Math.max(0, confidence - 5);
  const maxConf = Math.min(100, confidence + 5);
  const confidenceRange = `${minConf}–${maxConf}%`;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-4 md:p-6 space-y-4">
      {/* Large strain name (H1) */}
      <h1 className="text-3xl font-bold text-white">
        {result.title}
      </h1>

      {/* Confidence range */}
      <p className="text-lg text-green-400 font-semibold">
        {confidenceRange}
      </p>

      {/* Based on visual similarity */}
      <p className="text-sm text-white/60">
        Based on visual similarity across {imageCount} photo{imageCount > 1 ? "s" : ""}
      </p>

      {/* 3 bullet effects */}
      {safeEffects.length > 0 && (
        <div className="pt-2">
          <ul className="space-y-2">
            {safeEffects.slice(0, 3).map((effect, index) => (
              <li key={index} className="text-base text-white/90">• {effect}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Genetics line */}
      <div className="pt-2">
        <p className="text-sm text-white/70">
          <span className="font-medium">Genetics:</span> {result.genetics.dominance} {result.genetics.lineage && `• ${result.genetics.lineage}`}
        </p>
      </div>

      {/* Clear disclaimer */}
      <div className="pt-4 border-t border-white/10">
        <p className="text-xs text-white/50 italic">
          {result.disclaimer}
        </p>
      </div>
    </div>
  );
}
