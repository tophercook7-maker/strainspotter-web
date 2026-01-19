"use client";

import { useState, useRef } from "react";
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
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [result, setResult] = useState<ScannerViewModel | null>(null);
  const [synthesis, setSynthesis] = useState<WikiSynthesis | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [imageSeed, setImageSeed] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const resultRef = useRef<HTMLDivElement | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreviewUrl(URL.createObjectURL(file));
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
      
      // Scroll to results after render
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } catch (err) {
      console.error("Scan failed", err);
      setIsScanning(false);
    } finally {
      setLoading(false);
    }
  }

  console.log("RENDER CHECK:", { result, synthesis })

  return (
    <main className="min-h-screen bg-black text-white flex flex-col overflow-y-auto">
      <TopNav title="Scanner" showBack />
      <div className="w-full flex justify-center px-4">
        <div className="w-full max-w-2xl flex flex-col gap-4">
          <div className="rounded-3xl border border-white/20 bg-black/70 backdrop-blur-xl p-6 text-white">
            {/* SCANNER CONTENT GOES BELOW */}
            <h1 className="text-3xl font-bold mb-4">Scanner</h1>

      {/* Image Preview */}
      {previewUrl && (
        <div className="w-full flex justify-center my-3">
          <img
            src={previewUrl}
            alt="Selected plant"
            className="max-h-[220px] w-auto rounded-md border border-white/20 object-contain"
          />
        </div>
      )}

      {/* Controls */}
      <div className="w-full max-w-sm mx-auto">
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="w-full text-sm text-white"
        />
      </div>

      <button
        onClick={runScan}
        disabled={!imageFile || loading}
        className="
          w-full
          max-w-sm
          mx-auto
          py-3
          rounded-xl
          bg-white
          text-black
          font-semibold
          tracking-wide
          transition
          hover:bg-white/90
          active:scale-[0.98]
          disabled:opacity-40
          disabled:cursor-not-allowed
        "
      >
        {loading ? "Scanning..." : "Run Scan"}
      </button>

      {/* LAYER 3 — WIKI UI */}
      <div ref={resultRef} className="flex-1 overflow-y-auto space-y-4 pb-6">
        {result && <ResultPanel result={result} />}
        {synthesis && <WikiPanel synthesis={synthesis} />}
      </div>
          </div>
        </div>
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
    </main>
  );
}
