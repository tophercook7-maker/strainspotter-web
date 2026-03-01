"use server";

import { createPlant, createPlantLog, createPlantEnvReading, createPlantTask, completePlantTask, createPlantTasksBulk, createSystemLogForStatusChange, getPlantById, getPlantTaskById, hasOpenTaskNearDueAt, updatePlantStatus, upsertPlantHarvest, createPlantInput } from "@/lib/plants/plantsRepo";

export async function createPlantAction(formData: FormData): Promise<{ id: string } | { error: string }> {
  const name = (formData.get("name") as string)?.trim();
  if (!name) {
    return { error: "Name is required" };
  }
  const strain_name = (formData.get("strain_name") as string)?.trim() || null;
  const status = (formData.get("status") as string)?.trim() || "active";
  const cover_image_url = (formData.get("cover_image_url") as string)?.trim() || null;

  const plant = await createPlant({ name, strain_name, status, cover_image_url: cover_image_url || undefined });
  if (!plant) {
    return { error: "Failed to create plant" };
  }
  return { id: plant.id };
}

export async function createPlantLogAction(formData: FormData): Promise<{ ok: true } | { error: string }> {
  const plantId = (formData.get("plantId") as string)?.trim();
  const gardenId = (formData.get("gardenId") as string)?.trim() || undefined;
  const kind = (formData.get("kind") as string)?.trim() || "note";
  const note = (formData.get("note") as string)?.trim();
  const occurred_at = (formData.get("occurred_at") as string)?.trim() || null;

  if (!plantId) {
    return { error: "Missing plant" };
  }
  if (!note) {
    return { error: "Note is required" };
  }

  try {
    const log = await createPlantLog({ plantId, gardenId, kind, note, occurred_at });
    if (!log) {
      return { error: "Failed to add log" };
    }
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "plant_not_found") return { error: "plant_not_found" };
    if (msg === "garden_id_mismatch") return { error: "garden_id_mismatch" };
    return { error: "Failed to add log" };
  }
}

export async function updatePlantStatusAction(
  formData: FormData
): Promise<
  | { ok: true }
  | { ok: true; no_change: true }
  | { ok: true; warned: true }
  | { error: "invalid_status" | "update_failed" }
> {
  const plantId = (formData.get("plantId") as string)?.trim();
  const newStatus = (formData.get("status") as string)?.trim();
  if (!plantId || !newStatus) {
    return { error: "invalid_status" };
  }
  const plant = await getPlantById(plantId);
  if (!plant) {
    return { error: "update_failed" };
  }
  const oldStatus = plant.status?.toLowerCase().trim() ?? "";
  const newStatusNorm = newStatus.toLowerCase().trim();
  if (oldStatus === newStatusNorm) {
    return { ok: true, no_change: true };
  }
  try {
    await updatePlantStatus({ plantId, status: newStatus });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "invalid_status") return { error: "invalid_status" };
    return { error: "update_failed" };
  }
  try {
    const log = await createSystemLogForStatusChange(plantId, plant.garden_id, plant.status, newStatus);
    if (!log) {
      return { ok: true, warned: true };
    }
    return { ok: true };
  } catch {
    return { ok: true, warned: true };
  }
}

export async function harvestPlantAction(
  formData: FormData
): Promise<{ ok: true } | { error: "invalid_input" | "update_failed" | "harvest_failed" }> {
  const plantId = (formData.get("plantId") as string)?.trim();
  const gardenId = (formData.get("gardenId") as string)?.trim();
  const dryRaw = (formData.get("dry_weight_g") as string)?.trim();
  const wetRaw = (formData.get("wet_weight_g") as string)?.trim() || null;
  const notes = (formData.get("notes") as string)?.trim() || null;

  if (!plantId || !gardenId) {
    return { error: "invalid_input" };
  }
  const dry = dryRaw != null && dryRaw !== "" ? Number(dryRaw) : NaN;
  if (!Number.isFinite(dry) || dry < 0) {
    return { error: "invalid_input" };
  }
  const plant = await getPlantById(plantId);
  if (!plant) {
    return { error: "update_failed" };
  }
  if (plant.garden_id !== gardenId) {
    return { error: "invalid_input" };
  }

  try {
    await updatePlantStatus({ plantId, status: "harvested" });
  } catch {
    return { error: "update_failed" };
  }

  const wet = wetRaw != null && wetRaw !== "" ? Number(wetRaw) : null;
  const harvest = await upsertPlantHarvest({
    plantId,
    gardenId,
    dry_weight_g: dry,
    wet_weight_g: wet != null && Number.isFinite(wet) && wet >= 0 ? wet : undefined,
    notes: notes || undefined,
  });
  if (!harvest) {
    return { error: "harvest_failed" };
  }

  try {
    await createSystemLogForStatusChange(plantId, gardenId, plant.status, "harvested");
  } catch {
    // non-fatal
  }
  try {
    await createPlantLog({
      plantId,
      gardenId,
      kind: "note",
      note: `Harvest recorded: ${dry} g`,
    });
  } catch {
    // non-fatal
  }
  return { ok: true };
}

