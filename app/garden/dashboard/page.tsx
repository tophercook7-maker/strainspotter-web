"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import CommunityInsights from "@/components/community/CommunityInsights";
import PatternSignals from "@/components/community/PatternSignals";

interface DashboardData {
  plants_count: number;
  open_tasks_count: number;
  last_logbook_entry: {
    created_at: string;
    entry_type: string;
    text: string;
  } | null;
  last_environment: {
    logged_at: string;
    temperature?: number;
    humidity?: number;
  } | null;
  garden: {
    id: string;
    name: string;
  };
}

interface AttentionItem {
  id: string;
  title: string;
  href: string;
  priority: "high" | "medium" | "low";
}

export default function GardenDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [plants, setPlants] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [attentionItems, setAttentionItems] = useState<AttentionItem[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Load summary data
      const summaryRes = await fetch("/api/garden/summary", { credentials: "include" });
      const summaryData = await summaryRes.json();
      setData(summaryData);

      let plantsData: any = null;
      let tasksData: any = null;

      // Load plants (using the plants API)
      try {
        const plantsRes = await fetch("/api/plants", { credentials: "include" });
        plantsData = await plantsRes.json();
        setPlants(Array.isArray(plantsData.plants) ? plantsData.plants : []);
      } catch (err) {
        console.error("Error loading plants:", err);
      }

      // Load tasks if we have a garden_id
      if (summaryData.garden?.id) {
        try {
          const tasksRes = await fetch(
            `/api/garden/tasks?garden_id=${summaryData.garden.id}&status=open`,
            { credentials: "include" }
          );
          tasksData = await tasksRes.json();
          setTasks(Array.isArray(tasksData.tasks) ? tasksData.tasks : []);
        } catch (err) {
          console.error("Error loading tasks:", err);
        }
      }

      // Build attention items
      const items: AttentionItem[] = [];

      // Check for missing environment log (if last one is > 24 hours ago or doesn't exist)
      if (!summaryData.last_environment) {
        items.push({
          id: "env-missing",
          title: "Log today's environment",
          href: "/garden/all/environment",
          priority: "high",
        });
      } else {
        const lastEnvTime = new Date(summaryData.last_environment.logged_at).getTime();
        const hoursSince = (Date.now() - lastEnvTime) / (1000 * 60 * 60);
        if (hoursSince > 24) {
          items.push({
            id: "env-stale",
            title: "Environment log is over 24 hours old",
            href: "/garden/all/environment",
            priority: "medium",
          });
        }
      }

      // Add open tasks (up to 3)
      if (tasksData?.tasks && tasksData.tasks.length > 0) {
        tasksData.tasks.slice(0, 3).forEach((task: any) => {
          items.push({
            id: `task-${task.id}`,
            title: task.title,
            href: "/garden/all/tasks",
            priority: task.due_at ? "high" : "medium",
          });
        });
      }

      // Check for plants that need attention (health_status not healthy)
      if (plantsData?.plants) {
        const needsAttention = plantsData.plants.filter(
          (p: any) => p.health_status && p.health_status !== "healthy"
        );
        needsAttention.slice(0, 2).forEach((plant: any) => {
          items.push({
            id: `plant-${plant.id}`,
            title: `${plant.name} needs attention (${plant.health_status})`,
            href: `/garden/plants/${plant.id}`,
            priority: plant.health_status === "critical" ? "high" : "medium",
          });
        });
      }

      setAttentionItems(items.slice(0, 5));
    } catch (err) {
      console.error("Error loading dashboard:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatTimestamp = (timestamp: string | null | undefined) => {
    if (!timestamp) return "Not logged yet";
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return "Just now";
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-black text-white p-6">
        <p className="text-red-400">Failed to load dashboard data.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8 p-4 md:p-6 pb-24 md:pb-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold text-white mb-2">Garden Dashboard</h1>
        <p className="text-sm text-white/80">Your daily command center</p>
      </div>

      {/* Your Garden Today */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-white">Your Garden Today</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-xl bg-white/20 backdrop-blur-lg p-4 border border-white/20">
            <div className="text-sm text-white/80 mb-1">Total Plants</div>
            <div className="text-2xl font-bold text-white">{data.plants_count || 0}</div>
          </div>
          <div className="rounded-xl bg-white/20 backdrop-blur-lg p-4 border border-white/20">
            <div className="text-sm text-white/80 mb-1">Open Tasks</div>
            <div className="text-2xl font-bold text-white">{data.open_tasks_count || 0}</div>
          </div>
          <div className="rounded-xl bg-white/20 backdrop-blur-lg p-4 border border-white/20">
            <div className="text-sm text-white/80 mb-1">Last Logbook Entry</div>
            <div className="text-base font-medium text-white">
              {formatTimestamp(data.last_logbook_entry?.created_at)}
            </div>
          </div>
          <div className="rounded-xl bg-white/20 backdrop-blur-lg p-4 border border-white/20">
            <div className="text-sm text-white/80 mb-1">Last Environment Log</div>
            <div className="text-base font-medium text-white">
              {formatTimestamp(data.last_environment?.logged_at)}
            </div>
          </div>
        </div>
      </section>

      {/* What Needs Attention */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-white">What Needs Attention</h2>
        {attentionItems.length === 0 ? (
          <div className="rounded-xl bg-white/15 backdrop-blur-lg p-6 border border-white/20 text-center">
            <p className="text-white/80">All caught up! Nothing needs attention right now.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {attentionItems.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className="block rounded-xl bg-white/15 backdrop-blur-lg p-4 border border-white/20 hover:bg-white/25 transition"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-base font-medium text-white">{item.title}</div>
                    <div className="text-sm text-white/60 mt-1">
                      {item.priority === "high" ? "🔴 High priority" : "🟡 Medium priority"}
                    </div>
                  </div>
                  <span className="text-white/60">→</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Quick Actions */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-white">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            href="/garden/logbook"
            className="rounded-xl bg-white/20 backdrop-blur-lg p-4 border border-white/20 hover:bg-white/30 transition text-center"
          >
            <div className="text-lg font-medium text-white mb-1">Add Logbook Entry</div>
            <div className="text-sm text-white/80">Document observations</div>
          </Link>
          <Link
            href="/garden/all/tasks"
            className="rounded-xl bg-white/20 backdrop-blur-lg p-4 border border-white/20 hover:bg-white/30 transition text-center"
          >
            <div className="text-lg font-medium text-white mb-1">Add Task</div>
            <div className="text-sm text-white/80">Create a to-do</div>
          </Link>
          <Link
            href="/garden/all/environment"
            className="rounded-xl bg-white/20 backdrop-blur-lg p-4 border border-white/20 hover:bg-white/30 transition text-center"
          >
            <div className="text-lg font-medium text-white mb-1">Log Environment</div>
            <div className="text-sm text-white/80">Temperature & humidity</div>
          </Link>
          <Link
            href="/scanner"
            className="rounded-xl bg-white/20 backdrop-blur-lg p-4 border border-white/20 hover:bg-white/30 transition text-center"
          >
            <div className="text-lg font-medium text-white mb-1">Scan</div>
            <div className="text-sm text-white/80">Identify strain</div>
          </Link>
        </div>
      </section>

      {/* Community Insights */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-white">Community Insights</h2>
        <CommunityInsights />
        <PatternSignals />
      </section>
    </div>
  );
}
