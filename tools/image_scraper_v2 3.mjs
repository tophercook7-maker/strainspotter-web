#!/usr/bin/env node

console.log("🚀 FILE LOADED");

// ========================================
// SCRAPER FILE LOADED (LINE 1)
// ========================================
console.log("🚜 SCRAPER FILE LOADED:", import.meta.url, new Date().toISOString());

// ========================================
// FORCE GLOBAL ERROR HANDLING (NO SILENT DEATH)
// ========================================
process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught Exception:", err);
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  console.error("❌ Unhandled Rejection:", reason);
  process.exit(1);
});

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

import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import fetch from "node-fetch";

// Load environment variables from .env.local
try {
  const envPath = join(process.cwd(), '.env.local');
  if (existsSync(envPath)) {
    const envContent = readFileSync(envPath, 'utf-8');
    for (const line of envContent.split('\n')) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
          process.env[key.trim()] = value;
        }
      }
    }
    console.log('[ENV] Loaded environment variables from .env.local');
  }
} catch (err) {
  console.warn('[ENV] Failed to load .env.local:', err.message);
}

/**
 * Fetch images from Bing search results.
 * Returns an array of direct image URLs.
 */
async function fetchBingImages(query) {
  const encoded = encodeURIComponent(query);
  const url = `https://www.bing.com/images/search?q=${encoded}&form=HDRSC2`;

  console.log(`🔍 Bing search URL: ${url}`);

  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
        "AppleWebKit/537.36 (KHTML, like Gecko) " +
        "Chrome/120.0.0.0 Safari/537.36",
    },
  });

  const html = await res.text();

  const urls = [];
  const regex = /murl&quot;:&quot;(https?:\/\/[^&]+)&quot;/g;

  let match;
  while ((match = regex.exec(html)) !== null) {
    urls.push(match[1]);
  }

  return [...new Set(urls)];
}

// ========================================
// HEARTBEAT (PROVES LIVENESS)
// ========================================
setInterval(() => {
  console.log("🫀 Scraper heartbeat:", new Date().toISOString());
}, 60000);

// ========================================
// TRACK LAST SUCCESSFUL WORK
// ========================================
let lastSuccess = Date.now();

function markSuccess() {
  lastSuccess = Date.now();
}

// ========================================
// WATCHDOG: EXIT ON STALL (AUTO-RECOVERY)
// ========================================
setInterval(() => {
  const idleMs = Date.now() - lastSuccess;
  if (idleMs > 5 * 60 * 1000) {
    console.error("⚠️ Scraper stalled for >5 minutes. Exiting to restart.");
    console.error("🛑 EXITING: Stalled timeout (5 minutes)");
    process.exit(1);
  }
}, 60000);

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
  
  // Harvesting
  maxImagesPerQuery: 8,
  maxConcurrentWorkers: 20,
  requestDelay: 1500, // 1.5 seconds between requests
  maxRetries: 3,
  retryDelay: 5000,
  
  // Assignment
  minImagesPerStrain: 1,
  maxImagesPerStrain: 5,
  
  // Logging intervals
  logIntervalQueries: 100,
  logIntervalStrains: 1000,
};

// User agent
const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

/**
 * Sleep utility
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
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

      // Load all strains (no limit, paginate if needed)
      let allStrains = [];
      let offset = 0;
      const pageSize = 1000;
      
      while (true) {
        const { data, error } = await supabase
          .from('strains')
          .select('name, slug, lineage')
          .range(offset, offset + pageSize - 1);
        
        if (error) {
          console.error('[LOADER] Supabase query error:', error.message);
          break;
        }
        
        if (!data || data.length === 0) {
          break; // No more data
        }
        
        allStrains = allStrains.concat(data);
        offset += pageSize;
        
        // Log progress every 10k strains
        if (allStrains.length % 10000 === 0) {
          console.log(`[LOADER] Loaded ${allStrains.length} strains so far...`);
        }
      }
      
      if (allStrains.length > 0) {
        console.log(`[LOADER] Loaded ${allStrains.length} strains from Supabase`);
        return allStrains;
      } else {
        console.warn('[LOADER] Supabase returned no data');
      }
    } catch (err) {
      console.error('[LOADER] Supabase connection failed:', err.message);
      console.error('[LOADER] Full error:', err);
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
  const targetPath = join(process.cwd(), CONFIG.canonicalQueriesFile);
  console.log("🧱 WRITING TO VAULT:", {
    path: targetPath,
    time: new Date().toISOString(),
    file: CONFIG.canonicalQueriesFile,
    queries: limitedQueries.length
  });
  writeFileSync(targetPath, JSON.stringify(limitedQueries, null, 2));
  markSuccess();
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
  markSuccess(); // Mark success after successful write
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
  markSuccess(); // Mark success after successful write
  
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

  const targetPath = join(process.cwd(), CONFIG.imagePoolFile);
  console.log("🧱 WRITING TO VAULT:", {
    path: targetPath,
    time: new Date().toISOString(),
    file: CONFIG.imagePoolFile,
    images: pool.length
  });
  writeFileSync(targetPath, JSON.stringify(pool, null, 2));
  markSuccess(); // Mark success after successful write
  
  return added;
}


/**
 * LAYER 2: Harvest images for canonical queries
 */
