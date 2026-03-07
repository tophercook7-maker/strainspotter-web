#!/usr/bin/env node

/**
 * Image Scraper V2 - Mass Scale (35,000 strains)
 * 
 * Three-layer architecture:
 * - Layer 1: Canonical query pool (~2-4k terms)
 * - Layer 2: Image harvester (global pool, deduplicated)
 * - Layer 3: Strain assignment (reuse images from pool)
 * 
 * Features:
 * - Resumable at each layer
 * - Concurrent workers for harvesting
 * - Image reuse across strains
 * - No paid APIs
 */

import { writeFileSync, readFileSync, existsSync, unlinkSync } from 'fs';
import { join } from 'path';
import { fetch as undiciFetch, Agent } from 'undici';

// Configuration
const CONFIG = {
  // Files
  canonicalQueriesFile: 'canonical_queries.json',
  imagePoolFile: 'image_pool.json',
  strainImagesFile: 'strain_images.json',
  
  // Progress files
  queryProgressFile: 'progress_queries.json',
  harvestProgressFile: 'progress_harvest.json',
  canonicalProgressFile: 'canonical_progress.json',
  assignProgressFile: 'assignment_progress.json',
  
  // Harvesting — UND_ERR_CONNECT_TIMEOUT: fewer workers = fewer concurrent TCP connections
  maxImagesPerQuery: 8,
  maxConcurrentWorkers: Number(process.env.DATASET_MAX_DOWNLOAD_CONCURRENCY) || 8,
  requestDelay: Number(process.env.DELAY_MS) || 1200,
  requestDelayJitter: 150, // ±150ms random to desync workers, reduce thundering herd
  maxRetries: 3,
  retryDelay: 5000,
  
  // Assignment
  minImagesPerStrain: 1,
  maxImagesPerStrain: 5,
  
  // Logging intervals
  logIntervalQueries: 100,
  logIntervalStrains: 1000,
};

// Generic fallback queries — harvested to give unmatched strains at least 1 image
const FALLBACK_QUERIES = [
  'cannabis bud',
  'weed flower',
  'marijuana strain',
  'cannabis flower',
  'indica bud',
  'sativa flower',
];

// DDG regions for global scraping — comma-separated, e.g. "us-en,uk-en,de-de,fr-fr,es-es,nl-nl"
// See https://duckduckgo.com/duckduckgo-help-pages/settings/params/
const DDG_REGIONS = (process.env.DDG_REGIONS || 'us-en')
  .split(',')
  .map(r => r.trim())
  .filter(Boolean);

// Skip DDG entirely — use Pixabay only. Set SKIP_DDG=1 when DDG is unreachable (e.g. blocked network).
const SKIP_DDG = process.env.SKIP_DDG === '1' || process.env.SKIP_DDG === 'true';

// User agent
const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

/**
 * Sleep utility
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Jittered delay — base delay ± jitter to desync workers and reduce rate-limit spikes
 */
function sleepWithJitter(baseMs, jitterMs = 0) {
  const j = jitterMs > 0 ? (Math.random() * 2 - 1) * jitterMs : 0;
  return sleep(Math.max(50, baseMs + j));
}

/**
 * Normalize query string
 * - Lowercase
 * - Trim
 * - Remove special characters (keep spaces and alphanumeric)
 */
function normalizeQuery(str) {
  if (!str || typeof str !== 'string') return null;
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special chars except hyphens
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

/**
 * Check if a parent name is generic (should be skipped)
 */
function isGenericParent(name) {
  if (!name || typeof name !== 'string') return true;
  const normalized = normalizeQuery(name);
  const genericTerms = [
    'indica', 'sativa', 'hybrid', 'ruderalis',
    'unknown', 'unknown parent', 'n/a', 'none',
    'landrace', 'pure', 'pure indica', 'pure sativa',
  ];
  return genericTerms.includes(normalized);
}

/**
 * Load strains from Supabase or JSON
 */
async function loadStrains() {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );

      const { data, error } = await supabase
        .from('strains')
        .select('name, slug, aliases, lineage')
        .limit(50000); // Support up to 50k strains

      if (!error && data) {
        console.log(`[LOADER] Loaded ${data.length} strains from Supabase`);
        return data;
      }
    } catch (err) {
      console.warn('[LOADER] Supabase load failed:', err.message);
    }
  }

  const jsonPath = join(process.cwd(), 'strains.json');
  if (existsSync(jsonPath)) {
    try {
      const data = JSON.parse(readFileSync(jsonPath, 'utf-8'));
      console.log(`[LOADER] Loaded ${data.length} strains from JSON`);
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.error('[LOADER] Failed to load JSON:', err.message);
    }
  }

  const strainsTxtPath = process.env.DATASET_STRAINS_FILE?.trim() || '/Volumes/TheVault/full_strains_35000.txt';
  if (existsSync(strainsTxtPath)) {
    try {
      const raw = readFileSync(strainsTxtPath, 'utf-8');
      const lines = raw.split(/\r?\n/).filter((l) => l.trim());
      const data = lines.map((line) => {
        const idx = line.lastIndexOf('|');
        if (idx >= 0) {
          const name = line.slice(0, idx).trim();
          const slug = line.slice(idx + 1).trim();
          return { name: name || slug, slug: slug || name, aliases: null, lineage: null };
        }
        const slug = line.trim().toLowerCase().replace(/\s+/g, '-');
        return { name: line.trim(), slug, aliases: null, lineage: null };
      });
      if (data.length > 0) {
        console.log(`[LOADER] Loaded ${data.length} strains from ${strainsTxtPath}`);
        return data;
      }
    } catch (err) {
      console.warn('[LOADER] Failed to load strains file:', err.message);
    }
  }

  console.warn('[LOADER] No data source, using test strains');
  return [
    { name: 'Blue Dream', slug: 'blue-dream', aliases: null, lineage: null },
    { name: 'OG Kush', slug: 'og-kush', aliases: null, lineage: null },
  ];
}

/**
 * LAYER 1: Build canonical query pool
 */
