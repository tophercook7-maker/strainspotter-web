/**
 * Pure scan entitlement math from `public.profiles` rows (no DB writes).
 * Plan identity comes from `membership`; quota fields track usage.
 */

export type ScanTier = "free" | "member" | "pro";

export interface ScanEntitlements {
  tier: ScanTier;
  freeScansUsed: number;
  memberScansUsed: number;
  topupScansAvailable: number;
  memberScansIncluded: number;
  memberScansRemaining: number;
  freeScansRemaining: number;
  canScan: boolean;
  shouldUseTopup: boolean;
  isUnlimited: boolean;
  scanPeriodStartedAt: string | null;
  scanPeriodEndsAt: string | null;
}

/** Lifetime free trial allowance (never resets monthly). */
export const FREE_LIFETIME_SCANS = 3;

/** Included garden (member) scans per active billing period. */
export const MEMBER_INCLUDED_SCANS_PER_PERIOD = 75;

function clampNonNeg(n: number): number {
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

export function normalizeTier(
  membership: string | null | undefined
): ScanTier {
  const m = (membership ?? "").toLowerCase();
  if (m === "pro") return "pro";
  if (m === "garden" || m === "standard" || m === "elite") return "member";
  return "free";
}

/**
 * Included member period is "active" when there is no end, end is invalid, or now is on/before end.
 */
export function isMemberPeriodActive(
  now: Date,
  scanPeriodEndsAt: string | null | undefined
): boolean {
  if (scanPeriodEndsAt == null || scanPeriodEndsAt === "") return true;

  const end = new Date(scanPeriodEndsAt);
  if (Number.isNaN(end.getTime())) return true;

  return now.getTime() <= end.getTime();
}

/**
 * For entitlement math: if `scan_period_ends_at` is in the past, treat included member usage as 0
 * (new period not yet persisted). If end is missing, use stored usage.
 */
export function effectiveMemberScansUsed(
  now: Date,
  scanPeriodEndsAt: string | null | undefined,
  memberScansUsed: number
): number {
  const used = clampNonNeg(memberScansUsed);

  if (scanPeriodEndsAt == null || scanPeriodEndsAt === "") {
    return used;
  }

  const end = new Date(scanPeriodEndsAt);
  if (Number.isNaN(end.getTime())) {
    return used;
  }

  if (now.getTime() > end.getTime()) {
    return 0;
  }

  return used;
}

/**
 * Whether the member billing window should be rolled (consume route — server writes).
 * Missing start/end or past end → start a new period.
 */
export function memberPeriodNeedsReset(
  now: Date,
  scanPeriodStartedAt: string | null | undefined,
  scanPeriodEndsAt: string | null | undefined
): boolean {
  if (scanPeriodStartedAt == null && scanPeriodEndsAt == null) return true;
  if (scanPeriodEndsAt == null || scanPeriodEndsAt === "") return true;

  const end = new Date(scanPeriodEndsAt);
  if (Number.isNaN(end.getTime())) return true;

  return now.getTime() > end.getTime();
}

export function buildScanEntitlements(
  input: {
    membership: string | null | undefined;
    freeScansUsed: number | null | undefined;
    memberScansUsed: number | null | undefined;
    topupScansAvailable: number | null | undefined;
    scanPeriodStartedAt: string | null | undefined;
    scanPeriodEndsAt: string | null | undefined;
  },
  options?: { now?: Date }
): ScanEntitlements {
  const now = options?.now ?? new Date();

  const tier = normalizeTier(input.membership);

  const freeScansUsed = clampNonNeg(input.freeScansUsed ?? 0);
  const memberScansUsedRaw = clampNonNeg(input.memberScansUsed ?? 0);
  const topupScansAvailable = clampNonNeg(input.topupScansAvailable ?? 0);

  const scanPeriodStartedAt = input.scanPeriodStartedAt ?? null;
  const scanPeriodEndsAt = input.scanPeriodEndsAt ?? null;

  const freeScansRemaining =
    tier === "free"
      ? Math.max(0, FREE_LIFETIME_SCANS - freeScansUsed)
      : 0;

  if (tier === "pro") {
    return {
      tier,
      freeScansUsed,
      memberScansUsed: memberScansUsedRaw,
      topupScansAvailable,
      memberScansIncluded: 0,
      memberScansRemaining: 0,
      freeScansRemaining,
      canScan: true,
      shouldUseTopup: false,
      isUnlimited: true,
      scanPeriodStartedAt,
      scanPeriodEndsAt,
    };
  }

  if (tier === "member") {
    const effectiveUsed = effectiveMemberScansUsed(
      now,
      scanPeriodEndsAt,
      memberScansUsedRaw
    );
    const memberScansRemaining = Math.max(
      0,
      MEMBER_INCLUDED_SCANS_PER_PERIOD - effectiveUsed
    );

    const canScan =
      memberScansRemaining > 0 || topupScansAvailable > 0;

    const shouldUseTopup =
      canScan &&
      topupScansAvailable > 0 &&
      memberScansRemaining === 0;

    return {
      tier,
      freeScansUsed,
      memberScansUsed: memberScansUsedRaw,
      topupScansAvailable,
      memberScansIncluded: MEMBER_INCLUDED_SCANS_PER_PERIOD,
      memberScansRemaining,
      freeScansRemaining,
      canScan,
      shouldUseTopup,
      isUnlimited: false,
      scanPeriodStartedAt,
      scanPeriodEndsAt,
    };
  }

  const canScan =
    freeScansRemaining > 0 || topupScansAvailable > 0;

  const shouldUseTopup =
    canScan &&
    topupScansAvailable > 0 &&
    freeScansRemaining === 0;

  return {
    tier,
    freeScansUsed,
    memberScansUsed: memberScansUsedRaw,
    topupScansAvailable,
    memberScansIncluded: 0,
    memberScansRemaining: 0,
    freeScansRemaining,
    canScan,
    shouldUseTopup,
    isUnlimited: false,
    scanPeriodStartedAt,
    scanPeriodEndsAt,
  };
}

export type ConsumedFrom = "free" | "member" | "topup" | "pro";

const MS_PER_30_DAYS = 30 * 24 * 60 * 60 * 1000;

export function computeNewMemberPeriodBounds(now: Date): {
  scan_period_started_at: string;
  scan_period_ends_at: string;
} {
  const start = now.toISOString();
  const end = new Date(now.getTime() + MS_PER_30_DAYS).toISOString();
  return {
    scan_period_started_at: start,
    scan_period_ends_at: end,
  };
}
