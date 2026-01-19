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
  const MAX_IMAGES = 3;

  // NEVER clear result on re-render
  // Only clear when user selects NEW images
  useEffect(() => {
    setResult(null);
    setSynthesis(null);
  }, [images]);

  async function runScan() {
    if (images.length === 0) return;

    setIsScanning(true);

    try {
      const scanResult = await scanImages(images);
      setResult(scanResult.result);
      setSynthesis(scanResult.synthesis);
    } finally {
      setIsScanning(false);
    }
  }

  return (
    <>
      <TopNav title="Scanner" showBack />
      
      <main className="max-w-5xl mx-auto px-6">
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
                disabled={images.length === 0 || isScanning}
                onClick={runScan}
                className="mx-auto px-8 py-3 rounded-xl bg-green-600 text-white font-semibold
                           disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isScanning ? "Scanning…" : "Run Scan"}
              </button>
              <p className="text-xs text-white/50 mt-3 text-center">
                Tip: Use a close, well-lit photo of the bud or top cola.
              </p>
            </div>

            {/* C) Results Card(s) */}
            <section className="space-y-4">
              {synthesis?.identity?.closestCultivarName && (
                <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-4 md:p-6">
                  <h1 className="text-3xl font-bold mb-2">
                    Closest Known Cultivar
                  </h1>
                  <p className="text-xl text-green-400 font-semibold">
                    {synthesis.identity.closestCultivarName}
                  </p>
                  <p className="text-sm text-white/60">
                    Visual alignment based on {images.length} image{images.length > 1 ? "s" : ""}
                  </p>
                </div>
              )}
              {result && <ResultPanel result={result} />}
            </section>
          </div>
        </div>
      </main>
    </>
  );
}
