export type ScannerCostMode = "free" | "paid_ai";

const DEFAULT_EMBEDDING_MODEL =
  process.env.SCANNER_EMBEDDING_MODEL || "Xenova/clip-vit-base-patch32";

export function getLocalEmbeddingModelLabel(): string {
  return DEFAULT_EMBEDDING_MODEL;
}

export function getScannerCostMode(): ScannerCostMode {
  const v = String(process.env.SCANNER_COST_MODE || "free").toLowerCase().trim();
  return v === "paid_ai" ? "paid_ai" : "free";
}

/** Env gate: server allows OpenAI vision calls when true. */
export function isOpenAiOnScanEnvEnabled(): boolean {
  return String(process.env.SCANNER_USE_OPENAI_ON_SCAN || "").toLowerCase() === "true";
}

export function hasOpenAiApiKeyConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

/** SCANNER_AI_PROVIDER must be openai (not off/google) for paid vision. */
export function isScannerAiProviderOpenAi(): boolean {
  const v = String(process.env.SCANNER_AI_PROVIDER ?? "off").toLowerCase().trim();
  return v === "openai";
}

/**
 * Whether /api/scan should call OpenAI for this request.
 * - paid_ai + env enabled + key + provider openai → always try OpenAI.
 * - free + same env + explicit client useOpenAI:true → try OpenAI.
 */
export function shouldCallOpenAiVision(clientRequestedOpenAi: boolean): boolean {
  if (!hasOpenAiApiKeyConfigured()) return false;
  if (!isScannerAiProviderOpenAi()) return false;
  if (!isOpenAiOnScanEnvEnabled()) return false;
  const mode = getScannerCostMode();
  if (mode === "paid_ai") return true;
  return clientRequestedOpenAi === true;
}

export type OpenAiSkipReasonCode =
  | "openai_used"
  | "missing_api_key"
  | "ai_provider_not_openai"
  | "use_openai_on_scan_disabled"
  | "free_mode_no_client_flag"
  | "unknown";

export function describeOpenAiSkipReason(
  clientRequestedOpenAi: boolean,
  openAiWouldRun: boolean
): { code: OpenAiSkipReasonCode; message: string } {
  if (openAiWouldRun) {
    return { code: "openai_used", message: "" };
  }
  if (!hasOpenAiApiKeyConfigured()) {
    return {
      code: "missing_api_key",
      message: "OPENAI_API_KEY is not set.",
    };
  }
  if (!isScannerAiProviderOpenAi()) {
    return {
      code: "ai_provider_not_openai",
      message: `SCANNER_AI_PROVIDER is not openai (got ${String(process.env.SCANNER_AI_PROVIDER || "off").toLowerCase()}).`,
    };
  }
  if (!isOpenAiOnScanEnvEnabled()) {
    return {
      code: "use_openai_on_scan_disabled",
      message: "SCANNER_USE_OPENAI_ON_SCAN is not true.",
    };
  }
  if (getScannerCostMode() === "free" && !clientRequestedOpenAi) {
    return {
      code: "free_mode_no_client_flag",
      message: "Free mode: OpenAI runs only when useOpenAI=true is sent.",
    };
  }
  return { code: "unknown", message: "OpenAI skipped." };
}
