"use client";

import Image from "next/image";

const BUTTONS = [
  { label: "Strain Browser", icon: "🌿" },
  { label: "Scanner", icon: "📷" },
  { label: "Dispensaries", icon: "🏪" },
  { label: "Seed Vendors", icon: "🌱" },
  { label: "Grow Coach", icon: "🧠" },
  { label: "History", icon: "📜" },
  { label: "Lab Results", icon: "🧪" },
  { label: "Community", icon: "💬" },
  { label: "Settings", icon: "⚙️" },
];

export default function GardenPage() {
  return (
    <main className="relative min-h-screen overflow-hidden text-white">
      {/* BACKGROUND */}
      <Image
        src="/garden-bg.jpg"
        alt="Garden background"
        fill
        priority
        className="object-cover"
      />

      {/* OVERLAY */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" />

      {/* CONTENT */}
      <div className="relative z-10 flex flex-col items-center px-8 py-24">
        {/* HERO */}
        <div className="mb-20 flex flex-col items-center">
          <div className="relative w-48 h-48 rounded-full overflow-hidden border border-green-400/40 shadow-[0_0_80px_rgba(34,197,94,0.35)] mb-10">
            <Image
              src="/hero.jpg"
              alt="Hero"
              fill
              className="object-cover"
            />
          </div>

          <h1 className="text-6xl font-extrabold tracking-tight mb-4">
            The Garden
          </h1>

          <p className="text-white/70 text-center max-w-xl text-lg">
            Your personal cannabis ecosystem — calm, grounded, and built on supported truth.
          </p>
        </div>

        {/* GLASS ICON GRID */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            columnGap: "200px",
            rowGap: "160px",
            marginTop: "120px",
          }}
        >
          {BUTTONS.map((b) => (
            <button
              key={b.label}
              style={{
                width: "260px",
                height: "260px",
                borderRadius: "40px",
                background: "rgba(255,255,255,0.18)",
                backdropFilter: "blur(28px)",
                border: "1px solid rgba(255,255,255,0.35)",
                boxShadow: "0 60px 160px rgba(0,0,0,0.8)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontSize: "18px",
                cursor: "pointer",
              }}
            >
              <div style={{ fontSize: "72px", marginBottom: "24px" }}>
                {b.icon}
              </div>
              <div>{b.label}</div>
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
