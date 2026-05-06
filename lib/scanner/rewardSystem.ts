import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const TRAINING_DIR = () => path.join(process.cwd(), "data", "scanner-training");
export const rewardsJsonlPath = () => path.join(TRAINING_DIR(), "user-rewards.jsonl");
export const reputationJsonPath = () => path.join(TRAINING_DIR(), "user-reputation.json");

export type RewardEventType =
  | "match_confirmed"
  | "none_of_these_corrected"
  | "reference_added"
  | "consensus_bonus"
  | "duplicate_ignored"
  | "spam_penalty";

export type RewardEvent = {
  id: string;
  userId: string;
  scanId: string;
  createdAt: string;
  eventType: RewardEventType;
  points: number;
  reason: string;
  correctStrainSlug: string;
  correctStrainName: string;
  previousTopMatches: unknown[];
  trustWeight: number;
};

export type FeedbackForReward = {
  noneOfThese: boolean;
  selectedMatchSlug: string | null;
  selectedMatchName?: string | null;
  correctedStrainName: string | null;
  correctStrainSlug: string | null;
  correctStrainName?: string | null;
  wrongTopMatchSlug: string | null;
  previousRank: number | null;
  previousConfidence: number | null;
  scanId: string | null;
  predictedTopMatches: unknown[];
};

type UserReputation = {
  totalPoints: number;
  trustWeight: number;
  badges: string[];
  conflictPenalties: number;
};

type ReputationFile = {
  version: number;
  users: Record<string, UserReputation>;
};

export const REWARD_BADGES: Array<{ id: string; label: string; minPoints: number }> = [
  { id: "scanner-helper", label: "Scanner Helper", minPoints: 25 },
  { id: "strain-trainer", label: "Strain Trainer", minPoints: 100 },
  { id: "accuracy-builder", label: "Accuracy Builder", minPoints: 250 },
  { id: "master-spotter", label: "Master Spotter", minPoints: 500 },
  { id: "strainspotter-elite", label: "StrainSpotter Elite", minPoints: 1000 },
];

const FEEDBACK_PATH = () => path.join(process.cwd(), "data", "scan-feedback-local.jsonl");

function defaultReputation(): UserReputation {
  return {
    totalPoints: 0,
    trustWeight: 1,
    badges: [],
    conflictPenalties: 0,
  };
}

function loadReputation(): ReputationFile {
  const p = reputationJsonPath();
  if (!fs.existsSync(p)) return { version: 1, users: {} };
  try {
    const raw = JSON.parse(fs.readFileSync(p, "utf8")) as ReputationFile;
    if (!raw || typeof raw.users !== "object") return { version: 1, users: {} };
    return { version: 1, ...raw, users: raw.users ?? {} };
  } catch {
    return { version: 1, users: {} };
  }
}

function saveReputation(file: ReputationFile) {
  fs.mkdirSync(TRAINING_DIR(), { recursive: true });
  fs.writeFileSync(reputationJsonPath(), JSON.stringify(file, null, 2), "utf8");
}

function readRewards(): RewardEvent[] {
  const p = rewardsJsonlPath();
  if (!fs.existsSync(p)) return [];
  return fs
    .readFileSync(p, "utf8")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line) as RewardEvent;
      } catch {
        return null;
      }
    })
    .filter((e): e is RewardEvent => Boolean(e));
}

function readFeedbackRows(): Array<Record<string, unknown>> {
  const p = FEEDBACK_PATH();
  if (!fs.existsSync(p)) return [];
  return fs
    .readFileSync(p, "utf8")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line) as Record<string, unknown>;
      } catch {
        return null;
      }
    })
    .filter((row): row is Record<string, unknown> => Boolean(row));
}

export function normalizeScanKey(scanId: string | null): string {
  if (scanId && typeof scanId === "string" && scanId.trim()) return scanId.trim();
  return "unknown-scan";
}

