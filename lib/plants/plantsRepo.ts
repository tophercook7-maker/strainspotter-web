import { createServerClient } from "@/app/_server/supabase/server";
import { getPublicGardenId } from "@/lib/garden/getPublicGardenId";

export type Plant = {
  id: string;
  user_id: string | null;
  garden_id: string;
  name: string;
  strain_name: string | null;
  status: string;
  created_at: string;
  cover_image_url: string | null;
};

export type PlantLog = {
  id: string;
  plant_id: string;
  garden_id: string;
  user_id: string | null;
  kind: string;
  note: string;
  occurred_at: string;
  created_at: string;
};

export type PlantEnvReading = {
  id: string;
  plant_id: string;
  garden_id: string;
  temp_f: number;
  rh: number;
  vpd: number | null;
  note: string | null;
  occurred_at: string;
  created_at: string;
};

export type PlantTask = {
  id: string;
  plant_id: string;
  garden_id: string;
  kind: string;
  title: string;
  notes: string | null;
  due_at: string;
  completed_at: string | null;
  created_at: string;
};

export type PlantHarvest = {
  id: string;
  plant_id: string;
  garden_id: string;
  dry_weight_g: number;
  wet_weight_g: number | null;
  notes: string | null;
  harvested_at: string;
  created_at: string;
};

export type PlantInput = {
  id: string;
  plant_id: string;
  garden_id: string;
  kind: string;
  name: string;
  amount: string | null;
  cost_usd: number;
  note: string | null;
  occurred_at: string;
  created_at: string;
};

/** Plant with log count and last activity for list views (from listPlants). May include harvest_dry_weight_g and total_cost_usd. */
export type PlantWithLogCount = Plant & {
  log_count: number;
  last_activity_at: string | null;
  harvest_dry_weight_g?: number | null;
  total_cost_usd?: number | null;
};

export async function listPlants(options: {
  gardenId?: string;
  status?: string;
}): Promise<PlantWithLogCount[]> {
  const supabase = createServerClient();
  const gardenId = options.gardenId ?? (await getPublicGardenId(supabase));

  let q = supabase
    .from("plants")
    .select("id, user_id, garden_id, name, strain_name, status, created_at, cover_image_url, plant_logs(count)")
    .eq("garden_id", gardenId)
    .order("created_at", { ascending: false })
    .limit(200);

  if (options.status) {
    q = q.eq("status", options.status);
  }

  const { data, error } = await q;

  if (error) {
    return listPlantsWithLogCountFallback(supabase, gardenId, options.status);
  }

  const plantsWithCount = (data ?? []).map((row: Record<string, unknown>) => {
    const { plant_logs, ...plant } = row;
    let logCount = 0;
    if (Array.isArray(plant_logs) && plant_logs[0] != null && typeof (plant_logs[0] as { count?: number }).count === "number") {
      logCount = (plant_logs[0] as { count: number }).count;
    } else if (plant_logs != null && typeof (plant_logs as { count?: number }).count === "number") {
      logCount = (plant_logs as { count: number }).count;
    }
    return { ...plant, log_count: logCount, last_activity_at: null as string | null } as PlantWithLogCount;
  });

  const withActivity = await mergeLastActivityAt(supabase, plantsWithCount);
  const withHarvest = await mergeHarvestDryWeight(supabase, withActivity);
  return mergeTotalCost(supabase, withHarvest);
}

async function mergeLastActivityAt(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  plants: PlantWithLogCount[]
): Promise<PlantWithLogCount[]> {
  const plantIds = plants.map((p) => p.id);
  if (plantIds.length === 0) return plants;
  const { data: logs, error } = await supabase
    .from("plant_logs")
    .select("plant_id, occurred_at")
    .in("plant_id", plantIds)
    .order("occurred_at", { ascending: false });
  if (error) return plants;
  const lastByPlantId: Record<string, string> = {};
  for (const row of (logs ?? []) as { plant_id: string; occurred_at: string }[]) {
    if (lastByPlantId[row.plant_id] == null) lastByPlantId[row.plant_id] = row.occurred_at;
  }
  return plants.map((p) => ({
    ...p,
    last_activity_at: lastByPlantId[p.id] ?? null,
  }));
}

