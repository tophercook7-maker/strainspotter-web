"use client";

import Image from "next/image";

export default function GardenPage() {
  return (
    <div
      style={{
        position: "relative",
        minHeight: "100vh",
        width: "100%",
        backgroundColor: "#000",
        overflow: "hidden",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont",
      }}
    >
      {/* BACKGROUND */}
      <Image
        src="/garden-bg.jpg"
        alt="Garden Background"
        fill
        priority
        style={{ objectFit: "cover" }}
      />

      {/* DARK OVERLAY */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.45)",
          backdropFilter: "blur(2px)",
        }}
      />

      {/* CONTENT */}
      <div
        style={{
          position: "relative",
          zIndex: 10,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
        }}
      >
        {/* HERO */}
        <div style={{ textAlign: "center", marginBottom: 60 }}>
          <div
            style={{
              width: 140,
              height: 140,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.2)",
              backdropFilter: "blur(18px)",
              border: "1px solid rgba(255,255,255,0.35)",
              margin: "0 auto 24px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 25px 70px rgba(0,0,0,0.6)",
            }}
          >
            <Image
              src="/hero.png"
              alt="Hero"
              width={80}
              height={80}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
          </div>

          <h1 style={{ fontSize: 48, fontWeight: 800 }}>The Garden</h1>
          <p style={{ marginTop: 12, opacity: 0.85 }}>
            Your personal cannabis ecosystem
          </p>
        </div>

        {/* BUTTON GRID */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 160px)",
            gap: "48px 64px",
          }}
        >
          {[
            ["🏪", "Dispensaries"],
            ["🌱", "Seed Vendors"],
            ["🧬", "Strains"],
            ["🌿", "My Garden"],
            ["🛠️", "Grow Tools"],
            ["📷", "Scanner"],
            ["📓", "Journal"],
            ["📚", "Learn"],
            ["⚙️", "Settings"],
          ].map(([icon, label]) => (
            <div
              key={label}
              style={{
                width: 160,
                height: 160,
                borderRadius: 28,
                background: "rgba(255,255,255,0.22)",
                backdropFilter: "blur(22px)",
                border: "1px solid rgba(255,255,255,0.35)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 35px 90px rgba(0,0,0,0.65)",
                cursor: "pointer",
                transition: "transform 0.25s ease",
              }}
            >
              <div style={{ fontSize: 42, marginBottom: 14 }}>{icon}</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
