"use client";

import MemberGate from "@/components/MemberGate";

export default function ecosystemLayout({ children }: { children: React.ReactNode }) {
  return (
    <MemberGate featureName="Strain Ecosystem" featureIcon="🧬">
      {children}
    </MemberGate>
  );
}