async function mergeHarvestDryWeight(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  plants: PlantWithLogCount[]
): Promise<PlantWithLogCount[]> {
  const plantIds = plants.map((p) => p.id);
  if (plantIds.length === 0) return plants;
  const { data, error } = await supabase
    .from("plant_harvests")
    .select("plant_id, dry_weight_g")
    .in("plant_id", plantIds);
  if (error) return plants;
  const dryByPlantId: Record<string, number> = {};
  for (const row of (data ?? []) as { plant_id: string; dry_weight_g: number }[]) {
    dryByPlantId[row.plant_id] = Number(row.dry_weight_g);
  }
  return plants.map((p) => ({
    ...p,
    harvest_dry_weight_g: dryByPlantId[p.id] ?? null,
  }));
}

async function mergeTotalCost(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  plants: PlantWithLogCount[]
): Promise<PlantWithLogCount[]> {
  const plantIds = plants.map((p) => p.id);
  if (plantIds.length === 0) return plants;
  const { data, error } = await supabase
    .from("plant_inputs")
    .select("plant_id, cost_usd")
    .in("plant_id", plantIds);
  if (error) return plants;
  const totalByPlantId: Record<string, number> = {};
  for (const row of (data ?? []) as { plant_id: string; cost_usd: number }[]) {
    const n = Number(row.cost_usd);
    if (!Number.isFinite(n)) continue;
    totalByPlantId[row.plant_id] = (totalByPlantId[row.plant_id] ?? 0) + n;
  }
  return plants.map((p) => ({
    ...p,
    total_cost_usd: totalByPlantId[p.id] ?? null,
  }));
}

async function listPlantsWithLogCountFallback(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  gardenId: string,
  status?: string
): Promise<PlantWithLogCount[]> {
  let q = supabase
    .from("plants")
    .select("id, user_id, garden_id, name, strain_name, status, created_at, cover_image_url")
    .eq("garden_id", gardenId)
    .order("created_at", { ascending: false })
    .limit(200);
  if (status) q = q.eq("status", status);
  const { data: plants, error: plantsError } = await q;
  if (plantsError || !plants) return [];
  const plantIds = (plants as Plant[]).map((p) => p.id);
  const { data: logs, error: logsError } = await supabase
    .from("plant_logs")
    .select("plant_id, occurred_at")
    .in("plant_id", plantIds)
    .order("occurred_at", { ascending: false });
  if (logsError) {
    return (plants as Plant[]).map((p) => ({ ...p, log_count: 0, last_activity_at: null }));
  }
  const countByPlantId: Record<string, number> = {};
  const lastByPlantId: Record<string, string> = {};
  for (const row of (logs ?? []) as { plant_id: string; occurred_at: string }[]) {
    countByPlantId[row.plant_id] = (countByPlantId[row.plant_id] ?? 0) + 1;
    if (lastByPlantId[row.plant_id] == null) lastByPlantId[row.plant_id] = row.occurred_at;
  }
  const withCount = (plants as Plant[]).map((p) => ({
    ...p,
    log_count: countByPlantId[p.id] ?? 0,
    last_activity_at: lastByPlantId[p.id] ?? null,
  })) as PlantWithLogCount[];
  const withHarvest = await mergeHarvestDryWeight(supabase, withCount);
  return mergeTotalCost(supabase, withHarvest);
}

