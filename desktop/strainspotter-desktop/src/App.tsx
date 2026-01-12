/* eslint-disable @next/next/no-img-element */
import "./App.css";

type GardenButton = {
  label: string;
  icon: string;
};

const BUTTONS: GardenButton[] = [
  { label: "Strains", icon: "🌿" },
  { label: "Dispensaries", icon: "📍" },
  { label: "Seed Vendors", icon: "🌱" },
  { label: "My Stash", icon: "🫙" },
  { label: "Grow Log", icon: "🗓️" },
  { label: "Terpenes", icon: "🧪" },
  { label: "Effects", icon: "✨" },
  { label: "Favorites", icon: "⭐" },
  { label: "Settings", icon: "⚙️" },
];

export default function App() {
  return (
    <main className="relative min-h-screen text-white overflow-hidden">
      {/* BACKGROUND */}
      <div className="absolute inset-0 -z-10">
        <img
          src="/garden-bg.jpg"
          alt="Garden background"
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-black/60" />
        <div className="absolute inset-0 backdrop-blur-[2px]" />
      </div>

      {/* CONTENT */}
      <div className="mx-auto max-w-4xl px-6 pt-10 pb-14">
        {/* HERO */}
        <div className="flex flex-col items-center text-center mb-10">
          <div className="relative h-28 w-28 rounded-full overflow-hidden ring-1 ring-white/20 shadow-lg">
            <img
              src="/hero.png"
              alt="Hero"
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-white/10" />
          </div>

          <h1 className="mt-5 text-4xl font-extrabold tracking-tight">
            The Garden
          </h1>
          <p className="mt-2 text-white/70 max-w-md">
            Your personal cannabis ecosystem.
          </p>
        </div>

        {/* GLASS PANEL */}
        <section className="mx-auto max-w-3xl rounded-3xl border border-white/15 bg-white/10 backdrop-blur-2xl shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
          <div className="p-6">
            <div className="grid grid-cols-3 gap-6">
              {BUTTONS.map((b) => (
                <button
                  key={b.label}
                  className="
                    relative flex flex-col items-center justify-center
                    rounded-2xl border border-white/15
                    bg-white/10 backdrop-blur-xl
                    min-h-[130px]
                    shadow-[0_10px_30px_rgba(0,0,0,0.4)]
                    hover:bg-white/15 hover:border-white/25
                    active:scale-[0.98]
                    transition
                  "
                >
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-white/20 to-transparent opacity-70" />
                  <div className="relative text-4xl">{b.icon}</div>
                  <div className="relative mt-3 text-sm font-semibold tracking-wide">
                    {b.label}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
