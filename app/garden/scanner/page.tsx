"use client";

import { buildScannerResult } from "@/lib/scanner/resultBuilder";
import type { ScannerResult } from "@/lib/scanner/types";
import { useMemo, useState } from "react";

const mockResult: ScannerResult = buildScannerResult({
  closestCultivarMatch: {
    name: "Northern Lights",
    confidence: 81,
  },
  inferredGenetics: {
    dominance: "indica",
    lineageFamilies: ["Afghani", "Thai"],
    confidence: 81,
  },
  userFacingHighlights: {
    effects: ["Relaxing", "Clear-headed"],
    aromaProfile: ["Earthy", "Sweet"],
    bestUseTime: "Evening",
  },
});

const FALLBACK_RESULT = {
  strainName: "Analysis Unavailable",
  confidence: 0,
  lineage: {
    parents: ["—", "—"],
    dominance: "Unknown",
  },
  aromas: ["—"],
  effects: ["—"],
  bestTime: "—",
};

export default function ScannerPage() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ScannerResult | null>(null);
  const [loading, setLoading] = useState(false);

  const previewUrl = useMemo(() => {
    if (!file) return null;
    return URL.createObjectURL(file);
  }, [file]);

  // cleanup object URL
  useMemo(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleScan = async () => {
    setLoading(true);

    // Normalize dominance: "Indica-leaning" -> "indica", "Sativa-leaning" -> "sativa", else -> "hybrid"
    const normalizeDominance = (dom: string): "indica" | "sativa" | "hybrid" => {
      const lower = dom.toLowerCase();
      if (lower.includes("indica")) return "indica";
      if (lower.includes("sativa")) return "sativa";
      return "hybrid";
    };

    try {
      const rawInference = {
        strainName: "Unknown Hybrid",
        confidence: 0.81,
        lineage: {
          parents: ["Unknown Indica", "Unknown Sativa"],
          dominance: "Indica-leaning",
        },
        aromas: ["Earthy", "Sweet"],
        effects: ["Relaxing", "Calming"],
        bestTime: "Evening",
      };

      const structuredResult = buildScannerResult({
        closestCultivarMatch: {
          name: rawInference.strainName,
          confidence: Math.round(rawInference.confidence * 100),
        },
        inferredGenetics: {
          dominance: normalizeDominance(rawInference.lineage.dominance),
          lineageFamilies: rawInference.lineage.parents,
          confidence: Math.round(rawInference.confidence * 100),
        },
        userFacingHighlights: {
          effects: rawInference.effects,
          aromaProfile: rawInference.aromas,
          bestUseTime: rawInference.bestTime,
        },
      });
      setResult(structuredResult);
    } catch (err) {
      console.error("Scanner result build failed", err);
      const fallbackResult = buildScannerResult({
        closestCultivarMatch: {
          name: FALLBACK_RESULT.strainName,
          confidence: Math.round(FALLBACK_RESULT.confidence * 100),
        },
        inferredGenetics: {
          dominance: normalizeDominance(FALLBACK_RESULT.lineage.dominance),
          lineageFamilies: FALLBACK_RESULT.lineage.parents,
          confidence: Math.round(FALLBACK_RESULT.confidence * 100),
        },
        userFacingHighlights: {
          effects: FALLBACK_RESULT.effects,
          aromaProfile: FALLBACK_RESULT.aromas,
          bestUseTime: FALLBACK_RESULT.bestTime,
        },
      });
      setResult(fallbackResult);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="w-full">
      {/* Header */}
      <div className="mb-6 text-center">
        <h1 className="text-5xl font-extrabold tracking-tight">Scanner</h1>
        <p className="mt-3 text-white/75">
          Upload a photo to simulate a strain identification scan.
        </p>
      </div>

      {/* Main Card */}
      <div className="rounded-3xl border border-white/15 bg-white/10 p-6 backdrop-blur-xl shadow-2xl shadow-black/30">
        {/* Controls */}
        <div className="flex flex-col items-center gap-3">
          <label className="inline-flex cursor-pointer items-center justify-center rounded-full border border-white/15 bg-black/30 px-4 py-2 text-sm text-white/85 hover:bg-black/40">
            Choose Photo
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setFile(f);
                setResult(null);
              }}
            />
          </label>

          <button
            type="button"
            disabled={!file || loading}
            onClick={handleScan}
            className="inline-flex items-center justify-center rounded-full border border-white/15 bg-emerald-500/20 px-4 py-2 text-sm font-semibold text-emerald-100 hover:bg-emerald-500/25 disabled:opacity-40 disabled:hover:bg-emerald-500/20"
          >
            {loading ? "Scanning..." : "Run Scan"}
          </button>
        </div>

        {/* IMAGE PREVIEW */}
        {previewUrl && (
          <div className="w-full max-w-sm mx-auto mb-6 rounded-xl overflow-hidden border border-white/20">
            <img
              src={previewUrl}
              alt="Scanned sample"
              className="w-full h-48 object-contain bg-black"
            />
          </div>
        )}

        {/* Result */}
        {result && result.closestCultivarMatch.name !== "Analysis Unavailable" && (
          <div className="mt-6 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 p-6 text-white">
            <h2 className="text-2xl font-bold mb-2">
              {result.closestCultivarMatch.name}
            </h2>
            <p className="text-green-400 mb-4">
              Confidence: {result.closestCultivarMatch.confidence}%
            </p>

            <div className="space-y-2 text-sm">
              <p>
                <strong>Dominance:</strong>{" "}
                {result.inferredGenetics.dominance}
              </p>
              <p>
                <strong>Lineage:</strong>{" "}
                {result.inferredGenetics.lineageFamilies.join(" × ")}
              </p>
              <p>
                <strong>Aroma:</strong>{" "}
                {result.userFacingHighlights.aromaProfile.join(", ")}
              </p>
              <p>
                <strong>Effects:</strong>{" "}
                {result.userFacingHighlights.effects.join(", ")}
              </p>
              <p>
                <strong>Best Time:</strong>{" "}
                {result.userFacingHighlights.bestUseTime}
              </p>
            </div>
          </div>
        )}

        {result && result.closestCultivarMatch.name === "Analysis Unavailable" && (
          <div className="mt-6 text-white/70 text-sm">
            Scan completed, but detailed analysis is unavailable right now.
          </div>
        )}

        <p className="mt-4 text-center text-xs text-white/55">
          Usage resets monthly (no rollovers). Authentication and subscriptions
          will be enforced later.
        </p>
      </div>
    </section>
  );
}
