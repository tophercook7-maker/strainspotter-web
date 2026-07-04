"use client";

// The deep-dive panel — everything the 35k library knows about the strain
// the scanner just identified. Server-attached (result.strainDetails), zero
// extra AI cost. Links out to the full public profile page.

import Link from "next/link";

export interface StrainDetails {
  slug: string;
  name: string;
  type: string | null;
  indica_percentage: number | null;
  sativa_percentage: number | null;
  thc_min: number | null;
  thc_max: number | null;
  cbd_min: number | null;
  cbd_max: number | null;
  description: string | null;
  genetics: string | null;
  breeder: string | null;
  flowering_time_min: number | null;
  flowering_time_max: number | null;
  yield_indoor: string | null;
  yield_outdoor: string | null;
  difficulty: string | null;
  effects: unknown;
  flavors: unknown;
}

const glass: React.CSSProperties = {
  background: "rgba(255,255,255,0.10)",
  border: "1px solid rgba(255,255,255,0.20)",
  borderRadius: 16,
  backdropFilter: "blur(18px) saturate(1.4)",
  WebkitBackdropFilter: "blur(18px) saturate(1.4)",
  padding: 20,
};

function chips(v: unknown, max = 10): string[] {
  return Array.isArray(v)
    ? v.filter((x): x is string => typeof x === "string" && !!x.trim()).slice(0, max)
    : [];
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ minWidth: 110 }}>
      <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
      <div style={{ color: "white", fontSize: 14, fontWeight: 700, marginTop: 2 }}>{value}</div>
    </div>
  );
}

export default function StrainDeepDive({ details }: { details: StrainDetails }) {
  const effects = chips(details.effects);
  const flavors = chips(details.flavors);
  const thc =
    details.thc_max && details.thc_max > 0
      ? details.thc_min === details.thc_max
        ? `${details.thc_max}%`
        : `${details.thc_min ?? 0}–${details.thc_max}%`
      : null;
  const typeLine =
    details.indica_percentage && details.sativa_percentage
      ? `${details.type ?? "Hybrid"} · ${details.indica_percentage}% indica / ${details.sativa_percentage}% sativa`
      : details.type ?? null;

  return (
    <div style={{ ...glass, marginTop: 14 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 4 }}>
        <div style={{ color: "white", fontWeight: 900, fontSize: 18 }}>📖 About {details.name}</div>
        {typeLine && <div style={{ color: "#81C784", fontWeight: 700, fontSize: 12.5 }}>{typeLine}</div>}
      </div>

      {/* Fast facts */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.12)", marginBottom: 12 }}>
        {thc && <Fact label="THC" value={thc} />}
        {details.cbd_max != null && details.cbd_max > 0 && <Fact label="CBD" value={`${details.cbd_max}%`} />}
        {details.breeder && <Fact label="Breeder" value={details.breeder} />}
        {details.difficulty && <Fact label="Grow difficulty" value={details.difficulty} />}
        {details.flowering_time_min != null && details.flowering_time_max != null && (
          <Fact label="Flowering" value={`${details.flowering_time_min}–${details.flowering_time_max} wks`} />
        )}
      </div>

      {details.description && (
        <p style={{ color: "rgba(255,255,255,0.82)", fontSize: 14, lineHeight: 1.7, margin: "0 0 12px", whiteSpace: "pre-line" }}>
          {details.description}
        </p>
      )}

      {details.genetics && (
        <p style={{ color: "rgba(255,255,255,0.72)", fontSize: 13, lineHeight: 1.6, margin: "0 0 12px" }}>
          <strong style={{ color: "white" }}>Lineage:</strong> {details.genetics}
        </p>
      )}

      {effects.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Reported effects</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {effects.map((e) => (
              <span key={e} style={{ padding: "4px 11px", borderRadius: 99, background: "rgba(76,175,80,0.15)", border: "1px solid rgba(76,175,80,0.35)", color: "#A5D6A7", fontSize: 12, fontWeight: 600 }}>{e}</span>
            ))}
          </div>
        </div>
      )}

      {flavors.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Flavors & terpenes</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {flavors.map((f) => (
              <span key={f} style={{ padding: "4px 11px", borderRadius: 99, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.18)", color: "rgba(255,255,255,0.85)", fontSize: 12, fontWeight: 600 }}>{f}</span>
            ))}
          </div>
        </div>
      )}

      {(details.yield_indoor || details.yield_outdoor) && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginBottom: 12 }}>
          {details.yield_indoor && <Fact label="Indoor yield" value={details.yield_indoor} />}
          {details.yield_outdoor && <Fact label="Outdoor yield" value={details.yield_outdoor} />}
        </div>
      )}

      <Link
        href={`/strains/${details.slug}`}
        style={{
          display: "inline-block", padding: "9px 18px", borderRadius: 11,
          background: "rgba(76,175,80,0.15)", border: "1px solid rgba(76,175,80,0.4)",
          color: "#81C784", fontWeight: 800, fontSize: 13, textDecoration: "none",
        }}
      >
        Full strain profile →
      </Link>
    </div>
  );
}
