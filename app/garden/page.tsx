export default function GardenPage() {
  const items = [
    { label: "Strain Browser", path: "/garden/strains", icon: "🌿" },
    { label: "Scanner", path: "/garden/scanner", icon: "📷" },
    { label: "History", path: "/garden/history", icon: "🕘" },
    { label: "Grow Coach", path: "/garden/grow-coach", icon: "🧑‍🌾" },
    { label: "Dispensary Finder", path: "/garden/dispensaries", icon: "🏪" },
    { label: "Seed Vendors", path: "/garden/seed-vendors", icon: "🌱" },
  ];

  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center px-4 py-16">
      
      {/* HERO */}
      <div className="flex flex-col items-center mb-16">
        <div className="w-28 h-28 rounded-full bg-green-600/20 flex items-center justify-center mb-6 backdrop-blur">
          <span className="text-green-400 text-5xl">🍃</span>
        </div>

        <h1 className="text-5xl font-extrabold mb-3">The Garden</h1>

        <p className="text-white/70 text-center max-w-xl">
          Your personal cannabis ecosystem — calm, grounded, and built on supported truth.
        </p>
      </div>

      {/* GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-3xl">
        {items.map((item) => (
          <a
            key={item.label}
            href={item.path}
            className="group relative rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl px-6 py-8 hover:border-green-400/40 hover:bg-green-500/10 transition-all"
          >
            <div className="flex items-center gap-4">
              <span className="text-3xl">{item.icon}</span>
              <span className="text-xl font-semibold">{item.label}</span>
            </div>

            <div className="absolute inset-0 rounded-2xl ring-1 ring-white/5 group-hover:ring-green-400/30 transition"></div>
          </a>
        ))}
      </div>

    </main>
  );
}
