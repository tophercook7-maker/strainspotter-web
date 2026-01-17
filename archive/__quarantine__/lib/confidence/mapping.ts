/**
 * Confidence Level Mapping
 * 
 * Maps between internal engine confidence levels and database/storage formats
 */

import { ConfidenceLevel } from './engine';

/**
 * Map engine confidence level to database format
 * Database uses: LOW, MEDIUM, HIGH
 * Engine uses: VERY_LOW, LOW, MODERATE, HIGH
 */
export function mapConfidenceLevelToDB(level: ConfidenceLevel): 'LOW' | 'MEDIUM' | 'HIGH' {
  switch (level) {
    case 'VERY_LOW':
    case 'LOW':
      return 'LOW';
    case 'MODERATE':
      return 'MEDIUM';
    case 'HIGH':
      return 'HIGH';
  }
}

