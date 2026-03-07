/**
 * Image URL Extraction — extract image URLs from pages or metadata.
 * Scaffolded; implement with HTML parser or API response parsing.
 */

export interface ImageUrlResult {
  url: string;
  context?: string;
}

/**
 * Extract image URLs from raw content. Placeholder — returns empty until pipeline is ready.
 */
export async function extractImageUrls(
  _rawContent: string,
  _contentType: "html" | "json",
  _strainSlug: string
): Promise<ImageUrlResult[]> {
  return [];
}
