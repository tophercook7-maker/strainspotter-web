// lib/scanner/perImageFindings.ts
// Phase 4.0 Part E — Per-Image Findings Generation

import type { ImageResult } from "./consensusEngine";
import type { UserImageLabel } from "./imageLabels";
import { assignUserImageLabels } from "./imageLabels";

/**
 * Phase 4.0 Part E — Per-Image Finding
 */
export type PerImageFinding = {
  imageIndex: number;
  label: UserImageLabel;
  strainName: string;
  confidence: number;
  keyTraits: string[];
  differences?: string[];
};

/**
 * Phase 4.0 Part E — Generate per-image findings
 * Shows what each image found and how they differed/aligned
 */
export function generatePerImageFindings(
  imageResults: ImageResult[],
  primaryStrainName: string
): PerImageFinding[] {
  const findings: PerImageFinding[] = [];
  const imageLabels = assignUserImageLabels(imageResults.length);
  
  imageResults.forEach((result, idx) => {
    const topCandidate = result.candidateStrains[0];
    if (!topCandidate) return;
    
    const label = imageLabels.get(idx) || "Optional";
    const isPrimaryMatch = topCandidate.name === primaryStrainName;
    
    // Identify differences from primary match
    const differences: string[] = [];
    if (!isPrimaryMatch) {
      differences.push(`Identified as "${topCandidate.name}" instead of primary match`);
    }
    
    // Check for trait differences
    const primaryTraits = result.candidateStrains.find(c => c.name === primaryStrainName)?.traitsMatched || [];
    const candidateTraits = topCandidate.traitsMatched || [];
    const uniqueTraits = candidateTraits.filter(t => !primaryTraits.includes(t));
    if (uniqueTraits.length > 0 && !isPrimaryMatch) {
      differences.push(`Notable traits: ${uniqueTraits.slice(0, 2).join(", ")}`);
    }
    
    findings.push({
      imageIndex: idx,
      label,
      strainName: topCandidate.name,
      confidence: topCandidate.confidence,
      keyTraits: topCandidate.traitsMatched || [],
      differences: differences.length > 0 ? differences : undefined,
    });
  });
  
  return findings;
}

/**
 * Phase 4.0 Part E — Generate consensus alignment summary
 */
export function generateConsensusAlignment(
  findings: PerImageFinding[],
  primaryStrainName: string
): {
  whatAligned: string[];
  whatDiffered: string[];
} {
  const whatAligned: string[] = [];
  const whatDiffered: string[] = [];
  
  const matchingImages = findings.filter(f => f.strainName === primaryStrainName);
  const nonMatchingImages = findings.filter(f => f.strainName !== primaryStrainName);
  
  if (matchingImages.length >= 2) {
    whatAligned.push(`${matchingImages.length} out of ${findings.length} images identified "${primaryStrainName}"`);
    
    // Check for common traits across matching images
    if (matchingImages.length > 0) {
      const commonTraits = matchingImages[0].keyTraits.filter(trait =>
        matchingImages.every(img => img.keyTraits.includes(trait))
      );
      if (commonTraits.length > 0) {
        whatAligned.push(`Consistent traits: ${commonTraits.slice(0, 3).join(", ")}`);
      }
    }
  }
  
  if (nonMatchingImages.length > 0) {
    nonMatchingImages.forEach(img => {
      whatDiffered.push(`Image ${img.imageIndex + 1} (${img.label}): Found "${img.strainName}" (${img.confidence}% confidence)`);
      if (img.differences && img.differences.length > 0) {
        whatDiffered.push(`  • ${img.differences.join(", ")}`);
      }
    });
  }
  
  // Check for trait consistency
  const allTraits = findings.flatMap(f => f.keyTraits);
  const uniqueTraits = new Set(allTraits);
  if (uniqueTraits.size > allTraits.length * 0.7) {
    whatAligned.push("High trait consistency across images");
  } else if (uniqueTraits.size < allTraits.length * 0.5) {
    whatDiffered.push("Significant trait variation observed across images");
  }
  
  return { whatAligned, whatDiffered };
}
