// lib/scanner/coaFetch.ts — pure, testable helpers for the COA auto-fetch:
// turn a scanned QR link into a direct PDF-download URL, and guard against SSRF.
// The network fetch + PDF parsing itself lives in the API route (Node-only).

/**
 * Resolve a share link to a DIRECT file-download URL when we recognize the host
 * (Dropbox, Google Drive). Otherwise return the URL unchanged. Returns null if
 * it isn't an http(s) URL at all.
 */
export function resolveCoaUrl(raw: string): string | null {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    return null;
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return null;
  const host = u.hostname.toLowerCase();

  // Dropbox share links → force the raw file with dl=1.
  if (host.endsWith("dropbox.com")) {
    u.searchParams.set("dl", "1");
    return u.toString();
  }
  if (host.endsWith("dropboxusercontent.com")) return u.toString();

  // Google Drive → direct download endpoint.
  if (host.endsWith("drive.google.com") || host.endsWith("docs.google.com")) {
    const m = u.pathname.match(/\/(?:file\/)?d\/([a-zA-Z0-9_-]{10,})/);
    const id = m?.[1] || u.searchParams.get("id");
    if (id) return `https://drive.google.com/uc?export=download&id=${id}`;
    return u.toString();
  }

  return u.toString();
}

/** True if this URL is worth trying as a COA (a PDF or a known cert host). */
export function looksLikeCoaUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    const s = (u.hostname + u.pathname + u.search).toLowerCase();
    return (
      /\.pdf(\?|$)/.test(s) ||
      /dropbox|drive\.google|docs\.google|coa|cert|lab|result|confidentcannabis|sclabs|kaycha|acrelab|potency|regulatory|metrc/.test(s)
    );
  } catch {
    return false;
  }
}

/** Reject private / loopback / link-local / reserved IPs (SSRF defense). */
export function isPrivateIp(ip: string): boolean {
  const a = ip.trim().toLowerCase();

  // IPv6
  if (a.includes(":")) {
    if (a === "::1" || a === "::") return true;
    if (a.startsWith("fe80") || a.startsWith("fc") || a.startsWith("fd")) return true; // link-local + ULA
    // IPv4-mapped (::ffff:127.0.0.1)
    const m = a.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (m) return isPrivateIp(m[1]);
    return false;
  }

  // IPv4
  const p = a.split(".").map((n) => parseInt(n, 10));
  if (p.length !== 4 || p.some((n) => isNaN(n) || n < 0 || n > 255)) return true; // malformed → treat unsafe
  const [x, y] = p;
  if (x === 0 || x === 10 || x === 127) return true;
  if (x === 169 && y === 254) return true;          // link-local incl. 169.254.169.254 metadata
  if (x === 172 && y >= 16 && y <= 31) return true; // 172.16/12
  if (x === 192 && y === 168) return true;          // 192.168/16
  if (x === 100 && y >= 64 && y <= 127) return true; // CGNAT 100.64/10
  if (x >= 224) return true;                         // multicast / reserved
  return false;
}
