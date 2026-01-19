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

  async function runScan() {
    console.log("RUN SCAN CLICKED");

    if (!imageSeed) return;

    setIsScanning(true);

    try {
      const file = imageFile;
      if (!file) return;

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
      
      // B.2.5 — Log synthesis for verification (no UI consumption yet)
      console.log("Wiki Synthesis:", wikiSynthesis);
      
      // Scroll to results after render
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } catch (err) {
      console.error("Scan failed", err);
    } finally {
      setIsScanning(false);
    }
  }

  console.log("RENDER CHECK:", { result, synthesis })

  return (
    <main className="py-6">
      <div className="mx-auto w-full max-w-3xl px-4">
        <TopNav title="Scanner" showBack />
        <div className="py-4 md:py-6 space-y-4 md:space-y-6">
          <div className="rounded-3xl bg-black/70 backdrop-blur-xl p-4 md:p-6 text-white">
            {/* SCANNER CONTENT GOES BELOW */}
            <h1 className="text-2xl md:text-3xl font-bold mb-4">Scanner</h1>

            {/* Image Preview */}
            {previewUrl && (
              <div className="mx-auto mt-4 flex justify-center">
                <img
                  src={previewUrl}
                  alt="Scan preview"
                  className="max-h-56 w-auto rounded-xl object-contain shadow-lg"
                />
              </div>
            )}

            <button
              onClick={runScan}
              disabled={!imageSeed || isScanning}
              className="mx-auto mt-4 flex items-center justify-center rounded-full bg-white px-10 py-3 text-sm font-semibold text-black shadow-md disabled:opacity-40"
            >
              {isScanning ? "Scanning…" : "Run Scan"}
            </button>

            {/* Controls */}
            <div className="w-full max-w-sm mx-auto">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="w-full text-sm text-white"
              />
            </div>

            {/* LAYER 3 — WIKI UI */}
            <div ref={resultRef} className="flex-1 overflow-y-auto space-y-4 pb-6">
              {result && <ResultPanel result={result} />}
              {synthesis && <WikiPanel synthesis={synthesis} />}
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
      </div>
    </main>
  );
}
