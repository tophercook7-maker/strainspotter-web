import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-black text-white p-8">
      <div className="max-w-xl text-center">
        <h1 className="text-6xl font-extrabold mb-4">404</h1>
        <p className="text-white/70 mb-6">Page not found — looks like this path doesn't exist.</p>
        <div className="space-x-4">
          <Link href="/garden" className="inline-block rounded-lg bg-green-500 px-5 py-3 font-semibold text-black">Go to Garden</Link>
          <Link href="/" className="inline-block rounded-lg border border-white/20 px-4 py-3">Home</Link>
        </div>
      </div>
    </main>
  );
}
