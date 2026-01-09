"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function EntryPage() {
  const router = useRouter();
  const [confirmed, setConfirmed] = useState(false);

  if (!confirmed) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-black text-white px-6">
        <h1 className="text-4xl font-bold mb-4">StrainSpotter</h1>
        <p className="text-white/70 text-center max-w-md mb-6">
          This experience is intended for adults 21 years of age or older.
        </p>
        <button
          onClick={() => setConfirmed(true)}
          className="px-6 py-3 rounded-lg bg-green-600 hover:bg-green-500 font-semibold"
        >
          I am 21 or older
        </button>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-black text-white px-6">
      <h2 className="text-3xl font-bold mb-8">Welcome</h2>
      <div className="flex flex-col sm:flex-row gap-6">
        <button
          onClick={() => router.push('/scan')}
          className="px-8 py-4 rounded-xl bg-green-600 hover:bg-green-500 text-lg font-semibold"
        >
          Scan
        </button>
        <button
          onClick={() => router.push('/garden')}
          className="px-8 py-4 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur text-lg font-semibold"
        >
          Enter the Garden
        </button>
      </div>
    </main>
  );
}