export async function createPlantEnvReadingAction(
  formData: FormData
): Promise<{ ok: true } | { error: "invalid_input" | "create_failed" }> {
  const plantId = (formData.get("plantId") as string)?.trim();
  const gardenId = (formData.get("gardenId") as string)?.trim();
  const tempFRaw = (formData.get("temp_f") as string)?.trim();
  const rhRaw = (formData.get("rh") as string)?.trim();
  const vpdRaw = (formData.get("vpd") as string)?.trim() || null;
  const note = (formData.get("note") as string)?.trim() || null;
  const occurred_at = (formData.get("occurred_at") as string)?.trim() || null;

  if (!plantId || !gardenId) {
    return { error: "invalid_input" };
  }
  const temp_f = tempFRaw != null ? parseFloat(tempFRaw) : NaN;
  const rh = rhRaw != null ? parseFloat(rhRaw) : NaN;
  if (!Number.isFinite(temp_f) || !Number.isFinite(rh)) {
    return { error: "invalid_input" };
  }
  const vpd = vpdRaw != null && vpdRaw !== "" ? parseFloat(vpdRaw) : null;
  if (vpd != null && !Number.isFinite(vpd)) {
    return { error: "invalid_input" };
  }

  const reading = await createPlantEnvReading({
    plantId,
    gardenId,
    temp_f,
    rh,
    vpd: vpd ?? undefined,
    note,
    occurred_at,
  });
  if (!reading) {
    return { error: "create_failed" };
  }
  return { ok: true };
}

export async function createPlantTaskAction(
  formData: FormData
): Promise<{ ok: true } | { error: "invalid_input" | "create_failed" }> {
  const plantId = (formData.get("plantId") as string)?.trim();
  const gardenId = (formData.get("gardenId") as string)?.trim();
  const kind = (formData.get("kind") as string)?.trim() || "note";
  const title = (formData.get("title") as string)?.trim();
  const notes = (formData.get("notes") as string)?.trim() || null;
  const due_at = (formData.get("due_at") as string)?.trim();
  if (!plantId || !gardenId || !title || !due_at) {
    return { error: "invalid_input" };
  }
  const task = await createPlantTask({ plantId, gardenId, kind, title, notes, due_at });
  if (!task) {
    return { error: "create_failed" };
  }
  return { ok: true };
}

export async function createPlantInputAction(
  formData: FormData
): Promise<{ ok: true } | { error: "invalid_input" | "create_failed" }> {
  const plantId = (formData.get("plantId") as string)?.trim();
  const gardenId = (formData.get("gardenId") as string)?.trim();
  const kind = (formData.get("kind") as string)?.trim() || "other";
  const name = (formData.get("name") as string)?.trim();
  const costRaw = (formData.get("cost_usd") as string)?.trim();
  const amount = (formData.get("amount") as string)?.trim() || null;
  const note = (formData.get("note") as string)?.trim() || null;

  if (!plantId || !gardenId || !name) {
    return { error: "invalid_input" };
  }
  const cost = costRaw != null && costRaw !== "" ? Number(costRaw) : NaN;
  if (!Number.isFinite(cost) || cost < 0) {
    return { error: "invalid_input" };
  }

  const input = await createPlantInput({
    plantId,
    gardenId,
    kind,
    name,
    cost_usd: cost,
    amount: amount || undefined,
    note: note || undefined,
  });
  if (!input) {
    return { error: "create_failed" };
  }
  return { ok: true };
}

