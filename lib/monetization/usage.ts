export type FeatureKey = "id_scan" | "doctor_scan";

export type UsageState = {
  monthKey: string; // e.g. "2026-01"
  used: Record<FeatureKey, number>;
};

const STORAGE_KEY = "ss_usage_v1";

function getMonthKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export function loadUsage(): UsageState {
  const monthKey = getMonthKey();

  if (typeof window === "undefined") {
    return { monthKey, used: { id_scan: 0, doctor_scan: 0 } };
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { monthKey, used: { id_scan: 0, doctor_scan: 0 } };

    const parsed = JSON.parse(raw) as Partial<UsageState>;

    // reset monthly (no rollover)
    if (parsed.monthKey !== monthKey) {
      return { monthKey, used: { id_scan: 0, doctor_scan: 0 } };
    }

    return {
      monthKey,
      used: {
        id_scan: parsed.used?.id_scan ?? 0,
        doctor_scan: parsed.used?.doctor_scan ?? 0,
      },
    };
  } catch {
    return { monthKey, used: { id_scan: 0, doctor_scan: 0 } };
  }
}

export function saveUsage(state: UsageState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore storage failures
  }
}

export function incrementUsage(feature: FeatureKey, amount = 1) {
  const state = loadUsage();
  state.used[feature] = (state.used[feature] ?? 0) + amount;
  saveUsage(state);
  return state;
}
