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
    <div className="mx-auto mt-6 w-full max-w-3xl rounded-2xl bg-black/60 p-6 backdrop-blur">
      <h2 className="text-lg md:text-xl font-semibold mb-2">{result.title}</h2>
      <p className="text-base md:text-lg leading-relaxed text-white/90">
        Confidence: {result.confidence}%
      </p>

      <section>
        <h3 className="text-lg md:text-xl font-semibold mb-2">Genetics</h3>
        <p className="text-base md:text-lg leading-relaxed text-white/90">{result.genetics.dominance}</p>
        <p className="text-base md:text-lg leading-relaxed text-white/90">{result.genetics.lineage}</p>
      </section>

      <section>
        <h3 className="text-lg md:text-xl font-semibold mb-2">Experience</h3>
        <p className="text-base md:text-lg leading-relaxed text-white/90">Effects: {safeEffects.join(", ")}</p>
        <p className="text-base md:text-lg leading-relaxed text-white/90">Best for: {safeBestFor.join(", ")}</p>
        {result.experience.bestTime && (
          <p className="text-base md:text-lg leading-relaxed text-white/90">Best time: {result.experience.bestTime}</p>
        )}
      </section>

      <p className="text-base md:text-lg leading-relaxed text-white/90 mt-4">
        {result.disclaimer}
      </p>
    </div>
  );
}
