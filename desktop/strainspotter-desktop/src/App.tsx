import "./App.css";

function App() {
  return (
    <main
      style={{
        minHeight: "100vh",
        backgroundColor: "#000",
        color: "#22c55e",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <h1 style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>
          🌱 StrainSpotter AI
        </h1>

        <p style={{ opacity: 0.8, marginBottom: "1.5rem" }}>
          Garden shell online
        </p>

        <div
          style={{
            padding: "1rem 1.5rem",
            border: "1px solid #22c55e33",
            borderRadius: "12px",
            background: "#22c55e0a",
          }}
        >
          Desktop app is stable.
          <br />
          Features will be enabled step by step.
        </div>
      </div>
    </main>
  );
}

export default App;
