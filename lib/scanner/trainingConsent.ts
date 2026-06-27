// lib/scanner/trainingConsent.ts
//
// Single source of truth for the user's opt-in to contribute confirmed scan
// photos as labeled training data (the image side of the flywheel). Reads the
// same localStorage prefs the Settings page writes. Off by default (opt-in).
//
// The scanner's confirm/correct flow should call hasTrainingConsent() and, when
// true, POST { photoConsent: true, trainingImageBase64 } to /api/scan/feedback.

const PREFS_KEY = "strainspotter_settings";

export function hasTrainingConsent(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    return raw ? JSON.parse(raw)?.trainingContribution === true : false;
  } catch {
    return false;
  }
}

export function setTrainingConsent(on: boolean): void {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    const prefs = raw ? JSON.parse(raw) : {};
    prefs.trainingContribution = on;
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    /* localStorage unavailable — non-fatal */
  }
}
