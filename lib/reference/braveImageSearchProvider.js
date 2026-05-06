/**
 * Brave Search API — image search for reference discovery (server-side / CLI).
 * Never log API keys.
 * @see https://api.search.brave.com/res/v1/images/search
 */

function isPlaceholderUrl(url) {
  if (!url || typeof url !== "string") return true;
  const s = url.trim();
  if (!/^https?:\/\//i.test(s)) return true;
  if (/\bplaceholder\b/i.test(s)) return true;
  if (/\.\.\.(?:\/|$)/.test(s)) return true;
  return false;
}

function searchQueriesForStrain(strainName) {
  return [
    `"${strainName}" cannabis strain bud photo`,
    `"${strainName}" strain flower`,
    `"${strainName}" cannabis flower`,
  ];
}

/**
 * @param {string} strainName
 * @param {number} [limit]
 * @param {{ maxHttpQueries?: number }} [options]
 */
async function searchBraveReferenceImages(strainName, limit = 10, options = {}) {
  const maxHttpQueries = Math.max(0, Math.min(3, Number(options.maxHttpQueries ?? 3)));
  const key = process.env.BRAVE_SEARCH_API_KEY;
  const provider = String(process.env.REFERENCE_IMAGE_SEARCH_PROVIDER || "off").toLowerCase();

  /** @type {string[]} */
  const errors = [];
  /** @type {string[]} */
  const warnings = [];
  /** @type {Array<{ query: string; httpStatus: number | null; ok: boolean; rawItemCount: number }>} */
  const queryAttempts = [];
  let rawItemCountTotal = 0;
  let placeholdersOrDupSkipped = 0;

  const emptyDiagnosticsReturn = () => ({
    queriesTried: [],
    rawUrlsReturnedBeforeFiltering: 0,
    placeholdersSkipped: 0,
    errors,
    warnings,
    queryAttempts,
    providerEnabled: provider === "brave",
    keyPresent: Boolean(key && String(key).trim()),
  });

  if (provider !== "brave" || !key || !String(key).trim()) {
    if (provider === "brave" && (!key || !String(key).trim())) {
      errors.push("Missing BRAVE_SEARCH_API_KEY");
    }
    return {
      results: [],
      queriesExecuted: 0,
      diagnostics: {
        ...emptyDiagnosticsReturn(),
        queriesTried: [],
      },
    };
  }

  const count = Math.min(50, Math.max(1, Number(limit) || 10));
  const queries = searchQueriesForStrain(strainName);
  const seenUrl = new Set();
  const results = [];
  let queriesExecuted = 0;

  for (const q of queries) {
    if (queriesExecuted >= maxHttpQueries) break;

    queriesExecuted += 1;
    queryAttempts.push({
      query: q,
      httpStatus: null,
      ok: false,
      rawItemCount: 0,
    });
    const attempt = queryAttempts[queryAttempts.length - 1];

    const u = new URL("https://api.search.brave.com/res/v1/images/search");
    u.searchParams.set("q", q);
    u.searchParams.set("count", String(count));
    u.searchParams.set("safesearch", "strict");
    u.searchParams.set("search_lang", "en");

    /** @type {Response} */
    let res;
    try {
      res = await fetch(u.toString(), {
        headers: {
          Accept: "application/json",
          "X-Subscription-Token": String(key).trim(),
          "User-Agent": "StrainSpotter/1.0 brave-image-search-provider",
        },
        signal: AbortSignal.timeout(20_000),
      });
    } catch (e) {
      const msg = String(e instanceof Error ? e.message : e);
      errors.push(`Fetch failed (${q.slice(0, 40)}…): ${msg}`);
      attempt.httpStatus = null;
      continue;
    }

    attempt.httpStatus = res.status;
    attempt.ok = res.ok;

    const text = await res.text().catch(() => "");
    /** @type {Record<string, unknown> | null} */
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      errors.push(`Invalid JSON (${res.status}) for query starting “${q.slice(0, 48)}…”`);
      attempt.ok = false;
      continue;
    }

    if (!data || typeof data !== "object") {
      errors.push(`Empty response (${res.status})`);
      attempt.ok = false;
      continue;
    }

    if (!res.ok) {
      const msg =
        typeof (/** @type {{ message?: string }} */ (data).message) === "string"
          ? (/** @type {{ message?: string }} */ (data).message)
          : text.slice(0, 280);
      errors.push(`HTTP ${res.status}: ${msg}`);
      attempt.ok = false;
      continue;
    }

    const items = Array.isArray(data.results) ? data.results : [];
    attempt.rawItemCount = items.length;
    rawItemCountTotal += items.length;
    attempt.ok = true;

    for (const item of items) {
      if (!item || typeof item !== "object") continue;
      const row = /** @type {Record<string, unknown>} */ (item);
      const props = row.properties && typeof row.properties === "object" ? row.properties : null;
      const p = props && typeof props === "object" ? /** @type {Record<string, unknown>} */ (props) : null;
      const thumb = row.thumbnail && typeof row.thumbnail === "object" ? row.thumbnail : null;
      const t = thumb && typeof thumb === "object" ? /** @type {Record<string, unknown>} */ (thumb) : null;

      const imageUrlRaw =
        (p && typeof p.url === "string" && p.url) ||
        (t && typeof t.src === "string" && t.src) ||
        "";
      const imageUrl = typeof imageUrlRaw === "string" ? imageUrlRaw : "";
      const sourcePageUrl =
        typeof row.url === "string"
          ? row.url
          : typeof row.source === "string"
            ? `https://${row.source}`
            : "";
      const title = typeof row.title === "string" ? row.title : "";
      const snippet =
        typeof row.source === "string" && row.source ? `Source: ${row.source}` : "";

      if (!imageUrl || seenUrl.has(imageUrl)) {
        placeholdersOrDupSkipped += 1;
        continue;
      }
      if (isPlaceholderUrl(imageUrl)) {
        placeholdersOrDupSkipped += 1;
        continue;
      }
      seenUrl.add(imageUrl);
      results.push({
        imageUrl,
        sourcePageUrl,
        title,
        snippet,
        sourceName: "brave-search",
      });
    }
  }

  if (queriesExecuted > 0 && rawItemCountTotal === 0 && errors.length === 0) {
    warnings.push("Brave returned 0 image results for these queries.");
  }

  return {
    results,
    queriesExecuted,
    diagnostics: {
      queriesTried: queryAttempts.map((a) => a.query),
      rawUrlsReturnedBeforeFiltering: rawItemCountTotal,
      placeholdersSkipped: placeholdersOrDupSkipped,
      errors,
      warnings,
      queryAttempts,
      providerEnabled: true,
      keyPresent: true,
    },
  };
}

module.exports = { searchBraveReferenceImages, searchQueriesForStrain };
