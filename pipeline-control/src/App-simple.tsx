import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";

function App() {
  const [message, setMessage] = useState("Ready");

  const handleStart = async () => {
    alert("START BUTTON CLICKED!");
    try {
      const result = await invoke("start_scraper");
      alert(`Result: ${result}`);
      setMessage(result as string);
    } catch (error: any) {
      alert(`Error: ${error.message || error}`);
      setMessage(`Error: ${error.message || error}`);
    }
  };

  const handleStop = async () => {
    alert("STOP BUTTON CLICKED!");
    try {
      const result = await invoke("stop_scraper");
      alert(`Result: ${result}`);
      setMessage(result as string);
    } catch (error: any) {
      alert(`Error: ${error.message || error}`);
      setMessage(`Error: ${error.message || error}`);
    }
  };

  return (
    <div style={{
      padding: "40px",
      fontFamily: "system-ui",
      background: "#1a1a1a",
      color: "#fff",
      height: "100vh",
      display: "flex",
      flexDirection: "column",
      gap: "20px",
      alignItems: "center",
      justifyContent: "center"
    }}>
      <h1>Pipeline Control - Simple</h1>
      <p>{message}</p>
      
      <button
        onClick={handleStart}
        style={{
          padding: "20px 40px",
          fontSize: "18px",
          background: "#4a9eff",
          color: "white",
          border: "none",
          borderRadius: "8px",
          cursor: "pointer",
          fontWeight: "bold"
        }}
      >
        ▶️ Start Scraper
      </button>
      
      <button
        onClick={handleStop}
        style={{
          padding: "20px 40px",
          fontSize: "18px",
          background: "#ff4444",
          color: "white",
          border: "none",
          borderRadius: "8px",
          cursor: "pointer",
          fontWeight: "bold"
        }}
      >
        ⏹ Stop Scraper
      </button>
    </div>
  );
}

export default App;
