"use client";

import MemberGate from "@/components/MemberGate";

export default function strainsLayout({ children }: { children: React.ReactNode }) {
  return (
    <MemberGate featureName="Strain Browser" featureIcon="🔬">
      {children}
    </MemberGate>
  );
}
