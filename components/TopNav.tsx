"use client";

import { useRouter } from "next/navigation";

export default function TopNav({
  title = "The Garden",
  showBack = true,
}: {
  title?: string;
  showBack?: boolean;
}) {
  const router = useRouter();

  return (
    <div className="w-full flex items-center gap-3 px-4 py-3 border-b border-white/10 bg-black/40 backdrop-blur-md">
      {showBack && (
        <button
          onClick={() => router.back()}
          className="text-white/70 hover:text-white transition"
          aria-label="Go back"
        >
          ←
        </button>
      )}

      <img
        src="/brand/strainspotter-logo.png"
        alt=""
        className="h-8 w-8 rounded-full object-cover shadow-md shadow-green-500/20"
      />

      <h1 className="text-white text-lg font-semibold tracking-tight">
        {title}
      </h1>
    </div>
  );
}
