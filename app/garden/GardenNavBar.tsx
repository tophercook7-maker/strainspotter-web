"use client";

const linkClass =
  "px-3 py-1.5 rounded-lg text-sm font-medium bg-white/15 text-white hover:bg-white/25 transition-colors";

export default function GardenNavBar() {
  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      <button
        onClick={() => window.history.back()}
        className={linkClass}
        type="button"
      >
        ← Back
      </button>

      <a href="/home" className={linkClass}>
        Home
      </a>

      <a href="/garden/plants" className={linkClass}>
        Plants
      </a>

      <a href="/garden/scanner" className={linkClass}>
        Scanner
      </a>

      <a href="/garden/history" className={linkClass}>
        Scan History
      </a>
    </div>
  );
}
