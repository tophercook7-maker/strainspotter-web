"use client";

import { useMemo, useState } from "react";
import { canUseFeature, consumeFeature } from "@/lib/monetization/guard";

type ScanResult = {
  title: string;
  confidence: number;
  notes: string[];
};

function fakeScanResult(): ScanResult {
  const options: ScanResult[] = [
    {
      title: "Hybrid (Balanced)",
      confidence: 0.86,
      notes: ["Citrus + pine aroma", "Likely calming focus", "Start low, go slow"],
    },
    {
      title: "Indica-leaning",
      confidence: 0.81,
      notes: ["Earthy + sweet aroma", "Relaxing body feel", "Best for evening"],
    },
    {
      title: "Sativa-leaning",
      confidence: 0.79,
      notes: ["Bright + herbal aroma", "Uplifting energy", "Best for daytime"],
    },
  ];
  return options[Math.floor(Math.random() * options.length)];
}

export default function ScannerPage() {
  const feature = "id_scan" as const;

  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ScanResult | null>(null);
  const [usageStamp, setUsageStamp] = useState(0);

  const access = useMemo(() => canUseFeature(feature), [feature, usageStamp]);

  function onPickFile(file: File | null) {
    setError("");
    setResult(null);

    if (!file) {
      setPreviewUrl("");
      return;
    }

    const url = URL.createObjectURL(file);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return url;
    });
  }

  async function runScan() {
    setError("");
    setResult(null);

    const check = canUseFeature(feature);
    if (!check.allowed) {
      setError(
        `Scan limit reached. Remaining: ${check.remaining}. Upgrade to continue.`
      );
      return;
    }

    if (!previewUrl) {
      setError("Add a photo first.");
      return;
    }

    setBusy(true);
    try {
      // pretend we scanned
      await new Promise((r) => setTimeout(r, 900));

      // decrement usage (local)
      consumeFeature(feature);
      setUsageStamp(Date.now());

      // show stub result
      setResult(fakeScanResult());
    } catch {
      setError("Scan failed. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen w-full bg-black text-white px-6 py-10">
      <div className="mx-auto w-full max-w-3xl">
        <h1 className="text-3xl font-extrabold tracking-tight">Scanner</h1>
        <p className="mt-2 text-white/70">
          Upload a photo to simulate an identification scan (no API calls).
        </p>

        <div className="mt-6 rounded-3xl border border-white/15 bg-white/5 p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-white/70">
              <div>
                Tier: <span className="text-white">{access.tier}</span>
              </div>
              <div>
                Monthly ID scans:{" "}
                <span className="text-white">
                  {access.used}/{access.limit}
                </span>{" "}
                (remaining{" "}
                <span className="text-white">{access.remaining}</span>)
              </div>
            </div>

            <label className="inline-flex cursor-pointer items-center justify-center rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-semibold hover:bg-white/15">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
              />
              Choose Photo
            </label>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-black/30 p-2">
              <div className="text-xs uppercase tracking-wider text-white/60">
                Preview
              </div>
              <div className="w-full overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-2">
                {previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-full max-h-44 object-contain rounded-xl bg-black/50"
                    draggable={false}
                  />
                ) : (
                  <div className="flex h-64 items-center justify-center text-white/40">
                    No image selected
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
              <div className="text-xs uppercase tracking-wider text-white/60">
                Result
              </div>

              <div className="mt-3 min-h-[16rem] rounded-xl border border-white/10 bg-black/40 p-4">
                {error ? (
                  <div className="text-sm text-red-300">{error}</div>
                ) : result ? (
                  <div>
                    <div className="text-xl font-extrabold">
                      {result.title}
                    </div>
                    <div className="mt-1 text-sm text-white/70">
                      Confidence:{" "}
                      <span className="text-white">
                        {Math.round(result.confidence * 100)}%
                      </span>
                    </div>
                    <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-white/80">
                      {result.notes.map((n) => (
                        <li key={n}>{n}</li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="text-sm text-white/50">
                    Run a scan to see results.
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={runScan}
                disabled={busy}
                className="mt-4 w-full rounded-2xl bg-green-500/90 px-4 py-3 text-sm font-extrabold text-black hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busy ? "Scanning…" : "Run Scan"}
              </button>
            </div>
          </div>
        </div>

        <p className="mt-6 text-xs text-white/40">
          Note: Usage resets monthly (no rollovers). Auth + Supabase subscription
          wiring comes later.
        </p>
      </div>
    </main>
  );
}
