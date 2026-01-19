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
    <main className="min-h-screen bg-black text-white">
      <TopNav title="Scanner" showBack />

      <div className="mx-auto max-w-xl px-4 py-6 space-y-6">

        {/* IMAGE PREVIEW */}
        {previewUrl && (
          <div className="rounded-xl overflow-hidden border border-white/10 bg-black">
            <img
              src={previewUrl}
              alt="Selected"
              className="w-full max-h-[320px] object-contain"
            />
          </div>
        )}

        {/* CONTROLS */}
        <div className="flex flex-col items-center gap-3">
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="block w-full text-sm text-white/70"
          />

          <button
            onClick={runScan}
            disabled={!imageFile || isScanning}
            className="w-full rounded-lg bg-green-600 py-3 font-semibold text-black disabled:opacity-40"
          >
            {isScanning ? "Scanning…" : "Run Scan"}
          </button>
        </div>

        {/* RESULTS */}
        {result && <ResultPanel result={result} />}

        {synthesis && <WikiPanel synthesis={synthesis} />}

      </div>
    </main>
  );
}
