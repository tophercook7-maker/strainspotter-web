"use client";

import ComplianceGate from "@/components/ComplianceGate";

// The consumption diary (dose / method / effects) reads as "facilitating use"
// to app stores — gated so native builds hide it while web keeps it.
export default function journalLayout({ children }: { children: React.ReactNode }) {
  return (
    <ComplianceGate feature="consumptionDiary" title="Session Journal">
      {children}
    </ComplianceGate>
  );
}
