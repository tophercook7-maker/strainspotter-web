import type { MetadataRoute } from "next";

// Next.js convention: a default export from app/robots.ts is served as
// /robots.txt at request time. Tells crawlers what to index and where
// to find the sitemap.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/garden/data-engine/",
          "/garden/saved-scan/",
          "/garden/grow-log/entry/",
          "/garden/grow-groups/",
          "/garden/history/",
          "/garden/plants/",
        ],
      },
    ],
    sitemap: [
      "https://strainspotter.app/sitemap.xml",
      // Chunked strain-library sitemaps (35k pages, 10k per chunk) — keep in
      // step with CHUNKS in app/strains/sitemap.ts.
      "https://strainspotter.app/strains/sitemap/0.xml",
      "https://strainspotter.app/strains/sitemap/1.xml",
      "https://strainspotter.app/strains/sitemap/2.xml",
      "https://strainspotter.app/strains/sitemap/3.xml",
    ],
    host: "https://strainspotter.app",
  };
}
