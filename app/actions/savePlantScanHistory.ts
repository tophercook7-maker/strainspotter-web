"use server";

// Save a Plant Doctor scan to the scans history table. The table already had
// plant_age (text) + plant_health (jsonb) columns waiting for exactly this.
// Non-blocking by contract: a history failure must never break the scan flow.

import { createServerClient } from "../_server/supabase/server";

export async function savePlantScanHistory(input: {
  userId: string | null;
  stageLabel: string;
  healthScore: number;
  ageLabel: string | null;
  result: Record<string, unknown>;
}): Promise<void> {
  try {
    const supabase = createServerClient();
    await supabase.from("scans").insert({
      user_id: input.userId,
      primary_name: `🩺 Plant Doctor — ${input.stageLabel}`,
      confidence: input.healthScore,
      plant_age: input.ageLabel,
      plant_health: { healthScore: input.healthScore },
      result: { schemaVersion: "plant-doctor-v2", plantDoctor: input.result },
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    console.warn("Plant scan history save skipped:", err);
  }
}
