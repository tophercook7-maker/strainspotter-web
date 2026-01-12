"use client";

import Image from "next/image";

const BUTTONS = [
  { label: "Strain Browser", icon: "🌿" },
  { label: "Scanner", icon: "📷" },
  { label: "History", icon: "📜" },
  { label: "Grow Coach", icon: "🌱" },
  { label: "Dispensaries", icon: "🏪" },
  { label: "Seed Vendors", icon: "🌰" },
  { label: "Journal", icon: "📓" },
  { label: "Learn", icon: "📘" },
  { label: "Settings", icon: "⚙️" },
];

export default function GardenPage() {
  return (
    <main className="relative min-h-screen text-white">
      {/* BACKGROUND */}
      <Image
        src="/garden-bg.jpg"
        alt="Garden background"
        fill
        priority
        className="object-cover -z-10"
      />

      {/* CONTENT */}
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          paddingTop: "80px",
          paddingBottom: "160px",
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
            width={160}
            height={160}
            priority
            style={{
              borderRadius: "999px",
              boxShadow: "0 30px 90px rgba(0,0,0,0.75)",
            }}
          />
        </div>

        {/* GLASS BUTTON GRID */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "96px",
            justifyItems: "center",
          }}
        >
          {BUTTONS.map((b) => (
            <button
              key={b.label}
              style={{
                width: "180px",
                height: "180px",
                borderRadius: "28px",
                background: "rgba(255,255,255,0.14)",
                backdropFilter: "blur(30px)",
                WebkitBackdropFilter: "blur(30px)",
                border: "1px solid rgba(255,255,255,0.25)",
                boxShadow: "0 40px 120px rgba(0,0,0,0.85)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <div style={{ fontSize: "48px", marginBottom: "14px" }}>
                {b.icon}
              </div>
              <div
                style={{
                  fontSize: "15px",
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
