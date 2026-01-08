export default function GardenPage() {
  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center">
      <h1 className="text-4xl font-bold mb-4">The Garden</h1>
      <p className="text-white/70 mb-8 text-center max-w-md">
        Your personal cannabis ecosystem.
      </p>

      <div className="grid grid-cols-2 gap-4">
        <a href="/scan" className="rounded-xl bg-white/10 px-4 py-3 text-center">
          Scan a Plant
        </a>
        <a href="/garden/chat" className="rounded-xl bg-white/10 px-4 py-3 text-center">
          Garden Chat
        </a>
        <a href="/garden/industry" className="rounded-xl bg-white/10 px-4 py-3 text-center">
          Industry Hub
        </a>
        <a href="/garden/sessions" className="rounded-xl bg-white/10 px-4 py-3 text-center">
          Session Journal
        </a>
      </div>
    </main>
  );
}
