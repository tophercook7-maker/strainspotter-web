/**
 * Metadata Extraction — extract strain metadata from raw HTML/JSON.
 * Scaffolded; implement with parser or AI extraction.
 */

import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { CONFIG } from "./config.js";

export interface ExtractedMetadata {
  strain_name?: string;
  slug?: string;
  type?: string;
  lineage?: string;
  source_url?: string;
  source_site?: string;
  extracted_at?: string;
}

/**
 * Extract metadata from raw content. Placeholder — no extraction until pipeline is ready.
 */
export async function extractMetadata(
  _rawContent: string,
  _contentType: "html" | "json",
  strainSlug: string
): Promise<ExtractedMetadata | null> {
  const dir = join(CONFIG.VAULT_ROOT, "staging", "strain_source_records");
  await mkdir(dir, { recursive: true });
  return { strain_name: strainSlug, slug: strainSlug, extracted_at: new Date().toISOString() };
}
