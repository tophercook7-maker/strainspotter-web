"use client";

import { useState } from "react";

export default function ExportTimeline({ logs }: { logs: any[] }) {
  const [copied, setCopied] = useState(false);

  const exportData = JSON.stringify(logs, null, 2);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(exportData);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
      alert("Failed to copy. Please try again.");
    }
  };

  return (
    <div style={{ marginTop: 16 }}>
      <button
        onClick={copy}
        className="px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white hover:bg-neutral-700 transition text-sm font-medium"
      >
        {copied ? "✓ Copied!" : "📤 Copy Grow Timeline"}
      </button>
      <p style={{ opacity: 0.7, fontSize: 12, marginTop: 6, color: "#999" }}>
        Useful for sharing, backups, or external analysis.
      </p>
    </div>
  );
}
