"use client";

// "Available nearby" — the reverse menu lookup on a confident scan result.
// Renders NOTHING when no StrainSpotter dispensary carries the strain, so
// the result panel stays clean until dispensary menus reach adoption.

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Carrier {
  profileId: string;
  businessName: string | null;
  region: string | null;
  verified: boolean;
  items: { name: string; category: string; price: string | null; thc: string | null }[];
}

export default function WhereToFind({ slug, token }: { slug: string; token?: string }) {
  const router = useRouter();
  const [carriers, setCarriers] = useState<Carrier[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!token) return;
      try {
        const res = await fetch(`/api/menu/where-to-find?slug=${encodeURIComponent(slug)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        if (!cancelled && res.ok) setCarriers(json.carriers ?? []);
      } catch { /* silent — this module is a bonus, never an error state */ }
    })();
    return () => { cancelled = true; };
  }, [slug, token]);

  if (!carriers.length) return null;

  return (
    <div style={{
      background: "rgba(255,255,255,0.10)",
      border: "1px solid rgba(52,211,153,0.35)",
      borderRadius: 16,
      backdropFilter: "blur(18px) saturate(1.4)",
      WebkitBackdropFilter: "blur(18px) saturate(1.4)",
      padding: 18,
      marginTop: 14,
    }}>
      <div style={{ color: "white", fontWeight: 800, fontSize: 15, marginBottom: 10 }}>
        🏪 Carried by {carriers.length} dispensar{carriers.length === 1 ? "y" : "ies"} on StrainSpotter
      </div>
      {carriers.map((c) => (
        <div key={c.profileId} style={{ padding: "8px 0", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ color: "white", fontWeight: 700, fontSize: 14 }}>{c.businessName}</span>
            {c.verified && (
              <span style={{ color: "#64B5F6", fontSize: 10, fontWeight: 800, border: "1px solid rgba(100,181,246,0.4)", borderRadius: 99, padding: "0 7px" }}>✓ Verified</span>
            )}
            {c.region && <span style={{ color: "rgba(255,255,255,0.55)", fontSize: 12 }}>{c.region}</span>}
          </div>
          <div style={{ color: "rgba(255,255,255,0.65)", fontSize: 12, marginTop: 3 }}>
            {c.items.map((i) => [i.category, i.price, i.thc && `THC ${i.thc}`].filter(Boolean).join(" · ")).join("  •  ")}
          </div>
        </div>
      ))}
      <button
        onClick={() => router.push("/garden/dispensaries")}
        style={{
          marginTop: 12, padding: "8px 16px", borderRadius: 11, fontWeight: 800, fontSize: 12.5, cursor: "pointer",
          background: "rgba(52,211,153,0.15)", color: "#6ee7b7", border: "1px solid rgba(52,211,153,0.4)",
        }}
      >
        📍 Find dispensaries near me
      </button>
    </div>
  );
}