function buildCanonicalQueries(strains) {
  console.log('\n========================================');
  console.log('LAYER 1: BUILDING CANONICAL QUERY POOL');
  console.log('========================================\n');

  const queryMap = new Map(); // query -> { source, strains[] }
  const seenQueries = new Set(); // For deduplication

  for (const strain of strains) {
    const name = strain.name?.trim();
    if (!name) continue;

    // Primary: exact strain name (ALWAYS include)
    const primaryNormalized = normalizeQuery(name);
    if (primaryNormalized) {
      const primaryQuery = `${primaryNormalized} weed`;
      if (!seenQueries.has(primaryQuery)) {
        seenQueries.add(primaryQuery);
        queryMap.set(primaryQuery, {
          query: primaryQuery,
          source: 'strain_name',
          strains: [strain.slug],
        });
      } else {
        // Add strain to existing query
        const existing = queryMap.get(primaryQuery);
        if (existing && !existing.strains.includes(strain.slug)) {
          existing.strains.push(strain.slug);
        }
      }
    }

    // Aliases (OPTIONALLY include)
    if (strain.aliases && Array.isArray(strain.aliases)) {
      for (const alias of strain.aliases) {
        if (alias && typeof alias === 'string') {
          const aliasNormalized = normalizeQuery(alias);
          if (aliasNormalized && aliasNormalized !== primaryNormalized) {
            const aliasQuery = `${aliasNormalized} weed`;
            if (!seenQueries.has(aliasQuery)) {
              seenQueries.add(aliasQuery);
              queryMap.set(aliasQuery, {
                query: aliasQuery,
                source: 'alias',
                strains: [strain.slug],
              });
            } else {
              const existing = queryMap.get(aliasQuery);
              if (existing && !existing.strains.includes(strain.slug)) {
                existing.strains.push(strain.slug);
              }
            }
          }
        }
      }
    }

    // Lineage (parent strains)
    if (strain.lineage) {
      const lineage = typeof strain.lineage === 'string' 
        ? JSON.parse(strain.lineage) 
        : strain.lineage;
      
      if (lineage && typeof lineage === 'object') {
        const parents = [
          lineage.parent1 || lineage.mother || lineage.female,
          lineage.parent2 || lineage.father || lineage.male,
        ].filter(Boolean);

        for (const parent of parents) {
          if (parent && typeof parent === 'string') {
            // Skip generic parent terms
            if (isGenericParent(parent)) continue;

            const parentNormalized = normalizeQuery(parent);
            if (parentNormalized && parentNormalized !== primaryNormalized) {
              const parentQuery = `${parentNormalized} weed`;
              if (!seenQueries.has(parentQuery)) {
                seenQueries.add(parentQuery);
                queryMap.set(parentQuery, {
                  query: parentQuery,
                  source: 'parent',
                  strains: [strain.slug],
                });
              } else {
                const existing = queryMap.get(parentQuery);
                if (existing && !existing.strains.includes(strain.slug)) {
                  existing.strains.push(strain.slug);
                }
              }
            }
          }
        }
      }
    }
  }

  // Convert to array and sort
  const queriesData = Array.from(queryMap.values())
    .sort((a, b) => a.query.localeCompare(b.query));

  // Limit to 4,000 queries max
  const limitedQueries = queriesData.slice(0, 4000);
  
  if (limitedQueries.length < queriesData.length) {
    console.log(`[LAYER 1] Limited queries from ${queriesData.length} to ${limitedQueries.length} (max 4,000)`);
  }
  
  console.log(`[LAYER 1] Generated ${limitedQueries.length} canonical queries`);
  console.log(`[LAYER 1] Sources: ${limitedQueries.filter(q => q.source === 'strain_name').length} strain names, ${limitedQueries.filter(q => q.source === 'alias').length} aliases, ${limitedQueries.filter(q => q.source === 'parent').length} parents`);
  console.log(`[LAYER 1] Average: ${(strains.length / limitedQueries.length).toFixed(1)} strains per query\n`);

  // Save queries (persist so NOT regenerated every run)
  writeFileSync(
    join(process.cwd(), CONFIG.canonicalQueriesFile),
    JSON.stringify(limitedQueries, null, 2)
  );

  console.log(`[LAYER 1] Saved to ${CONFIG.canonicalQueriesFile}\n`);

  return limitedQueries;
}

/**
 * Load canonical queries
 */
function loadCanonicalQueries() {
  const path = join(process.cwd(), CONFIG.canonicalQueriesFile);
  if (existsSync(path)) {
    try {
      return JSON.parse(readFileSync(path, 'utf-8'));
    } catch (err) {
      console.warn('[QUERIES] Failed to load:', err.message);
    }
  }
  return null;
}

/**
 * Load canonical progress (for worker queue tracking)
 */
function loadCanonicalProgress() {
  const path = join(process.cwd(), CONFIG.canonicalProgressFile);
  if (existsSync(path)) {
    try {
      const data = JSON.parse(readFileSync(path, 'utf-8'));
      return {
        completed_queries: data.completed_queries || 0,
        total_queries: data.total_queries || 0,
        last_updated: data.last_updated || null,
      };
    } catch (err) {
      // Ignore
    }
  }
  return {
    completed_queries: 0,
    total_queries: 0,
    last_updated: null,
  };
}

/**
 * Save canonical progress
 */
function saveCanonicalProgress(completed, total) {
  const path = join(process.cwd(), CONFIG.canonicalProgressFile);
  writeFileSync(path, JSON.stringify({
    completed_queries: completed,
    total_queries: total,
    last_updated: new Date().toISOString(),
  }, null, 2));
}

/**
 * Load progress for query harvesting
 */
function loadHarvestProgress() {
  const path = join(process.cwd(), CONFIG.harvestProgressFile);
  if (existsSync(path)) {
    try {
      const data = JSON.parse(readFileSync(path, 'utf-8'));
      return data.last_processed_index || 0;
    } catch (err) {
      // Ignore
    }
  }
  return 0;
}

/**
 * Save harvest progress
 */
function saveHarvestProgress(index) {
  const path = join(process.cwd(), CONFIG.harvestProgressFile);
  writeFileSync(path, JSON.stringify({
    last_processed_index: index,
    updated_at: new Date().toISOString(),
  }, null, 2));
  
  // Also update canonical progress
  const progress = loadCanonicalProgress();
  if (progress.total_queries > 0) {
    saveCanonicalProgress(index, progress.total_queries);
  }
}

/**
 * Load image pool
 */
function loadImagePool() {
  const path = join(process.cwd(), CONFIG.imagePoolFile);
  if (existsSync(path)) {
    try {
      return JSON.parse(readFileSync(path, 'utf-8'));
    } catch (err) {
      // Ignore
    }
  }
  return [];
}

/**
 * Append to image pool (with deduplication)
 */
function appendToImagePool(newImages) {
  const pool = loadImagePool();
  const existingUrls = new Set(pool.map(img => img.image_url));
  
  let added = 0;
  for (const img of newImages) {
    if (!existingUrls.has(img.image_url)) {
      pool.push(img);
      existingUrls.add(img.image_url);
      added++;
    }
  }

  writeFileSync(
    join(process.cwd(), CONFIG.imagePoolFile),
    JSON.stringify(pool, null, 2)
  );

  return added;
}

// =======================
// DDG Image Search (NO KEY) — vqd + i.js JSON endpoint
// =======================
function pickFirstMatch(text, patterns) {
  for (const p of patterns) {
    const m = text.match(p);
    if (m && m[1]) return m[1];
  }
  return null;
}

// Timeout for each DDG request — Node fetch uses 10s connect timeout; Undici Agent overrides it
const DDG_FETCH_TIMEOUT_MS = 35000;
const DDG_CONNECT_TIMEOUT_MS = 25000;

const DDG_AGENT = new Agent({
  connectTimeout: DDG_CONNECT_TIMEOUT_MS,
  bodyTimeout: DDG_FETCH_TIMEOUT_MS,
  headersTimeout: DDG_FETCH_TIMEOUT_MS,
});
// Timeout for reading response body (prevents hung res.text() / res.json())
const DDG_BODY_TIMEOUT_MS = 18000;

// Quick connectivity check — 8s timeout. If DDG unreachable, use Pixabay when PIXABAY_API_KEY set.
const DDG_CONNECT_CHECK_MS = 8000;

