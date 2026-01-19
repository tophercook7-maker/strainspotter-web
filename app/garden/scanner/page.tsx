"use client";

import { useState, useEffect } from "react";
import { scanImages } from "@/lib/scanner/runMultiScan";
import type { ScannerViewModel } from "@/lib/scanner/viewModel";
import type { WikiSynthesis } from "@/lib/scanner/types";

type ScanTier = "basic" | "pro" | "expert";
import ResultPanel from "./ResultPanel";
import TopNav from "../_components/TopNav";

/**
 * 🔒 A.2 — runScan uses ViewModel ONLY (UI NEVER TOUCHES WIKI DIRECTLY)
 */

export default function ScannerPage() {
  const [images, setImages] = useState<File[]>([]);
  const [result, setResult] = useState<ScannerViewModel | null>(null);
  const [synthesis, setSynthesis] = useState<WikiSynthesis | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const MAX_IMAGES = 5;

  // NEVER clear result on re-render
  // Only clear when user selects NEW images
  useEffect(() => {
    setResult(null);
    setSynthesis(null);
  }, [images]);

  async function handleAnalyzePlant() {
    console.log("HANDLER START");
    console.log("IMAGES:", images);
    console.log("IMAGE COUNT:", images.length);
    console.log("IMAGES USED:", images.length);

    if (!images || images.length === 0) {
      throw new Error("No images provided");
    }

    console.log("ANALYZING", images.length, "IMAGES");

    console.log("STEP 1: PREP DONE");
    setIsScanning(true);

    try {
      console.log("STEP 2: CONTEXT BUILT");
      console.log("STEP 3: ENGINE CALLED");
      const scanResult = await scanImages(images);
      console.log("STEP 4: RESULT RECEIVED", scanResult);
      
      setResult(scanResult.result);
      setSynthesis(scanResult.synthesis);
      console.log("STEP 5: STATE UPDATED");
      
      // Force state update test
      console.log("RESULT FORCED");
    } catch (error) {
      console.error("ERROR:", error);
    } finally {
      setIsScanning(false);
      console.log("HANDLER COMPLETE");
    }
  }

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  return (
    <>
      <TopNav title="Scanner" showBack />
      
      <main className="max-w-3xl mx-auto px-4 space-y-6">
        {/* A) Upload + Preview Card */}
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-4 md:p-6 space-y-4">
              {/* FILE PICKER */}
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => {
                  if (!e.target.files) return;
                  const selected = Array.from(e.target.files);
                  if (selected.length > MAX_IMAGES) {
                    alert(`Please select up to ${MAX_IMAGES} images. Only the first ${MAX_IMAGES} will be used.`);
                    setImages(selected.slice(0, MAX_IMAGES));
                  } else {
                    setImages(selected);
                  }
                }}
                className="block w-full text-sm text-white/70"
              />
              <p className="text-xs text-white/50">
                Add up to 5 photos — different angles help accuracy
              </p>

              {/* IMAGE PREVIEWS - Thumbnail Grid */}
              {images.length > 0 && (
                <div className="grid grid-cols-3 gap-3 mt-4">
                  {images.map((img, idx) => (
                    <div
                      key={idx}
                      className="relative aspect-square rounded-xl overflow-hidden border border-white/20 group"
                    >
                      <img
                        src={URL.createObjectURL(img)}
                        alt={`scan-${idx + 1}`}
                        className="w-full h-full object-cover max-h-[360px]"
                      />
                      <div className="absolute top-2 left-2 bg-black/60 text-white text-xs font-semibold px-2 py-1 rounded">
                        {idx + 1}
                      </div>
                      <button
                        onClick={() => removeImage(idx)}
                        className="absolute top-2 right-2 bg-red-600/80 hover:bg-red-600 text-white text-xs font-semibold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
        </div>

        {/* B) Big Scan Button Card */}
        <div className="relative z-10 rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-4 md:p-6 flex flex-col items-center">
              <button
                disabled={images.length === 0 || isScanning}
                onClick={handleAnalyzePlant}
                className="relative z-50 flex items-center justify-center
                           px-8 py-4
                           min-h-[56px] min-w-[200px]
                           rounded-full
                           bg-white text-black font-semibold
                           pointer-events-auto
                           disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isScanning ? "Scanning…" : "Analyze Plant"}
              </button>
        </div>

        {/* C) Results Card(s) */}
        <section className="space-y-6">
          {result && <ResultPanel result={result} imageCount={images.length} />}
        </section>
      </main>
    </>
  );
}
