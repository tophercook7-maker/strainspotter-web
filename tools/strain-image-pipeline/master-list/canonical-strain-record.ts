/**
 * Canonical strain record shape for the 5,000-strain master list.
 * Aligns with vault_strains schema; used for dedupe output and promotion to approved.
 */
export interface CanonicalStrainRecord {
  slug: string;
  canonical_name: string;
  aliases: string[];
  type?: "Indica" | "Sativa" | "Hybrid";
  lineage?: string;
  source_records?: SourceRecordRef[];
  review_status: "pending" | "approved" | "rejected";
  confidence?: number;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface SourceRecordRef {
  raw_name: string;
  source_site: string;
  source_url?: string;
}
