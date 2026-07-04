// A–Z browse pages — dense internal-link surfaces so crawlers can reach all
// 35k strain pages within two hops of the hub.

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getStrainsByLetter, BROWSE_LETTERS } from "@/lib/strains/publicStrains";

export const revalidate = 86400;

export function generateStaticParams() {
  return BROWSE_LETTERS.map((letter) => ({ letter }));
}

export async function generateMetadata({ params }: { params: Promise<{ letter: string }> }): Promise<Metadata> {
  const { letter } = await params;
  const label = letter === "0" ? "0-9" : letter.toUpperCase();
  return {
    title: `Cannabis Strains Starting With ${label} | StrainSpotter`,
    description: `Every cannabis strain starting with ${label}: effects, THC, lineage, and grow info in the StrainSpotter library.`,
    alternates: { canonical: `https://strainspotter.app/strains/browse/${letter}` },
  };
}

export default async function BrowseLetterPage({ params }: { params: Promise<{ letter: string }> }) {
  const letter = (await params).letter.toLowerCase();
  if (!BROWSE_LETTERS.includes(letter)) notFound();

  // "0" bucket = digits; queried per digit for ilike simplicity.
  const strains =
    letter === "0"
      ? (await Promise.all("0123456789".split("").map((d) => getStrainsByLetter(d)))).flat()
      : await getStrainsByLetter(letter);
  strains.sort((a, b) => a.name.localeCompare(b.name));

  const label = letter === "0" ? "0-9" : letter.toUpperCase();

  return (
    <main style={{ minHeight: "100vh", background: "linear-gradient(160deg, #0c1410, #060a08)", color: "white", padding: "40px 20px" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <nav style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", marginBottom: 20 }}>
          <Link href="/strains" style={{ color: "rgba(255,255,255,0.55)" }}>Strain Library</Link>
          {" / "}
          <span style={{ color: "rgba(255,255,255,0.85)" }}>{label}</span>
        </nav>
        <h1 style={{ fontSize: 32, fontWeight: 900, margin: "0 0 20px" }}>Strains — {label}</h1>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 26 }}>
          {BROWSE_LETTERS.map((l) => (
            <Link key={l} href={`/strains/browse/${l}`} style={{
              padding: "4px 10px", borderRadius: 8, fontSize: 13, fontWeight: 700, textDecoration: "none", textTransform: "uppercase",
              background: l === letter ? "rgba(76,175,80,0.25)" : "rgba(255,255,255,0.06)",
              color: l === letter ? "#81C784" : "rgba(255,255,255,0.6)",
              border: `1px solid ${l === letter ? "rgba(76,175,80,0.4)" : "rgba(255,255,255,0.12)"}`,
            }}>
              {l === "0" ? "0-9" : l}
            </Link>
          ))}
        </div>

        <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 13, marginBottom: 18 }}>{strains.length.toLocaleString()} strains</p>

        <div style={{ columnWidth: 220, columnGap: 24 }}>
          {strains.map((s) => (
            <div key={s.slug} style={{ breakInside: "avoid", marginBottom: 8 }}>
              <Link href={`/strains/${s.slug}`} style={{ color: "rgba(255,255,255,0.82)", fontSize: 14, textDecoration: "none" }}>
                {s.name}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
