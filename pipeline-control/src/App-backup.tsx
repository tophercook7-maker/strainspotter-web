import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { register } from "@tauri-apps/plugin-global-shortcut";
import { getCurrentWindow } from "@tauri-apps/api/window";
// import { getCurrent } from "@tauri-apps/api/window"; // Removed - not exported
import "./App.css";

interface AppStatus {
  scraper: { running: boolean; pid: number | null };
  generator: { running: boolean; pid: number | null };
  scraper_progress: { current: number; total: number; strain_name: string | null };
  hero_progress: { generated: number; total: number };
  vault: { mounted: boolean; dataset_exists: boolean };
  last_activity: string | null;
  error: string | null;
}

function App() {
  const [status, setStatus] = useState<AppStatus | null>(null);
  const [loading, setLoading] = useState(true);
  
  console.log("App rendered, status:", status, "loading:", loading);

  const refreshStatus = async () => {
    try {
      const result = await invoke<AppStatus>("get_status");
      setStatus(result);
      setLoading(false);
    } catch (error) {
      console.error("Failed to get status:", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshStatus();
    const interval = setInterval(refreshStatus, 2000);
    
    // Register global shortcut ⌘⌥P to show window
    register("Command+Option+P", async () => {
      const window = getCurrentWindow();
      await window.show();
      await window.setFocus();
    }).catch(console.error);
    
    // Register ⌘⌥I to open devtools
    register("Command+Option+I", async () => {
      try {
        const window = getCurrentWindow();
        await window.openDevtools();
      } catch (error) {
        console.error("Failed to open devtools:", error);
      }
    }).catch(console.error);
    
    // Also listen for F12 key
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'F12' || (e.metaKey && e.altKey && e.key === 'i')) {
        e.preventDefault();
        getCurrentWindow().openDevtools().catch(console.error);
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, []);

  const handleStartScraper = async () => {
    console.log("=== START SCRAPER CLICKED ===");
    console.log("Status:", status);
    try {
      console.log("About to call invoke('start_scraper')...");
      const result: string = await invoke("start_scraper");
      console.log("Invoke returned:", result);
      alert(`✅ Scraper started: ${result}`);
      setTimeout(refreshStatus, 1000);
    } catch (error: any) {
      console.error("ERROR in handleStartScraper:", error);
      const errorMsg = error?.message || error?.toString() || String(error);
      console.error("Error message:", errorMsg);
      alert(`❌ Failed to start scraper:\n\n${errorMsg}`);
    }
  };

  const handleStopScraper = async () => {
    try {
      const result = await invoke("stop_scraper");
      console.log("Stop scraper result:", result);
      setTimeout(refreshStatus, 500);
    } catch (error: any) {
      console.error("Stop scraper error:", error);
      alert(`Failed to stop scraper: ${error}`);
    }
  };

  const handleStartGenerator = async () => {
    try {
      await invoke("start_generator");
      setTimeout(refreshStatus, 500);
    } catch (error: any) {
      alert(`Failed to start generator: ${error}`);
    }
  };

  const handleStopGenerator = async () => {
    try {
      await invoke("stop_generator");
      setTimeout(refreshStatus, 500);
    } catch (error: any) {
      alert(`Failed to stop generator: ${error}`);
    }
  };

  const handleOpenDataset = async () => {
    try {
      await invoke("open_dataset_folder");
    } catch (error: any) {
      alert(`Failed to open folder: ${error}`);
    }
  };

  const handleOpenStateFiles = async () => {
    try {
      await invoke("open_state_files");
    } catch (error: any) {
      alert(`Failed to open state files: ${error}`);
    }
  };

  if (loading || !status) {
    return (
      <div className="app">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  const scraperStatus = status.scraper.running ? "🟢 Running" : status.scraper.pid ? "🟡 Paused" : "🔴 Stopped";
  const generatorStatus = status.generator.running ? "🟢 Running" : status.generator.pid ? "🟡 Idle" : "🔴 Stopped";
  const vaultStatus = status.vault.mounted ? "🟢 Vault mounted" : "🔴 Vault missing";

  const scraperProgress = status.scraper_progress.current / status.scraper_progress.total;
  const heroProgress = status.hero_progress.generated / status.hero_progress.total;

  return (
    <div className="app">
      <div className="header">
        <h1>StrainSpotter AI — Pipeline Control</h1>
        <p className="subtitle">Local Dataset Operations</p>
        <button 
          onClick={async () => {
            try {
              const win = getCurrentWindow();
              await win.openDevtools();
              alert("Console opened! (If not visible, try ⌘⌥I or F12)");
            } catch (error: any) {
              console.error("Failed to open devtools:", error);
              alert(`Failed to open console: ${error.message || error}\n\nTry:\n- Press ⌘⌥I (Cmd+Option+I)\n- Press F12\n- Right-click and select 'Inspect'`);
            }
          }}
          style={{ 
            marginTop: "10px", 
            padding: "8px 12px", 
            fontSize: "12px",
            background: "#4a9eff",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontWeight: "500"
          }}
        >
          🔧 Open Console (or press ⌘⌥I)
        </button>
      </div>

      <div className="content">
        {/* SECTION 1: IMAGE SCRAPER */}
        <div className="section">
          <div className="section-header">
            <h2>🧲 Image Scraper</h2>
            <span className="status-indicator">{scraperStatus}</span>
          </div>
          
          <div className="progress-info">
            <span>{status.scraper_progress.current} / {status.scraper_progress.total} strains</span>
          </div>
          
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${scraperProgress * 100}%` }}
            />
          </div>
          
          <div className="button-group">
            <button 
              onClick={() => {
                alert("BUTTON CLICKED!");
                console.log("Start Scraper button clicked");
                handleStartScraper();
              }}
              className="btn btn-start"
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
              ▶️ Start Scraper
            </button>
            <button 
              onClick={() => {
                alert("STOP BUTTON CLICKED!");
                console.log("Stop Scraper button clicked");
                handleStopScraper();
              }}
              className="btn btn-stop"
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
              ⏹ Stop Scraper
            </button>
          </div>
          
          <p className="helper-text">Resumes automatically from last saved strain</p>
        </div>

        {/* SECTION 2: HERO IMAGE GENERATOR */}
        <div className="section">
          <div className="section-header">
            <h2>🎨 Hero Image Generator</h2>
            <span className="status-indicator">{generatorStatus}</span>
          </div>
          
          <div className="progress-info">
            <span>{status.hero_progress.generated} heroes generated</span>
          </div>
          
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${heroProgress * 100}%` }}
            />
          </div>
          
          <div className="button-group">
            <button 
              onClick={handleStartGenerator}
              disabled={status.generator.running}
              className="btn btn-start"
            >
              ▶️ Start Generator
            </button>
            <button 
              onClick={handleStopGenerator}
              disabled={!status.generator.running}
              className="btn btn-stop"
            >
              ⏹ Stop Generator
            </button>
          </div>
          
          <p className="helper-text">Skips completed images</p>
        </div>

        {/* SECTION 3: DATA HEALTH */}
        <div className="section">
          <div className="section-header">
            <h2>Data Health</h2>
          </div>
          
          <div className="health-info">
            <div className="health-item">
              <span>{vaultStatus}</span>
            </div>
            {status.error && (
              <div className="error-message">
                {status.error}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <div className="footer">
        <button onClick={handleOpenDataset} className="btn btn-secondary">
          📂 Open Dataset Folder
        </button>
        <button onClick={handleOpenStateFiles} className="btn btn-secondary">
          📄 View State Files
        </button>
      </div>
    </div>
  );
}

export default App;
