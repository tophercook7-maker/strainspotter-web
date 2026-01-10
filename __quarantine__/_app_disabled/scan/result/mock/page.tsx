"use client";

export default function ScanResultMock() {
  return (
    <div
      style={{
        padding: "32px 20px",
        maxWidth: "480px",
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
      }}
    >
      <h2 style={{ color: "#E8FFE8", fontSize: "22px" }}>
        Match Found
      </h2>

      <div
        style={{
          padding: "18px",
          borderRadius: "16px",
          background: "rgba(0,0,0,0.55)",
          border: "1px solid rgba(0,255,0,0.25)",
          boxShadow: "0 0 20px rgba(0,255,0,0.2)",
        }}
      >
        <strong style={{ fontSize: "18px" }}>Blue Dream</strong>
        <p style={{ marginTop: "8px", color: "#B6FFB6" }}>
          Confidence: 94%
        </p>
      </div>

      <button
        onClick={() => (window.location.href = "/garden")}
        style={{
          height: "52px",
          borderRadius: "14px",
          background: "rgba(0,0,0,0.6)",
          color: "#E8FFE8",
          border: "1px solid rgba(255,255,255,0.15)",
          cursor: "pointer",
        }}
      >
        Back to Garden
      </button>
    </div>
  );
}

