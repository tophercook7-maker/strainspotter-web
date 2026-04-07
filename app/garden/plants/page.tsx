import TopNav from "../_components/TopNav";
import Link from "next/link";
import { listPlants, getPlantTaskDueCounts } from "@/lib/plants/plantsRepo";
import type { PlantWithLogCount } from "@/lib/plants/plantsRepo";
import PlantsListClient from "./PlantsListClient";

type SearchParams = { filter?: string };

export default async function PlantsPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const filter = params?.filter === "all" ? "all" : "active";
  let plants: PlantWithLogCount[] = [];
  let loadError = false;
  try {
    plants = await listPlants(
      filter === "all" ? {} : { status: "active" }
    );
    const statusRank: Record<string, number> = {
      active: 0,
      paused: 1,
      harvested: 2,
      archived: 3,
    };
    const getRank = (s: string) => statusRank[s?.toLowerCase() ?? ""] ?? 9;
    const sortKey = (p: PlantWithLogCount) =>
      Date.parse(p.last_activity_at ?? p.created_at) || 0;
    plants = [...plants].sort((a, b) => {
      const r = getRank(a.status) - getRank(b.status);
      if (r !== 0) return r;
      return sortKey(b) - sortKey(a);
    });
  } catch {
    loadError = true;
  }

  const plantIds = plants.map((p) => p.id);
  const taskCounts = plantIds.length > 0
    ? await getPlantTaskDueCounts(plantIds, new Date().toISOString())
    : {};

  return (
    <>
      <TopNav title="Plants" showBack />
      <main className="min-h-screen bg-black text-white">
        <div className="mx-auto w-full max-w-[720px] px-4 py-6">
          <div className="flex items-center justify-between gap-4 mb-6">
            <div className="flex gap-2">
              <Link
                href="/garden/plants"
                className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                  filter === "active"
                    ? "bg-white/15 text-white"
                    : "text-white/70 hover:text-white"
                }`}
              >
                Active
              </Link>
              <Link
                href="/garden/plants?filter=all"
                className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                  filter === "all"
                    ? "bg-white/15 text-white"
                    : "text-white/70 hover:text-white"
                }`}
              >
                All
              </Link>
            </div>
            <Link
              href="/garden/plants/new"
              className="px-4 py-2 rounded-lg bg-white/15 text-white text-sm font-medium hover:bg-white/25"
            >
              Add Plant
            </Link>
          </div>

          {loadError ? (
            <div className="rounded-lg border border-white/10 bg-white/5 p-6 text-center">
              <p className="text-white/70 text-lg">Could not load plants.</p>
              <p className="text-white/50 text-sm mt-2">
                Check database permissions (RLS) or server configuration.
              </p>
              <Link
                href="/garden/plants/new"
                className="inline-block mt-4 px-4 py-2 rounded-lg bg-white/15 text-white text-sm font-medium hover:bg-white/25"
              >
                Add Plant
              </Link>
            </div>
          ) : plants.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-white/70 text-lg">No plants yet</p>
              <p className="text-white/50 text-sm mt-2">
                Add a plant to start tracking.
              </p>
              <Link
                href="/garden/plants/new"
                className="inline-block mt-4 px-4 py-2 rounded-lg bg-white/15 text-white text-sm font-medium hover:bg-white/25"
              >
                Add Plant
              </Link>
            </div>
          ) : (
            <PlantsListClient plants={plants} taskCounts={taskCounts} />
          )}
        </div>
      </main>
    </>
  );
}
