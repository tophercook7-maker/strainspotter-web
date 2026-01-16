"use client";

import { useState } from "react";

export default function ScannerPage() {
  const [imageSrc, setImageSrc] = useState<string | null>(null);

  return (
    <main className="min-h-screen bg-black text-white flex justify-center px-4 py-12">
      {/* SPINE */}
      <div className="w-full max-w-3xl flex flex-col items-center gap-10">

        {/* HEADER */}
        <header className="text-center space-y-2">
          <h1 className="text-4xl font-extrabold tracking-tight">Scanner</h1>
          <p className="text-white/70">
            Upload a photo to simulate a strain identification scan.
          </p>
        </header>

        {/* UPLOAD */}
        <label className="cursor-pointer inline-flex items-center justify-center rounded-xl bg-white/10 backdrop-blur-md border border-white/20 px-6 py-3 hover:bg-white/20 transition">
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                setImageSrc(URL.createObjectURL(file));
              }
            }}
          />
          Choose Photo
        </label>

        {/* PREVIEW */}
        {imageSrc && (
          <div className="w-full flex justify-center">
            <img
              src={imageSrc}
              alt="Scan preview"
              className="max-h-[420px] w-auto rounded-2xl object-contain shadow-2xl border border-white/10"
            />
          </div>
        )}

        {/* RESULTS */}
        {imageSrc && (
          <section className="w-full rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 p-6 space-y-3">
            <h2 className="text-xl font-semibold">Scan Result</h2>

            <ul className="text-white/80 space-y-1">
              <li><strong>Type:</strong> Indica-leaning</li>
              <li><strong>Confidence:</strong> 81%</li>
              <li><strong>Aroma:</strong> Earthy + sweet</li>
              <li><strong>Effect:</strong> Relaxing body feel</li>
              <li><strong>Recommendation:</strong> Best for evening</li>
            </ul>
          </section>
        )}

        {/* FOOTER */}
        <footer className="text-xs text-white/40 text-center pt-6">
          Usage resets monthly (no rollovers). Auth + Supabase wiring comes later.
        </footer>
      </div>
    </main>
  );
}
