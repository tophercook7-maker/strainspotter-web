"use client";

import Link from "next/link";

export default function GardenBottomBar() {
  const btn =
    "flex-1 text-center px-3 py-2 rounded-lg text-sm font-medium bg-white/15 text-white hover:bg-white/25 transition-colors";

  return (
    <div className="fixed bottom-3 left-0 right-0 z-50 px-3">
      <div className="mx-auto w-full max-w-[900px] rounded-2xl border border-white/10 bg-black/55 backdrop-blur-md p-2 flex gap-2">
        <button className={btn} onClick={() => window.history.back()} type="button">
          Back
        </button>
        <Link className={btn} href="/home">
          Home
        </Link>
        <Link className={btn} href="/garden/plants">
          Plants
        </Link>
        <Link className={btn} href="/garden/scanner">
          Scan
        </Link>
        <Link className={btn} href="/garden/history">
          History
        </Link>
        <Link className={btn} href="/garden/scraper-status">
          Scraper
        </Link>
      </div>
    </div>
  );
}
