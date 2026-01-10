"use client";

export default function DispensaryFinderPage() {
  const openMaps = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          window.open(
            `https://www.google.com/maps/search/cannabis+dispensary/@${latitude},${longitude},14z`,
            "_blank"
          );
        },
        () => {
          window.open(
            "https://www.google.com/maps/search/cannabis+dispensary+near+me",
            "_blank"
          );
        }
      );
    } else {
      window.open(
        "https://www.google.com/maps/search/cannabis+dispensary+near+me",
        "_blank"
      );
    }
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "black",
        color: "#E6FFE6",
        padding: "4rem 1rem",
        fontFamily: "system-ui, sans-serif",
        textAlign: "center",
      }}
    >
      <h1 style={{ fontSize: "2.2rem", marginBottom: "1rem" }}>
        🏪 Dispensary Finder
      </h1>

      <p style={{ maxWidth: 680, margin: "0 auto 2.5rem", opacity: 0.85 }}>
        Find licensed dispensaries near you using trusted public listings.
        No tracking. No recommendations. Just access.
      </p>

      <button
        onClick={openMaps}
        style={{
          background: "#22c55e",
          color: "black",
          padding: "0.9rem 1.6rem",
          fontSize: "1rem",
          borderRadius: 10,
          border: "none",
          cursor: "pointer",
          fontWeight: 600,
        }}
      >
        Open Nearby Dispensaries
      </button>

      <div style={{ marginTop: "3rem", opacity: 0.5 }}>
        Status: External lookup active
      </div>
    </main>
  );
}
