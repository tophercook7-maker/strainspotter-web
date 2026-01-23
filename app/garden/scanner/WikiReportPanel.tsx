// app/garden/scanner/WikiReportPanel.tsx
// Phase 4.2 — Extensive Wiki-Style Report (Depth Unlock)

"use client";

import type { ScannerViewModel } from "@/lib/scanner/viewModel";
import CollapsibleSection from "./CollapsibleSection";

interface FullScanResult {
  result: ScannerViewModel;
  analysis?: {
    dominance?: {
      indica: number;
      sativa: number;
      hybrid: number;
      classification: "Indica-dominant" | "Sativa-dominant" | "Hybrid";
    };
  };
}

interface WikiReportPanelProps {
  analysis: {
    dominance?: {
      indica: number;
      sativa: number;
      hybrid: number;
      classification: "Indica-dominant" | "Sativa-dominant" | "Hybrid";
    };
  }; // Full analysis object with dominance (required)
  result?: ScannerViewModel; // Optional for backward compat
  imageCount?: number; // Optional for backward compat
  children?: React.ReactNode;
}

/**
 * Phase 4.2 Step 4.2.10 — Wiki Report Panel
 * 
 * UI PRESENTATION RULES:
 * - Centered content column (max-width)
 * - No full-width divider lines
 * - Section headers large and readable
 * - Paragraph text comfortable (not tiny)
 * - Collapsible sections allowed, but OPEN by default for Free Tier
 * 
 * ARCHITECTURE: This is the ONLY place dominance/ratio rendering is allowed
 * dominance lives in the analysis layer, NOT in ViewModel
 */
export default function WikiReportPanel({
  analysis,
  result,
  imageCount,
  children,
}: WikiReportPanelProps) {
  // Phase 15.5.6 — Helper functions for ratio display
  function clampPct(n: number) {
    return Math.max(0, Math.min(100, n));
  }

  // Get ratio from analysis (this is the ONLY place ratio is allowed)
  const ratio = analysis?.dominance ?? {
    indica: 0,
    sativa: 0,
    hybrid: 0,
    classification: "Hybrid" as const,
  };

  return (
    <section className="max-w-[680px] mx-auto space-y-6">
      {children}
      
      {/* Phase 15.5.6 — Dominance/Ratio display (ONLY place this is allowed) */}
      {/* Phase 4.7.4 — UI Presentation (Trust-First) */}
      {analysis?.dominance && (
        <div className="mt-6 rounded-2xl border border-white/15 bg-white/5 p-5 sm:p-6">
          {/* Phase 4.7.4 — Trust-First Presentation: Visualization first, not raw numbers */}
          <div className="space-y-4">
            {/* Label: Dominance label (e.g., "Indica-leaning Hybrid") */}
            <div className="text-lg md:text-xl font-semibold text-white/95">
              {ratio.classification || "Balanced Hybrid"}
            </div>
            
            {/* Bar visualization (primary display) */}
            <div className="space-y-2">
              <div className="h-4 bg-white/10 rounded-full overflow-hidden">
                <div className="flex h-full">
                  <div 
                    style={{ width: `${clampPct(ratio.indica)}%` }} 
                    className="bg-purple-600 transition-all" 
                    title={`Indica: ${clampPct(ratio.indica)}%`}
                  />
                  <div 
                    style={{ width: `${clampPct(ratio.sativa)}%` }} 
                    className="bg-green-500 transition-all" 
                    title={`Sativa: ${clampPct(ratio.sativa)}%`}
                  />
                  <div 
                    style={{ width: `${clampPct(ratio.hybrid)}%` }} 
                    className="bg-yellow-500/60 transition-all" 
                    title={`Hybrid: ${clampPct(ratio.hybrid)}%`}
                  />
                </div>
              </div>
              
              {/* Subtext: "Based on genetics + visual structure" */}
              {/* Phase 4.7.4 — Dynamic subtext (default to genetics + visual) */}
              <p className="text-xs text-white/60 font-medium">
                Based on genetics + visual structure
              </p>
            </div>
            
            {/* Phase 4.7.4 — Expandable exact % breakdown */}
            <details className="cursor-pointer group">
              <summary className="text-sm text-white/70 hover:text-white/90 transition-colors list-none">
                <span className="flex items-center gap-2">
                  <span>Show exact breakdown</span>
                  <span className="text-white/50 group-open:rotate-180 transition-transform">▼</span>
                </span>
              </summary>
              <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/80">Indica</span>
                  <span className="text-white/90 font-medium">{clampPct(ratio.indica)}%</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/80">Sativa</span>
                  <span className="text-white/90 font-medium">{clampPct(ratio.sativa)}%</span>
                </div>
                {ratio.hybrid > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/80">Hybrid</span>
                    <span className="text-white/90 font-medium">{clampPct(ratio.hybrid)}%</span>
                  </div>
                )}
              </div>
            </details>
          </div>
        </div>
      )}
      
      {/* Analysis Notes */}
      {result?.notes && (
        <div className="mt-3 rounded-lg border border-yellow-400/30 bg-yellow-400/10 p-3 text-sm">
          <div className="font-semibold mb-1">Analysis Notes</div>
          <ul className="list-disc ml-4 space-y-1">
            {result.notes.map((n: string, i: number) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
