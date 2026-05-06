const {
  USER_AGENT,
  resolveUrl,
  robotsAllows,
  sourceNameFromUrl,
} = require("./baseAdapter");

function extractImagesFromHtml(html, sourcePageUrl) {
  const candidates = [];
  const seen = new Set();

  const add = (rawUrl, licenseNote = "") => {
    const imageUrl = resolveUrl(rawUrl, sourcePageUrl);
    if (!imageUrl || seen.has(imageUrl)) return;
    if (!/^https?:\/\//i.test(imageUrl)) return;
    seen.add(imageUrl);
    candidates.push({
      sourceName: sourceNameFromUrl(sourcePageUrl),
      sourcePageUrl,
      imageUrl,
      licenseNote,
    });
  };

  const metaRegex =
    /<meta\s+[^>]*(?:property|name)=["'](?:og:image|twitter:image)["'][^>]*content=["']([^"']+)["'][^>]*>/gi;
  for (const match of html.matchAll(metaRegex)) add(match[1], "OpenGraph/Twitter image from source page");

  const imgRegex = /<img\s+[^>]*(?:src|data-src)=["']([^"']+)["'][^>]*>/gi;
  for (const match of html.matchAll(imgRegex)) add(match[1], "Image tag from source page");

  return candidates;
}

async function collectFromManualSource(source) {
  if (!source?.sourcePageUrl) return [];

  const allowed = await robotsAllows(source.sourcePageUrl);
  if (!allowed) {
    return [
      {
        sourceName: sourceNameFromUrl(source.sourcePageUrl),
        sourcePageUrl: source.sourcePageUrl,
        imageUrl: "",
        licenseNote: "Skipped because robots.txt disallows this path",
        skipped: true,
      },
    ];
  }

  const res = await fetch(source.sourcePageUrl, {
    headers: { "User-Agent": USER_AGENT, Accept: "text/html,application/xhtml+xml" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const html = await res.text();
  return extractImagesFromHtml(html, source.sourcePageUrl);
}

async function collectFromGoogle(strainName, limit) {
  const key = process.env.GOOGLE_CUSTOM_SEARCH_API_KEY;
  const cx = process.env.GOOGLE_CUSTOM_SEARCH_CX;
  if (!key || !cx) return [];

  const params = new URLSearchParams({
    key,
    cx,
    searchType: "image",
    num: String(Math.min(limit, 10)),
    q: `${strainName} cannabis strain flower`,
  });
  const res = await fetch(`https://www.googleapis.com/customsearch/v1?${params}`, {
    headers: { "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`Google Custom Search HTTP ${res.status}`);
  const json = await res.json();
  return (json.items ?? []).map((item) => ({
    sourceName: sourceNameFromUrl(item.image?.contextLink || item.link),
    sourcePageUrl: item.image?.contextLink || item.link,
    imageUrl: item.link,
    licenseNote: "Discovered via Google Custom Search; verify source terms before production use",
  }));
}

async function collectFromBing(strainName, limit) {
  const key = process.env.BING_IMAGE_SEARCH_API_KEY;
  if (!key) return [];

  const params = new URLSearchParams({
    count: String(Math.min(limit, 50)),
    q: `${strainName} cannabis strain flower`,
    safeSearch: "Moderate",
  });
  const res = await fetch(`https://api.bing.microsoft.com/v7.0/images/search?${params}`, {
    headers: {
      "User-Agent": USER_AGENT,
      "Ocp-Apim-Subscription-Key": key,
    },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`Bing Image Search HTTP ${res.status}`);
  const json = await res.json();
  return (json.value ?? []).map((item) => ({
    sourceName: sourceNameFromUrl(item.hostPageUrl || item.contentUrl),
    sourcePageUrl: item.hostPageUrl,
    imageUrl: item.contentUrl,
    licenseNote: "Discovered via Bing Image Search; verify source terms before production use",
  }));
}

module.exports = {
  collectFromManualSource,
  collectFromGoogle,
  collectFromBing,
};
