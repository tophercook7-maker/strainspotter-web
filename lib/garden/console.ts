import { createServerClient } from "@/app/_server/supabase/server";
import { getPublicGardenId } from "@/lib/garden/getPublicGardenId";
import { listPlants, getPlantTaskDueCounts } from "@/lib/plants/plantsRepo";

export type GardenConsoleSummary = {
  plants: { active: number; total: number };
  tasks: { overdue: number; dueToday: number };
  readings: {
    temperature: number | null;
    relative_humidity: number | null;
    acidity_ph: number | null;
  };
};

/**
 * Server-only. Used by Garden Console page (SSR) and GET /api/garden/console.
 * One listPlants, one getPlantTaskDueCounts, one env query — no N+1.
 */
export async function getGardenConsoleSummary(): Promise<GardenConsoleSummary> {
  const gardenId = await getPublicGardenId();
  const supabase = createServerClient();

  const plants = await listPlants({ gardenId });
  const total = plants.length;
  const active = plants.filter((p) => (p.status ?? "").toLowerCase() === "active").length;
  const plantIds = plants.map((p) => p.id);
  const nowIso = new Date().toISOString();
  const taskCounts =
    plantIds.length > 0
      ? await getPlantTaskDueCounts(plantIds, nowIso)
      : {};
  let overdue = 0;
  let dueToday = 0;
  for (const id of plantIds) {
    const t = taskCounts[id];
    if (t) {
      overdue += t.overdue;
      dueToday += t.dueToday;
    }
  }

  let temperature: number | null = null;
  let relative_humidity: number | null = null;
  const { data: latestEnv } = await supabase
    .from("plant_environment_readings")
    .select("temp_f, rh")
    .eq("garden_id", gardenId)
    .order("occurred_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (latestEnv) {
    const t = Number((latestEnv as { temp_f: number }).temp_f);
    const r = Number((latestEnv as { rh: number }).rh);
    if (Number.isFinite(t)) temperature = t;
    if (Number.isFinite(r)) relative_humidity = r;
  }

  return {
    plants: { active, total },
    tasks: { overdue, dueToday },
    readings: {
      temperature,
      relative_humidity,
      acidity_ph: null,
    },
  };
}
