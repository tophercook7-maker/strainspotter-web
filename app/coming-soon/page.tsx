import Link from "next/link";
import { GlassBackground } from "@/app/_components/GlassBackground";

export default function ComingSoonPage() {
  return (
    <main className="min-h-screen text-white">
      <GlassBackground />

      <div className="mx-auto w-full max-w-[720px] px-4 py-10 space-y-6">
        <div className="rounded-2xl border border-white/10 bg-black/25 backdrop-blur-md p-6">
          <h1 className="text-3xl font-semibold text-green-300">Coming soon</h1>
          <p className="mt-2 text-white/80">
            This section is on the roadmap. You can keep using the Garden and Scanner right now.
          </p>

          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/garden"
              className="inline-flex items-center justify-center rounded-xl bg-green-600 px-5 py-3 text-sm font-semibold text-white hover:bg-green-500 transition-colors"
            >
              Enter Garden
            </Link>

            <Link
              href="/garden/scanner"
              className="inline-flex items-center justify-center rounded-xl bg-white/15 px-5 py-3 text-sm font-semibold text-white hover:bg-white/25 transition-colors"
            >
              Scan
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
