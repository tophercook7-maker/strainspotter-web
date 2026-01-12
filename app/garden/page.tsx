"use client";

export default function GardenPage() {
  return (
    <main
      style={{
        minHeight: "200vh",
        width: "100vw",
        background: "linear-gradient(135deg, #0f0 0%, #050 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        paddingTop: "120px",
        color: "white",
      }}
    >
      <div
        style={{
          width: 220,
          height: 220,
          borderRadius: "50%",
          background: "black",
          border: "6px solid #00ff66",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 64,
          marginBottom: 40,
        }}
      >
        🌿
      </div>

      <h1 style={{ fontSize: 64, fontWeight: 900, marginBottom: 80 }}>
        THE GARDEN
      </h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 80,
        }}
      >
        {[
          "Strains",
          "Dispensaries",
          "Seed Vendors",
          "Grow Coach",
          "Journal",
          "Learn",
          "Community",
          "Profile",
          "Settings",
        ].map((label) => (
          <div
            key={label}
            style={{
              width: 180,
              height: 180,
              borderRadius: 36,
              background: "rgba(255,255,255,0.25)",
              backdropFilter: "blur(20px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 20,
              fontWeight: 700,
              boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
            }}
          >
            {label}
          </div>
        ))}
      </div>
    </main>
  );
}
