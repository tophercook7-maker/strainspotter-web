"use client";

import { useState } from "react";
import Image from "next/image";

export default function ScannerPage() {
  const [result, setResult] = useState<null | {
    type: string;
    confidence: number;
    notes: string[];
  }>(null);

  return (
    <main className="min-h-screen w-full flex flex-col items-center justify-start px-4 pt-10 text-white">
      
      {/* TITLE */}
      <h1 className="text-3xl font-semibold mb-6 text-green-400">
        Scanner
      </h1>

      {/* SCANNER IMAGE */}
      <div className="w-full max-w-sm flex justify-center mb-8">
        <Image
          src="/images/mock_scanner.png"
          alt="Scanner preview"
          width={320}
          height={320}
          className="rounded-xl object-contain"
          priority
        />
      </div>

      {/* ACTION */}
      <button
        onClick={() =>
          setResult({
            type: "Indica-leaning",
            confidence: 81,
            notes: [
              "Earthy + sweet aroma",
              "Relaxing body feel",
              "Best for evening",
            ],
          })
        }
        className="mb-10 px-6 py-3 rounded-xl bg-green-500/80 hover:bg-green-500 transition text-black font-semibold"
      >
        Simulate Scan
      </button>

      {/* RESULT */}
      {result && (
        <div className="w-full max-w-md rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 p-6 space-y-3">
          <h2 className="text-xl font-semibold text-green-300">
            Result
          </h2>

          <p className="text-lg">{result.type}</p>

          <p className="text-sm opacity-80">
            Confidence: {result.confidence}%
          </p>

          <ul className="list-disc list-inside text-sm opacity-90">
            {result.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </div>
      )}
    </main>
  );
}
