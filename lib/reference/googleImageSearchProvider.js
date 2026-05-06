/**
 * Google Custom Search JSON API — image results only (server-side / CLI).
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

const EMPTY_ITEMS_WARNING =
  "Google returned 0 image results. Check Programmable Search Engine image search and entire web settings.";

function parseGoogleErrorPayload(data, httpStatus) {
  if (!data || typeof data !== "object") return null;
  const err = data.error;
  if (!err || typeof err !== "object") return null;
  const message = typeof err.message === "string" ? err.message : JSON.stringify(err);
  const status = typeof err.status === "string" ? err.status : String(httpStatus || "");
  const code = err.code != null ? String(err.code) : "";
  return { message, status, code };
}

/**
 * @param {string} strainName
 * @param {number} [limit]
 * @param {{ maxHttpQueries?: number }} [options]
 * @returns {Promise<{ results: Array<{ imageUrl: string; sourcePageUrl: string; title: string; snippet: string; sourceName: string }>; queriesExecuted: number; diagnostics: object }>}
 */
async function searchGoogleReferenceImages(strainName, limit = 10, options = {}) {
  const maxHttpQueries = Math.max(0, Math.min(3, Number(options.maxHttpQueries ?? 3)));
  const key = process.env.GOOGLE_CUSTOM_SEARCH_API_KEY;
  const cx = process.env.GOOGLE_CUSTOM_SEARCH_CX;
  const provider = String(process.env.REFERENCE_IMAGE_SEARCH_PROVIDER || "off").toLowerCase();

  /** @type {string[]} */
  const errors = [];
  /** @type {string[]} */
  const warnings = [];
  /** @type {Array<{ query: string; httpStatus: number | null; ok: boolean; rawItemCount: number; googleError?: { message: string; status: string } }>} */
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
    providerEnabled: provider === "google",
    keyPresent: Boolean(key && String(key).trim()),
    cxPresent: Boolean(cx && String(cx).trim()),
  });

  if (provider !== "google" || !key || !cx) {
    if (provider === "google" && (!key || !cx)) {
      errors.push(!key ? "Missing GOOGLE_CUSTOM_SEARCH_API_KEY" : "Missing GOOGLE_CUSTOM_SEARCH_CX");
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

    const url = `https://www.googleapis.com/customsearch/v1?key=${encodeURIComponent(key)}&cx=${encodeURIComponent(cx)}&q=${encodeURIComponent(q)}&searchType=image&num=${num}`;
    /** @type {Response} */
    let res;
    try {
      res = await fetch(url, {
        headers: {
          Accept: "application/json",
          "User-Agent": "StrainSpotter/1.0 google-image-search-provider",
        },
        signal: AbortSignal.timeout(15_000),
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
      const ge = parseGoogleErrorPayload(data, res.status);
      if (ge) {
        errors.push(`${ge.message} (status=${ge.status || res.status}, code=${ge.code})`);
        attempt.googleError = { message: ge.message, status: ge.status };
      } else {
        errors.push(`HTTP ${res.status} (${q.slice(0, 48)}…) ${text.slice(0, 200)}`);
      }
      attempt.ok = false;
      continue;
    }

    const ge200 = parseGoogleErrorPayload(data, res.status);
    if (ge200) {
      errors.push(`${ge200.message} (status=${ge200.status}, code=${ge200.code})`);
      attempt.googleError = { message: ge200.message, status: ge200.status };
      attempt.ok = false;
      continue;
    }

    const items = Array.isArray(data.items) ? data.items : [];
    attempt.rawItemCount = items.length;
    rawItemCountTotal += items.length;
    attempt.ok = true;

    for (const item of items) {
      const imageUrl = item.link;
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
        sourcePageUrl: item.image?.contextLink || item.displayLink || "",
        title: typeof item.title === "string" ? item.title : "",
        snippet: typeof item.snippet === "string" ? item.snippet : "",
        sourceName: "google-custom-search",
      });
    }
  }

  if (queriesExecuted > 0 && rawItemCountTotal === 0 && errors.length === 0) {
    warnings.push(EMPTY_ITEMS_WARNING);
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
      cxPresent: true,
    },
  };
}

module.exports = { searchGoogleReferenceImages, searchQueriesForStrain, EMPTY_ITEMS_WARNING };