/** True if this user already submitted feedback for this scan (blocks duplicate rows + farming). */
export function hasPriorFeedbackForScanUser(scanId: string | null, userId: string): boolean {
  const key = normalizeScanKey(scanId);
  for (const row of readFeedbackRows()) {
    const uid = typeof row.userId === "string" ? row.userId : "";
    const sid = typeof row.scanId === "string" ? row.scanId : "";
    if (!uid) continue;
    if (uid === userId && normalizeScanKey(sid) === key) return true;
  }
  return false;
}

/** True if user already received positive points for this scan. */
export function preventDuplicateReward(scanId: string | null, userId: string): boolean {
  const key = normalizeScanKey(scanId);
  for (const ev of readRewards()) {
    if (ev.userId !== userId || normalizeScanKey(ev.scanId) !== key) continue;
    if (ev.points > 0) return true;
  }
  return false;
}

function rewardsLastHour(userId: string): number {
  const cutoff = Date.now() - 60 * 60 * 1000;
  let n = 0;
  for (const ev of readRewards()) {
    if (ev.userId !== userId || ev.points <= 0) continue;
    const t = Date.parse(ev.createdAt);
    if (!Number.isFinite(t) || t < cutoff) continue;
    n += 1;
  }
  return n;
}

function slimMatches(matches: unknown[]): unknown[] {
  return matches.slice(0, 8).map((m) => {
    if (!m || typeof m !== "object") return m;
    const o = m as Record<string, unknown>;
    return { slug: o.slug, name: o.name, rank: o.rank, confidence: o.confidence };
  });
}

function consensusEligible(fb: FeedbackForReward, currentUserId: string): boolean {
  const slug = fb.correctStrainSlug;
  if (!slug) return false;
  const wrong = fb.wrongTopMatchSlug ?? "";
  for (const row of readFeedbackRows()) {
    const uid = typeof row.userId === "string" ? row.userId : "";
    if (!uid || uid === currentUserId) continue;
    const otherSlug =
      typeof row.correctStrainSlug === "string"
        ? row.correctStrainSlug
        : typeof row.selectedMatchSlug === "string"
          ? row.selectedMatchSlug
          : null;
    const otherWrong =
      typeof row.wrongTopMatchSlug === "string" ? row.wrongTopMatchSlug : "";
    if (!otherSlug || otherSlug !== slug) continue;
    if ((wrong || "") !== (otherWrong || "")) continue;
    return true;
  }
  return false;
}

export function calculateFeedbackReward(
  fb: FeedbackForReward,
  ctx: {
    userId: string;
    imageSaved: boolean;
  }
): {
  points: number;
  primaryEventType: RewardEventType;
  parts: string[];
} {
  const parts: string[] = [];
  let points = 0;
  let primary: RewardEventType = "match_confirmed";

  const qualifies =
    Boolean(fb.correctStrainSlug) &&
    (fb.noneOfThese
      ? Boolean(fb.correctedStrainName?.trim())
      : Boolean(fb.selectedMatchSlug));

  if (!qualifies) {
    return { points: 0, primaryEventType: "duplicate_ignored", parts: ["Not a qualifying confirmation"] };
  }

  if (fb.noneOfThese) {
    primary = "none_of_these_corrected";
    points += 10;
    parts.push("Correction (+10)");
  } else {
    const conf = fb.previousConfidence ?? 0;
    const rank1EasyWin =
      fb.previousRank === 1 && conf >= 72 && !fb.wrongTopMatchSlug;
    if (rank1EasyWin) {
      primary = "match_confirmed";
      points += 2;
      parts.push("Confirmed strong top match (+2)");
    } else {
      primary = "match_confirmed";
      points += 5;
      parts.push("Confirmed suggested match (+5)");
    }
  }

  if (ctx.imageSaved) {
    points += 15;
    parts.push("Training image saved for references (+15)");
  }

  if (consensusEligible(fb, ctx.userId)) {
    points += 20;
    parts.push("Consensus bonus — others matched this correction (+20)");
  }

  return { points, primaryEventType: primary, parts };
}

function computeBadges(total: number): string[] {
  const out: string[] = [];
  for (const b of REWARD_BADGES) {
    if (total >= b.minPoints) out.push(b.id);
  }
  return out;
}

