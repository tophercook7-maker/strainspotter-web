export default function StrainBrowserPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "black",
        color: "#7CFFB2",
        padding: "4rem 1rem",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <h1 style={{ fontSize: "2.2rem", marginBottom: "1rem" }}>
        🌿 Strain Browser
      </h1>

      <p style={{ maxWidth: 640, opacity: 0.85 }}>
        This section provides educational, observational information
        about commonly referenced cannabis strains. Descriptions are
        non-medical and based on aggregated public sources.
      </p>

      <ul style={{ marginTop: "2rem", lineHeight: 1.8 }}>
        <li>• Blue Dream — Often described as balanced and uplifting</li>
        <li>• OG Kush — Commonly associated with relaxation</li>
        <li>• Sour Diesel — Frequently noted for energetic effects</li>
      </ul>

      <div style={{ marginTop: "3rem", opacity: 0.6 }}>
        Status: Strain Browser online (read-only)
      </div>
    </main>
  );
}
