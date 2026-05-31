import { existsSync } from "node:fs";
import { copyFile, mkdir, readdir, rename, stat, writeFile } from "node:fs/promises";
import { basename, extname, join } from "node:path";
import {
  EVAL_DIR,
  GLOSSY_DIR,
  IMAGE_CANDIDATES_PATH,
  INBOX_DIR,
  METADATA_CANDIDATES_PATH,
  REAL_DIR,
  REJECTED_DIR,
  REVIEW_MANIFEST_PATH,
  REVIEW_PREFERENCES_PATH,
  SCRAPE_RUNS_PATH,
  SOURCE_ERRORS_PATH,
  appendJsonArray,
  appendScrapeEvent,
  extractImages,
  hostMatches,
  isHttpUrl,
  isSameOrigin,
  readJson,
  readRegistry,
  readScrapeStatus,
  readScrapeTargets,
  robotsAllows,
  shouldStopScrape,
  sleep,
  slugify,
  writeJson,
  writeScrapeStatus,
} from "./scrape-utils.mjs";

const STALE_RUNNING_MS = 15 * 60 * 1000;
const EXTREME_TINY_BYTES = 2 * 1024;
const HARD_JUNK_TERMS = [
  "logo",
  "icon",
  "avatar",
  "banner",
];
const BORDERLINE_TERMS = [
  "thumbnail",
  "thumb",
  "packaging",
  "label",
  "cart",
  "vape",
  "preroll",
  "product",
  "stock",
  "catalog",
  "glossy",
  "studio",
  "promo",
  "seed",
  "seeds",
];
const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const EXCLUDED_LOCAL_DIR_NAMES = new Set(["inbox", "real", "eval", "rejected", "glossy", "reviewed", "scrape", "vault-index"]);
const QUERY_PATTERNS = [
  "{strainName} cannabis strain bud",
  "{strainName} weed strain flower",
  "{strainName} marijuana strain nug",
  "{strainName} cannabis flower natural light",
  "{strainName} grower photo",
  "{strainName} strain review bud",
  "{strainName} dispensary flower",
  "{strainName} homegrown cannabis",
];
const MAX_VISIBLE_REVIEW_PER_STRAIN = 25;
const MAX_VISIBLE_REVIEW_PER_SESSION = 100;
const MAX_AUTO_TRAINING_PER_STRAIN_PER_RUN = 15;
const MAX_AUTO_EVAL_PER_STRAIN_PER_RUN = 5;
const MAX_UNCERTAIN_REVIEW_PER_RUN = 100;
const AUTO_EVAL_EVERY_N_STRONG_IMAGE = 5;
const MIN_AUTO_APPROVE_BYTES = 20 * 1024;
const MIN_REVIEWABLE_BYTES = 8 * 1024;
const GOOD_PHOTO_TERMS = [
  "bud",
  "buds",
  "flower",
  "nug",
  "nugs",
  "cola",
  "plant",
  "cannabis",
  "marijuana",
  "weed",
];
const REAL_WORLD_TERMS = [
  "grower",
  "homegrown",
  "natural-light",
  "natural",
  "review",
  "user",
  "indoor",
  "outdoor",
  "garden",
];
const HARD_REJECT_TERMS = [
  "logo",
  "icon",
  "avatar",
  "banner",
  "packaging",
  "package",
  "label",
  "cart",
  "vape",
  "preroll",
  "pre-roll",
  "seed-pack",
  "seedpack",
  "seed-packet",
];
const SOFT_REJECT_TERMS = [
  "thumbnail",
  "thumb",
  "product",
  "stock",
  "catalog",
  "glossy",
  "studio",
  "promo",
  "seed",
  "seeds",
  "seedbank",
  "seed-bank",
  "fastbuds",
  "blimburnseeds",
  "royalqueenseeds",
  "seedsman",
  "ilgm",
];

