export default function GrowCoachPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "black",
        color: "#E6FFE6",
        padding: "4rem 1rem",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <h1 style={{ fontSize: "2.2rem", marginBottom: "1rem", textAlign: "center" }}>
        🌿 Grow Coach
      </h1>

      <p style={{ textAlign: "center", opacity: 0.85, maxWidth: 760, margin: "0 auto 2.5rem" }}>
        The Grow Coach observes patterns across your scans, notes, and history.
        It speaks only when asked, and never replaces your judgment.
      </p>

      <section style={{ maxWidth: 760, margin: "0 auto" }}>
        <div style={card}>
          <strong>What you can ask</strong>
          <ul style={list}>
            <li>“What patterns do you notice so far?”</li>
            <li>“Does anything look off?”</li>
            <li>“What should I keep an eye on?”</li>
          </ul>
        </div>

        <div style={card}>
          <strong>How it works</strong>
          <p style={copy}>
            The Grow Coach does not diagnose. It highlights trends,
            changes over time, and areas that may deserve attention.
          </p>
        </div>

        <div style={card}>
          <strong>Status</strong>
          <p style={copy}>
            AI engine not yet connected. This guide will activate once
            sufficient history exists.
          </p>
        </div>
      </section>

      <div style={{ textAlign: "center", marginTop: "3rem", opacity: 0.5 }}>
        Status: Grow Coach shell online
      </div>
    </main>
  );
}

const card = {
  border: "1px solid rgba(230,255,230,0.25)",
  borderRadius: 12,
  padding: "1.25rem",
  marginBottom: "1.25rem",
};

const list = {
  marginTop: "0.75rem",
  paddingLeft: "1.25rem",
  opacity: 0.9,
};

const copy = {
  marginTop: "0.5rem",
  opacity: 0.85,
};
