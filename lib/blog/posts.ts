// lib/blog/posts.ts — file-based blog. Markdown lives in content/blog/*.md
// with minimal frontmatter (title/description/date/slug). Server-only (fs).

import fs from "fs";
import path from "path";

export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  date: string; // ISO date
  body: string; // markdown, frontmatter stripped
}

const BLOG_DIR = path.join(process.cwd(), "content", "blog");

function parse(file: string): BlogPost | null {
  const raw = fs.readFileSync(path.join(BLOG_DIR, file), "utf8");
  const m = raw.match(/^---\n([\s\S]*?)\n---\n/);
  if (!m) return null;
  const meta: Record<string, string> = {};
  for (const line of m[1].split("\n")) {
    const idx = line.indexOf(":");
    if (idx > 0) meta[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
  }
  if (!meta.slug || !meta.title) return null;
  return {
    slug: meta.slug,
    title: meta.title,
    description: meta.description ?? "",
    date: meta.date ?? "2026-01-01",
    body: raw.slice(m[0].length),
  };
}

export function getAllPosts(): BlogPost[] {
  if (!fs.existsSync(BLOG_DIR)) return [];
  return fs
    .readdirSync(BLOG_DIR)
    .filter((f) => f.endsWith(".md"))
    .map(parse)
    .filter((p): p is BlogPost => p !== null)
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function getPost(slug: string): BlogPost | null {
  return getAllPosts().find((p) => p.slug === slug) ?? null;
}