export async function createPlant(params: {
  gardenId?: string;
  name: string;
  strain_name?: string | null;
  status?: string;
  cover_image_url?: string | null;
}): Promise<Plant | null> {
  const supabase = createServerClient();
  const gardenId = params.gardenId ?? (await getPublicGardenId(supabase));

  const row: Record<string, unknown> = {
    garden_id: gardenId,
    name: params.name.trim(),
    strain_name: params.strain_name?.trim() || null,
    status: params.status ?? "active",
  };
  if (params.cover_image_url != null && params.cover_image_url !== "") {
    row.cover_image_url = params.cover_image_url;
  }

  const { data, error } = await supabase
    .from("plants")
    .insert(row)
    .select("id, user_id, garden_id, name, strain_name, status, created_at, cover_image_url")
    .single();

  if (error) {
    console.error("createPlant:", error);
    return null;
  }
  return data as Plant;
}

export async function getPlantById(id: string): Promise<Plant | null> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("plants")
    .select("id, user_id, garden_id, name, strain_name, status, created_at, cover_image_url")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  return data as Plant;
}

export async function getPlantHarvest(plantId: string): Promise<PlantHarvest | null> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("plant_harvests")
    .select("id, plant_id, garden_id, dry_weight_g, wet_weight_g, notes, harvested_at, created_at")
    .eq("plant_id", plantId)
    .maybeSingle();
  if (error) {
    console.error("getPlantHarvest:", error);
    return null;
  }
  return data as PlantHarvest | null;
}

export async function upsertPlantHarvest(params: {
  plantId: string;
  gardenId: string;
  dry_weight_g: number;
  wet_weight_g?: number | null;
  notes?: string | null;
}): Promise<PlantHarvest | null> {
  const dry = Number(params.dry_weight_g);
  if (!Number.isFinite(dry) || dry < 0) return null;
  const supabase = createServerClient();
  const row: Record<string, unknown> = {
    plant_id: params.plantId,
    garden_id: params.gardenId,
    dry_weight_g: dry,
    harvested_at: new Date().toISOString(),
  };
  if (params.wet_weight_g != null && Number.isFinite(Number(params.wet_weight_g))) {
    row.wet_weight_g = Number(params.wet_weight_g);
  }
  if (params.notes != null && params.notes.trim() !== "") {
    row.notes = params.notes.trim();
  }
  const { data, error } = await supabase
    .from("plant_harvests")
    .upsert(row, { onConflict: "plant_id" })
    .select("id, plant_id, garden_id, dry_weight_g, wet_weight_g, notes, harvested_at, created_at")
    .single();
  if (error) {
    console.error("upsertPlantHarvest:", error);
    return null;
  }
  return data as PlantHarvest;
}

const ALLOWED_STATUSES = ["active", "paused", "harvested", "archived"] as const;

export async function updatePlantStatus(params: {
  plantId: string;
  status: string;
}): Promise<{ id: string; status: string }> {
  const status = params.status.toLowerCase().trim();
  if (!ALLOWED_STATUSES.includes(status as (typeof ALLOWED_STATUSES)[number])) {
    throw new Error("invalid_status");
  }
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("plants")
    .update({ status })
    .eq("id", params.plantId)
    .select("id, status")
    .single();

  if (error) {
    console.error("updatePlantStatus:", error);
    throw new Error("update_failed");
  }
  return data as { id: string; status: string };
}

/** Build note text for status-change system log (exact strings per transition). */
function statusChangeNoteLabel(newStatus: string): string {
  const s = newStatus.toLowerCase();
  if (s === "active") return "Active";
  if (s === "paused") return "Paused";
  if (s === "harvested") return "Harvested";
  if (s === "archived") return "Archived";
  return newStatus.charAt(0).toUpperCase() + newStatus.slice(1).toLowerCase();
}

/** Create a plant_log row for a status change (used by updatePlantStatusAction). Note: "Status changed: <Old> → <New>". occurred_at = now(). */
export async function createSystemLogForStatusChange(
  plantId: string,
  gardenId: string,
  oldStatus: string,
  newStatus: string
): Promise<PlantLog | null> {
  const note = `Status changed: ${statusChangeNoteLabel(oldStatus)} → ${statusChangeNoteLabel(newStatus)}`;
  return createPlantLog({ plantId, gardenId, kind: "note", note });
}

