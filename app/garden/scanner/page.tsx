export default function ScannerPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "black",
        color: "#7CFFB2",
        padding: "4rem 1rem",
        fontFamily: "system-ui, sans-serif",
        textAlign: "center",
      }}
    >
      <h1 style={{ fontSize: "2.2rem", marginBottom: "1rem" }}>
        📷 Scanner
      </h1>

      <p style={{ maxWidth: 640, margin: "0 auto", opacity: 0.85 }}>
        The StrainSpotter AI scanner is preparing its visual recognition
        system. Soon, you’ll be able to scan flower, packaging, or labels
        for observational insights.
      </p>

      <div
        style={{
          margin: "3rem auto",
          width: 240,
          height: 240,
          border: "2px dashed #7CFFB2",
          borderRadius: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: 0.6,
        }}
      >
        Camera offline
      </div>

      <div style={{ opacity: 0.6 }}>
        Status: Scanner UI online (standby)
      </div>
    </main>
  );
}
