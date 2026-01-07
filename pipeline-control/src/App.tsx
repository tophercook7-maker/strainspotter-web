import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";

interface Status {
  scraper: { running: boolean; pid: number | null };
  generator: { running: boolean; pid: number | null };
  scraper_progress: { current: number; total: number; strain_name: string | null };
  hero_progress: { generated: number; total: number };
  vault: { mounted: boolean; dataset_exists: boolean };
  error: string | null;
}

function App() {
  const [status, setStatus] = useState<Status | null>(null);
  const [message, setMessage] = useState("Ready");
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const refreshStatus = async () => {
    try {
      // Check if Tauri API is available
      if (typeof window === 'undefined' || !(window as any).__TAURI_INTERNALS__) {
        console.warn("[FRONTEND] Tauri API not available - running in browser mode");
        // Mock data for browser testing
        setStatus({
          scraper: { running: false, pid: null },
          generator: { running: false, pid: null },
          scraper_progress: { current: 3192, total: 35549, strain_name: "Georgia Pine|georgia-pine" },
          hero_progress: { generated: 906, total: 35549 },
          vault: { mounted: true, dataset_exists: true },
          error: null
        });
        setLastUpdate(new Date());
        setLoading(false);
        setMessage("Browser mode - showing mock data");
        return;
      }

      console.log("[FRONTEND] Calling get_status...");
      const result = await invoke<Status>("get_status");
      console.log("[FRONTEND] Status received:", JSON.stringify(result, null, 2));
      console.log("[FRONTEND] Scraper progress:", result.scraper_progress);
      console.log("[FRONTEND] Hero progress:", result.hero_progress);
      setStatus(result);
      setLastUpdate(new Date());
      setLoading(false);
      setMessage("Status updated");
    } catch (error: any) {
      console.error("[FRONTEND] Failed to get status:", error);
      const errorMsg = error?.message || String(error) || "Unknown error";
      console.error("[FRONTEND] Error details:", errorMsg);
      console.error("[FRONTEND] Full error object:", error);
      setMessage(`Error: ${errorMsg}`);
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshStatus();
    const interval = setInterval(refreshStatus, 2000); // Update every 2 seconds
    return () => clearInterval(interval);
  }, []);

  const handleStart = async () => {
    setMessage("Starting...");
    try {
      const result = await invoke("start_scraper");
      setMessage(String(result));
      setTimeout(refreshStatus, 500);
    } catch (error: any) {
      const errorMsg = error?.message || String(error);
      setMessage(`Error: ${errorMsg}`);
      alert(`Error: ${errorMsg}`);
    }
  };

  const handleStop = async () => {
    setMessage("Stopping...");
    try {
      const result = await invoke("stop_scraper");
      setMessage(String(result));
      setTimeout(refreshStatus, 500);
    } catch (error: any) {
      const errorMsg = error?.message || String(error);
      setMessage(`Error: ${errorMsg}`);
      alert(`Error: ${errorMsg}`);
    }
  };

  const handleStartGenerator = async () => {
    setMessage("Starting generator...");
    try {
      const result = await invoke("start_generator");
      setMessage(String(result));
      setTimeout(refreshStatus, 500);
    } catch (error: any) {
      const errorMsg = error?.message || String(error);
      setMessage(`Error: ${errorMsg}`);
      alert(`Error: ${errorMsg}`);
    }
  };

  const handleStopGenerator = async () => {
    setMessage("Stopping generator...");
    try {
      const result = await invoke("stop_generator");
      setMessage(String(result));
      setTimeout(refreshStatus, 500);
    } catch (error: any) {
      const errorMsg = error?.message || String(error);
      setMessage(`Error: ${errorMsg}`);
      alert(`Error: ${errorMsg}`);
    }
  };

  if (loading || !status) {
    return (
      <div style={{
        padding: "40px",
        fontFamily: "system-ui",
        background: "#1a1a1a",
        color: "#fff",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "20px"
      }}>
        <p>Loading status...</p>
        <button
          onClick={refreshStatus}
          style={{
            padding: "10px 20px",
            fontSize: "14px",
            background: "#4a9eff",
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer"
          }}
        >
          Retry
        </button>
        {status === null && !loading && (
          <p style={{ color: "#ff6b6b", fontSize: "12px" }}>
            Failed to load status. Check console for errors.
          </p>
        )}
      </div>
    );
  }

  const scraperRunning = status.scraper.running;
  const scraperProgress = status.scraper_progress.current / status.scraper_progress.total;
  const scraperPercent = Math.round(scraperProgress * 100);

  const generatorRunning = status.generator.running;
  const generatorProgress = status.hero_progress.generated / status.hero_progress.total;
  const generatorPercent = Math.round(generatorProgress * 100);

  return (
    <>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.6; }
        }
      `}</style>
      <div style={{
        padding: "30px",
        fontFamily: "system-ui",
        background: "#1a1a1a",
        color: "#fff",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        gap: "25px",
        overflow: "auto"
      }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
          <h1 style={{ margin: 0, fontSize: "24px", flex: 1 }}>Pipeline Control Dashboard</h1>
          <button
            onClick={refreshStatus}
            style={{
              padding: "8px 16px",
              fontSize: "12px",
              background: "#333",
              color: "#fff",
              border: "1px solid #555",
              borderRadius: "6px",
              cursor: "pointer"
            }}
          >
            🔄 Refresh
          </button>
        </div>
        <p style={{ margin: "0 0 5px 0", fontSize: "14px", color: "#999" }}>{message}</p>
        {lastUpdate && (
          <p style={{ margin: 0, fontSize: "11px", color: "#666" }}>
            Last updated: {lastUpdate.toLocaleTimeString()}
          </p>
        )}
      </div>

      {/* Status Card */}
      <div style={{
        background: "#252525",
        border: "1px solid #333",
        borderRadius: "8px",
        padding: "20px"
      }}>
        <h2 style={{ margin: "0 0 15px 0", fontSize: "18px" }}>🧲 Image Scraper</h2>
        
        <div style={{ marginBottom: "15px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
            <span>Status:</span>
            <span style={{ 
              color: scraperRunning ? "#4aff4a" : "#ff6b6b",
              fontWeight: "bold"
            }}>
              {scraperRunning ? "🟢 RUNNING" : "🔴 STOPPED"}
            </span>
          </div>
          {status.scraper.pid && (
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#999" }}>
              <span>Process ID:</span>
              <span style={{ fontFamily: "monospace" }}>{status.scraper.pid}</span>
            </div>
          )}
          {scraperRunning && (
            <div style={{ 
              marginTop: "8px",
              padding: "6px",
              background: "#1a3a1a",
              borderRadius: "4px",
              fontSize: "11px",
              color: "#4aff4a"
            }}>
              ✓ Process verified running
            </div>
          )}
        </div>

        {/* Progress */}
        <div style={{ marginBottom: "15px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
            <span>Progress:</span>
            <span style={{ fontWeight: "bold" }}>
              {status.scraper_progress.current.toLocaleString()} / {status.scraper_progress.total.toLocaleString()} ({scraperPercent}%)
            </span>
          </div>
          <div style={{
            width: "100%",
            height: "20px",
            background: "#333",
            borderRadius: "10px",
            overflow: "hidden",
            position: "relative"
          }}>
            <div style={{
              width: `${Math.max(1, scraperPercent)}%`,
              height: "100%",
              background: scraperRunning ? "#4a9eff" : "#666",
              transition: "width 0.3s",
              minWidth: scraperPercent > 0 ? "2px" : "0"
            }} />
            {scraperPercent === 0 && scraperRunning && (
              <div style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: "linear-gradient(90deg, transparent, rgba(74, 158, 255, 0.3), transparent)",
                animation: "pulse 2s ease-in-out infinite"
              }} />
            )}
          </div>
          {scraperRunning && (
            <div style={{ fontSize: "11px", color: "#999", marginTop: "4px", fontStyle: "italic" }}>
              ⚡ Active - Progress updates when each strain completes
            </div>
          )}
          {!scraperRunning && status.scraper_progress.current > 0 && (
            <div style={{ fontSize: "11px", color: "#999", marginTop: "4px" }}>
              Last progress: {status.scraper_progress.current} strains processed
            </div>
          )}
        </div>

        {/* Current Strain */}
        {status.scraper_progress.strain_name && (
          <div style={{
            background: "#1a1a1a",
            padding: "10px",
            borderRadius: "6px",
            marginBottom: "15px",
            fontSize: "13px"
          }}>
            <div style={{ color: "#999", marginBottom: "4px" }}>Current Strain:</div>
            <div style={{ fontWeight: "bold", wordBreak: "break-all" }}>
              {status.scraper_progress.strain_name}
            </div>
            {scraperRunning && (
              <div style={{ 
                marginTop: "8px", 
                fontSize: "11px", 
                color: "#4aff4a",
                display: "flex",
                alignItems: "center",
                gap: "6px"
              }}>
                <span style={{ 
                  display: "inline-block",
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: "#4aff4a",
                  animation: "pulse 1.5s ease-in-out infinite"
                }}></span>
                Active - Processing images...
              </div>
            )}
          </div>
        )}

        {/* Vault Status */}
        <div style={{
          marginBottom: "15px",
          padding: "10px",
          background: status.vault.mounted ? "#1a3a1a" : "#3a1a1a",
          borderRadius: "6px",
          fontSize: "13px"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Vault:</span>
            <span style={{ fontWeight: "bold" }}>
              {status.vault.mounted ? "🟢 Mounted" : "🔴 Not Mounted"}
            </span>
          </div>
        </div>

        {/* Error Display */}
        {status.error && (
          <div style={{
            background: "#3a1a1a",
            border: "1px solid #ff4444",
            padding: "10px",
            borderRadius: "6px",
            color: "#ff6b6b",
            fontSize: "12px",
            marginBottom: "15px"
          }}>
            ⚠️ {status.error}
          </div>
        )}

        {/* Buttons */}
        <div style={{ display: "flex", gap: "12px" }}>
          <button
            onClick={handleStart}
            disabled={scraperRunning}
            style={{
              flex: 1,
              padding: "15px",
              fontSize: "16px",
              background: scraperRunning ? "#555" : "#4a9eff",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: scraperRunning ? "not-allowed" : "pointer",
              fontWeight: "bold"
            }}
          >
            ▶️ Start Scraper
          </button>
          
          <button
            onClick={handleStop}
            disabled={!scraperRunning}
            style={{
              flex: 1,
              padding: "15px",
              fontSize: "16px",
              background: !scraperRunning ? "#555" : "#ff4444",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: !scraperRunning ? "not-allowed" : "pointer",
              fontWeight: "bold"
            }}
          >
            ⏹ Stop Scraper
          </button>
        </div>
      </div>

      {/* Generator Card */}
      <div style={{
        background: "#252525",
        border: "1px solid #333",
        borderRadius: "8px",
        padding: "20px"
      }}>
        <h2 style={{ margin: "0 0 15px 0", fontSize: "18px" }}>🎨 Hero Image Generator</h2>
        
        <div style={{ marginBottom: "15px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
            <span>Status:</span>
            <span style={{ 
              color: generatorRunning ? "#4aff4a" : "#ff6b6b",
              fontWeight: "bold"
            }}>
              {generatorRunning ? "🟢 RUNNING" : "🔴 STOPPED"}
            </span>
          </div>
          {status.generator.pid && (
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#999" }}>
              <span>Process ID:</span>
              <span style={{ fontFamily: "monospace" }}>{status.generator.pid}</span>
            </div>
          )}
          {generatorRunning && (
            <div style={{ 
              marginTop: "8px",
              padding: "6px",
              background: "#1a3a1a",
              borderRadius: "4px",
              fontSize: "11px",
              color: "#4aff4a"
            }}>
              ✓ Process verified running
            </div>
          )}
        </div>

        {/* Progress */}
        <div style={{ marginBottom: "15px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
            <span>Progress:</span>
            <span style={{ fontWeight: "bold" }}>
              {status.hero_progress.generated.toLocaleString()} / {status.hero_progress.total.toLocaleString()} ({generatorPercent}%)
            </span>
          </div>
          <div style={{
            width: "100%",
            height: "20px",
            background: "#333",
            borderRadius: "10px",
            overflow: "hidden",
            position: "relative"
          }}>
            <div style={{
              width: `${Math.max(1, generatorPercent)}%`,
              height: "100%",
              background: generatorRunning ? "#9b59b6" : "#666",
              transition: "width 0.3s",
              minWidth: generatorPercent > 0 ? "2px" : "0"
            }} />
            {generatorPercent === 0 && generatorRunning && (
              <div style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: "linear-gradient(90deg, transparent, rgba(155, 89, 182, 0.3), transparent)",
                animation: "pulse 2s ease-in-out infinite"
              }} />
            )}
          </div>
          {generatorRunning && (
            <div style={{ fontSize: "11px", color: "#999", marginTop: "4px", fontStyle: "italic" }}>
              ⚡ Active - Progress updates when each hero image completes
            </div>
          )}
          {!generatorRunning && status.hero_progress.generated > 0 && (
            <div style={{ fontSize: "11px", color: "#999", marginTop: "4px" }}>
              Last progress: {status.hero_progress.generated.toLocaleString()} / {status.hero_progress.total.toLocaleString()} strains processed
              {status.hero_progress.generated >= status.hero_progress.total && (
                <span style={{ color: "#ffaa00", marginLeft: "8px" }}>⚠️ Completed pass - many may have been skipped</span>
              )}
            </div>
          )}
        </div>

        {/* Buttons */}
        <div style={{ display: "flex", gap: "12px" }}>
          <button
            onClick={handleStartGenerator}
            disabled={generatorRunning}
            style={{
              flex: 1,
              padding: "15px",
              fontSize: "16px",
              background: generatorRunning ? "#555" : "#9b59b6",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: generatorRunning ? "not-allowed" : "pointer",
              fontWeight: "bold"
            }}
          >
            ▶️ Start Generator
          </button>
          
          <button
            onClick={handleStopGenerator}
            disabled={!generatorRunning}
            style={{
              flex: 1,
              padding: "15px",
              fontSize: "16px",
              background: !generatorRunning ? "#555" : "#ff4444",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: !generatorRunning ? "not-allowed" : "pointer",
              fontWeight: "bold"
            }}
          >
            ⏹ Stop Generator
          </button>
        </div>
      </div>
    </div>
    </>
  );
}

export default App;
