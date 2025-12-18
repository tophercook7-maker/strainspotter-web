/**
 * Visual Matcher V2 - Advanced matching with embeddings, pHash, color, texture
 * Uses manifest-based matching with weighted scoring
 */

import sharp from 'sharp';
import { readFile, stat } from 'fs/promises';

export interface Manifest {
  strain: string;
  images: {
    real: string[];
    synthetic: string[];
  };
  hashes: Array<{
    filename: string;
    path?: string;
    hash: string;
    metadata?: any;
  }>;
  color_profile: {
    r: number[];
    g: number[];
    b: number[];
  } | null;
  texture_vectors: Array<number[] | null>;
  embeddings: Array<number[] | null>;
  metadata: {
    total_images: number;
    real_count: number;
    synthetic_count: number;
  };
}

export interface MatchResult {
  strain: string;
  score: number;
  breakdown: {
    pHash: number;
    color: number;
    texture: number;
    embedding: number;
    labelText: number;
    cluster?: number;
  };
}

/**
 * Computes pHash similarity score
 */
export async function computePHashScore(
  imagePath: string | Buffer,
  manifestHashes: string[]
): Promise<number> {
  if (manifestHashes.length === 0) return 0;

  try {
    const imageHash = await computeImagePHash(imagePath);
    
    // Find minimum hamming distance
    let minDistance = Infinity;
    for (const manifestHash of manifestHashes) {
      const distance = hammingDistance(imageHash, manifestHash);
      if (distance < minDistance) {
        minDistance = distance;
      }
    }

    // Convert distance to score (0-100)
    // Lower distance = higher score
    // Typical pHash distance: 0-64, threshold ~10-15
    const maxDistance = 64;
    const score = Math.max(0, 100 - (minDistance / maxDistance) * 100);
    return Math.round(score);
  } catch (error) {
    console.warn('pHash computation failed:', error);
    return 0;
  }
}

/**
 * Computes color histogram similarity score
 */
export async function computeColorHistogramScore(
  imagePath: string | Buffer,
  manifestColorProfile: { r: number[]; g: number[]; b: number[] } | null
): Promise<number> {
  if (!manifestColorProfile) return 0;

  try {
    const imageHistogram = await extractColorHistogram(imagePath);
    if (!imageHistogram) return 0;

    // Compare histograms using correlation
    const rCorrelation = correlateHistograms(imageHistogram.r, manifestColorProfile.r);
    const gCorrelation = correlateHistograms(imageHistogram.g, manifestColorProfile.g);
    const bCorrelation = correlateHistograms(imageHistogram.b, manifestColorProfile.b);

    // Average correlation, convert to 0-100 score
    const avgCorrelation = (rCorrelation + gCorrelation + bCorrelation) / 3;
    return Math.round(avgCorrelation * 100);
  } catch (error) {
    console.warn('Color histogram computation failed:', error);
    return 0;
  }
}

/**
 * Computes texture similarity score
 */
export async function computeTextureScore(
  imagePath: string | Buffer,
  manifestTextureVectors: Array<number[] | null>
): Promise<number> {
  const validVectors = manifestTextureVectors.filter(v => v !== null) as number[][];
  if (validVectors.length === 0) return 0;

  try {
    const imageTexture = await extractTextureVector(imagePath);
    if (!imageTexture) return 0;

    // Find minimum cosine distance
    let maxSimilarity = 0;
    for (const manifestTexture of validVectors) {
      const similarity = cosineSimilarity(imageTexture, manifestTexture);
      if (similarity > maxSimilarity) {
        maxSimilarity = similarity;
      }
    }

    return Math.round(maxSimilarity * 100);
  } catch (error) {
    console.warn('Texture computation failed:', error);
    return 0;
  }
}

/**
 * Computes embedding similarity score
 */
export async function computeEmbeddingScore(
  imagePath: string | Buffer,
  manifestEmbeddings: Array<number[] | null>
): Promise<number> {
  const validEmbeddings = manifestEmbeddings.filter(e => e !== null) as number[][];
  if (validEmbeddings.length === 0) return 0;

  try {
    const imageEmbedding = await extractEmbedding(imagePath);
    if (!imageEmbedding) return 0;

    // Find maximum cosine similarity
    let maxSimilarity = 0;
    for (const manifestEmbedding of validEmbeddings) {
      const similarity = cosineSimilarity(imageEmbedding, manifestEmbedding);
      if (similarity > maxSimilarity) {
        maxSimilarity = similarity;
      }
    }

    return Math.round(maxSimilarity * 100);
  } catch (error) {
    console.warn('Embedding computation failed:', error);
    return 0;
  }
}

/**
 * Computes label/text score (from vision API results)
 */
