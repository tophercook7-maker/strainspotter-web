// Public strain page — the programmatic-SEO surface. Server-rendered, no
// auth, no client JS. One page per strain in the 35k library, revalidated
// daily. The funnel: search "X strain" → this page → Scan / Dispensaries.

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getStrainBySlug,
  getRelatedStrains,
  asStringArray,
  thcLabel,
  typeLabel,
} from "@/lib/strains/publicStrains";

export const revalidate = 86400; // daily

const BASE = "https://strainspotter.app";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const strain = await getStrainBySlug(slug);
  if (!strain) return { title: "Strain not found — StrainSpotter" };
  const thc = thcLabel(strain);
  const description =
    strain.description?.slice(0, 155) ??
    `${strain.name}: ${typeLabel(strain)}${thc ? `, THC ${thc}` : ""}. Effects, lineage, and grow info — plus AI strain scanning on StrainSpotter.`;
  return {
    title: `${strain.name} Strain — Effects, THC & Grow Info | StrainSpotter`,
    description,
    alternates: { canonical: `${BASE}/strains/${strain.slug}` },
    openGraph: {
      title: `${strain.name} — ${typeLabel(strain)}`,
      description,
      url: `${BASE}/strains/${strain.slug}`,
      siteName: "StrainSpotter",
    },
  };
}

const glass: React.CSSProperties = {
  background: "rgba(255,255,255,0.07)",
  border: "1px solid rgba(255,255,255,0.16)",
  borderRadius: 16,
  padding: 20,
};

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ minWidth: 140 }}>
      <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
      <div style={{ color: "white", fontSize: 15, fontWeight: 700, marginTop: 2 }}>{value}</div>
    </div>
  );
}

