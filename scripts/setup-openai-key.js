#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const readline = require("node:readline");

const projectRoot = path.resolve(__dirname, "..");
const envDir = path.join(projectRoot, "env");
const envPath = path.join(envDir, ".env.local");
const gitignorePath = path.join(projectRoot, ".gitignore");

const DEFAULTS = {
  SCANNER_AI_PROVIDER: "openai",
  SCANNER_MAX_IMAGE_MB: "4",
  SCANNER_RATE_LIMIT_PER_MINUTE: "10",
};

function promptHidden(question) {
  return new Promise((resolve, reject) => {
    if (!process.stdin.isTTY || !process.stdin.setRawMode) {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });
      rl.question(`${question} `, (answer) => {
        rl.close();
        resolve(answer.trim());
      });
      return;
    }

    process.stdout.write(`${question} `);
    process.stdin.resume();
    process.stdin.setEncoding("utf8");
    process.stdin.setRawMode(true);

    let value = "";

    function cleanup() {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdin.removeListener("data", onData);
    }

    function onData(char) {
      if (char === "\u0003") {
        cleanup();
        process.stdout.write("\n");
        reject(new Error("Setup cancelled."));
        return;
      }

      if (char === "\r" || char === "\n") {
        cleanup();
        process.stdout.write("\n");
        resolve(value.trim());
        return;
      }

      if (char === "\u007f" || char === "\b") {
        value = value.slice(0, -1);
        return;
      }

      value += char;
    }

    process.stdin.on("data", onData);
  });
}

function parseEnvLines(contents) {
  const lines = contents ? contents.split(/\r?\n/) : [];
  const positions = new Map();

  lines.forEach((line, index) => {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=/);
    if (match) positions.set(match[1], index);
  });

  return { lines, positions };
}

function upsertEnvValue(parsed, key, value) {
  const line = `${key}=${value}`;
  const existingIndex = parsed.positions.get(key);

  if (existingIndex == null) {
    parsed.lines.push(line);
    parsed.positions.set(key, parsed.lines.length - 1);
    return;
  }

  parsed.lines[existingIndex] = line;
}

function ensureGitignored() {
  const entry = "env/.env.local";
  const gitignore = fs.existsSync(gitignorePath)
    ? fs.readFileSync(gitignorePath, "utf8")
    : "";

  if (gitignore.split(/\r?\n/).includes(entry)) return;

  const next = gitignore.endsWith("\n")
    ? `${gitignore}${entry}\n`
    : `${gitignore}\n${entry}\n`;
  fs.writeFileSync(gitignorePath, next, "utf8");
}

async function main() {
  const apiKey = await promptHidden(
    "Paste your OpenAI API key for StrainSpotter backend:"
  );

  if (!apiKey) {
    throw new Error("No API key entered.");
  }

  fs.mkdirSync(envDir, { recursive: true });

  const current = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";
  const parsed = parseEnvLines(current);

  upsertEnvValue(parsed, "OPENAI_API_KEY", apiKey);
  for (const [key, value] of Object.entries(DEFAULTS)) {
    upsertEnvValue(parsed, key, value);
  }

  const body = parsed.lines.join("\n").replace(/\n*$/, "\n");
  fs.writeFileSync(envPath, body, { encoding: "utf8", mode: 0o600 });
  ensureGitignored();

  console.log(
    "OpenAI backend key saved to env/.env.local. The key was not printed."
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
