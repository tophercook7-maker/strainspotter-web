// Blog post page — server-rendered markdown with the scanner CTA baked into
// each article's content. Static at build (posts are repo files).

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { marked } from "marked";
import { getAllPosts, getPost } from "@/lib/blog/posts";

export function generateStaticParams() {
  return getAllPosts().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const post = getPost((await params).slug);
  if (!post) return { title: "Post not found — StrainSpotter" };
  return {
    title: `${post.title} | StrainSpotter`,
    description: post.description,
    alternates: { canonical: `https://strainspotter.app/blog/${post.slug}` },
    openGraph: { title: post.title, description: post.description, type: "article" },
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const post = getPost((await params).slug);
  if (!post) notFound();

  const html = await marked.parse(post.body);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    publisher: { "@type": "Organization", name: "StrainSpotter", url: "https://strainspotter.app" },
  };

  return (
    <main style={{ minHeight: "100vh", background: "linear-gradient(160deg, #0c1410, #060a08)", color: "white", padding: "40px 20px" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div style={{ maxWidth: 740, margin: "0 auto" }}>
        <nav style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", marginBottom: 20 }}>
          <Link href="/" style={{ color: "rgba(255,255,255,0.55)" }}>StrainSpotter</Link>
          {" / "}
          <Link href="/blog" style={{ color: "rgba(255,255,255,0.55)" }}>Grower Guides</Link>
        </nav>
        <article
          className="blog-article"
          dangerouslySetInnerHTML={{ __html: html }}
        />
        <style>{`
          .blog-article { color: rgba(255,255,255,0.85); font-size: 16px; line-height: 1.8; }
          .blog-article h1 { color: #fff; font-size: 32px; line-height: 1.25; margin: 0 0 18px; }
          .blog-article h2 { color: #A5D6A7; font-size: 23px; margin: 34px 0 12px; }
          .blog-article h3 { color: #fff; font-size: 18px; margin: 26px 0 10px; }
          .blog-article a { color: #6ee7b7; font-weight: 700; }
          .blog-article strong { color: #fff; }
          .blog-article hr { border: none; border-top: 1px solid rgba(255,255,255,0.15); margin: 30px 0; }
          .blog-article table { border-collapse: collapse; width: 100%; font-size: 14px; }
          .blog-article th, .blog-article td { border: 1px solid rgba(255,255,255,0.2); padding: 8px 10px; text-align: left; }
          .blog-article blockquote { border-left: 3px solid #34d399; margin: 0; padding: 4px 18px; color: rgba(255,255,255,0.7); }
          .blog-article code { background: rgba(255,255,255,0.1); padding: 1px 6px; border-radius: 4px; font-size: 14px; }
        `}</style>
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, marginTop: 32, lineHeight: 1.6 }}>
          Educational content for adults 21+. Not medical advice.
        </p>
      </div>
    </main>
  );
}