/** Returns true if DuckDuckGo is reachable within DDG_CONNECT_CHECK_MS */
async function checkDdgConnectivity() {
  if (SKIP_DDG) return false;
  const url = 'https://duckduckgo.com/?q=test&iax=images&ia=images&kl=us-en';
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), DDG_CONNECT_CHECK_MS);
  try {
    const res = await undiciFetch(url, {
      signal: controller.signal,
      dispatcher: DDG_AGENT,
      headers: DDG_HEADERS_HTML,
    });
    clearTimeout(id);
    return res.ok || res.status === 200;
  } catch {
    clearTimeout(id);
    return false;
  }
}

function withTimeout(promise, ms, label = 'operation') {
  return Promise.race([
    promise,
    sleep(ms).then(() => {
      throw new Error(`${label} timed out after ${ms}ms`);
    }),
  ]);
}

function toFetchError(e) {
  if (e.name === 'AbortError') return new Error(`Request timeout after ${DDG_FETCH_TIMEOUT_MS}ms`);
  const cause = e.cause?.code || e.code || e.cause?.message || '';
  return cause ? new Error(`${e.message} (${cause})`) : e;
}

async function fetchWithRetry(url, opts = {}, attempts = 3) {
  let lastErr = null;
  for (let i = 0; i < attempts; i++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DDG_FETCH_TIMEOUT_MS);
    const fetchOpts = { ...opts, signal: controller.signal, dispatcher: DDG_AGENT };
    try {
      const res = await undiciFetch(url, fetchOpts);
      clearTimeout(timeoutId);
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`HTTP ${res.status} ${res.statusText} :: ${body.slice(0, 200)}`);
      }
      return res;
    } catch (e) {
      clearTimeout(timeoutId);
      lastErr = toFetchError(e);
      // UND_ERR_CONNECT_TIMEOUT: longer backoff to let connections clear
      const isConnectTimeout = /UND_ERR_CONNECT|ETIMEDOUT|ECONNREFUSED/.test(String(e.cause?.code ?? e.code ?? e.message));
      const base = isConnectTimeout ? 3000 : 2000;
      const backoff = base * Math.pow(2, i);
      await sleep(backoff);
    }
  }
  throw lastErr ?? new Error('fetchWithRetry failed');
}

// Browser-like headers to reduce DDG bot detection / blocking
const DDG_HEADERS_HTML = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  'Cache-Control': 'no-cache',
  Connection: 'keep-alive',
  'Upgrade-Insecure-Requests': '1',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
};

const DDG_HEADERS_JSON = {
  ...DDG_HEADERS_HTML,
  Accept: 'application/json,text/javascript,*/*;q=0.1',
  Referer: 'https://duckduckgo.com/',
  'Sec-Fetch-Dest': 'script',
  'Sec-Fetch-Mode': 'cors',
};

async function getDdgVqd(query, region = 'us-en') {
  const url = `https://duckduckgo.com/?q=${encodeURIComponent(query)}&iax=images&ia=images&kl=${region}`;
  const res = await fetchWithRetry(url, { headers: DDG_HEADERS_HTML }, 3);
  const html = await withTimeout(res.text(), DDG_BODY_TIMEOUT_MS, 'DDG HTML body');
  const vqd = pickFirstMatch(html, [
    /vqd=['"]([0-9-]+)['"]/,
    /"vqd"\s*:\s*"([^"]+)"/,
    /vqd=([0-9-]+)/,
  ]);
  if (!vqd) {
    throw new Error('DDG vqd not found (DDG changed markup or blocked).');
  }
  return vqd;
}

async function ddgImageSearchJson(query, limit = 30, region = 'us-en') {
  const vqd = await getDdgVqd(query, region);
  const params = new URLSearchParams({
    l: region,
    o: 'json',
    q: query,
    vqd,
    f: ',,,',
    p: '1',
    s: '0',
  });
  const url = `https://duckduckgo.com/i.js?${params.toString()}`;
  const res = await fetchWithRetry(
    url,
    { headers: DDG_HEADERS_JSON },
    3
  );
  const data = await withTimeout(
    res.json().catch(() => null),
    DDG_BODY_TIMEOUT_MS,
    'DDG JSON body'
  );
  const results = Array.isArray(data?.results) ? data.results : [];
  const out = [];
  for (const r of results) {
    const u = r?.image ?? r?.thumbnail;
    if (u && typeof u === 'string' && u.startsWith('http') && !u.includes('duckduckgo.com/')) {
      out.push(u);
      if (out.length >= limit) break;
    }
  }
  return out;
}

/**
 * Scrape DuckDuckGo Images (vqd + i.js JSON — no key required)
 * When DDG_REGIONS is set (e.g. "us-en,uk-en,de-de,fr-fr"), scrapes from multiple regions for global coverage.
 */
async function scrapeDuckDuckGo(query, retries = 0) {
  if (SKIP_DDG) return [];
  try {
    const seenUrls = new Set();
    const allResults = [];
    const perRegion = Math.ceil(CONFIG.maxImagesPerQuery / Math.max(1, DDG_REGIONS.length));

    for (const region of DDG_REGIONS) {
      const results = await ddgImageSearchJson(query, perRegion, region);
      for (const url of results) {
        if (!seenUrls.has(url)) {
          seenUrls.add(url);
          allResults.push(url);
        }
      }
      if (DDG_REGIONS.length > 1) await sleepWithJitter(CONFIG.requestDelay, CONFIG.requestDelayJitter ?? 0);
    }

    if (!allResults.length) {
      console.warn('[DDG][EMPTY] JSON returned no images for:', query.slice(0, 50));
    }

    return allResults.slice(0, CONFIG.maxImagesPerQuery);
  } catch (error) {
    if (retries < CONFIG.maxRetries) {
      console.warn(`[DDG] Retry ${retries + 1}/${CONFIG.maxRetries}:`, error?.message);
      await sleep(CONFIG.retryDelay);
      return scrapeDuckDuckGo(query, retries + 1);
    }
    console.warn('[DDG] Failed after retries:', error?.message);
    return [];
  }
}

/**
 * Pixabay image search (requires PIXABAY_API_KEY env var)
 * Free API key at https://pixabay.com/api/docs/
 * 100 requests/min — throttle via PIXABAY_DELAY_MS (default 700ms) + 1 worker
 */
async function scrapePixabay(query, limit = 8, retries = 2) {
  const key = process.env.PIXABAY_API_KEY?.trim();
  if (!key) return [];
  const delayMs = Number(process.env.PIXABAY_DELAY_MS) || 700;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const url = `https://pixabay.com/api/?key=${key}&q=${encodeURIComponent(query)}&image_type=photo&per_page=${limit}&safesearch=false`;
      const res = await fetch(url);
      const data = await res.json().catch(() => ({}));
      if (res.status === 429) {
        if (attempt < retries) {
          console.warn('[Pixabay] Rate limit (429). Waiting 65s before retry...');
          await sleep(65000);
          continue;
        }
        console.warn('[Pixabay] Rate limit (429). Increase PIXABAY_DELAY_MS (e.g. 1200).');
        return [];
      }
      if (!res.ok) {
        if (data?.message) console.warn('[Pixabay]', res.status, data.message);
        return [];
      }
      const hits = data.hits || [];
      const urls = hits
        .filter(h => h.webformatURL || h.largeImageURL)
        .map(h => h.webformatURL || h.largeImageURL)
        .slice(0, limit);
      await sleep(delayMs);
      return urls;
    } catch (err) {
      if (attempt === retries) {
        console.warn('[Pixabay]', err.message);
        return [];
      }
      await sleep(2000);
    }
  }
  return [];
}

