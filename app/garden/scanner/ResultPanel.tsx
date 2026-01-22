// app/garden/scanner/ResultPanel.tsx
// PART B — Full report display (NO TRUNCATION)

import type { ScannerViewModel } from "@/lib/scanner/viewModel";

export default function ResultPanel({ result }: { result: ScannerViewModel }) {
  // ratio is at top level of ScannerViewModel, not in nameFirstDisplay
  const ratio = result.ratio ?? null;

  return (
    <section className="rounded-xl bg-white/5 p-6">
      {/* Phase 4.3.4 — render name confidence */}
      {result.nameFirstDisplay && (
        <div className="mt-4">
          <div className="text-2xl font-bold">
            {result.nameFirstDisplay.primaryStrainName}
          </div>
          <div className="text-sm opacity-70">
            Confidence: {result.nameFirstDisplay.confidencePercent ?? 0}%
          </div>
        </div>
      )}
      
      {!result.nameFirstDisplay && (
        <>
          <h2 className="text-2xl font-bold">{result.name || result.title || "Unknown Cultivar"}</h2>

          <p className="mt-2 text-white/70">
            Confidence: {result.confidence ?? 0}% ({result.confidenceTier?.label || result.confidenceTier?.tier || "Unknown"})
          </p>
        </>
      )}

      {/* Phase 4.0.1 — render graceful fallback UI */}
      {result.softFail && (
        <div className="mt-6 max-w-md rounded-xl border border-yellow-500/40 bg-yellow-500/10 p-4">
          <div className="font-semibold">Limited Scan Confidence</div>
          <div className="text-sm mt-1 opacity-80">
            {result.softFail.recommendation}
          </div>
        </div>
      )}

      {/* Phase 4.9.0 — render name confidence display */}
      {result.nameConfidence && (
        <div className="mt-8 max-w-md">
          <h2 className="text-2xl font-extrabold">
            {result.nameConfidence.primaryName}
          </h2>

          <div className="mt-1 text-sm opacity-80">
            {result.nameConfidence.confidence}% match confidence
          </div>

          {result.nameConfidence.alternateNames.length > 0 && (
            <div className="mt-2 text-sm opacity-70">
              Also similar to: {result.nameConfidence.alternateNames.join(", ")}
            </div>
          )}
        </div>
      )}

      {/* Phase 4.3.5 — render normalized dominance ratio */}
      {result.dominance && (
        <div className="mt-6">
          <div className="text-lg font-semibold">
            {result.dominance.classification}
          </div>
          <div className="flex gap-4 text-sm mt-2">
            <span>Indica {result.dominance.indica}%</span>
            <span>Sativa {result.dominance.sativa}%</span>
            <span>Hybrid {result.dominance.hybrid}%</span>
          </div>
        </div>
      )}

      {/* Phase 4.3.2 — render stabilized ratio (fallback if dominance not available) */}
      {!result.dominance && result.stabilizedRatio && (
        <div className="mt-4">
          <div className="text-sm font-semibold mb-1">
            Indica / Sativa / Hybrid
          </div>
          <div className="text-sm">
            {result.stabilizedRatio.indica}% Indica ·{" "}
            {result.stabilizedRatio.sativa}% Sativa ·{" "}
            {result.stabilizedRatio.hybrid}% Hybrid
          </div>
          <div className="text-xs text-white/60 mt-1">
            Confidence: {result.stabilizedRatio.confidence}%
          </div>
        </div>
      )}
      
      {/* Fallback to existing ratio structure */}
      {!result.stabilizedRatio && ratio && (
        <div className="mt-3 text-sm text-white/80">
          <div className="font-semibold">Indica / Sativa / Hybrid</div>
          <div className="text-white/70">
            {ratio.indicaPercent}% indica · {ratio.sativaPercent}% sativa · {100 - ratio.indicaPercent - ratio.sativaPercent}% hybrid
          </div>
          {ratio.dominance && (
            <div className="text-white/60 mt-1">{ratio.dominance}</div>
          )}
        </div>
      )}

      {/* Phase 4.3.3 — render visual anchors */}
      {result.visualAnchors?.length ? (
        <div className="mt-4">
          <div className="text-sm font-semibold mb-2">
            Key Visual Anchors
          </div>
          <ul className="text-sm space-y-1">
            {result.visualAnchors.map(anchor => (
              <li key={anchor.trait}>
                {anchor.trait} · {anchor.strength}% ·{" "}
                {anchor.sourceImages} images
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* Phase 4.3.6 — render confidence explanation */}
      {result.confidenceExplanation && (
        <div className="mt-6">
          <div className="text-lg font-semibold">
            Confidence: {result.confidenceExplanation.tier} (
            {result.confidenceExplanation.score}%)
          </div>
          <ul className="mt-2 text-sm list-disc ml-5 space-y-1">
            {result.confidenceExplanation.explanation.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Phase 4.4.0 — render name-first section */}
      {result.nameFirst && (
        <div className="mt-8">
          <div className="text-2xl font-bold">
            {result.nameFirst.primaryName}
          </div>

          <div className="text-sm opacity-70 mt-1">
            Name confidence: {result.nameFirst.confidence}%
          </div>

          {result.nameFirst.alternateNames.length > 0 && (
            <div className="mt-3">
              <div className="text-sm font-semibold">Possible alternatives</div>
              <ul className="text-sm list-disc ml-5 mt-1 space-y-1">
                {result.nameFirst.alternateNames.map((n, i) => (
                  <li key={i}>{n}</li>
                ))}
              </ul>
            </div>
          )}

          <ul className="mt-4 text-xs list-disc ml-5 space-y-1 opacity-80">
            {result.nameFirst.reasoning.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Phase 4.5.0 — render ratio display */}
      {result.ratio && result.ratio.indica !== undefined && result.ratio.sativa !== undefined && result.ratio.hybrid !== undefined && !result.ratio.classification && (
        <div className="mt-8">
          <div className="text-lg font-semibold">
            {result.ratio.label}
          </div>

          <div className="flex gap-3 mt-2 text-sm">
            <span>Indica {result.ratio.indica}%</span>
            <span>Sativa {result.ratio.sativa}%</span>
            <span>Hybrid {result.ratio.hybrid}%</span>
          </div>

          {result.ratio.confidence !== undefined && (
            <div className="text-xs opacity-70 mt-1">
              Ratio confidence: {result.ratio.confidence}%
            </div>
          )}
        </div>
      )}

      {/* Phase 4.8.0 — render ratio display (V48 engine) */}
      {result.ratio && result.ratio.indica !== undefined && result.ratio.sativa !== undefined && result.ratio.hybrid !== undefined && result.ratio.classification && (
        <div className="mt-8 max-w-md">
          <h3 className="text-lg font-bold mb-2">Indica / Sativa Ratio</h3>

          <div className="flex gap-4 text-sm font-semibold">
            <span>Indica {result.ratio.indica}%</span>
            <span>Sativa {result.ratio.sativa}%</span>
            <span>Hybrid {result.ratio.hybrid}%</span>
          </div>

          <div className="mt-2 text-sm opacity-80">
            {result.ratio.classification} · {result.ratio.confidence}% confidence
          </div>
        </div>
      )}

      {/* Phase 4.2 — Ratio UI (compact, centered) */}
      {result.ratio && result.ratio.indica !== undefined && result.ratio.sativa !== undefined && result.ratio.hybrid !== undefined && (
        <div className="mt-6 max-w-md mx-auto">
          <div className="text-sm font-semibold mb-2 text-center">
            Indica / Sativa / Hybrid
          </div>

          <div className="flex h-3 rounded overflow-hidden">
            <div style={{ width: `${result.ratio.indica}%` }} className="bg-purple-600" />
            <div style={{ width: `${result.ratio.sativa}%` }} className="bg-green-500" />
            <div style={{ width: `${result.ratio.hybrid}%` }} className="bg-yellow-500" />
          </div>

          <div className="flex justify-between text-xs mt-1 opacity-70">
            <span>Indica {result.ratio.indica}%</span>
            <span>Sativa {result.ratio.sativa}%</span>
            <span>Hybrid {result.ratio.hybrid}%</span>
          </div>
        </div>
      )}

      {/* Phase 4.6.0 — render match strength UI */}
      {result.matchStrength && (
        <div className="mt-8 max-w-md">
          <div className="text-xl font-bold">
            Match Strength: {result.matchStrength.score}%
          </div>

          <div className="text-sm uppercase tracking-wide opacity-80">
            {result.matchStrength.tier} confidence
          </div>

          <ul className="mt-3 text-sm list-disc list-inside opacity-80">
            {result.matchStrength.explanation.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Phase 4.7.0 — render disambiguation UI */}
      {result.nameDisambiguation && (
        <div className="mt-10 max-w-md">
          <h3 className="text-xl font-bold mb-2">Why this strain?</h3>

          <ul className="list-disc list-inside text-sm opacity-85 mb-4">
            {result.nameDisambiguation.primary.whyChosen.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>

          {result.nameDisambiguation.alternatives.length > 0 && (
            <>
              <h4 className="text-sm font-semibold uppercase tracking-wide opacity-70">
                Similar possibilities
              </h4>

              <div className="space-y-3 mt-3">
                {result.nameDisambiguation.alternatives.map((alt, i) => (
                  <div key={i} className="border border-white/10 rounded p-3">
                    <div className="font-semibold">
                      {alt.name} — {alt.confidence}%
                    </div>
                    <ul className="text-xs list-disc list-inside opacity-75 mt-1">
                      {alt.whyNotChosen.map((r, j) => (
                        <li key={j}>{r}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}
