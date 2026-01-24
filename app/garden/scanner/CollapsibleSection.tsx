// app/garden/scanner/CollapsibleSection.tsx
// Phase 3.6 Part A — Collapsible Section Component

"use client";

import { useState } from "react";

interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  icon?: string;
}

export default function CollapsibleSection({
  title,
  children,
  defaultExpanded = false,
  icon,
}: CollapsibleSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="rounded-2xl border border-white/15 bg-white/5 backdrop-blur-xl shadow-xl shadow-black/30 overflow-hidden">
      {/* STEP 5.4.7 — Minimum 44px tap target */}
      {/* Header - clickable to toggle */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full text-left px-4 md:px-6 min-h-[44px] py-4 hover:bg-white/5 transition-colors"
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-3">
          {icon && (
            <span className="text-white/40 text-sm font-mono">{icon}</span>
          )}
          <h2 className="text-lg md:text-xl font-semibold text-white">
            {title}
          </h2>
        </div>
        <span className="text-white/60 text-sm ml-4">
          {isExpanded ? "▲" : "▼"}
        </span>
      </button>

      {/* Content - collapsible */}
      {isExpanded && (
        <div className="px-4 md:px-6 pb-4 md:pb-6 pt-2 space-y-4">
          {children}
        </div>
      )}
    </div>
  );
}
