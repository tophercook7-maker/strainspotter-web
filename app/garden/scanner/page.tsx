"use client";

import { useState } from "react";
import { runWikiEngine } from "@/lib/scanner/wikiEngine";
import { wikiToViewModel } from "@/lib/scanner/wikiAdapter";
import { synthesizeWikiInsights } from "@/lib/scanner/wikiSynthesis";
import { generateIdentificationReport } from "@/lib/scanner/identificationReport";
import type { ScannerViewModel } from "@/lib/scanner/viewModel";
import type { WikiSynthesis, IdentificationReport, ScanContext } from "@/lib/scanner/types";

type ScanTier = "basic" | "pro" | "expert";
import WikiPanel from "./WikiPanel";
import ResultPanel from "./ResultPanel";
import TopNav from "../_components/TopNav";

/**
 * 🔒 A.2 — runScan uses ViewModel ONLY (UI NEVER TOUCHES WIKI DIRECTLY)
 */

export default function ScannerPage() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [result, setResult] = useState<ScannerViewModel | null>(null);
  const [synthesis, setSynthesis] = useState<WikiSynthesis | null>(null);
  const [identificationReport, setIdentificationReport] = useState<IdentificationReport | null>(null);
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
    // Clear previous results when starting new scan
    setResult(null);
    setSynthesis(null);
    setIdentificationReport(null);

    try {
      console.log("RUN SCAN CLICKED", file.name);

      const wiki = await runWikiEngine(file);
      const viewModel = wikiToViewModel(wiki);
      setResult(viewModel);

      // Generate context for identification report
      const context: ScanContext = {
        imageQuality: {
          focus: "moderate",
          noise: "moderate",
          lighting: "good",
        },
        detectedFeatures: {},
        uncertaintySignals: wiki.reasoning?.conflictingSignals && wiki.reasoning.conflictingSignals.length > 0
          ? { conflictingTraits: wiki.reasoning.conflictingSignals }
          : undefined,
      };

      // Generate strict IdentificationReport (primary output)
      const report = generateIdentificationReport(wiki, context);
      setIdentificationReport(report);
      console.log("Identification Report:", report);

      // Keep WikiSynthesis for backward compatibility
      const wikiSynthesis = synthesizeWikiInsights(wiki, context);
      setSynthesis(wikiSynthesis);
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <>
      <TopNav title="Scanner" showBack />
      
      <main className="min-h-screen bg-black text-white">
        <div className="mx-auto w-full max-w-3xl px-4 py-6 md:py-10">
          <div className="space-y-4 md:space-y-6">
            {/* A) Upload + Preview Card */}
            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-4 md:p-6 space-y-4">
              {/* FILE PICKER */}
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="block w-full text-sm text-white/70"
              />

              {/* IMAGE PREVIEW */}
              {previewUrl && (
                <div className="relative w-full overflow-hidden rounded-2xl border border-white/10 bg-black/30">
                  <img
                    src={previewUrl}
                    alt="Scan preview"
                    className="w-full h-auto max-h-[420px] object-contain mx-auto"
                  />
                </div>
              )}
            </div>

            {/* B) Big Scan Button Card */}
            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-4 md:p-6">
              <button
                onClick={runScan}
                disabled={isScanning}
                className="w-full rounded-xl px-5 py-4 md:py-4 font-semibold bg-white text-black hover:bg-white/90 active:scale-[0.99] transition disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ minHeight: '48px' }}
              >
                {isScanning ? "Scanning…" : "Run Scan"}
              </button>
              <p className="text-xs text-white/50 mt-3 text-center">
                Tip: Use a close, well-lit photo of the bud or top cola.
              </p>
            </div>

            {/* C) Results Card(s) */}
            <section className="space-y-4">
              {result && <ResultPanel result={result} synthesis={synthesis} />}
              {synthesis && <WikiPanel synthesis={synthesis} />}
            </section>
          </div>
        </div>
      </main>
    </>
  );
}
