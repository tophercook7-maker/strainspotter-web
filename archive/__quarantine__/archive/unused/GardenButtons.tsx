'use client';

import Link from 'next/link';

export function GardenButtons() {
  return (
    <div className="flex flex-col gap-4 mt-8">
      <Link
        href="/scanner-gate"
        className="w-full py-4 rounded-xl text-center text-lg font-semibold
        bg-gradient-to-r from-[#00ffae] to-[#0af2a5]
        text-black shadow-lg shadow-green-500/40 hover:scale-[1.02] 
        transition-all">
        Scan Now
      </Link>

      <Link
        href="/garden/features"
        className="w-full py-4 rounded-xl text-center text-lg font-semibold
        bg-black/60 border border-green-400/40 backdrop-blur-xl
        hover:border-green-300 hover:scale-[1.02] transition-all">
        Enter the Garden
      </Link>
    </div>
  );
}
