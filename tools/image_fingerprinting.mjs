#!/usr/bin/env node

/**
 * Image Fingerprinting + Clustering
 * 
 * Extracts visual intelligence from scraped images:
 * - Perceptual hashes (pHash/aHash)
 * - Dimensions
 * - Dominant colors
 * - Visual clustering
 * 
 * RULES:
 * - NO UI display of scraped images
 * - NO scraping (uses existing image_pool.json)
 * - Local-only processing
 * - Output is math + metadata only
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';

// Configuration
const CONFIG = {
  imagePoolFile: 'image_pool.json',
  fingerprintFile: 'image_fingerprints.json',
  clusterFile: 'image_clusters.json',
  strainSignaturesFile: 'strain_visual_signatures.json',
  strainImagesFile: 'strain_images.json',
  progressFile: 'fingerprint_progress.json',
  tempCacheDir: '.image_cache',
  batchSize: 100,
  clusterThreshold: 5, // Hamming distance threshold for clustering
};

/**
 * Simple perceptual hash (aHash - average hash)
 * Based on image average brightness
 */
function computePerceptualHash(imageData, width, height) {
  // Resize to 8x8 for hash computation
  const size = 8;
  const blockWidth = Math.floor(width / size);
  const blockHeight = Math.floor(height / size);
  
  // Compute average brightness
  let totalBrightness = 0;
  const blocks = [];
  
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let blockBrightness = 0;
      let pixelCount = 0;
      
      for (let by = 0; by < blockHeight; by++) {
        for (let bx = 0; bx < blockWidth; bx++) {
          const px = x * blockWidth + bx;
          const py = y * blockHeight + by;
          
          if (px < width && py < height) {
            const idx = (py * width + px) * 4; // RGBA
            const r = imageData[idx];
            const g = imageData[idx + 1];
            const b = imageData[idx + 2];
            const brightness = (r + g + b) / 3;
            blockBrightness += brightness;
            pixelCount++;
          }
        }
      }
      
      const avgBrightness = blockBrightness / pixelCount;
      blocks.push(avgBrightness);
      totalBrightness += avgBrightness;
    }
  }
  
  const avgBrightness = totalBrightness / (size * size);
  
  // Generate hash: 1 if above average, 0 if below
  let hash = '';
  for (const brightness of blocks) {
    hash += brightness > avgBrightness ? '1' : '0';
  }
  
  return hash;
}

/**
 * Compute dominant color (coarse - 8 colors)
 */
function computeDominantColor(imageData, width, height) {
  const colorBuckets = new Map();
  const sampleRate = Math.max(1, Math.floor((width * height) / 1000)); // Sample 1000 pixels
  
  for (let i = 0; i < width * height; i += sampleRate) {
    const idx = i * 4;
    if (idx + 2 >= imageData.length) break;
    
    const r = imageData[idx];
    const g = imageData[idx + 1];
    const b = imageData[idx + 2];
    
    // Quantize to 8 colors (3 bits per channel = 8 levels)
    const qr = Math.floor(r / 32) * 32;
    const qg = Math.floor(g / 32) * 32;
    const qb = Math.floor(b / 32) * 32;
    
    const key = `${qr},${qg},${qb}`;
    colorBuckets.set(key, (colorBuckets.get(key) || 0) + 1);
  }
  
  // Find most common color
  let maxCount = 0;
  let dominantColor = '0,0,0';
  for (const [color, count] of colorBuckets.entries()) {
    if (count > maxCount) {
      maxCount = count;
      dominantColor = color;
    }
  }
  
  return dominantColor;
}

/**
 * Download image and extract metadata
 */
async function fingerprintImage(imageUrl, source) {
  try {
    // Try to fetch image
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
    
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      return null;
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Use sharp for image processing
    const sharp = await import('sharp');
    const metadata = await sharp(buffer).metadata();
    const originalWidth = metadata.width;
    const originalHeight = metadata.height;
    
    if (!originalWidth || !originalHeight) {
      return null;
    }
    
    // Resize to 64x64 for processing (maintain aspect ratio)
    const resized = await sharp(buffer)
      .resize(64, 64, { fit: 'inside', withoutEnlargement: true })
      .raw()
      .toBuffer();
    
    const imageData = new Uint8Array(resized);
    const processedWidth = 64;
    const processedHeight = 64;
    
    // Compute fingerprint
    const phash = computePerceptualHash(imageData, processedWidth, processedHeight);
    const dominantColor = computeDominantColor(imageData, processedWidth, processedHeight);
    
    return {
      image_url: imageUrl,
      phash,
      width: originalWidth,
      height: originalHeight,
      dominant_color: dominantColor,
      source: source || 'duckduckgo',
      fingerprinted_at: new Date().toISOString(),
    };
  } catch (error) {
    if (error.name === 'AbortError') {
      // Timeout - skip silently
      return null;
    }
    // Other errors - log but continue
    return null;
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
      console.error('[FINGERPRINT] Failed to load image pool:', err.message);
    }
  }
  return [];
}

