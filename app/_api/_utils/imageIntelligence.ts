/**
 * Image Intelligence Utilities
 * Lightweight image quality and visual feature extraction
 */

import sharp from 'sharp';

export interface ImageQuality {
  overall: 'excellent' | 'good' | 'acceptable' | 'poor';
  blur: 'low' | 'moderate' | 'high';
  exposure: 'optimal' | 'acceptable' | 'overexposed' | 'underexposed';
  resolution: 'high' | 'sufficient' | 'low';
}

export interface VisualFeatures {
  bud_density?: 'sparse' | 'moderate' | 'compact' | 'dense';
  bud_shape?: 'elongated' | 'rounded_nug' | 'irregular' | 'unknown';
  trichome_coverage?: 'light' | 'moderate' | 'heavy' | 'unknown';
  secondary_pigmentation?: 'none' | 'purple_present' | 'orange_present' | 'mixed' | 'unknown';
}

/**
 * Assess image quality from buffer
 */
export async function assessImageQuality(imageBuffer: Buffer): Promise<ImageQuality> {
  try {
    const image = sharp(imageBuffer);
    const metadata = await image.metadata();
    const stats = await image.stats();

    // Resolution check
    const width = metadata.width || 0;
    const height = metadata.height || 0;
    const totalPixels = width * height;
    let resolution: ImageQuality['resolution'] = 'low';
    if (totalPixels >= 2000000) resolution = 'high';
    else if (totalPixels >= 500000) resolution = 'sufficient';

    // Blur detection (using variance of Laplacian approximation)
    // Simplified: use channel variance as proxy
    const channels = stats.channels || [];
    const avgVariance = channels.length > 0
      ? channels.reduce((sum, ch) => sum + (ch.stdev || 0) ** 2, 0) / channels.length
      : 0;
    
    let blur: ImageQuality['blur'] = 'low';
    if (avgVariance < 100) blur = 'high';
    else if (avgVariance < 300) blur = 'moderate';

    // Exposure check (using mean brightness)
    const meanBrightness = channels.length > 0 && channels[0].mean !== undefined
      ? channels[0].mean
      : 128;
    
    let exposure: ImageQuality['exposure'] = 'optimal';
    if (meanBrightness < 50) exposure = 'underexposed';
    else if (meanBrightness > 200) exposure = 'overexposed';
    else if (meanBrightness < 80 || meanBrightness > 180) exposure = 'acceptable';

    // Overall assessment
    let overall: ImageQuality['overall'] = 'good';
    if (blur === 'high' || exposure === 'underexposed' || exposure === 'overexposed' || resolution === 'low') {
      overall = 'poor';
    } else if (blur === 'moderate' || exposure === 'acceptable' || resolution === 'sufficient') {
      overall = 'acceptable';
    } else if (blur === 'low' && exposure === 'optimal' && resolution === 'high') {
      overall = 'excellent';
    }

    return {
      overall,
      blur,
      exposure,
      resolution,
    };
  } catch (error) {
    console.warn('[imageIntelligence] Image quality assessment failed:', error);
    // Return safe defaults
    return {
      overall: 'acceptable',
      blur: 'moderate',
      exposure: 'acceptable',
      resolution: 'sufficient',
    };
  }
}

/**
 * Extract visual features from image buffer
 * Uses lightweight analysis (no ML models)
 */
export async function extractVisualFeatures(imageBuffer: Buffer): Promise<VisualFeatures> {
  try {
    const image = sharp(imageBuffer);
    const stats = await image.stats();
    const metadata = await image.metadata();

    const features: VisualFeatures = {};

    // Dominant color analysis for pigmentation
    const channels = stats.channels || [];
    if (channels.length >= 3) {
      const r = channels[0]?.mean || 128;
      const g = channels[1]?.mean || 128;
      const b = channels[2]?.mean || 128;

      // Simple color analysis
      const purpleScore = r < 150 && b > r && b > g ? (150 - r) + (b - g) : 0;
      const orangeScore = r > 180 && g > 120 && b < 100 ? (r - 180) + (g - 120) : 0;

      if (purpleScore > 30) {
        features.secondary_pigmentation = 'purple_present';
      } else if (orangeScore > 30) {
        features.secondary_pigmentation = 'orange_present';
      } else if (purpleScore > 10 || orangeScore > 10) {
        features.secondary_pigmentation = 'mixed';
      } else {
        features.secondary_pigmentation = 'none';
      }
    } else {
      features.secondary_pigmentation = 'unknown';
    }

    // Trichome coverage proxy (using high-frequency detail)
    // Higher variance in small regions suggests more surface detail/trichomes
    const avgVariance = channels.length > 0
      ? channels.reduce((sum, ch) => sum + (ch.stdev || 0) ** 2, 0) / channels.length
      : 0;
    
    if (avgVariance > 500) {
      features.trichome_coverage = 'heavy';
    } else if (avgVariance > 200) {
      features.trichome_coverage = 'moderate';
    } else if (avgVariance > 50) {
      features.trichome_coverage = 'light';
    } else {
      features.trichome_coverage = 'unknown';
    }

    // Bud density proxy (using overall brightness distribution)
    // More uniform brightness suggests denser packing
    const brightnessStdDev = channels[0]?.stdev || 0;
    if (brightnessStdDev < 20) {
      features.bud_density = 'dense';
    } else if (brightnessStdDev < 40) {
      features.bud_density = 'compact';
    } else if (brightnessStdDev < 60) {
      features.bud_density = 'moderate';
    } else {
      features.bud_density = 'sparse';
    }

    // Bud shape proxy (using aspect ratio and edge detection approximation)
    const width = metadata.width || 1;
    const height = metadata.height || 1;
    const aspectRatio = width / height;
    
    // Simplified: use image dimensions as proxy
    // More square images might suggest rounded nugs, elongated suggests elongated buds
    if (aspectRatio > 1.5 || aspectRatio < 0.67) {
      features.bud_shape = 'elongated';
    } else if (aspectRatio > 1.2 || aspectRatio < 0.83) {
      features.bud_shape = 'irregular';
    } else {
      features.bud_shape = 'rounded_nug';
    }

    return features;
  } catch (error) {
    console.warn('[imageIntelligence] Visual feature extraction failed:', error);
    // Return safe defaults
    return {
      bud_density: 'moderate',
      bud_shape: 'unknown',
      trichome_coverage: 'unknown',
      secondary_pigmentation: 'unknown',
    };
  }
}

