#!/usr/bin/env node

/**
 * Image Scraper - Free Sources Only
 * 
 * Scrapes cannabis strain images from:
 * - Primary: DuckDuckGo Images (HTML scraping)
 * - Fallback: Leafly strain pages
 * 
 * Features:
 * - Resumable (tracks progress)
 * - Resilient (handles errors gracefully)
 * - Rate-limited (respects source limits)
 * - No paid APIs
 */

import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';

// Configuration
const CONFIG = {
  outputFile: 'strain_images.json',
  progressFile: 'scraper_progress.json',
  maxImagesPerStrain: 8,
  requestDelay: 2000, // 2 seconds between requests
  maxRetries: 3,
  retryDelay: 5000, // 5 seconds between retries
};

// User agent for requests
const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

/**
 * Sleep utility
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Load strains from Supabase or JSON file
 */
async function loadStrains() {
  // Option 1: Load from Supabase (if env vars exist)
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );

      const { data, error } = await supabase
        .from('strains')
        .select('name, slug')
        .limit(1000);

      if (!error && data) {
        console.log(`[LOADER] Loaded ${data.length} strains from Supabase`);
        return data.map(s => ({ name: s.name, slug: s.slug }));
      }
    } catch (err) {
      console.warn('[LOADER] Supabase load failed, trying JSON file:', err.message);
    }
  }

  // Option 2: Load from JSON file
  const jsonPath = join(process.cwd(), 'strains.json');
  if (existsSync(jsonPath)) {
    try {
      const data = JSON.parse(readFileSync(jsonPath, 'utf-8'));
      console.log(`[LOADER] Loaded ${data.length} strains from JSON file`);
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.error('[LOADER] Failed to load JSON file:', err.message);
    }
  }

  // Option 3: Default test strains
  console.warn('[LOADER] No data source found, using test strains');
  return [
    { name: 'Blue Dream', slug: 'blue-dream' },
    { name: 'OG Kush', slug: 'og-kush' },
    { name: 'Girl Scout Cookies', slug: 'girl-scout-cookies' },
  ];
}

/**
 * Load progress from file
 */
function loadProgress() {
  const progressPath = join(process.cwd(), CONFIG.progressFile);
  if (existsSync(progressPath)) {
    try {
      const data = JSON.parse(readFileSync(progressPath, 'utf-8'));
      console.log(`[PROGRESS] Resuming from index ${data.last_processed_index}`);
      return data.last_processed_index || 0;
    } catch (err) {
      console.warn('[PROGRESS] Failed to load progress file:', err.message);
    }
  }
  return 0;
}

/**
 * Save progress to file
 */
function saveProgress(index) {
  const progressPath = join(process.cwd(), CONFIG.progressFile);
  const data = {
    last_processed_index: index,
    updated_at: new Date().toISOString(),
  };
  writeFileSync(progressPath, JSON.stringify(data, null, 2));
}

/**
 * Load existing results
 */
function loadResults() {
  const outputPath = join(process.cwd(), CONFIG.outputFile);
  if (existsSync(outputPath)) {
    try {
      const data = JSON.parse(readFileSync(outputPath, 'utf-8'));
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.warn('[RESULTS] Failed to load results file:', err.message);
    }
  }
  return [];
}

/**
 * Append result to file
 */
function appendResult(result) {
  const outputPath = join(process.cwd(), CONFIG.outputFile);
  const existing = loadResults();
  existing.push(result);
  writeFileSync(outputPath, JSON.stringify(existing, null, 2));
}

/**
 * Scrape DuckDuckGo Images
 * DuckDuckGo uses a vqd token system - we'll extract images from the HTML response
 */
async function scrapeDuckDuckGo(strainName, retries = 0) {
  try {
    const query = encodeURIComponent(`${strainName} weed`);
    const url = `https://html.duckduckgo.com/html/?q=${query}&iax=images&ia=images`;

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

    // Extract image URLs from HTML
    // DuckDuckGo images are in <a> tags with data-lazy attribute or img src
    const images = [];
    
    // Method 1: Look for img tags with src containing http
    const imgPattern = /<img[^>]+src="(https?:\/\/[^"]+)"[^>]*>/gi;
    let match;
    while ((match = imgPattern.exec(html)) !== null && images.length < CONFIG.maxImagesPerStrain) {
      const url = match[1];
      // Filter out DuckDuckGo internal images and icons
      if (url && 
          !url.includes('duckduckgo.com/i/') && 
          !url.includes('duckduckgo.com/assets/') &&
          !url.includes('logo') &&
          !url.includes('icon') &&
          (url.match(/\.(jpg|jpeg|png|webp)/i) || url.includes('image'))) {
        images.push(url);
      }
    }

    // Method 2: Look for data-lazy or data-src attributes (lazy-loaded images)
    const lazyPattern = /data-(?:lazy|src)="(https?:\/\/[^"]+)"/gi;
    while ((match = lazyPattern.exec(html)) !== null && images.length < CONFIG.maxImagesPerStrain) {
      const url = match[1];
      if (url && 
          !url.includes('duckduckgo.com/i/') && 
          !url.includes('duckduckgo.com/assets/') &&
          !images.includes(url)) {
        images.push(url);
      }
    }

    // Method 3: Look for JSON-encoded image data in script tags
    const jsonPattern = /"image":\s*"(https?:\/\/[^"]+)"/gi;
    while ((match = jsonPattern.exec(html)) !== null && images.length < CONFIG.maxImagesPerStrain) {
      const url = match[1].replace(/\\u002F/g, '/').replace(/\\\//g, '/');
      if (url && 
          !url.includes('duckduckgo.com/i/') && 
          !url.includes('duckduckgo.com/assets/') &&
          !images.includes(url)) {
        images.push(url);
      }
    }

    // Remove duplicates and limit
    const uniqueImages = [...new Set(images)].slice(0, CONFIG.maxImagesPerStrain);
    
    return uniqueImages;
  } catch (error) {
    if (retries < CONFIG.maxRetries) {
      console.warn(`[DDG] Retry ${retries + 1}/${CONFIG.maxRetries} for "${strainName}"`);
      await sleep(CONFIG.retryDelay);
      return scrapeDuckDuckGo(strainName, retries + 1);
    }
    console.error(`[DDG] Failed after ${CONFIG.maxRetries} retries for "${strainName}":`, error.message);
    return [];
  }
}