export async function listPlantLogs(
  plantId: string,
  kind?: string,
  limit?: number
): Promise<PlantLog[]> {
  const supabase = createServerClient();
  let q = supabase
    .from("plant_logs")
    .select("id, plant_id, garden_id, user_id, kind, note, occurred_at, created_at")
    .eq("plant_id", plantId)
    .order("occurred_at", { ascending: false });
  if (kind != null && kind !== "" && kind !== "all") {
    q = q.eq("kind", kind);
  }
  if (limit != null && limit > 0) {
    q = q.limit(limit);
  }
  const { data, error } = await q;
  if (error) {
    console.error("listPlantLogs:", error);
    return [];
  }
  return (data ?? []) as PlantLog[];
}

export async function createPlantLog(params: {
  plantId: string;
  gardenId?: string;
  kind: string;
  note: string;
  occurred_at?: string | null;
}): Promise<PlantLog | null> {
  const plant = await getPlantById(params.plantId);
  if (!plant) {
    throw new Error("plant_not_found");
  }

  const gardenId = params.gardenId ?? plant.garden_id;
  if (params.gardenId != null && params.gardenId !== plant.garden_id) {
    throw new Error("garden_id_mismatch");
  }

  const supabase = createServerClient();
  const occurredAt = params.occurred_at?.trim()
    ? new Date(params.occurred_at).toISOString()
    : new Date().toISOString();

  const { data, error } = await supabase
    .from("plant_logs")
    .insert({
      plant_id: params.plantId,
      garden_id: gardenId,
      kind: params.kind,
      note: params.note.trim(),
      occurred_at: occurredAt,
    })
    .select("id, plant_id, garden_id, user_id, kind, note, occurred_at, created_at")
    .single();

  if (error) {
    console.error("createPlantLog:", error);
    return null;
  }
  return data as PlantLog;
}

export async function getLatestPlantEnvReading(plantId: string): Promise<PlantEnvReading | null> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("plant_environment_readings")
    .select("id, plant_id, garden_id, temp_f, rh, vpd, note, occurred_at, created_at")
    .eq("plant_id", plantId)
    .order("occurred_at", { ascending: false })
    .limit(1);
  if (error) {
    console.error("getLatestPlantEnvReading:", error);
    return null;
  }
  const row = data?.[0];
  return row ? (row as PlantEnvReading) : null;
}

export async function createPlantEnvReading(params: {
  plantId: string;
  gardenId: string;
  temp_f: number;
  rh: number;
  vpd?: number | null;
  note?: string | null;
  occurred_at?: string | null;
}): Promise<PlantEnvReading | null> {
  if (
    typeof params.temp_f !== "number" ||
    !Number.isFinite(params.temp_f) ||
    typeof params.rh !== "number" ||
    !Number.isFinite(params.rh)
  ) {
    return null;
  }
  const occurredAt = params.occurred_at?.trim()
    ? new Date(params.occurred_at).toISOString()
    : new Date().toISOString();
  const supabase = createServerClient();
  const row: Record<string, unknown> = {
    plant_id: params.plantId,
    garden_id: params.gardenId,
    temp_f: params.temp_f,
    rh: params.rh,
    occurred_at: occurredAt,
  };
  if (params.vpd != null && Number.isFinite(params.vpd)) {
    row.vpd = params.vpd;
  }
  if (params.note != null && params.note !== "") {
    row.note = params.note.trim();
  }
  const { data, error } = await supabase
    .from("plant_environment_readings")
    .insert(row)
    .select("id, plant_id, garden_id, temp_f, rh, vpd, note, occurred_at, created_at")
    .single();
  if (error) {
    console.error("createPlantEnvReading:", error);
    return null;
  }
  return data as PlantEnvReading;
}

