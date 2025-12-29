"use client";

import AuthWall from "@/components/AuthWall";
import MembershipGate from "@/components/MembershipGate";

export default function GardenLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthWall>
      <MembershipGate>
        <div className="relative z-10" style={{ position: 'relative' }}>
          {children}
        </div>
      </MembershipGate>
    </AuthWall>
  );
}
