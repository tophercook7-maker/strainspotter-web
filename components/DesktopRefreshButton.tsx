"use client";

export default function DesktopRefreshButton() {
  return (
    <button
      onClick={() => window.location.reload()}
      style={{
        position: "fixed",
        bottom: "20px",
        right: "20px",
        zIndex: 9999,
        padding: "10px 14px",
        fontSize: "13px",
        borderRadius: "10px",
        border: "1px solid rgba(255,255,255,0.2)",
        background: "rgba(0,0,0,0.6)",
        color: "#7CFF7C",
        backdropFilter: "blur(12px)",
        cursor: "pointer",
      }}
    >
      ↻ Refresh App
    </button>
  );
}

