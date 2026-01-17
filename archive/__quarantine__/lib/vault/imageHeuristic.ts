/**
 * Image Heuristic Service
 * Scores images based on resolution and file size to pick the best one
 */

import fs from "fs";
import path from "path";
import sharp from "sharp";

/**
 * Score an image based on resolution and file size
 * Higher score = better quality image
 */
export async function scoreImage(filePath: string): Promise<number> {
  try {
    const stat = fs.statSync(filePath);
    const metadata = await sharp(filePath).metadata();
    const width = metadata.width || 0;
    const height = metadata.height || 0;
    const pixels = width * height;
    
    // Score = pixels * log10(file size + 1)
    // This favors high resolution and reasonable file size
    return pixels * Math.log10(stat.size + 1);
  } catch (error) {
    console.error(`[imageHeuristic] Error scoring image ${filePath}:`, error);
    return 0;
  }
}

/**
 * Pick the best image from a directory based on score
 */
export async function pickBestImage(dir: string): Promise<string | null> {
  if (!fs.existsSync(dir)) {
    return null;
  }

  try {
    const files = fs.readdirSync(dir).filter((f) =>
      /\.(jpg|jpeg|png|webp)$/i.test(f)
    );

    if (files.length === 0) {
      return null;
    }

    let best: string | null = null;
    let bestScore = 0;

    for (const f of files) {
      const p = path.join(dir, f);
      try {
        const s = await scoreImage(p);
        if (s > bestScore) {
          bestScore = s;
          best = p;
        }
      } catch (error) {
        console.error(`[imageHeuristic] Error processing ${p}:`, error);
        // Continue to next file
      }
    }

    return best;
  } catch (error) {
    console.error(`[imageHeuristic] Error reading directory ${dir}:`, error);
    return null;
  }
}
