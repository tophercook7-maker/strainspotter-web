// app/garden/scanner/ResultPanel.tsx
// 🔒 A.2 — UI reads ONLY from ScannerViewModel (LOCKED)

import type { ScannerViewModel } from "@/lib/scanner/viewModel";

interface ResultPanelProps {
  result: ScannerViewModel;
}

export default function ResultPanel({ result }: ResultPanelProps) {
  const safeEffects = Array.isArray(result.experience.effects) ? result.experience.effects : [];
  const safeBestFor = Array.isArray(result.experience.bestFor) ? result.experience.bestFor : [];

  return (
    <div className="w-full max-w-2xl mx-auto px-4">
      <h2 className="text-xl font-semibold">{result.title}</h2>
      <p className="text-sm opacity-80">
        Confidence: {result.confidence}%
      </p>

      <section>
        <h3>Genetics</h3>
        <p>{result.genetics.dominance}</p>
        <p>{result.genetics.lineage}</p>
      </section>

      <section>
        <h3>Experience</h3>
        <p>Effects: {safeEffects.join(", ")}</p>
        <p>Best for: {safeBestFor.join(", ")}</p>
        {result.experience.bestTime && (
          <p>Best time: {result.experience.bestTime}</p>
        )}
      </section>

      <p className="text-xs opacity-60 mt-4">
        {result.disclaimer}
      </p>
    </div>
  );
}
