"use client";

import { useState } from "react";
import { MOCK_SCANNER_RESULT } from "@/lib/scanner/mockResult";
import type { ScannerResult } from "@/lib/scanner/types";

/**
 * IMPORTANT:
 * This page must ONLY consume ScannerResult from lib/scanner/types.ts
 * Do not add fields here unless the contract is updated first.
 */

const revealBase =
  "transition-all duration-500 ease-out";
const revealIn =
  "opacity-100 translate-y-0";
const revealOut =
  "opacity-0 translate-y-3";

export default function ScannerPage() {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [result, setResult] = useState<ScannerResult | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageUrl(URL.createObjectURL(file));
    setResult(null);
  }

  function runScan() {
    // TEMP: mock pipeline
    setResult(MOCK_SCANNER_RESULT);
  }

  return (
    <section className="relative z-20 mx-auto w-full max-w-5xl px-4 py-8">
      <div className="rounded-3xl border border-white/20 bg-black/70 backdrop-blur-xl p-6 text-white">
        {/* SCANNER CONTENT GOES BELOW */}
        <h1 className="text-3xl font-bold mb-4">Scanner</h1>

      {/* Image Preview */}
      {imageUrl && (
        <div className="flex justify-center mt-6 mb-4">
          <div className="rounded-2xl border border-white/20 bg-black/40 backdrop-blur-md p-2 shadow-xl">
            <img
              src={imageUrl}
              alt="Scan preview"
              className="h-40 w-40 object-cover rounded-xl"
            />
          </div>
        </div>
      )}

      {/* Controls */}
      <input
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="block w-full text-sm mb-4"
      />

      <button
        onClick={runScan}
        className="w-full mt-4 py-3 rounded-full bg-white text-black font-medium tracking-wide hover:bg-white/90 active:scale-[0.98] transition"
      >
        Run Scan
      </button>

      {/* SCAN RESULT */}
      {result && (
        <div className="mt-8 max-w-xl mx-auto rounded-3xl bg-black/40 backdrop-blur-xl border border-white/15 shadow-2xl text-white overflow-hidden">

          {/* HEADER */}
          <div className="px-6 pt-6 pb-4 border-b border-white/10">
            <h2 className="text-3xl font-semibold tracking-tight">
              {result.strainName}
            </h2>
            <p className="text-sm text-white/60 mt-1">
              Confidence · {result.confidence}%
            </p>
          </div>

          {/* BODY */}
          <div className="px-6 py-5 space-y-6">

            <div>
              <h3 className="text-xs uppercase tracking-widest text-white/50 mb-1">
                Genetics
              </h3>
              <p className="text-sm">{result.genetics.dominance}</p>
              <p className="text-sm text-white/60">
                {result.genetics.lineage.join(" × ")}
              </p>
            </div>

            <div>
              <h3 className="text-xs uppercase tracking-widest text-white/50 mb-1">
                Experience
              </h3>
              <p className="text-sm">
                {result.experience.effects.join(", ")}
              </p>
              <p className="text-sm text-white/60">
                Best for · {result.experience.bestFor.join(", ")}
              </p>
              {result.experience.bestTime && (
                <p className="text-sm text-white/60">
                  Best time · {result.experience.bestTime}
                </p>
              )}
            </div>

          </div>

          {/* FOOTER */}
          <div className="px-6 py-4 border-t border-white/10 bg-black/30">
            <p className="text-[11px] text-white/45 leading-relaxed">
              {result.disclaimer}
            </p>
          </div>

        </div>
      )}
      </div>
    </section>
  );
}