export async function completePlantTaskAction(
  formData: FormData
): Promise<{ ok: true } | { error: "invalid_input" | "complete_failed" }> {
  const taskId = (formData.get("taskId") as string)?.trim();
  if (!taskId) {
    return { error: "invalid_input" };
  }
  const ok = await completePlantTask(taskId);
  if (!ok) {
    return { error: "complete_failed" };
  }
  return { ok: true };
}

const MS_PER_DAY = 86400000;

type RecipeKey = "water_2d_14" | "feed_3d_21" | "ipm_7d_28";

export async function applyPlantRecipeAction(
  formData: FormData
): Promise<{ ok: true } | { error: "invalid_input" | "apply_failed" }> {
  const plantId = (formData.get("plantId") as string)?.trim();
  const gardenId = (formData.get("gardenId") as string)?.trim();
  const recipeKey = (formData.get("recipeKey") as string)?.trim() as RecipeKey;
  const validKeys: RecipeKey[] = ["water_2d_14", "feed_3d_21", "ipm_7d_28"];
  if (!plantId || !gardenId || !validKeys.includes(recipeKey)) {
    return { error: "invalid_input" };
  }

  const now = Date.now();
  let rows: Array<{ plant_id: string; garden_id: string; kind: string; title: string; due_at: string }> = [];

  if (recipeKey === "water_2d_14") {
    for (let i = 0; i < 7; i++) {
      rows.push({
        plant_id: plantId,
        garden_id: gardenId,
        kind: "watering",
        title: "Water plant",
        due_at: new Date(now + i * 2 * MS_PER_DAY).toISOString(),
      });
    }
  } else if (recipeKey === "feed_3d_21") {
    for (let i = 0; i < 7; i++) {
      rows.push({
        plant_id: plantId,
        garden_id: gardenId,
        kind: "feeding",
        title: "Feed nutrients",
        due_at: new Date(now + i * 3 * MS_PER_DAY).toISOString(),
      });
    }
  } else if (recipeKey === "ipm_7d_28") {
    for (let i = 0; i < 4; i++) {
      rows.push({
        plant_id: plantId,
        garden_id: gardenId,
        kind: "pest",
        title: "IPM / Pest check",
        due_at: new Date(now + i * 7 * MS_PER_DAY).toISOString(),
      });
    }
  }

  const count = await createPlantTasksBulk(rows);
  if (count !== rows.length) {
    return { error: "apply_failed" };
  }
  return { ok: true };
}

const CADENCE_DAYS: Record<string, number> = {
  watering: 2,
  feeding: 3,
  pest: 7,
};

export async function completeAndScheduleNextTaskAction(
  formData: FormData
): Promise<
  | { ok: true }
  | { ok: true; skipped_next: true }
  | { error: "invalid_input" | "not_cadence" | "schedule_failed" }
> {
  const taskId = (formData.get("taskId") as string)?.trim();
  if (!taskId) {
    return { error: "invalid_input" };
  }

  const task = await getPlantTaskById(taskId);
  if (!task || task.completed_at != null) {
    return { error: "invalid_input" };
  }

  const kind = task.kind?.toLowerCase() ?? "";
  const cadenceDays = CADENCE_DAYS[kind];
  if (cadenceDays == null) {
    return { error: "not_cadence" };
  }

  const ok = await completePlantTask(taskId);
  if (!ok) {
    return { error: "schedule_failed" };
  }

  const now = Date.now();
  const nextDueAt = new Date(now + cadenceDays * MS_PER_DAY).toISOString();

  const hasNear = await hasOpenTaskNearDueAt(task.plant_id, kind, nextDueAt, 12);
  if (hasNear) {
    return { ok: true, skipped_next: true };
  }

  const nextTask = await createPlantTask({
    plantId: task.plant_id,
    gardenId: task.garden_id,
    kind: task.kind,
    title: task.title,
    notes: null,
    due_at: nextDueAt,
  });
  if (!nextTask) {
    return { error: "schedule_failed" };
  }
  return { ok: true };
}
