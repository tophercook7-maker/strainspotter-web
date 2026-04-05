"use client";

import MemberGate from "@/components/MemberGate";

export default function seedvendorsLayout({ children }: { children: React.ReactNode }) {
  return (
    <MemberGate featureName="Seed Vendors" featureIcon="🌿">
      {children}
    </MemberGate>
  );
}
