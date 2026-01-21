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
    <section className="space-y-6">
      {children}
      
      {/* Phase 15.5.6 — Dominance/Ratio display (ONLY place this is allowed) */}
      {analysis?.dominance && (
        <div className="mt-6 rounded-2xl border border-white/15 bg-white/5 p-5 sm:p-6">
          <div className="text-lg font-semibold mb-3">Dominance</div>
          <div className="space-y-3">
            {[
              ["Indica", ratio.indica],
              ["Sativa", ratio.sativa],
              ["Hybrid", ratio.hybrid],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center gap-3">
                <div className="w-16 text-sm text-white/70">{label}</div>
                <div className="flex-1 h-3 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-3 rounded-full bg-white/60"
                    style={{ width: `${clampPct(Number(value))}%` }}
                  />
                </div>
                <div className="w-12 text-right text-sm text-white/70">{clampPct(Number(value))}%</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
