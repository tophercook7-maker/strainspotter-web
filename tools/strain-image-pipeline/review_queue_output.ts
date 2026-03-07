/**
 * Review Queue Output — write candidate images and metadata to review_queue for human approval.
 * Scaffolded; extend to populate review_queue/images/ with structured data.
 */

import { mkdir } from "fs/promises";
import { join } from "path";
import { CONFIG } from "./config.js";

export interface ReviewCandidate {
  strainSlug: string;
  imagePath: string;
  imageType?: string;
  qualityScore?: number;
  sourceUrl?: string;
}

/**
 * Write candidates to review queue. Scaffold — copies or links for review.
 */
export async function writeToReviewQueue(
  candidates: ReviewCandidate[]
): Promise<number> {
  const dir = join(CONFIG.VAULT_ROOT, "review_queue", "images");
  await mkdir(dir, { recursive: true });
  // Scaffold: would copy/link images and write manifest for review UI
  return 0;
}
