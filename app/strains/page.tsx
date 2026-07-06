// Public strain library hub — the crawl entry point for 35k strain pages.

import type { Metadata } from "next";
import Link from "next/link";
import { BROWSE_LETTERS } from "@/lib/strains/publicStrains";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Cannabis Strain Library — 35,000+ Strains | StrainSpotter",
  description:
    "Browse 35,000+ cannabis strains: effects, THC levels, lineage, flavors, and grow info. Scan any strain with AI — new accounts get 1 free scan.",
  alternates: { canonical: "https://strainspotter.app/strains" },
};

export default function StrainsHubPage() {
  return (
    <main style={{ minHeight: "100vh", background: "linear-gradient(160deg, #0c1410, #060a08)", color: "white", padding: "40px 20px" }}>
      <div style={{ maxWidth: 780, margin: "0 auto" }}>
        <h1 style={{ fontSize: 38, fontWeight: 900, margin: "0 0 8px" }}>🌿 Strain Library</h1>
        <p style={{ color: "rgba(255,255,255,0.72)", fontSize: 16, lineHeight: 1.7, margin: "0 0 28px" }}>
          35,000+ cannabis strains — effects, THC & CBD, lineage, flavors, and grow
          info. Found a jar you can&apos;t place? <Link href="/garden/scanner" style={{ color: "#6ee7b7", fontWeight: 700 }}>Scan it with AI</Link> — new accounts get 1 free scan.
        </p>

        <h2 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 14px" }}>Browse A–Z</h2>
        <div className="ss-stagger" style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 32 }}>
          {BROWSE_LETTERS.map((l) => (
            <Link
              key={l}
              href={`/strains/browse/${l}`}
              className="ss-lift"
              style={{
                width: 52, height: 52, display: "flex", alignItems: "center", justifyContent: "center",
                borderRadius: 12, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.16)",
                color: "white", fontWeight: 800, fontSize: 18, textDecoration: "none", textTransform: "uppercase",
              }}
            >
              {l === "0" ? "0-9" : l}
            </Link>
          ))}
        </div>

        <div style={{ padding: 20, borderRadius: 16, background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.3)" }}>
          <h2 style={{ fontSize: 17, fontWeight: 800, margin: "0 0 6px" }}>The honest strain scanner</h2>
          <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 14, lineHeight: 1.7, margin: "0 0 12px" }}>
            StrainSpotter reads labels, packaging, and menus with AI, verifies seller
            claims, and tells you the truth about what a photo can and can&apos;t identify.
            Plus a Plant Doctor that reads your live plant&apos;s age, stage, and health.
          </p>
          <Link href="/garden/scanner" className="ss-glow" style={{ display: "inline-block", padding: "11px 20px", borderRadius: 12, background: "linear-gradient(135deg, #34d399, #059669)", color: "white", fontWeight: 800, fontSize: 14, textDecoration: "none" }}>
            Try it free
          </Link>
        </div>
      </div>
    </main>
  );
}
