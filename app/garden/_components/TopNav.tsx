"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";

export default function TopNav({
  title = "The Garden",
  showBack = true,
}: {
  title?: string;
  showBack?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const goBack = () => {
    // router.back() is a dead end when the page was opened directly (deep
    // link, refresh, post-auth redirect) — no history means nothing happens
    // and the user is trapped. Fall back to the garden home.
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/garden");
    }
  };

  return (
    <div className="sticky top-0 z-50 w-full flex items-center gap-3 px-4 py-3 border-b border-white/10 bg-black/50 backdrop-blur-md">
      {showBack && (
        <button
          onClick={goBack}
          className="flex items-center justify-center w-8 h-8 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition"
          aria-label="Go back"
        >
          <ArrowBackIosNewIcon sx={{ fontSize: 16 }} />
        </button>
      )}

      <h1 className="text-white text-lg font-semibold tracking-tight">
        {title}
      </h1>

      {/* Always-available exit — no page is ever a dead end. */}
      {pathname !== "/garden" && (
        <Link
          href="/garden"
          aria-label="Garden home"
          className="ml-auto flex items-center justify-center w-8 h-8 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition text-[17px]"
        >
          🏡
        </Link>
      )}
    </div>
  );
}
