// app/garden/scanner/WikiReportPanel.tsx
// Phase 4.2 — Extensive Wiki-Style Report (Depth Unlock)

"use client";

import type { ScannerViewModel } from "@/lib/scanner/viewModel";
import CollapsibleSection from "./CollapsibleSection";

interface WikiReportPanelProps {
  result: ScannerViewModel;
  imageCount: number;
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
 */
export default function WikiReportPanel({
  result,
  imageCount,
  children,
}: WikiReportPanelProps) {
  return (
    <section className="space-y-6">
      {children}
    </section>
  );
}
