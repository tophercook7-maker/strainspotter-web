/**
 * Visual Cluster Matching
 * 
 * Matches scanned images to visual clusters and returns strain candidates.
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import {
  MAX_VISUAL_DISTANCE,
  MIN_CLUSTER_CONFIDENCE,
  LOW_CONFIDENCE_PENALTY,
  MAX_VISUAL_BOOST,
  VISUAL_SCORE_MULTIPLIER,
  CONFIDENCE_MULTIPLIER,
  TOP_CLUSTERS_COUNT,
  MAX_STRAIN_CANDIDATES,
} from './calibration';

interface Cluster {
  cluster_id: string;
  phash_centroid: string;
  image_urls: string[];
  size?: number;
}

interface StrainSignature {
  strain_slug: string;
  cluster_ids: string[];
  match_types: string[];
  confidence: number;
}

interface ClusterMatch {
  cluster_id: string;
  distance: number;
  cluster: Cluster;
}

interface StrainCandidate {
  strain_slug: string;
  visual_score: number;
  confidence: number;
  combined_score: number;
}

/**
 * Hamming distance between two hashes
 */
export function hammingDistance(hash1: string, hash2: string): number {
  if (hash1.length !== hash2.length) return Infinity;
  let distance = 0;
  for (let i = 0; i < hash1.length; i++) {
    if (hash1[i] !== hash2[i]) distance++;
  }
  return distance;
}

/**
 * Load clusters from file
 */
function loadClusters(): Cluster[] {
  const path = join(process.cwd(), 'image_clusters.json');
  if (existsSync(path)) {
    try {
      return JSON.parse(readFileSync(path, 'utf-8'));
    } catch (err) {
      console.warn('[CLUSTER_MATCH] Failed to load clusters:', err);
    }
  }
  return [];
}

/**
 * Load strain signatures from file
 */
function loadStrainSignatures(): StrainSignature[] {
  const path = join(process.cwd(), 'strain_visual_signatures.json');
  if (existsSync(path)) {
    try {
      return JSON.parse(readFileSync(path, 'utf-8'));
    } catch (err) {
      console.warn('[CLUSTER_MATCH] Failed to load strain signatures:', err);
    }
  }
  return [];
}

/**
 * PART 2: Match scan fingerprint to clusters
 * Returns top N clusters ranked by Hamming distance
 * Applies distance clamp guardrail
 */
export function matchToClusters(
  scanPhash: string,
  topN: number = TOP_CLUSTERS_COUNT
): ClusterMatch[] {
  const clusters = loadClusters();
  
  if (clusters.length === 0) {
    return [];
  }
  
  // Compute distance to each cluster centroid
  const matches: ClusterMatch[] = [];
  
  for (const cluster of clusters) {
    const distance = hammingDistance(scanPhash, cluster.phash_centroid);
    
    // GUARDRAIL 1: Distance Clamp - only include clusters within threshold
    if (distance <= MAX_VISUAL_DISTANCE) {
      matches.push({
        cluster_id: cluster.cluster_id,
        distance,
        cluster,
      });
    }
  }
  
  // Sort by distance (ascending) and return top N
  matches.sort((a, b) => a.distance - b.distance);
  return matches.slice(0, topN);
}

/**
 * PART 3: Rank strains based on cluster matches
 * Returns ranked list of strain candidates
 * Applies confidence clamp and boost cap guardrails
 */
export function rankStrainsFromClusters(
  clusterMatches: ClusterMatch[],
  maxResults: number = MAX_STRAIN_CANDIDATES
): StrainCandidate[] {
  const signatures = loadStrainSignatures();
  
  if (signatures.length === 0 || clusterMatches.length === 0) {
    return [];
  }
  
  // Build cluster_id -> distance map
  const clusterDistanceMap = new Map<string, number>();
  for (const match of clusterMatches) {
    clusterDistanceMap.set(match.cluster_id, match.distance);
  }
  
  // Build strain -> scores map
  const strainScores = new Map<string, {
    visualScore: number;
    confidence: number;
    combinedScore: number;
    rawDistance: number;
  }>();
  
  for (const signature of signatures) {
    // Find best (lowest) distance for this strain
    let bestDistance = Infinity;
    
    for (const clusterId of signature.cluster_ids) {
      const distance = clusterDistanceMap.get(clusterId);
      if (distance !== undefined && distance < bestDistance) {
        bestDistance = distance;
      }
    }
    
    // Skip if strain not in any matched clusters
    if (bestDistance === Infinity) continue;
    
    // GUARDRAIL 1: Distance Clamp (already applied in matchToClusters, but double-check)
    if (bestDistance > MAX_VISUAL_DISTANCE) {
      continue; // Skip this strain
    }
    
    // Convert distance to score (0-100, lower distance = higher score)
    // Max distance for 64-bit hash is 64, so normalize
    let visualScore = Math.max(0, 100 - (bestDistance / 64) * 100);
    
    // GUARDRAIL 2: Confidence Clamp
    // If confidence is low, reduce visual contribution
    let confidenceMultiplier = CONFIDENCE_MULTIPLIER;
    if (signature.confidence < MIN_CLUSTER_CONFIDENCE) {
      confidenceMultiplier *= LOW_CONFIDENCE_PENALTY;
    }
    
    // Calculate combined score with guardrails
    const baseCombinedScore = (visualScore * VISUAL_SCORE_MULTIPLIER) + (signature.confidence * 100 * confidenceMultiplier);
    
    // GUARDRAIL 3: Boost Cap
    // Prevent visual from adding more than MAX_VISUAL_BOOST points
    // This is relative to a baseline (assume OCR would give 50% if visual gives 0%)
    const baselineScore = 50; // Assumed OCR baseline
    const visualContribution = baseCombinedScore - baselineScore;
    const cappedContribution = Math.min(visualContribution, MAX_VISUAL_BOOST);
    const combinedScore = baselineScore + cappedContribution;
    
    // Get existing or create new
    const existing = strainScores.get(signature.strain_slug);
    if (!existing || visualScore > existing.visualScore) {
      // Use best visual score and strain confidence
      strainScores.set(signature.strain_slug, {
        visualScore,
        confidence: signature.confidence,
        combinedScore,
        rawDistance: bestDistance,
      });
    }
  }
  
  // Convert to array and sort by combined score
  const candidates: StrainCandidate[] = Array.from(strainScores.entries()).map(([slug, scores]) => ({
    strain_slug: slug,
    visual_score: Math.round(scores.visualScore),
    confidence: Math.round(scores.confidence * 100),
    combined_score: Math.round(scores.combinedScore),
  }));
  
  candidates.sort((a, b) => b.combined_score - a.combined_score);
  
  return candidates.slice(0, maxResults);
}

/**
 * Main function: Match scan to clusters and return ranked strains
 */
export function matchScanToStrains(
  scanPhash: string,
  topClusters: number = TOP_CLUSTERS_COUNT,
  maxStrains: number = MAX_STRAIN_CANDIDATES
): {
  candidates: StrainCandidate[];
  debug?: {
    matched_clusters: Array<{ cluster_id: string; distance: number }>;
  };
} {
  // PART 2: Match to clusters
  const clusterMatches = matchToClusters(scanPhash, topClusters);
  
  if (clusterMatches.length === 0) {
    return { candidates: [] };
  }
  
  // PART 3: Rank strains
  const candidates = rankStrainsFromClusters(clusterMatches, maxStrains);
  
  return {
    candidates,
    debug: {
      matched_clusters: clusterMatches.map(m => ({
        cluster_id: m.cluster_id,
        distance: m.distance,
      })),
    },
  };
}
