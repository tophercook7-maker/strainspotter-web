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
    <div className="w-full border-b border-white/10 bg-black/40 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-xl items-center gap-3 px-4 py-3">
        {showBack && (
        <button
          onClick={() => router.back()}
          className="text-white/70 hover:text-white transition"
          aria-label="Go back"
        >
          ←
        </button>
        )}

        <h1 className="text-white text-lg font-semibold tracking-tight">
          {title}
        </h1>
      </div>
    </div>
  );
}
