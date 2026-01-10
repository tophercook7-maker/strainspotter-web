export default function GardenPage() {
  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center px-4">
      <div className="max-w-lg w-full bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
        <h1 className="text-3xl font-bold mb-4">The Garden</h1>

        <p className="text-white/70">
          The Garden is temporarily locked while we stabilize the platform.
        </p>

        <p className="mt-4 text-green-400 font-mono text-sm">
          Status: Online • Locked
        </p>
      </div>
    </main>
  );
}
