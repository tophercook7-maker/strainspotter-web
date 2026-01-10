export default function HomePage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "black",
        color: "#00ff88",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "system-ui, sans-serif",
        textAlign: "center",
      }}
    >
      <h1 style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>
        StrainSpotter AI
      </h1>

      <p style={{ opacity: 0.85, marginBottom: "2rem" }}>
        First deploy locked. Routing confirmed.
      </p>

      <a
        href="/garden"
        style={{
          padding: "12px 24px",
          border: "1px solid #00ff88",
          color: "#00ff88",
          textDecoration: "none",
          borderRadius: "6px",
        }}
      >
        Enter the Garden
      </a>
    </main>
  );
}
