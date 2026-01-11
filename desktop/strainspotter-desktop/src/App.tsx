import "./App.css";

function App() {
  return (
    <div style={{
      background: "black",
      color: "white",
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: "16px"
    }}>
      <h1 style={{ color: "#22c55e" }}>
        🌱 StrainSpotter Desktop — The Garden
      </h1>

      <p style={{ opacity: 0.7 }}>
        Desktop Garden shell online.
      </p>

      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "12px",
        marginTop: "20px"
      }}>
        <button>🌿 Strain Browser</button>
        <button>📸 Scanner</button>
        <button>🕓 History</button>
        <button>🌞 Grow Coach</button>
        <button disabled>🏪 Dispensaries</button>
        <button disabled>🌰 Seed Vendors</button>
      </div>
    </div>
  );
}

export default App;
