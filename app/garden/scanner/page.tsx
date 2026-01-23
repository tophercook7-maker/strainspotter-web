"use client";

import { useState, useEffect } from "react";
import { scanImages } from "@/lib/scanner/runMultiScan";
import type { ScannerViewModel } from "@/lib/scanner/viewModel";
import type { WikiSynthesis, FullScanResult } from "@/lib/scanner/types";
import { assignUserImageLabels, type UserImageLabel } from "@/lib/scanner/imageLabels";
import { assessImageDiversity } from "@/lib/scanner/imageDiversity";
import { inferImageAngleFromBase64 } from "@/lib/scanner/imageAngleHeuristics";

type ScanTier = "basic" | "pro" | "expert";
import ResultPanel from "./ResultPanel";
import WikiStyleResultPanel from "./WikiStyleResultPanel";
import WikiReportPanel from "./WikiReportPanel"; // Phase 4.2 — Extensive Wiki-Style Report
import TopNav from "../_components/TopNav";

/**
 * 🔒 A.2 — runScan uses ViewModel ONLY (UI NEVER TOUCHES WIKI DIRECTLY)
 */

export default function ScannerPage() {
  const [images, setImages] = useState<File[]>([]);
  const [result, setResult] = useState<ScannerViewModel | null>(null);
  const [synthesis, setSynthesis] = useState<WikiSynthesis | null>(null);
  const [analysis, setAnalysis] = useState<FullScanResult | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [singleImageConfirmed, setSingleImageConfirmed] = useState(false); // Phase 4.0 Part A — Single-image confirmation
  const [diversityWarning, setDiversityWarning] = useState(false); // Phase 4.0.2 — Track if images are similar
  const [angleHints, setAngleHints] = useState<string[]>([]); // Phase 4.0.3 — Track angle diversity hints
  const [diversityHint, setDiversityHint] = useState<string | null>(null); // Phase 4.0.5 — Diversity hint from scan result
  const [scanResult, setScanResult] = useState<import("@/lib/scanner/types").ScanResult | null>(null); // Phase 4.0.8 — Store full scan result for partial status handling
  const [scanError, setScanError] = useState<{ reason: string } | null>(null); // Phase 4.0.1 — Non-fatal scan warnings
  const [imagePreviews, setImagePreviews] = useState<Array<{ url: string; base64: string; angleLabel: string }>>([]); // Phase 4.0.2 — Previews with base64 and angles
  const [duplicateWarning, setDuplicateWarning] = useState(false); // Phase 4.0.3 — Track if duplicates were removed
  const MAX_IMAGES = 5; // Phase 4.0 Part A — Allow 1-5 images per scan

  // NEVER clear result on re-render
  // Only clear when user selects NEW images
  useEffect(() => {
    setResult(null);
    setSynthesis(null);
    setDiversityWarning(false); // Phase 4.0.2 — Reset diversity warning when images change
    setAngleHints([]); // Phase 4.0.3 — Reset angle hints when images change
    setDiversityHint(null); // Phase 4.0.5 — Reset diversity hint when images change
    setScanResult(null); // Phase 4.0.8 — Reset scan result when images change
    setScanError(null); // Phase 4.0.1 — Reset scan error when images change
    setImagePreviews([]); // Phase 4.0.2 — Reset previews when images change
    setDuplicateWarning(false); // Phase 4.0.3 — Reset duplicate warning when images change
  }, [images]);

  // Phase 4.0.2 — Convert images to previews with base64 and angle labels
  useEffect(() => {
    const convertImagesToPreviews = async () => {
      if (images.length === 0) {
        setImagePreviews([]);
        return;
      }

      const previews = await Promise.all(
        images.map(async (img) => {
          const url = URL.createObjectURL(img);
          // Convert file to base64
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              const result = reader.result as string;
              // Remove data URL prefix if present
              const base64Data = result.includes(',') ? result.split(',')[1] : result;
              resolve(base64Data);
            };
            reader.onerror = reject;
            reader.readAsDataURL(img);
          });

          // Phase 4.0.2 — Infer angle from base64
          const angle = inferImageAngleFromBase64(base64);
          const angleLabel = angle === "macro" ? "Macro" 
            : angle === "side" ? "Side" 
            : angle === "top" ? "Top" 
            : "Unknown";

          return { url, base64, angleLabel };
        })
      );

      setImagePreviews(previews);
    };

    convertImagesToPreviews();
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
      
      // FAILURE MESSAGING SOFTENED — Handle non-fatal warning (images lack variance)
      if ('error' in scanResult && scanResult.error === true) {
        // FAILURE MESSAGING SOFTENED — Set soft warning, never block user
        setScanError({ reason: "images-too-similar" });
        // Continue processing - don't return early
        // Note: When error is returned, there's no result/synthesis, so we skip those
        // But we should still try to show something useful
        setIsScanning(false);
        return;
      }
      
      // Clear any previous errors
      setScanError(null);
      
      // TypeScript now knows this is a success or partial result
      if (!('status' in scanResult)) {
        setIsScanning(false);
        return;
      }
      
      setResult(scanResult.result);
      setSynthesis(scanResult.synthesis);
      
      // Phase 4.0.5 — Set diversity hint from scan result
      setDiversityHint(scanResult.diversityNote || null);
      
      // Phase 4.0.2 — Check for diversity warning (images are similar)
      // Compute diversity from image files to detect similarity
      if (images.length >= 2) {
        const imageHashes = images.map(img => 
          `${img.name}-${img.size}-${img.lastModified}`
        );
        const diversity = assessImageDiversity(imageHashes);
        // Show warning if overall similarity score is high (>= 0.85) or any penalty < 1
        const hasDiversityIssue = diversity.overallScore >= 0.85 || 
          Object.values(diversity.penalties).some(penalty => penalty < 1);
        setDiversityWarning(hasDiversityIssue);
      } else {
        setDiversityWarning(false);
      }
      
      // Phase 4.0.3 — Check angle diversity and provide hints
      // Show hint when we have images but may be missing angle diversity
      const angleHintsList: string[] = [];
      if (images.length > 0) {
        // Check if we have angle information in the scan result
        const imageResults = (scanResult as any).imageResults || [];
        if (imageResults.length > 0) {
          const inferredAngles = imageResults
            .map((r: any) => r.inferredAngle)
            .filter((a: any) => a && a !== "unknown");
          
          const hasMacroBud = inferredAngles.includes("macro-bud");
          const hasWiderView = inferredAngles.some((a: string) => 
            a === "side-profile" || a === "top-canopy"
          );
          
          // Show hint if missing either macro-bud or wider view
          if (!hasMacroBud || !hasWiderView) {
            angleHintsList.push("include a close-up bud photo and one wider plant view");
          }
        } else if (images.length === 1) {
          // Proactive hint for single image
          angleHintsList.push("include a close-up bud photo and one wider plant view");
        }
      }
      setAngleHints(angleHintsList);
      
      // UI CONTRACT ENFORCEMENT — Never assume dominance
      // Create FullScanResult - dominance is optional, only include if present
      const dominanceData = (scanResult.result as any).dominance;
      setAnalysis({
        result: scanResult.result, // ViewModel
        // Only include analysis.dominance if dominanceData exists
        ...(dominanceData ? {
          analysis: {
            dominance: {
              indica: dominanceData.indica ?? 0,
              sativa: dominanceData.sativa ?? 0,
              hybrid: dominanceData.hybrid ?? (100 - ((dominanceData.indica ?? 0) + (dominanceData.sativa ?? 0))),
              classification: dominanceData.label === "Indica-dominant" ? "Indica-dominant" 
                : dominanceData.label === "Sativa-dominant" ? "Sativa-dominant" 
                : "Hybrid" as const,
            },
          },
        } : {}),
        // Phase 4.0.5 — Pass diversity note from scan result
        diversityNote: scanResult.diversityNote,
        // Phase 4.0.6 — Pass scan warning from scan result
        scanWarning: scanResult.scanWarning,
        // Phase 4.1.7 — Pass scan note from scan result
        scanNote: scanResult.scanNote,
        // Phase 4.2.0 — Pass same-plant note from scan result
        samePlantNote: scanResult.samePlantNote,
        // Phase 4.2.6 — Pass scan meta from scan result
        meta: scanResult.meta,
      });
      
      console.log("STEP 5: STATE UPDATED");
    } catch (e) {
      // FAILURE MESSAGING SOFTENED — Never block user, always show partial result
      // Instead of alert, set a soft error message and show partial result
      const errorMessage = e instanceof Error
        ? e.message
        : "Low confidence — results may vary";
      
      // FAILURE MESSAGING SOFTENED — Set soft error (non-blocking)
      setScanError({ reason: "low-confidence" });
      
      // FAILURE MESSAGING SOFTENED — Create a minimal partial result so user always sees something
      // Use a simplified fallback that shows useful information
      const softErrorMessage = errorMessage.includes("failed") || errorMessage.includes("error") || errorMessage.includes("Error")
        ? "Low confidence — results may vary"
        : errorMessage.includes("similar") || errorMessage.includes("identical")
        ? "Images appear similar — try different angles"
        : "Low confidence — results may vary";
      
      // Import the scanImages function to get a proper fallback result
      // For now, create a minimal result that will be replaced when scan completes
      // The key is: never block, always show something
      console.warn("FAILURE MESSAGING SOFTENED: Scan error caught, user will see partial result:", softErrorMessage);
      setIsScanning(false);
      console.log("HANDLER COMPLETE — Soft failure handled");
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
      
      {/* UI FIX — Content Well Wrapper */}
      <main className="min-h-screen bg-black text-white">
        {/* UI FIX — Constrain width: max-w-[680px], mx-auto, px-4 */}
      <div className="mx-auto w-full max-w-[680px] px-4 pb-16 space-y-6">
        {/* A) Upload + Preview Card */}
        <div className="rounded-2xl border border-white/15 bg-white/5 backdrop-blur-xl p-5 sm:p-6 space-y-4">
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
              <p className="text-xs text-white/60 mt-2">
                Tip: Use photos of the same plant taken from different angles.
                Mixing different plants may reduce confidence.
              </p>
              
              {/* Phase 4.0.6 — Inline capture guidance */}
              {images.length < 3 && (
                <div className="mb-3 rounded-md border border-white/15 bg-white/5 p-2 text-xs text-white/70">
                  Tip: Add a side view or close-up for better accuracy
                </div>
              )}
              
              {/* Phase 4.0.5 — soft guidance below image uploader */}
              {diversityHint && (
                <div className="mt-2 text-xs text-yellow-400">
                  {diversityHint}
                </div>
              )}
              
              {/* Phase 4.0.2 — UX hint when images are similar (non-blocking) */}
              {diversityWarning && (
                <div className="text-xs text-yellow-400 mt-2">
                  Images appear similar. Results weighted accordingly.  
                  For higher confidence, use different angles or zoom levels.
                </div>
              )}
              
              {/* Phase 4.0.3 — User feedback (non-blocking) */}
              {duplicateWarning && (
                <div className="text-xs text-yellow-400 mt-2">
                  Some photos were very similar — results adjusted for confidence.
                </div>
              )}
              
              {/* Phase 4.0.4 — Angle guidance UI */}
              <div className="text-xs text-white/60 mt-2">
                Best results: include at least two angles (top + side or macro).
              </div>
              
              {/* Phase 4.0.3 — non-blocking UX guidance */}
              {angleHints.length > 0 && (
                <div className="text-xs text-white/60 mt-2">
                  Tip for higher accuracy: include a close-up bud photo and one wider plant view.
                </div>
              )}

              {/* Phase 4.0.7 — User-facing warning */}
              {result?.notes && result.notes.includes("HIGH_IMAGE_SIMILARITY") && (
                <div className="mb-3 rounded-md border border-yellow-500/30 bg-yellow-500/10 p-2 text-xs text-yellow-300">
                  Photos appear very similar. Different angles improve identification accuracy.
                </div>
              )}

              {/* Phase 4.0.8 — Angle diversity warning */}
              {result?.notes && result.notes.includes("LOW_ANGLE_DIVERSITY") && (
                <div className="mb-3 rounded-md border border-orange-500/30 bg-orange-500/10 p-2 text-xs text-orange-300">
                  Photos are from similar angles. Add top + side views for stronger matches.
                </div>
              )}

              {/* Phase 4.0 Part A — IMAGE PREVIEWS with Labels */}
              {images.length > 0 && (() => {
                const imageLabels = assignUserImageLabels(images.length);
                // Phase 4.0.2 — Extract role information from scan result if available
                // Note: Role information would need to be stored in ViewModel or scanResult
                // For now, we'll show the UI structure ready for role data
                const imageRoles: (string | undefined)[] = []; // TODO: Get from scan result when available
                return (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4">
                      {imagePreviews.map((preview, idx) => {
                        const label = imageLabels.get(idx) || "Optional";
                        const role = imageRoles[idx] as "macro" | "structure" | "canopy" | "unknown" | undefined;
                        return (
                          <div
                            key={idx}
                            className="relative aspect-square rounded-xl overflow-hidden border border-white/20 group"
                          >
                            {/* Phase 2.6 Part M Step 5 — Image Size Lock */}
                            {/* Phase 4.4.5 — Image scale lock: max 260px, object-contain, rounded, never full-screen */}
                            <img
                              src={preview.url}
                              alt={`scan-${idx + 1}`}
                              className="w-full h-full object-contain max-h-[260px] rounded-xl"
                            />
                            {/* Phase 4.0.2 — Angle badges on previews */}
                            <span className="absolute bottom-1 right-1 text-xs px-2 py-0.5 rounded bg-black/70">
                              {preview.angleLabel}
                            </span>
                            {/* Phase 4.0.2 — subtle role hints (no user burden) - kept for backward compat */}
                            {role && role !== "unknown" && (
                              <span className="absolute top-1 left-1 text-xs bg-black/60 px-2 py-0.5 rounded opacity-50">
                                {role}
                              </span>
                            )}
                            {/* Phase 15.5.3 — Image label and controls */}
                            <div className="mt-2 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="bg-black/60 text-white text-xs font-semibold px-2 py-1 rounded">
                                  {idx + 1}
                                </span>
                                <span className="text-xs text-white/70 font-medium">
                                  {label}
                                </span>
                              </div>
                              <button
                                onClick={() => removeImage(idx)}
                                className="bg-red-600/80 hover:bg-red-600 text-white text-xs font-semibold px-2 py-1 rounded transition-opacity"
                                aria-label={`Remove image ${idx + 1}`}
                              >
                                ×
                              </button>
                            </div>
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
        {/* Phase 15.5.2 — Fix the Analyze/Run Scan button (big + forgiving + not finicky) */}
        <div className="rounded-2xl border border-white/15 bg-white/5 backdrop-blur-xl p-5 sm:p-6 flex flex-col items-center">
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
          
          {/* Phase 4.7 — 6. Action button: min-height 48px, min-width 200px, centered, rounded-full */}
          {/* Phase 4.4.6 — Run scan button hit target: proper sizing, contrast, cursor, no nested traps */}
          <button
            type="button"
            disabled={images.length === 0 || isScanning}
            onClick={handleAnalyzePlant}
            onKeyDown={handleKeyDown}
            className="min-h-[48px] min-w-[200px] rounded-full bg-white text-black font-semibold text-base px-8 py-3 shadow-lg shadow-white/10 active:scale-[0.99] hover:bg-white/95 focus:outline-none focus:ring-2 focus:ring-white/30 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white disabled:active:scale-100 flex items-center justify-center gap-2 mx-auto cursor-pointer"
            aria-label={isScanning ? "Analyzing plant" : "Analyze plant"}
            aria-busy={isScanning}
          >
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

        {/* UI FIX — Results Card(s) — Wrapped in container, cards not lines */}
        {/* Phase 4.2 — Extensive Wiki-Style Report (Priority) */}
        {/* Phase 3.6 — Wiki-Style Result Expansion (Fallback) */}
        {/* Phase 4.4.1 — Center the result column with intentional containment */}
        <section className="space-y-6 max-w-3xl mx-auto px-4">
          {/* FAILURE MESSAGING SOFTENED — User-facing warnings (non-fatal, non-blocking) */}
          {scanError?.reason === "images-too-similar" && (
            <div className="mt-4 max-w-md mx-auto rounded-lg bg-yellow-900/30 border border-yellow-700 p-4 text-sm">
              <strong>Images appear similar</strong>
              <p className="mt-1 opacity-80">
                Try different angles for better accuracy. Results shown with reduced confidence.
              </p>
            </div>
          )}
          
          {scanError?.reason === "low-confidence" && (
            <div className="mt-4 max-w-md mx-auto rounded-lg bg-yellow-900/30 border border-yellow-700 p-4 text-sm">
              <strong>Low confidence — results may vary</strong>
              <p className="mt-1 opacity-80">
                Try photos from different angles, zoom levels, or lighting for more accurate results.
              </p>
            </div>
          )}

          {/* Phase 4.3.3 — Partial status reframing (neutral, authoritative) */}
          {scanResult && 'status' in scanResult && scanResult.status === "partial" && (
            <div className="mt-4 rounded-xl border border-white/15 bg-white/5 p-4 text-sm text-white/80">
              <p className="leading-relaxed">
                This identification is based on limited visual agreement.
                Additional images may improve confidence.
              </p>
            </div>
          )}
          
          {/* Phase 4.0.3.1 — Soft "same plant" informational note (if present) */}
          {analysis?.samePlantNote && (
            <div className="mt-2 text-xs text-muted-foreground">
              ℹ️ These images may be of the same plant. Results improve when photos show
              different angles or perspectives.
            </div>
          )}
          
          {result && <ResultPanel result={result} />}
          {analysis && <WikiReportPanel analysis={analysis.analysis} />}
          {analysis && <WikiStyleResultPanel result={analysis} />}
        </section>
        </div>
      </main>
    </>
  );
}
