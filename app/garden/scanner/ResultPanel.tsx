// app/garden/scanner/ResultPanel.tsx
// PART B — Full report display (NO TRUNCATION)

import type { ScannerViewModel } from "@/lib/scanner/viewModel";

export default function ResultPanel({ result }: { result: ScannerViewModel }) {
  return (
    <section className="rounded-xl bg-white/5 p-6">
      <h2 className="text-2xl font-bold">{result.name || result.title || "Unknown Cultivar"}</h2>

      <p className="mt-2 text-white/70">
        Confidence: {result.confidence ?? 0}% ({result.confidenceTier?.label || result.confidenceTier?.tier || "Unknown"})
      </p>
    </section>
  );
}
