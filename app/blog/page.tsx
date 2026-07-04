// Blog index — grower guides that feed the scanner funnel.

import type { Metadata } from "next";
import Link from "next/link";
import { getAllPosts } from "@/lib/blog/posts";

export const metadata: Metadata = {
  title: "Grower Guides & Cannabis Knowledge | StrainSpotter Blog",
  description:
    "Practical cannabis growing guides: diagnosing plant problems, reading your plant's age and stage, verifying strains, and more.",
  alternates: { canonical: "https://strainspotter.app/blog" },
};

export default function BlogIndexPage() {
  const posts = getAllPosts();
  return (
    <main style={{ minHeight: "100vh", background: "linear-gradient(160deg, #0c1410, #060a08)", color: "white", padding: "40px 20px" }}>
      <div style={{ maxWidth: 780, margin: "0 auto" }}>
        <h1 style={{ fontSize: 36, fontWeight: 900, margin: "0 0 8px" }}>🌿 Grower Guides</h1>
        <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 15, lineHeight: 1.7, margin: "0 0 28px" }}>
          Practical, no-hype cannabis knowledge — from the team behind the{" "}
          <Link href="/garden/scanner" style={{ color: "#81C784", fontWeight: 700 }}>honest AI scanner</Link>.
        </p>
        {posts.map((p) => (
          <Link key={p.slug} href={`/blog/${p.slug}`} style={{ display: "block", textDecoration: "none", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.16)", borderRadius: 16, padding: 20, marginBottom: 14 }}>
            <div style={{ color: "white", fontWeight: 800, fontSize: 18, marginBottom: 6 }}>{p.title}</div>
            <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 14, lineHeight: 1.6, marginBottom: 8 }}>{p.description}</div>
            <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 12 }}>{new Date(p.date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</div>
          </Link>
        ))}
      </div>
    </main>
  );
}
