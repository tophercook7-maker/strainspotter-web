/**
 * Scan Result Enrichment
 * Adds explanations, recommendations, and actionable insights to scan results
 */

import { VisionResults } from '@/app/api/_utils/vision';

export interface EnrichedScanResult {
  confidence_score: number; // 0-100
  observed_signals: string[]; // Array of detected signals/features
  probable_conditions?: string[]; // For doctor scans
  recommendations: string[]; // Actionable recommendations
  follow_up_checks: string[]; // Suggested follow-up actions
  explanation: string; // Human-readable explanation
}

/**
 * Enrich ID scan result (strain identification)
 */
export function enrichIDScanResult(
  matchResult: {
    match: {
      name: string;
      confidence: number;
      reasoning: string;
      breakdown?: {
        color?: number;
        text?: number;
        label?: number;
        web?: number;
      };
    } | null;
    alternatives: Array<{
      name: string;
      confidence: number;
      reasoning: string;
    }>;
  },
  visionResults: VisionResults
): EnrichedScanResult {
  const match = matchResult.match;
  const confidence = match ? match.confidence : 0;
  
  // Build observed signals
  const signals: string[] = [];
  
  if (visionResults.text && visionResults.text.length > 0) {
    signals.push('Text labels detected');
  }
  
  if (visionResults.labels && visionResults.labels.length > 0) {
    const cannabisLabels = visionResults.labels.filter(l => 
      l.toLowerCase().includes('cannabis') || 
      l.toLowerCase().includes('marijuana') ||
      l.toLowerCase().includes('plant')
    );
    if (cannabisLabels.length > 0) {
      signals.push('Cannabis-related features identified');
    }
  }
  
  if (match?.breakdown) {
    if (match.breakdown.text && match.breakdown.text > 50) {
      signals.push('Strong text match');
    }
    if (match.breakdown.color && match.breakdown.color > 50) {
      signals.push('Color similarity match');
    }
  }
  
  // Generate explanation
  let explanation = '';
  if (match) {
    if (confidence >= 70) {
      explanation = `Strong match identified as ${match.name}. ${match.reasoning}`;
    } else if (confidence >= 40) {
      explanation = `Probable match: ${match.name}. ${match.reasoning}`;
    } else {
      explanation = `Low confidence match: ${match.name}. ${match.reasoning}`;
    }
  } else {
    explanation = 'No confident match found. Try rescanning with better lighting or include visible label text.';
  }
  
  // Generate recommendations
  const recommendations: string[] = [];
  
  if (match && confidence >= 40) {
    recommendations.push(`Research ${match.name} growing characteristics`);
    recommendations.push('Add this strain to your grow logbook');
  } else {
    recommendations.push('Rescan with improved lighting');
    recommendations.push('Ensure label text is clearly visible');
    recommendations.push('Check image focus and clarity');
  }
  
  // Follow-up checks
  const followUpChecks: string[] = [];
  
  if (match && confidence >= 40) {
    followUpChecks.push('Verify strain characteristics match your plant');
    followUpChecks.push('Check terpene profile and effects');
  } else {
    followUpChecks.push('Try scanning from different angles');
    followUpChecks.push('Include any packaging or labels in frame');
  }
  
  return {
    confidence_score: confidence,
    observed_signals: signals.length > 0 ? signals : ['Basic image analysis completed'],
    recommendations,
    follow_up_checks: followUpChecks,
    explanation,
  };
}

/**
 * Enrich Doctor scan result (plant health diagnosis)
 */
