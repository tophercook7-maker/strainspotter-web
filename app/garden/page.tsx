"use client";

const BUTTONS = [
  { label: "Strain Browser", icon: "🌿" },
  { label: "Scanner", icon: "📷" },
  { label: "History", icon: "📜" },
  { label: "Grow Coach", icon: "🌱" },
  { label: "Dispensaries", icon: "🏪" },
  { label: "Seed Vendors", icon: "🌰" },
  { label: "Favorites", icon: "⭐" },
  { label: "Learn", icon: "📚" },
  { label: "Settings", icon: "⚙️" },
];

export default function GardenPage() {
  return (
    <main
      className="relative min-h-screen w-full overflow-y-auto text-white"
      style={{
        backgroundImage: "url('/garden-bg.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="relative z-10 flex flex-col items-center px-6 py-16">
        {/* HERO */}
        <div
          style={{
            width: 220,
            height: 220,
            borderRadius: "50%",
            backgroundImage: "url('/brand/core/hero.png')",
            backgroundSize: "cover",
            backgroundPosition: "center",
            marginBottom: 24,
          }}
        />

        {/* TITLE */}
        <h1 className="text-5xl font-bold drop-shadow mb-3">The Garden</h1>

        {/* ICON GRID */}
        <div className="mt-10 grid grid-cols-3 gap-10 sm:grid-cols-3 md:grid-cols-4 max-w-4xl mx-auto">
          {BUTTONS.map((b) => (
            <button
              key={b.label}
              className="
  flex flex-col items-center justify-center
  w-32 h-32
  rounded-3xl
  bg-white/20
  backdrop-blur-xl
  shadow-xl
  border border-white/30
  text-white
  hover:bg-white/30
  transition
"
            >
              <div className="text-4xl mb-2">{b.icon}</div>
              <div className="text-sm font-semibold tracking-wide text-white/90">
                {b.label}
              </div>
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