export function computeLabelTextScore(
  visionLabels: string[],
  visionText: string[],
  strainName: string
): number {
  let score = 0;

  // Check for strain name in text
  const text = visionText.join(' ').toLowerCase();
  const nameLower = strainName.toLowerCase();
  
  if (text.includes(nameLower)) {
    score += 50; // Strong text match
  } else {
    // Partial word matches
    const nameWords = nameLower.split(/\s+/);
    const matches = nameWords.filter(word => 
      word.length > 3 && text.includes(word)
    );
    score += (matches.length / nameWords.length) * 30;
  }

  // Check for cannabis-related labels
  const cannabisLabels = [
    'cannabis', 'marijuana', 'weed', 'bud', 'flower',
    'plant', 'herb', 'green', 'leaf', 'organic'
  ];
  
  const relevantLabels = visionLabels.filter(label =>
    cannabisLabels.some(cl => label.toLowerCase().includes(cl))
  );
  
  score += Math.min(20, relevantLabels.length * 5);

  return Math.min(100, Math.round(score));
}

/**
 * Main matching function - scores an image against a manifest
 */
export async function matchImageToManifest(
  imagePath: string | Buffer,
  manifest: Manifest,
  visionResults?: {
    labels?: string[];
    text?: string[];
  },
  weights?: {
    weight_phash?: number;
    weight_color?: number;
    weight_texture?: number;
    weight_embedding?: number;
    weight_label?: number;
    weight_cluster?: number;
  },
  clusters?: Array<{
    cluster_id: number;
    centroid: number[];
    image_urls: string[];
  }>
): Promise<MatchResult> {
  const breakdown = {
    pHash: 0,
    color: 0,
    texture: 0,
    embedding: 0,
    labelText: 0,
    cluster: 0
  };

  // Compute pHash score
  const hashes = manifest.hashes.map(h => h.hash).filter(Boolean);
  breakdown.pHash = await computePHashScore(imagePath, hashes);

  // Compute color score
  breakdown.color = await computeColorHistogramScore(imagePath, manifest.color_profile);

  // Compute texture score
  breakdown.texture = await computeTextureScore(imagePath, manifest.texture_vectors);

  // Compute embedding score
  breakdown.embedding = await computeEmbeddingScore(imagePath, manifest.embeddings);

  // Compute cluster alignment score (if clusters provided)
  if (clusters && clusters.length > 0) {
    breakdown.cluster = await computeClusterScore(imagePath, clusters);
  }

  // Compute label/text score (if vision results provided)
  if (visionResults) {
    breakdown.labelText = computeLabelTextScore(
      visionResults.labels || [],
      visionResults.text || [],
      manifest.strain
    );
  }

  // Weighted final score (use provided weights or defaults)
  const wPhash = weights?.weight_phash ?? 0.20;
  const wColor = weights?.weight_color ?? 0.15;
  const wTexture = weights?.weight_texture ?? 0.20;
  const wEmbedding = weights?.weight_embedding ?? 0.20;
  const wLabel = weights?.weight_label ?? 0.10;
  const wCluster = weights?.weight_cluster ?? 0.15;

  const finalScore =
    wPhash * breakdown.pHash +
    wColor * breakdown.color +
    wTexture * breakdown.texture +
    wEmbedding * breakdown.embedding +
    wLabel * breakdown.labelText +
    wCluster * (breakdown.cluster || 0);

  return {
    strain: manifest.strain,
    score: Math.round(finalScore),
    breakdown
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Computes perceptual hash for an image
 */
async function computeImagePHash(imagePath: string | Buffer): Promise<string> {
  try {
    const buffer = typeof imagePath === 'string' 
      ? await readFile(imagePath)
      : imagePath;
    
    const metadata = await sharp(buffer).metadata();
    const fileStats = typeof imagePath === 'string' 
      ? await stat(imagePath)
      : { size: buffer.length };
    
    // Simple hash based on dimensions and size
    return `${metadata.width || 0}x${metadata.height || 0}-${fileStats.size}`;
  } catch (error: any) {
    throw new Error(`Failed to compute pHash: ${error.message}`);
  }
}

/**
 * Extracts 256-bin RGB color histogram
 */
async function extractColorHistogram(imagePath: string | Buffer) {
  try {
    const buffer = typeof imagePath === 'string'
      ? await readFile(imagePath)
      : imagePath;

    const { data, info } = await sharp(buffer)
      .resize(256, 256, { fit: 'cover' })
      .raw()
      .toBuffer({ resolveWithObject: true });

    const histogram = {
      r: new Array(256).fill(0),
      g: new Array(256).fill(0),
      b: new Array(256).fill(0)
    };

    for (let i = 0; i < data.length; i += info.channels) {
      histogram.r[data[i]]++;
      histogram.g[data[i + 1]]++;
      histogram.b[data[i + 2]]++;
    }

    const total = data.length / info.channels;
    histogram.r = histogram.r.map(v => v / total);
    histogram.g = histogram.g.map(v => v / total);
    histogram.b = histogram.b.map(v => v / total);

    return histogram;
  } catch (error) {
    return null;
  }
}

/**
 * Extracts texture vector using LBP
 */
async function extractTextureVector(imagePath: string | Buffer) {
  try {
    const buffer = typeof imagePath === 'string'
      ? await readFile(imagePath)
      : imagePath;

    const { data, info } = await sharp(buffer)
      .greyscale()
      .resize(64, 64, { fit: 'cover' })
      .raw()
      .toBuffer({ resolveWithObject: true });

    const lbpHistogram = new Array(256).fill(0);
    const width = info.width;
    const height = info.height;

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const center = data[y * width + x];
        let lbpCode = 0;

        const neighbors = [
          data[(y - 1) * width + (x - 1)],
          data[(y - 1) * width + x],
          data[(y - 1) * width + (x + 1)],
          data[y * width + (x + 1)],
          data[(y + 1) * width + (x + 1)],
          data[(y + 1) * width + x],
          data[(y + 1) * width + (x - 1)],
          data[y * width + (x - 1)]
        ];

        neighbors.forEach((neighbor, idx) => {
          if (neighbor >= center) {
            lbpCode |= (1 << idx);
          }
        });

        lbpHistogram[lbpCode]++;
      }
    }

    const total = (width - 2) * (height - 2);
    return lbpHistogram.map(v => v / total);
  } catch (error) {
    return null;
  }
}

