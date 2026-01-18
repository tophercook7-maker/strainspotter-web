"use client";

import { useState } from "react";
import { buildWikiResult } from "@/lib/scanner/wikiEngine";
import { wikiToViewModel } from "@/lib/scanner/wikiAdapter";
import type { ScannerViewModel } from "@/lib/scanner/viewModel";

/**
 * 🔒 A.2 — runScan uses ViewModel ONLY (UI NEVER TOUCHES WIKI DIRECTLY)
 */

const revealBase =
  "transition-all duration-500 ease-out";
const revealIn =
  "opacity-100 translate-y-0";
const revealOut =
  "opacity-0 translate-y-3";

export default function ScannerPage() {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [result, setResult] = useState<ScannerViewModel | null>(null);
  const [loading, setLoading] = useState(false);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageUrl(URL.createObjectURL(file));
    setImageFile(file);
    setResult(null);
  }

  async function runScan() {
    const file = imageFile;
    if (!file) return;

    setLoading(true);

    try {
      const seed = file.name + file.size + file.lastModified;

      const wiki = buildWikiResult({
        imageSeed: seed,
      });

      const viewModel = wikiToViewModel(wiki);
      
      setResult(viewModel);
    } catch (e) {
      console.error("Scan failed", e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="relative z-20 mx-auto w-full max-w-5xl px-4 py-8">
      <div className="rounded-3xl border border-white/20 bg-black/70 backdrop-blur-xl p-6 text-white">
        {/* SCANNER CONTENT GOES BELOW */}
        <h1 className="text-3xl font-bold mb-4">Scanner</h1>

      {/* Image Preview */}
      {imageUrl && (
        <div className="w-full flex justify-center py-4">
          <img
            src={imageUrl}
            alt="Scan preview"
            className="max-h-56 w-auto object-contain rounded-xl border border-white/20"
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
        disabled={!imageFile || loading}
        className="w-full mt-4 py-3 rounded-full bg-white text-black font-medium tracking-wide hover:bg-white/90 active:scale-[0.98] transition disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {loading ? "Scanning..." : "Run Scan"}
      </button>

      {/* LAYER 3 — WIKI UI */}
      {result && (
        <div className="mt-6 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 p-6 text-white space-y-4">
          <h2 className="text-2xl font-bold">{result.title}</h2>
          <p className="text-white/70">{result.disclaimer}</p>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><strong>Dominance:</strong> {result.genetics.dominance}</div>
            <div><strong>Confidence:</strong> {result.confidence}%</div>
            <div><strong>Effects:</strong> {result.experience.effects.join(", ")}</div>
            <div><strong>Best For:</strong> {result.experience.bestFor.join(", ")}</div>
            {result.genetics.lineage && (
              <div className="col-span-2">
                <strong>Genetics:</strong> {result.genetics.lineage}
              </div>
            )}
            {result.experience.bestTime && (
              <div className="col-span-2">
                <strong>Best Time:</strong> {result.experience.bestTime}
              </div>
            )}
          </div>
        </div>
      )}
      </div>
    </section>
  );
}
