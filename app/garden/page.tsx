export default function GardenPage() {
  const buttons = [
    "Strain Browser",
    "Scanner",
    "Grow Logs",
    "Grow Coach",
    "Garden Chat",
    "Dispensary Finder",
    "Seed Vendors",
    "My History",
    "Notes",
  ];

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "black",
        color: "#7CFFB2",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "4rem 1rem",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <h1 style={{ fontSize: "2.5rem", marginBottom: "2rem" }}>
        🌱 The Garden
      </h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "1rem",
          width: "100%",
          maxWidth: 720,
        }}
      >
        {buttons.map((label) => {
          if (label === "Strain Browser") {
            return (
              <a
                key={label}
                href="/garden/strains"
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <div
                  style={{
                    border: "1px solid rgba(124,255,178,0.4)",
                    borderRadius: 12,
                    padding: "1.25rem",
                    textAlign: "center",
                    opacity: 0.9,
                  }}
                >
                  {label}
                </div>
              </a>
            );
          }

          return (
            <div
              key={label}
              style={{
                border: "1px solid rgba(124,255,178,0.4)",
                borderRadius: 12,
                padding: "1.25rem",
                textAlign: "center",
                opacity: 0.9,
              }}
            >
              {label}
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: "3rem", opacity: 0.6 }}>
        Status: Garden map restored (visual only)
      </div>
    </main>
  );
}