/**
 * Extracts embedding vector using GPU server or fallback
 */
export async function extractEmbedding(imagePath: string | Buffer) {
  try {
    const buffer = typeof imagePath === 'string'
      ? await readFile(imagePath)
      : imagePath;

    // Try GPU embedding server first
    const embeddingServerUrl = process.env.EMBEDDING_SERVER_URL || 'http://localhost:7001';
    
    try {
      const response = await fetch(`${embeddingServerUrl}/embed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_bytes: buffer.toString('base64')
        })
      });

      if (response.ok) {
        const data = await response.json();
        return data.embedding;
      }
    } catch (serverError) {
      console.warn('GPU embedding server unavailable, using fallback:', serverError);
    }

    // Fallback: simple statistics-based embedding
    const image = sharp(buffer);
    const stats = await image.stats();
    
    const embedding = [];
    
    if (stats.channels) {
      stats.channels.forEach(channel => {
        embedding.push(channel.mean / 255);
        embedding.push(channel.stdev / 255);
        embedding.push(channel.min / 255);
        embedding.push(channel.max / 255);
      });
    }
    
    const metadata = await image.metadata();
    embedding.push((metadata.width || 0) / 2048);
    embedding.push((metadata.height || 0) / 2048);
    embedding.push((metadata.channels || 3) / 4);
    
    // Pad to 512 for consistency with GPU server
    while (embedding.length < 512) {
      embedding.push(0);
    }
    
    return embedding.slice(0, 512);
  } catch (error) {
    console.error('Embedding extraction error:', error);
    return null;
  }
}

/**
 * Computes Hamming distance between two hashes
 */
function hammingDistance(hash1: string, hash2: string): number {
  if (hash1.length !== hash2.length) {
    return Infinity;
  }
  let distance = 0;
  for (let i = 0; i < hash1.length; i++) {
    if (hash1[i] !== hash2[i]) {
      distance++;
    }
  }
  return distance;
}

/**
 * Correlates two histograms
 */
function correlateHistograms(hist1: number[], hist2: number[]): number {
  if (hist1.length !== hist2.length) return 0;

  let sum1 = 0, sum2 = 0, sum1Sq = 0, sum2Sq = 0, pSum = 0;
  const n = hist1.length;

  for (let i = 0; i < n; i++) {
    sum1 += hist1[i];
    sum2 += hist2[i];
    sum1Sq += hist1[i] * hist1[i];
    sum2Sq += hist2[i] * hist2[i];
    pSum += hist1[i] * hist2[i];
  }

  const num = pSum - (sum1 * sum2 / n);
  const den = Math.sqrt((sum1Sq - sum1 * sum1 / n) * (sum2Sq - sum2 * sum2 / n));

  if (den === 0) return 0;
  return num / den;
}

/**
 * Computes cosine similarity between two vectors
 */
function cosineSimilarity(vec1: number[], vec2: number[]): number {
  if (vec1.length !== vec2.length) return 0;

  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;

  for (let i = 0; i < vec1.length; i++) {
    dotProduct += vec1[i] * vec2[i];
    norm1 += vec1[i] * vec1[i];
    norm2 += vec2[i] * vec2[i];
  }

  const denominator = Math.sqrt(norm1) * Math.sqrt(norm2);
  if (denominator === 0) return 0;

  return dotProduct / denominator;
}

/**
 * Computes cluster alignment score
 */
async function computeClusterScore(
  imagePath: string | Buffer,
  clusters: Array<{
    cluster_id: number;
    centroid: number[];
    image_urls: string[];
  }>
): Promise<number> {
  try {
    const imageEmbedding = await extractEmbedding(imagePath);
    if (!imageEmbedding) return 0;

    // Find closest cluster centroid
    let maxSimilarity = 0;
    for (const cluster of clusters) {
      if (cluster.centroid && cluster.centroid.length > 0) {
        const similarity = cosineSimilarity(imageEmbedding, cluster.centroid);
        if (similarity > maxSimilarity) {
          maxSimilarity = similarity;
        }
      }
    }

    return Math.round(maxSimilarity * 100);
  } catch (error) {
    console.warn('Cluster score computation failed:', error);
    return 0;
  }
}