export default async function StrainPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const strain = await getStrainBySlug(slug);
  if (!strain) notFound();

  const related = await getRelatedStrains(strain.slug, strain.type, 10);
  const effects = asStringArray(strain.effects);
  const flavors = asStringArray(strain.flavors);
  const thc = thcLabel(strain);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: `${strain.name} Strain — Effects, THC & Grow Info`,
    about: strain.name,
    description: strain.description?.slice(0, 200) ?? `${strain.name} cannabis strain profile`,
    publisher: { "@type": "Organization", name: "StrainSpotter", url: BASE },
    mainEntityOfPage: `${BASE}/strains/${strain.slug}`,
  };

  return (
    <main style={{ minHeight: "100vh", background: "linear-gradient(160deg, #0c1410, #060a08)", color: "white", padding: "40px 20px" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div style={{ maxWidth: 780, margin: "0 auto" }}>
        {/* Breadcrumb */}
        <nav style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", marginBottom: 20 }}>
          <Link href="/" style={{ color: "rgba(255,255,255,0.55)" }}>StrainSpotter</Link>
          {" / "}
          <Link href="/strains" style={{ color: "rgba(255,255,255,0.55)" }}>Strains</Link>
          {" / "}
          <span style={{ color: "rgba(255,255,255,0.85)" }}>{strain.name}</span>
        </nav>

        <h1 style={{ fontSize: 38, fontWeight: 900, margin: "0 0 6px" }}>🌿 {strain.name}</h1>
        <p style={{ color: "#81C784", fontWeight: 700, fontSize: 17, margin: "0 0 24px" }}>{typeLabel(strain)}</p>

        {/* Fast facts */}
        <div style={{ ...glass, display: "flex", flexWrap: "wrap", gap: 20, marginBottom: 18 }}>
          {thc && <Fact label="THC" value={thc} />}
          {strain.cbd_max != null && strain.cbd_max > 0 && (
            <Fact label="CBD" value={strain.cbd_min === strain.cbd_max ? `${strain.cbd_max}%` : `${strain.cbd_min ?? 0}–${strain.cbd_max}%`} />
          )}
          {strain.breeder && <Fact label="Breeder" value={strain.breeder} />}
          {strain.difficulty && <Fact label="Grow difficulty" value={strain.difficulty} />}
          {strain.flowering_time_min != null && strain.flowering_time_max != null && (
            <Fact label="Flowering" value={`${strain.flowering_time_min}–${strain.flowering_time_max} weeks`} />
          )}
        </div>

        {/* Description */}
        {strain.description && (
          <div style={{ ...glass, marginBottom: 18 }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 10px" }}>About {strain.name}</h2>
            <p style={{ color: "rgba(255,255,255,0.82)", fontSize: 15, lineHeight: 1.75, margin: 0, whiteSpace: "pre-line" }}>
              {strain.description}
            </p>
          </div>
        )}

        {/* Effects + flavors */}
        {(effects.length > 0 || flavors.length > 0) && (
          <div style={{ ...glass, marginBottom: 18 }}>
            {effects.length > 0 && (
              <>
                <h2 style={{ fontSize: 16, fontWeight: 800, margin: "0 0 10px" }}>Reported effects</h2>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: flavors.length ? 16 : 0 }}>
                  {effects.map((e) => (
                    <span key={e} style={{ padding: "5px 13px", borderRadius: 99, background: "rgba(76,175,80,0.15)", border: "1px solid rgba(76,175,80,0.35)", color: "#A5D6A7", fontSize: 13, fontWeight: 600 }}>{e}</span>
                  ))}
                </div>
              </>
            )}
            {flavors.length > 0 && (
              <>
                <h2 style={{ fontSize: 16, fontWeight: 800, margin: "0 0 10px" }}>Flavors & terpenes</h2>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {flavors.map((f) => (
                    <span key={f} style={{ padding: "5px 13px", borderRadius: 99, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.18)", color: "rgba(255,255,255,0.85)", fontSize: 13, fontWeight: 600 }}>{f}</span>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Genetics + grow info */}
        {(strain.genetics || strain.yield_indoor || strain.yield_outdoor) && (
          <div style={{ ...glass, marginBottom: 18 }}>
            <h2 style={{ fontSize: 16, fontWeight: 800, margin: "0 0 10px" }}>Genetics & growing</h2>
            {strain.genetics && (
              <p style={{ color: "rgba(255,255,255,0.82)", fontSize: 14, lineHeight: 1.7, margin: "0 0 10px" }}>
                <strong>Lineage:</strong> {strain.genetics}
              </p>
            )}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 20 }}>
              {strain.yield_indoor && <Fact label="Indoor yield" value={strain.yield_indoor} />}
              {strain.yield_outdoor && <Fact label="Outdoor yield" value={strain.yield_outdoor} />}
            </div>
          </div>
        )}

        {/* CTAs — the funnel */}
        <div style={{ ...glass, marginBottom: 18, textAlign: "center", border: "1px solid rgba(76,175,80,0.35)" }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 6px" }}>Got a jar of {strain.name}?</h2>
          <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 14, margin: "0 0 14px" }}>
            Scan the label to verify it, check seller claims, and see who carries it near you.
            New accounts get 1 free scan.
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/garden/scanner" style={{ padding: "12px 22px", borderRadius: 12, background: "linear-gradient(135deg, #43A047, #2E7D32)", color: "white", fontWeight: 800, fontSize: 14, textDecoration: "none" }}>
              📷 Scan a strain — free
            </Link>
            <Link href="/garden/dispensaries" style={{ padding: "12px 22px", borderRadius: 12, background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.25)", color: "white", fontWeight: 800, fontSize: 14, textDecoration: "none" }}>
              📍 Dispensaries near me
            </Link>
          </div>
        </div>

        {/* Related strains — internal crawl links */}
        {related.length > 0 && (
          <div style={{ ...glass }}>
            <h2 style={{ fontSize: 16, fontWeight: 800, margin: "0 0 12px" }}>Similar strains</h2>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {related.map((r) => (
                <Link key={r.slug} href={`/strains/${r.slug}`} style={{ padding: "6px 14px", borderRadius: 99, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.85)", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
                  {r.name}
                </Link>
              ))}
            </div>
          </div>
        )}

        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, marginTop: 28, lineHeight: 1.6 }}>
          Educational information for adults 21+. Effects vary by person, phenotype, and product.
          Not medical advice. Data compiled from public strain databases and breeder listings.
        </p>
      </div>
    </main>
  );
}
