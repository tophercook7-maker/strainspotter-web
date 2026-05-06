import fs from "node:fs";
import path from "node:path";

export type RecentScanDebugEntry = {
  createdAt: string;
  scanId: string;
  imageHashShort: string;
  topMatchSlugs: string[];
  topMatchConfidences: number[];
  embeddingIndexUsed: boolean;
  totalCandidatesConsidered: number;
};

function recentScanDebugPath(): string {
  return path.join(process.cwd(), "data", "scanner-training", "recent-scan-debug.jsonl");
}

function ensureDir(filePath: string) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

/**
 * Append one debug line when SCANNER_DEBUG_MATCHING scans run.
 * Returns a warning when the same ordered top-3 slug list appears for 3+ distinct image hashes.
 */
export function appendRecentScanDebugAndDetectRepeat(
  entry: RecentScanDebugEntry
): { repeatedTopMatchesWarning?: string } {
  const filePath = recentScanDebugPath();
  ensureDir(filePath);
  fs.appendFileSync(filePath, `${JSON.stringify(entry)}\n`, "utf8");

  let content = "";
  try {
    content = fs.readFileSync(filePath, "utf8");
  } catch {
    return {};
  }

  const lines = content
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(-120);

  type Row = RecentScanDebugEntry;
  const parsed: Row[] = [];
  for (const line of lines) {
    try {
      parsed.push(JSON.parse(line) as Row);
    } catch {
      /* skip */
    }
  }

  const byTop3 = new Map<string, Set<string>>();
  for (const row of parsed) {
    const key = row.topMatchSlugs.slice(0, 3).join(">");
    if (!key || key === ">>") continue;
    const set = byTop3.get(key) ?? new Set<string>();
    set.add(row.imageHashShort);
    byTop3.set(key, set);
  }

  for (const [, hashes] of byTop3) {
    if (hashes.size >= 3) {
      return {
        repeatedTopMatchesWarning:
          "Repeated top matches across different scans detected. Ranking may be over-weighting priors or reference depth.",
      };
    }
  }

  return {};
}
