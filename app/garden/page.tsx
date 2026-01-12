"use client";

import Image from "next/image";

const BUTTONS = [
  { label: "Strain Browser", icon: "🌿" },
  { label: "Scanner", icon: "📷" },
  { label: "History", icon: "📜" },
  { label: "Grow Coach", icon: "🌱" },
  { label: "Dispensaries", icon: "🏪" },
  { label: "Seed Vendors", icon: "🌰" },
];

export default function GardenPage() {
  return (
    <main className="relative min-h-screen text-white overflow-hidden">
      {/* BACKGROUND */}
      <Image
        src="/garden-bg.jpg"
        alt="Garden background"
        fill
        priority
        className="object-cover -z-10"
      />

      {/* PAGE CONTENT */}
      <div
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
          paddingTop: "96px",
          paddingBottom: "140px",
          paddingLeft: "24px",
          paddingRight: "24px",
        }}
      >
        {/* HERO (REAL IMAGE, NO BLUR CIRCLE) */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginBottom: "96px",
          }}
        >
          <Image
            src="/hero.png"   // must exist in /public
            alt="Hero"
            width={180}
            height={180}
            priority
            style={{
              borderRadius: "999px",
              boxShadow: "0 30px 90px rgba(0,0,0,0.7)",
            }}
          />
        </div>

        {/* ICON GRID */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "120px",
            justifyItems: "center",
          }}
        >
          {BUTTONS.map((b) => (
            <button
              key={b.label}
              style={{
                width: "200px",
                height: "200px",
                borderRadius: "32px",
                background: "rgba(255,255,255,0.14)",
                backdropFilter: "blur(28px)",
                WebkitBackdropFilter: "blur(28px)",
                border: "1px solid rgba(255,255,255,0.25)",
                boxShadow: "0 40px 120px rgba(0,0,0,0.85)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <div style={{ fontSize: "56px", marginBottom: "16px" }}>
                {b.icon}
              </div>
              <div
                style={{
                  fontSize: "16px",
                  fontWeight: 600,
                  opacity: 0.95,
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