/**
 * Pexels image search (requires PEXELS_API_KEY env var)
 * Free API key at https://www.pexels.com/api/ — 200 req/hr
 */
async function scrapePexels(query, limit = 8) {
  const key = process.env.PEXELS_API_KEY?.trim();
  if (!key) return [];
  try {
    const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${Math.min(limit, 80)}`;
    const res = await fetch(url, {
      headers: { Authorization: key },
    });
    if (!res.ok) {
      if (res.status === 429) {
        console.warn('[Pexels] Rate limit (429) — 200 req/hr');
        return [];
      }
      return [];
    }
    const data = await res.json().catch(() => ({}));
    const photos = data.photos || [];
    const urls = photos
      .filter((p) => p.src?.large || p.src?.original)
      .map((p) => p.src.large || p.src.original)
      .slice(0, limit);
    await sleep(2000); // Pexels 200/hr = ~1 req/18s; 2s delay for supplemental use
    return urls;
  } catch (err) {
    console.warn('[Pexels]', err.message);
    return [];
  }
}

/**
 * Unsplash image search (requires UNSPLASH_ACCESS_KEY env var)
 * Free key at https://unsplash.com/oauth/applications — 50 req/hr (demo)
 */
async function scrapeUnsplash(query, limit = 8) {
  const key = process.env.UNSPLASH_ACCESS_KEY?.trim();
  if (!key) return [];
  try {
    const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=${Math.min(limit, 30)}`;
    const res = await fetch(url, {
      headers: { Authorization: `Client-ID ${key}` },
    });
    if (!res.ok) {
      if (res.status === 429) {
        console.warn('[Unsplash] Rate limit (429) — 50 req/hr demo');
        return [];
      }
      return [];
    }
    const data = await res.json().catch(() => ({}));
    const results = data.results || [];
    const urls = results
      .filter((r) => r.urls?.regular || r.urls?.full)
      .map((r) => r.urls.regular || r.urls.full)
      .slice(0, limit);
    await sleep(80000 / 50); // ~1.6s between requests for 50/hr
    return urls;
  } catch (err) {
    console.warn('[Unsplash]', err.message);
    return [];
  }
}

/**
 * Harvest generic fallback queries (cannabis bud, weed flower, etc.)
 * Ensures unmatched strains get at least 1 image from assignment fallback.
 * Tries DuckDuckGo first; Pixabay if PIXABAY_API_KEY set and DDG empty.
 */
async function harvestFallbackQueries() {
  const pool = loadImagePool();
  const existingQueries = new Set(pool.map(img => img.query));
  const toHarvest = FALLBACK_QUERIES.filter(q => !existingQueries.has(q));
  if (toHarvest.length === 0) {
    console.log('[FALLBACK] All fallback queries already in pool');
    return pool;
  }
  console.log(`\n[FALLBACK] Harvesting ${toHarvest.length} generic queries for unmatched strains...`);
  let added = 0;
  const pixabayAvailable = !!process.env.PIXABAY_API_KEY?.trim();
  if (pixabayAvailable) console.log('[FALLBACK] Pixabay API available as backup');
  const pexelsAvailable = !!process.env.PEXELS_API_KEY?.trim();
  const unsplashAvailable = !!process.env.UNSPLASH_ACCESS_KEY?.trim();
  for (const query of toHarvest) {
    try {
      let urls = await scrapeDuckDuckGo(query);
      if (urls.length === 0 && pixabayAvailable) {
        urls = await scrapePixabay(query, 8);
        if (urls.length > 0) console.log(`[FALLBACK] "${query}" - ${urls.length} from Pixabay`);
      }
      if (urls.length === 0 && pexelsAvailable) {
        urls = await scrapePexels(query, 8);
        if (urls.length > 0) console.log(`[FALLBACK] "${query}" - ${urls.length} from Pexels`);
      }
      if (urls.length === 0 && unsplashAvailable) {
        urls = await scrapeUnsplash(query, 8);
        if (urls.length > 0) console.log(`[FALLBACK] "${query}" - ${urls.length} from Unsplash`);
      }
      if (urls.length > 0) {
        const source = urls[0]?.includes?.('pixabay') ? 'pixabay' : urls[0]?.includes?.('pexels') ? 'pexels' : urls[0]?.includes?.('unsplash') ? 'unsplash' : 'duckduckgo';
        const newImages = urls.map(url => ({
          image_url: url,
          source: source,
          query: query,
          fetched_at: new Date().toISOString(),
        }));
        added += appendToImagePool(newImages);
        if (source === 'duckduckgo') console.log(`[FALLBACK] "${query}" - ${urls.length} images`);
      }
      await sleepWithJitter(CONFIG.requestDelay, CONFIG.requestDelayJitter ?? 0);
    } catch (err) {
      console.warn(`[FALLBACK] "${query}" failed:`, err.message);
    }
  }
  console.log(`[FALLBACK] Added ${added} images for fallback use\n`);
  return loadImagePool();
}

/**
 * Supplement pool with Pexels/Unsplash — for queries with < 5 images, fetch more.
 * Run with --topup. Requires PEXELS_API_KEY and/or UNSPLASH_ACCESS_KEY.
 */
async function supplementHarvest(opts = {}) {
  const pool = loadImagePool();
  const limit = opts.limit ?? 500;
  const pexelsAvailable = !!process.env.PEXELS_API_KEY?.trim();
  const unsplashAvailable = !!process.env.UNSPLASH_ACCESS_KEY?.trim();
  if (!pexelsAvailable && !unsplashAvailable) {
    console.log('[TOPUP] No PEXELS_API_KEY or UNSPLASH_ACCESS_KEY. Skip.\n');
    return pool;
  }
  const byQuery = {};
  for (const img of pool) {
    const q = img.query;
    if (!byQuery[q]) byQuery[q] = [];
    byQuery[q].push(img);
  }
  const queriesToTopup = Object.keys(byQuery).filter((q) => byQuery[q].length < CONFIG.maxImagesPerStrain);
  const toProcess = queriesToTopup.slice(0, limit);
  console.log(`\n[TOPUP] Supplementing ${toProcess.length} queries (< 5 images) from Pexels/Unsplash...`);
  if (pexelsAvailable) console.log('[TOPUP] Pexels enabled (200 req/hr)');
  if (unsplashAvailable) console.log('[TOPUP] Unsplash enabled (50 req/hr demo)\n');
  let added = 0;
  for (let i = 0; i < toProcess.length; i++) {
    const query = toProcess[i];
    const existing = byQuery[query].length;
    const need = CONFIG.maxImagesPerStrain - existing;
    if (need <= 0) continue;
    const existingUrls = new Set(byQuery[query].map((img) => img.image_url));
    let newUrls = [];
    if (pexelsAvailable && newUrls.length < need) {
      const urls = await scrapePexels(query, need);
      for (const u of urls) {
        if (!existingUrls.has(u)) {
          newUrls.push(u);
          existingUrls.add(u);
          if (newUrls.length >= need) break;
        }
      }
    }
    if (unsplashAvailable && newUrls.length < need) {
      const urls = await scrapeUnsplash(query, need - newUrls.length);
      for (const u of urls) {
        if (!existingUrls.has(u)) {
          newUrls.push(u);
          existingUrls.add(u);
          if (newUrls.length >= need) break;
        }
      }
    }
    if (newUrls.length > 0) {
      const source = newUrls[0]?.includes?.('pexels') ? 'pexels' : 'unsplash';
      const newImages = newUrls.map((url) => ({
        image_url: url,
        source: source,
        query: query,
        fetched_at: new Date().toISOString(),
      }));
      added += appendToImagePool(newImages);
      if ((i + 1) % 50 === 0) {
        console.log(`[TOPUP] ${i + 1}/${toProcess.length} — added ${added} images so far`);
      }
    }
  }
  console.log(`[TOPUP] Done. Added ${added} images to pool.\n`);
  return loadImagePool();
}

