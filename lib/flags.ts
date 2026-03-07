// lib/flags.ts

export type FeatureFlag = 'free_tier' | 'paid_tier';

// Simple in-memory flag state for now. 
// In a real app, this might come from Supabase, LaunchDarkly, etc.
const FLAGS: Record<FeatureFlag, boolean> = {
  free_tier: true, // Always on for now
  paid_tier: false, // Off by default, enable via logic later
};

export function isFeatureEnabled(flag: FeatureFlag): boolean {
  return FLAGS[flag];
}

// Helper to determine tier based on user state (placeholder)
// This aligns with lib/monetization/guard.ts
export function getUserTierFlags(userId?: string): Record<FeatureFlag, boolean> {
  // TODO: Connect to real auth/subscription logic
  // For now, everyone gets free_tier features
  return {
    free_tier: true,
    paid_tier: false, // Change to true to test paid features
  };
}
