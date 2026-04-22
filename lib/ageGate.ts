const STORAGE_KEY = "ss_age_verified";

interface AgeVerificationPayload {
  verified: true;
  timestamp: number;
  version: 2;
}

function canUseStorage() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

export function isAgeVerified(): boolean {
  if (!canUseStorage()) return false;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;

    const parsed = JSON.parse(raw);
    return parsed?.verified === true;
  } catch {
    return false;
  }
}

export function verifyAge(): boolean {
  if (!canUseStorage()) return false;

  try {
    const payload: AgeVerificationPayload = {
      verified: true,
      timestamp: Date.now(),
      version: 2,
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

export function clearAgeVerification(): void {
  if (!canUseStorage()) return;
  localStorage.removeItem(STORAGE_KEY);
}
