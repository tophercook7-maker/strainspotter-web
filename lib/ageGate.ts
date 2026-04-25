const STORAGE_KEY = "ss_age_verified";

interface AgeVerificationPayload {
  verified: true;
  timestamp: number;
  version: 2;
}

function getStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function isAgeVerified(): boolean {
  try {
    const storage = getStorage();
    if (!storage) return false;

    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return false;

    const parsed = JSON.parse(raw);
    return parsed?.verified === true;
  } catch {
    return false;
  }
}

export function verifyAge(): boolean {
  try {
    const storage = getStorage();
    if (!storage) return false;

    const payload: AgeVerificationPayload = {
      verified: true,
      timestamp: Date.now(),
      version: 2,
    };

    storage.setItem(STORAGE_KEY, JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

export function clearAgeVerification(): void {
  try {
    getStorage()?.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
