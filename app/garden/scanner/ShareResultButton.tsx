"use client";

// One-tap share of the "what the AI saw" result card. Web Share API on
// mobile (share sheet with the PNG attached), download fallback on desktop.

import { useState } from "react";
import { shareCard, type ResultCardData } from "@/lib/share/resultCard";

export default function ShareResultButton({ data }: { data: ResultCardData }) {
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");

  const onShare = async () => {
    if (state === "busy") return;
    setState("busy");
    try {
      const how = await shareCard(data);
      setState("done");
      if (how === "downloaded") setTimeout(() => setState("idle"), 2500);
    } catch {
      setState("idle");
    }
  };

  return (
    <button
      onClick={onShare}
      disabled={state === "busy"}
      style={{
        width: "100%", padding: "14px 18px", borderRadius: 14, marginBottom: 10,
        border: "1px solid rgba(76,175,80,0.45)", background: "rgba(76,175,80,0.14)",
        color: "#81C784", fontWeight: 800, fontSize: 15, cursor: "pointer",
      }}
    >
      {state === "busy" ? "Rendering…" : state === "done" ? "✓ Card saved" : "📤 Share result card"}
    </button>
  );
}
