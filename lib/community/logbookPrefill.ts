/**
 * Community → Logbook Prefill Utilities
 * Handles source metadata for community-sourced logbook entries
 */

export interface CommunitySourceMetadata {
  source_type: "community";
  source_id: string; // post or reply id
  source_title?: string; // thread title (if available)
  source_author?: string; // username (if available)
}

export interface LogbookPrefillWithSource {
  text: string;
  source_metadata?: CommunitySourceMetadata;
}

/**
 * Generate prefill data from Community post/reply
 */
export function generateCommunityPrefill(
  content: string,
  sourceId: string,
  sourceType: "post" | "reply",
  sourceTitle?: string,
  sourceAuthor?: string
): LogbookPrefillWithSource {
  return {
    text: content.slice(0, 2000),
    source_metadata: {
      source_type: "community",
      source_id: sourceId,
      source_title: sourceTitle,
      source_author: sourceAuthor,
    },
  };
}

/**
 * Encode prefill data for URL parameter
 * Includes both text and metadata
 */
export function encodeCommunityPrefill(prefill: LogbookPrefillWithSource): string {
  return encodeURIComponent(JSON.stringify(prefill));
}

/**
 * Decode prefill data from URL parameter
 */
export function decodeCommunityPrefill(encoded: string): LogbookPrefillWithSource | null {
  try {
    const decoded = decodeURIComponent(encoded);
    const parsed = JSON.parse(decoded);
    
    // Support legacy format (plain text)
    if (typeof parsed === "string") {
      return { text: parsed };
    }
    
    return parsed as LogbookPrefillWithSource;
  } catch (error) {
    // Fallback: treat as plain text (backward compatibility)
    try {
      const decoded = decodeURIComponent(encoded);
      return { text: decoded };
    } catch {
      return null;
    }
  }
}

/**
 * Format logbook entry text with source attribution (optional)
 */
export function formatLogbookTextWithSource(
  text: string,
  metadata?: CommunitySourceMetadata
): string {
  if (!metadata || metadata.source_type !== "community") {
    return text;
  }
  
  // Add subtle source attribution at the end (not visible by default, but available for Coach)
  const attribution = metadata.source_title 
    ? `\n\n[Source: Community - ${metadata.source_title}]`
    : `\n\n[Source: Community]`;
  
  return text + attribution;
}
