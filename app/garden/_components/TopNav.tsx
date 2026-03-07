"use client";

import { useRouter } from "next/navigation";

export default function TopNav({
  title = "StrainSpotter",
  showBack = true,
}: {
  title?: string;
  showBack?: boolean;
}) {
  const router = useRouter();

  return (
    <div
      className="w-full backdrop-blur-md"
      style={{
        background: "rgba(5, 8, 5, 0.92)",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <div className="mx-auto flex w-full max-w-xl items-center gap-4 px-4 py-3.5">
        {showBack && (
          <button
            onClick={() => router.back()}
            className="text-white/80 hover:text-white text-sm font-medium transition-colors -ml-1 min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Go back"
          >
            ←
          </button>
        )}
        <h1 className="text-white text-lg font-semibold tracking-tight flex-1">
          {title}
        </h1>
      </div>
    </div>
  );
}
