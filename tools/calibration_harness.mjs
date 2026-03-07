#!/usr/bin/env node

/**
 * Visual Match Calibration Harness
 * 
 * Dev-only test harness for tuning visual matching weights.
 * Accepts a local image and runs OCR-only, visual-only, and combined matches.
 * 
 * USAGE:
 *   npx tsx tools/calibration_harness.mjs <image_path>
 * 
 * Or if TypeScript is compiled:
 *   node tools/calibration_harness.mjs <image_path>
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

// Note: This script requires tsx to run TypeScript directly
// Or the TypeScript must be compiled first
// For now, we'll provide a structure that can be adapted

/**
 * Simple OCR simulation (for comparison)
 */
function simulateOCRMatch(imagePath) {
  // In real scenario, this would use Vision API
  // For calibration, we'll return mock scores
  return [
    { slug: 'blue-dream', score: 65 },
    { slug: 'og-kush', score: 55 },
    { slug: 'white-widow', score: 45 },
  ];
}

/**
 * Run calibration test
 * 
 * NOTE: This function requires the TypeScript modules to be available.
 * Use tsx to run: npx tsx tools/calibration_harness.mjs <image_path>
 */
async function runCalibration(imagePath) {
  console.log('========================================');
  console.log('VISUAL MATCH CALIBRATION HARNESS');
  console.log('========================================\n');

  if (!existsSync(imagePath)) {
    console.error(`[ERROR] Image not found: ${imagePath}`);
    process.exit(1);
  }

  console.log(`[TEST] Image: ${imagePath}\n`);

  // Try to load TypeScript modules dynamically
  let fingerprintImageBuffer, matchScanToStrains, getCalibrationConfig;
  
  try {
    // Use dynamic import for TypeScript (requires tsx or compiled output)
    const fingerprintModule = await import('../lib/visual/fingerprint.ts');
    const clusterMatchModule = await import('../lib/visual/clusterMatch.ts');
    const calibrationModule = await import('../lib/visual/calibration.ts');
    
    fingerprintImageBuffer = fingerprintModule.fingerprintImageBuffer;
    matchScanToStrains = clusterMatchModule.matchScanToStrains;
    getCalibrationConfig = calibrationModule.getCalibrationConfig;
  } catch (err) {
    console.error('[ERROR] Failed to load TypeScript modules.');
    console.error('[ERROR] This script requires tsx to run TypeScript directly.');
    console.error('[ERROR] Install: npm install -D tsx');
    console.error('[ERROR] Run: npx tsx tools/calibration_harness.mjs <image_path>');
    process.exit(1);
  }

  // Load image
  const imageBuffer = readFileSync(imagePath);
  
  // PART 1: Fingerprint image
  console.log('[STEP 1] Computing fingerprint...');
  const fingerprint = await fingerprintImageBuffer(imageBuffer);
  
  if (!fingerprint) {
    console.error('[ERROR] Failed to fingerprint image');
    process.exit(1);
  }
  
  console.log(`[STEP 1] ✓ Fingerprint computed`);
  console.log(`  - Hash: ${fingerprint.phash.substring(0, 16)}...`);
  console.log(`  - Dimensions: ${fingerprint.width}x${fingerprint.height}`);
  console.log(`  - Dominant color: ${fingerprint.dominant_color}\n`);

  // PART 2: Visual-only match
  console.log('[STEP 2] Running visual cluster matching...');
  const visualResult = matchScanToStrains(fingerprint.phash);
  const visualCandidates = visualResult.candidates || [];
  
  console.log(`[STEP 2] ✓ Visual matching complete`);
  console.log(`  - Matched clusters: ${visualResult.debug?.matched_clusters?.length || 0}`);
  if (visualResult.debug?.matched_clusters?.length > 0) {
    console.log(`  - Best distance: ${visualResult.debug.matched_clusters[0].distance}`);
  }
  console.log(`  - Strain candidates: ${visualCandidates.length}\n`);

  // PART 3: OCR-only match (simulated)
  console.log('[STEP 3] Running OCR matching (simulated)...');
  const ocrCandidates = simulateOCRMatch(imagePath);
  console.log(`[STEP 3] ✓ OCR matching complete`);
  console.log(`  - Strain candidates: ${ocrCandidates.length}\n`);

  // PART 4: Combined match
  console.log('[STEP 4] Computing combined scores...');
  const calibration = getCalibrationConfig();
  
  // Build combined scores
  const visualScoreMap = new Map(
    visualCandidates.map(v => [v.strain_slug, v.visual_score])
  );
  const visualCombinedMap = new Map(
    visualCandidates.map(v => [v.strain_slug, v.combined_score])
  );
  
  const combined = ocrCandidates.map((ocr) => {
    const visualScore = visualScoreMap.get(ocr.slug) || 0;
    const visualCombined = visualCombinedMap.get(ocr.slug) || 0;
    const combinedScore = (ocr.score * calibration.ocr_weight) + (visualCombined * calibration.visual_weight);
    
    return {
      slug: ocr.slug,
      ocr_score: ocr.score,
      visual_score: visualScore,
      visual_combined: visualCombined,
      combined_score: combinedScore,
    };
  });
  
  combined.sort((a, b) => b.combined_score - a.combined_score);
  
  console.log(`[STEP 4] ✓ Combined scores computed\n`);

  // OUTPUT: Structured comparison
  console.log('========================================');
  console.log('RESULTS COMPARISON');
  console.log('========================================\n');

  console.log('CALIBRATION CONFIG:');
  console.log(JSON.stringify(calibration, null, 2));
  console.log('');

  console.log('TOP 5 CANDIDATES:');
  console.log('─'.repeat(80));
  combined.slice(0, 5).forEach((c, i) => {
    console.log(`${i + 1}. ${c.slug}`);
    console.log(`   OCR: ${c.ocr_score}% | Visual: ${c.visual_score}% | Combined: ${Math.round(c.combined_score)}%`);
    console.log('');
  });

  console.log('VISUAL CLUSTER MATCHES:');
  if (visualResult.debug?.matched_clusters) {
    visualResult.debug.matched_clusters.forEach((cluster, i) => {
      console.log(`  ${i + 1}. ${cluster.cluster_id} (distance: ${cluster.distance})`);
    });
  } else {
    console.log('  (no clusters matched)');
  }
  console.log('');

  console.log('========================================');
  console.log('CALIBRATION COMPLETE');
  console.log('========================================\n');
}

// Main
const imagePath = process.argv[2];

if (!imagePath) {
  console.error('Usage: npx tsx tools/calibration_harness.mjs <image_path>');
  console.error('Example: npx tsx tools/calibration_harness.mjs ./test-image.jpg');
  console.error('');
  console.error('Note: Requires tsx to run TypeScript directly.');
  console.error('Install: npm install -D tsx');
  process.exit(1);
}

runCalibration(imagePath).catch(error => {
  console.error('[FATAL ERROR]', error);
  process.exit(1);
});
