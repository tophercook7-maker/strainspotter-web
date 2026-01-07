import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";

function App() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");

  const handleOpen = () => {
    alert("OPEN BUTTON CLICKED!");
    setIsOpen(true);
    setMessage("Opened!");
    console.log("Open button clicked");
  };

  const handleClose = () => {
    alert("CLOSE BUTTON CLICKED!");
    setIsOpen(false);
    setMessage("Closed!");
    console.log("Close button clicked");
  };

  const handleTestCommand = async () => {
    try {
      alert("TEST COMMAND BUTTON CLICKED!");
      const result = await invoke("test_command");
      alert(`Command result: ${result}`);
      setMessage(result);
    } catch (error) {
      alert(`Error: ${error}`);
      console.error(error);
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
      <h1>Test App</h1>
      <p>Status: {isOpen ? "OPEN" : "CLOSED"}</p>
      <p>{message}</p>
      
      <div style={{ display: "flex", gap: "20px", flexDirection: "column", width: "200px" }}>
        <button
          onClick={handleOpen}
          style={{
            padding: "20px",
            fontSize: "18px",
            background: "#4a9eff",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: "bold"
          }}
        >
          🔓 OPEN
        </button>
        
        <button
          onClick={handleClose}
          style={{
            padding: "20px",
            fontSize: "18px",
            background: "#ff4444",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: "bold"
          }}
        >
          🔒 CLOSE
        </button>
        
        <button
          onClick={handleTestCommand}
          style={{
            padding: "20px",
            fontSize: "18px",
            background: "#4aff4a",
            color: "black",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: "bold"
          }}
        >
          ⚡ TEST COMMAND
        </button>
      </div>
    </div>
  );
}

export default App;
