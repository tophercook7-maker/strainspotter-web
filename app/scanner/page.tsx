"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthProvider";
import { checkScanGuard } from "@/lib/scanGuard";
import NotEnoughCreditsModal from "@/components/NotEnoughCreditsModal";
import ConfidenceDisplay from "@/components/ConfidenceDisplay";
import ConfidenceSummaryCard from "@/components/ConfidenceSummaryCard";
import { adaptScannerResponse } from "@/lib/confidence/adapter";

export default function ScannerPage() {
  const router = useRouter();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setError(null);
    setConfidenceResult(null);

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

      console.log("[SCANNER] Uploading image...", { fileName: file.name, size: file.size });

      // Call visual-match API
      const response = await fetch("/api/visual-match/v3", {
        method: "POST",
        body: formData,
      });

      console.log("[SCANNER] Response status:", response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errorData.error || `Request failed with status ${response.status}`);
      }

      const data = await response.json();
      console.log("[SCANNER] Results received:", data);

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
      console.error("[SCANNER] Error:", err);
      setError(err.message || "Failed to scan image");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">Scanner</h1>

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
            className="w-full px-6 py-4 bg-emerald-600 text-black font-semibold rounded-lg hover:bg-emerald-500 transition"
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
          <button
            onClick={handleScan}
            className="w-full px-6 py-4 bg-emerald-600 text-black font-semibold rounded-lg hover:bg-emerald-500 transition disabled:opacity-50"
          >
            Scan
          </button>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-8">
            <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p>Scanning image...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-900/40 border border-red-500/40 rounded-lg p-4">
            <p className="text-red-200">{error}</p>
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