function displaySlug(value) {
  return String(value)
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function sourceStrategy(source) {
  if (source.sourceType === "local-folder" || source.type === "local-folder") return "local-folder";
  if (
    source.sourceType === "image-search-json" ||
    source.sourceType === "image-search-api" ||
    source.type === "image-search-json" ||
    source.type === "image-search-api"
  ) {
    return "image-search-json";
  }
  if (source.type === "metadata-pages") return "metadata-pages";
  if (source.type === "direct-image-list") return "direct-image-list";
  if (source.type === "rss-feed") return "rss-feed";
  if (source.type === "search-url-template" || source.searchUrlTemplate || source.search?.url) {
    return "search-url-template";
  }
  return "configured-pages";
}

function searchTemplate(source) {
  return source.endpoint || source.searchUrlTemplate || source.search?.url || "";
}

function isApiBackedSource(source) {
  const endpoint = searchTemplate(source);
  return (
    source.sourceType === "image-search-api" ||
    source.type === "image-search-api" ||
    source.provider === "brave" ||
    endpoint.startsWith("https://api.search.brave.com/")
  );
}

function queryVariations(strainSlug) {
  const strainName = displaySlug(strainSlug);
  return QUERY_PATTERNS.map((pattern) => pattern.replaceAll("{strainName}", strainName));
}

function sourceReadiness(source) {
  const strategy = sourceStrategy(source);
  const hasSeedUrls = Array.isArray(source.seedUrls) && source.seedUrls.length > 0;
  const hasDirectImages = Array.isArray(source.imageUrls) && source.imageUrls.length > 0;
  const hasLocalRoots = Array.isArray(source.localRoots) && source.localRoots.some((root) => existsSync(String(root)));
  const hasImageSelector = Boolean(source.selectors?.imageUrls || source.selectors?.image);
  const hasSearchTemplate = Boolean(searchTemplate(source));
  const hasApiKey = !source.apiKeyEnv || Boolean(process.env[source.apiKeyEnv]);
  const hasCx = !source.cxEnv || Boolean(process.env[source.cxEnv]);
  const hasLicenseNotes = Boolean(String(source.licenseNotes ?? "").trim());
  const isMarkedDisabled = String(source.licenseNotes ?? "").trim().toLowerCase().startsWith("disabled:");
  const hasRateLimit =
    strategy === "local-folder"
      ? Number.isFinite(Number(source.rateLimitMs ?? 0)) && Number(source.rateLimitMs ?? 0) >= 0
      : Number.isFinite(Number(source.rateLimitMs)) && Number(source.rateLimitMs) >= 1000;
  const issues = [];
  if (source.enabled !== true) issues.push("Source is disabled");
  if (!source.id) issues.push("Missing source id");
  if (strategy !== "local-folder" && !isHttpUrl(source.baseUrl)) issues.push("Missing valid base URL");
  if (String(source.baseUrl ?? "").includes("example.com")) issues.push("Replace example.com with a real allowed source");
  if (strategy !== "local-folder" && !isApiBackedSource(source) && source.robotsPolicy !== "respect") {
    issues.push("Robots policy must be respect");
  }
  if (!hasLicenseNotes) issues.push("Missing license notes");
  if (isMarkedDisabled) issues.push("Source license notes mark it disabled");
  if (source.enabled === true && String(source.licenseNotes ?? "").toLowerCase().includes("enable only if")) {
    issues.push("License or permission must be confirmed before enabling");
  }
  if (!hasRateLimit) issues.push(strategy === "local-folder" ? "Missing rate limit" : "Missing safe wait time");
  if (!hasImageSelector && !["direct-image-list", "local-folder", "image-search-json"].includes(strategy)) {
    issues.push("Missing image selector");
  }
  if (strategy === "local-folder" && !hasLocalRoots) issues.push("TheVault folder not found.");
  if (strategy === "configured-pages" && !hasSeedUrls) issues.push("Missing seed URLs");
  if (strategy === "rss-feed" && !hasSeedUrls) issues.push("Missing feed URLs");
  if (strategy === "search-url-template" && !hasSearchTemplate) issues.push("Missing search URL template");
  if (strategy === "image-search-json" && !hasSearchTemplate) issues.push("Missing search endpoint URL");
  if (strategy === "image-search-json" && !hasApiKey) issues.push(`Needs API key: ${source.apiKeyEnv}`);
  if (strategy === "image-search-json" && !hasCx) issues.push(`Needs search engine id: ${source.cxEnv}`);
  if (strategy === "direct-image-list" && !hasDirectImages) issues.push("Missing direct image URLs");
  return {
    strategy,
    enabled: source.enabled === true,
    hasSeedUrls,
    hasDirectImages,
    hasLocalRoots,
    hasImageSelector,
    hasSearchTemplate,
    hasApiKey,
    hasCx,
    hasLicenseNotes,
    hasRateLimit,
    ready: source.enabled === true && issues.length === 0,
    issues,
  };
}

function extensionFromUrl(imageUrl, contentType) {
  const type = String(contentType ?? "").toLowerCase();
  if (type.includes("png")) return ".png";
  if (type.includes("webp")) return ".webp";
  if (type.includes("jpeg") || type.includes("jpg")) return ".jpg";
  const extension = extname(new URL(imageUrl).pathname).toLowerCase();
  if ([".jpg", ".jpeg", ".png", ".webp"].includes(extension)) return extension;
  return ".jpg";
}

function imageLooksJunk(imageUrl) {
  const text = decodeURIComponent(String(imageUrl)).toLowerCase();
  const hardTerm = HARD_JUNK_TERMS.find((value) => text.includes(value));
  if (hardTerm) return { action: "reject", reason: hardTerm };
  const borderlineTerm = BORDERLINE_TERMS.find((value) => text.includes(value));
  if (borderlineTerm) return { action: "review", reason: borderlineTerm };
  return null;
}

function isImageFile(fileName) {
  return IMAGE_EXTENSIONS.has(extname(fileName).toLowerCase());
}

function pathMatchesStrain(filePath, strainSlug) {
  const normalizedPath = slugify(filePath);
  const displayWords = slugify(displaySlug(strainSlug));
  return normalizedPath.includes(strainSlug) || normalizedPath.includes(displayWords);
}

function dedupeCandidates(candidates) {
  const byKey = new Map();
  for (const candidate of candidates) {
    byKey.set(`${candidate.strainSlug}::${candidate.sourceId}::${candidate.imageUrl}`, candidate);
  }
  return [...byKey.values()].sort((a, b) => String(a.strainSlug).localeCompare(String(b.strainSlug)));
}

function nextImageNumber(candidates, strainSlug, sourceId) {
  return candidates.filter((item) => item.strainSlug === strainSlug && item.sourceId === sourceId).length + 1;
}

function candidateFilePath(candidate) {
  if (typeof candidate?.filePath === "string" && candidate.filePath) return candidate.filePath;
  const fileName = String(candidate?.fileName ?? "").trim();
  return fileName ? join(INBOX_DIR, fileName) : null;
}

function candidateHasExistingFile(candidate) {
  const filePath = candidateFilePath(candidate);
  return Boolean(filePath && existsSync(filePath));
}

function strainStats(run, strainSlug) {
  run.byStrain[strainSlug] ??= {
    found: 0,
    attempted: 0,
    downloaded: 0,
    sentToReview: 0,
    autoTraining: 0,
    autoEval: 0,
    setAside: 0,
    skipped: 0,
    rejected: 0,
  };
  return run.byStrain[strainSlug];
}

function queryStats(run, query) {
  const key = query || "unknown query";
  run.byQuery[key] ??= {
    found: 0,
    downloaded: 0,
    sentToReview: 0,
    autoTraining: 0,
    autoEval: 0,
    setAside: 0,
    duplicates: 0,
  };
  return run.byQuery[key];
}

function reasonBucket(reason) {
  const text = String(reason ?? "").toLowerCase();
  if (text.includes("tiny")) return "tiny file";
  if (text.includes("content") || text.includes("not an image")) return "bad content type";
  if (text.includes("duplicate")) return "duplicate";
  if (text.includes("packaging") || text.includes("label")) return "packaging";
  if (text.includes("catalog") || text.includes("glossy") || text.includes("studio") || text.includes("product") || text.includes("stock") || text.includes("promo")) {
    return "catalog/glossy";
  }
  if (text.includes("thumbnail") || text.includes("thumb")) return "thumbnail";
  if (text.includes("robots") || text.includes("blocked")) return "URL blocked";
  if (text.includes("download") || text.includes("failed")) return "download failed";
  return "unknown";
}

function addRejection(run, reason) {
  const bucket = reasonBucket(reason);
  run.rejectionReasons[bucket] = (run.rejectionReasons[bucket] ?? 0) + 1;
}

function warningsForBorderline(signal, filterMode) {
  if (!signal || signal.action !== "review" || filterMode === "strict") return [];
  return [`Possible ${reasonBucket(signal.reason)} image. Review before using.`];
}

function shouldHardRejectSignal(signal, filterMode) {
  if (!signal) return false;
  return filterMode === "strict";
}

function normalizedSearchText(...values) {
  return values
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .replace(/[_\s]+/g, "-");
}

function hasAnyTerm(text, terms) {
  return terms.some((term) => text.includes(term));
}

function targetInText(text, strainSlug) {
  const normalizedStrain = slugify(strainSlug);
  const displayWords = slugify(displaySlug(strainSlug));
  return text.includes(normalizedStrain) || text.includes(displayWords);
}

function normalizeReviewMode(value) {
  return ["manual-review", "auto-sort", "auto-sort-safe"].includes(String(value))
    ? String(value)
    : "auto-sort-safe";
}

function isAutoSortMode(reviewMode) {
  return reviewMode === "auto-sort" || reviewMode === "auto-sort-safe";
}

async function countImagesInDir(directory) {
  if (!existsSync(directory)) return 0;
  const entries = await readdir(directory, { withFileTypes: true });
  return entries.filter((entry) => entry.isFile() && IMAGE_EXTENSIONS.has(extname(entry.name).toLowerCase())).length;
}

async function existingDatasetCounts(strainSlugs) {
  const counts = {};
  for (const strainSlug of strainSlugs) {
    counts[strainSlug] = {
      training: await countImagesInDir(join(REAL_DIR, strainSlug)),
      eval: await countImagesInDir(join(EVAL_DIR, strainSlug)),
    };
  }
  return counts;
}

function learnedReviewSignals(candidates, reviewManifest) {
  const rejectedNames = new Set();
  const manifestItems = Array.isArray(reviewManifest?.items) ? reviewManifest.items : [];
  for (const item of manifestItems) {
    if (item?.rejectReason) rejectedNames.add(String(item.fileName ?? ""));
  }

  const learnedTerms = new Set();
  for (const candidate of candidates) {
    const rejectedByUser = rejectedNames.has(String(candidate?.fileName ?? ""));
    const rejectedByCandidate =
      candidate?.selectedAction === "reject" ||
      candidate?.reviewStatus === "reject" ||
      String(candidate?.rejectReason ?? "").toLowerCase().includes("user chose");
    if (!rejectedByUser && !rejectedByCandidate) continue;

    const text = normalizedSearchText(candidate?.fileName, candidate?.imageUrl, candidate?.sourceUrl, candidate?.queryUsed);
    for (const term of [...HARD_REJECT_TERMS, ...SOFT_REJECT_TERMS]) {
      if (text.includes(term)) learnedTerms.add(term);
    }
  }

  return { learnedTerms };
}

function preferenceSignalWeight(preferences, bucketName, key) {
  const bucket = preferences?.[bucketName];
  return Number(bucket?.[key]?.weight ?? 0);
}

function applyLearnedPreferences({ preferences, searchableText, row, fileName, warnings, reasons }) {
  if (!preferences || typeof preferences !== "object") return 0;
  let delta = 0;
  const sourceId = row?.sourceId;
  const strainSlug = row?.strainSlug;
  const extension = extname(fileName).toLowerCase();
  const signalKeys = [
    sourceId ? `source:${sourceId}` : null,
    strainSlug ? `strain:${strainSlug}` : null,
    extension ? `extension:${extension}` : null,
    row?.queryUsed ? `query:${row.queryUsed}` : null,
  ].filter(Boolean);

  for (const keyword of [...GOOD_PHOTO_TERMS, ...REAL_WORLD_TERMS, ...HARD_REJECT_TERMS, ...SOFT_REJECT_TERMS]) {
    if (searchableText.includes(keyword)) signalKeys.push(`keyword:${keyword}`);
  }

  for (const key of signalKeys) {
    const approved = preferenceSignalWeight(preferences, "approvedSignals", key);
    const rejected = preferenceSignalWeight(preferences, "rejectedSignals", key);
    const keyword = key.startsWith("keyword:") ? key.replace(/^keyword:/, "") : "";
    const neverBoost = keyword && (HARD_REJECT_TERMS.includes(keyword) || SOFT_REJECT_TERMS.includes(keyword));
    if (approved > rejected && !neverBoost) {
      const boost = Math.min(14, Math.ceil((approved - rejected) / 2));
      delta += boost;
      reasons.push(`learned approval signal: ${key.replace(/^[^:]+:/, "")}`);
    } else if (rejected > approved) {
      const penalty = Math.min(18, Math.ceil((rejected - approved) / 2));
      delta -= penalty;
      warnings.push(`Learned lower-priority signal: ${key.replace(/^[^:]+:/, "")}.`);
    }
  }

  const sourceWeight = Number(preferences.sourceScores?.[sourceId]?.weight ?? 0);
  if (sourceWeight > 0) {
    const boost = Math.min(10, sourceWeight);
    delta += boost;
    reasons.push("trusted source from prior reviews");
  } else if (sourceWeight < 0) {
    const penalty = Math.min(12, Math.abs(sourceWeight));
    delta -= penalty;
    warnings.push("Source has been rejected more often than approved.");
  }
  return delta;
}

function scorePhotoCandidate({ row, fileName, filePath, size, learnedSignals, preferences, duplicate = false }) {
  const searchableText = normalizedSearchText(
    row?.strainSlug,
    row?.sourceId,
    row?.sourceUrl,
    row?.imageUrl,
    row?.queryUsed,
    fileName,
    filePath
  );
  const warnings = [];
  const reasons = [];
  let score = 50;

  if (targetInText(searchableText, row?.strainSlug)) {
    score += 14;
    reasons.push("target strain appears in URL/file/query");
  } else {
    score -= 18;
    warnings.push("Target strain is not obvious in the URL or filename.");
  }

  if (hasAnyTerm(searchableText, GOOD_PHOTO_TERMS)) {
    score += 18;
    reasons.push("bud/flower/plant language");
  }
  if (hasAnyTerm(searchableText, REAL_WORLD_TERMS)) {
    score += 12;
    reasons.push("natural grower/user-looking language");
  }
  if (typeof size === "number" && size >= 120 * 1024) {
    score += 12;
    reasons.push("decent file size");
  } else if (typeof size === "number" && size >= 40 * 1024) {
    score += 6;
    reasons.push("usable file size");
  }

  const hasHardRejectTerm = hasAnyTerm(searchableText, HARD_REJECT_TERMS);
  const hasSoftRejectTerm = hasAnyTerm(searchableText, SOFT_REJECT_TERMS);
  if (hasHardRejectTerm) {
    score -= 75;
    warnings.push("Looks like packaging, logo, banner, vape/cart, preroll, or seed-pack junk.");
  }
  if (hasSoftRejectTerm) {
    score -= 35;
    warnings.push("Looks like glossy/catalog/product/seedbank content.");
  }
  for (const term of learnedSignals.learnedTerms ?? []) {
    if (searchableText.includes(term)) {
      score -= 20;
      warnings.push(`Similar to photos Topher previously rejected (${term}).`);
    }
  }
  if (duplicate) {
    score -= 80;
    warnings.push("Obvious duplicate.");
  }
  if (typeof size === "number" && size < MIN_REVIEWABLE_BYTES) {
    score -= 80;
    warnings.push("Tiny or thumbnail-looking file.");
  } else if (typeof size === "number" && size < 20 * 1024) {
    score -= 30;
    warnings.push("Small file; check for blurry or thumbnail-looking junk.");
  }
  if (!hasAnyTerm(searchableText, ["logo", "icon", "avatar", "banner"])) {
    score += 4;
  }
  score += applyLearnedPreferences({ preferences, searchableText, row, fileName, warnings, reasons });

  const normalizedScore = Math.max(0, Math.min(100, score));
  const obviousJunk = duplicate || hasHardRejectTerm || (typeof size === "number" && size < MIN_REVIEWABLE_BYTES);
  const recommendedAction = obviousJunk ? "reject" : normalizedScore < 45 ? "set-aside" : "review";
  const reviewPriority = normalizedScore >= 82 ? "high" : normalizedScore >= 62 ? "medium" : "low";
  const qualityWarnings =
    recommendedAction === "review" && reviewPriority !== "high"
      ? [...warnings, "Check carefully before using."]
      : warnings;

  return {
    score: normalizedScore,
    reasons,
    warnings,
    qualityWarnings,
    isLikelyGlossyCatalogImage: hasHardRejectTerm || hasSoftRejectTerm,
    recommendedAction,
    reviewPriority,
  };
}

function visibleReviewLimitReached(reviewCountsByStrain, totalVisibleReview, strainSlug) {
  return (
    (reviewCountsByStrain.get(strainSlug) ?? 0) >= MAX_VISIBLE_REVIEW_PER_STRAIN ||
    totalVisibleReview.count >= MAX_VISIBLE_REVIEW_PER_SESSION
  );
}

function candidateReviewState(score, reviewCountsByStrain, totalVisibleReview, strainSlug) {
  if (score.recommendedAction === "reject") {
    return {
      reviewStatus: "auto-rejected",
      recommendedAction: "reject",
      reviewPriority: "low",
      rejectReason: score.qualityWarnings[0] ?? "Topher-style filter rejected this image.",
    };
  }
  if (score.recommendedAction === "set-aside" || visibleReviewLimitReached(reviewCountsByStrain, totalVisibleReview, strainSlug)) {
    return {
      reviewStatus: "set-aside",
      recommendedAction: "set-aside",
      reviewPriority: score.reviewPriority,
      rejectReason: "Lower-priority candidate set aside by Topher-style filter.",
    };
  }
  reviewCountsByStrain.set(strainSlug, (reviewCountsByStrain.get(strainSlug) ?? 0) + 1);
  totalVisibleReview.count += 1;
  return {
    reviewStatus: "pending",
    recommendedAction: "review",
    reviewPriority: score.reviewPriority,
    rejectReason: undefined,
  };
}

function hasHardJunkWarning(warnings = []) {
  return warnings.some((warning) => {
    const text = String(warning ?? "").toLowerCase();
    return (
      text.includes("packaging") ||
      text.includes("logo") ||
      text.includes("icon") ||
      text.includes("avatar") ||
      text.includes("banner") ||
      text.includes("seed-pack") ||
      text.includes("seed pack") ||
      text.includes("duplicate") ||
      text.includes("tiny") ||
      text.includes("bad content") ||
      text.includes("not an image") ||
      text.includes("download failed") ||
      text.includes("rejected")
    );
  });
}

function sourceTrust(preferences, sourceId) {
  return Number(preferences?.sourceScores?.[sourceId]?.weight ?? 0);
}

function autoDecisionForCandidate({
  score,
  row,
  size,
  reviewMode,
  reviewCountsByStrain,
  totalVisibleReview,
  autoCountsByStrain,
  datasetCounts,
  preferences,
}) {
  const strainSlug = row?.strainSlug;
  const searchableText = normalizedSearchText(row?.strainSlug, row?.sourceId, row?.sourceUrl, row?.imageUrl, row?.queryUsed, row?.fileName, row?.filePath);
  const sourceWeight = sourceTrust(preferences, row?.sourceId);
  const strict = reviewMode === "auto-sort-safe";
  const scoreForTraining = strict ? 92 : 84;
  const scoreForEval = strict ? 88 : 80;
  const sourceIsTrustedOrNeutral = sourceWeight >= 0;
  const sourceIsUnknown = sourceWeight === 0;
  const hardJunk =
    hasHardJunkWarning(score.qualityWarnings) ||
    hasAnyTerm(searchableText, HARD_REJECT_TERMS) ||
    (typeof size === "number" && size < MIN_REVIEWABLE_BYTES);
  const clearTarget = Boolean(strainSlug) && targetInText(searchableText, strainSlug);

  if (score.recommendedAction === "reject" || hardJunk) {
    return {
      reviewStatus: "auto-rejected",
      recommendedAction: "reject",
      reviewPriority: "low",
      autoDecision: "reject",
      autoDecisionReason: score.qualityWarnings[0] ?? "Obvious junk rejected by auto-sort.",
      autoDecisionConfidence: Math.max(0, Math.min(100, 100 - score.score)),
    };
  }

  const safeEnoughToApprove =
    clearTarget &&
    score.score >= scoreForEval &&
    !hardJunk &&
    typeof size === "number" &&
    size >= MIN_AUTO_APPROVE_BYTES &&
    sourceIsTrustedOrNeutral &&
    (!sourceIsUnknown || score.score >= (strict ? 96 : 90));

  const autoCounts = autoCountsByStrain.get(strainSlug) ?? { training: 0, eval: 0, strong: 0 };
  const existingCounts = datasetCounts[strainSlug] ?? { training: 0, eval: 0 };
  const shouldEval =
    safeEnoughToApprove &&
    score.score >= scoreForEval &&
    autoCounts.eval < MAX_AUTO_EVAL_PER_STRAIN_PER_RUN &&
    (
      existingCounts.training + autoCounts.training >= MAX_AUTO_TRAINING_PER_STRAIN_PER_RUN ||
      (autoCounts.strong + 1) % AUTO_EVAL_EVERY_N_STRONG_IMAGE === 0
    );

  if (shouldEval) {
    autoCounts.eval += 1;
    autoCounts.strong += 1;
    autoCountsByStrain.set(strainSlug, autoCounts);
    return {
      reviewStatus: "auto-eval",
      recommendedAction: "eval",
      reviewPriority: score.reviewPriority,
      autoDecision: "eval",
      autoDecisionReason: "Strong candidate saved as a test photo by auto-sort.",
      autoDecisionConfidence: score.score,
    };
  }

  if (
    safeEnoughToApprove &&
    score.score >= scoreForTraining &&
    existingCounts.training + autoCounts.training < MAX_AUTO_TRAINING_PER_STRAIN_PER_RUN &&
    autoCounts.training < MAX_AUTO_TRAINING_PER_STRAIN_PER_RUN
  ) {
    autoCounts.training += 1;
    autoCounts.strong += 1;
    autoCountsByStrain.set(strainSlug, autoCounts);
    return {
      reviewStatus: "auto-training",
      recommendedAction: "training",
      reviewPriority: score.reviewPriority,
      autoDecision: "training",
      autoDecisionReason: "Very strong candidate added to scanner training by auto-sort.",
      autoDecisionConfidence: score.score,
    };
  }

  if (totalVisibleReview.count < MAX_UNCERTAIN_REVIEW_PER_RUN && !visibleReviewLimitReached(reviewCountsByStrain, totalVisibleReview, strainSlug)) {
    reviewCountsByStrain.set(strainSlug, (reviewCountsByStrain.get(strainSlug) ?? 0) + 1);
    totalVisibleReview.count += 1;
    return {
      reviewStatus: "pending",
      recommendedAction: "review",
      reviewPriority: score.reviewPriority,
      autoDecision: "review",
      autoDecisionReason: "Uncertain candidate kept for optional review.",
      autoDecisionConfidence: score.score,
    };
  }

  return {
    reviewStatus: "set-aside",
    recommendedAction: "set-aside",
    reviewPriority: score.reviewPriority,
    autoDecision: "review",
    autoDecisionReason: "Uncertain candidate stored but hidden because the optional review queue is full.",
    autoDecisionConfidence: score.score,
    rejectReason: "Optional review queue is full.",
  };
}

function sanitizeUrlForLog(value) {
  try {
    const url = new URL(String(value).replace(/^local:/, "file:"));
    for (const key of [...url.searchParams.keys()]) {
      if (/key|token|api|subscription|secret|auth/i.test(key)) {
        url.searchParams.set(key, "[redacted]");
      }
    }
    return url.toString().replace(/\/Users\/[^/]+/g, "/Users/[user]").replace(/\/Volumes\/[^/]+/g, "/Volumes/[vault]");
  } catch {
    return String(value).replace(/\/Users\/[^/]+/g, "/Users/[user]").replace(/\/Volumes\/[^/]+/g, "/Volumes/[vault]");
  }
}

function debugLog(message) {
  console.log(`[scrape-debug] ${message}`);
}

function logRejected(reason) {
  debugLog(`Rejected: ${reason}`);
}

function logStrainSummary(run, strainSlug) {
  const row = run.byStrain[strainSlug] ?? { found: 0, attempted: 0, downloaded: 0, rejected: 0 };
  debugLog(
    `Summary for ${strainSlug}: image URLs found=${row.found}, attempted downloads=${row.attempted ?? 0}, saved to inbox=${row.downloaded}, shown for review=${row.sentToReview ?? 0}, set aside=${row.setAside ?? 0}, rejected=${row.rejected}, top rejection reasons=${JSON.stringify(run.rejectionReasons)}`
  );
}

function logQuerySummary(run) {
  debugLog("Query summary:");
  for (const [query, row] of Object.entries(run.byQuery)) {
    debugLog(`- ${query}: found=${row.found}, downloaded=${row.downloaded}, duplicates=${row.duplicates}`);
  }
}

async function fetchText(url, source) {
  if (!(await robotsAllows(url, source))) {
    throw new Error(`Robots.txt does not allow ${url}`);
  }
  await sleep(Math.max(Number(source.rateLimitMs ?? 3000), 1000));
  const response = await fetch(url, {
    headers: { "User-Agent": "StrainSpotterDataEngine/2.0" },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) {
    throw new Error(`Page returned ${response.status}: ${url}`);
  }
  return response.text();
}

function headersForSource(source) {
  const headers = { "User-Agent": "StrainSpotterDataEngine/2.0", Accept: "application/json" };
  const apiKey = source.apiKeyEnv ? process.env[source.apiKeyEnv] : "";
  const cx = source.cxEnv ? process.env[source.cxEnv] : "";
  for (const [key, value] of Object.entries(source.headers ?? {})) {
    headers[key] = String(value).replaceAll("{apiKey}", apiKey).replaceAll("{cx}", cx);
  }
  return headers;
}

async function fetchJsonImageUrls(url, source) {
  if (!isApiBackedSource(source) && !(await robotsAllows(url, source))) {
    throw new Error(`Robots.txt does not allow ${url}`);
  }
  await sleep(Math.max(Number(source.rateLimitMs ?? 3000), 1000));
  const apiKey = source.apiKeyEnv ? process.env[source.apiKeyEnv] : "";
  const cx = source.cxEnv ? process.env[source.cxEnv] : "";
  const response = await fetch(url.replaceAll("{apiKey}", apiKey).replaceAll("{cx}", cx), {
    headers: headersForSource(source),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`Search endpoint returned ${response.status}: ${url}`);
  const text = await response.text();
  const urls = new Set();
  try {
    collectImageUrls(JSON.parse(text), urls);
  } catch {
    collectImageUrls(text, urls);
  }
  return [...urls];
}

function collectImageUrls(value, urls) {
  if (typeof value === "string") {
    const urlPattern = /https?:\/\/[^\s"'<>\\]+?\.(?:jpg|jpeg|png|webp)(?:\?[^\s"'<>\\]*)?/gi;
    let match;
    while ((match = urlPattern.exec(value))) urls.add(match[0]);
    if (isHttpUrl(value) && /\.(jpg|jpeg|png|webp)(?:[?#]|$)/i.test(value)) urls.add(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectImageUrls(item, urls);
    return;
  }
  if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      const lowerKey = key.toLowerCase();
      if (
        typeof item === "string" &&
        isHttpUrl(item) &&
        (lowerKey.includes("image") || lowerKey.includes("thumbnail") || lowerKey === "src" || lowerKey === "url")
      ) {
        urls.add(item);
      }
      collectImageUrls(item, urls);
    }
  }
}

async function downloadImage(imageUrl, source) {
  if (!isApiBackedSource(source) && !(await robotsAllows(imageUrl, source))) {
    return { ok: false, rejectReason: "Robots.txt does not allow this image" };
  }
  await sleep(Math.max(Number(source.rateLimitMs ?? 3000), 1000));
  let response;
  try {
    response = await fetch(imageUrl, {
      headers: { "User-Agent": "StrainSpotterDataEngine/2.0" },
      signal: AbortSignal.timeout(20000),
    });
  } catch (error) {
    return {
      ok: false,
      rejectReason: `download failed: ${error instanceof Error ? error.message : String(error)}`,
      contentType: "",
      size: 0,
    };
  }
  const contentType = response.headers.get("content-type") ?? "";
  if (!response.ok) return { ok: false, rejectReason: `download failed (${response.status})`, contentType, size: 0 };
  if (!contentType.toLowerCase().startsWith("image/")) {
    return { ok: false, rejectReason: "not image", contentType, size: 0 };
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  return { ok: true, buffer, contentType, size: buffer.length };
}

function candidatePagesForSource({ source, strainSlug, metadataCandidates }) {
  const strategy = sourceStrategy(source);
  const pages = [];
  const seenPageUrls = new Set();
  function addPage(url, query) {
    if (!url || seenPageUrls.has(url)) return;
    seenPageUrls.add(url);
    pages.push({ url, query });
  }
  if (strategy === "metadata-pages") {
    for (const item of metadataCandidates) {
      if (item.sourceId === source.id && slugify(item.slug || item.name) === strainSlug && item.sourceUrl) {
        addPage(item.sourceUrl, item.name || displaySlug(strainSlug));
      }
    }
    return pages;
  }
  if (strategy === "direct-image-list") {
    return [{ url: `direct-image-list:${source.id}:${strainSlug}`, query: displaySlug(strainSlug) }];
  }
  if (strategy === "local-folder") {
    return [{ url: `local-folder:${source.id}:${strainSlug}`, query: "local folder" }];
  }
  if (strategy === "search-url-template") {
    for (const query of queryVariations(strainSlug)) {
      addPage(searchTemplate(source).replaceAll("{query}", encodeURIComponent(query)).replaceAll("{strain}", strainSlug), query);
    }
    return pages;
  }
  if (strategy === "image-search-json") {
    for (const query of queryVariations(strainSlug)) {
      addPage(searchTemplate(source).replaceAll("{query}", encodeURIComponent(query)).replaceAll("{strain}", strainSlug), query);
    }
    return pages;
  }
  for (const seedUrl of source.seedUrls ?? []) {
    addPage(String(seedUrl).replaceAll("{strain}", strainSlug), displaySlug(strainSlug));
  }
  return pages;
}

async function walkLocalImages(root, strainSlug, limit = 200) {
  const results = [];
  async function walk(current) {
    if (results.length >= limit) return;
    let entries = [];
    try {
      entries = await readdir(current, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (results.length >= limit) return;
      if (entry.name.startsWith(".")) continue;
      const fullPath = join(current, entry.name);
      if (entry.isDirectory()) {
        if (EXCLUDED_LOCAL_DIR_NAMES.has(entry.name.toLowerCase())) continue;
        await walk(fullPath);
        continue;
      }
      if (!entry.isFile() || !isImageFile(entry.name)) continue;
      if (pathMatchesStrain(fullPath, strainSlug)) results.push(fullPath);
    }
  }
  await walk(root);
  return results;
}

async function localImagesForSource(source, strainSlug) {
  const roots = (Array.isArray(source.localRoots) ? source.localRoots : []).map(String).filter((root) => existsSync(root));
  const rows = [];
  for (const root of roots) rows.push(...(await walkLocalImages(root, strainSlug, Number(source.maxLocalFilesPerStrain ?? 200))));
  return Array.from(new Set(rows));
}

function directImagesForSource(source, strainSlug) {
  return (Array.isArray(source.imageUrls) ? source.imageUrls : [])
    .map((imageUrl) => String(imageUrl).replaceAll("{strain}", strainSlug))
    .filter(isHttpUrl);
}

function extractFeedImages(xml, pageUrl) {
  const images = new Set();
  const patterns = [
    /<enclosure\b[^>]*url=["']([^"']+)["'][^>]*(?:type=["']image\/[^"']+["'])?[^>]*>/gi,
    /<media:content\b[^>]*url=["']([^"']+)["'][^>]*>/gi,
    /<media:thumbnail\b[^>]*url=["']([^"']+)["'][^>]*>/gi,
  ];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(xml))) {
      try {
        images.add(new URL(match[1], pageUrl).toString());
      } catch {
        // Skip malformed URLs.
      }
    }
  }
  for (const imageUrl of extractImages(xml, pageUrl, "img")) images.add(imageUrl);
  return [...images];
}

function imageHostAllowed(imageUrl, source) {
  if (sourceStrategy(source) === "image-search-json") return true;
  if (source.allowExternalImages === true) return true;
  if (Array.isArray(source.allowedImageHosts) && hostMatches(imageUrl, source.allowedImageHosts)) return true;
  return isSameOrigin(imageUrl, source.baseUrl);
}

async function recordRejectedCandidate(candidates, row, rejectReason) {
  candidates.push({
    ...row,
    downloadedAt: new Date().toISOString(),
    reviewStatus: "pending",
    recommendedAction: "reject",
    autoDecision: "reject",
    autoDecisionReason: rejectReason,
    autoDecisionConfidence: 100,
    rejectReason,
    quality: {
      score: 0,
      warnings: [rejectReason],
      qualityWarnings: [rejectReason],
      isLikelyGlossyCatalogImage: true,
      recommendedAction: "reject",
    },
  });
}

async function uniqueDestinationPath(directory, fileName) {
  await mkdir(directory, { recursive: true });
  let destinationPath = join(directory, fileName);
  if (!existsSync(destinationPath)) return destinationPath;
  const extension = extname(fileName);
  const stem = fileName.slice(0, extension ? -extension.length : undefined);
  let index = 1;
  do {
    destinationPath = join(directory, `${stem}-dup-${index}${extension}`);
    index += 1;
  } while (existsSync(destinationPath));
  return destinationPath;
}

function autoDestinationDir(candidate, score) {
  if (candidate.autoDecision === "training") return join(REAL_DIR, candidate.strainSlug);
  if (candidate.autoDecision === "eval") return join(EVAL_DIR, candidate.strainSlug);
  if (candidate.autoDecision === "reject") {
    return score.isLikelyGlossyCatalogImage ? GLOSSY_DIR : REJECTED_DIR;
  }
  return null;
}

async function moveAutoSortedFile(filePath, candidate, score) {
  const destinationDir = autoDestinationDir(candidate, score);
  if (!destinationDir) return filePath;
  const destinationPath = await uniqueDestinationPath(destinationDir, candidate.fileName);
  await rename(filePath, destinationPath);
  return destinationPath;
}

function manifestItemForCandidate(candidate) {
  if (!candidate.fileName || !candidate.autoDecision || candidate.autoDecision === "review") return null;
  return {
    fileName: candidate.fileName,
    filePath: candidate.filePath,
    strainSlug: candidate.strainSlug,
    sourceId: candidate.sourceId,
    queryUsed: candidate.queryUsed,
    approvedForTraining: candidate.autoDecision === "training",
    approvedForEval: candidate.autoDecision === "eval",
    rejectReason: candidate.autoDecision === "reject" ? candidate.autoDecisionReason ?? candidate.rejectReason ?? "Auto-sort rejected this photo" : undefined,
    reviewedAt: candidate.downloadedAt,
    autoDecision: candidate.autoDecision,
    autoDecisionReason: candidate.autoDecisionReason,
    autoDecisionConfidence: candidate.autoDecisionConfidence,
  };
}

function upsertManifestItems(manifest, autoItems) {
  const items = Array.isArray(manifest?.items) ? [...manifest.items] : [];
  for (const item of autoItems) {
    const index = items.findIndex((existing) => existing?.fileName === item.fileName);
    if (index === -1) items.push(item);
    else items[index] = { ...items[index], ...item };
  }
  return { ...manifest, items };
}

async function finalizeCandidate({
  candidates,
  autoManifestItems,
  baseCandidate,
  fileName,
  filePath,
  originalFileName,
  score,
  reviewState,
  qualityWarnings,
  size,
  autoSortEnabled,
}) {
  const downloadedAt = new Date().toISOString();
  const candidate = {
    ...baseCandidate,
    fileName,
    originalFileName,
    downloadedAt,
    reviewStatus: reviewState.reviewStatus,
    recommendedAction: reviewState.recommendedAction,
    reviewPriority: reviewState.reviewPriority,
    learnedScore: score.score,
    learnedReasons: score.reasons,
    autoDecision: reviewState.autoDecision ?? "review",
    autoDecisionReason: reviewState.autoDecisionReason,
    autoDecisionConfidence: reviewState.autoDecisionConfidence ?? score.score,
    rejectReason: reviewState.rejectReason,
    needsHumanReview: reviewState.autoDecision === "review" && qualityWarnings.length > 0,
    qualityWarnings,
    quality: {
      score: score.score,
      learnedScore: score.score,
      reviewPriority: reviewState.reviewPriority,
      reasons: score.reasons,
      learnedReasons: score.reasons,
      warnings: qualityWarnings,
      qualityWarnings,
      isLikelyGlossyCatalogImage: score.isLikelyGlossyCatalogImage,
      recommendedAction: reviewState.recommendedAction,
      size,
    },
  };
  const finalPath = autoSortEnabled ? await moveAutoSortedFile(filePath, candidate, score) : filePath;
  candidate.filePath = finalPath;
  candidates.push(candidate);
  const manifestItem = autoSortEnabled ? manifestItemForCandidate(candidate) : null;
  if (manifestItem) autoManifestItems.push(manifestItem);
  return candidate;
}

async function recoverStaleStatus() {
  const status = await readScrapeStatus();
  if (status.stopRequested === true && status.running !== true) {
    await writeScrapeStatus({
      stopRequested: false,
      lastAction: "auto-reset-stop",
      stoppedAt: new Date().toISOString(),
    });
    await appendScrapeEvent("Cleared old stop request");
    return;
  }
  if (status.running !== true) return;
  const started = status.startedAt ? new Date(status.startedAt).getTime() : 0;
  if (!started || Date.now() - started > STALE_RUNNING_MS) {
    await writeScrapeStatus({
      running: false,
      stopRequested: false,
      currentSource: null,
      currentStrain: null,
      lastAction: "auto-reset-stale-run",
      stoppedAt: new Date().toISOString(),
      lastError: "Recovered stale scraper state older than 15 minutes.",
    });
    await appendScrapeEvent("Recovered stale scraper state");
  }
}

async function main() {
  await recoverStaleStatus();
  await mkdir(INBOX_DIR, { recursive: true });

  const targets = await readScrapeTargets();
  const selectedStrains = Array.from(new Set((targets.selectedStrains ?? []).map(slugify).filter(Boolean)));
  const reviewMode = normalizeReviewMode(targets.reviewMode);
  const autoSortEnabled = isAutoSortMode(reviewMode);
  const filterMode = targets.filterMode === "strict" ? "strict" : "review-borderline";
  const maxImagesPerStrain = Math.max(1, Number(targets.maxImagesPerStrain ?? 25));
  const maxPagesPerRun = Math.max(1, Number(targets.maxPagesPerRun ?? 100));
  const registry = await readRegistry();
  const sourceReports = registry.sources.map((source) => ({ source, readiness: sourceReadiness(source) }));
  const readySources = sourceReports.filter((row) => row.readiness.ready);
  const existingCandidates = await readJson(IMAGE_CANDIDATES_PATH, []);
  const metadataCandidatesRaw = await readJson(METADATA_CANDIDATES_PATH, []);
  const reviewManifest = await readJson(REVIEW_MANIFEST_PATH, { items: [] });
  const reviewPreferences = await readJson(REVIEW_PREFERENCES_PATH, null);
  const datasetCounts = await existingDatasetCounts(selectedStrains);
  const metadataCandidates = Array.isArray(metadataCandidatesRaw) ? metadataCandidatesRaw : [];
  const candidates = Array.isArray(existingCandidates) ? existingCandidates : [];
  const learnedSignals = learnedReviewSignals(candidates, reviewManifest);
  const autoManifestItems = [];
  const errors = [];
  const startedAt = new Date().toISOString();
  const run = {
    type: "photos",
    startedAt,
    targetStrains: selectedStrains,
    totalSources: registry.sources.length,
    readySources: readySources.length,
    pagesFetched: 0,
    imageUrlsFound: 0,
    attemptedDownloads: 0,
    imagesDownloaded: 0,
    sentToReview: 0,
    autoTraining: 0,
    autoEval: 0,
    autoRejected: 0,
    autoReview: 0,
    autoSetAside: 0,
    bestReviewCandidates: 0,
    skippedImages: 0,
    rejectedImages: 0,
    rejectionReasons: {},
    candidatesAdded: 0,
    errors: 0,
    byStrain: {},
    byQuery: {},
    filterMode,
    reviewMode,
  };

  await writeScrapeStatus({
    running: true,
    startedAt,
    stoppedAt: null,
    lastAction: "photos",
    currentSource: null,
    currentStrain: null,
    processedPages: 0,
    downloadedImages: 0,
    imageUrlsFound: 0,
    attemptedDownloads: 0,
    sentToReview: 0,
    autoTraining: 0,
    autoEval: 0,
    autoRejected: 0,
    autoReview: 0,
    autoSetAside: 0,
    bestReviewCandidates: 0,
    imagesSkipped: 0,
    skippedImages: 0,
    rejectedImages: 0,
    rejectionReasons: {},
    byQuery: {},
    filterMode,
    reviewMode,
    readySources: readySources.length,
    totalSources: registry.sources.length,
    errors: [],
    lastError: null,
    stopRequested: false,
    log: [],
    recentEvents: [],
  });
  await appendScrapeEvent("Started photo scrape");
  await appendScrapeEvent(`Ready sources: ${readySources.length} of ${registry.sources.length}`);

  console.log(`Saving images to: ${INBOX_DIR}`);
  console.log(`Ready photo sources: ${readySources.length} of ${registry.sources.length}`);

  if (!selectedStrains.length) {
    const message = "No target strains selected.";
    await writeScrapeStatus({
      running: false,
      stoppedAt: new Date().toISOString(),
      lastError: message,
    });
    await appendScrapeEvent(message);
    console.log(message);
    return;
  }
  if (!readySources.length) {
    const reasons = sourceReports.map((row) => `${row.source.id}: ${row.readiness.issues.join(", ") || "not ready"}`);
    await appendScrapeEvent("No ready photo sources");
    const message = `0 ready photo sources. ${reasons.join(" | ")}`;
    await writeScrapeStatus({
      running: false,
      stoppedAt: new Date().toISOString(),
      lastError: "No photo sources are ready.",
    });
    console.log(message);
    return;
  }

  const countsByStrain = new Map();
  const reviewCountsByStrain = new Map();
  const autoCountsByStrain = new Map();
  const totalVisibleReview = { count: 0 };
  const seenUrls = new Set(
    candidates
      .map((item) => item.imageUrl)
      .filter(Boolean)
  );
  for (const candidate of candidates) {
    if (candidate?.recommendedAction !== "reject" && candidate?.imageUrl && !candidateHasExistingFile(candidate)) {
      debugLog(`Stale duplicate metadata found; re-downloading. ${sanitizeUrlForLog(candidate.imageUrl)}`);
    }
  }

  for (const { source } of readySources) {
    if (await shouldStopScrape()) {
      await appendScrapeEvent("Stop requested");
      break;
    }

    for (const strainSlug of selectedStrains) {
      if (await shouldStopScrape()) {
        await appendScrapeEvent("Stop requested");
        break;
      }
      if (!autoSortEnabled && totalVisibleReview.count >= MAX_VISIBLE_REVIEW_PER_SESSION) {
        await appendScrapeEvent("Best review session is full; stopping after 100 visible picks");
        break;
      }
      if ((countsByStrain.get(strainSlug) ?? 0) >= maxImagesPerStrain) {
        run.skippedImages += 1;
        await appendScrapeEvent(`Skipped ${displaySlug(strainSlug)} because it already reached the goal`);
        continue;
      }

      await writeScrapeStatus({
        currentSource: source.id,
        currentStrain: strainSlug,
        processedPages: run.pagesFetched,
        downloadedImages: run.imagesDownloaded,
        imagesSkipped: run.skippedImages,
        skippedImages: run.skippedImages,
        rejectedImages: run.rejectedImages,
      });
      await appendScrapeEvent(`Checking ${displaySlug(strainSlug)}`);
      const currentStrainStats = strainStats(run, strainSlug);

      const pages = candidatePagesForSource({ source, strainSlug, metadataCandidates });
      if (!pages.length) {
        await appendScrapeEvent(`No pages configured for ${source.id}`);
        continue;
      }

      for (const page of pages) {
        const pageUrl = page.url;
        const queryUsed = page.query || displaySlug(strainSlug);
        const currentQueryStats = queryStats(run, queryUsed);
        if (await shouldStopScrape()) {
          await appendScrapeEvent("Stop requested");
          break;
        }
        if (!autoSortEnabled && totalVisibleReview.count >= MAX_VISIBLE_REVIEW_PER_SESSION) {
          await appendScrapeEvent("Best review session is full; stopping after 100 visible picks");
          break;
        }
        if (run.pagesFetched >= maxPagesPerRun) break;
        if ((countsByStrain.get(strainSlug) ?? 0) >= maxImagesPerStrain) break;

        try {
          let imageUrls = [];
          if (pageUrl.startsWith("direct-image-list:")) {
            imageUrls = directImagesForSource(source, strainSlug);
          } else if (pageUrl.startsWith("local-folder:")) {
            const localPaths = await localImagesForSource(source, strainSlug);
            run.imageUrlsFound += localPaths.length;
            currentStrainStats.found += localPaths.length;
            currentQueryStats.found += localPaths.length;
            await appendScrapeEvent(`Found ${localPaths.length} local candidates for ${displaySlug(strainSlug)}`);
            for (const localPath of localPaths) {
              if (await shouldStopScrape()) {
                await appendScrapeEvent("Stop requested");
                break;
              }
              if (!autoSortEnabled && totalVisibleReview.count >= MAX_VISIBLE_REVIEW_PER_SESSION) break;
              if ((countsByStrain.get(strainSlug) ?? 0) >= maxImagesPerStrain) break;
              const baseCandidate = {
                fileName: null,
                strainSlug,
                sourceId: source.id,
                sourceUrl: "local-folder",
                imageUrl: `local:${localPath}`,
                queryUsed,
                licenseNotes: source.licenseNotes,
              };
              const junkSignal = imageLooksJunk(localPath);
              const alreadyDownloaded = seenUrls.has(baseCandidate.imageUrl);
              debugLog(`Attempting download: ${sanitizeUrlForLog(baseCandidate.imageUrl)}`);
              if (alreadyDownloaded) {
                run.skippedImages += 1;
                currentStrainStats.skipped += 1;
                currentQueryStats.duplicates += 1;
                addRejection(run, "Duplicate local image");
                logRejected("duplicate");
                debugLog("Result: skipped duplicate");
                await recordRejectedCandidate(candidates, baseCandidate, "Duplicate local image");
                continue;
              }
              const localInfo = await stat(localPath);
              run.attemptedDownloads += 1;
              currentStrainStats.attempted += 1;
              debugLog(`Download details: content-type=local-file, file size=${localInfo.size} bytes`);
              if (localInfo.size < EXTREME_TINY_BYTES) {
                run.rejectedImages += 1;
                currentStrainStats.rejected += 1;
                addRejection(run, "Tiny image or thumbnail");
                logRejected("too small");
                debugLog("Result: skipped too small");
                await recordRejectedCandidate(candidates, baseCandidate, "Tiny image or thumbnail");
                await appendScrapeEvent("Skipped tiny thumbnail");
                continue;
              }
              if (shouldHardRejectSignal(junkSignal, filterMode)) {
                const reason = `${junkSignal.reason} image`;
                run.rejectedImages += 1;
                currentStrainStats.rejected += 1;
                addRejection(run, reason);
                logRejected(reason);
                debugLog(`Result: skipped ${reason}`);
                await recordRejectedCandidate(candidates, baseCandidate, reason);
                await appendScrapeEvent(`Rejected ${reason}`);
                continue;
              }
              const number = nextImageNumber(candidates, strainSlug, source.id);
              const extension = extname(localPath).toLowerCase() || ".jpg";
              const fileName = `${strainSlug}__${source.id}__${String(number).padStart(3, "0")}${extension}`;
              const filePath = join(INBOX_DIR, fileName);
              if (existsSync(filePath)) {
                run.rejectedImages += 1;
                currentStrainStats.rejected += 1;
                currentQueryStats.duplicates += 1;
                addRejection(run, "Duplicate filename already exists");
                logRejected("duplicate");
                debugLog("Result: skipped duplicate");
                await recordRejectedCandidate(candidates, { ...baseCandidate, fileName }, "Duplicate filename already exists");
                continue;
              }
              await copyFile(localPath, filePath);
              debugLog(`Result: downloaded ${fileName}`);
              const score = scorePhotoCandidate({
                row: baseCandidate,
                fileName,
                filePath,
                size: localInfo.size,
                learnedSignals,
                preferences: reviewPreferences,
              });
              const reviewState = autoSortEnabled
                ? autoDecisionForCandidate({
                    score,
                    row: { ...baseCandidate, fileName, filePath },
                    size: localInfo.size,
                    reviewMode,
                    reviewCountsByStrain,
                    totalVisibleReview,
                    autoCountsByStrain,
                    datasetCounts,
                    preferences: reviewPreferences,
                  })
                : candidateReviewState(score, reviewCountsByStrain, totalVisibleReview, strainSlug);
              const qualityWarnings = [
                ...warningsForBorderline(junkSignal, filterMode),
                ...score.qualityWarnings,
              ];
              await finalizeCandidate({
                candidates,
                autoManifestItems,
                baseCandidate,
                fileName,
                originalFileName: basename(localPath),
                filePath,
                score,
                reviewState,
                qualityWarnings,
                size: localInfo.size,
                autoSortEnabled,
              });
              seenUrls.add(baseCandidate.imageUrl);
              countsByStrain.set(strainSlug, (countsByStrain.get(strainSlug) ?? 0) + 1);
              run.imagesDownloaded += 1;
              run.candidatesAdded += 1;
              currentStrainStats.downloaded += 1;
              currentQueryStats.downloaded += 1;
              if (reviewState.autoDecision === "training") {
                run.autoTraining += 1;
                currentStrainStats.autoTraining = (currentStrainStats.autoTraining ?? 0) + 1;
                currentQueryStats.autoTraining = (currentQueryStats.autoTraining ?? 0) + 1;
              } else if (reviewState.autoDecision === "eval") {
                run.autoEval += 1;
                currentStrainStats.autoEval = (currentStrainStats.autoEval ?? 0) + 1;
                currentQueryStats.autoEval = (currentQueryStats.autoEval ?? 0) + 1;
              } else if (reviewState.autoDecision === "reject") {
                run.autoRejected += 1;
                run.rejectedImages += 1;
                currentStrainStats.rejected += 1;
                addRejection(run, reviewState.autoDecisionReason ?? reviewState.rejectReason);
              } else if (reviewState.recommendedAction === "review") {
                run.autoReview += autoSortEnabled ? 1 : 0;
                run.sentToReview += 1;
                run.bestReviewCandidates += 1;
                currentStrainStats.sentToReview += 1;
                currentQueryStats.sentToReview += 1;
              } else if (reviewState.recommendedAction === "set-aside") {
                run.autoSetAside += 1;
                currentStrainStats.setAside += 1;
                currentQueryStats.setAside += 1;
                addRejection(run, reviewState.rejectReason);
              } else {
                run.rejectedImages += 1;
                currentStrainStats.rejected += 1;
                addRejection(run, reviewState.rejectReason);
              }
              await writeScrapeStatus({
                downloadedImages: run.imagesDownloaded,
                imageUrlsFound: run.imageUrlsFound,
                attemptedDownloads: run.attemptedDownloads,
                sentToReview: run.sentToReview,
                autoTraining: run.autoTraining,
                autoEval: run.autoEval,
                autoRejected: run.autoRejected,
                autoReview: run.autoReview,
                autoSetAside: run.autoSetAside,
                bestReviewCandidates: run.bestReviewCandidates,
                imagesSkipped: run.skippedImages,
                skippedImages: run.skippedImages,
                rejectedImages: run.rejectedImages,
                rejectionReasons: run.rejectionReasons,
                byQuery: run.byQuery,
              });
              await appendScrapeEvent(`Copied ${fileName}`);
            }
            continue;
          } else {
            const strategy = sourceStrategy(source);
            const html = strategy === "image-search-json" ? null : await fetchText(pageUrl, source);
            run.pagesFetched += 1;
            await writeScrapeStatus({ processedPages: run.pagesFetched });
            imageUrls =
              strategy === "image-search-json"
                ? await fetchJsonImageUrls(pageUrl, source)
                : strategy === "rss-feed"
                ? extractFeedImages(html, pageUrl)
                : extractImages(html, pageUrl, source.selectors?.imageUrls || source.selectors?.image);
          }
          run.imageUrlsFound += imageUrls.length;
          currentStrainStats.found += imageUrls.length;
          currentQueryStats.found += imageUrls.length;
          await appendScrapeEvent(`Found ${imageUrls.length} image URLs`);
          const passedInitialUrlFiltering = imageUrls.filter((imageUrl) => imageHostAllowed(imageUrl, source) && !seenUrls.has(imageUrl)).length;
          if (sourceStrategy(source) === "image-search-json") {
            debugLog(`${source.id} returned ${imageUrls.length} image URLs for ${strainSlug}`);
            debugLog(`First 5 URLs: ${imageUrls.slice(0, 5).map(sanitizeUrlForLog).join(" | ") || "none"}`);
            debugLog(`${passedInitialUrlFiltering} passed initial URL filtering`);
          } else {
            debugLog(`${source.id} found ${imageUrls.length} image URLs for ${strainSlug}; ${passedInitialUrlFiltering} passed initial URL filtering`);
          }

          for (const imageUrl of imageUrls) {
            if (await shouldStopScrape()) {
              await appendScrapeEvent("Stop requested");
              break;
            }
            if (!autoSortEnabled && totalVisibleReview.count >= MAX_VISIBLE_REVIEW_PER_SESSION) break;
            if ((countsByStrain.get(strainSlug) ?? 0) >= maxImagesPerStrain) break;

            const baseCandidate = {
              fileName: null,
              strainSlug,
              sourceId: source.id,
              sourceUrl: pageUrl,
              imageUrl,
              queryUsed,
              licenseNotes: source.licenseNotes,
            };
            const sameOrigin = imageHostAllowed(imageUrl, source);
            const junkSignal = imageLooksJunk(imageUrl);
            const alreadyDownloaded = seenUrls.has(imageUrl);
            debugLog(`Attempting download: ${sanitizeUrlForLog(imageUrl)}`);
            if (!sameOrigin) {
              run.skippedImages += 1;
              currentStrainStats.skipped += 1;
              addRejection(run, "URL blocked");
              logRejected("URL blocked");
              debugLog("Result: skipped URL blocked");
              continue;
            }
            if (alreadyDownloaded) {
              run.skippedImages += 1;
              currentStrainStats.skipped += 1;
              currentQueryStats.duplicates += 1;
              addRejection(run, "Duplicate image URL");
              logRejected("duplicate");
              debugLog("Result: skipped duplicate");
              await recordRejectedCandidate(candidates, baseCandidate, "Duplicate image URL");
              continue;
            }
            if (shouldHardRejectSignal(junkSignal, filterMode)) {
              const reason = `${junkSignal.reason} image`;
              run.rejectedImages += 1;
              currentStrainStats.rejected += 1;
              addRejection(run, reason);
              logRejected(reason);
              debugLog(`Result: skipped ${reason}`);
              await recordRejectedCandidate(candidates, baseCandidate, reason);
              await appendScrapeEvent(`Rejected ${reason}`);
              continue;
            }

            run.attemptedDownloads += 1;
            currentStrainStats.attempted += 1;
            const download = await downloadImage(imageUrl, source);
            debugLog(`Download details: content-type=${download.contentType || "unknown"}, file size=${download.size ?? 0} bytes`);
            if (!download.ok) {
              run.rejectedImages += 1;
              currentStrainStats.rejected += 1;
              addRejection(run, download.rejectReason);
              logRejected(download.rejectReason);
              debugLog(`Result: failed ${download.rejectReason}`);
              await recordRejectedCandidate(candidates, baseCandidate, download.rejectReason);
              await appendScrapeEvent(download.rejectReason === "Tiny image or thumbnail" ? "Skipped tiny thumbnail" : `Rejected ${download.rejectReason}`);
              continue;
            }
            if (download.buffer.length < EXTREME_TINY_BYTES) {
              run.rejectedImages += 1;
              currentStrainStats.rejected += 1;
              addRejection(run, "Tiny image or thumbnail");
              logRejected("too small");
              debugLog("Result: skipped too small");
              await recordRejectedCandidate(candidates, baseCandidate, "Tiny image or thumbnail");
              await appendScrapeEvent("Skipped tiny thumbnail");
              continue;
            }

            const number = nextImageNumber(candidates, strainSlug, source.id);
            const fileName = `${strainSlug}__${source.id}__${String(number).padStart(3, "0")}${extensionFromUrl(imageUrl, download.contentType)}`;
            const filePath = join(INBOX_DIR, fileName);
            if (existsSync(filePath)) {
              run.rejectedImages += 1;
              currentStrainStats.rejected += 1;
              currentQueryStats.duplicates += 1;
              addRejection(run, "Duplicate filename already exists");
              logRejected("duplicate");
              debugLog("Result: skipped duplicate");
              await recordRejectedCandidate(candidates, { ...baseCandidate, fileName }, "Duplicate filename already exists");
              continue;
            }
            await writeFile(filePath, download.buffer, { flag: "wx" });
            debugLog(`Result: downloaded ${fileName}`);
            const info = await stat(filePath);
            const score = scorePhotoCandidate({
              row: baseCandidate,
              fileName,
              filePath,
              size: info.size,
              learnedSignals,
              preferences: reviewPreferences,
            });
            const reviewState = autoSortEnabled
              ? autoDecisionForCandidate({
                  score,
                  row: { ...baseCandidate, fileName, filePath },
                  size: info.size,
                  reviewMode,
                  reviewCountsByStrain,
                  totalVisibleReview,
                  autoCountsByStrain,
                  datasetCounts,
                  preferences: reviewPreferences,
                })
              : candidateReviewState(score, reviewCountsByStrain, totalVisibleReview, strainSlug);
            const qualityWarnings = [
              ...warningsForBorderline(junkSignal, filterMode),
              ...score.qualityWarnings,
            ];
            await finalizeCandidate({
              candidates,
              autoManifestItems,
              baseCandidate,
              fileName,
              filePath,
              score,
              reviewState,
              qualityWarnings,
              size: info.size,
              autoSortEnabled,
            });
            seenUrls.add(imageUrl);
            countsByStrain.set(strainSlug, (countsByStrain.get(strainSlug) ?? 0) + 1);
            run.imagesDownloaded += 1;
            run.candidatesAdded += 1;
            currentStrainStats.downloaded += 1;
            currentQueryStats.downloaded += 1;
            if (reviewState.autoDecision === "training") {
              run.autoTraining += 1;
              currentStrainStats.autoTraining = (currentStrainStats.autoTraining ?? 0) + 1;
              currentQueryStats.autoTraining = (currentQueryStats.autoTraining ?? 0) + 1;
            } else if (reviewState.autoDecision === "eval") {
              run.autoEval += 1;
              currentStrainStats.autoEval = (currentStrainStats.autoEval ?? 0) + 1;
              currentQueryStats.autoEval = (currentQueryStats.autoEval ?? 0) + 1;
            } else if (reviewState.autoDecision === "reject") {
              run.autoRejected += 1;
              run.rejectedImages += 1;
              currentStrainStats.rejected += 1;
              addRejection(run, reviewState.autoDecisionReason ?? reviewState.rejectReason);
            } else if (reviewState.recommendedAction === "review") {
              run.autoReview += autoSortEnabled ? 1 : 0;
              run.sentToReview += 1;
              run.bestReviewCandidates += 1;
              currentStrainStats.sentToReview += 1;
              currentQueryStats.sentToReview += 1;
            } else if (reviewState.recommendedAction === "set-aside") {
              run.autoSetAside += 1;
              currentStrainStats.setAside += 1;
              currentQueryStats.setAside += 1;
              addRejection(run, reviewState.rejectReason);
            } else {
              run.rejectedImages += 1;
              currentStrainStats.rejected += 1;
              addRejection(run, reviewState.rejectReason);
            }
            await writeScrapeStatus({
              downloadedImages: run.imagesDownloaded,
              imageUrlsFound: run.imageUrlsFound,
              attemptedDownloads: run.attemptedDownloads,
              sentToReview: run.sentToReview,
              autoTraining: run.autoTraining,
              autoEval: run.autoEval,
              autoRejected: run.autoRejected,
              autoReview: run.autoReview,
              autoSetAside: run.autoSetAside,
              bestReviewCandidates: run.bestReviewCandidates,
              imagesSkipped: run.skippedImages,
              skippedImages: run.skippedImages,
              rejectedImages: run.rejectedImages,
              rejectionReasons: run.rejectionReasons,
              byQuery: run.byQuery,
            });
            await appendScrapeEvent(`Downloaded ${fileName}`);
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          const row = {
            sourceId: source.id,
            sourceUrl: pageUrl,
            strainSlug,
            at: new Date().toISOString(),
            message,
          };
          errors.push(row);
          await writeScrapeStatus({ errors: errors.slice(-10), lastError: message });
          await appendScrapeEvent(`Source error on ${source.id}: ${message}`);
        }
      }
      logStrainSummary(run, strainSlug);
    }
  }

  run.errors = errors.length;
  run.finishedAt = new Date().toISOString();
  await writeJson(IMAGE_CANDIDATES_PATH, dedupeCandidates(candidates));
  if (autoManifestItems.length > 0) {
    await writeJson(REVIEW_MANIFEST_PATH, upsertManifestItems(reviewManifest, autoManifestItems));
  }
  await appendJsonArray(SCRAPE_RUNS_PATH, [run]);
  await appendJsonArray(SOURCE_ERRORS_PATH, errors);
  const noDownloadsMessage =
    run.imagesDownloaded === 0
      ? "Scraper ran, but did not find usable photos. Check source setup or try another source."
      : null;
  await writeScrapeStatus({
    running: false,
    stoppedAt: run.finishedAt,
    currentSource: null,
    currentStrain: null,
    processedPages: run.pagesFetched,
    downloadedImages: run.imagesDownloaded,
    imageUrlsFound: run.imageUrlsFound,
    attemptedDownloads: run.attemptedDownloads,
    sentToReview: run.sentToReview,
    autoTraining: run.autoTraining,
    autoEval: run.autoEval,
    autoRejected: run.autoRejected,
    autoReview: run.autoReview,
    autoSetAside: run.autoSetAside,
    bestReviewCandidates: run.bestReviewCandidates,
    imagesSkipped: run.skippedImages,
    skippedImages: run.skippedImages,
    rejectedImages: run.rejectedImages,
    rejectionReasons: run.rejectionReasons,
    filterMode,
    readySources: readySources.length,
    totalSources: registry.sources.length,
    errors: errors.slice(-10),
    lastError: errors.at(-1)?.message ?? noDownloadsMessage,
    byStrain: run.byStrain,
    byQuery: run.byQuery,
    reviewMode,
  });
  await appendScrapeEvent(noDownloadsMessage ?? `Finished photo scrape. Downloaded ${run.imagesDownloaded} images`);

  console.log("Photo scraping complete");
  console.log(`Targets: ${selectedStrains.length}`);
  console.log(`Ready photo sources: ${readySources.length} of ${registry.sources.length}`);
  console.log(`Pages checked: ${run.pagesFetched}`);
  console.log(`Image URLs found: ${run.imageUrlsFound}`);
  console.log(`Images downloaded: ${run.imagesDownloaded}`);
  console.log(`Auto training images: ${run.autoTraining}`);
  console.log(`Auto eval images: ${run.autoEval}`);
  console.log(`Auto rejected images: ${run.autoRejected}`);
  console.log(`Optional review images: ${run.autoReview || run.sentToReview}`);
  console.log(`Images sent to review: ${run.sentToReview}`);
  console.log(`Best review candidates shown: ${run.bestReviewCandidates}`);
  console.log(`Images auto-set-aside: ${run.autoSetAside}`);
  console.log(`Images skipped: ${run.skippedImages}`);
  console.log(`Images rejected: ${run.rejectedImages}`);
  console.log(`Top rejection reasons: ${JSON.stringify(run.rejectionReasons)}`);
  console.log(`By query: ${JSON.stringify(run.byQuery)}`);
  console.log(`Errors: ${run.errors}`);
  console.log("By strain:");
  for (const strainSlug of selectedStrains) {
    const row = run.byStrain[strainSlug] ?? { found: 0, attempted: 0, downloaded: 0, sentToReview: 0, autoTraining: 0, autoEval: 0, setAside: 0, skipped: 0, rejected: 0 };
    console.log(`- ${strainSlug}: found ${row.found}, attempted ${row.attempted}, downloaded ${row.downloaded}, training ${row.autoTraining ?? 0}, eval ${row.autoEval ?? 0}, review ${row.sentToReview}, set-aside ${row.setAside}, skipped ${row.skipped}, rejected ${row.rejected}`);
  }
  logQuerySummary(run);
  if (noDownloadsMessage) console.log(noDownloadsMessage);
}

main().catch(async (error) => {
  const message = error instanceof Error ? error.message : String(error);
  await writeScrapeStatus({
    running: false,
    stopRequested: false,
    stoppedAt: new Date().toISOString(),
    errors: [{ at: new Date().toISOString(), message }],
    lastError: message,
  });
  await appendScrapeEvent(`Error: ${message}`);
  console.error("Photo scraping failed:", message);
  process.exit(1);
});
