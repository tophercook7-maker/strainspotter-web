// app/garden/scanner/WikiPanel.tsx
// 🔒 C.2 — Field-Guide UI polish (UI only, no data/logic changes)

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
  // Phase 4.4.4 — Summary text rebalance: expandable state
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(false);
  const [isWhyMattersExpanded, setIsWhyMattersExpanded] = useState(false);

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
    <div className="rounded-2xl border border-white/15 bg-white/5 backdrop-blur-xl shadow-xl shadow-black/30 p-5 sm:p-6 overflow-hidden">
      {/* STEP 5.4.7 — Minimum 44px tap target */}
      {/* Phase 15.5.7 — WikiPanel toggle: make it not huge + fix giant opener */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-3 rounded-2xl border border-white/15 bg-white/5 px-5 min-h-[44px] py-4 text-left"
        aria-expanded={isOpen}
      >
        <span className="text-base sm:text-lg font-semibold">Analysis Insights</span>
        <span className="text-white/70 text-base">
          {isOpen ? "▾" : "▸"}
        </span>
      </button>

      {/* Content - collapsible */}
      {isOpen && (
        <div className="mt-3 overflow-y-auto pr-2 space-y-4">
          {/* Summary - h2 with muted lead, multiple paragraphs */}
          <section className="pb-5">
            <div className="flex items-start gap-3">
              <span className="text-white/30 text-xs font-mono mt-1.5 leading-none">§</span>
              <div className="flex-1">
                <h2 className="text-lg md:text-xl font-semibold mb-2">Summary</h2>
                <div className="space-y-2.5">
                  {synthesis.summary.map((paragraph, index) => (
                    <p 
                      key={index} 
                      className="text-base sm:text-lg leading-relaxed text-white/90"
                    >
                      {paragraph}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Why This Matters - multiple paragraphs */}
          {/* Phase 4.4.4 — Summary text rebalance: larger text, limited visible lines, expandable */}
          <section className="py-5">
            <div className="flex items-start gap-3">
              <span className="text-white/30 text-xs font-mono mt-1.5 leading-none">§</span>
              <div className="flex-1">
                <h4 className="text-lg md:text-xl font-semibold mb-2">Why This Matters</h4>
                <div className="space-y-2.5">
                  {synthesis.whyThisMatters.map((paragraph, index) => {
                    // Show first 3-4 paragraphs by default, rest on expand
                    const shouldShow = isWhyMattersExpanded || index < 3;
                    if (!shouldShow) return null;
                    
                    return (
                      <p key={index} className="text-lg leading-relaxed text-white/90">{paragraph}</p>
                    );
                  })}
                  {synthesis.whyThisMatters.length > 3 && (
                    <button
                      onClick={() => setIsWhyMattersExpanded(!isWhyMattersExpanded)}
                      className="text-sm text-blue-400 hover:text-blue-300 font-medium mt-2 min-h-[44px] px-3 py-2 -ml-3"
                    >
                      {isWhyMattersExpanded ? "Read less" : "Read more"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Uncertainty Explanation - multiple paragraphs */}
          {/* Phase 4.4.4 — Summary text rebalance: larger text */}
          <section className="py-5">
            <div className="flex items-start gap-3">
              <span className="text-white/30 text-xs font-mono mt-1.5 leading-none">§</span>
              <div className="flex-1">
                <h4 className="text-lg md:text-xl font-semibold mb-2">Uncertainty & Confidence</h4>
                <div className="space-y-2.5">
                  {synthesis.uncertaintyExplanation.map((paragraph, index) => (
                    <p key={index} className="text-lg leading-relaxed text-white/90">{paragraph}</p>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Signals Considered - bullet points */}
          {synthesis.signalsConsidered && synthesis.signalsConsidered.length > 0 && (
            <section className="py-5">
              <div className="flex items-start gap-3">
                <span className="text-white/30 text-xs font-mono mt-1.5 leading-none">§</span>
                <div className="flex-1">
                  <h4 className="text-lg md:text-xl font-semibold mb-2">Signals Considered</h4>
                  <ul className="space-y-2.5">
                    {synthesis.signalsConsidered.map((signal, index) => (
                      <li key={index} className="flex items-start">
                        <span className="text-white/40 mr-2.5 mt-0.5 leading-none">•</span>
                        <span className="flex-1 text-sm sm:text-base leading-relaxed text-white/90">{signal}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>
          )}

          {/* Patterns Observed - bullet points */}
          {synthesis.patternsObserved && synthesis.patternsObserved.length > 0 && (
            <section className="py-5">
              <div className="flex items-start gap-3">
                <span className="text-white/30 text-xs font-mono mt-1.5 leading-none">§</span>
                <div className="flex-1">
                  <h4 className="text-lg md:text-xl font-semibold mb-2">Patterns Observed</h4>
                  <ul className="space-y-2.5">
                    {synthesis.patternsObserved.map((pattern, index) => (
                      <li key={index} className="flex items-start">
                        <span className="text-white/40 mr-2.5 mt-0.5 leading-none">•</span>
                        <span className="flex-1 text-base md:text-lg leading-relaxed text-white/90">{pattern}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>
          )}

          {/* Notable Patterns - fallback if patternsObserved not available */}
          {(!synthesis.patternsObserved || synthesis.patternsObserved.length === 0) && synthesis.notablePatterns.length > 0 && (
            <section className="pt-5">
              <div className="flex items-start gap-3">
                <span className="text-white/30 text-xs font-mono mt-1.5 leading-none">§</span>
                <div className="flex-1">
                  <h4 className="text-lg md:text-xl font-semibold mb-2">Notable Patterns</h4>
                  <ul className="space-y-2.5">
                    {synthesis.notablePatterns.map((pattern, index) => (
                      <li key={index} className="flex items-start">
                        <span className="text-white/40 mr-2.5 mt-0.5 leading-none">•</span>
                        <span className="flex-1 text-base md:text-lg leading-relaxed text-white/90">{pattern}</span>
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
