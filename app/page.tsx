"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';

"use client";

export const dynamic = "force-dynamic";

export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-black text-white">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold">StrainSpotter</h1>
        <p className="text-white/70">
          Routing confirmed. App is live.
        </p>
        <a
          href="/garden"
          className="inline-block px-6 py-3 rounded-lg bg-green-600 hover:bg-green-500 transition"
        >
          Enter the Garden
        </a>
      </div>
    </main>
  );
}
