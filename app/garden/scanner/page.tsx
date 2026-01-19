"use client";

import { useState, useEffect } from "react";
import { scanImages } from "@/lib/scanner/runMultiScan";
import type { ScannerViewModel } from "@/lib/scanner/viewModel";
import type { WikiSynthesis } from "@/lib/scanner/types";
import { assignUserImageLabels, type UserImageLabel } from "@/lib/scanner/imageLabels";

type ScanTier = "basic" | "pro" | "expert";
import ResultPanel from "./ResultPanel";
import WikiStyleResultPanel from "./WikiStyleResultPanel";
import TopNav from "../_components/TopNav";

/**
 * 🔒 A.2 — runScan uses ViewModel ONLY (UI NEVER TOUCHES WIKI DIRECTLY)
 */

export default function ScannerPage() {
  const [images, setImages] = useState<File[]>([]);
  const [result, setResult] = useState<ScannerViewModel | null>(null);
  const [synthesis, setSynthesis] = useState<WikiSynthesis | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [singleImageConfirmed, setSingleImageConfirmed] = useState(false); // Phase 4.0 Part A — Single-image confirmation
  const MAX_IMAGES = 5; // Phase 4.0 Part A — Allow 1-5 images per scan

  // NEVER clear result on re-render
  // Only clear when user selects NEW images
  useEffect(() => {
    setResult(null);
    setSynthesis(null);
  }, [images]);

  // Phase 4.0 Part A — Multi-image validation
  function validateImages(): { valid: boolean; warning?: string; requiresConfirmation?: boolean } {
    if (!images || images.length === 0) {
      return { valid: false, warning: "Please select at least 1 image to analyze." };
    }
    
    // Phase 4.0 Part A — Rule: Scan runs only after 2 images OR user confirms single-image scan
    if (images.length === 1 && !singleImageConfirmed) {
      return { 
        valid: false, 
        requiresConfirmation: true,
        warning: "For best accuracy, we recommend 2+ images from different angles. Single-image scans have limited accuracy." 
      };
    }
    
    if (images.length === 1) {
      return { 
        valid: true, 
        warning: "Single-image analysis. Accuracy is limited compared to multi-image scans." 
      };
    }
    
    if (images.length === 2) {
      return { 
        valid: true, 
        warning: "Using 2 images. For best accuracy, we recommend 3–5 images from different angles." 
      };
    }
    
    if (images.length < 5) {
      return { 
        valid: true, 
        warning: `Using ${images.length} images. Good coverage!` 
      };
    }
    
    return { valid: true };
  }

  // Phase 4.0 Part A — Handle single-image confirmation
  function handleConfirmSingleImage() {
    setSingleImageConfirmed(true);
  }
  
  // Phase 2.4 Part J Step 4 — Guaranteed event fire
  async function handleAnalyzePlant() {
    // Step 4.1 — Log immediately
    console.log("ANALYZE CLICKED");
    
    // Step 4.2 — Validate images
    const validation = validateImages();
    if (!validation.valid) {
      if (validation.requiresConfirmation) {
        const confirmed = window.confirm(
          `${validation.warning}\n\nWould you like to proceed with single-image analysis?`
        );
        if (confirmed) {
          setSingleImageConfirmed(true);
          // Continue to scan
        } else {
          return;
        }
      } else {
        alert(validation.warning);
        return;
      }
    }

    // Step 4.3 — Warn if <3 images but proceed
    if (validation.warning) {
      console.warn("IMAGE COUNT WARNING:", validation.warning);
      // Don't block, just warn
    }

    console.log("HANDLER START");
    console.log("IMAGES:", images);
    console.log("IMAGE COUNT:", images.length);
    console.log("ANALYZING", images.length, "IMAGES");

    setIsScanning(true);

    try {
      console.log("STEP 1: PREP DONE");
      console.log("STEP 2: CONTEXT BUILT");
      console.log("STEP 3: ENGINE CALLED");
      const scanResult = await scanImages(images);
      console.log("STEP 4: RESULT RECEIVED", scanResult);
      
      setResult(scanResult.result);
      setSynthesis(scanResult.synthesis);
      console.log("STEP 5: STATE UPDATED");
    } catch (error) {
      console.error("ERROR:", error);
      alert("Analysis failed. Please try again with different images.");
    } finally {
      setIsScanning(false);
      console.log("HANDLER COMPLETE");
    }
  }

  // Phase 2.4 Part J Step 5 — Fail-safe trigger (keyboard support)
  function handleKeyDown(e: React.KeyboardEvent<HTMLButtonElement>) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (images.length > 0 && !isScanning) {
        handleAnalyzePlant();
      }
    }
  }

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  return (
    <>
      <TopNav title="Scanner" showBack />
      
      {/* Phase 2.6 Part M Step 1 — Container Lock */}
      <main className="max-w-xl md:max-w-2xl mx-auto px-4 space-y-6">
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
                Add 1-3 photos — different angles help accuracy
              </p>

              {/* Phase 4.0 Part A — IMAGE PREVIEWS with Labels */}
              {images.length > 0 && (() => {
                const imageLabels = assignUserImageLabels(images.length);
                return (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4">
                      {images.map((img, idx) => {
                        const url = URL.createObjectURL(img);
                        const label = imageLabels.get(idx) || "Optional";
                        return (
                          <div
                            key={idx}
                            className="relative aspect-square rounded-xl overflow-hidden border border-white/20 group"
                          >
                            {/* Phase 2.6 Part M Step 5 — Image Size Lock */}
                            <img
                              src={url}
                              alt={`scan-${idx + 1}`}
                              className="w-full h-full object-contain max-h-64 rounded-xl"
                            />
                            {/* Phase 4.0 Part A — Image Label Overlay */}
                            <div className="absolute bottom-0 left-0 right-0 bg-black/70 backdrop-blur-sm rounded-b-xl px-2 py-1.5">
                              <p className="text-xs text-white font-medium text-center">
                                {label}
                              </p>
                            </div>
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
                        );
                      })}
                    </div>
                    {/* Phase 4.0 Part A — Single Image Warning */}
                    {images.length === 1 && !singleImageConfirmed && (
                      <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3">
                        <p className="text-sm text-yellow-200 leading-relaxed">
                          <strong>Recommendation:</strong> Add at least one more image from a different angle for better accuracy. Single-image scans have limited confidence.
                        </p>
                      </div>
                    )}
                  </div>
                );
              })()}
        </div>

        {/* B) Big Scan Button Card */}
        {/* Phase 2.4 Part J — Analyze Plant Button Fix */}
        <div className="relative z-10 rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-4 md:p-6 flex flex-col items-center">
          {/* Phase 4.0 Part A — Multi-image validation warning */}
          {images.length > 0 && images.length < 2 && !singleImageConfirmed && (
            <div className="mb-4 p-3 rounded-lg bg-yellow-500/20 border border-yellow-500/30 text-yellow-200 text-sm text-center max-w-md">
              💡 For best accuracy, add at least one more image from a different angle
            </div>
          )}
          {images.length === 2 && (
            <div className="mb-4 p-3 rounded-lg bg-blue-500/20 border border-blue-500/30 text-blue-200 text-sm text-center max-w-md">
              ✓ 2 images selected. For best accuracy, 3–5 images are recommended.
            </div>
          )}
          
          {/* Phase 2.6 Part M Step 4 — Run Scan Button Fix */}
          <button
            type="button"
            disabled={images.length === 0 || isScanning}
            onClick={handleAnalyzePlant}
            onKeyDown={handleKeyDown}
            className="relative z-50 
                       flex items-center justify-center gap-2
                       w-full
                       px-6 py-4
                       min-h-[56px]
                       rounded-xl
                       bg-white text-black font-semibold text-base
                       pointer-events-auto
                       transition-all duration-200
                       hover:bg-white/90 active:bg-white/80 active:scale-[0.98]
                       disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white disabled:active:scale-100
                       focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-transparent
                       cursor-pointer"
            aria-label={isScanning ? "Analyzing plant" : "Analyze plant"}
            aria-busy={isScanning}
          >
            {/* Phase 2.4 Part J Step 3 — Disable state feedback with spinner */}
            {isScanning ? (
              <>
                <svg
                  className="animate-spin h-5 w-5 text-black"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <span>Analyzing…</span>
              </>
            ) : (
              "Analyze Plant"
            )}
          </button>
        </div>

        {/* C) Results Card(s) */}
        {/* Phase 3.6 — Wiki-Style Result Expansion */}
        <section className="space-y-6">
          {result && <WikiStyleResultPanel result={result} imageCount={images.length} />}
        </section>
      </main>
    </>
  );
}
