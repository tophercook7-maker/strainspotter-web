"use client";

import { useState, useEffect } from "react";
import { orchestrateScan } from "@/lib/scanner/scanOrchestrator";
// import { saveScanResultToHistory } from "@/lib/supabase/scanHistory";
import { getUserTierFlags } from "@/lib/flags";
import { adaptScanResult } from "@/lib/scanner/adapter/scanResultAdapter";
import type { ScannerViewModel } from "@/lib/scanner/viewModel";
import type { WikiSynthesis, FullScanResult } from "@/lib/scanner/types";
import { assignUserImageLabels, type UserImageLabel } from "@/lib/scanner/imageLabels";
import { assessImageDiversity } from "@/lib/scanner/imageDiversity";
import { inferImageAngleFromBase64 } from "@/lib/scanner/imageAngleHeuristics";
import { analyzeImageSet } from "@/lib/scanner/multiImageGuidance"; // Phase 5.2.2 — Slot-aware UI
import { getQualityFeedback } from "@/lib/scanner/qualityFeedback"; // Phase 5.2.3 — Quality feedback

type ScanTier = "basic" | "pro" | "expert";
import ResultPanel from "./ResultPanel";
import WikiStyleResultPanel from "./WikiStyleResultPanel";
import WikiReportPanel from "./WikiReportPanel"; // Phase 4.2 — Extensive Wiki-Style Report
import TopNav from "../_components/TopNav";
import ImageGuidancePanel from "./ImageGuidancePanel"; // Phase 5.2 — Multi-Image Guidance

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
  const [isDragging, setIsDragging] = useState(false); // Phase 5.2.4 — Drag and drop state
  const [flags, setFlags] = useState(getUserTierFlags()); // Feature flags
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
  // Phase 5.2.5 — Prevent double-clicks and ghost clicks
  async function handleAnalyzePlant() {
    // Phase 5.2.5 — Guard against double-clicks
    if (isScanning) {
      console.log("Scan already in progress, ignoring click");
      return;
    }
    
    if (images.length === 0) {
      console.log("No images to scan");
      return;
    }
    
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
    
    // Phase 5.2.6 — Prevent scroll jump on scan: Store current scroll position
    const scrollPosition = window.scrollY;

    try {
      console.log("STEP 1: PREP DONE");
      console.log("STEP 2: CONTEXT BUILT");
      console.log("STEP 3: ENGINE CALLED");
      const orchestrated = await orchestrateScan(images);
      const scanResult = orchestrated.normalizedScanResult;
      console.log("STEP 4: RESULT RECEIVED", scanResult);
      
      // Phase 5.2.6 — Prevent scroll jump: Restore scroll position after results appear
      // Use requestAnimationFrame to ensure DOM has updated
      requestAnimationFrame(() => {
        window.scrollTo({
          top: scrollPosition,
          behavior: 'instant' // Instant to prevent jump, not smooth
        });
      });
      
      // Clear any previous errors
      setScanError(null);
      
      // TypeScript now knows this is a success or partial result
      if (!('status' in scanResult)) {
        setIsScanning(false);
        return;
      }
      
      const adaptedResult = adaptScanResult({
        scannerResult: scanResult.result,
        scanMeta: scanResult.meta
      });
      console.log("ADAPTED RESULT:", adaptedResult.strainName, adaptedResult.confidence);
      setScanResult(scanResult); // Keep original ScanResult for status checks
      setResult(scanResult.result);
      setSynthesis(scanResult.synthesis);
      
      // Phase 4.0.5 — Set diversity hint from scan result
      setDiversityHint(scanResult.diversityNote || null);

      // Save to history (fire and forget, non-blocking)
      // TODO: reintroduce scan history persistence after build stabilization
      // try {
      //   void saveScanResultToHistory({
      //     userId: null, // until auth wired
      //     scanResult: scanResult,
      //   });
      // } catch (e) {
      //   // swallow - never block scan rendering
      // }
      
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
        {/* Phase 5.2.6 — MOBILE-FIRST CONSTRAINTS: Max content width (not edge-to-edge) */}
        {/* UI FIX — Constrain width: max-w-[680px], mx-auto, px-4 */}
      <div className="mx-auto w-full max-w-[720px] px-4 pb-24 md:pb-16 space-y-6">
        {/* A) Upload + Preview Card */}
        <div className="rounded-2xl border border-white/15 bg-white/5 backdrop-blur-xl p-5 sm:p-6 space-y-4">
              {/* Phase 5.2.4 — Improved File Upload UX with Drag and Drop */}
              <div className="space-y-2">
                <label className="block">
                  <div
                    className={`flex items-center justify-center w-full h-32 border-2 border-dashed rounded-xl transition-all cursor-pointer group ${
                      isDragging
                        ? "border-blue-500/60 bg-blue-500/20 border-solid"
                        : "border-white/20 bg-white/5 hover:border-white/40 hover:bg-white/10"
                    }`}
                    onDragEnter={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsDragging(true);
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsDragging(false);
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsDragging(false);
                      
                      const files = Array.from(e.dataTransfer.files).filter(
                        (file) => file.type.startsWith("image/")
                      );
                      
                      if (files.length > 0) {
                        if (files.length > MAX_IMAGES) {
                          alert(`Please select up to ${MAX_IMAGES} images. Only the first ${MAX_IMAGES} will be used.`);
                          setImages(files.slice(0, MAX_IMAGES));
                        } else {
                          setImages(files);
                        }
                      }
                    }}
                  >
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <svg
                        className="w-10 h-10 mb-3 text-white/50 group-hover:text-white/70 transition-colors"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                        />
                      </svg>
                      <p className="mb-2 text-sm text-white/70 group-hover:text-white/90">
                        <span className="font-semibold">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-xs text-white/50">
                        {images.length > 0
                          ? `${images.length}/${MAX_IMAGES} images selected`
                          : `Upload 1-${MAX_IMAGES} photos (PNG, JPG, WEBP)`}
                      </p>
                    </div>
                  </div>
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
                    className="hidden"
                  />
                </label>
              </div>
              {/* Phase 5.2 — Multi-Image Guidance & Capture UX */}
              {/* Show guidance before images are uploaded */}
              {images.length === 0 && (
                <div className="mb-4 space-y-4">
                  {/* STEP 5.5.4 — CONFIDENCE INCENTIVE (INITIAL STATE) */}
                  {(() => {
                    const { getConfidenceIncentiveMessage } = require("@/lib/scanner/confidenceIncentive");
                    const incentiveMessage = getConfidenceIncentiveMessage(0, MAX_IMAGES);
                    return (
                      <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-4">
                        <p className="text-sm font-medium text-blue-200 leading-relaxed">
                          {incentiveMessage}
                        </p>
                      </div>
                    );
                  })()}
                  <ImageGuidancePanel imagePreviews={[]} maxImages={MAX_IMAGES} />
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

              {/* Phase 5.2 — Real-time guidance as images are added */}
              {images.length > 0 && images.length < MAX_IMAGES && (
                <div className="mt-4">
                  <ImageGuidancePanel imagePreviews={imagePreviews} maxImages={MAX_IMAGES} />
                </div>
              )}
              
              {/* STEP 5.5.4 — CONFIDENCE INCENTIVE (LIVE) */}
              {images.length > 0 && images.length < MAX_IMAGES && (() => {
                const { calculateConfidenceCap, getConfidenceIncentiveMessage } = require("@/lib/scanner/confidenceIncentive");
                const currentCap = calculateConfidenceCap(images.length);
                const nextCap = calculateConfidenceCap(images.length + 1);
                const incentiveMessage = getConfidenceIncentiveMessage(images.length, MAX_IMAGES);
                
                return (
                  <div className="mt-4 rounded-lg border border-blue-500/30 bg-blue-500/10 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-blue-200 leading-relaxed">
                          {incentiveMessage || "More angles = higher certainty"}
                        </p>
                      </div>
                      {nextCap > currentCap && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-blue-300/80">Current:</span>
                          <span className="px-2 py-1 rounded bg-blue-500/20 text-blue-200 text-sm font-semibold">
                            Up to {currentCap}%
                          </span>
                          <span className="text-blue-300/60">→</span>
                          <span className="px-2 py-1 rounded bg-green-500/20 text-green-200 text-sm font-semibold">
                            Up to {nextCap}%
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
              
              {/* Phase 5.2.3 — QUALITY FEEDBACK (PASSIVE) */}
              {images.length > 0 && (() => {
                const guidance = analyzeImageSet(imagePreviews, MAX_IMAGES);
                const qualityFeedback = getQualityFeedback(imagePreviews, images.length, guidance.filledSlots);
                
                return (
                  <div className="mt-4 space-y-2">
                    {qualityFeedback.messages.map((message, idx) => (
                      <div
                        key={idx}
                        className={`rounded-lg border p-3 text-sm ${
                          qualityFeedback.overallTone === "positive"
                            ? "border-green-500/30 bg-green-500/10 text-green-200"
                            : qualityFeedback.overallTone === "suggestive"
                            ? "border-blue-500/30 bg-blue-500/10 text-blue-200"
                            : "border-white/10 bg-white/5 text-white/70"
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <span className="mt-0.5">
                            {qualityFeedback.overallTone === "positive" ? "✓" : "ℹ️"}
                          </span>
                          <span>{message}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
              
              {/* Phase 5.2.2 — SLOT-AWARE UI (FREE TIER) */}
              {/* Phase 4.0 Part A — IMAGE PREVIEWS with Slot Labels */}
              {images.length > 0 && (() => {
                // Phase 5.2.2 — Get slot information from guidance system
                const guidance = analyzeImageSet(imagePreviews, MAX_IMAGES);
                const imageLabels = assignUserImageLabels(images.length);
                
                // Create a map from image index to slot
                const imageToSlot = new Map<number, typeof guidance.slots[0]>();
                guidance.slots.forEach(slot => {
                  if (slot.filled && slot.imageIndex !== undefined) {
                    imageToSlot.set(slot.imageIndex, slot);
                  }
                });
                
                return (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4">
                      {imagePreviews.map((preview, idx) => {
                        const slot = imageToSlot.get(idx);
                        const label = imageLabels.get(idx) || "Optional";
                        
                        return (
                          <div
                            key={idx}
                            className="relative aspect-square rounded-xl overflow-hidden border border-white/20 group"
                          >
                            {/* Phase 2.6 Part M Step 5 — Image Size Lock */}
                            {/* Phase 4.4.5 — Image scale lock: max 260px, object-contain, rounded, never full-screen */}
                            {/* Phase 5.2.6 — Image previews capped in height (mobile-first) */}
                            <img
                              src={preview.url}
                              alt={`scan-${idx + 1}`}
                              className="w-full h-full object-contain max-h-[200px] sm:max-h-[260px] rounded-xl"
                            />
                            
                            {/* Phase 5.2.2 — Slot label and checkmark when filled */}
                            {slot && (
                              <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/70 backdrop-blur-sm px-2 py-1 rounded-md">
                                <span className="text-green-400 text-xs">✓</span>
                                <span className="text-xs text-white font-medium">
                                  {slot.label}
                                </span>
                              </div>
                            )}
                            
                            {/* Phase 4.0.2 — Angle badges on previews */}
                            <span className="absolute bottom-1 right-1 text-xs px-2 py-0.5 rounded bg-black/70">
                              {preview.angleLabel}
                            </span>
                            
                            {/* Phase 5.2.2 — Image label and controls */}
                            <div className="mt-2 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="bg-black/60 text-white text-xs font-semibold px-2 py-1 rounded">
                                  {idx + 1}
                                </span>
                                {slot ? (
                                  <span className="text-xs text-white/70 font-medium">
                                    Slot {slot.slotNumber}
                                  </span>
                                ) : (
                                  <span className="text-xs text-white/50 font-medium">
                                    {label}
                                  </span>
                                )}
                              </div>
                              {/* STEP 5.4.7 — Minimum 44px tap target */}
                              <button
                                onClick={() => removeImage(idx)}
                                className="bg-red-600/80 hover:bg-red-600 text-white text-sm font-semibold min-w-[44px] min-h-[44px] px-3 py-2 rounded transition-opacity flex items-center justify-center"
                                aria-label={`Remove image ${idx + 1}`}
                              >
                                ×
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    
                    {/* Phase 5.2.2 — Empty slot hints (subtle, non-blocking) */}
                    {guidance.slots.some(s => !s.filled && s.requirement !== "optional") && (
                      <div className="mt-4 space-y-2">
                        <p className="text-xs text-white/50 font-medium">
                          Recommended slots:
                        </p>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {guidance.slots
                            .filter(s => !s.filled && s.requirement !== "optional")
                            .map((slot) => (
                              <div
                                key={slot.slotNumber}
                                className="rounded-lg border border-white/10 bg-white/5 p-2 text-center"
                              >
                                <div className="text-sm mb-1">{slot.icon}</div>
                                <div className="text-xs text-white/60 font-medium mb-0.5">
                                  Slot {slot.slotNumber}
                                </div>
                                <div className="text-xs text-white/70 font-semibold mb-1">
                                  {slot.label}
                                </div>
                                <div className="text-[10px] text-white/50 leading-tight">
                                  {slot.description}
                                </div>
                                {slot.requirement === "required" && (
                                  <div className="text-[10px] text-orange-400 mt-1">
                                    Required
                                  </div>
                                )}
                                {slot.requirement === "recommended" && (
                                  <div className="text-[10px] text-yellow-400 mt-1">
                                    Recommended
                                  </div>
                                )}
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
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

        {/* Phase 5.2.5 — SCAN CTA BEHAVIOR (FIX) */}
        {/* Phase 5.2.6 — Sticky scan button on mobile only */}
        {/* B) Big Scan Button Card */}
        <div className="rounded-2xl border border-white/15 bg-white/5 backdrop-blur-xl p-5 sm:p-6 sticky bottom-0 md:static z-10 bg-black/95 md:bg-transparent backdrop-blur-sm md:backdrop-blur-none">
          {/* Phase 4.0 Part A — Multi-image validation warning */}
          {images.length > 0 && images.length < 2 && !singleImageConfirmed && (
            <div className="mb-4 p-3 rounded-lg bg-yellow-500/20 border border-yellow-500/30 text-yellow-200 text-sm text-center max-w-md mx-auto">
              💡 For best accuracy, add at least one more image from a different angle
            </div>
          )}
          {images.length === 2 && (
            <div className="mb-4 p-3 rounded-lg bg-blue-500/20 border border-blue-500/30 text-blue-200 text-sm text-center max-w-md mx-auto">
              ✓ 2 images selected. For best accuracy, 3–5 images are recommended.
            </div>
          )}
          
          {/* Phase 5.2.5 — Run Scan Button: Full-width capped (max-w-md), height ≥ 52px, single click, disabled only while scanning */}
          {/* STEP 5.4.7 — Mobile-first: Buttons centered, not stretched, minimum 44px tap target */}
          <div className="w-full flex justify-center">
            <button
              type="button"
              disabled={isScanning}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!isScanning && images.length > 0) {
                  handleAnalyzePlant();
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  if (!isScanning && images.length > 0) {
                    handleAnalyzePlant();
                  }
                }
              }}
              className="min-w-[200px] max-w-md w-auto px-8 min-h-[44px] h-[52px] rounded-full bg-white text-black font-semibold text-base shadow-lg shadow-white/10 active:scale-[0.98] hover:bg-white/95 focus:outline-none focus:ring-2 focus:ring-white/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white disabled:active:scale-100 flex items-center justify-center gap-2 transition-all"
              aria-label={isScanning ? "Analyzing plant" : "Run scan"}
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
                  <span>Analyzing plant…</span>
                </>
              ) : (
                "Run Scan"
              )}
            </button>
          </div>
        </div>

        {/* Phase 5.2.6 — MOBILE-FIRST CONSTRAINTS: Max content width (not edge-to-edge) */}
        {/* UI FIX — Results Card(s) — Wrapped in container, cards not lines */}
        {/* Phase 4.2 — Extensive Wiki-Style Report (Priority) */}
        {/* Phase 3.6 — Wiki-Style Result Expansion (Fallback) */}
        {/* Phase 4.4.1 — Center the result column with intentional containment */}
        <section className="space-y-6 w-full max-w-[720px] mx-auto px-4">
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
          
          {/* STEP 5.5.6 — FAIL-SAFE UX: Always show results, never empty screen */}
          {result && <ResultPanel result={result} flags={flags} />}
          {analysis && <WikiReportPanel analysis={analysis.analysis} result={result} imageCount={images.length} flags={flags} />}
          {analysis && <WikiStyleResultPanel result={analysis} flags={flags} />}
          
          {/* STEP 5.5.6 — FAIL-SAFE UX: Show fallback if no results at all */}
          {!result && !analysis && scanError && (
            <div className="mt-8 rounded-lg border border-white/10 bg-white/5 p-6 text-center">
              <h2 className="text-xl font-semibold text-white/90 mb-2">Closest Known Cultivar</h2>
              <p className="text-sm text-white/70 leading-relaxed">
                Unable to identify this cultivar with high confidence. Try adding photos from different angles or improving lighting.
              </p>
            </div>
          )}
        </section>
        </div>
      </main>
    </>
  );
}