export function enrichDoctorScanResult(
  visionResults: VisionResults,
  labels: string[]
): EnrichedScanResult {
  const signals: string[] = [];
  const conditions: string[] = [];
  const recommendations: string[] = [];
  const followUpChecks: string[] = [];
  
  // Analyze labels for health indicators
  const labelText = labels.join(' ').toLowerCase();
  
  // Check for common issues
  if (labelText.includes('yellow') || labelText.includes('yellowing')) {
    signals.push('Yellowing detected');
    conditions.push('Possible nutrient deficiency');
    recommendations.push('Check nitrogen levels');
    recommendations.push('Review feeding schedule');
  }
  
  if (labelText.includes('brown') || labelText.includes('browning')) {
    signals.push('Browning detected');
    conditions.push('Possible overwatering or root issues');
    recommendations.push('Check soil moisture levels');
    recommendations.push('Inspect root health');
  }
  
  if (labelText.includes('spot') || labelText.includes('spotting')) {
    signals.push('Leaf spotting detected');
    conditions.push('Possible fungal or pest issue');
    recommendations.push('Inspect leaves for pests');
    recommendations.push('Check humidity levels');
  }
  
  if (labelText.includes('curl') || labelText.includes('curling')) {
    signals.push('Leaf curling detected');
    conditions.push('Possible heat stress or nutrient imbalance');
    recommendations.push('Check temperature and airflow');
    recommendations.push('Review nutrient pH levels');
  }
  
  if (labelText.includes('droop') || labelText.includes('drooping')) {
    signals.push('Drooping detected');
    conditions.push('Possible overwatering or underwatering');
    recommendations.push('Check watering schedule');
    recommendations.push('Monitor soil moisture');
  }
  
  // Default if no specific issues detected
  if (signals.length === 0) {
    signals.push('No obvious visual issues detected');
    recommendations.push('Continue monitoring plant health');
    recommendations.push('Maintain current care routine');
  }
  
  // Generate explanation
  let explanation = '';
  if (conditions.length > 0) {
    explanation = `${conditions[0]}. ${signals.join(', ')} observed.`;
  } else {
    explanation = 'Plant appears healthy. No obvious visual issues detected.';
  }
  
  // Follow-up checks
  followUpChecks.push('Monitor affected areas over next 48 hours');
  followUpChecks.push('Document any changes in plant appearance');
  
  // Calculate confidence based on signal strength
  const confidence = signals.length > 0 ? Math.min(85, 40 + (signals.length * 15)) : 30;
  
  return {
    confidence_score: confidence,
    observed_signals: signals,
    probable_conditions: conditions.length > 0 ? conditions : undefined,
    recommendations,
    follow_up_checks: followUpChecks,
    explanation,
  };
}

/**
 * Generate logbook entry prefilled data from scan result
 */
export function generateLogbookPrefill(
  scanResult: EnrichedScanResult,
  scanType: 'id' | 'doctor',
  matchName?: string
): {
  notes: string;
  tags?: string[];
} {
  const notes = [
    `Scan Result (${scanType === 'id' ? 'Strain ID' : 'Health Check'}):`,
    scanResult.explanation,
    '',
    'Recommendations:',
    ...scanResult.recommendations.map(r => `- ${r}`),
  ].join('\n');
  
  const tags: string[] = [];
  if (matchName) {
    tags.push(matchName.toLowerCase().replace(/\s+/g, '-'));
  }
  tags.push(scanType === 'id' ? 'strain-id' : 'health-check');
  
  if (scanResult.confidence_score >= 70) {
    tags.push('high-confidence');
  }
  
  return {
    notes,
    tags: tags.length > 0 ? tags : undefined,
  };
}

/**
 * Generate task suggestions from scan result
 */
export function generateTaskSuggestions(
  scanResult: EnrichedScanResult
): Array<{
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
}> {
  const tasks: Array<{
    title: string;
    description: string;
    priority: 'low' | 'medium' | 'high';
  }> = [];
  
  // High priority if conditions detected
  if (scanResult.probable_conditions && scanResult.probable_conditions.length > 0) {
    scanResult.recommendations.slice(0, 2).forEach(rec => {
      tasks.push({
        title: rec,
        description: scanResult.explanation,
        priority: 'high',
      });
    });
  } else {
    // Medium priority for follow-ups
    scanResult.follow_up_checks.slice(0, 2).forEach(check => {
      tasks.push({
        title: check,
        description: 'Follow-up from scan result',
        priority: 'medium',
      });
    });
  }
  
  return tasks;
}
