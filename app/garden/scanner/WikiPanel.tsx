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
    <div className="mt-6 rounded-2xl bg-white/5 backdrop-blur-xl overflow-hidden shadow-lg">
      {/* Header - clickable to toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full text-left text-base md:text-lg font-semibold py-2"
        aria-expanded={isOpen}
      >
        <span>Analysis Insights</span>
        <span className="text-sm opacity-70">
          {isOpen ? "▲" : "▼"}
        </span>
      </button>

      {/* Content - collapsible */}
      {isOpen && (
        <div className="mt-3 overflow-y-auto pr-2 space-y-4 text-sm text-white/80">
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
                      className="text-base md:text-lg leading-relaxed text-white/90"
                    >
                      {paragraph}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Why This Matters - multiple paragraphs */}
          <section className="py-5">
            <div className="flex items-start gap-3">
              <span className="text-white/30 text-xs font-mono mt-1.5 leading-none">§</span>
              <div className="flex-1">
                <h4 className="text-lg md:text-xl font-semibold mb-2">Why This Matters</h4>
                <div className="space-y-2.5">
                  {synthesis.whyThisMatters.map((paragraph, index) => (
                    <p key={index} className="text-base md:text-lg leading-relaxed text-white/90">{paragraph}</p>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Uncertainty Explanation - multiple paragraphs */}
          <section className="py-5">
            <div className="flex items-start gap-3">
              <span className="text-white/30 text-xs font-mono mt-1.5 leading-none">§</span>
              <div className="flex-1">
                <h4 className="text-lg md:text-xl font-semibold mb-2">Uncertainty & Confidence</h4>
                <div className="space-y-2.5">
                  {synthesis.uncertaintyExplanation.map((paragraph, index) => (
                    <p key={index} className="text-base md:text-lg leading-relaxed text-white/90">{paragraph}</p>
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
                        <span className="flex-1 text-base md:text-lg leading-relaxed text-white/90">{signal}</span>
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
