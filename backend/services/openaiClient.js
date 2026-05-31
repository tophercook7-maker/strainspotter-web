const fs = require("node:fs");
const path = require("node:path");
const OpenAI = require("openai");

const OpenAIClient = OpenAI.default || OpenAI;
const ENV_PATH = path.resolve(process.cwd(), "env/.env.local");

let localEnvLoaded = false;
let cachedClient = null;
let cachedApiKey = null;

function parseEnvLine(line) {
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
  if (localEnvLoaded) return;
  localEnvLoaded = true;

  if (!fs.existsSync(ENV_PATH)) return;

  const contents = fs.readFileSync(ENV_PATH, "utf8");
  for (const line of contents.split(/\r?\n/)) {
    const parsed = parseEnvLine(line);
    if (!parsed || parsed.key in process.env) continue;
    process.env[parsed.key] = parsed.value;
  }
}

function getOpenAIClient() {
  loadLocalBackendEnv();

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is missing. Run npm run setup:openai or add it to env/.env.local."
    );
  }

  if (!cachedClient || cachedApiKey !== apiKey) {
    cachedClient = new OpenAIClient({ apiKey });
    cachedApiKey = apiKey;
  }

  return cachedClient;
}

module.exports = {
  getOpenAIClient,
  loadLocalBackendEnv,
};
