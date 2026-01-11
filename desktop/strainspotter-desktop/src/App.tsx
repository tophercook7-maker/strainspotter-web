import { useState } from "react";

type View = "garden" | "strains" | "dispensaries" | "scanner" | "grow";

export default function App() {
  const [view, setView] = useState<View>("garden");

  return (
    <div style={styles.app}>
      <header style={styles.header}>
        <span style={styles.logo}>🌿 StrainSpotter AI</span>
        <nav style={styles.nav}>
          <NavButton label="Garden" onClick={() => setView("garden")} />
          <NavButton label="Strains" onClick={() => setView("strains")} />
          <NavButton label="Dispensaries" onClick={() => setView("dispensaries")} />
          <NavButton label="Scanner" onClick={() => setView("scanner")} />
          <NavButton label="Grow Coach" onClick={() => setView("grow")} />
        </nav>
      </header>

      <main style={styles.main}>
        {view === "garden" && <Screen title="Garden" />}
        {view === "strains" && <Screen title="Strain Browser" />}
        {view === "dispensaries" && <Screen title="Dispensary Finder" />}
        {view === "scanner" && <Screen title="Scanner" />}
        {view === "grow" && <Screen title="Grow Coach" />}
      </main>
    </div>
  );
}

function NavButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button style={styles.button} onClick={onClick}>
      {label}
    </button>
  );
}

function Screen({ title }: { title: string }) {
  return (
    <div style={styles.screen}>
      <h1 style={styles.title}>{title}</h1>
      <p style={styles.subtitle}>Module online.</p>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  app: {
    backgroundColor: "black",
    color: "#00ff88",
    height: "100vh",
    display: "flex",
    flexDirection: "column",
    fontFamily: "monospace",
  },
  header: {
    padding: "12px 16px",
    borderBottom: "1px solid #00ff8844",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  logo: {
    fontWeight: "bold",
  },
  nav: {
    display: "flex",
    gap: "8px",
  },
  button: {
    background: "black",
    color: "#00ff88",
    border: "1px solid #00ff8844",
    padding: "6px 10px",
    cursor: "pointer",
  },
  main: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  screen: {
    textAlign: "center",
  },
  title: {
    fontSize: "28px",
    marginBottom: "8px",
  },
  subtitle: {
    opacity: 0.7,
  },
};
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
