const USER_AGENT =
  "StrainSpotterReferenceBot/0.1 (+https://strainspotter.app; reference image attribution)";

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sourceNameFromUrl(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "unknown-source";
  }
}

function resolveUrl(candidate, baseUrl) {
  try {
    return new URL(candidate, baseUrl).toString();
  } catch {
    return "";
  }
}

async function robotsAllows(pageUrl, fetchImpl = fetch) {
  try {
    const url = new URL(pageUrl);
    const robotsUrl = `${url.origin}/robots.txt`;
    const res = await fetchImpl(robotsUrl, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return true;

    const text = await res.text();
    const path = url.pathname || "/";
    let applies = false;
    for (const rawLine of text.split(/\r?\n/)) {
      const line = rawLine.replace(/#.*/, "").trim();
      if (!line) continue;
      const [rawKey, ...rest] = line.split(":");
      const key = rawKey.trim().toLowerCase();
      const value = rest.join(":").trim();
      if (key === "user-agent") {
        applies = value === "*" || value.toLowerCase().includes("strainspotter");
      }
      if (applies && key === "disallow" && value && path.startsWith(value)) {
        return false;
      }
    }
    return true;
  } catch {
    return true;
  }
}

module.exports = {
  USER_AGENT,
  slugify,
  sleep,
  sourceNameFromUrl,
  resolveUrl,
  robotsAllows,
};
