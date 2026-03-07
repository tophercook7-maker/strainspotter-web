export type ScanRow = {
  id?: string | number;
  created_at?: string;
  image_url?: string;
  status?: string;
  result?: unknown;
  result_payload?: unknown;
  // legacy fields may or may not exist:
  primary_name?: string | null;
  primary_type?: string | null;
  confidence?: number | null;
};

function getPayload(scan: ScanRow): unknown {
  return scan.result_payload ?? scan.result ?? {};
}

function isObject(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

/**
 * Extract the most useful label for Log Book rows.
 * Works even if primary_name column does not exist.
 * Handles v1 result_payload, legacy result JSON, and packaging/diagnostic shapes.
 */
export function getScanPrimaryLabel(scan: ScanRow): { label: string; kind: string } {
  if (scan.primary_name) {
    return { label: scan.primary_name, kind: scan.primary_type ?? "summary" };
  }

  const r = getPayload(scan);
  if (!isObject(r)) return { label: "Scan", kind: "unknown" };

  // Grow Coach plan
  if ((r as { kind?: string }).kind === "grow_coach_plan") {
    const headline = (r as { plan?: { headline?: string } }).plan?.headline;
    if (typeof headline === "string" && headline.trim()) {
      return { label: headline.trim(), kind: "grow_coach_plan" };
    }
    return { label: "Today's Plan", kind: "grow_coach_plan" };
  }

  // v1 result_payload: primary_match.strain_name
  const v1Match = (r as { primary_match?: { strain_name?: string } }).primary_match?.strain_name;
  if (typeof v1Match === "string" && v1Match.trim()) {
    return { label: v1Match.trim(), kind: "strain" };
  }

  // Packaging OCR path
  const ocrName =
    (r as { packagingOcr?: { strainName?: string } }).packagingOcr?.strainName ??
    (r as { packaging?: { strain_name?: string } }).packaging?.strain_name ??
    (r as { ocr?: { strain_name?: string } }).ocr?.strain_name;
  if (typeof ocrName === "string" && ocrName.trim()) {
    return { label: String(ocrName).trim(), kind: "strain" };
  }

  // Problems/diagnostic path
  const diagnosis =
    (r as { problems?: { top?: { label?: string } } }).problems?.top?.label ??
    (r as { diagnosis?: { label?: string } }).diagnosis?.label ??
    (r as { diagnostic?: { label?: string } }).diagnostic?.label ??
    (r as { health?: { label?: string } }).health?.label;
  if (typeof diagnosis === "string" && diagnosis.trim()) {
    return { label: String(diagnosis).trim(), kind: "health" };
  }

  // Visual match path
  const matches = (r as { matches?: Array<{ strain?: { name?: string }; name?: string }> }).matches;
  const match = matches?.[0]?.strain?.name ?? matches?.[0]?.name;
  if (typeof match === "string" && match.trim()) {
    return { label: String(match).trim(), kind: "strain" };
  }

  return { label: "Scan", kind: "unknown" };
}
