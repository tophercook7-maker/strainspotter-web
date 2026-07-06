"use client";

import MemberGate from "@/components/MemberGate";
import ComplianceGate from "@/components/ComplianceGate";

export default function dispensariesLayout({ children }: { children: React.ReactNode }) {
  return (
    <ComplianceGate feature="dispensaryFinder" title="Dispensary Finder">
      <MemberGate featureName="Dispensary Finder" featureIcon="📍">
        {children}
      </MemberGate>
    </ComplianceGate>
  );
}
