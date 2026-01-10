export default function HistoryPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "black",
        color: "#B8FFC8",
        padding: "4rem 1rem",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <h1 style={{ fontSize: "2.2rem", marginBottom: "1rem", textAlign: "center" }}>
        📜 Grow History
      </h1>

      <p style={{ textAlign: "center", opacity: 0.8, maxWidth: 720, margin: "0 auto 3rem" }}>
        This timeline will hold your scans, notes, observations, and measurements.
        Nothing is required. Everything is remembered.
      </p>

      <section style={{ maxWidth: 720, margin: "0 auto" }}>
        <div style={entryStyle}>
          <strong>Scan</strong>
          <div style={metaStyle}>No scans yet</div>
        </div>

        <div style={entryStyle}>
          <strong>Notes</strong>
          <div style={metaStyle}>No notes added</div>
        </div>

        <div style={entryStyle}>
          <strong>Measurements</strong>
          <div style={metaStyle}>No measurements recorded</div>
        </div>
      </section>

      <div style={{ textAlign: "center", marginTop: "3rem", opacity: 0.5 }}>
        Status: History shell online
      </div>
    </main>
  );
}

const entryStyle = {
  border: "1px solid rgba(184,255,200,0.25)",
  borderRadius: 10,
  padding: "1rem",
  marginBottom: "1rem",
};

const metaStyle = {
  fontSize: "0.85rem",
  opacity: 0.7,
  marginTop: "0.25rem",
};
