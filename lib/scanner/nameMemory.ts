// Phase 4.5.1 — Name Memory Cache
// lib/scanner/nameMemory.ts

import { imageFingerprint, similarityScore } from "./imageSimilarity";

/**
 * Cached scan result for name memory
 */
export type CachedScanResult = {
  primaryStrainName: string;
  confidencePercent: number;
  timestamp: number; // Unix timestamp in ms
  imageFingerprints: number[]; // Array of image fingerprints
  consensusFingerprint?: number; // Optional: combined fingerprint for multi-image scans
};

/**
 * Name memory cache entry
 */
type NameMemoryEntry = {
  cachedResult: CachedScanResult;
  accessCount: number; // How many times this entry was accessed
  lastAccessed: number; // Last access timestamp
};

const STORAGE_KEY = "ss_name_memory_v1";
const SIMILARITY_THRESHOLD = 0.85; // 85% similarity to consider as same plant
const MAX_CACHE_ENTRIES = 50; // Limit cache size
const CACHE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Generate a consensus fingerprint from multiple image fingerprints
 * Uses average of fingerprints (simple approach)
 */
function generateConsensusFingerprint(fingerprints: number[]): number {
  if (fingerprints.length === 0) return 0;
  if (fingerprints.length === 1) return fingerprints[0];
  
  // For multiple images, use average (simple consensus)
  const sum = fingerprints.reduce((acc, fp) => acc + fp, 0);
  return Math.round(sum / fingerprints.length);
}

/**
 * Load name memory cache from localStorage
 */
function loadNameMemory(): Map<string, NameMemoryEntry> {
  if (typeof window === "undefined") {
    return new Map();
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Map();

    const parsed = JSON.parse(raw) as Record<string, NameMemoryEntry>;
    const now = Date.now();
    const cache = new Map<string, NameMemoryEntry>();

    // Filter out expired entries and convert to Map
    for (const [key, entry] of Object.entries(parsed)) {
      const age = now - entry.cachedResult.timestamp;
      if (age < CACHE_EXPIRY_MS) {
        cache.set(key, entry);
      }
    }

    return cache;
  } catch {
    return new Map();
  }
}

/**
 * Save name memory cache to localStorage
 */
function saveNameMemory(cache: Map<string, NameMemoryEntry>): void {
  if (typeof window === "undefined") return;

  try {
    // Limit cache size by removing oldest entries
    if (cache.size > MAX_CACHE_ENTRIES) {
      const entries = Array.from(cache.entries());
      entries.sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);
      
      // Remove oldest entries
      const toRemove = entries.slice(0, cache.size - MAX_CACHE_ENTRIES);
      toRemove.forEach(([key]) => cache.delete(key));
    }

    const obj = Object.fromEntries(cache);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
  } catch {
    // ignore storage failures
  }
}

/**
 * Find matching cached result based on image fingerprints
 * Returns the best match if similarity is above threshold
 */
export function findCachedName(
  imageFingerprints: number[]
): CachedScanResult | null {
  if (imageFingerprints.length === 0) return null;

  const cache = loadNameMemory();
  if (cache.size === 0) return null;

  const consensusFp = generateConsensusFingerprint(imageFingerprints);
  let bestMatch: { entry: NameMemoryEntry; similarity: number; key: string } | null = null;

  // Search for matching entries
  for (const [key, entry] of cache.entries()) {
    const cached = entry.cachedResult;
    
    // Try consensus fingerprint match first
    if (cached.consensusFingerprint !== undefined) {
      const similarity = similarityScore(consensusFp, cached.consensusFingerprint);
      if (similarity >= SIMILARITY_THRESHOLD) {
        if (!bestMatch || similarity > bestMatch.similarity) {
          bestMatch = { entry, similarity, key };
        }
      }
    }

    // Also check individual image fingerprints
    for (const currentFp of imageFingerprints) {
      for (const cachedFp of cached.imageFingerprints) {
        const similarity = similarityScore(currentFp, cachedFp);
        if (similarity >= SIMILARITY_THRESHOLD) {
          if (!bestMatch || similarity > bestMatch.similarity) {
            bestMatch = { entry, similarity, key };
          }
        }
      }
    }
  }

  if (bestMatch) {
    // Update access stats
    bestMatch.entry.accessCount += 1;
    bestMatch.entry.lastAccessed = Date.now();
    cache.set(bestMatch.key, bestMatch.entry);
    saveNameMemory(cache);

    return bestMatch.entry.cachedResult;
  }

  return null;
}

/**
 * Cache a successful scan result
 */
export function cacheScanResult(
  primaryStrainName: string,
  confidencePercent: number,
  imageFingerprints: number[]
): void {
  if (imageFingerprints.length === 0) return;
  if (primaryStrainName === "Closest Known Cultivar") return; // Don't cache fallback names

  const cache = loadNameMemory();
  const consensusFp = generateConsensusFingerprint(imageFingerprints);
  
  // Use consensus fingerprint as primary key, fallback to first image fingerprint
  const key = consensusFp > 0 
    ? `consensus_${consensusFp}` 
    : `image_${imageFingerprints[0]}`;

  const cachedResult: CachedScanResult = {
    primaryStrainName,
    confidencePercent,
    timestamp: Date.now(),
    imageFingerprints,
    consensusFingerprint: consensusFp,
  };

  const entry: NameMemoryEntry = {
    cachedResult,
    accessCount: 1,
    lastAccessed: Date.now(),
  };

  cache.set(key, entry);
  saveNameMemory(cache);
}

/**
 * Clear expired entries from cache
 */
export function clearExpiredEntries(): void {
  const cache = loadNameMemory();
  const now = Date.now();
  let changed = false;

  for (const [key, entry] of cache.entries()) {
    const age = now - entry.cachedResult.timestamp;
    if (age >= CACHE_EXPIRY_MS) {
      cache.delete(key);
      changed = true;
    }
  }

  if (changed) {
    saveNameMemory(cache);
  }
}

/**
 * Get name memory bias for current scan
 * Returns the cached name if found, null otherwise
 * This is a BIAS, not a lock - the scanner can still choose a different name
 */
export function getNameMemoryBias(
  imageFingerprints: number[]
): { name: string; confidence: number } | null {
  const cached = findCachedName(imageFingerprints);
  
  if (cached) {
    return {
      name: cached.primaryStrainName,
      confidence: cached.confidencePercent,
    };
  }

  return null;
}
