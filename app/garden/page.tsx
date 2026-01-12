"use client";

export default function GardenPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        width: "100vw",
        backgroundImage: "url('/garden-bg.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        paddingTop: "64px",
      }}
    >
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
      <h1 style={{ fontSize: 56, fontWeight: 700, marginBottom: 12 }}>
        The Garden
      </h1>

      {/* ICON GRID */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 160px)",
          gap: 48,
          marginTop: 48,
        }}
      >
        {[
          "Strain Browser",
          "Scanner",
          "History",
          "Grow Coach",
          "Dispensaries",
          "Seed Vendors",
          "Favorites",
          "Learn",
          "Settings",
        ].map((label) => (
          <button
            key={label}
            style={{
              width: 160,
              height: 160,
              borderRadius: 32,
              background: "rgba(255,255,255,0.25)",
              backdropFilter: "blur(18px)",
              border: "1px solid rgba(255,255,255,0.4)",
              fontSize: 16,
              fontWeight: 600,
            }}
          >
            {label}
          </button>
        ))}
      </div>
    </main>
  );
}