/**
 * Scrape Leafly strain page
 */
async function scrapeLeafly(slug, retries = 0) {
  try {
    const url = `https://www.leafly.com/strains/${slug}`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return []; // Strain doesn't exist on Leafly
      }
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();

    // Look for primary strain image (usually in og:image or main image)
    const ogImageMatch = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i);
    if (ogImageMatch) {
      return [ogImageMatch[1]];
    }

    // Alternative: look for main image in content
    const imageMatch = html.match(/<img[^>]+class="[^"]*strain[^"]*"[^>]+src="([^"]+)"/i);
    if (imageMatch) {
      return [imageMatch[1]];
    }

    return [];
  } catch (error) {
    if (retries < CONFIG.maxRetries) {
      console.warn(`[LEAFLY] Retry ${retries + 1}/${CONFIG.maxRetries} for slug "${slug}"`);
      await sleep(CONFIG.retryDelay);
      return scrapeLeafly(slug, retries + 1);
    }
    console.error(`[LEAFLY] Failed after ${CONFIG.maxRetries} retries for "${slug}":`, error.message);
    return [];
  }
}

/**
 * Scrape images for a single strain
 */
async function scrapeStrainImages(strain) {
  const { name, slug } = strain;
  const images = [];

  // Try DuckDuckGo first
  console.log(`[SCRAPE] "${name}" - Trying DuckDuckGo...`);
  const ddgImages = await scrapeDuckDuckGo(name);
  
  if (ddgImages.length > 0) {
    console.log(`[SCRAPE] "${name}" - Found ${ddgImages.length} images from DuckDuckGo`);
    images.push(...ddgImages.map(url => ({
      strain_slug: slug,
      strain_name: name,
      image_url: url,
      source: 'duckduckgo',
      fetched_at: new Date().toISOString(),
    })));
  } else {
    console.log(`[SCRAPE] "${name}" - DuckDuckGo returned 0 images, trying Leafly...`);
    
    // Fallback to Leafly
    const leaflyImages = await scrapeLeafly(slug);
    if (leaflyImages.length > 0) {
      console.log(`[SCRAPE] "${name}" - Found ${leaflyImages.length} image(s) from Leafly`);
      images.push(...leaflyImages.map(url => ({
        strain_slug: slug,
        strain_name: name,
        image_url: url,
        source: 'leafly',
        fetched_at: new Date().toISOString(),
      })));
    } else {
      console.log(`[SCRAPE] "${name}" - No images found from any source`);
    }
  }

  return images;
}

/**
 * Main scraper function
 */
async function main() {
  console.log('========================================');
  console.log('IMAGE SCRAPER - FREE SOURCES ONLY');
  console.log('========================================\n');

  // Load strains
  const strains = await loadStrains();
  if (strains.length === 0) {
    console.error('[ERROR] No strains to process');
    process.exit(1);
  }

  console.log(`[INFO] Processing ${strains.length} strains\n`);

  // Load progress
  const startIndex = loadProgress();
  if (startIndex > 0) {
    console.log(`[RESUME] Resuming from strain ${startIndex + 1}/${strains.length}\n`);
  }

  // Load existing results
  const existingResults = loadResults();
  console.log(`[INFO] Existing results: ${existingResults.length} images\n`);

  let totalImages = existingResults.length;
  let processed = 0;
  let failed = 0;

  // Process strains
  for (let i = startIndex; i < strains.length; i++) {
    const strain = strains[i];
    
    try {
      console.log(`[${i + 1}/${strains.length}] Processing: ${strain.name} (${strain.slug})`);
      
      const images = await scrapeStrainImages(strain);
      
      // Save each image result incrementally
      for (const image of images) {
        appendResult(image);
        totalImages++;
      }

      processed++;
      console.log(`[${i + 1}/${strains.length}] ✓ ${strain.name} - ${images.length} image(s) found\n`);

      // Save progress after each strain
      saveProgress(i + 1);

      // Rate limiting
      if (i < strains.length - 1) {
        await sleep(CONFIG.requestDelay);
      }
    } catch (error) {
      failed++;
      console.error(`[${i + 1}/${strains.length}] ✗ ${strain.name} - Error:`, error.message);
      console.log(''); // Blank line

      // Save progress even on error
      saveProgress(i + 1);

      // Continue to next strain
      continue;
    }
  }

  // Final summary
  console.log('========================================');
  console.log('SCRAPING COMPLETE');
  console.log('========================================');
  console.log(`Processed: ${processed}/${strains.length}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total images collected: ${totalImages}`);
  console.log(`Results saved to: ${CONFIG.outputFile}`);
  console.log(`Progress saved to: ${CONFIG.progressFile}`);
  console.log('========================================\n');
}

// Run scraper
main().catch(error => {
  console.error('[FATAL ERROR]', error);
  process.exit(1);
});
