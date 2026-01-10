export default function GardenPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "black",
        color: "#7CFFB2",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "system-ui, sans-serif",
        textAlign: "center",
      }}
    >
      <h1 style={{ fontSize: "2.25rem", marginBottom: "1rem" }}>
        🌱 The Garden
      </h1>

      <p style={{ opacity: 0.85, maxWidth: 520 }}>
        This is your personal cannabis ecosystem.
        <br />
        Modules will grow here safely, one by one.
      </p>

      <div style={{ marginTop: "2rem", opacity: 0.6 }}>
        Status: Garden shell online
      </div>
    </main>
  );
}