async function harvestImages(queries) {
  console.log("🟡 LAYER 2 — IMAGE HARVEST STARTED");
  console.log('\n========================================');
  console.log('LAYER 2: HARVESTING IMAGES (WORKER QUEUE)');
  console.log('========================================\n');

  // Initialize canonical progress
  saveCanonicalProgress(0, queries.length);

  const startIndex = loadHarvestProgress();
  const pool = loadImagePool();
  
  console.log(`[LAYER 2] Starting from query ${startIndex + 1}/${queries.length}`);
  console.log(`[LAYER 2] Existing pool: ${pool.length} images`);
  console.log(`[LAYER 2] Worker concurrency: ${CONFIG.maxConcurrentWorkers}`);
  console.log(`[LAYER 2] Rate limit: ${CONFIG.requestDelay}ms between requests\n`);

  let processed = 0;
  let totalHarvested = 0;
  let failedQueries = 0;
  const failedQueryList = [];

  // Process queries with concurrency control (worker queue)
  const workerQueue = [];
  let activeWorkers = 0;
  let queryIndex = startIndex;

  // Process all queries
  while (queryIndex < queries.length) {
    // Wait for available worker slot
    while (activeWorkers >= CONFIG.maxConcurrentWorkers) {
      await sleep(100);
    }

    const i = queryIndex++;
    const queryData = queries[i];
    const query = queryData.query;

    // Start worker
    activeWorkers++;
    const worker = (async () => {
      let retries = 0;
      let success = false;

      while (retries < CONFIG.maxRetries && !success) {
        try {
          const images = await fetchBingImages(query);

          if (!images || images.length === 0) {
            console.log(`❌ No Bing images for: ${query}`);
          } else {
            images.forEach((url, i) => {
              console.log(`🖼️ Found image ${i + 1}/${images.length}: ${url}`);
            });
          }

          // Format images and add to pool
          const newImages = (images || []).map(url => ({
            image_url: url,
            source: 'bing',
            query: query,
            fetched_at: new Date().toISOString(),
          }));

          const added = appendToImagePool(newImages);
          totalHarvested += added;

          if (added > 0) {
            console.log(`[${i + 1}/${queries.length}] "${query}" - Added ${added} new image(s) (${images.length} total found)`);
          } else if (images && images.length > 0) {
            console.log(`[${i + 1}/${queries.length}] "${query}" - ${images.length} found (all duplicates)`);
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

          // Rate limiting (global)
          await sleep(CONFIG.requestDelay);
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
    })();

    workerQueue.push(worker);
  }

  // Wait for all workers to complete
  await Promise.all(workerQueue);

  const finalPool = loadImagePool();
  const progress = loadCanonicalProgress();
  
  console.log(`\n[LAYER 2] Complete: ${processed} queries processed`);
  console.log(`[LAYER 2] Total images in pool: ${finalPool.length}`);
  console.log(`[LAYER 2] New images added: ${totalHarvested}`);
  console.log(`[LAYER 2] Failed queries: ${failedQueries}`);
  
  if (failedQueries > 0) {
    console.log(`[LAYER 2] Failed queries logged for review`);
    // Optionally save failed queries to file
    const failedPath = join(process.cwd(), 'failed_queries.json');
    writeFileSync(failedPath, JSON.stringify(failedQueryList, null, 2));
    console.log(`[LAYER 2] Failed queries saved to failed_queries.json`);
  }
  
  // Final progress update
  saveCanonicalProgress(queries.length, queries.length);
  console.log(`[LAYER 2] Progress saved: ${progress.completed_queries}/${progress.total_queries} queries\n`);

  // FORCE IMAGE POOL WRITE (ensure it exists)
  const targetPath = join(process.cwd(), CONFIG.imagePoolFile);
  writeFileSync(targetPath, JSON.stringify(finalPool, null, 2));
  console.log("✅ IMAGE POOL WRITTEN:", finalPool.length, "images");
  console.log("✅ IMAGE POOL PATH:", targetPath);

  // Mark harvesting as complete
  saveState({ harvesting_complete: true });

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
    console.log("➡️ Processing strain:", strain.name || strain);

    // Save current strain name for dashboard display
    saveAssignProgress(i + 1, `${strain.name}|${slug}`);
    console.log(`[LAYER 3] Processing: ${strain.name} (${slug}) - ${i + 1}/${strains.length}`);

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
          source: img.source || 'bing',
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
              source: img.source || 'bing',
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
              source: img.source || 'bing',
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

    // PRIORITY 4: Fallback (generic "cannabis bud")
    if (newAssignments.length < CONFIG.minImagesPerStrain) {
      const fallbackQuery = 'cannabis bud';
      const images = queryToImages.get(fallbackQuery) || [];
      for (const img of images) {
        if (newAssignments.length >= CONFIG.maxImagesPerStrain) break;
        newAssignments.push({
          strain_slug: slug,
          strain_name: strain.name,
          image_url: img.image_url,
          source: img.source || 'bing',
          assigned_from: 'fallback',
          assigned_at: new Date().toISOString(),
        });
        if (newAssignments.length >= CONFIG.minImagesPerStrain) {
          fallbackMatches++;
          break;
        }
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
        saveAssignProgress(i + 1, `${strain.name}|${slug}`);
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
  console.log(`[LAYER 3] Coverage: ${((assignments.length / strains.length) * 100).toFixed(1)}% of strains have images\n`);

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
  const targetPath = join(process.cwd(), CONFIG.strainImagesFile);
  console.log("🧱 WRITING TO VAULT:", {
    path: targetPath,
    time: new Date().toISOString(),
    file: CONFIG.strainImagesFile,
    assignments: assignments.length
  });
  writeFileSync(targetPath, JSON.stringify(assignments, null, 2));
  markSuccess(); // Mark success after successful write
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
function saveAssignProgress(index, strainName = null) {
  const path = join(process.cwd(), CONFIG.assignProgressFile);
  const data = {
    last_processed_index: index,
    updated_at: new Date().toISOString(),
  };
  if (strainName) {
    data.current_strain_name = strainName;
  }
  writeFileSync(path, JSON.stringify(data, null, 2));
  
  // Also save to old filename for compatibility
  const oldPath = join(process.cwd(), 'progress_assign.json');
  writeFileSync(oldPath, JSON.stringify(data, null, 2));
  markSuccess(); // Mark success after successful write
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
    assignment_complete: false,
    last_updated: null,
  };
}

/**
 * Save scraper state (for PM2 runner)
 */
function saveState(updates) {
  const targetPath = join(process.cwd(), 'scraper_state.json');
  console.log("🧱 WRITING TO VAULT:", {
    path: targetPath,
    time: new Date().toISOString(),
    file: 'scraper_state.json',
    updates: Object.keys(updates)
  });
  const current = loadState();
  writeFileSync(targetPath, JSON.stringify({
    ...current,
    ...updates,
    last_updated: new Date().toISOString(),
  }, null, 2));
  markSuccess(); // Mark success after successful write
}

/**
 * Main function
 */
async function main() {
  console.log("🚀 ENTERED main()");
  console.log("🔥 SCRAPER PROCESS STARTED", new Date().toISOString());
  console.log("🚜 SCRAPER STARTED:", new Date().toISOString());
  console.log('========================================');
  console.log('IMAGE SCRAPER V2 - MASS SCALE');
  console.log('========================================\n');

  // ========================================
  // TEST MODE: Single strain test
  // ========================================
  const TEST_MODE = process.env.TEST_MODE === 'true' || process.argv.includes('--test');
  const TEST_STRAIN = process.env.TEST_STRAIN || "Blue Dream";
  
  if (TEST_MODE) {
    console.log("🧪 TEST MODE ENABLED");
    console.log(`🧪 TEST STRAIN: "${TEST_STRAIN}"`);
    console.log("🧪 Only this strain will be processed\n");
  }

  // Log resume points
  const state = loadState();
  if (state.last_updated) {
    console.log(`[RESUME] Last run: ${state.last_updated}`);
    console.log(`[RESUME] Harvesting complete: ${state.harvesting_complete}`);
    console.log(`[RESUME] Assignment complete: ${state.assignment_complete}\n`);
  }

  // Load strains
  let strains = await loadStrains();
  console.log("📊 STRAINS COUNT (before filter):", strains.length);
  
  // TEST MODE: Filter to single strain
  if (TEST_MODE) {
    const originalCount = strains.length;
    strains = strains.filter(s => {
      const nameMatch = s.name?.toLowerCase() === TEST_STRAIN.toLowerCase();
      const slugMatch = s.slug?.toLowerCase() === TEST_STRAIN.toLowerCase();
      return nameMatch || slugMatch;
    });
    console.log(`🧪 TEST MODE: Filtered from ${originalCount} to ${strains.length} strain(s)`);
    if (strains.length === 0) {
      console.error(`[ERROR] Test strain "${TEST_STRAIN}" not found in strain list`);
      console.error("🛑 EXITING: Test strain not found");
      process.exit(1);
    }
  }
  
  console.log("📊 STRAINS COUNT (after filter):", strains.length);
  if (strains.length === 0) {
    console.error('[ERROR] No strains to process');
    console.error("🛑 EXITING: No strains loaded");
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

  // LAYER 2: Harvest images (FORCE RUN if pool is empty)
  console.log("➡️ PIPELINE ENTERED");
  console.log("➡️ RUNNING LAYER 2 (HARVEST)");
  
  let imagePool = [];
  const existingPool = loadImagePool();
  let poolExists = existsSync(join(process.cwd(), CONFIG.imagePoolFile));
  
  if (!state.harvesting_complete || !poolExists || existingPool.length === 0) {
    console.log('[LAYER 2] Starting image harvest...');
    console.log(`[LAYER 2] Reason: harvesting_complete=${state.harvesting_complete}, poolExists=${poolExists}, poolSize=${existingPool.length}`);
    try {
      imagePool = await harvestImages(queries);
      
      // FORCE IMAGE POOL WRITE after harvesting
      console.log(`📦 Writing image pool with ${imagePool.length} images`);
      writeFileSync("image_pool.json", JSON.stringify(imagePool, null, 2));
      
      if (imagePool.length === 0) {
        console.error('[ERROR] No images in pool after harvest. Cannot assign.');
        console.error('[ERROR] This may indicate scraping is blocked or queries are invalid.');
        console.error('[ERROR] Check logs for Bing request failures.');
        // Don't exit - allow PM2 to restart
        return;
      }
    } catch (error) {
      console.error('[ERROR] Harvesting failed:', error.message);
      console.error('[ERROR] Stack:', error.stack);
      // Don't exit - allow PM2 to restart
      return;
    }
  } else {
    console.log('[LAYER 2] Harvesting already complete, loading pool...');
    imagePool = loadImagePool();
    console.log(`[LAYER 2] Loaded ${imagePool.length} images from pool\n`);
  }

  // LAYER 3: Assign images to strains (REQUIRE images in pool)
  console.log("➡️ RUNNING LAYER 3 (ASSIGNMENT)");
  
  if (imagePool.length === 0) {
    console.error('❌ IMAGE POOL MISSING — HARVEST FAILED');
    console.error('❌ Cannot proceed to Layer 3 without images');
    console.error('❌ Pool size:', imagePool.length);
    console.error('❌ Check if Layer 2 actually harvested images');
    console.error("🛑 EXITING: Image pool is empty");
    process.exit(1);
  }
  
  console.log("📦 Loaded image pool:", imagePool.length, "images");
  
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
  console.log(`Strains processed: ${strains.length}`);
  console.log(`Canonical queries: ${queries.length}`);
  console.log(`Images in pool: ${imagePool.length}`);
  console.log(`Images assigned: ${assignments.length}`);
  console.log(`Coverage: ${((assignments.length / strains.length) * 100).toFixed(1)}%`);
  
  // Verify output files exist
  const poolPath = join(process.cwd(), CONFIG.imagePoolFile);
  const vaultPath = join(process.cwd(), CONFIG.strainImagesFile);
  // Reuse poolExists from earlier in function (line 1212)
  // Recalculate to use poolPath for consistency
  poolExists = existsSync(poolPath);
  const vaultExists = existsSync(vaultPath);
  
  console.log('\n📦 OUTPUT FILES:');
  console.log(`  - image_pool.json: ${poolExists ? '✅ EXISTS' : '❌ MISSING'} (${poolExists ? (JSON.parse(readFileSync(poolPath, 'utf-8')).length) : 0} images)`);
  console.log(`  - strain_images.json: ${vaultExists ? '✅ EXISTS' : '❌ MISSING'} (${vaultExists ? (JSON.parse(readFileSync(vaultPath, 'utf-8')).length) : 0} assignments)`);
  
  console.log('========================================\n');
  
  if (TEST_MODE) {
    console.log("🧪 TEST MODE COMPLETE");
    console.log("🧪 Remove --test flag or TEST_MODE=true to run full scrape\n");
  }
  
  console.log("✅ SCRAPER FINISHED");
}

// ========================================
// FORCE EXECUTION (MANDATORY)
// ========================================
// ES module check: if this file is run directly (not imported)
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
    .then(() => console.log("✅ SCRAPER COMPLETE"))
    .catch(err => {
      console.error("❌ SCRAPER CRASHED:", err);
      // Save state before exiting
      try {
        const state = loadState();
        saveState({
          ...state,
          last_error: err.message,
          last_error_at: new Date().toISOString(),
        });
      } catch (saveErr) {
        // Ignore save errors
      }
      process.exit(1);
    });
} else {
  console.log("⚠️ Scraper loaded as module (not executing main)");
}
