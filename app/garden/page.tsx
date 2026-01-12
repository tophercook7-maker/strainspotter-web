"use client";

import Image from "next/image";

const BUTTONS = [
  "Strain Browser",
  "Scanner",
  "History",
  "Grow Coach",
  "Dispensaries",
  "Seed Vendors",
  "Favorites",
  "Learn",
  "Settings",
];

export default function GardenPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        width: "100vw",
        position: "relative",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        paddingTop: 80,
        color: "white",
      }}
    >
      {/* BACKGROUND */}
      <Image
        src="/garden-bg.jpg"
        alt="Garden Background"
        fill
        priority
        style={{ objectFit: "cover", zIndex: -2 }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.35)",
          zIndex: -1,
        }}
      />

      {/* HERO */}
      <div
        style={{
          width: 220,
          height: 220,
          borderRadius: "50%",
          border: "6px solid #00ff66",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 24,
          background: "black",
        }}
      >
        <Image
          src="/brand/core/hero.png"
          alt="Hero"
          width={160}
          height={160}
          style={{ objectFit: "contain" }}
        />
      </div>

      {/* TITLE */}
      <h1
        style={{
          fontSize: 56,
          fontWeight: 900,
          marginBottom: 60,
          textShadow: "0 4px 20px rgba(0,0,0,0.6)",
        }}
      >
        The Garden
      </h1>

      {/* ICON GRID */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 72,
          paddingBottom: 120,
        }}
      >
        {BUTTONS.map((label) => (
          <div
            key={label}
            style={{
              width: 180,
              height: 180,
              borderRadius: 36,
              background: "rgba(255,255,255,0.22)",
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
              boxShadow: "0 25px 45px rgba(0,0,0,0.45)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 20,
              fontWeight: 700,
              textAlign: "center",
            }}
          >
            {label}
          </div>
        ))}
      </div>
    </main>
  );
}
