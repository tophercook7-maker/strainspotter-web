'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // TEMP: prove routing works, then redirect
    router.replace('/garden');
  }, [router]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-black text-white">
      <p>Routing confirmed. Redirecting…</p>
    </main>
  );
}
