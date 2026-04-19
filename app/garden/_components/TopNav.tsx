"use client";

import { useRouter } from "next/navigation";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";

export default function TopNav({
  title = "The Garden",
  showBack = true,
}: {
  title?: string;
  showBack?: boolean;
}) {
  const router = useRouter();

  return (
    <div className="sticky top-0 z-50 w-full flex items-center gap-3 px-4 py-3 border-b border-white/10 bg-black/50 backdrop-blur-md">
      {showBack && (
        <button
          onClick={() => router.back()}
          className="flex items-center justify-center w-8 h-8 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition"
          aria-label="Go back"
        >
          <ArrowBackIosNewIcon sx={{ fontSize: 16 }} />
        </button>
      )}

      <h1 className="text-white text-lg font-semibold tracking-tight">
        {title}
      </h1>
    </div>
  );
}