export async function getPlantTaskById(taskId: string): Promise<PlantTask | null> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("plant_tasks")
    .select("id, plant_id, garden_id, kind, title, notes, due_at, completed_at, created_at")
    .eq("id", taskId)
    .maybeSingle();
  if (error) {
    console.error("getPlantTaskById:", error);
    return null;
  }
  return data as PlantTask | null;
}

export async function hasOpenTaskNearDueAt(
  plantId: string,
  kind: string,
  dueAtIso: string,
  windowHours = 12
): Promise<boolean> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("plant_tasks")
    .select("due_at")
    .eq("plant_id", plantId)
    .eq("kind", kind.toLowerCase())
    .is("completed_at", null)
    .limit(20);
  if (error) {
    console.error("hasOpenTaskNearDueAt:", error);
    return true;
  }
  const target = new Date(dueAtIso).getTime();
  const windowMs = windowHours * 60 * 60 * 1000;
  for (const row of (data ?? []) as { due_at: string }[]) {
    const due = new Date(row.due_at).getTime();
    if (Math.abs(due - target) <= windowMs) return true;
  }
  return false;
}

export async function listOpenPlantTasks(
  plantId: string,
  limit = 50
): Promise<PlantTask[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("plant_tasks")
    .select("id, plant_id, garden_id, kind, title, notes, due_at, completed_at, created_at")
    .eq("plant_id", plantId)
    .is("completed_at", null)
    .order("due_at", { ascending: true })
    .limit(limit);
  if (error) {
    console.error("listOpenPlantTasks:", error);
    return [];
  }
  return (data ?? []) as PlantTask[];
}

export async function createPlantTask(params: {
  plantId: string;
  gardenId: string;
  kind: string;
  title: string;
  notes?: string | null;
  due_at: string;
}): Promise<PlantTask | null> {
  const title = params.title?.trim();
  if (!title) return null;
  const dueAt = params.due_at?.trim();
  if (!dueAt) return null;
  const dueDate = new Date(dueAt);
  if (Number.isNaN(dueDate.getTime())) return null;

  const supabase = createServerClient();
  const row: Record<string, unknown> = {
    plant_id: params.plantId,
    garden_id: params.gardenId,
    kind: (params.kind?.trim() || "note").toLowerCase(),
    title,
    due_at: dueDate.toISOString(),
  };
  if (params.notes != null && params.notes !== "") {
    row.notes = params.notes.trim();
  }
  const { data, error } = await supabase
    .from("plant_tasks")
    .insert(row)
    .select("id, plant_id, garden_id, kind, title, notes, due_at, completed_at, created_at")
    .single();
  if (error) {
    console.error("createPlantTask:", error);
    return null;
  }
  return data as PlantTask;
}

export async function completePlantTask(taskId: string): Promise<boolean> {
  const supabase = createServerClient();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("plant_tasks")
    .update({ completed_at: now })
    .eq("id", taskId)
    .select("id")
    .single();
  if (error) {
    console.error("completePlantTask:", error);
    return false;
  }
  return true;
}

export async function createPlantTasksBulk(
  rows: Array<{
    plant_id: string;
    garden_id: string;
    kind: string;
    title: string;
    notes?: string | null;
    due_at: string;
  }>
): Promise<number> {
  if (rows.length === 0) return 0;
  const supabase = createServerClient();
  const payload = rows.map((r) => ({
    plant_id: r.plant_id,
    garden_id: r.garden_id,
    kind: (r.kind || "note").toLowerCase(),
    title: r.title.trim(),
    notes: r.notes != null && r.notes !== "" ? r.notes.trim() : null,
    due_at: new Date(r.due_at).toISOString(),
  }));
  const { data, error } = await supabase.from("plant_tasks").insert(payload).select("id");
  if (error) {
    console.error("createPlantTasksBulk:", error);
    return 0;
  }
  return (data ?? []).length;
}