/**
 * LAYER 2: Harvest images for canonical queries
 */
async function harvestImages(queries, opts = {}) {
  console.log('\n========================================');
  console.log('LAYER 2: HARVESTING IMAGES (WORKER QUEUE)');
  console.log('========================================\n');

  // Initialize canonical progress
  saveCanonicalProgress(0, queries.length);

  const startIndex = opts.fromIndex != null ? opts.fromIndex : loadHarvestProgress();
  const maxQueries = opts.limit != null ? opts.limit : queries.length;
  const pool = loadImagePool();
  
  const endIndex = Math.min(startIndex + maxQueries, queries.length);
  if (opts.limit != null || opts.fromIndex != null) {
    console.log(`[LAYER 2] Limited run: queries ${startIndex + 1}–${endIndex} (--from ${opts.fromIndex ?? 'auto'} --limit ${opts.limit ?? 'all'})`);
  }
  const usePixabayOnly = !!opts.usePixabayOnly;
  const workers = usePixabayOnly ? 1 : CONFIG.maxConcurrentWorkers; // Pixabay: 100 req/min
  console.log(`[LAYER 2] Starting from query ${startIndex + 1}/${queries.length}`);
  console.log(`[LAYER 2] Existing pool: ${pool.length} images`);
  console.log(`[LAYER 2] Worker concurrency: ${workers}${usePixabayOnly ? ' (Pixabay rate limit)' : ''}`);
  console.log(`[LAYER 2] Rate limit: ${CONFIG.requestDelay}ms ± ${CONFIG.requestDelayJitter ?? 0}ms jitter between requests`);
  if (DDG_REGIONS.length > 1) {
    console.log(`[LAYER 2] Global mode: ${DDG_REGIONS.length} regions (${DDG_REGIONS.join(', ')})`);
  }
  if (usePixabayOnly) {
    console.log(`[LAYER 2] Pixabay-only (DDG unreachable). PIXABAY_DELAY_MS=700 keeps under 100 req/min`);
  }
  console.log('');

  let processed = 0;
  let totalHarvested = 0;
  let failedQueries = 0;
  const failedQueryList = [];

  // Process queries with concurrency control (worker queue)
  const workerQueue = [];
  let activeWorkers = 0;
  let queryIndex = startIndex;

  // Process queries (respect limit)
  const queryEnd = opts.limit != null ? Math.min(startIndex + maxQueries, queries.length) : queries.length;
  while (queryIndex < queryEnd) {
    // Wait for available worker slot
    while (activeWorkers >= workers) {
      await sleep(100);
    }

    const i = queryIndex++;
    const queryData = queries[i];
    const query = queryData.query;

    // Start worker
    activeWorkers++;
    const worker = (async () => {
      try {
        let retries = 0;
        let success = false;

        while (retries < CONFIG.maxRetries && !success) {
          try {
            const imageUrls = usePixabayOnly
              ? await scrapePixabay(query, CONFIG.maxImagesPerQuery)
              : await scrapeDuckDuckGo(query, retries);
            
            if (imageUrls.length > 0) {
              const source = usePixabayOnly ? 'pixabay' : 'duckduckgo';
              const newImages = imageUrls.map(url => ({
                image_url: url,
                source: source,
                query: query,
                fetched_at: new Date().toISOString(),
              }));

              const added = appendToImagePool(newImages);
              totalHarvested += added;

              if (added > 0) {
                console.log(`[${i + 1}/${queries.length}] "${query}" - Added ${added} new image(s) (${imageUrls.length} total found)`);
              } else {
                console.log(`[${i + 1}/${queries.length}] "${query}" - ${imageUrls.length} found (all duplicates)`);
              }
            } else {
              console.log(`[${i + 1}/${queries.length}] "${query}" - No images found`);
            }

            success = true;
            processed++;
            
            // Flush progress immediately
            saveHarvestProgress(i + 1);
            saveCanonicalProgress(i + 1, queries.length);

            // Log every N queries
            if (processed % CONFIG.logIntervalQueries === 0) {
              const currentPool = loadImagePool();
              console.log(`[LAYER 2] Progress: ${processed}/${queries.length} queries, ${currentPool.length} images in pool, ${failedQueries} failed`);
            }

          // Rate limiting (global) — jitter desyncs workers, reduces DDG rate-limit spikes
          await sleepWithJitter(CONFIG.requestDelay, CONFIG.requestDelayJitter ?? 0);
          } catch (error) {
            retries++;
            if (retries >= CONFIG.maxRetries) {
              // Max retries reached - log failure but continue
              failedQueries++;
              failedQueryList.push({ query, error: error.message });
              console.error(`[LAYER 2] Query "${query}" failed after ${CONFIG.maxRetries} retries:`, error.message);
              
              // Still mark as processed to avoid infinite loop
              processed++;
              saveHarvestProgress(i + 1);
              saveCanonicalProgress(i + 1, queries.length);
            } else {
              // Retry with delay
              console.warn(`[LAYER 2] Query "${query}" failed (attempt ${retries}/${CONFIG.maxRetries}), retrying...`);
              await sleep(CONFIG.retryDelay);
            }
          }
        }
      } finally {
        activeWorkers--;
      }
    })();

    workerQueue.push(worker);
  }

  // Wait for all workers to complete
  await Promise.all(workerQueue);

  const finalPool = loadImagePool();
  const totalQueries = queries.length;
  const processedQueriesThisRun = processed;

  // Partial = used --limit OR did not process all remaining queries
  const harvesting_partial =
    opts.limit != null || startIndex + processed < totalQueries;
  const harvesting_complete = !harvesting_partial;

  saveState({ harvesting_complete, harvesting_partial });

  // Final progress update (use actual end index for limited runs)
  saveCanonicalProgress(queryEnd, totalQueries);

  console.log(`\n[LAYER 2] Complete: ${processedQueriesThisRun} queries processed this run`);
  console.log(`[LAYER 2] Total canonical queries: ${totalQueries}`);
  console.log(`[LAYER 2] Total images in pool: ${finalPool.length}`);
  console.log(`[LAYER 2] New images added: ${totalHarvested}`);
  console.log(`[LAYER 2] Failed queries: ${failedQueries}`);
  console.log(`[LAYER 2] harvesting_complete: ${harvesting_complete}`);
  console.log(`[LAYER 2] harvesting_partial: ${harvesting_partial}\n`);

  if (failedQueries > 0) {
    console.log(`[LAYER 2] Failed queries logged for review`);
    const failedPath = join(process.cwd(), 'failed_queries.json');
    writeFileSync(failedPath, JSON.stringify(failedQueryList, null, 2));
    console.log(`[LAYER 2] Failed queries saved to failed_queries.json`);
  }

  return finalPool;
}

