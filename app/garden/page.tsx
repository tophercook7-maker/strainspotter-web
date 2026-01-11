"use client";

export default function GardenPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        backgroundColor: "black",
        color: "#4ade80",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont",
      }}
    >
      <h1 style={{ fontSize: "2.5rem", fontWeight: 700, marginBottom: "1rem" }}>
        🌱 The Garden
      </h1>
      <p style={{ fontSize: "1.1rem", opacity: 0.85 }}>Garden shell online.</p>
    </main>
  );
}