function trustFromReputation(rep: UserReputation): number {
  const base = 1;
  const bonus = Math.min(0.12, rep.totalPoints / 4000);
  const pen = Math.min(0.15, rep.conflictPenalties * 0.03);
  return Math.min(1.12, Math.max(0.82, base + bonus - pen));
}

export function getTrustWeight(userId: string): number {
  const file = loadReputation();
  const rep = file.users[userId] ?? defaultReputation();
  return trustFromReputation(rep);
}

export type UserRewardSummary = {
  userId: string;
  totalPoints: number;
  trustWeight: number;
  trustLevel: string;
  badges: Array<{ id: string; label: string }>;
  recentRewards: RewardEvent[];
};

export function getUserRewardSummary(userId: string, recentLimit = 12): UserRewardSummary {
  const file = loadReputation();
  const rep = file.users[userId] ?? defaultReputation();
  const badgeIds = computeBadges(rep.totalPoints);
  const tw = trustFromReputation(rep);
  const badgeObjs = REWARD_BADGES.filter((b) => badgeIds.includes(b.id)).map((b) => ({
    id: b.id,
    label: b.label,
  }));
  const recent = readRewards()
    .filter((e) => e.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, recentLimit);

  let trustLevel = "Standard";
  if (tw >= 1.08) trustLevel = "High";
  else if (tw <= 0.9) trustLevel = "Limited";

  return {
    userId,
    totalPoints: rep.totalPoints,
    trustWeight: Number(tw.toFixed(3)),
    trustLevel,
    badges: badgeObjs,
    recentRewards: recent,
  };
}

export type AwardOutcome = {
  pointsAwarded: number;
  totalPoints: number;
  badgeUnlocked: string | null;
  message: string;
  trustWeight: number;
  trustLevel: string;
  event?: RewardEvent;
};

export function awardFeedbackPoints(input: {
  feedback: FeedbackForReward;
  userId: string;
  imageSaved: boolean;
}): AwardOutcome {
  const { feedback, userId } = input;
  const scanKey = normalizeScanKey(feedback.scanId);
  const trustBefore = getTrustWeight(userId);

  if (preventDuplicateReward(feedback.scanId, userId)) {
    const summary = getUserRewardSummary(userId);
    return {
      pointsAwarded: 0,
      totalPoints: summary.totalPoints,
      badgeUnlocked: null,
      message: "Already saved — thanks for helping train this scan.",
      trustWeight: summary.trustWeight,
      trustLevel: summary.trustLevel,
    };
  }

  if (rewardsLastHour(userId) > 25) {
    appendRewardEvent({
      userId,
      scanId: scanKey,
      eventType: "spam_penalty",
      points: 0,
      reason: "Too many rewarded actions in a short window — try again later.",
      correctStrainSlug: feedback.correctStrainSlug ?? "",
      correctStrainName: "",
      previousTopMatches: slimMatches(feedback.predictedTopMatches),
      trustWeight: trustBefore,
    });
    const summary = getUserRewardSummary(userId);
    return {
      pointsAwarded: 0,
      totalPoints: summary.totalPoints,
      badgeUnlocked: null,
      message: "Reward rate limited — thanks for helping; try again later.",
      trustWeight: summary.trustWeight,
      trustLevel: summary.trustLevel,
    };
  }

  const calc = calculateFeedbackReward(feedback, { userId, imageSaved: input.imageSaved });
  if (calc.points <= 0) {
    const summary = getUserRewardSummary(userId);
    return {
      pointsAwarded: 0,
      totalPoints: summary.totalPoints,
      badgeUnlocked: null,
      message: "Feedback saved — no points for this submission.",
      trustWeight: summary.trustWeight,
      trustLevel: summary.trustLevel,
    };
  }

  const repFile = loadReputation();
  const prevRep = repFile.users[userId] ?? defaultReputation();
  const prevBadges = new Set(computeBadges(prevRep.totalPoints));

  const correctName =
    feedback.correctStrainName?.trim() ||
    feedback.selectedMatchName?.trim() ||
    feedback.correctedStrainName?.trim() ||
    feedback.correctStrainSlug ||
    "";

  const reason = calc.parts.join("; ");
  const ev = appendRewardEvent({
    userId,
    scanId: scanKey,
    eventType: calc.primaryEventType,
    points: calc.points,
    reason,
    correctStrainSlug: feedback.correctStrainSlug ?? "",
    correctStrainName: correctName,
    previousTopMatches: slimMatches(feedback.predictedTopMatches),
    trustWeight: trustBefore,
  });

  const nextRep = { ...prevRep };
  nextRep.totalPoints += calc.points;
  nextRep.badges = computeBadges(nextRep.totalPoints);
  nextRep.trustWeight = trustFromReputation(nextRep);
  repFile.users[userId] = nextRep;
  saveReputation(repFile);

  let badgeUnlocked: string | null = null;
  for (const b of REWARD_BADGES) {
    if (nextRep.badges.includes(b.id) && !prevBadges.has(b.id)) {
      badgeUnlocked = b.label;
      break;
    }
  }

  const summary = getUserRewardSummary(userId);
  const msg =
    calc.points > 0
      ? `Thanks — you earned ${calc.points} StrainSpotter points for improving the scanner.`
      : "Feedback saved.";

  return {
    pointsAwarded: calc.points,
    totalPoints: summary.totalPoints,
    badgeUnlocked,
    message: msg,
    trustWeight: summary.trustWeight,
    trustLevel: summary.trustLevel,
    event: ev,
  };
}

