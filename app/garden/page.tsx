import Link from "next/link";

type GardenButton = {
  label: string;
  icon: string;
  href?: string;
  disabled?: boolean;
};

const BUTTONS: GardenButton[] = [
  { label: "Strain Browser", icon: "🌿", href: "/garden/strains" },
  { label: "Scanner", icon: "📷", href: "/garden/scanner" },
  { label: "History", icon: "🧾", href: "/garden/history" },
  { label: "Grow Coach", icon: "🌱", href: "/garden/grow-coach" },
  { label: "Dispensaries", icon: "🏪", href: "/garden/dispensaries" },
  { label: "Seed Vendors", icon: "🫘", href: "/garden/seeds" },
  { label: "Lab Results", icon: "🧪", href: "/garden/labs" },
  { label: "Community", icon: "👥", href: "/garden/community" },
  { label: "Settings", icon: "⚙️", href: "/garden/settings" },
];

export default function GardenPage() {
  return (
    <main
      className="relative min-h-screen text-white overflow-hidden"
      style={{
        backgroundImage: "url(/garden-bg.jpg)",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* Soft dark overlay (NO black header block) */}
      <div className="absolute inset-0 bg-black/35" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-black/10 to-black/55" />

      {/* Content */}
      <div className="relative mx-auto max-w-5xl px-6 py-10">
        {/* Top cluster */}
        <div className="flex flex-col items-center text-center gap-4">
          {/* HERO (use plain img so it ALWAYS renders) */}
          <div className="h-24 w-24 md:h-28 md:w-28 rounded-full overflow-hidden ring-1 ring-white/25 shadow-2xl bg-black/20 backdrop-blur">
            <img
              src="/brand/hero.png"
              alt="Hero"
              className="h-full w-full object-cover"
              loading="eager"
            />
          </div>

          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight drop-shadow">
            The Garden
          </h1>
          <p className="text-white/80 max-w-xl">
            Your personal cannabis ecosystem — calm, grounded, and built on supported truth.
          </p>
        </div>

        {/* Glass panel wrapper (shrinks page + keeps UI centered) */}
        <div className="mt-8 md:mt-10 rounded-3xl border border-white/15 bg-black/25 backdrop-blur-2xl shadow-[0_20px_80px_-20px_rgba(0,0,0,0.8)]">
          <div className="p-6 md:p-10">
            {/* ICON GRID — BIG, SEPARATED, GLASSY */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-7 md:gap-10">
              {BUTTONS.map((b) => {
                const inner = (
                  <div
                    className={[
                      "group w-full rounded-3xl",
                      "border border-white/15",
                      "bg-white/10 backdrop-blur-xl",
                      "shadow-[0_12px_40px_-18px_rgba(0,0,0,0.85)]",
                      "transition transform-gpu",
                      "hover:bg-white/14 hover:border-white/25 hover:-translate-y-0.5",
                      "active:translate-y-0",
                      b.disabled ? "opacity-45 cursor-not-allowed pointer-events-none" : "",
                    ].join(" ")}
                  >
                    <div className="flex flex-col items-center justify-center h-[140px] md:h-[160px] gap-3">
                      <div className="text-3xl md:text-4xl drop-shadow">
                        {b.icon}
                      </div>
                      <div className="text-sm md:text-base font-semibold tracking-wide text-white/90">
                        {b.label}
                      </div>
                    </div>
                  </div>
                );

                if (b.href && !b.disabled) {
                  return (
                    <Link key={b.label} href={b.href} className="block">
                      {inner}
                    </Link>
                  );
                }

                return (
                  <div key={b.label} className="block">
                    {inner}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bottom breathing room */}
        <div className="h-10" />
      </div>
    </main>
  );
}
