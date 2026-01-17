/**
 * Simple Text Matcher
 * Free, local text-based matching using OCR and strain data
 * No paid AI, no external APIs
 */

/**
 * Score a match between query text and strain text
 * Returns score 0-100
 * Includes OCR confidence boost and keyword detection
 */
export function scoreMatch(
  queryText: string[],
  strainText: string[],
  ocrConfidence?: number
): number {
  if (!queryText || queryText.length === 0 || !strainText || strainText.length === 0) {
    return 0;
  }

  const q = queryText.join(" ").toLowerCase().trim();
  const s = strainText.join(" ").toLowerCase().trim();

  if (!q || !s) {
    return 0;
  }

  let score = 0;
  const queryWords = q.split(/\s+/).filter((w) => w.length > 0);

  for (const word of queryWords) {
    // Only score words longer than 3 characters (skip common words)
    if (word.length > 3) {
      if (s.includes(word)) {
        // Exact word match
        score += 10;
      } else if (word.length > 5) {
        // Partial match for longer words
        const regex = new RegExp(word.substring(0, Math.min(6, word.length)), "i");
        if (regex.test(s)) {
          score += 5;
        }
      }
    }
  }

  // Bonus for exact phrase matches
  if (q.length > 10 && s.includes(q)) {
    score += 20;
  }

  // OCR confidence boost (if confidence > 50)
  if (ocrConfidence && ocrConfidence > 50) {
    score += Math.min(15, Math.floor(ocrConfidence / 10)); // Up to 15 point boost
  }

  // Boost for THC % or terpene keywords in OCR text
  if (s.match(/\bthc\b|\bterpene\b|\bcbd\b|\bterpenes\b/i)) {
    score += 15;
  }

  // Boost for exact strain name match in OCR text
  const strainNamePattern = /\b([a-z]+(?:\s+[a-z]+)*)\b/gi;
  const strainNames = s.match(strainNamePattern);
  if (strainNames && q.length > 5) {
    // Check if query contains any potential strain name from OCR
    for (const name of strainNames) {
      if (name.length > 4 && q.includes(name.toLowerCase())) {
        score += 20; // Strong boost for strain name match
        break;
      }
    }
  }

  return Math.min(100, score);
}

/**
 * Find best match from a list of candidates
 */
export function findBestMatch(
  queryText: string[],
  candidates: Array<{ slug: string; ocrText: string[] }>
): { slug: string; score: number } | null {
  if (candidates.length === 0) {
    return null;
  }

  let best: { slug: string; score: number } | null = null;

  for (const candidate of candidates) {
    const score = scoreMatch(queryText, candidate.ocrText);
    if (!best || score > best.score) {
      best = { slug: candidate.slug, score };
    }
  }

  return best && best.score >= 40 ? best : null; // Minimum threshold
}
