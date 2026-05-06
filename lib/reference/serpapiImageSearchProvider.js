/**
 * SerpApi — Google Images engine for reference discovery (server-side / CLI).
 * Never log API keys.
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
async function searchSerpapiReferenceImages(strainName, limit = 10, options = {}) {
  const maxHttpQueries = Math.max(0, Math.min(3, Number(options.maxHttpQueries ?? 3)));
  const key = process.env.SERPAPI_API_KEY;
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
    providerEnabled: provider === "serpapi",
    keyPresent: Boolean(key && String(key).trim()),
  });

  if (provider !== "serpapi" || !key || !String(key).trim()) {
    if (provider === "serpapi" && (!key || !String(key).trim())) {
      errors.push("Missing SERPAPI_API_KEY");
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

  const num = Math.min(10, Math.max(1, Number(limit) || 10));
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

    const params = new URLSearchParams({
      engine: "google_images",
      q,
      api_key: String(key).trim(),
      num: String(num),
    });

    /** @type {Response} */
    let res;
    try {
      res = await fetch(`https://serpapi.com/search.json?${params.toString()}`, {
        headers: {
          Accept: "application/json",
          "User-Agent": "StrainSpotter/1.0 serpapi-image-search-provider",
        },
        signal: AbortSignal.timeout(25_000),
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
      const errObj = data.error;
      const msg =
        typeof errObj === "string"
          ? errObj
          : errObj && typeof errObj === "object" && typeof errObj.message === "string"
            ? errObj.message
            : text.slice(0, 280);
      errors.push(`HTTP ${res.status}: ${msg}`);
      attempt.ok = false;
      continue;
    }

    const serpErr = data.error;
    if (serpErr) {
      const msg = typeof serpErr === "string" ? serpErr : JSON.stringify(serpErr);
      errors.push(`SerpApi error: ${msg}`);
      attempt.ok = false;
      continue;
    }

    const items = Array.isArray(data.images_results) ? data.images_results : [];
    attempt.rawItemCount = items.length;
    rawItemCountTotal += items.length;
    attempt.ok = true;

    for (const item of items) {
      if (!item || typeof item !== "object") continue;
      const row = /** @type {Record<string, unknown>} */ (item);
      const imageUrlRaw =
        (typeof row.original === "string" && row.original) ||
        (typeof row.thumbnail === "string" && row.thumbnail) ||
        "";
      const imageUrl = imageUrlRaw || "";
      const sourcePageUrl = typeof row.link === "string" ? row.link : "";
      const title = typeof row.title === "string" ? row.title : "";
      const snippet = typeof row.source === "string" ? `Source: ${row.source}` : "";

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
        sourceName: "serpapi",
      });
    }
  }

  if (queriesExecuted > 0 && rawItemCountTotal === 0 && errors.length === 0) {
    warnings.push("SerpApi returned 0 image results for these queries.");
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

module.exports = { searchSerpapiReferenceImages, searchQueriesForStrain };
