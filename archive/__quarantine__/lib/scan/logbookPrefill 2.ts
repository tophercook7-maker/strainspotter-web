/**
 * Logbook Prefill Utilities
 * Generate prefilled logbook entries and task suggestions from scan results
 */

import { EnrichedScanResult, generateLogbookPrefill, generateTaskSuggestions } from './enrichment';

export interface LogbookPrefillData {
  notes: string;
  tags?: string[];
  scan_id?: string;
  scan_type?: 'id' | 'doctor';
}

export interface TaskPrefillData {
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  scan_id?: string;
}

/**
 * Get logbook prefill data from scan result
 * Returns data ready to prefill a logbook entry form
 */
export function getLogbookPrefill(
  enrichment: EnrichedScanResult,
  scanType: 'id' | 'doctor',
  matchName?: string,
  scanId?: string
): LogbookPrefillData {
  const prefill = generateLogbookPrefill(enrichment, scanType, matchName);
  
  return {
    ...prefill,
    scan_id: scanId,
    scan_type: scanType,
  };
}

/**
 * Get task suggestions from scan result
 * Returns array of task data ready to create tasks
 */
export function getTaskPrefills(
  enrichment: EnrichedScanResult,
  scanId?: string
): TaskPrefillData[] {
  const tasks = generateTaskSuggestions(enrichment);
  
  return tasks.map(task => ({
    ...task,
    scan_id: scanId,
  }));
}

/**
 * Format scan result for logbook entry
 * Creates a formatted summary suitable for logbook notes
 */
export function formatScanForLogbook(
  enrichment: EnrichedScanResult,
  scanType: 'id' | 'doctor',
  matchName?: string
): string {
  const lines: string[] = [];
  
  lines.push(`=== ${scanType === 'id' ? 'Strain ID Scan' : 'Health Check Scan'} ===`);
  lines.push('');
  lines.push(`Confidence: ${enrichment.confidence_score}%`);
  lines.push('');
  lines.push('Explanation:');
  lines.push(enrichment.explanation);
  lines.push('');
  
  if (matchName) {
    lines.push(`Identified Strain: ${matchName}`);
    lines.push('');
  }
  
  if (enrichment.observed_signals.length > 0) {
    lines.push('Observed Signals:');
    enrichment.observed_signals.forEach(signal => {
      lines.push(`- ${signal}`);
    });
    lines.push('');
  }
  
  if (enrichment.probable_conditions && enrichment.probable_conditions.length > 0) {
    lines.push('Probable Conditions:');
    enrichment.probable_conditions.forEach(condition => {
      lines.push(`- ${condition}`);
    });
    lines.push('');
  }
  
  if (enrichment.recommendations.length > 0) {
    lines.push('Recommendations:');
    enrichment.recommendations.forEach(rec => {
      lines.push(`- ${rec}`);
    });
    lines.push('');
  }
  
  if (enrichment.follow_up_checks.length > 0) {
    lines.push('Follow-up Checks:');
    enrichment.follow_up_checks.forEach(check => {
      lines.push(`- ${check}`);
    });
  }
  
  return lines.join('\n');
}
