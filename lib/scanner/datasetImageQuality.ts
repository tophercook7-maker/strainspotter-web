export type DatasetImageQualityInput = {
  fileName: string;
  filePath?: string | null;
  size?: number | null;
  width?: number | null;
  height?: number | null;
  source?: string | null;
  sourceConfidence?: "low" | "medium" | "high" | null;
  labelConfidence?: "low" | "medium" | "high" | null;
  duplicateFileName?: boolean;
};

export type DatasetImageQualityResult = {
  score: number;
  warnings: string[];
  qualityWarnings: string[];
  isLikelyGlossyCatalogImage: boolean;
  recommendedAction: "approve" | "review" | "reject";
};

const MIN_REVIEWABLE_BYTES = 8 * 1024;
const MIN_DIMENSION = 256;
const GLOSSY_CATALOG_TERMS = [
  "stock",
  "catalog",
  "product",
  "studio",
  "promo",
  "leafly",
  "seedfinder",
  "seedsman",
  "ilgm",
  "royal-queen",
  "royalqueen",
  "barneys",
  "fastbuds",
  "cropking",
];
const BREEDER_OR_CATALOG_SOURCES = [
  "breeder",
  "catalog",
  "seedbank",
  "seed-bank",
  "seedfinder",
  "seedsman",
  "ilgm",
  "royal-queen",
  "barneys",
  "fastbuds",
  "cropking",
  "leafly",
  "promo",
  "product",
  "studio",
];

function normalizedText(...values: Array<string | null | undefined>) {
  return values
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .replace(/[_\s]+/g, "-");
}

function hasAnyTerm(haystack: string, terms: string[]) {
  return terms.some((term) => haystack.includes(term));
}

function hasSuspiciousUniformSourceNaming(fileName: string) {
  const normalized = fileName.toLowerCase();
  return (
    /(?:^|[-_])(stock|catalog|product|promo|studio)[-_]?\d{2,}/.test(normalized) ||
    /\b(?:image|photo|bud|flower)[-_]?\d{3,}\b/.test(normalized)
  );
}

export function scoreDatasetImageQuality(
  input: DatasetImageQualityInput
): DatasetImageQualityResult {
  const warnings: string[] = [];
  let score = 100;
  const searchableText = normalizedText(input.fileName, input.filePath, input.source);
  const catalogTermFound = hasAnyTerm(searchableText, GLOSSY_CATALOG_TERMS);
  const sourceLooksCatalog = hasAnyTerm(
    normalizedText(input.source),
    BREEDER_OR_CATALOG_SOURCES
  );
  const uniformCatalogNaming = hasSuspiciousUniformSourceNaming(input.fileName);

  if (typeof input.size === "number" && input.size > 0 && input.size < MIN_REVIEWABLE_BYTES) {
    warnings.push("File is very small; it may be a thumbnail or low-detail image.");
    score -= 25;
  }

  if (
    typeof input.width === "number" &&
    typeof input.height === "number" &&
    input.width > 0 &&
    input.height > 0 &&
    (input.width < MIN_DIMENSION || input.height < MIN_DIMENSION)
  ) {
    warnings.push("Image dimensions are small for embedding training.");
    score -= 20;
  }

  if (input.duplicateFileName) {
    warnings.push("Filename already appears elsewhere in the dataset.");
    score -= 20;
  }

  if (input.sourceConfidence === "low") {
    warnings.push("Source confidence is low; review provenance before training.");
    score -= 15;
  }

  if (input.labelConfidence === "low") {
    warnings.push("Label confidence is low; do not approve for training without verification.");
    score -= 25;
  } else if (input.labelConfidence === "medium") {
    warnings.push("Label confidence is medium; prefer eval or manual verification.");
    score -= 10;
  }

  if (catalogTermFound || sourceLooksCatalog || uniformCatalogNaming) {
    warnings.push(
      "Possible glossy catalog image — review carefully before training."
    );
    score -= sourceLooksCatalog || catalogTermFound ? 35 : 20;
  }

  const isLikelyGlossyCatalogImage =
    catalogTermFound || sourceLooksCatalog || uniformCatalogNaming;
  const qualityWarnings = [...warnings];
  const recommendedAction =
    isLikelyGlossyCatalogImage || input.labelConfidence === "low"
      ? "reject"
      : warnings.length > 0
        ? "review"
        : "approve";

  return {
    score: Math.max(0, Math.min(100, score)),
    warnings,
    qualityWarnings,
    isLikelyGlossyCatalogImage,
    recommendedAction,
  };
}
