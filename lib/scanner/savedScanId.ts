/**
 * Detects IDs that refer to server-persisted `scans` rows (Supabase UUID).
 * Local registry-only scans use `local:…` prefixes and must not hit the server.
 */
const SERVER_SCAN_ROW_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isServerBackedSavedScanId(id: string): boolean {
  const t = id.trim();
  if (!t || t.startsWith("local:")) return false;
  return SERVER_SCAN_ROW_ID.test(t);
}
