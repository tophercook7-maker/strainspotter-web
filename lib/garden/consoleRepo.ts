import { createServerClient } from "@/app/_server/supabase/server";
import { getPublicGardenId } from "@/lib/garden/getPublicGardenId";
import { listPlants, getPlantTaskDueCounts } from "@/lib/plants/plantsRepo";
import type { PlantWithLogCount } from "@/lib/plants/plantsRepo";

type ConsoleCounts = {
  activePlants: number;
  pausedPlants: number;
  harvestedPlants: number;
  archivedPlants: number;
  totalPlants: number;
};

export type GardenConsoleSnapshot = {
  gardenId: string;
  counts: ConsoleCounts;
  dueToday: number;
  overdue: number;
  latestSensor: null | {
    occurred_at: string;
    source: string;
    metrics: Record<string, unknown>;
  };
  cycle: {
    totalCostUsd: number;
    mostRecentHarvestDryG: number | null;
    costPerGramUsd: number | null;
  };
  updatedAtIso: string;
};

function safeNum(v: unknown): number | null {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

export async function getGardenConsoleSnapshot(): Promise<GardenConsoleSnapshot> {
  const supabase = createServerClient();
  const gardenId = await getPublicGardenId();

  // Plants (already returns log_count, last_activity_at, harvest_dry_weight_g, total_cost_usd)
  const plants = await listPlants({ gardenId }).catch(() => []);
  const counts: ConsoleCounts = {
    activePlants: plants.filter((p) => (p.status || "").toLowerCase() === "active").length,
    pausedPlants: plants.filter((p) => (p.status || "").toLowerCase() === "paused").length,
    harvestedPlants: plants.filter((p) => (p.status || "").toLowerCase() === "harvested").length,
    archivedPlants: plants.filter((p) => (p.status || "").toLowerCase() === "archived").length,
    totalPlants: plants.length,
  };

  // Task counts (garden-wide derived from the plants list)
  const plantIds = plants.map((p) => p.id);
  const taskCounts = plantIds.length
    ? await getPlantTaskDueCounts(plantIds, new Date().toISOString()).catch(() => ({} as Record<string, { overdue: number; dueToday: number }>))
    : ({} as Record<string, { overdue: number; dueToday: number }>);

  let dueToday = 0;
  let overdue = 0;
  for (const id of plantIds) {
    const c = taskCounts[id];
    if (!c) continue;
    dueToday += c.dueToday || 0;
    overdue += c.overdue || 0;
  }

  // Latest sensor/peripheral reading (garden-wide)
  const { data: latestSensorRow } = await supabase
    .from("garden_sensor_readings")
    .select("occurred_at, source, metrics")
    .eq("garden_id", gardenId)
    .order("occurred_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const latestSensor = latestSensorRow
    ? {
        occurred_at: String(latestSensorRow.occurred_at),
        source: String(latestSensorRow.source ?? "manual"),
        metrics: (latestSensorRow.metrics ?? {}) as Record<string, unknown>,
      }
    : null;

  // Cycle finance (sum costs across plants list; harvest from most recent harvested plant if available)
  let totalCostUsd = 0;
  for (const p of plants) {
    const c = safeNum((p as PlantWithLogCount).total_cost_usd);
    if (c != null) totalCostUsd += c;
  }

  // Most recent harvest dry grams from harvested plants (take max created_at/last_activity? we only have merged dry weight; approximate by picking first harvested with weight)
  const harvestedWithWeight = plants
    .filter((p) => (p.status || "").toLowerCase() === "harvested")
    .map((p) => ({
      p,
      g: safeNum((p as PlantWithLogCount).harvest_dry_weight_g),
      ts: Date.parse(String((p as PlantWithLogCount).last_activity_at ?? p.created_at ?? "")) || 0,
    }))
    .filter((x) => x.g != null)
    .sort((a, b) => b.ts - a.ts);

  const mostRecentHarvestDryG = harvestedWithWeight.length ? (harvestedWithWeight[0].g as number) : null;

  const costPerGramUsd =
    mostRecentHarvestDryG != null && mostRecentHarvestDryG > 0 ? Number((totalCostUsd / mostRecentHarvestDryG).toFixed(2)) : null;

  return {
    gardenId,
    counts,
    dueToday,
    overdue,
    latestSensor,
    cycle: {
      totalCostUsd: Number(totalCostUsd.toFixed(2)),
      mostRecentHarvestDryG,
      costPerGramUsd,
    },
    updatedAtIso: new Date().toISOString(),
  };
}
