export interface TaglineParams {
  confidencePercent: number;
  imageCount: number;
  hasDatabaseMatch: boolean;
  hasMultiImageAgreement: boolean;
}

export function generateIntelligentTagline(params: TaglineParams): string {
  const { confidencePercent, imageCount, hasDatabaseMatch, hasMultiImageAgreement } = params;

  if (confidencePercent >= 85 && hasMultiImageAgreement) {
    return "Multiple photos confirmed the same strain — high confidence result.";
  }
  if (confidencePercent >= 80 && hasDatabaseMatch) {
    return "Strong database match with consistent visual traits.";
  }
  if (confidencePercent >= 70) {
    if (imageCount > 1) {
      return "Visual analysis across multiple photos suggests a strong match.";
    }
    return "Visual traits closely match this strain profile.";
  }
  if (confidencePercent >= 55) {
    if (imageCount === 1) {
      return "Best match from available data. More photos may improve accuracy.";
    }
    return "Reasonable match based on available visual evidence.";
  }
  if (imageCount === 1) {
    return "Based on limited visual data — try uploading more photos for a better result.";
  }
  return "Visual traits are inconclusive. Consider clearer or closer photos.";
}
