"use client";

import AuthWall from "@/components/AuthWall";
import MembershipGate from "@/components/MembershipGate";

export default function GardenLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthWall>
      <MembershipGate>
        {children}
      </MembershipGate>
    </AuthWall>
  );
}
