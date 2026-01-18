"use client";

import { useState } from "react";
import { buildWikiResult } from "@/lib/scanner/wikiEngine";
import type { WikiResult } from "@/lib/scanner/types";

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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [result, setResult] = useState<WikiResult | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageUrl(URL.createObjectURL(file));
    setSelectedFile(file);
    setResult(null);
  }

  function runScan() {
    if (!selectedFile) return;

    // Generate deterministic hash from file for wiki engine
    const imageHash = `${selectedFile.name}-${selectedFile.size}-${selectedFile.lastModified}`;
    const wikiResult = buildWikiResult({ imageHash });
    setResult(wikiResult);
  }

  return (
    <section className="relative z-20 mx-auto w-full max-w-5xl px-4 py-8">
      <div className="rounded-3xl border border-white/20 bg-black/70 backdrop-blur-xl p-6 text-white">
        {/* SCANNER CONTENT GOES BELOW */}
        <h1 className="text-3xl font-bold mb-4">Scanner</h1>

      {/* Image Preview */}
      {/* LAYER 1 — IMAGE INGEST (LOCKED) */}
      {imageUrl && (
        <div className="flex justify-center my-4">
          <img
            src={imageUrl}
            alt="Scan preview"
            className="
              max-h-32 max-w-32
              md:max-h-40 md:max-w-40
              object-cover
              rounded-xl
              border border-white/20
              shadow-lg
            "
          />
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

      {/* LAYER 3 — WIKI UI */}
      {result && (
        <section className="space-y-8 mt-6 max-w-2xl mx-auto">

          <header>
            <h2 className="text-4xl font-semibold">{result.identity.strainName}</h2>
            <p className="text-white/60 text-sm">
              Confidence · {result.identity.confidence}%
            </p>
          </header>

          <div>
            <h3 className="text-xs uppercase tracking-widest text-white/50">Genetics</h3>
            <p>{result.genetics.dominance}</p>
            <p className="text-white/60">{result.genetics.lineage.join(" × ")}</p>
            <p className="text-sm mt-2">{result.genetics.breederNotes}</p>
          </div>

          <div>
            <h3 className="text-xs uppercase tracking-widest text-white/50">Morphology</h3>
            <p>{result.morphology.budStructure}</p>
            <p className="text-white/60">{result.morphology.trichomes}</p>
          </div>

          <div>
            <h3 className="text-xs uppercase tracking-widest text-white/50">Chemistry</h3>
            <ul className="text-sm space-y-1">
              {result.chemistry.terpenes.map((t) => (
                <li key={t.name}>
                  {t.name} · {(t.confidence * 100).toFixed(0)}%
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-xs uppercase tracking-widest text-white/50">Experience</h3>
            <p>{result.experience.effects.join(", ")}</p>
            <p className="text-white/60">
              Best use · {result.experience.bestUse.join(", ")}
            </p>
          </div>

        </section>
      )}
      </div>
    </section>
  );
}
