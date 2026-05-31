import { readFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { extname, resolve, join } from "node:path";
import { NextResponse } from "next/server";
import { dataEnginePaths } from "@/lib/data-engine/dataPaths";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROOT = process.cwd();
const DATA_ROOT = dataEnginePaths.dataRoot();
const PROJECT_DATA_ROOT = dataEnginePaths.projectDataRoot;
const VAULT_INDEX_PATH = dataEnginePaths.vaultIndexPath();
const INBOX_DIR = dataEnginePaths.inboxDir();
const PREFILTERED_MANIFEST_PATH = dataEnginePaths.prefilteredManifestPath();
const PURPLE_CLUSTER_MANIFEST_PATH = dataEnginePaths.purpleClusterManifestPath();
const REVIEW_MANIFEST_PATH = dataEnginePaths.reviewManifestPath();
const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);

function localOnly() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Data engine is local-only." }, { status: 404 });
  }
  return null;
}

function contentTypeFor(path: string) {
  const extension = extname(path).toLowerCase();
  if (extension === ".png") return "image/png";
  if (extension === ".webp") return "image/webp";
  return "image/jpeg";
}

function fileKeyForPath(filePath?: string) {
  if (!filePath) return undefined;
  return createHash("sha256").update(filePath).digest("hex").slice(0, 24);
}

async function readJson(path: string, fallback: unknown) {
  if (!existsSync(path)) return fallback;
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    console.warn("[DataEngine] Image route falling back for unreadable JSON", path, error);
    return fallback;
  }
}

async function resolveImagePathByKey(key: string) {
  try {
    if (existsSync(INBOX_DIR)) {
      const entries = await readdir(INBOX_DIR, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isFile()) continue;
        const filePath = join(INBOX_DIR, entry.name);
        if (fileKeyForPath(filePath) === key) return filePath;
      }
    }
    const sources = await Promise.all([
      readJson(PREFILTERED_MANIFEST_PATH, null),
      readJson(PURPLE_CLUSTER_MANIFEST_PATH, null),
      readJson(REVIEW_MANIFEST_PATH, null),
      readJson(VAULT_INDEX_PATH, { items: [] }),
    ]);
    for (const source of sources) {
      const items = Array.isArray((source as any)?.items) ? (source as any).items : [];
      for (const item of items) {
        const filePath = typeof item?.filePath === "string" ? item.filePath : undefined;
        if (filePath && fileKeyForPath(filePath) === key) return filePath;
      }
    }
  } catch (error) {
    console.warn("[DataEngine] Failed to resolve image key", key, error);
  }
  return null;
}

function isAllowedImagePath(path: string) {
  const resolvedPath = resolve(path);
  const extension = extname(resolvedPath).toLowerCase();
  if (!IMAGE_EXTENSIONS.has(extension)) return false;
  if (resolvedPath.startsWith(DATA_ROOT)) return true;
  if (resolvedPath.startsWith(PROJECT_DATA_ROOT)) return true;
  return resolvedPath.startsWith("/Volumes/");
}

export async function GET(request: Request) {
  const blocked = localOnly();
  if (blocked) return blocked;

  const url = new URL(request.url);
  const key = url.searchParams.get("key");
  const path = key ? await resolveImagePathByKey(key) : url.searchParams.get("path");
  if (!path || !isAllowedImagePath(path) || !existsSync(path)) {
    return NextResponse.json({ error: "Image not found" }, { status: 404 });
  }

  const bytes = await readFile(path);
  return new Response(bytes, {
    headers: {
      "Content-Type": contentTypeFor(path),
      "Cache-Control": "no-store",
    },
  });
}
