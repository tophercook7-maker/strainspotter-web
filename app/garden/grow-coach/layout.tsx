"use client";

import MemberGate from "@/components/MemberGate";

export default function growcoachLayout({ children }: { children: React.ReactNode }) {
  return (
    <MemberGate featureName="Grow Coach" featureIcon="🌱">
      {children}
    </MemberGate>
  );
}
