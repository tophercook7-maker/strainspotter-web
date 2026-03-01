"use client";

import Link from "next/link";

export default function BackHomeNav() {
  return (
    <div className="flex items-center justify-between gap-3">
      <button
        type="button"
        onClick={() => window.history.back()}
        className="inline-flex items-center gap-2 rounded-lg bg-white/15 px-3 py-2 text-sm font-medium text-white hover:bg-white/25 transition-colors"
      >
        ← Back
      </button>

      <Link
        href="/home"
        className="inline-flex items-center gap-2 rounded-lg bg-white/15 px-3 py-2 text-sm font-medium text-white hover:bg-white/25 transition-colors"
      >
        Home
      </Link>
    </div>
  );
}