export async function getPlantTaskDueCounts(
  plantIds: string[],
  nowIso: string
): Promise<Record<string, { overdue: number; dueToday: number }>> {
  const result: Record<string, { overdue: number; dueToday: number }> = {};
  for (const id of plantIds) {
    result[id] = { overdue: 0, dueToday: 0 };
  }
  if (plantIds.length === 0) return result;

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("plant_tasks")
    .select("plant_id, due_at")
    .in("plant_id", plantIds)
    .is("completed_at", null);
  if (error) {
    console.error("getPlantTaskDueCounts:", error);
    return result;
  }

  const now = new Date(nowIso);
  const startOfToday = new Date(now);
  startOfToday.setUTCHours(0, 0, 0, 0);
  const endOfToday = new Date(now);
  endOfToday.setUTCHours(23, 59, 59, 999);

  for (const row of (data ?? []) as { plant_id: string; due_at: string }[]) {
    const due = new Date(row.due_at);
    if (Number.isNaN(due.getTime())) continue;
    const entry = result[row.plant_id];
    if (!entry) continue;
    if (due < now) {
      entry.overdue += 1;
    } else if (due >= startOfToday && due <= endOfToday) {
      entry.dueToday += 1;
    }
  }
  return result;
}

export async function listPlantInputs(
  plantId: string,
  limit = 10
): Promise<PlantInput[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("plant_inputs")
    .select("id, plant_id, garden_id, kind, name, amount, cost_usd, note, occurred_at, created_at")
    .eq("plant_id", plantId)
    .order("occurred_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("listPlantInputs:", error);
    return [];
  }
  return (data ?? []) as PlantInput[];
}

export async function getPlantTotalCost(plantId: string): Promise<number> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("plant_inputs")
    .select("cost_usd")
    .eq("plant_id", plantId);
  if (error) {
    console.error("getPlantTotalCost:", error);
    return 0;
  }
  let sum = 0;
  for (const row of (data ?? []) as { cost_usd: number }[]) {
    const n = Number(row.cost_usd);
    if (Number.isFinite(n)) sum += n;
  }
  return sum;
}

export async function createPlantInput(params: {
  plantId: string;
  gardenId: string;
  kind: string;
  name: string;
  cost_usd: number;
  amount?: string | null;
  note?: string | null;
  occurred_at?: string | null;
}): Promise<PlantInput | null> {
  const name = params.name?.trim();
  if (!name) return null;
  const cost = Number(params.cost_usd);
  if (!Number.isFinite(cost) || cost < 0) return null;

  const supabase = createServerClient();
  const occurredAt = params.occurred_at?.trim()
    ? new Date(params.occurred_at).toISOString()
    : new Date().toISOString();
  const row: Record<string, unknown> = {
    plant_id: params.plantId,
    garden_id: params.gardenId,
    kind: (params.kind?.trim() || "other").toLowerCase(),
    name,
    cost_usd: cost,
    occurred_at: occurredAt,
  };
  if (params.amount != null && params.amount.trim() !== "") {
    row.amount = params.amount.trim();
  }
  if (params.note != null && params.note.trim() !== "") {
    row.note = params.note.trim();
  }
  const { data, error } = await supabase
    .from("plant_inputs")
    .insert(row)
    .select("id, plant_id, garden_id, kind, name, amount, cost_usd, note, occurred_at, created_at")
    .single();
  if (error) {
    console.error("createPlantInput:", error);
    return null;
  }
  return data as PlantInput;
}

export type PlantTimelineItem = {
  id: string;
  ts: string;
  kind: "log" | "task" | "input" | "env" | "harvest";
  badge: string;
  title: string;
  subtitle?: string | null;
};

