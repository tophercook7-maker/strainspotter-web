"use client";

import { useState } from "react";

export default function ScannerUploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleScan() {
    if (!file) return;
    setLoading(true);

    // TODO: hook to /api/visual-match
    setTimeout(() => {
      window.location.href = "/scan/result/mock";
    }, 1200);
  }

  return (
    <div
      style={{
        padding: "32px 20px",
        maxWidth: "420px",
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        gap: "18px",
      }}
    >
      <h1 style={{ fontSize: "22px", color: "#E8FFE8" }}>Scan a Strain</h1>

      <input
        type="file"
        accept="image/*"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
        style={{
          padding: "12px",
          borderRadius: "12px",
          background: "rgba(0,0,0,0.5)",
          color: "#E8FFE8",
          border: "1px solid rgba(255,255,255,0.15)",
        }}
      />

      <button
        disabled={!file || loading}
        onClick={handleScan}
        style={{
          height: "56px",
          borderRadius: "16px",
          background: "rgba(0,40,0,0.7)",
          border: "1px solid rgba(0,255,0,0.4)",
          color: "#E8FFE8",
          fontSize: "16px",
          cursor: "pointer",
          boxShadow: "0 0 18px rgba(0,255,0,0.35)",
          opacity: !file ? 0.5 : 1,
        }}
      >
        {loading ? "Scanning…" : "Scan"}
      </button>
    </div>
  );
}
