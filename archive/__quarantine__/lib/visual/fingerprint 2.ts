/**
 * Image Fingerprinting Utilities
 * 
 * Computes perceptual hashes and visual features for scanned images.
 * Uses identical logic to image_fingerprinting.mjs for consistency.
 */

import sharp from 'sharp';

/**
 * Compute perceptual hash (aHash - average hash)
 * Based on image average brightness
 */
export function computePerceptualHash(imageData: Uint8Array, width: number, height: number): string {
  // Resize to 8x8 for hash computation
  const size = 8;
  const blockWidth = Math.floor(width / size);
  const blockHeight = Math.floor(height / size);
  
  // Compute average brightness
  let totalBrightness = 0;
  const blocks: number[] = [];
  
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
export function computeDominantColor(imageData: Uint8Array, width: number, height: number): string {
  const colorBuckets = new Map<string, number>();
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
 * Fingerprint an image buffer
 * Returns the same format as image_fingerprinting.mjs
 */
export async function fingerprintImageBuffer(imageBuffer: Buffer): Promise<{
  phash: string;
  width: number;
  height: number;
  dominant_color: string;
} | null> {
  try {
    const metadata = await sharp(imageBuffer).metadata();
    const originalWidth = metadata.width;
    const originalHeight = metadata.height;
    
    if (!originalWidth || !originalHeight) {
      return null;
    }
    
    // Resize to 64x64 for processing (maintain aspect ratio)
    const resized = await sharp(imageBuffer)
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
      phash,
      width: originalWidth,
      height: originalHeight,
      dominant_color: dominantColor,
    };
  } catch (error) {
    console.error('[FINGERPRINT] Failed to fingerprint image:', error);
    return null;
  }
}
