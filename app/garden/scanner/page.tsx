"use client";

import { useState } from "react";
import { wikiToScannerViewModel } from "@/lib/scanner/wikiAdapter";
import { runWikiEngine } from "@/lib/scanner/wikiEngine";
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
    if (!imageFile) return;

    setLoading(true);

    try {
      const wikiResult = await runWikiEngine(imageFile);
      const viewModel = wikiToScannerViewModel(wikiResult);
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
        disabled={!imageFile || loading}
        className="w-full mt-4 py-3 rounded-full bg-white text-black font-medium tracking-wide hover:bg-white/90 active:scale-[0.98] transition disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {loading ? "Scanning..." : "Run Scan"}
      </button>

      {/* LAYER 3 — WIKI UI */}
      {result && (
        <div className="mt-6 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 p-6 text-white space-y-4">
          <h2 className="text-2xl font-bold">{result.strainName}</h2>
          <p className="text-white/70">{result.summary}</p>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><strong>Dominance:</strong> {result.dominance}</div>
            <div><strong>Confidence:</strong> {result.confidencePct}%</div>
            <div><strong>Aromas:</strong> {result.aromas.join(", ") || "—"}</div>
            <div><strong>Effects:</strong> {result.effects.join(", ")}</div>
            <div className="col-span-2">
              <strong>Best For:</strong> {result.bestFor.join(", ")}
            </div>
            {result.genetics.length > 0 && (
              <div className="col-span-2">
                <strong>Genetics:</strong> {result.genetics.join(" × ")}
              </div>
            )}
          </div>
        </div>
      )}
      </div>
    </section>
  );
}
