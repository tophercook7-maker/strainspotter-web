// FILE: app/garden/scanner/page.tsx
// ACTION: REPLACE THE ENTIRE FILE WITH THIS

"use client";

import { useMemo, useRef, useState } from "react";

type ScanResult = {
  type: string;
  confidence: number;
  aroma: string;
  effect: string;
  recommendation: string;
};

const MOCK_RESULTS: ScanResult[] = [
  {
    type: "Indica-leaning",
    confidence: 81,
    aroma: "Earthy + sweet aroma",
    effect: "Relaxing body feel",
    recommendation: "Best for evening",
  },
  {
    type: "Hybrid (Balanced)",
    confidence: 86,
    aroma: "Citrus + pine aroma",
    effect: "Likely calming focus",
    recommendation: "Start low, go slow",
  },
];

export default function ScannerPage() {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [busy, setBusy] = useState(false);

  const headerSub = useMemo(
    () => "Upload a photo to simulate a strain identification scan",
    []
  );

  function onPick() {
    fileRef.current?.click();
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;

    const url = URL.createObjectURL(f);
    setImgUrl(url);
    setResult(null);
  }

  async function runScan() {
    // guard
    if (!imgUrl) return;

    setBusy(true);
    setResult(null);

    // simulate a scan delay
    await new Promise((r) => setTimeout(r, 650));

    // pick a stable mock result (could be randomized later)
    setResult(MOCK_RESULTS[0]);

    setBusy(false);
  }

  return (
    <main className="min-h-screen w-full bg-black text-white">
      {/* BACKDROP FADE (keeps scanner premium even on plain black pages) */}
      <div className="pointer-events-none fixed inset-0 opacity-40">
        <div className="absolute -top-24 left-1/2 h-80 w-[46rem] -translate-x-1/2 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute top-40 right-[-10rem] h-72 w-72 rounded-full bg-emerald-400/10 blur-3xl" />
        <div className="absolute bottom-[-10rem] left-[-10rem] h-96 w-96 rounded-full bg-emerald-300/10 blur-3xl" />
      </div>

      <div className="relative mx-auto w-full max-w-5xl px-4 py-12 sm:py-16">
        {/* HEADER */}
        <header className="mb-8 text-center">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
            Scanner
          </h1>
          <p className="mt-3 text-sm text-white/70 sm:text-base">{headerSub}</p>
        </header>

        {/* MAIN GRID */}
        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          {/* LEFT: IMAGE CARD */}
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.55)] backdrop-blur-xl">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-white/90">
                  Preview
                </div>
                <div className="mt-1 text-xs text-white/60">
                  Your image stays local (no API calls)
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={onFileChange}
                />

                <button
                  type="button"
                  onClick={onPick}
                  className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold text-white shadow-sm backdrop-blur-md transition hover:bg-white/15 active:scale-[0.99]"
                >
                  Choose Photo
                </button>

                <button
                  type="button"
                  onClick={runScan}
                  disabled={!imgUrl || busy}
                  className={[
                    "rounded-full px-4 py-2 text-xs font-semibold shadow-sm transition active:scale-[0.99]",
                    !imgUrl || busy
                      ? "cursor-not-allowed bg-white/10 text-white/40"
                      : "bg-emerald-500/90 text-black hover:bg-emerald-400",
                  ].join(" ")}
                >
                  {busy ? "Scanning..." : "Run Scan"}
                </button>
              </div>
            </div>

            <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-black/40">
              {/* fixed stage so images never blow up layout */}
              <div className="flex h-[340px] w-full items-center justify-center sm:h-[420px]">
                {imgUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imgUrl}
                    alt="Selected"
                    className="max-h-full w-full object-contain"
                  />
                ) : (
                  <div className="text-center">
                    <div className="mx-auto mb-3 h-12 w-12 rounded-2xl bg-white/10 backdrop-blur-md" />
                    <div className="text-sm font-semibold text-white/80">
                      No image yet
                    </div>
                    <div className="mt-1 text-xs text-white/50">
                      Tap <span className="text-white/70">Choose Photo</span> to
                      begin
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 text-[11px] text-white/55">
              Note: Usage resets monthly (no rollovers). Authentication and
              subscriptions will be enforced later.
            </div>
          </div>

          {/* RIGHT: RESULT CARD */}
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.55)] backdrop-blur-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-white/90">
                  Scan Result
                </div>
                <div className="mt-1 text-xs text-white/60">
                  Clean, readable, Apple-style summary
                </div>
              </div>

              {result ? (
                <div className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-200">
                  {result.confidence}% confidence
                </div>
              ) : (
                <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/50">
                  awaiting scan
                </div>
              )}
            </div>

            <div className="mt-4 space-y-3">
              {!result ? (
                <div className="rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-white/70">
                  Upload a photo, then press{" "}
                  <span className="text-white/90">Run Scan</span>.
                </div>
              ) : (
                <>
                  <Metric label="Type" value={result.type} />
                  <Metric label="Aroma" value={result.aroma} />
                  <Metric label="Effect" value={result.effect} />
                  <Metric label="Recommendation" value={result.recommendation} />
                </>
              )}
            </div>

            <div className="mt-5 rounded-2xl border border-white/10 bg-black/30 p-4 text-xs text-white/55">
              Next: shrink/crop output image on-device and store the scan record
              to Supabase.
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
      <div className="text-xs font-semibold text-white/60">{label}</div>
      <div className="mt-1 text-sm font-semibold text-white/90">{value}</div>
    </div>
  );
}
