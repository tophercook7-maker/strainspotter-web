export default function GardenPage() {
  const buttons = [
    { label: "Strain Browser", path: "/garden/strains" },
    { label: "Scanner", path: "/garden/scanner" },
    { label: "History", path: "/garden/history" },
    { label: "Grow Coach", path: "/garden/grow-coach" },
    { label: "Dispensary Finder", path: "/garden/dispensaries" },
    { label: "Seed Vendors", path: "/garden/seed-vendors" },
  ];

  return (
    <main className="min-h-screen bg-black text-green-400 flex flex-col items-center py-16 px-4">
      <h1 className="text-4xl font-bold mb-10">The Garden</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-xl">
        {buttons.map((b) => (
          <a
            key={b.label}
            href={b.path}
            className="border border-green-500/40 rounded-xl py-6 text-center hover:bg-green-500/10 transition"
          >
            {b.label}
          </a>
        ))}
      </div>
    </main>
  );
}
