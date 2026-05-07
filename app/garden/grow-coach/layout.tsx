"use client";

import MemberGate from "@/components/MemberGate";

export default function growcoachLayout({ children }: { children: React.ReactNode }) {
  return (
    <MemberGate featureName="Grow Doctor" featureIcon="🩺">
      {children}
    </MemberGate>
  );
}
