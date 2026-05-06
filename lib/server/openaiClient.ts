import "server-only";

import fs from "node:fs";
import path from "node:path";
import OpenAI from "openai";

let loadedLocalEnv = false;
let cachedClient: OpenAI | null = null;
let cachedApiKey: string | null = null;
const BACKEND_ENV_KEYS = new Set([
  "OPENAI_API_KEY",
  "SCANNER_AI_PROVIDER",
  "SCANNER_MAX_IMAGE_MB",
  "SCANNER_RATE_LIMIT_PER_MINUTE",
]);

function parseEnvLine(line: string): { key: string; value: string } | null {
  const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
  if (!match) return null;

  let value = match[2] ?? "";
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }

  return { key: match[1], value };
}

function loadLocalBackendEnv() {
  if (loadedLocalEnv) return;
  loadedLocalEnv = true;

  const envPath = path.join(process.cwd(), "env", ".env.local");
  if (!fs.existsSync(envPath)) return;

  const contents = fs.readFileSync(envPath, "utf8");
  for (const line of contents.split(/\r?\n/)) {
    const parsed = parseEnvLine(line);
    if (!parsed) continue;
    if (!BACKEND_ENV_KEYS.has(parsed.key) && parsed.key in process.env) continue;
    process.env[parsed.key] = parsed.value;
  }
}

export function getOpenAIClient(): OpenAI {
  loadLocalBackendEnv();

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is missing. Run npm run setup:openai or add it to env/.env.local."
    );
  }

  if (!cachedClient || cachedApiKey !== apiKey) {
    cachedClient = new OpenAI({ apiKey });
    cachedApiKey = apiKey;
  }

  return cachedClient;
}
