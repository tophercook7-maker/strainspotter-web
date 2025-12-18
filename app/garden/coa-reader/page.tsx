"use client";

import React, { useState } from "react";
import Image from "next/image";
import { CoaAnalysisResult } from "@/types/coa";

export default function COAReaderPage() {
  const [rawText, setRawText] = useState("");
  const [fileName, setFileName] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CoaAnalysisResult | null>(null);

  async function handleAnalyze() {
    if (!rawText.trim() && !fileName) {
      setError("Please paste COA text or upload a file.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/coa/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawText, fileName }),
      });

      const data = await res.json();

      if (!data.ok) {
        throw new Error(data.error || "Failed to analyze COA");
      }

      setResult(data.result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      // Note: Image/OCR support coming soon
    }
  }

  return (
    <div className="min-h-screen text-[var(--botanical-text-primary)] px-4 py-8 bg-[var(--botanical-bg-deep)]">
      {/* Background effects */}
      <div className="fixed inset-0 -z-10 aurora-wrapper">
        <div className="aurora-layer" />
        <div className="particle-field particle-pulse" />
      </div>

      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="flex-shrink-0">
            <img
              src="/brand/logos/botanical-logo-mark.svg"
              alt="COA Reader"
              width={44}
              height={44}
              className="rounded-full p-2"
              style={{
                backgroundColor: 'var(--botanical-bg-deep)',
                border: '1px solid var(--botanical-accent)',
                boxShadow: '0 0 12px var(--botanical-glow)',
              }}
            />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-[var(--botanical-accent-alt)] mb-2">COA Reader</h1>
            <p className="text-[var(--botanical-text-secondary)]">
              Upload, paste, or snap a picture of your lab results. We'll decode everything.
            </p>
          </div>
        </div>

        {/* Input Panel */}
        {!result && (
          <div className="bg-[var(--botanical-bg-panel)] border border-[var(--botanical-border)] rounded-[var(--radius-lg)] p-6 backdrop-blur-xl">
            <h2 className="text-xl font-semibold text-[var(--botanical-text-primary)] mb-4">Input COA Data</h2>

            {/* Text Area */}
            <div className="mb-4">
              <label className="block text-sm text-[var(--botanical-text-secondary)] mb-2">
                Paste COA text here
              </label>
              <textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="Paste COA text here…"
                className="w-full h-48 px-4 py-3 bg-[var(--botanical-bg-surface)] border border-[var(--botanical-border)] rounded-[var(--radius-md)] text-[var(--botanical-text-primary)] placeholder:text-[var(--botanical-text-muted)] focus:outline-none focus:border-[var(--botanical-accent)] focus:ring-2 focus:ring-[var(--botanical-glow)]"
              />
            </div>

            {/* File Input */}
            <div className="mb-4">
              <label className="block text-sm text-[var(--botanical-text-secondary)] mb-2">
                Upload PDF or Image (optional)
              </label>
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={handleFileChange}
                className="w-full px-4 py-2 bg-[var(--botanical-bg-surface)] border border-[var(--botanical-border)] rounded-[var(--radius-md)] text-[var(--botanical-text-primary)] file:mr-4 file:py-2 file:px-4 file:rounded-[var(--radius-md)] file:border-0 file:text-sm file:font-semibold file:bg-[var(--botanical-accent)]/20 file:text-[var(--botanical-text-primary)] hover:file:bg-[var(--botanical-accent)]/30"
              />
              {fileName && (
                <p className="mt-2 text-xs text-[var(--botanical-text-secondary)] italic">
                  {fileName} — Image/OCR support coming soon
                </p>
              )}
            </div>

            {/* Analyze Button */}
            <button
              onClick={handleAnalyze}
              disabled={loading}
              className="w-full py-3 px-6 bg-[var(--botanical-accent)] text-black font-semibold rounded-[var(--radius-md)] hover:bg-[var(--botanical-accent-alt)] transition-all duration-[var(--motion-fast)] ease-[var(--motion-smooth)] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              {loading ? "Analyzing…" : "Analyze COA"}
            </button>

            {/* Error Message */}
            {error && (
              <div className="mt-4 p-3 bg-red-900/30 border border-red-500/50 rounded-lg text-red-200 text-sm">
                {error}
              </div>
            )}

            {/* Loading State */}
            {loading && (
              <div className="mt-4 text-center text-[var(--botanical-text-primary)]">
                <div className="inline-block w-6 h-6 border-2 border-[var(--botanical-accent)] border-t-transparent rounded-full animate-spin mr-2" />
                Analyzing your COA…
              </div>
            )}
          </div>
        )}

        {/* Result Panel */}
        {result && (
          <div className="space-y-6">
            {/* Top Summary Card */}
            <div className="bg-[var(--botanical-bg-panel)] border border-[var(--botanical-border)] rounded-[var(--radius-lg)] p-6 backdrop-blur-xl">
              <h2 className="text-xl font-semibold text-[var(--botanical-text-primary)] mb-4">Summary</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-[var(--botanical-text-secondary)] mb-1">Product Name</p>
                  <p className="text-lg font-semibold text-[var(--botanical-accent-alt)]">
                    {result.summary.productName || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-emerald-100/70 mb-1">Strain</p>
                  <p className="text-lg font-semibold text-[var(--botanical-text-primary)]">
                    {result.summary.strainName || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-emerald-100/70 mb-1">Batch ID</p>
                  <p className="text-lg font-mono text-[var(--botanical-text-primary)]">
                    {result.summary.batchId || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-emerald-100/70 mb-1">Lab & Test Date</p>
                  <p className="text-lg text-emerald-200">
                    {result.summary.labName || "N/A"}
                    {result.summary.testDate && ` • ${result.summary.testDate}`}
                  </p>
                </div>
              </div>
            </div>

            {/* Potency Card */}
            <div className="bg-[var(--botanical-bg-panel)] border border-[var(--botanical-border)] rounded-[var(--radius-lg)] p-6 backdrop-blur-xl">
              <h2 className="text-xl font-semibold text-emerald-200 mb-4">Potency</h2>
              <div className="grid grid-cols-2 gap-6 mb-4">
                <div>
                  <p className="text-sm text-emerald-100/70 mb-2">THC</p>
                  <p className="text-4xl font-bold text-[var(--botanical-accent-alt)]">
                    {result.potency.thcPercent?.toFixed(1) ?? "--"}%
                  </p>
                </div>
                <div>
                  <p className="text-sm text-emerald-100/70 mb-2">CBD</p>
                  <p className="text-4xl font-bold text-[var(--botanical-accent-alt)]">
                    {result.potency.cbdPercent?.toFixed(1) ?? "--"}%
                  </p>
                </div>
              </div>
              {result.potency.minorCannabinoids.length > 0 && (
                <div>
                  <p className="text-sm text-emerald-100/70 mb-2">Minor Cannabinoids</p>
                  <div className="flex flex-wrap gap-2">
                    {result.potency.minorCannabinoids.map((c, i) => (
                      <span
                        key={i}
                        className="px-3 py-1 bg-[var(--botanical-accent)]/20 border border-[var(--botanical-accent)]/50 rounded-full text-sm text-[var(--botanical-text-primary)]"
                      >
                        {c.name}: {c.percent}%
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Terpenes Card */}
            <div className="bg-[var(--botanical-bg-panel)] border border-[var(--botanical-border)] rounded-[var(--radius-lg)] p-6 backdrop-blur-xl">
              <h2 className="text-xl font-semibold text-emerald-200 mb-4">Terpenes</h2>
              <div className="mb-4">
                <p className="text-sm text-emerald-100/70 mb-2">Total Terpenes</p>
                <p className="text-3xl font-bold text-[var(--botanical-accent-alt)]">
                  {result.terpenes.totalPercent?.toFixed(1) ?? "--"}%
                </p>
              </div>
              {result.terpenes.topTerpenes.length > 0 && (
                <div>
                  <p className="text-sm text-emerald-100/70 mb-2">Top Terpenes</p>
                  <div className="space-y-2">
                    {result.terpenes.topTerpenes.map((t, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <span className="text-[var(--botanical-text-primary)]">{t.name}</span>
                        <span className="text-[var(--botanical-accent-alt)] font-semibold">{t.percent}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Safety Card */}
            <div className="bg-[var(--botanical-bg-panel)] border border-[var(--botanical-border)] rounded-[var(--radius-lg)] p-6 backdrop-blur-xl">
              <h2 className="text-xl font-semibold text-emerald-200 mb-4">Safety Tests</h2>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-[var(--botanical-text-secondary)]">Pesticides</span>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-semibold ${
                      result.safety.pesticidesPass
                        ? "bg-green-500/20 text-green-300 border border-green-400/50"
                        : result.safety.pesticidesPass === false
                        ? "bg-red-500/20 text-red-300 border border-red-400/50"
                        : "bg-[var(--botanical-bg-surface)] text-[var(--botanical-text-secondary)] border border-[var(--botanical-border)]"
                    }`}
                  >
                    {result.safety.pesticidesPass === true
                      ? "PASS"
                      : result.safety.pesticidesPass === false
                      ? "FAIL"
                      : "N/A"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-emerald-100/80">Heavy Metals</span>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-semibold ${
                      result.safety.heavyMetalsPass
                        ? "bg-green-500/20 text-green-300 border border-green-400/50"
                        : result.safety.heavyMetalsPass === false
                        ? "bg-red-500/20 text-red-300 border border-red-400/50"
                        : "bg-[var(--botanical-bg-surface)] text-[var(--botanical-text-secondary)] border border-[var(--botanical-border)]"
                    }`}
                  >
                    {result.safety.heavyMetalsPass === true
                      ? "PASS"
                      : result.safety.heavyMetalsPass === false
                      ? "FAIL"
                      : "N/A"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-emerald-100/80">Microbes</span>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-semibold ${
                      result.safety.microbesPass
                        ? "bg-green-500/20 text-green-300 border border-green-400/50"
                        : result.safety.microbesPass === false
                        ? "bg-red-500/20 text-red-300 border border-red-400/50"
                        : "bg-[var(--botanical-bg-surface)] text-[var(--botanical-text-secondary)] border border-[var(--botanical-border)]"
                    }`}
                  >
                    {result.safety.microbesPass === true
                      ? "PASS"
                      : result.safety.microbesPass === false
                      ? "FAIL"
                      : "N/A"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-emerald-100/80">Residual Solvents</span>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-semibold ${
                      result.safety.residualSolventsPass
                        ? "bg-green-500/20 text-green-300 border border-green-400/50"
                        : result.safety.residualSolventsPass === false
                        ? "bg-red-500/20 text-red-300 border border-red-400/50"
                        : "bg-[var(--botanical-bg-surface)] text-[var(--botanical-text-secondary)] border border-[var(--botanical-border)]"
                    }`}
                  >
                    {result.safety.residualSolventsPass === true
                      ? "PASS"
                      : result.safety.residualSolventsPass === false
                      ? "FAIL"
                      : "N/A"}
                  </span>
                </div>
              </div>
              {result.safety.notes.length > 0 && (
                <div className="mt-4 pt-4 border-t border-[var(--botanical-border)]">
                  <p className="text-sm text-[var(--botanical-text-secondary)] mb-2">Notes</p>
                  <ul className="space-y-1">
                    {result.safety.notes.map((note, i) => (
                      <li key={i} className="text-sm text-[var(--botanical-text-primary)]">
                        • {note}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* AI Summary & Warnings Card */}
            <div className="bg-[var(--botanical-bg-panel)] border border-[var(--botanical-border)] rounded-[var(--radius-lg)] p-6 backdrop-blur-xl">
              <h2 className="text-xl font-semibold text-emerald-200 mb-4">AI Analysis</h2>
              <p className="text-[var(--botanical-text-primary)] mb-6 leading-relaxed">{result.aiSummary}</p>

              {result.recommendedUseCases.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-[var(--botanical-accent-alt)] mb-3">Recommended Use Cases</h3>
                  <ul className="space-y-2">
                    {result.recommendedUseCases.map((use, i) => (
                      <li key={i} className="text-[var(--botanical-text-primary)] flex items-start">
                        <span className="text-[var(--botanical-accent-alt)] mr-2">✓</span>
                        {use}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {result.riskWarnings.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-amber-300 mb-3">Risk Warnings</h3>
                  <ul className="space-y-2">
                    {result.riskWarnings.map((warning, i) => (
                      <li key={i} className="text-amber-200/80 flex items-start">
                        <span className="text-amber-400 mr-2">⚠</span>
                        {warning}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Reset Button */}
            <button
              onClick={() => {
                setResult(null);
                setRawText("");
                setFileName(undefined);
                setError(null);
              }}
              className="w-full py-3 px-6 bg-[var(--botanical-bg-surface)] border border-[var(--botanical-border)] text-[var(--botanical-text-primary)] font-semibold rounded-[var(--radius-md)] hover:bg-[var(--botanical-bg-panel)] hover:border-[var(--botanical-accent)] transition-all duration-[var(--motion-fast)] ease-[var(--motion-smooth)]"
            >
              Analyze Another COA
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