/**
 * LAYER 3: Assign images to strains (NO SCRAPING, LOCAL ONLY)
 */
function assignImagesToStrains(strains, queries, imagePool) {
  console.log('\n========================================');
  console.log('LAYER 3: ASSIGNING IMAGES TO STRAINS');
  console.log('========================================');
  console.log('MODE: Local-only, no network requests\n');

  const startIndex = loadAssignProgress();
  const assignments = loadStrainAssignments();

  console.log(`[LAYER 3] Starting from strain ${startIndex + 1}/${strains.length}`);
  console.log(`[LAYER 3] Existing assignments: ${assignments.length}`);
  console.log(`[LAYER 3] Image pool size: ${imagePool.length} images\n`);

  // Build query-to-images map (normalized queries)
  const queryToImages = new Map();
  for (const img of imagePool) {
    if (!img.query) continue;
    // Normalize query: remove " weed" suffix, normalize, then re-add
    let normalizedQuery = img.query;
    if (normalizedQuery.endsWith(' weed')) {
      const base = normalizedQuery.slice(0, -5); // Remove " weed"
      normalizedQuery = normalizeQuery(base) + ' weed';
    } else {
      normalizedQuery = normalizeQuery(normalizedQuery) + ' weed';
    }
    if (!queryToImages.has(normalizedQuery)) {
      queryToImages.set(normalizedQuery, []);
    }
    queryToImages.get(normalizedQuery).push(img);
  }

  // Build strain-to-queries map with source tracking
  const strainToQueries = new Map(); // slug -> [{ query, source }]
  for (const queryData of queries) {
    for (const strainSlug of queryData.strains) {
      if (!strainToQueries.has(strainSlug)) {
        strainToQueries.set(strainSlug, []);
      }
      strainToQueries.get(strainSlug).push({
        query: queryData.query,
        source: queryData.source || 'unknown',
      });
    }
  }

  // Build set of already-assigned strain slugs for fast lookup
  const assignedSlugs = new Set(assignments.map(a => a.strain_slug));

  let assigned = 0;
  let skipped = 0;
  let exactMatches = 0;
  let aliasMatches = 0;
  let parentMatches = 0;
  let fallbackMatches = 0;

  const startTime = Date.now();

  for (let i = startIndex; i < strains.length; i++) {
    const strain = strains[i];
    const slug = strain.slug;

    // Check if already assigned (resume-safe)
    if (assignedSlugs.has(slug)) {
      skipped++;
      continue;
    }

    const newAssignments = [];
    const normalizedName = normalizeQuery(strain.name);

    // PRIORITY 1: Exact match (normalized strain name)
    if (normalizedName) {
      const exactQuery = `${normalizedName} weed`;
      const images = queryToImages.get(exactQuery) || [];
      for (const img of images) {
        if (newAssignments.length >= CONFIG.maxImagesPerStrain) break;
        newAssignments.push({
          strain_slug: slug,
          strain_name: strain.name,
          image_url: img.image_url,
          source: img.source || 'duckduckgo',
          assigned_from: 'exact',
          assigned_at: new Date().toISOString(),
        });
      }
      if (newAssignments.length > 0) {
        exactMatches++;
      }
    }

    // PRIORITY 2: Alias match
    if (newAssignments.length < CONFIG.minImagesPerStrain && strain.aliases && Array.isArray(strain.aliases)) {
      for (const alias of strain.aliases) {
        if (newAssignments.length >= CONFIG.maxImagesPerStrain) break;
        const normalizedAlias = normalizeQuery(alias);
        if (normalizedAlias && normalizedAlias !== normalizedName) {
          const aliasQuery = `${normalizedAlias} weed`;
          const images = queryToImages.get(aliasQuery) || [];
          for (const img of images) {
            if (newAssignments.length >= CONFIG.maxImagesPerStrain) break;
            newAssignments.push({
              strain_slug: slug,
              strain_name: strain.name,
              image_url: img.image_url,
              source: img.source || 'duckduckgo',
              assigned_from: 'alias',
              assigned_at: new Date().toISOString(),
            });
          }
          if (newAssignments.length >= CONFIG.minImagesPerStrain) {
            aliasMatches++;
            break;
          }
        }
      }
    }

    // PRIORITY 3: Parent match (from canonical queries)
    if (newAssignments.length < CONFIG.minImagesPerStrain) {
      const strainQueries = strainToQueries.get(slug) || [];
      for (const queryInfo of strainQueries) {
        if (newAssignments.length >= CONFIG.maxImagesPerStrain) break;
        if (queryInfo.source === 'parent') {
          const images = queryToImages.get(queryInfo.query) || [];
          for (const img of images) {
            if (newAssignments.length >= CONFIG.maxImagesPerStrain) break;
            newAssignments.push({
              strain_slug: slug,
              strain_name: strain.name,
              image_url: img.image_url,
              source: img.source || 'duckduckgo',
              assigned_from: 'parent',
              assigned_at: new Date().toISOString(),
            });
          }
          if (newAssignments.length >= CONFIG.minImagesPerStrain) {
            parentMatches++;
            break;
          }
        }
      }
    }

    // PRIORITY 4: Fallback (generic cannabis/weed images)
    if (newAssignments.length < CONFIG.minImagesPerStrain) {
      for (const fallbackQuery of FALLBACK_QUERIES) {
        // Pool keys use normalizeQuery(base) + ' weed' — fallback queries don't end with " weed"
        const fallbackKey = fallbackQuery.endsWith(' weed')
          ? normalizeQuery(fallbackQuery.slice(0, -5)) + ' weed'
          : normalizeQuery(fallbackQuery) + ' weed';
        const images = queryToImages.get(fallbackKey) || [];
        for (const img of images) {
          if (newAssignments.length >= CONFIG.maxImagesPerStrain) break;
          newAssignments.push({
            strain_slug: slug,
            strain_name: strain.name,
            image_url: img.image_url,
            source: img.source || 'duckduckgo',
            assigned_from: 'fallback',
            assigned_at: new Date().toISOString(),
          });
          if (newAssignments.length >= CONFIG.minImagesPerStrain) {
            fallbackMatches++;
            break;
          }
        }
        if (newAssignments.length >= CONFIG.minImagesPerStrain) break;
      }
    }

    // Append assignments
    if (newAssignments.length > 0) {
      assignments.push(...newAssignments);
      assignedSlugs.add(slug); // Mark as assigned
      assigned += newAssignments.length;
    } else {
      skipped++;
    }

    // Batch save every 500 strains (optimized for speed)
    if ((i + 1) % 500 === 0) {
      try {
        saveStrainAssignments(assignments);
        saveAssignProgress(i + 1);
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        const rate = ((i + 1 - startIndex) / elapsed).toFixed(0);
        console.log(`[LAYER 3] Progress: ${i + 1}/${strains.length} strains (${rate} strains/sec)`);
      } catch (err) {
        console.error(`[LAYER 3] Error saving progress at strain ${i + 1}:`, err.message);
        // Continue anyway
      }
    }

    // Log every N strains
    if ((i + 1) % CONFIG.logIntervalStrains === 0) {
      console.log(`[LAYER 3] Progress: ${i + 1}/${strains.length} strains, ${assignments.length} total assignments`);
    }
  }

  // Final save
  saveStrainAssignments(assignments);
  saveAssignProgress(strains.length);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const totalProcessed = strains.length - startIndex;
  const rate = totalProcessed > 0 ? (totalProcessed / elapsed).toFixed(0) : 0;

  console.log(`\n[LAYER 3] Complete: ${assigned} images assigned, ${skipped} strains skipped`);
  console.log(`[LAYER 3] Total assignments: ${assignments.length}`);
  console.log(`[LAYER 3] Processing time: ${elapsed}s (${rate} strains/sec)`);
  console.log(`[LAYER 3] Match breakdown:`);
  console.log(`  - Exact: ${exactMatches}`);
  console.log(`  - Alias: ${aliasMatches}`);
  console.log(`  - Parent: ${parentMatches}`);
  console.log(`  - Fallback: ${fallbackMatches}`);
  const uniqueCovered = new Set(assignments.map((a) => a.strain_slug)).size;
  const layer3Coverage = strains.length > 0 ? Math.min(100, (uniqueCovered / strains.length) * 100) : 0;
  console.log(`[LAYER 3] Coverage: ${layer3Coverage.toFixed(1)}% of strains have images\n`);

  // Mark assignment as complete
  saveState({ assignment_complete: true });

  return assignments;
}

