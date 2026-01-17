"use client";

import { useMemo, useState } from "react";

type ScanResult = {
  type: string;
  confidence: number; // 0-100
  aroma: string;
  effect: string;
  recommendation: string;
};

const mockResult: ScanResult = {
  type: "Indica-leaning",
  confidence: 81,
  aroma: "Earthy + sweet aroma",
  effect: "Relaxing body feel",
  recommendation: "Best for evening",
};

export default function ScannerPage() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);

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
            disabled={!file}
            onClick={() => setResult(mockResult)}
            className="inline-flex items-center justify-center rounded-full border border-white/15 bg-emerald-500/20 px-4 py-2 text-sm font-semibold text-emerald-100 hover:bg-emerald-500/25 disabled:opacity-40 disabled:hover:bg-emerald-500/20"
          >
            Run Scan
          </button>
        </div>

        {/* Preview */}
        <div className="mt-6 flex justify-center">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-white/15 bg-black/25">
            {/* aspect lock = stable visuals */}
            <div className="relative aspect-[4/3] w-full">
              {previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-white/60">
                  No image selected
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Result */}
        <div className="mt-6 rounded-2xl border border-white/15 bg-black/25 p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Scan Result</h2>
            <span className="text-sm text-white/70">
              {result ? `${result.confidence}% confidence` : "—"}
            </span>
          </div>

          {result ? (
            <ul className="mt-4 space-y-2 text-white/85">
              <li>
                <span className="text-white/60">Type:</span>{" "}
                <span className="font-semibold">{result.type}</span>
              </li>
              <li>
                <span className="text-white/60">Aroma:</span>{" "}
                <span className="font-semibold">{result.aroma}</span>
              </li>
              <li>
                <span className="text-white/60">Effect:</span>{" "}
                <span className="font-semibold">{result.effect}</span>
              </li>
              <li>
                <span className="text-white/60">Recommendation:</span>{" "}
                <span className="font-semibold">{result.recommendation}</span>
              </li>
            </ul>
          ) : (
            <p className="mt-3 text-white/65">
              Upload a photo and run a scan to see results.
            </p>
          )}
        </div>

        <p className="mt-4 text-center text-xs text-white/55">
          Usage resets monthly (no rollovers). Authentication and subscriptions
          will be enforced later.
        </p>
      </div>
    </section>
  );
}
