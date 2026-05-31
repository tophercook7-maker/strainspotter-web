import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { extname, join } from "node:path";

const ROOT = process.cwd();
const CONFIG_PATH = join(ROOT, "data", "source-allowlist.json");
const EXAMPLE_CONFIG_PATH = join(ROOT, "data", "source-allowlist.example.json");
const INBOX_DIR = join(ROOT, "data", "inbox");
const LOG_PATH = join(ROOT, "data", "scrape-log.json");
const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toSourceSlug(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function isHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function isSameSite(pageUrl, baseUrl) {
  const page = new URL(pageUrl);
  const base = new URL(baseUrl);
  return page.origin === base.origin;
}

function imageExtensionFromUrl(imageUrl) {
  const extension = extname(new URL(imageUrl).pathname).toLowerCase();
  return IMAGE_EXTENSIONS.has(extension) ? extension : ".jpg";
}

function extractImageUrls(html, pageUrl) {
  const urls = new Set();
  const pattern = /<img\b[^>]*?\bsrc=["']([^"']+)["'][^>]*>/gi;
  let match;

  while ((match = pattern.exec(html))) {
    try {
      const url = new URL(match[1], pageUrl).toString();
      if (isHttpUrl(url)) urls.add(url);
    } catch {
      // Ignore malformed image URLs.
    }
  }

  return [...urls];
}

async function robotsAllows(targetUrl, userAgent = "StrainSpotterDatasetEngine") {
  const url = new URL(targetUrl);
  const robotsUrl = `${url.origin}/robots.txt`;
  const response = await fetch(robotsUrl, {
    headers: {
      "User-Agent": `${userAgent}/1.0`,
    },
  });

  if (response.status === 404) return true;
  if (!response.ok) return false;

  const text = await response.text();
  const lines = text.split(/\r?\n/);
  let applies = false;

  for (const rawLine of lines) {
    const line = rawLine.split("#")[0]?.trim() ?? "";
    if (!line) continue;
    const [rawKey, ...rawValue] = line.split(":");
    const key = rawKey.trim().toLowerCase();
    const value = rawValue.join(":").trim();

    if (key === "user-agent") {
      const agent = value.toLowerCase();
      applies = agent === "*" || agent === userAgent.toLowerCase();
      continue;
    }

    if (!applies || key !== "disallow") continue;
    if (!value) continue;
    if (url.pathname.startsWith(value)) return false;
  }

  return true;
}

async function readConfig() {
  const configPath = existsSync(CONFIG_PATH) ? CONFIG_PATH : EXAMPLE_CONFIG_PATH;
  const config = JSON.parse(await readFile(configPath, "utf8"));
  if (!Array.isArray(config.sources)) {
    throw new Error("Source allowlist config must include a sources array");
  }
  return { configPath, sources: config.sources };
}

async function main() {
  const { configPath, sources } = await readConfig();
  await mkdir(INBOX_DIR, { recursive: true });

  const log = {
    generatedAt: new Date().toISOString(),
    configPath: configPath.replace(ROOT + "/", ""),
    downloaded: [],
    skipped: [],
  };

  for (const source of sources) {
    if (source.enabled !== true) {
      log.skipped.push({
        source: source.name,
        reason: "Source is not enabled",
      });
      continue;
    }

    if (!source.licenseNotes || /only use if permission/i.test(source.licenseNotes)) {
      log.skipped.push({
        source: source.name,
        reason: "License notes do not confirm permission",
      });
      continue;
    }

    if (!isHttpUrl(source.baseUrl)) {
      log.skipped.push({ source: source.name, reason: "Invalid baseUrl" });
      continue;
    }

    const rateLimitMs = Math.max(Number(source.rateLimitMs ?? 3000), 1000);
    const sourceSlug = toSourceSlug(source.name);
    let downloadedForSource = 0;

    for (const page of source.strainPages ?? []) {
      if (!page.strainSlug || !isHttpUrl(page.url)) {
        log.skipped.push({
          source: source.name,
          url: page.url,
          reason: "Invalid strain page config",
        });
        continue;
      }

      if (!isSameSite(page.url, source.baseUrl)) {
        log.skipped.push({
          source: source.name,
          url: page.url,
          reason: "Page URL is outside baseUrl origin",
        });
        continue;
      }

      if (!(await robotsAllows(page.url))) {
        log.skipped.push({
          source: source.name,
          url: page.url,
          reason: "Blocked by robots.txt",
        });
        continue;
      }

      await sleep(rateLimitMs);

      const pageResponse = await fetch(page.url, {
        headers: {
          "User-Agent": "StrainSpotterDatasetEngine/1.0 (+allowlisted sources only)",
        },
      });
      if (!pageResponse.ok) {
        log.skipped.push({
          source: source.name,
          url: page.url,
          reason: `Page fetch failed: ${pageResponse.status}`,
        });
        continue;
      }

      const html = await pageResponse.text();
      const imageUrls = extractImageUrls(html, page.url).filter((imageUrl) =>
        isSameSite(imageUrl, source.baseUrl)
      );

      let pageImageIndex = 1;
      for (const imageUrl of imageUrls) {
        await sleep(rateLimitMs);

        const imageResponse = await fetch(imageUrl, {
          headers: {
            "User-Agent": "StrainSpotterDatasetEngine/1.0 (+allowlisted sources only)",
          },
        });
        if (!imageResponse.ok) {
          log.skipped.push({
            source: source.name,
            url: imageUrl,
            reason: `Image fetch failed: ${imageResponse.status}`,
          });
          continue;
        }

        const contentType = imageResponse.headers.get("content-type") ?? "";
        if (!contentType.startsWith("image/")) {
          log.skipped.push({
            source: source.name,
            url: imageUrl,
            reason: `Not an image response: ${contentType || "unknown"}`,
          });
          continue;
        }

        const extension = imageExtensionFromUrl(imageUrl);
        const fileName = `${page.strainSlug}__${sourceSlug}__${String(pageImageIndex).padStart(3, "0")}${extension}`;
        const destination = join(INBOX_DIR, fileName);
        if (existsSync(destination)) {
          log.skipped.push({
            source: source.name,
            url: imageUrl,
            reason: `Destination already exists: ${fileName}`,
          });
          pageImageIndex += 1;
          continue;
        }

        const bytes = Buffer.from(await imageResponse.arrayBuffer());
        await writeFile(destination, bytes);
        log.downloaded.push({
          fileName,
          strainSlug: page.strainSlug,
          source: source.name,
          sourceUrl: imageUrl,
          pageUrl: page.url,
          licenseNotes: source.licenseNotes,
        });
        pageImageIndex += 1;
        downloadedForSource += 1;
      }
    }

    console.log(`${source.name}: downloaded ${downloadedForSource} images`);
  }

  await writeFile(LOG_PATH, JSON.stringify(log, null, 2) + "\n", "utf8");
  console.log(`Scrape log written: data/scrape-log.json`);
}

main().catch((error) => {
  console.error("Allowlisted scrape failed:", error);
  process.exit(1);
});