/**
 * Load strain assignments
 */
function loadStrainAssignments() {
  const path = join(process.cwd(), CONFIG.strainImagesFile);
  if (existsSync(path)) {
    try {
      return JSON.parse(readFileSync(path, 'utf-8'));
    } catch (err) {
      // Ignore
    }
  }
  return [];
}

/**
 * Save strain assignments
 */
function saveStrainAssignments(assignments) {
  writeFileSync(
    join(process.cwd(), CONFIG.strainImagesFile),
    JSON.stringify(assignments, null, 2)
  );
}

/**
 * Load assignment progress
 */
function loadAssignProgress() {
  // Try both old and new filename for backward compatibility
  const oldPath = join(process.cwd(), 'progress_assign.json');
  const path = join(process.cwd(), CONFIG.assignProgressFile);
  
  // Try new filename first
  if (existsSync(path)) {
    try {
      const data = JSON.parse(readFileSync(path, 'utf-8'));
      return data.last_processed_index || 0;
    } catch (err) {
      // Ignore
    }
  }
  
  // Fallback to old filename
  if (existsSync(oldPath)) {
    try {
      const data = JSON.parse(readFileSync(oldPath, 'utf-8'));
      return data.last_processed_index || 0;
    } catch (err) {
      // Ignore
    }
  }
  
  return 0;
}

/**
 * Save assignment progress
 */
function saveAssignProgress(index) {
  const path = join(process.cwd(), CONFIG.assignProgressFile);
  writeFileSync(path, JSON.stringify({
    last_processed_index: index,
    updated_at: new Date().toISOString(),
  }, null, 2));
  
  // Also save to old filename for compatibility
  const oldPath = join(process.cwd(), 'progress_assign.json');
  writeFileSync(oldPath, JSON.stringify({
    last_processed_index: index,
    updated_at: new Date().toISOString(),
  }, null, 2));
}

/**
 * Load scraper state (for PM2 runner)
 */
function loadState() {
  const path = join(process.cwd(), 'scraper_state.json');
  if (existsSync(path)) {
    try {
      return JSON.parse(readFileSync(path, 'utf-8'));
    } catch (err) {
      // Ignore
    }
  }
  return {
    harvesting_complete: false,
    harvesting_partial: false,
    assignment_complete: false,
    last_updated: null,
  };
}

/**
 * Save scraper state (for PM2 runner)
 */
function saveState(updates) {
  const path = join(process.cwd(), 'scraper_state.json');
  const current = loadState();
  writeFileSync(path, JSON.stringify({
    ...current,
    ...updates,
    last_updated: new Date().toISOString(),
  }, null, 2));
}

/**
 * Print help and exit
 */
function printHelp() {
  console.log(`
IMAGE SCRAPER V2 - Mass Scale

Usage: node tools/image_scraper_v2.mjs [options]

Options:
  --status           Show progress only (no scraping)
  --topup [N]        Supplement pool from Pexels/Unsplash (queries with <5 images). N=limit (default 500)
  --limit N          Harvest at most N queries (Layer 2)
  --from N           Start harvesting from query index N
  --reset-harvest    Set harvesting_complete=false, delete progress_harvest.json
                     (keeps image_pool.json)
  --reset-pool       Delete image_pool.json
  --reset-assignment Reset assignment progress and strain_images.json
                     (re-run Layer 3 with full pool)
  --debug            Verbose debug output
  --help             Show this help

Environment:
  DDG_REGIONS        Comma-separated regions for global scraping (default: us-en)
  PIXABAY_API_KEY    Pixabay API key — required when DDG unreachable (free: pixabay.com/api/docs)
  PEXELS_API_KEY     Pexels API key for --topup (free: pexels.com/api — 200 req/hr)
  UNSPLASH_ACCESS_KEY Unsplash key for --topup (free: unsplash.com/oauth — 50 req/hr demo)
  PIXABAY_DELAY_MS   Delay after each Pixabay request (default 700). Use 1200 if you hit 429.
  SKIP_DDG           1 to skip DDG and use Pixabay only (requires PIXABAY_API_KEY)
`);
}

/**
 * Main function
 */
function parseArgv() {
  const opts = { debug: false, status: false, topup: false, topupLimit: 500, from: null, limit: null, resetHarvest: false, resetPool: false, resetAssignment: false };
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--help' || args[i] === '-h') opts.help = true;
    else if (args[i] === '--status') opts.status = true;
    else if (args[i] === '--topup') {
      opts.topup = true;
      if (args[i + 1] != null && /^\d+$/.test(args[i + 1])) opts.topupLimit = parseInt(args[++i], 10);
    } else if (args[i] === '--debug') opts.debug = true;
    else if (args[i] === '--reset-harvest') opts.resetHarvest = true;
    else if (args[i] === '--reset-pool') opts.resetPool = true;
    else if (args[i] === '--reset-assignment') opts.resetAssignment = true;
    else if (args[i] === '--from' && args[i + 1] != null) opts.from = parseInt(args[++i], 10);
    else if (args[i] === '--limit' && args[i + 1] != null) opts.limit = parseInt(args[++i], 10);
  }
  return opts;
}

const CLI = parseArgv();

