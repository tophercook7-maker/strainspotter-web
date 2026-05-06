export type ScannerMatchingMode = "normal" | "embedding_only" | "text_only";

export function isScannerDebugMatching(): boolean {
  return String(process.env.SCANNER_DEBUG_MATCHING || "").toLowerCase() === "true";
}

export function isFeedbackPriorDisabled(): boolean {
  return String(process.env.SCANNER_DISABLE_FEEDBACK_PRIOR || "").toLowerCase() === "true";
}

export function isProviderBoostDisabled(): boolean {
  return String(process.env.SCANNER_DISABLE_PROVIDER_BOOST || "").toLowerCase() === "true";
}

export function getScannerMatchingMode(): ScannerMatchingMode {
  const v = String(process.env.SCANNER_MATCHING_MODE || "normal").toLowerCase().trim();
  if (v === "embedding_only") return "embedding_only";
  if (v === "text_only") return "text_only";
  return "normal";
}
