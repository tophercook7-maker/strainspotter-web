export interface ConfidenceCopyParams {
  confidence: number;
  confidenceTier: string;
  imageCount: number;
  hasStrongVisualMatch: boolean;
  hasDatabaseMatch: boolean;
  hasMultiImageAgreement?: boolean;
}

export function getShortConfidenceCopy(params: ConfidenceCopyParams): string {
  const { confidence, confidenceTier, imageCount, hasStrongVisualMatch, hasDatabaseMatch, hasMultiImageAgreement } = params;

  if (confidenceTier === "very_high" || confidence >= 90) {
    if (hasMultiImageAgreement && imageCount > 1) {
      return "All photos point to the same strain — very strong match.";
    }
    if (hasStrongVisualMatch && hasDatabaseMatch) {
      return "Visual traits and database records align closely.";
    }
    return "Strong visual and structural match to this strain.";
  }

  if (confidenceTier === "high" || confidence >= 75) {
    if (hasStrongVisualMatch) {
      return "Clear visual markers match this strain profile.";
    }
    if (hasDatabaseMatch) {
      return "Strain characteristics match database records well.";
    }
    return "Good match with consistent visual characteristics.";
  }

  if (confidenceTier === "medium" || confidence >= 55) {
    if (imageCount === 1) {
      return "Reasonable match — adding more photos may improve accuracy.";
    }
    return "Moderate confidence — some traits align, others are ambiguous.";
  }

  if (imageCount === 1) {
    return "Limited data from a single photo. Try adding more angles.";
  }
  return "Visual traits are ambiguous — consider uploading clearer photos.";
}
