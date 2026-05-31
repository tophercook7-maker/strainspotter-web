import { appendScrapeEvent, writeScrapeStatus } from "./scrape-utils.mjs";

async function main() {
  await writeScrapeStatus({
    running: false,
    stopRequested: false,
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
    byStrain: {},
    byQuery: {},
    lastAction: "reset",
    stoppedAt: new Date().toISOString(),
    lastError: null,
  });
  await appendScrapeEvent("Scrape status reset");
  console.log("Scrape status reset.");
}

main().catch((error) => {
  console.error("Failed to reset scrape status:", error);
  process.exit(1);
});
