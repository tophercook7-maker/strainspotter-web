/**
 * Packaging & Label Intelligence
 * Detects packaging and extracts label information
 * Observational only - no compliance claims or accusations
 */

import { VisionResults } from './vision';

export interface PackagingLabel {
  brand_name?: string;
  strain_label?: string;
  batch?: string;
  raw_text: string[];
}

export interface PackagingConsistency {
  consistency_score: number; // 0-1
  explanation: string;
}

/**
 * Detect if packaging is present in image
 * Uses heuristics: text density, label-like patterns
 */
export function detectPackaging(visionResults: VisionResults): boolean {
  // Heuristic: packaging typically has:
  // - Multiple text lines (labels have structured text)
  // - High text density
  // - Label-related keywords in detected text
  
  const textLines = visionResults.text || [];
  const allText = textLines.join(' ').toLowerCase();
  
  // Packaging indicators
  const packagingKeywords = [
    'batch', 'lot', 'thc', 'cbd', 'net weight', 'packaged', 'manufactured',
    'cultivated', 'harvested', 'tested', 'lab', 'license', 'strain', 'variety'
  ];
  
  const hasPackagingKeywords = packagingKeywords.some(keyword => 
    allText.includes(keyword)
  );
  
  // High text density suggests packaging
  const textDensity = textLines.length >= 3;
  
  // Check for label-like structure (numbers, dates, codes)
  const hasStructuredData = /(batch|lot|#)[\s:]*[A-Z0-9-]+/i.test(allText) ||
    /\d{1,2}\/\d{1,2}\/\d{2,4}/.test(allText); // Date patterns
  
  return hasPackagingKeywords || (textDensity && hasStructuredData);
}

/**
 * Extract label information from OCR text
 * Conservative parsing - only extract if clear
 */
export function extractLabelInfo(visionResults: VisionResults): PackagingLabel {
  const textLines = visionResults.text || [];
  const allText = textLines.join(' ').toLowerCase();
  
  const label: PackagingLabel = {
    raw_text: textLines,
  };
  
  // Extract brand name (look for company/farm indicators)
  const brandPatterns = [
    /(?:brand|by|from|produced by|cultivated by)[\s:]+([A-Z][A-Za-z\s&]+)/i,
    /^([A-Z][A-Za-z\s&]+Farm)/i,
    /^([A-Z][A-Za-z\s&]+Co\.)/i,
  ];
  
  for (const pattern of brandPatterns) {
    const match = allText.match(pattern);
    if (match && match[1]) {
      label.brand_name = match[1].trim();
      break;
    }
  }
  
  // Extract strain label (look for strain name patterns)
  // Common patterns: "Strain:", "Variety:", or standalone capitalized words
  const strainPatterns = [
    /(?:strain|variety)[\s:]+([A-Z][A-Za-z\s-]+)/i,
    /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)$/m, // Standalone capitalized words
  ];
  
  for (const pattern of strainPatterns) {
    const match = allText.match(pattern);
    if (match && match[1] && match[1].length > 3) {
      // Filter out common false positives
      const candidate = match[1].trim();
      if (!['Batch', 'Lot', 'THC', 'CBD', 'Net', 'Weight'].includes(candidate)) {
        label.strain_label = candidate;
        break;
      }
    }
  }
  
  // Extract batch/lot number
  const batchPatterns = [
    /(?:batch|lot)[\s:]*#?[\s:]*([A-Z0-9-]+)/i,
    /(?:batch|lot)[\s:]*([A-Z0-9-]+)/i,
    /#([A-Z0-9-]{4,})/i, // Standalone codes
  ];
  
  for (const pattern of batchPatterns) {
    const match = allText.match(pattern);
    if (match && match[1]) {
      label.batch = match[1].trim();
      break;
    }
  }
  
  return label;
}

/**
 * Check consistency between label and visual phenotype
 * Returns observational assessment, not accusations
 */
export function checkLabelConsistency(
  label: PackagingLabel,
  phenotypeFamilies: string[],
  visualFeatures: any
): PackagingConsistency {
  let score = 0.5; // Neutral starting point
  const observations: string[] = [];
  
  // If no label strain name, can't assess consistency
  if (!label.strain_label) {
    return {
      consistency_score: 0.5,
      explanation: 'No strain label detected on packaging. Cannot assess visual consistency.',
    };
  }
  
  const labelStrainLower = label.strain_label.toLowerCase();
  
  // Check if label strain matches phenotype families
  const matchesFamily = phenotypeFamilies.some(family => 
    labelStrainLower.includes(family.toLowerCase()) ||
    family.toLowerCase().includes(labelStrainLower.split(' ')[0])
  );
  
  if (matchesFamily) {
    score += 0.3;
    observations.push(`Label strain "${label.strain_label}" appears consistent with observed visual phenotype families.`);
  } else if (phenotypeFamilies.length > 0) {
    score -= 0.2;
    observations.push(`Label strain "${label.strain_label}" appears visually different from observed phenotype families (${phenotypeFamilies.join(', ')}).`);
  }
  
  // Check visual feature consistency (if available)
  if (visualFeatures) {
    // Purple strains should have purple pigmentation
    if (labelStrainLower.includes('purple') && visualFeatures.secondary_pigmentation !== 'purple_present') {
      score -= 0.1;
      observations.push('Label suggests purple strain, but purple pigmentation not prominently observed.');
    } else if (labelStrainLower.includes('purple') && visualFeatures.secondary_pigmentation === 'purple_present') {
      score += 0.1;
      observations.push('Purple pigmentation observed, consistent with label indication.');
    }
    
    // Frosty/trichome-heavy strains
    if ((labelStrainLower.includes('frost') || labelStrainLower.includes('crystal')) && 
        visualFeatures.trichome_coverage !== 'heavy') {
      score -= 0.1;
      observations.push('Label suggests high trichome coverage, but heavy trichome coverage not prominently observed.');
    } else if ((labelStrainLower.includes('frost') || labelStrainLower.includes('crystal')) && 
               visualFeatures.trichome_coverage === 'heavy') {
      score += 0.1;
      observations.push('Heavy trichome coverage observed, consistent with label description.');
    }
  }
  
  // Normalize score
  score = Math.max(0, Math.min(1, score));
  
  // Build explanation
  let explanation = '';
  if (observations.length > 0) {
    explanation = observations.join(' ');
  } else {
    explanation = `Label indicates "${label.strain_label}". Visual analysis shows characteristics that ${score > 0.6 ? 'appear consistent with' : score < 0.4 ? 'appear visually different from' : 'may or may not align with'} typical profiles for this label.`;
  }
  
  // Always emphasize observational nature
  explanation += ' This is an observational comparison only, not a compliance assessment.';
  
  return {
    consistency_score: score,
    explanation,
  };
}

