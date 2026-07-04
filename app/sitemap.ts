import type { MetadataRoute } from "next";

// Public, crawlable pages only. Anything behind auth, anything personal
// (saved scans, grow logs, etc.) or admin (data-engine) is excluded.
// Refreshed every request, but Next.js caches the response per the
// platform's default revalidation rules.

const BASE = "https://strainspotter.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  const pages: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
    { path: "/", priority: 1.0, changeFrequency: "weekly" },
    { path: "/pricing", priority: 0.9, changeFrequency: "monthly" },
    { path: "/privacy", priority: 0.3, changeFrequency: "yearly" },
    { path: "/terms", priority: 0.3, changeFrequency: "yearly" },
    { path: "/garden", priority: 0.7, changeFrequency: "monthly" },
    { path: "/garden/scanner", priority: 0.9, changeFrequency: "monthly" },
    { path: "/garden/grow-coach", priority: 0.8, changeFrequency: "monthly" },
    { path: "/garden/strains", priority: 0.8, changeFrequency: "weekly" },
    { path: "/garden/dispensaries", priority: 0.6, changeFrequency: "weekly" },
    { path: "/garden/seed-vendors", priority: 0.6, changeFrequency: "weekly" },
    { path: "/garden/community", priority: 0.5, changeFrequency: "daily" },
    { path: "/garden/strains/submit", priority: 0.4, changeFrequency: "monthly" },
    // Public strain library hub (35k strain pages live in the chunked
    // sitemaps at /strains/sitemap/[0-3].xml, listed in robots.ts).
    { path: "/strains", priority: 0.8, changeFrequency: "weekly" },
  ];

  return pages.map((p) => ({
    url: `${BASE}${p.path}`,
    lastModified,
    changeFrequency: p.changeFrequency,
    priority: p.priority,
  }));
}
