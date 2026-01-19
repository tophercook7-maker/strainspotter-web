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
    <main className="min-h-screen bg-black text-white">
      <TopNav title="Scanner" showBack />

      <div className="mx-auto max-w-xl px-4 py-6 space-y-6">

        <div className="flex flex-col items-center w-full px-4">
          {/* CONTROLS */}
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="block w-full text-sm text-white/70"
          />

          {/* IMAGE PREVIEW */}
          {previewUrl && (
            <div className="rounded-xl overflow-hidden border border-white/10 bg-black">
              <img
                src={previewUrl}
                alt="Selected"
                className="w-full max-h-[320px] object-contain pointer-events-none"
              />
            </div>
          )}

          {/* SCAN BUTTON */}
          <button
            onClick={runScan}
            disabled={!file || isScanning}
            className="
              w-full
              max-w-md
              mx-auto
              mt-4
              flex
              items-center
              justify-center
              gap-2
              rounded-xl
              bg-green-600
              hover:bg-green-500
              active:scale-[0.98]
              text-white
              text-lg
              font-semibold
              py-4
              shadow-lg
              transition
            "
          >
            🌿 Run Scan
          </button>
        </div>

        {/* RESULTS */}
        {result && <ResultPanel result={result} />}

        {synthesis && <WikiPanel synthesis={synthesis} />}

      </div>
    </main>
  );
}
