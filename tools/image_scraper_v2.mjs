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

import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';

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

/**
 * Scrape DuckDuckGo Images (same as before, improved)
 */
async function scrapeDuckDuckGo(query, retries = 0) {
  try {
    const encodedQuery = encodeURIComponent(query);
    const url = `https://html.duckduckgo.com/html/?q=${encodedQuery}&iax=images&ia=images`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();
    const images = new Set();

    // Method 1: img src attributes
    const imgPattern = /<img[^>]+src="(https?:\/\/[^"]+)"[^>]*>/gi;
    let match;
    while ((match = imgPattern.exec(html)) !== null && images.size < CONFIG.maxImagesPerQuery) {
      const url = match[1];
      if (url && 
          !url.includes('duckduckgo.com/i/') && 
          !url.includes('duckduckgo.com/assets/') &&
          !url.includes('logo') &&
          !url.includes('icon')) {
        images.add(url);
      }
    }

    // Method 2: data-lazy/data-src
    const lazyPattern = /data-(?:lazy|src)="(https?:\/\/[^"]+)"/gi;
    while ((match = lazyPattern.exec(html)) !== null && images.size < CONFIG.maxImagesPerQuery) {
      const url = match[1];
      if (url && !url.includes('duckduckgo.com/') && !images.has(url)) {
        images.add(url);
      }
    }

    // Method 3: JSON-encoded
    const jsonPattern = /"image":\s*"(https?:\/\/[^"]+)"/gi;
    while ((match = jsonPattern.exec(html)) !== null && images.size < CONFIG.maxImagesPerQuery) {
      const url = match[1].replace(/\\u002F/g, '/').replace(/\\\//g, '/');
      if (url && !url.includes('duckduckgo.com/') && !images.has(url)) {
        images.add(url);
      }
    }

    return Array.from(images).slice(0, CONFIG.maxImagesPerQuery);
  } catch (error) {
    if (retries < CONFIG.maxRetries) {
      await sleep(CONFIG.retryDelay);
      return scrapeDuckDuckGo(query, retries + 1);
    }
    return [];
  }
}

/**
 * LAYER 2: Harvest images for canonical queries
 */
async function harvestImages(queries) {
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
          const imageUrls = await scrapeDuckDuckGo(query, retries);
          
          if (imageUrls.length > 0) {
            const newImages = imageUrls.map(url => ({
              image_url: url,
              source: 'duckduckgo',
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
          source: img.source || 'duckduckgo',
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
 * Main function
 */
async function main() {
  console.log('========================================');
  console.log('IMAGE SCRAPER V2 - MASS SCALE');
  console.log('========================================\n');

  // Log resume points
  const state = loadState();
  if (state.last_updated) {
    console.log(`[RESUME] Last run: ${state.last_updated}`);
    console.log(`[RESUME] Harvesting complete: ${state.harvesting_complete}`);
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
  const state = loadState();
  if (!state.harvesting_complete) {
    try {
      imagePool = await harvestImages(queries);
      
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
  console.log(`Strains processed: ${strains.length}`);
  console.log(`Canonical queries: ${queries.length}`);
  console.log(`Images in pool: ${imagePool.length}`);
  console.log(`Images assigned: ${assignments.length}`);
  console.log(`Coverage: ${((assignments.length / strains.length) * 100).toFixed(1)}%`);
  console.log('========================================\n');
}

// Run with crash safety
main().catch(error => {
  console.error('[FATAL ERROR]', error);
  console.error('[FATAL ERROR] Stack:', error.stack);
  // Save state before exiting
  try {
    const state = loadState();
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
