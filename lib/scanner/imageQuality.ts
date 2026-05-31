// lib/scanner/imageQuality.ts

export interface ImageQualitySignal {
  imageCount: number;
  hasImages: boolean;
  containsDataUrls: boolean;
  estimatedTooSmallImageCount: number;
  unsupportedMimeCount: number;
  warnings: string[];
  qualityPenalty: number; // 0 to 1
  shouldWarnUser: boolean;
}

export const SCAN_SUPPORTED_IMAGE_MIMES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];

const TOO_SMALL_LENGTH_THRESHOLD = 20_000;

function extractMimeType(image: string): string | null {
  const match = image.match(/^data:([^;]+);/);
  return match ? match[1] : null;
}

export function assessImageQualityInputs(images: string[]): ImageQualitySignal {
  const safeImages = Array.isArray(images) ? images : [];

  const imageCount = safeImages.length;
  const hasImages = imageCount > 0;
  const containsDataUrls = safeImages.some((img) => img.startsWith("data:"));

  let estimatedTooSmallImageCount = 0;
  let unsupportedMimeCount = 0;

  for (const img of safeImages) {
    if (typeof img !== "string") {
      estimatedTooSmallImageCount += 1;
      continue;
    }

    if (img.length < TOO_SMALL_LENGTH_THRESHOLD) {
      estimatedTooSmallImageCount += 1;
    }

    const mimeType = extractMimeType(img);
    if (mimeType && !SCAN_SUPPORTED_IMAGE_MIMES.includes(mimeType)) {
      unsupportedMimeCount += 1;
    }
  }

  const warnings: string[] = [];

  if (estimatedTooSmallImageCount > 0) {
    warnings.push("Some uploaded images may be too small for reliable analysis.");
  }

  if (unsupportedMimeCount > 0) {
    warnings.push("Some uploaded images use unsupported formats and may be coerced to JPEG.");
  }

  if (imageCount < 2 && hasImages) {
    warnings.push("Multiple images can improve match confidence.");
  }

  let qualityPenalty = 0;

  if (estimatedTooSmallImageCount > 0) {
    qualityPenalty += 0.15;
  }

  if (unsupportedMimeCount > 0) {
    qualityPenalty += 0.15;
  }

  qualityPenalty = Math.min(0.5, qualityPenalty);

  return {
    imageCount,
    hasImages,
    containsDataUrls,
    estimatedTooSmallImageCount,
    unsupportedMimeCount,
    warnings,
    qualityPenalty,
    shouldWarnUser: warnings.length > 0,
  };
}
