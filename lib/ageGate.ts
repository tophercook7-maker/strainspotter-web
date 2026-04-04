// lib/ageGate.ts — 21+ age verification with localStorage persistence

const AGE_GATE_KEY = "ss_age_verified";

export function isAgeVerified(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const stored = localStorage.getItem(AGE_GATE_KEY);
    if (!stored) return false;
    const parsed = JSON.parse(stored);
    return parsed?.verified === true && parsed?.dob;
  } catch {
    return false;
  }
}

export function verifyAge(dob: string): { verified: boolean; age: number } {
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  if (age >= 21) {
    if (typeof window !== "undefined") {
      localStorage.setItem(
        AGE_GATE_KEY,
        JSON.stringify({ verified: true, dob, timestamp: Date.now() })
      );
    }
    return { verified: true, age };
  }

  return { verified: false, age };
}

export function clearAgeVerification(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(AGE_GATE_KEY);
  }
}
