function normalizeToSlug(value: string) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const neutralPrefixTokens = new Set(["original", "pure"]);

export function isExactOrStrongStrainMatch(targetName: string, candidateNameOrSlug: string) {
  const targetSlug = normalizeToSlug(targetName);
  const candidateSlug = normalizeToSlug(candidateNameOrSlug);
  if (!targetSlug || !candidateSlug) return false;
  if (candidateSlug === targetSlug) return true;

  const targetTokens = targetSlug.split("-").filter(Boolean);
  const candidateTokens = candidateSlug.split("-").filter(Boolean);
  const targetTokenSet = new Set(targetTokens);
  const extraTokens = candidateTokens.filter((token) => !targetTokenSet.has(token));

  if (extraTokens.length === 0) return true;
  if (extraTokens.every((token) => /^\d+$/.test(token))) return true;
  if (extraTokens.every((token) => neutralPrefixTokens.has(token))) return true;

  return false;
}

