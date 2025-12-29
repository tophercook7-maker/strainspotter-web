"use client";

import AuthWall from "@/components/AuthWall";

export default function GardenLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthWall>
      <div className="relative" style={{ position: 'relative', zIndex: 1 }}>
        {children}
      </div>
    </AuthWall>
  );
}
