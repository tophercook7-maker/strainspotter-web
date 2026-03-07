/**
 * Image URL Extraction — extract image URLs from HTML or JSON.
 */

export interface ImageUrlResult {
  url: string;
  context?: string;
}

/**
 * Extract image URLs from raw HTML.
 * Matches <img src="...">, data-src, and srcset first URL.
 */
function extractFromHtml(html: string, baseUrl?: string): ImageUrlResult[] {
  const seen = new Set<string>();
  const results: ImageUrlResult[] = [];

  function add(url: string, context?: string) {
    const normalized = normalizeUrl(url, baseUrl);
    if (!normalized || seen.has(normalized)) return;
    if (!normalized.startsWith("http")) return;
    seen.add(normalized);
    results.push({ url: normalized, context });
  }

  const srcRe = /<img[^>]+src\s*=\s*["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = srcRe.exec(html)) !== null) add(m[1], "img@src");

  const dataSrcRe = /<img[^>]+data-src\s*=\s*["']([^"']+)["']/gi;
  while ((m = dataSrcRe.exec(html)) !== null) add(m[1], "img@data-src");

  const srcsetRe = /<img[^>]+srcset\s*=\s*["']([^"']+)["']/gi;
  while ((m = srcsetRe.exec(html)) !== null) {
    const first = m[1].split(/\s*,\s*/)[0]?.trim().split(/\s+/)[0];
    if (first) add(first, "img@srcset");
  }

  return results;
}

/**
 * Extract image URLs from JSON (e.g. API response).
 * Looks for common patterns: image, imageUrl, url, src, thumbnail.
 */
function extractFromJson(json: string, baseUrl?: string): ImageUrlResult[] {
  const seen = new Set<string>();
  const results: ImageUrlResult[] = [];

  function add(url: string) {
    if (typeof url !== "string" || !url.startsWith("http")) return;
    const normalized = normalizeUrl(url, baseUrl);
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    results.push({ url: normalized });
  }

  let obj: unknown;
  try {
    obj = JSON.parse(json);
  } catch {
    return [];
  }

  function walk(val: unknown) {
    if (!val) return;
    if (typeof val === "string" && val.startsWith("http")) add(val);
    else if (Array.isArray(val)) val.forEach(walk);
    else if (typeof val === "object")
      for (const v of Object.values(val)) walk(v);
  }
  walk(obj);
  return results;
}

/**
 * Normalize URL to absolute form.
 */
function normalizeUrl(url: string, baseUrl?: string): string {
  const u = url.trim();
  if (!u) return "";
  if (u.startsWith("//")) return `https:${u}`;
  if (u.startsWith("http://") || u.startsWith("https://")) return u;
  if (baseUrl) {
    try {
      return new URL(u, baseUrl).href;
    } catch {
      return u;
    }
  }
  return u;
}

/**
 * Extract image URLs from raw content.
 */
export async function extractImageUrls(
  rawContent: string,
  contentType: "html" | "json",
  _strainSlug: string,
  baseUrl?: string
): Promise<ImageUrlResult[]> {
  if (contentType === "html") return extractFromHtml(rawContent, baseUrl);
  return extractFromJson(rawContent, baseUrl);
}
