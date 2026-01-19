"use client";

import { useState } from "react";
import { runWikiEngine } from "@/lib/scanner/wikiEngine";
import { wikiToViewModel } from "@/lib/scanner/wikiAdapter";
import { matchCultivars } from "@/lib/scanner/cultivarMatcher";
import type { ScannerViewModel } from "@/lib/scanner/viewModel";
import type { ScanContext } from "@/lib/scanner/types";

type ScanTier = "basic" | "pro" | "expert";
import ResultPanel from "./ResultPanel";
import TopNav from "../_components/TopNav";

/**
 * 🔒 A.2 — runScan uses ViewModel ONLY (UI NEVER TOUCHES WIKI DIRECTLY)
 */

export default function ScannerPage() {
  const [images, setImages] = useState<File[]>([]);
  const [result, setResult] = useState<ScannerViewModel | null>(null);
  const [identificationResult, setIdentificationResult] = useState<any>(null);
  const [isScanning, setIsScanning] = useState(false);
  const MAX_IMAGES = 3;


  // TIER 1 (FREE / NORMAL):
  // - General identification
  // - Core effects, aroma, genetics
  // - Educational summary only
  const runScan = async () => {
    if (images.length === 0) {
      alert("Please choose at least one image first.");
      return;
    }

    setIsScanning(true);
    // Clear previous results when starting new scan
    setResult(null);
    setIdentificationResult(null);

    try {
      console.log("RUN SCAN CLICKED", images.map(img => img.name).join(", "));

      // Use first image for now (can be extended to process multiple)
      const wiki = await runWikiEngine(images[0]);
      const viewModel = wikiToViewModel(wiki);
      setResult(viewModel);

      // Generate context for cultivar matching
      const context: ScanContext = {
        imageQuality: {
          focus: "moderate",
          noise: "moderate",
          lighting: "good",
        },
        detectedFeatures: {
          leafShape: wiki.morphology.visualTraits?.find(t => {
            const lower = t.toLowerCase();
            return lower.includes("leaf") || lower.includes("broad") || lower.includes("narrow");
          }) || undefined,
          trichomeDensity: wiki.morphology.trichomes,
          pistilColor: wiki.morphology.coloration.includes("pistil") 
            ? wiki.morphology.coloration 
            : undefined,
        },
        uncertaintySignals: wiki.reasoning?.conflictingSignals && wiki.reasoning.conflictingSignals.length > 0
          ? { conflictingTraits: wiki.reasoning.conflictingSignals }
          : undefined,
      };

      // REPLACE "Closest Known Cultivar" logic with matchCultivars()
      const identificationReport = matchCultivars(wiki, context);
      setIdentificationResult(identificationReport);
      
      // Log full result to console
      console.log("IDENTIFICATION REPORT", identificationReport);
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
                multiple
                onChange={(e) => {
                  if (!e.target.files) return;
                  const selected = Array.from(e.target.files).slice(0, MAX_IMAGES);
                  setImages(selected);
                }}
                className="block w-full text-sm text-white/70"
              />

              {/* IMAGE PREVIEWS */}
              {images.length > 0 && (
                <div className="flex justify-center gap-4 my-6">
                  {images.map((img, idx) => (
                    <div
                      key={idx}
                      className="w-32 h-32 rounded-xl overflow-hidden border border-white/20"
                    >
                      <img
                        src={URL.createObjectURL(img)}
                        alt={`scan-${idx}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* B) Big Scan Button Card */}
            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-4 md:p-6">
              <button
                onClick={runScan}
                disabled={images.length === 0 || isScanning}
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
              {result && <ResultPanel result={result} />}
            </section>
          </div>
        </div>
      </main>
    </>
  );
}
