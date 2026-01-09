'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    // Temporary hard redirect to verify routing
    router.replace('/garden');
  }, [router]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-black text-white">
      <p className="text-sm opacity-70">Routing confirmed. Redirecting…</p>
    </main>
  );
}
