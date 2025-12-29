"use client";

import AuthWall from "@/components/AuthWall";
import MembershipGate from "@/components/MembershipGate";

export default function GardenLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthWall>
      <MembershipGate>
        <div className="relative" style={{ position: 'relative', zIndex: 1 }}>
          {children}
        </div>
      </MembershipGate>
    </AuthWall>
  );
}
