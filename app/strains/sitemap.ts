// Chunked sitemaps for the 35k strain pages: /strains/sitemap/[id].xml.
// 10k URLs per chunk (well under the 50k spec limit); robots.ts lists each
// chunk so crawlers find them without a sitemap index.

import type { MetadataRoute } from "next";
import { getSlugChunk, BROWSE_LETTERS } from "@/lib/strains/publicStrains";

const BASE = "https://strainspotter.app";
const CHUNK_SIZE = 10_000;
export const CHUNKS = 4; // ceil(35,796 / 10,000)

export function generateSitemaps() {
  return Array.from({ length: CHUNKS }, (_, id) => ({ id }));
}

export default async function sitemap({ id }: { id: number }): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date();
  const slugs = await getSlugChunk(id, CHUNK_SIZE);
  const entries: MetadataRoute.Sitemap = slugs.map((slug) => ({
    url: `${BASE}/strains/${slug}`,
    lastModified,
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));
  // Hub + browse pages ride along in chunk 0.
  if (id === 0) {
    entries.unshift(
      { url: `${BASE}/strains`, lastModified, changeFrequency: "weekly", priority: 0.8 },
      ...BROWSE_LETTERS.map((l) => ({
        url: `${BASE}/strains/browse/${l}`,
        lastModified,
        changeFrequency: "weekly" as const,
        priority: 0.5,
      }))
    );
  }
  return entries;
}
