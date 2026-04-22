/**
 * Base URL for browser-side fetches to this app's `/api/*` routes.
 * - Web (Vercel): leave `NEXT_PUBLIC_API_BASE_URL` unset → same-origin relative URLs.
 * - Capacitor / Tauri / custom shells: set to `https://strainspotter.com` (no trailing slash)
 *   so `apiUrl("/api/scan")` hits production APIs while the UI may load from `capacitor://` or `tauri://`.
 */

export function getApiBaseUrl(): string {
  if (typeof process === "undefined" || !process.env?.NEXT_PUBLIC_API_BASE_URL) {
    return "";
  }
  const raw = String(process.env.NEXT_PUBLIC_API_BASE_URL).trim();
  if (!raw) return "";
  return raw.replace(/\/+$/, "");
}

/** Absolute or same-origin path for an API route (must start with `/`). */
export function apiUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  const base = getApiBaseUrl();
  return base ? `${base}${p}` : p;
}
