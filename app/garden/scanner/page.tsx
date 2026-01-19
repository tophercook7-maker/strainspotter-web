"use client";

import { useState, useRef } from "react";
import { runWikiEngine } from "@/lib/scanner/wikiEngine";
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
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [result, setResult] = useState<ScannerViewModel | null>(null);
  const [synthesis, setSynthesis] = useState<WikiSynthesis | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
  };

  const runScan = async () => {
    console.log("RUN SCAN FIRED", file);
    if (!file) return;

    setIsScanning(true);

    const wiki = await runWikiEngine(file);
    const viewModel = wikiToViewModel(wiki);
    const synthesis = synthesizeWikiInsights(wiki);

    setResult(viewModel);
    setSynthesis(synthesis);
    setIsScanning(false);
  };

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
            className="w-full rounded-lg bg-green-600 py-3 font-semibold text-black"
          >
            Run Scan
          </button>
        </div>

        {/* RESULTS */}
        {result && <ResultPanel result={result} />}

        {synthesis && <WikiPanel synthesis={synthesis} />}

      </div>
    </main>
  );
}
