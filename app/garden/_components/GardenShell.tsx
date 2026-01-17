"use client";

import { ReactNode } from "react";

export default function GardenShell({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen w-full flex flex-col items-center text-white">
      {children}
    </main>
  );
}
