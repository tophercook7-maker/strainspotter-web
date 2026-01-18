// app/garden/scanner/ResultPanel.tsx
// 🔒 A.2 — UI reads ONLY from ScannerViewModel (LOCKED)

import type { ScannerViewModel } from "@/lib/scanner/viewModel";

interface ResultPanelProps {
  result: ScannerViewModel;
}

export default function ResultPanel({ result }: ResultPanelProps) {
  return (
    <>
      <h2 className="text-xl font-semibold">{result.strainName}</h2>
      <p className="text-sm opacity-80">
        Confidence: {result.confidencePct}%
      </p>

      <section>
        <h3>Genetics</h3>
        <p>{result.dominance}</p>
        <p>{result.genetics.join(" × ")}</p>
      </section>

      <section>
        <h3>Experience</h3>
        <p>Effects: {result.effects.join(", ")}</p>
        <p>Best for: {result.bestFor.join(", ")}</p>
      </section>

      <p className="text-xs opacity-60 mt-4">
        Results are AI-assisted estimates and not definitive identification.
      </p>
    </>
  );
}
