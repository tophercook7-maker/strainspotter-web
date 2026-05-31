#!/usr/bin/env node
/**
 * Ensures `out/` exists for Capacitor `webDir` when using the remote `server.url` strategy.
 * Minimal shell: redirect to the hosted app (fallback if `server.url` is not applied).
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const outDir = join(root, "out");

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta http-equiv="refresh" content="0;url=https://strainspotter.com/garden/scanner" />
  <title>StrainSpotter</title>
</head>
<body style="font-family:system-ui;margin:2rem;background:#0a0f0a;color:#e8f5e9;">
  <p>Loading StrainSpotter…</p>
  <p><a href="https://strainspotter.com/garden/scanner" style="color:#81c784;">Open in browser</a></p>
</body>
</html>
`;

await mkdir(outDir, { recursive: true });
await writeFile(join(outDir, "index.html"), html, "utf8");
console.log("[capacitor] wrote", join("out", "index.html"));