function appendRewardEvent(input: {
  userId: string;
  scanId: string;
  eventType: RewardEventType;
  points: number;
  reason: string;
  correctStrainSlug: string;
  correctStrainName: string;
  previousTopMatches: unknown[];
  trustWeight: number;
}): RewardEvent {
  const event: RewardEvent = {
    id: crypto.randomUUID(),
    userId: input.userId,
    scanId: input.scanId,
    createdAt: new Date().toISOString(),
    eventType: input.eventType,
    points: input.points,
    reason: input.reason,
    correctStrainSlug: input.correctStrainSlug,
    correctStrainName: input.correctStrainName,
    previousTopMatches: input.previousTopMatches,
    trustWeight: input.trustWeight,
  };
  fs.mkdirSync(TRAINING_DIR(), { recursive: true });
  fs.appendFileSync(rewardsJsonlPath(), `${JSON.stringify(event)}\n`, "utf8");
  return event;
}

/** After feedback append: if multiple opinions on same scan, lightly penalize minority voters' conflictPenalties. */
export function applyConsensusConflictTrust(scanId: string | null): void {
  const key = normalizeScanKey(scanId);
  const rows = readFeedbackRows().filter(
    (r) => normalizeScanKey(typeof r.scanId === "string" ? r.scanId : null) === key
  );
  if (rows.length < 2) return;

  const slugCounts = new Map<string, number>();
  for (const r of rows) {
    const slug =
      typeof r.correctStrainSlug === "string"
        ? r.correctStrainSlug
        : typeof r.selectedMatchSlug === "string"
          ? r.selectedMatchSlug
          : "";
    if (!slug) continue;
    slugCounts.set(slug, (slugCounts.get(slug) || 0) + 1);
  }
  if (slugCounts.size < 2) return;

  let plurality = "";
  let best = 0;
  for (const [slug, c] of slugCounts.entries()) {
    if (c > best) {
      best = c;
      plurality = slug;
    }
  }
  if (!plurality || best < 1) return;

  const file = loadReputation();
  let dirty = false;

  for (const r of rows) {
    const slug =
      typeof r.correctStrainSlug === "string"
        ? r.correctStrainSlug
        : typeof r.selectedMatchSlug === "string"
          ? r.selectedMatchSlug
          : "";
    const uid = typeof r.userId === "string" ? r.userId : "";
    if (!uid || uid === "anonymous" || !slug || slug === plurality) continue;
    const rep = file.users[uid] ?? defaultReputation();
    rep.conflictPenalties = (rep.conflictPenalties || 0) + 1;
    rep.trustWeight = trustFromReputation(rep);
    file.users[uid] = rep;
    dirty = true;
  }

  if (dirty) saveReputation(file);
}
