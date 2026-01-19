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
    <div className="mt-6 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/15 overflow-hidden shadow-lg">
      {/* Header - clickable to toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-2 text-xs font-medium text-white/70 hover:text-white transition"
        aria-expanded={isOpen}
      >
        <span>Analysis Insights</span>
        <span className="text-xs opacity-70">
          {isOpen ? "▲" : "▼"}
        </span>
      </button>

      {/* Content - collapsible */}
      {isOpen && (
        <div className="max-h-[40vh] overflow-y-auto pr-1">
          {/* Summary - h2 with muted lead, multiple paragraphs */}
          <section className="pb-5 border-b border-white/10">
            <div className="flex items-start gap-3">
              <span className="text-white/30 text-xs font-mono mt-1.5 leading-none">§</span>
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-white mb-3 tracking-tight">Summary</h2>
                <div className="space-y-2.5 text-[13px] leading-relaxed">
                  {synthesis.summary.map((paragraph, index) => (
                    <p 
                      key={index} 
                      className={index === 0 ? "text-white/50 font-light leading-relaxed" : "text-white/70 leading-relaxed"}
                    >
                      {paragraph}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Why This Matters - multiple paragraphs */}
          <section className="py-5 border-b border-white/10">
            <div className="flex items-start gap-3">
              <span className="text-white/30 text-xs font-mono mt-1.5 leading-none">§</span>
              <div className="flex-1">
                <h4 className="text-[13px] font-semibold text-white/85 mb-2.5 tracking-tight">Why This Matters</h4>
                <div className="space-y-2.5 text-[13px] leading-relaxed text-white/70">
                  {synthesis.whyThisMatters.map((paragraph, index) => (
                    <p key={index} className="leading-relaxed">{paragraph}</p>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Uncertainty Explanation - multiple paragraphs */}
          <section className="py-5 border-b border-white/10">
            <div className="flex items-start gap-3">
              <span className="text-white/30 text-xs font-mono mt-1.5 leading-none">§</span>
              <div className="flex-1">
                <h4 className="text-[13px] font-semibold text-white/85 mb-2.5 tracking-tight">Uncertainty & Confidence</h4>
                <div className="space-y-2.5 text-[13px] leading-relaxed text-white/70">
                  {synthesis.uncertaintyExplanation.map((paragraph, index) => (
                    <p key={index} className="leading-relaxed">{paragraph}</p>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Signals Considered - bullet points */}
          {synthesis.signalsConsidered && synthesis.signalsConsidered.length > 0 && (
            <section className="py-5 border-b border-white/10">
              <div className="flex items-start gap-3">
                <span className="text-white/30 text-xs font-mono mt-1.5 leading-none">§</span>
                <div className="flex-1">
                  <h4 className="text-[13px] font-semibold text-white/85 mb-2.5 tracking-tight">Signals Considered</h4>
                  <ul className="space-y-2.5 text-[13px] leading-relaxed text-white/70">
                    {synthesis.signalsConsidered.map((signal, index) => (
                      <li key={index} className="flex items-start leading-relaxed">
                        <span className="text-white/40 mr-2.5 mt-0.5 leading-none">•</span>
                        <span className="flex-1">{signal}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>
          )}

          {/* Patterns Observed - bullet points */}
          {synthesis.patternsObserved && synthesis.patternsObserved.length > 0 && (
            <section className="py-5 border-b border-white/10">
              <div className="flex items-start gap-3">
                <span className="text-white/30 text-xs font-mono mt-1.5 leading-none">§</span>
                <div className="flex-1">
                  <h4 className="text-[13px] font-semibold text-white/85 mb-2.5 tracking-tight">Patterns Observed</h4>
                  <ul className="space-y-2.5 text-[13px] leading-relaxed text-white/70">
                    {synthesis.patternsObserved.map((pattern, index) => (
                      <li key={index} className="flex items-start leading-relaxed">
                        <span className="text-white/40 mr-2.5 mt-0.5 leading-none">•</span>
                        <span className="flex-1">{pattern}</span>
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
                  <h4 className="text-[13px] font-semibold text-white/85 mb-2.5 tracking-tight">Notable Patterns</h4>
                  <ul className="space-y-2.5 text-[13px] leading-relaxed text-white/70">
                    {synthesis.notablePatterns.map((pattern, index) => (
                      <li key={index} className="flex items-start leading-relaxed">
                        <span className="text-white/40 mr-2.5 mt-0.5 leading-none">•</span>
                        <span className="flex-1">{pattern}</span>
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
