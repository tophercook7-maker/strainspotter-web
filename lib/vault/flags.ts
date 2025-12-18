/**
 * Flag-File Signaling System
 * Allows safe signaling between Next.js and external processes
 * without inline scraping/training
 */

import fs from "fs";
import path from "path";
import { VAULT_ROOT } from "./config";

const FLAGS_DIR = path.join(VAULT_ROOT, "flags");

function ensureFlagsDir() {
  if (!fs.existsSync(FLAGS_DIR)) {
    fs.mkdirSync(FLAGS_DIR, { recursive: true });
  }
}

/**
 * Write a flag file with optional payload
 */
export function writeFlag(name: string, payload: any = {}) {
  ensureFlagsDir();
  const file = path.join(FLAGS_DIR, `${name}.json`);
  const data = {
    ...payload,
    ts: Date.now(),
    timestamp: new Date().toISOString(),
  };
  fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf8");
  console.log(`[vault/flags] Wrote flag: ${name}.json`);
  return file;
}

/**
 * List all flag files
 */
export function listFlags() {
  ensureFlagsDir();
  try {
    return fs.readdirSync(FLAGS_DIR).filter((f) => f.endsWith(".json"));
  } catch (error) {
    console.error("[vault/flags] Error listing flags:", error);
    return [];
  }
}

/**
 * Read a flag file by name (without .json extension)
 */
export function readFlag(name: string) {
  ensureFlagsDir();
  const file = path.join(FLAGS_DIR, `${name}.json`);
  if (!fs.existsSync(file)) {
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    console.error(`[vault/flags] Error reading flag ${name}:`, error);
    return null;
  }
}

/**
 * Delete a flag file (for cleanup)
 */
export function deleteFlag(name: string) {
  ensureFlagsDir();
  const file = path.join(FLAGS_DIR, `${name}.json`);
  if (fs.existsSync(file)) {
    fs.unlinkSync(file);
    console.log(`[vault/flags] Deleted flag: ${name}.json`);
    return true;
  }
  return false;
}
