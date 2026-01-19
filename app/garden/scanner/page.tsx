"use client";

import { useState, useRef } from "react";
import { runWikiEngine } from "@/lib/scanner/wikiEngine";
import { wikiToViewModel } from "@/lib/scanner/wikiAdapter";
import { synthesizeWikiInsights } from "@/lib/scanner/wikiSynthesis";
import type { ScannerViewModel } from "@/lib/scanner/viewModel";
import type { WikiSynthesis } from "@/lib/scanner/types";

type ScanTier = "basic" | "pro" | "expert";
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
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [result, setResult] = useState<ScannerViewModel | null>(null);
  const [synthesis, setSynthesis] = useState<WikiSynthesis | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanTier] = useState<ScanTier>("basic");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
  };

  // TIER 1 (FREE / NORMAL):
  // - General identification
  // - Core effects, aroma, genetics
  // - Educational summary only
  const runScan = async () => {
    if (!file) {
      alert("Please choose an image first.");
      return;
    }

    setIsScanning(true);

    console.log("RUN SCAN CLICKED", file.name);

    const wiki = await runWikiEngine(file);
    const viewModel = wikiToViewModel(wiki);
    setResult(viewModel);

    const wikiSynthesis = synthesizeWikiInsights(wiki);
    setSynthesis(wikiSynthesis);

    setIsScanning(false);
  };

  return (
    <>
      <TopNav title="Scanner" showBack />
      
      <main className="min-h-screen bg-black text-white flex justify-center px-4 py-10">
        {/* background image stays behind everything */}
        <div className="fixed inset-0 -z-10">
          <div className="absolute inset-0 bg-black/60" />
        </div>

        {/* CONTENT */}
        <div className="w-full max-w-3xl space-y-8">
        {/* uploader + preview card */}
        <div className="w-full max-w-md mx-auto bg-black/40 backdrop-blur rounded-xl p-4 space-y-4">
          {/* FILE PICKER */}
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="block w-full text-sm text-white/70"
          />

          {/* IMAGE PREVIEW */}
          {previewUrl && (
            <div className="flex justify-center">
              <img
                src={previewUrl}
                alt="Scan preview"
                className="max-h-72 w-auto rounded-xl border border-white/20 shadow-lg"
              />
            </div>
          )}

          {/* RUN SCAN BUTTON */}
          <button
            onClick={runScan}
            disabled={isScanning}
            className="w-full py-4 text-lg font-semibold rounded-xl
                       bg-green-600 hover:bg-green-500 active:scale-[0.98]
                       transition-all shadow-lg"
          >
            {isScanning ? "Scanning…" : "Run Scan"}
          </button>
        </div>

        {/* ResultPanel */}
        {result && <ResultPanel result={result} synthesis={synthesis} />}

        {/* WikiPanel */}
        {synthesis && <WikiPanel synthesis={synthesis} />}
        </div>
      </main>
    </>
  );
}
