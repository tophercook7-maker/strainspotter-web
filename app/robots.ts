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
    sitemap: "https://strainspotter.app/sitemap.xml",
    host: "https://strainspotter.app",
  };
}
