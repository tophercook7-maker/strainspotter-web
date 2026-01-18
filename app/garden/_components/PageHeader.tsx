// app/garden/_components/PageHeader.tsx
// 🔒 UI.2 — SINGLE SOURCE HEADER (DO NOT INLINE BUTTONS)

"use client";

import { useRouter } from "next/navigation";

interface PageHeaderProps {
  title: string;
  showBack?: boolean;
}

export default function PageHeader({ title, showBack = true }: PageHeaderProps) {
  const router = useRouter();

  return (
    <header className="flex items-center gap-4 mb-6">
      {showBack && (
        <button
          onClick={() => router.push("/garden")}
          className="flex items-center justify-center w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 transition"
          aria-label="Back to Garden"
        >
          ←
        </button>
      )}
      <h1 className="text-3xl font-bold">{title}</h1>
    </header>
  );
}
