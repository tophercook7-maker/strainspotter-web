"use client";

import Image from "next/image";

const BUTTONS = [
  { label: "Strain Browser", icon: "🌿" },
  { label: "Scanner", icon: "📷" },
  { label: "History", icon: "📜" },
  { label: "Grow Coach", icon: "🌱" },
  { label: "Dispensaries", icon: "🏪" },
  { label: "Seed Vendors", icon: "🌰" },
  { label: "My Garden", icon: "🪴" },
  { label: "Insights", icon: "🧠" },
  { label: "Settings", icon: "⚙️" },
];

export default function GardenPage() {
  return (
    <main className="relative min-h-screen text-white overflow-hidden flex justify-center">
      {/* BACKGROUND */}
      <Image
        src="/garden-bg.jpg"
        alt="Garden background"
        fill
        priority
        className="object-cover -z-10"
      />

      {/* CONTENT WRAPPER (THIS SHRINKS THE PAGE) */}
      <div
        style={{
          maxWidth: "1200px",
          width: "100%",
          paddingTop: "80px",
          paddingBottom: "120px",
          paddingLeft: "24px",
          paddingRight: "24px",
        }}
      >
        {/* HERO */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginBottom: "80px",
          }}
        >
          <Image
            src="/hero.png"
            alt="Hero"
            width={220}
            height={220}
            style={{
              borderRadius: "999px",
              boxShadow: "0 40px 120px rgba(0,0,0,0.8)",
            }}
          />
        </div>

        {/* ICON GRID */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            columnGap: "160px",
            rowGap: "140px",
            justifyItems: "center",
          }}
        >
          {BUTTONS.map((b) => (
            <button
              key={b.label}
              style={{
                width: "240px",
                height: "240px",
                borderRadius: "36px",
                background: "rgba(255,255,255,0.18)",
                backdropFilter: "blur(30px)",
                WebkitBackdropFilter: "blur(30px)",
                border: "1px solid rgba(255,255,255,0.35)",
                boxShadow: "0 60px 160px rgba(0,0,0,0.85)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <div style={{ fontSize: "72px", marginBottom: "22px" }}>
                {b.icon}
              </div>
              <div
                style={{
                  fontSize: "18px",
                  fontWeight: 600,
                  letterSpacing: "0.3px",
                }}
              >
                {b.label}
              </div>
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
