// app/garden/scanner/WikiPanel.tsx
// 🔒 C.1 — Read-only, collapsible WikiPanel for WikiSynthesis

"use client";

import { useState, useEffect } from "react";
import type { WikiSynthesis } from "@/lib/scanner/types";

interface WikiPanelProps {
  synthesis: WikiSynthesis;
}

export default function WikiPanel({ synthesis }: WikiPanelProps) {
  // Default: collapsed on mobile, open on desktop
  const [isOpen, setIsOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    // Check initial screen size
    const checkScreenSize = () => {
      setIsDesktop(window.innerWidth >= 768); // md breakpoint
      setIsOpen(window.innerWidth >= 768); // Open on desktop, collapsed on mobile
    };

    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  return (
    <div className="mt-6 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/15 overflow-hidden">
      {/* Header - clickable to toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-white/5 transition-colors"
        aria-expanded={isOpen}
      >
        <h3 className="text-lg font-semibold text-white">Analysis Insights</h3>
        <svg
          className={`w-5 h-5 text-white/70 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Content - collapsible */}
      {isOpen && (
        <div className="px-6 pb-6 pt-2 space-y-0">
          {/* Summary - h2 with muted lead, multiple paragraphs */}
          <section className="pb-6 border-b border-white/10">
            <div className="flex items-start gap-3 mb-3">
              <span className="text-white/40 text-xs font-mono mt-1">§</span>
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-white mb-3">Summary</h2>
                <div className="space-y-3 text-sm leading-relaxed text-white/70">
                  {synthesis.summary.map((paragraph, index) => (
                    <p key={index} className={index === 0 ? "text-white/50 font-light" : ""}>
                      {paragraph}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Why This Matters - multiple paragraphs */}
          <section className="py-6 border-b border-white/10">
            <div className="flex items-start gap-3 mb-3">
              <span className="text-white/40 text-xs font-mono mt-1">§</span>
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-white/80 mb-2">Why This Matters</h4>
                <div className="space-y-3 text-sm leading-relaxed text-white/70">
                  {synthesis.whyThisMatters.map((paragraph, index) => (
                    <p key={index}>{paragraph}</p>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Uncertainty Explanation - multiple paragraphs */}
          <section className="py-6 border-b border-white/10">
            <div className="flex items-start gap-3 mb-3">
              <span className="text-white/40 text-xs font-mono mt-1">§</span>
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-white/80 mb-2">Uncertainty & Confidence</h4>
                <div className="space-y-3 text-sm leading-relaxed text-white/70">
                  {synthesis.uncertaintyExplanation.map((paragraph, index) => (
                    <p key={index}>{paragraph}</p>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Signals Considered - bullet points */}
          {synthesis.signalsConsidered && synthesis.signalsConsidered.length > 0 && (
            <section className="py-6 border-b border-white/10">
              <div className="flex items-start gap-3 mb-3">
                <span className="text-white/40 text-xs font-mono mt-1">§</span>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-white/80 mb-2">Signals Considered</h4>
                  <ul className="space-y-2 text-sm leading-relaxed text-white/70">
                    {synthesis.signalsConsidered.map((signal, index) => (
                      <li key={index} className="flex items-start">
                        <span className="text-white/50 mr-2">•</span>
                        <span>{signal}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>
          )}

          {/* Patterns Observed - bullet points */}
          {synthesis.patternsObserved && synthesis.patternsObserved.length > 0 && (
            <section className="py-6 border-b border-white/10">
              <div className="flex items-start gap-3 mb-3">
                <span className="text-white/40 text-xs font-mono mt-1">§</span>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-white/80 mb-2">Patterns Observed</h4>
                  <ul className="space-y-2 text-sm leading-relaxed text-white/70">
                    {synthesis.patternsObserved.map((pattern, index) => (
                      <li key={index} className="flex items-start">
                        <span className="text-white/50 mr-2">•</span>
                        <span>{pattern}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>
          )}

          {/* Notable Patterns - fallback if patternsObserved not available */}
          {(!synthesis.patternsObserved || synthesis.patternsObserved.length === 0) && synthesis.notablePatterns.length > 0 && (
            <section className="pt-6">
              <div className="flex items-start gap-3 mb-3">
                <span className="text-white/40 text-xs font-mono mt-1">§</span>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-white/80 mb-2">Notable Patterns</h4>
                  <ul className="space-y-2 text-sm leading-relaxed text-white/70">
                    {synthesis.notablePatterns.map((pattern, index) => (
                      <li key={index} className="flex items-start">
                        <span className="text-white/50 mr-2">•</span>
                        <span>{pattern}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
