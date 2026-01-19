"use client";

import { useState } from "react";
import { buildWikiResult } from "@/lib/scanner/wikiEngine";
import { wikiToViewModel } from "@/lib/scanner/wikiAdapter";
import { synthesizeWikiInsights } from "@/lib/scanner/wikiSynthesis";
import type { ScannerViewModel } from "@/lib/scanner/viewModel";
import type { WikiSynthesis } from "@/lib/scanner/types";
import WikiPanel from "./WikiPanel";
import ResultPanel from "./ResultPanel";
import TopNav from "../_components/TopNav";

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
  const [synthesis, setSynthesis] = useState<WikiSynthesis | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [imageSeed, setImageSeed] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageUrl(URL.createObjectURL(file));
    setImageFile(file);
    setResult(null);
    setSynthesis(null);
    setImageSeed(null);
  }

  function runScan() {
    console.log("A: runScan clicked")
    console.log("B: imageSeed", imageSeed)

    const file = imageFile;
    if (!file) return;

    setLoading(true);

    try {
      const seed = file.name + file.size + file.lastModified;
      setImageSeed(seed);

      // 🔒 B.2.4 — Call wiki engine, adapter, then synthesis
      const wiki = buildWikiResult({
        imageSeed: seed,
      });
      console.log("C: wiki", wiki)

      const viewModel = wikiToViewModel(wiki);
      console.log("D: viewModel", viewModel)
      const wikiSynthesis = synthesizeWikiInsights(wiki);
      
      setResult(viewModel);
      setSynthesis(wikiSynthesis);
      setIsScanning(false);
      
      // B.2.5 — Log synthesis for verification (no UI consumption yet)
      console.log("Wiki Synthesis:", wikiSynthesis);
    } catch (err) {
      console.error("Scan failed", err);
      setIsScanning(false);
    } finally {
      setLoading(false);
    }
  }

  console.log("RENDER CHECK:", { result, synthesis })

  return (
    <div className="min-h-screen max-h-screen overflow-hidden bg-black text-white flex flex-col">
      <TopNav title="Scanner" showBack />
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
            className="max-h-48 w-auto object-contain rounded-xl border border-white/20"
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
      <div className="flex-1 overflow-y-auto space-y-4 pb-6">
        {result && <ResultPanel result={result} />}
        {synthesis && <WikiPanel synthesis={synthesis} />}
      </div>

      {/* Variance note */}
      {result && (
        <p className="mt-4 text-xs text-white/40 text-center italic">
          Results may differ with lighting, angle, and maturity.
        </p>
      )}

      {/* Debug: Image seed/hash (subtle) */}
      {imageSeed && (
        <div className="mt-2 text-right">
          <code className="text-xs text-white/20 font-mono">
            {imageSeed.slice(0, 20)}...
          </code>
        </div>
      )}
        </div>
      </section>
    </div>
  );
}
