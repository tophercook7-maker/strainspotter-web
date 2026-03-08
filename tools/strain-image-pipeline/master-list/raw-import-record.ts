/**
 * Raw/staging record shape for messy source names before approval.
 * Used when ingesting from scrapers, APIs, or manual imports.
 */
export interface RawImportRecord {
  raw_name: string;
  source_site: string;
  source_url?: string;
  raw_text?: string;
  imported_at: string;
}
