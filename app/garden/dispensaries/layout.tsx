"use client";

import MemberGate from "@/components/MemberGate";

export default function dispensariesLayout({ children }: { children: React.ReactNode }) {
  return (
    <MemberGate featureName="Dispensary Finder" featureIcon="📍">
      {children}
    </MemberGate>
  );
}
