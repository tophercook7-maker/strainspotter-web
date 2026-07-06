"use client";

import MemberGate from "@/components/MemberGate";
import ComplianceGate from "@/components/ComplianceGate";

export default function seedvendorsLayout({ children }: { children: React.ReactNode }) {
  return (
    <ComplianceGate feature="seedVendors" title="Seed Vendors">
      <MemberGate featureName="Seed Vendors" featureIcon="🌰">
        {children}
      </MemberGate>
    </ComplianceGate>
  );
}
