/**
 * Ecosystem type definitions for Garden data models.
 * These are read-only types representing aggregated scan data.
 */

/**
 * Represents a strain node in the ecosystem with aggregated statistics.
 */
export type EcosystemStrainNode = {
  id: string;
  name: string;
  scanCount: number;
  avgConfidence: number;
  lastSeen: string;
};

/**
 * Represents a single scan event in the ecosystem.
 */
export type EcosystemScanEvent = {
  id: string;
  strainName: string;
  confidence: number | null;
  createdAt: string;
};