/**
 * Load existing fingerprints
 */
function loadFingerprints() {
  const path = join(process.cwd(), CONFIG.fingerprintFile);
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
 * Save fingerprints
 */
function saveFingerprints(fingerprints) {
  const path = join(process.cwd(), CONFIG.fingerprintFile);
  writeFileSync(path, JSON.stringify(fingerprints, null, 2));
}

/**
 * Load progress
 */
function loadProgress() {
  const path = join(process.cwd(), CONFIG.progressFile);
  if (existsSync(path)) {
    try {
      return JSON.parse(readFileSync(path, 'utf-8'));
    } catch (err) {
      // Ignore
    }
  }
  return { last_processed_index: 0 };
}

/**
 * Save progress
 */
function saveProgress(index) {
  const path = join(process.cwd(), CONFIG.progressFile);
  writeFileSync(path, JSON.stringify({
    last_processed_index: index,
    updated_at: new Date().toISOString(),
  }, null, 2));
}

/**
 * PART 1: Fingerprint all images
 */
async function fingerprintImages() {
  console.log('\n========================================');
  console.log('PART 1: IMAGE FINGERPRINTING');
  console.log('========================================\n');

  const imagePool = loadImagePool();
  const existingFingerprints = loadFingerprints();
  const progress = loadProgress();
  
  const fingerprintMap = new Map();
  for (const fp of existingFingerprints) {
    fingerprintMap.set(fp.image_url, fp);
  }
  
  console.log(`[FINGERPRINT] Image pool: ${imagePool.length} images`);
  console.log(`[FINGERPRINT] Existing fingerprints: ${fingerprintMap.size}`);
  console.log(`[FINGERPRINT] Resuming from index: ${progress.last_processed_index}\n`);

  const fingerprints = Array.from(fingerprintMap.values());
  let processed = 0;
  let skipped = 0;
  let failed = 0;
  const startTime = Date.now();

  for (let i = progress.last_processed_index; i < imagePool.length; i++) {
    const image = imagePool[i];
    
    // Skip if already fingerprinted
    if (fingerprintMap.has(image.image_url)) {
      skipped++;
      continue;
    }
    
    const fingerprint = await fingerprintImage(image.image_url, image.source);
    
    if (fingerprint) {
      fingerprints.push(fingerprint);
      fingerprintMap.set(image.image_url, fingerprint);
      processed++;
    } else {
      failed++;
    }
    
    // Batch save every N images
    if ((i + 1) % CONFIG.batchSize === 0) {
      saveFingerprints(fingerprints);
      saveProgress(i + 1);
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      const rate = (processed / elapsed).toFixed(0);
      console.log(`[FINGERPRINT] Progress: ${i + 1}/${imagePool.length} (${processed} new, ${skipped} skipped, ${failed} failed, ${rate}/sec)`);
    }
    
    // Small delay to avoid overwhelming
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  
  // Final save
  saveFingerprints(fingerprints);
  saveProgress(imagePool.length);
  
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n[FINGERPRINT] Complete: ${processed} new, ${skipped} skipped, ${failed} failed`);
  console.log(`[FINGERPRINT] Total fingerprints: ${fingerprints.length}`);
  console.log(`[FINGERPRINT] Time: ${elapsed}s\n`);
  
  return fingerprints;
}

/**
 * Hamming distance between two hashes
 */
function hammingDistance(hash1, hash2) {
  if (hash1.length !== hash2.length) return Infinity;
  let distance = 0;
  for (let i = 0; i < hash1.length; i++) {
    if (hash1[i] !== hash2[i]) distance++;
  }
  return distance;
}

/**
 * PART 2: Cluster images by visual similarity
 */
function clusterImages(fingerprints) {
  console.log('\n========================================');
  console.log('PART 2: IMAGE CLUSTERING');
  console.log('========================================\n');

  console.log(`[CLUSTER] Clustering ${fingerprints.length} images`);
  console.log(`[CLUSTER] Threshold: ${CONFIG.clusterThreshold} (Hamming distance)\n`);

  const clusters = [];
  const assigned = new Set();
  
  for (let i = 0; i < fingerprints.length; i++) {
    if (assigned.has(i)) continue;
    
    const fp = fingerprints[i];
    const cluster = {
      cluster_id: `cluster_${clusters.length}`,
      phash_centroid: fp.phash,
      image_urls: [fp.image_url],
      size: 1,
    };
    
    // Find similar images
    for (let j = i + 1; j < fingerprints.length; j++) {
      if (assigned.has(j)) continue;
      
      const fp2 = fingerprints[j];
      const distance = hammingDistance(fp.phash, fp2.phash);
      
      if (distance <= CONFIG.clusterThreshold) {
        cluster.image_urls.push(fp2.image_url);
        cluster.size++;
        assigned.add(j);
      }
    }
    
    clusters.push(cluster);
    assigned.add(i);
    
    if (clusters.length % 100 === 0) {
      console.log(`[CLUSTER] Progress: ${clusters.length} clusters, ${assigned.size}/${fingerprints.length} images assigned`);
    }
  }
  
  // Save clusters
  const path = join(process.cwd(), CONFIG.clusterFile);
  writeFileSync(path, JSON.stringify(clusters, null, 2));
  
  console.log(`\n[CLUSTER] Complete: ${clusters.length} clusters`);
  console.log(`[CLUSTER] Average cluster size: ${(fingerprints.length / clusters.length).toFixed(1)} images\n`);
  
  return clusters;
}

/**
 * PART 3: Map strains to clusters
 */
function mapStrainsToClusters(clusters) {
  console.log('\n========================================');
  console.log('PART 3: STRAIN → CLUSTER MAPPING');
  console.log('========================================\n');

  // Load strain images
  const strainImagesPath = join(process.cwd(), CONFIG.strainImagesFile);
  if (!existsSync(strainImagesPath)) {
    console.log('[MAPPING] No strain_images.json found, skipping mapping\n');
    return [];
  }
  
  const strainImages = JSON.parse(readFileSync(strainImagesPath, 'utf-8'));
  
  // Build image_url -> cluster_id map
  const imageToCluster = new Map();
  for (const cluster of clusters) {
    for (const imageUrl of cluster.image_urls) {
      imageToCluster.set(imageUrl, cluster.cluster_id);
    }
  }
  
  // Build strain -> clusters map
  const strainToClusters = new Map();
  
  for (const assignment of strainImages) {
    const slug = assignment.strain_slug;
    const imageUrl = assignment.image_url;
    const matchType = assignment.assigned_from || 'unknown';
    
    const clusterId = imageToCluster.get(imageUrl);
    if (!clusterId) continue;
    
    if (!strainToClusters.has(slug)) {
      strainToClusters.set(slug, {
        strain_slug: slug,
        cluster_ids: [],
        match_types: [],
        confidence: 0,
      });
    }
    
    const entry = strainToClusters.get(slug);
    if (!entry.cluster_ids.includes(clusterId)) {
      entry.cluster_ids.push(clusterId);
    }
    entry.match_types.push(matchType);
  }
  
  // Compute confidence scores
  const signatures = [];
  for (const [slug, entry] of strainToClusters.entries()) {
    // Confidence based on match types
    let confidence = 0;
    for (const matchType of entry.match_types) {
      switch (matchType) {
        case 'exact':
          confidence += 1.0;
          break;
        case 'alias':
          confidence += 0.7;
          break;
        case 'parent':
          confidence += 0.5;
          break;
        case 'fallback':
          confidence += 0.2;
          break;
        default:
          confidence += 0.3;
      }
    }
    
    // Normalize by number of matches
    entry.confidence = Math.min(1.0, confidence / entry.match_types.length);
    
    signatures.push(entry);
  }
  
  // Save signatures
  const path = join(process.cwd(), CONFIG.strainSignaturesFile);
  writeFileSync(path, JSON.stringify(signatures, null, 2));
  
  console.log(`[MAPPING] Complete: ${signatures.length} strains mapped to clusters`);
  console.log(`[MAPPING] Average clusters per strain: ${(signatures.reduce((sum, s) => sum + s.cluster_ids.length, 0) / signatures.length).toFixed(1)}\n`);
  
  return signatures;
}

/**
 * Main function
 */
async function main() {
  console.log('========================================');
  console.log('IMAGE FINGERPRINTING + CLUSTERING');
  console.log('========================================');
  console.log('MODE: Local-only, no UI, no scraping\n');

  try {
    // PART 1: Fingerprint images
    const fingerprints = await fingerprintImages();
    
    if (fingerprints.length === 0) {
      console.log('[ERROR] No fingerprints generated. Exiting.\n');
      process.exit(1);
    }
    
    // PART 2: Cluster images
    const clusters = clusterImages(fingerprints);
    
    // PART 3: Map strains to clusters
    mapStrainsToClusters(clusters);
    
    console.log('========================================');
    console.log('COMPLETE');
    console.log('========================================');
    console.log(`Fingerprints: ${fingerprints.length}`);
    console.log(`Clusters: ${clusters.length}`);
    console.log('========================================\n');
  } catch (error) {
    console.error('[FATAL ERROR]', error);
    process.exit(1);
  }
}

// Run
main();
