import TopNav from "../../_components/TopNav";
import Link from "next/link";
import { getPlantById, getLatestPlantEnvReading, getPlantHarvest, getPlantTotalCost, getPlantTimeline, listPlantInputs, listPlantLogs, listOpenPlantTasks } from "@/lib/plants/plantsRepo";
import type { Plant, PlantLog } from "@/lib/plants/plantsRepo";
import LogTemplatesBar from "./LogTemplatesBar";
import PlantStatusActions from "./PlantStatusActions";
import EnvironmentCard from "./EnvironmentCard";
import TasksCard from "./TasksCard";
import InputsCard from "./InputsCard";
import TimelineCard from "./TimelineCard";

const LOG_KIND_FILTERS = [
  { value: "all", label: "All" },
  { value: "note", label: "Note" },
  { value: "watering", label: "Watering" },
  { value: "feeding", label: "Feeding" },
  { value: "training", label: "Training" },
  { value: "pest", label: "Pest" },
  { value: "deficiency", label: "Deficiency" },
  { value: "harvest", label: "Harvest" },
  { value: "photo", label: "Photo" },
] as const;

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ kind?: string }>;
};

export default async function PlantDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const kind = resolvedSearchParams?.kind ?? "all";
  let plant: Plant | null = null;
  let plantLoadError = false;
  try {
    plant = await getPlantById(id);
  } catch {
    plantLoadError = true;
  }

  if (plantLoadError || !plant) {
    return (
      <>
        <TopNav title="Plant" showBack />
        <main className="min-h-screen bg-black text-white">
          <div className="mx-auto w-full max-w-[720px] px-4 py-12 text-center">
            <p className="text-white/70 text-lg">
              {plantLoadError ? "Could not load plant." : "Plant not found"}
            </p>
            <Link href="/garden/plants" className="mt-4 inline-block text-white/70 hover:text-white text-sm underline">
              Back to Plants
            </Link>
          </div>
        </main>
      </>
    );
  }

  let logs: PlantLog[] = [];
  let logsLoadError = false;
  try {
    logs = await listPlantLogs(id, kind === "all" ? undefined : kind);
  } catch {
    logsLoadError = true;
  }

  let recentLogs: PlantLog[] = [];
  try {
    recentLogs = await listPlantLogs(id, undefined, 3);
  } catch {
    // ignore; strip is optional
  }

  const latestEnv = await getLatestPlantEnvReading(id).catch(() => null);
  const openTasks = await listOpenPlantTasks(id).catch(() => []);
  const harvest = plant.status?.toLowerCase() === "harvested" ? await getPlantHarvest(id).catch(() => null) : null;
  const inputs = await listPlantInputs(id, 10).catch(() => []);
  const totalCostUsd = await getPlantTotalCost(id).catch(() => 0);
  const harvestDryG = harvest?.dry_weight_g ?? null;
  const timelineItems = await getPlantTimeline(id, 25).catch(() => []);

  const totalLogs = logs.length;
  const lastActivityAt = logs[0]?.occurred_at ?? null;
  const lastActivityLabel = lastActivityAt
    ? (() => {
        const daysBetween = Math.max(
          0,
          Math.floor((Date.now() - new Date(lastActivityAt).getTime()) / 86400000)
        );
        return daysBetween === 0 ? "Today" : daysBetween === 1 ? "Yesterday" : `${daysBetween} days ago`;
      })()
    : null;
  const activitySubline = lastActivityLabel
    ? `Last activity ${lastActivityLabel} • ${totalLogs} ${totalLogs === 1 ? "log" : "logs"}`
    : `No activity yet • ${totalLogs} logs`;

  return (
    <>
      <TopNav title={plant.name} showBack />
      <main className="min-h-screen bg-black text-white">
        <div className="mx-auto w-full max-w-[720px] px-4 py-6 space-y-6">
          <Link
            href="/garden/plants"
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium bg-white/15 text-white hover:bg-white/25 transition-colors"
          >
            ← Plants
          </Link>
          {/* Plant header */}
          <div className="rounded-lg border border-white/10 bg-white/5 p-5">
            {plant.cover_image_url && (
              <div className="mb-4">
                <img
                  src={plant.cover_image_url}
                  alt=""
                  className="w-24 h-24 object-cover rounded-lg border border-white/10"
                />
              </div>
            )}
            <h1 className="text-white font-semibold text-xl">{plant.name}</h1>
            {plant.strain_name && (
              <p className="text-white/70 text-sm mt-1">{plant.strain_name}</p>
            )}
            <p className="text-sm text-white/60 mt-1">{activitySubline}</p>
            {recentLogs.length > 0 && (
              <div className="mt-2 pt-2 border-t border-white/10 space-y-1.5">
                <p className="text-xs text-white/50 font-medium">Recent activity</p>
                {recentLogs.map((log) => {
                  const occurredAt = log.occurred_at
                    ? (() => {
                        const days = Math.max(
                          0,
                          Math.floor((Date.now() - new Date(log.occurred_at).getTime()) / 86400000)
                        );
                        return days === 0 ? "Today" : days === 1 ? "Yesterday" : `${days} days ago`;
                      })()
                    : "";
                  const noteTruncated =
                    log.note.length > 60 ? `${log.note.slice(0, 60).trim()}…` : log.note;
                  return (
                    <div
                      key={log.id}
                      className="flex flex-wrap items-baseline gap-2 text-sm text-white/60"
                    >
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-white/10 text-white/80 shrink-0">
                        {log.kind}
                      </span>
                      <span className="min-w-0 truncate">{noteTruncated}</span>
                      <span className="text-white/50 text-xs shrink-0">{occurredAt}</span>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span
                className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                  plant.status === "active"
                    ? "bg-green-500/20 text-green-300"
                    : plant.status === "harvested"
                      ? "bg-amber-500/20 text-amber-300"
                      : plant.status === "paused"
                        ? "bg-white/15 text-white/80"
                        : "bg-white/10 text-white/80"
                }`}
              >
                {plant.status}
              </span>
              <PlantStatusActions plantId={plant.id} gardenId={plant.garden_id} currentStatus={plant.status} />
            </div>
          </div>

          {harvest && (
            <div className="rounded-lg border border-white/10 bg-white/5 p-5">
              <h2 className="text-white font-medium mb-3">Harvest</h2>
              <p className="text-white/90 text-sm">
                Dry weight: {harvest.dry_weight_g} g
              </p>
              {harvest.wet_weight_g != null && (
                <p className="text-white/90 text-sm mt-1">
                  Wet weight: {harvest.wet_weight_g} g
                </p>
              )}
              {harvest.notes && (
                <p className="text-white/70 text-sm mt-2">{harvest.notes}</p>
              )}
            </div>
          )}

          <EnvironmentCard plantId={plant.id} gardenId={plant.garden_id} latest={latestEnv} />
          <TasksCard plantId={plant.id} gardenId={plant.garden_id} tasks={openTasks} />
          <InputsCard
            plantId={plant.id}
            gardenId={plant.garden_id}
            inputs={inputs}
            totalCostUsd={totalCostUsd}
            harvestDryG={harvestDryG}
          />
          <TimelineCard items={timelineItems} />

          {/* Add Log */}
          <div className="rounded-lg border border-white/10 bg-white/5 p-5">
            <h2 className="text-white font-medium mb-4">Add Log</h2>
            <LogTemplatesBar plantId={plant.id} gardenId={plant.garden_id} />
          </div>

          {/* Log list */}
          <div className="rounded-lg border border-white/10 bg-white/5 p-5">
            <h2 className="text-white font-medium mb-4">Logs</h2>
            <div className="flex flex-wrap items-center gap-2 mb-4">
              {LOG_KIND_FILTERS.map(({ value, label }) => {
                const isActive = kind === value;
                const href = value === "all" ? `/garden/plants/${id}` : `/garden/plants/${id}?kind=${value}`;
                return (
                  <Link
                    key={value}
                    href={href}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive ? "bg-white/15 text-white" : "text-white/70 hover:text-white"
                    }`}
                  >
                    {label}
                  </Link>
                );
              })}
            </div>
            {logsLoadError ? (
              <p className="text-white/50 text-sm">Could not load logs.</p>
            ) : logs.length === 0 ? (
              <p className="text-white/50 text-sm">No logs yet.</p>
            ) : (
              <ul className="space-y-3">
                {logs.map((log: PlantLog) => (
                  <li
                    key={log.id}
                    className="border-b border-white/10 pb-3 last:border-0 last:pb-0"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-white/10 text-white/80">
                        {log.kind}
                      </span>
                      <span className="text-white/50 text-xs whitespace-nowrap">
                        {new Date(log.occurred_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-white/90 text-sm mt-1 leading-relaxed">
                      {log.note}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <p className="text-center">
            <Link href="/garden/plants" className="text-white/70 hover:text-white text-sm underline">
              Back to Plants
            </Link>
          </p>
        </div>
      </main>
    </>
  );
}