/** Unified timeline: 5 queries (logs, tasks, inputs, env, harvest), merge and sort by ts desc, return top limit. */
export async function getPlantTimeline(
  plantId: string,
  limit = 25
): Promise<PlantTimelineItem[]> {
  const supabase = createServerClient();
  const items: PlantTimelineItem[] = [];

  const { data: logs } = await supabase
    .from("plant_logs")
    .select("id, kind, note, occurred_at")
    .eq("plant_id", plantId)
    .order("occurred_at", { ascending: false })
    .limit(15);
  for (const row of (logs ?? []) as { id: string; kind: string; note: string; occurred_at: string }[]) {
    items.push({
      id: `log-${row.id}`,
      ts: row.occurred_at,
      kind: "log",
      badge: (row.kind || "note").toUpperCase(),
      title: (row.note || "").slice(0, 80),
      subtitle: null,
    });
  }

  const { data: tasks } = await supabase
    .from("plant_tasks")
    .select("id, title, created_at, completed_at")
    .eq("plant_id", plantId)
    .order("created_at", { ascending: false })
    .limit(15);
  for (const row of (tasks ?? []) as { id: string; title: string; created_at: string; completed_at: string | null }[]) {
    const title = (row.title || "").slice(0, 60);
    items.push({
      id: `task-created-${row.id}`,
      ts: row.created_at,
      kind: "task",
      badge: "TASK",
      title: `Task created: ${title}`,
      subtitle: null,
    });
    if (row.completed_at) {
      items.push({
        id: `task-done-${row.id}`,
        ts: row.completed_at,
        kind: "task",
        badge: "DONE",
        title: `Task completed: ${title}`,
        subtitle: null,
      });
    }
  }

  const { data: inputRows } = await supabase
    .from("plant_inputs")
    .select("id, name, amount, cost_usd, note, occurred_at")
    .eq("plant_id", plantId)
    .order("occurred_at", { ascending: false })
    .limit(10);
  for (const row of (inputRows ?? []) as { id: string; name: string; amount: string | null; cost_usd: number; note: string | null; occurred_at: string }[]) {
    const cost = Number(row.cost_usd);
    const costStr = Number.isFinite(cost) ? `$${cost.toFixed(2)}` : "";
    const sub = [row.amount, row.note].filter(Boolean).map((s) => (s || "").trim()).join(" • ") || null;
    items.push({
      id: `input-${row.id}`,
      ts: row.occurred_at,
      kind: "input",
      badge: "INPUT",
      title: `${costStr} • ${(row.name || "").slice(0, 50)}`,
      subtitle: sub || null,
    });
  }

  const { data: envRows } = await supabase
    .from("plant_environment_readings")
    .select("id, temp_f, rh, vpd, occurred_at")
    .eq("plant_id", plantId)
    .order("occurred_at", { ascending: false })
    .limit(10);
  for (const row of (envRows ?? []) as { id: string; temp_f: number; rh: number; vpd: number | null; occurred_at: string }[]) {
    let title = `Temp ${row.temp_f}°F • RH ${row.rh}%`;
    if (row.vpd != null && Number.isFinite(Number(row.vpd))) {
      title += ` • VPD ${Number(row.vpd).toFixed(1)}`;
    }
    items.push({
      id: `env-${row.id}`,
      ts: row.occurred_at,
      kind: "env",
      badge: "ENV",
      title,
      subtitle: null,
    });
  }

  const { data: harvestRows } = await supabase
    .from("plant_harvests")
    .select("id, dry_weight_g, wet_weight_g, harvested_at")
    .eq("plant_id", plantId)
    .order("harvested_at", { ascending: false })
    .limit(5);
  for (const row of (harvestRows ?? []) as { id: string; dry_weight_g: number; wet_weight_g: number | null; harvested_at: string }[]) {
    let title = `Harvest recorded: ${row.dry_weight_g} g`;
    if (row.wet_weight_g != null && Number.isFinite(Number(row.wet_weight_g))) {
      title += ` (wet ${row.wet_weight_g} g)`;
    }
    items.push({
      id: `harvest-${row.id}`,
      ts: row.harvested_at,
      kind: "harvest",
      badge: "HARVEST",
      title,
      subtitle: null,
    });
  }

  items.sort((a, b) => Date.parse(b.ts) - Date.parse(a.ts));
  return items.slice(0, limit);
}