async function main() {
  if (CLI.help) {
    printHelp();
    process.exit(0);
  }

  if (CLI.status) {
    const state = loadState();
    const harvestIdx = loadHarvestProgress();
    const assignIdx = loadAssignProgress();
    const pool = loadImagePool();
    const queries = loadCanonicalQueries();
    const totalQueries = queries?.length ?? 4000;
    const harvestPct = totalQueries ? Math.round((harvestIdx / totalQueries) * 100) : 0;
    console.log('=== SCRAPER PROGRESS ===');
    console.log(`Harvest:      ${harvestIdx} / ${totalQueries} queries (${harvestPct}%)`);
    console.log(`Image pool:   ${pool.length} images`);
    console.log(`Assignment:   ${assignIdx} / 35550 strains`);
    console.log(`Harvest done: ${state.harvesting_complete ? 'Yes' : 'No'}`);
    console.log(`Assign done:  ${state.assignment_complete ? 'Yes' : 'No'}`);
    console.log(`Last updated: ${state.last_updated ?? 'never'}`);
    process.exit(0);
  }

  if (CLI.topup) {
    const strains = await loadStrains();
    const queries = loadCanonicalQueries() || [];
    let imagePool = await supplementHarvest({ limit: CLI.topupLimit });
    if (imagePool.length === 0) {
      console.error('[ERROR] No images in pool. Run harvest first.');
      process.exit(1);
    }
    saveAssignProgress(0);
    saveStrainAssignments([]);
    saveState({ assignment_complete: false });
    console.log('[TOPUP] Re-assigning images to strains...\n');
    assignImagesToStrains(strains, queries, imagePool);
    console.log('========================================');
    console.log('TOPUP COMPLETE');
    console.log('========================================\n');
    process.exit(0);
  }

  // Handle reset flags before loading state
  if (CLI.resetHarvest) {
    saveState({ harvesting_complete: false });
    const p = join(process.cwd(), CONFIG.harvestProgressFile);
    if (existsSync(p)) {
      unlinkSync(p);
      console.log('[RESET] Deleted progress_harvest.json');
    }
    console.log('[RESET] harvesting_complete=false');
  }
  if (CLI.resetPool) {
    const p = join(process.cwd(), CONFIG.imagePoolFile);
    if (existsSync(p)) {
      unlinkSync(p);
      console.log('[RESET] Deleted image_pool.json');
    }
  }
  if (CLI.resetAssignment) {
    saveAssignProgress(0);
    saveStrainAssignments([]);
    saveState({ assignment_complete: false });
    console.log('[RESET] Cleared assignment_progress.json and strain_images.json');
  }

  if (CLI.debug) console.log('[DEBUG] CLI opts:', CLI);
  console.log('========================================');
  console.log('IMAGE SCRAPER V2 - MASS SCALE');
  console.log('========================================\n');

  // Log resume points
  let state = loadState();
  if (state.last_updated) {
    console.log(`[RESUME] Last run: ${state.last_updated}`);
    console.log(`[RESUME] Harvesting complete: ${state.harvesting_complete}`);
    console.log(`[RESUME] Harvesting partial: ${state.harvesting_partial ?? false}`);
    console.log(`[RESUME] Assignment complete: ${state.assignment_complete}\n`);
  }

  // Load strains
  const strains = await loadStrains();
  if (strains.length === 0) {
    console.error('[ERROR] No strains to process');
    process.exit(1);
  }

  console.log(`[INFO] Loaded ${strains.length} strains\n`);

  // LAYER 1: Build canonical queries (only if not exists - persist so NOT regenerated)
  let queries = loadCanonicalQueries();
  if (!queries || queries.length === 0) {
    console.log('[LAYER 1] Building canonical query pool...');
    queries = buildCanonicalQueries(strains);
    console.log(`[LAYER 1] Generated and saved ${queries.length} queries (will not regenerate on next run)\n`);
  } else {
    console.log(`[LAYER 1] Using existing queries: ${queries.length} (skipping generation)\n`);
  }

  // LAYER 2: Harvest images (if not complete)
  let imagePool = [];
  state = loadState();
  if (!state.harvesting_complete) {
    try {
      const harvestOpts = {};
      if (CLI.from != null && !isNaN(CLI.from)) harvestOpts.fromIndex = CLI.from;
      if (CLI.limit != null && !isNaN(CLI.limit)) harvestOpts.limit = CLI.limit;

      // DDG unreachable? Use Pixabay when PIXABAY_API_KEY set.
      if (SKIP_DDG || !(await checkDdgConnectivity())) {
        if (process.env.PIXABAY_API_KEY?.trim()) {
          harvestOpts.usePixabayOnly = true;
          console.log('[CONNECT] DuckDuckGo unreachable — using Pixabay as primary (PIXABAY_API_KEY set)\n');
        } else {
          console.error('[ERROR] DuckDuckGo unreachable (connection timeout).');
          console.error('  Fix: Set PIXABAY_API_KEY for Pixabay fallback, or use SKIP_DDG=1 with PIXABAY_API_KEY.');
          console.error('  Get free key: https://pixabay.com/api/docs/');
          process.exit(1);
        }
      }

      imagePool = await harvestImages(queries, harvestOpts);
      
      if (imagePool.length === 0) {
        console.error('[ERROR] No images in pool. Cannot assign.');
        // Don't exit - allow PM2 to restart
        return;
      }
    } catch (error) {
      console.error('[ERROR] Harvesting failed:', error.message);
      // Don't exit - allow PM2 to restart
      return;
    }
  } else {
    console.log('[LAYER 2] Harvesting already complete, loading pool...');
    imagePool = loadImagePool();
    console.log(`[LAYER 2] Loaded ${imagePool.length} images from pool\n`);
  }

  // Harvest generic fallback queries (cannabis bud, weed flower, etc.) for unmatched strains
  imagePool = await harvestFallbackQueries();

  // LAYER 3: Assign images to strains (if harvesting complete)
  let assignments = [];
  if (state.harvesting_complete || imagePool.length > 0) {
    try {
      assignments = assignImagesToStrains(strains, queries, imagePool);
    } catch (error) {
      console.error('[ERROR] Assignment failed:', error.message);
      // Continue to summary
    }
  } else {
    console.log('[LAYER 3] Skipping assignment - harvesting not complete\n');
  }

  // Final summary
  console.log('========================================');
  console.log('SCRAPING COMPLETE');
  console.log('========================================');
  const uniqueStrainsWithImages = new Set(assignments.map((a) => a.strain_slug)).size;
  const coveragePct = strains.length > 0 ? Math.min(100, (uniqueStrainsWithImages / strains.length) * 100) : 0;
  console.log(`Strains processed: ${strains.length}`);
  console.log(`Canonical queries: ${queries.length}`);
  console.log(`Images in pool: ${imagePool.length}`);
  console.log(`Images assigned: ${assignments.length} (${uniqueStrainsWithImages} strains)`);
  console.log(`Coverage: ${coveragePct.toFixed(1)}%`);
  console.log('========================================\n');
}

// Run with crash safety
main().catch(error => {
  console.error('[FATAL ERROR]', error);
  console.error('[FATAL ERROR] Stack:', error.stack);
  // Save state before exiting
  let state;
  try {
    state = loadState();
    saveState({
      ...state,
      last_error: error.message,
      last_error_at: new Date().toISOString(),
    });
  } catch (saveErr) {
    // Ignore save errors
  }
  process.exit(1);
});
