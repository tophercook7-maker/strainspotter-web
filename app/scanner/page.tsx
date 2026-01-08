"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthProvider";
import { checkScanGuard } from "@/lib/scanGuard";
import NotEnoughCreditsModal from "@/components/NotEnoughCreditsModal";
import ConfidenceDisplay from "@/components/ConfidenceDisplay";
import ConfidenceSummaryCard from "@/components/ConfidenceSummaryCard";
import { adaptScannerResponse } from "@/lib/confidence/adapter";
import { useSelectedGrow } from "@/components/garden/SelectedGrowProvider";
import ScanConfirmation from "@/components/scan/ScanConfirmation";
import { allowAI, enforceCalmTone } from "@/lib/ai/guard";

export default function ScannerPage() {
  const router = useRouter();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { selectedGrow } = useSelectedGrow();
  
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confidenceResult, setConfidenceResult] = useState<{
    primary?: {
      name: string;
      slug: string;
      confidence: any;
    };
    alternatives: any[];
    noConfidentMatch: boolean;
  } | null>(null);
  const [showCreditsModal, setShowCreditsModal] = useState(false);
  const [insight, setInsight] = useState<{ summary?: string; relation?: string; confidence?: string } | null>(null);
  const [scannedRecently, setScannedRecently] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setError(null);
    setConfidenceResult(null);
    setInsight(null);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(selectedFile);
  };

  const handleScan = async () => {
    if (!file) {
      setError("Please select an image first");
      return;
    }

    if (!user) {
      setError("Please sign in to scan");
      router.push("/auth/login");
      return;
    }

    setLoading(true);
    setError(null);
    setConfidenceResult(null);

    try {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => controller.abort(), 12000);

      // Check scan credits before proceeding
      const guard = await checkScanGuard(user.id, 'local');
      if (!guard.allowed) {
        setShowCreditsModal(true);
        setLoading(false);
        return;
      }

      // Create FormData
      const formData = new FormData();
      formData.append("image", file);

      // Call visual-match API
      const response = await fetch("/api/visual-match/v3", {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errorData.error || `Request failed with status ${response.status}`);
      }

      const data = await response.json();

      // Adapt API response to confidence format
      // Note: v3 API returns { match: { strain, score, breakdown }, alternatives: [...] }
      // We need to fetch strain names from database
      if (data.match) {
        // Fetch strain name from database if we only have slug
        let matchName = data.match.strain;
        if (data.match.strain && !data.match.name) {
          try {
            const strainRes = await fetch(`/api/strain/${data.match.strain}`);
            if (strainRes.ok) {
              const strainData = await strainRes.json();
              matchName = strainData.name || data.match.strain;
            }
          } catch (err) {
            console.warn('[SCANNER] Failed to fetch strain name:', err);
          }
        }

        const adapted = adaptScannerResponse({
          match: {
            strain: data.match.strain,
            name: matchName,
            score: data.match.score,
            breakdown: data.match.breakdown,
          },
          alternatives: data.alternatives?.map((alt: any) => ({
            strain: alt.strain,
            score: alt.score,
            breakdown: alt.breakdown,
          })),
        });

        setConfidenceResult(adapted);
      } else {
        throw new Error("No match found");
      }
    } catch (err: any) {
      const message = err?.name === "AbortError" ? "timeout" : err?.message;
      setError(message || "Failed to scan image");
    } finally {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      abortRef.current = null;
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchInsight = async () => {
      if (!selectedGrow || !confidenceResult) return;
      const conf = Number(confidenceResult.primary?.confidence ?? 0);
      if (!allowAI({ kind: "post-scan-summary", confidence: conf })) return;
      try {
        const res = await fetch(`/api/grow-doctor/insight?growId=${selectedGrow.id}&tier=free`);
        if (!res.ok) return;
        const data = await res.json();
        if (data?.diagnosis) {
          setInsight({
            summary: data.diagnosis.summary ? enforceCalmTone(data.diagnosis.summary) : undefined,
            relation: data.diagnosis.relation,
            confidence: data.diagnosis.confidence,
          });
        }
      } catch (err) {
        console.warn("[scanner] insight fetch failed", err);
      }
    };
    fetchInsight();
  }, [selectedGrow, confidenceResult]);

  useEffect(() => {
    const key = selectedGrow ? `scan:last:${selectedGrow.id}` : null;
    if (!key) return;
    const now = Date.now();
    const last = localStorage.getItem(key);
    if (last) {
      const deltaHours = (now - Number(last)) / (1000 * 60 * 60);
      setScannedRecently(deltaHours < 12);
    } else {
      setScannedRecently(false);
    }
    return () => {};
  }, [selectedGrow]);

  const qualityHint = useMemo(() => {
    const score = confidenceResult?.primary?.confidence;
    if (score == null) return null;
    if (score < 40) return "Image looks low-confidence; try steadier lighting and focus.";
    if (score < 65) return "Pretty good, but brighter light or less blur could help.";
    return "Good capture. This documents your plant for your history.";
  }, [confidenceResult]);

  const handleSaveLogbook = async () => {
    if (!selectedGrow || !confidenceResult?.primary) return;
    try {
      const res = await fetch("/api/garden/logbook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          garden_id: selectedGrow.id,
          entry_type: "scan",
          text: enforceCalmTone(`Scan noted: ${confidenceResult.primary.name} (score ${Math.round(confidenceResult.primary.confidence)}%).`),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save");
      }
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to save to logbook");
    }
  };

  return (
    <div className="relative min-h-screen bg-[url('/backgrounds/garden-field.jpg')] bg-cover bg-center text-white">
      <div className="absolute inset-0 bg-black/30" />
      <div className="relative max-w-4xl mx-auto px-6 py-12 space-y-8">
        <div className="flex flex-col items-center text-center gap-3">
          <div className="w-24 h-24 rounded-full overflow-hidden flex items-center justify-center bg-transparent">
            <img
              src="/brand/core/hero.png"
              alt="StrainSpotter Hero"
              className="w-full h-full object-contain"
            />
          </div>
          <h1 className="text-3xl font-semibold text-white">Document plant</h1>
          <p className="text-white/70 text-sm">Add visual context to your grow’s history.</p>
        </div>

        {/* File Input */}
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full px-6 py-3.5 bg-gray-900 border border-gray-700 text-white font-medium rounded-lg hover:bg-gray-800 hover:border-gray-600 transition-colors"
          >
            {file ? "Select Different Image" : "Select Image"}
          </button>
        </div>

        {/* Preview */}
        {previewUrl && (
          <div className="relative w-full aspect-square max-w-md mx-auto">
            <img
              src={previewUrl}
              alt="Preview"
              className="w-full h-full object-contain rounded-lg border border-neutral-700"
            />
          </div>
        )}

        {/* Scan Button */}
        {file && !loading && (
          <div className="space-y-1">
            <button
              onClick={handleScan}
              className="w-full px-6 py-3.5 bg-green-500 text-black font-medium rounded-lg hover:bg-green-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Document plant
            </button>
            <p className="text-xs text-white/60 text-center">
              Best used to document a change, stage transition, or notable moment.
            </p>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <p className="text-gray-300 text-sm">Documenting your plant...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-2">
            <p className="text-sm font-semibold text-white">We couldn’t finish that scan</p>
            <p className="text-sm text-white/70">Your connection may have dropped. Nothing is lost.</p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setError(null);
                  setLoading(false);
                }}
                className="px-3 py-2 rounded-md bg-emerald-500 text-black text-sm font-semibold hover:bg-emerald-400"
              >
                Try again
              </button>
              <Link
                href="/garden"
                className="px-3 py-2 rounded-md bg-white/10 text-white text-sm border border-white/15 hover:bg-white/15"
              >
                Back to Garden
              </Link>
            </div>
          </div>
        )}

        {/* Confidence Results */}
      {confidenceResult && (
        <ConfidenceDisplay
          primary={confidenceResult.primary!}
          alternatives={confidenceResult.alternatives}
          noConfidentMatch={confidenceResult.noConfidentMatch}
          showExplanation={true}
          scanId={null}
        />
      )}

        {confidenceResult && (
          <div className="bg-black/40 border border-white/10 rounded-lg p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-white">Capture review</p>
                {qualityHint && <p className="text-sm text-white/70">{qualityHint}</p>}
              </div>
            </div>
            {insight && (
              <div className="bg-white/5 border border-white/10 rounded-md p-3 space-y-1">
                <p className="text-xs uppercase tracking-wide text-emerald-300/80">Grow Doctor Insight</p>
                <p className="text-sm text-white/80">{insight.summary || "Recent cultivation patterns reviewed."}</p>
                {insight.relation && (
                  <p className="text-xs text-white/60">Relation: {insight.relation}</p>
                )}
                {insight.confidence && (
                  <p className="text-xs text-white/60">Confidence: {insight.confidence}</p>
                )}
              </div>
            )}
            {!selectedGrow && (
              <Link
                href="/garden/grows?prompt=Select%20a%20grow%20to%20save%20scans"
                className="text-emerald-300 text-sm underline underline-offset-4"
              >
                Select a grow to enable saving
              </Link>
            )}
            <ScanConfirmation
              growName={selectedGrow?.name}
              diagnosisSummary={insight?.summary || undefined}
              confidenceLabel={insight?.confidence || undefined}
              scannedRecently={scannedRecently}
            />
          </div>
        )}
      </div>

      {/* Credits Modal */}
      {showCreditsModal && (
        <NotEnoughCreditsModal
          onClose={() => setShowCreditsModal(false)}
          credits={0}
        />
      )}
    </div>
  );
}
