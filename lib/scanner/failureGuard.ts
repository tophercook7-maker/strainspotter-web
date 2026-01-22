// Phase 4.1.3 — FAILURE REMOVAL (NO HARD FAILS)
// lib/scanner/failureGuard.ts

export function guardAgainstFailure<T>(value: T | null, fallback: T): T {
  return value ?? fallback
}
