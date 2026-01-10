'use client';

import { usePathname, useRouter } from "next/navigation";
import clsx from "clsx";
import useSWR from "swr";
import {
  Folder,
  Layers,
  Globe,
  Sparkles,
  Server,
  Grid,
  Cpu,
  Settings,
  Activity,
  Monitor,
  Bot,
  Box,
  Book,
} from "lucide-react";

const dockItems = [
  { key: "files", label: "Files", href: "/vault/files", icon: Folder },
  { key: "datasets", label: "Datasets", href: "/vault/datasets", icon: Layers },
  { key: "scraper", label: "Scraper", href: "/vault/scraper", icon: Globe },
  { key: "generator", label: "Generator", href: "/vault/generator", icon: Sparkles },
  { key: "pipeline", label: "Pipeline", href: "/vault/pipeline", icon: Server },
  { key: "clusters", label: "Clusters", href: "/vault/clusters", icon: Grid },
  { key: "ai", label: "AI", href: "/vault/ai", icon: Cpu },
  { key: "mission", label: "Mission", href: "/vault/mission", icon: Activity },
  { key: "agents", label: "Agents", href: "/vault/agents", icon: Bot },
  { key: "models", label: "Models", href: "/vault/models", icon: Box },
  { key: "notebooks", label: "Notebooks", href: "/vault/notebooks", icon: Book },
  { key: "remote", label: "Remote", href: "/vault/remote", icon: Monitor },
  { key: "settings", label: "Settings", href: "/vault/settings", icon: Settings },
];

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const statusColorMap = {
  idle: "var(--botanical-text-muted)",
  running: "var(--botanical-accent)",
  warning: "var(--botanical-accent-alt)",
  error: "#FF6B6B",
  complete: "var(--botanical-accent)"
};

export default function VaultDock() {
  const pathname = usePathname() || "";
  const router = useRouter();

  // Poll status endpoints
  const { data: scraperStatus } = useSWR("/api/vault/scraper/status", fetcher, {
    refreshInterval: 2000
  });
  const { data: generatorStatus } = useSWR("/api/vault/generator/status", fetcher, {
    refreshInterval: 2000
  });
  const { data: pipelineStatus } = useSWR("/api/vault/pipeline/queue", fetcher, {
    refreshInterval: 2000
  });
  const { data: aiStatus } = useSWR("/api/vault/ai/status", fetcher, {
    refreshInterval: 5000
  });

  const getStatusForItem = (key: string) => {
    switch (key) {
      case "scraper":
        return scraperStatus?.status || "idle";
      case "generator":
        return generatorStatus?.status || "idle";
      case "pipeline":
        if (pipelineStatus?.activeJob) {
          return pipelineStatus.activeJob.status === "failed" ? "error" : "running";
        }
        return pipelineStatus?.queue?.length > 0 ? "warning" : "idle";
      case "ai":
        return aiStatus?.embedding_server?.status === "online" ? "complete" : "error";
      default:
        return null;
    }
  };

  const getStatusColorForItem = (key: string) => {
    const status = getStatusForItem(key);
    if (!status || status === "idle") return null;
    return statusColorMap[status as keyof typeof statusColorMap] || null;
  };

  const isStatusRunning = (key: string) => {
    const status = getStatusForItem(key);
    return status === "running";
  };

  return (
    <div className="pointer-events-none fixed bottom-4 left-0 right-0 flex justify-center z-50">
      <div className="vault-dock pointer-events-auto flex items-end gap-4 rounded-[var(--radius-lg)] bg-[var(--botanical-bg-panel)]/85 border border-[var(--botanical-border)] px-6 py-3 backdrop-blur-md shadow-[0_18px_45px_var(--botanical-blur)]">
        {dockItems.map((item) => {
          const isActive = pathname.startsWith(`/vault/${item.key}`);
          const Icon = item.icon;
          const statusColor = getStatusColorForItem(item.key);
          const isRunning = isStatusRunning(item.key);

          return (
            <button
              key={item.key}
              onClick={() => router.push(item.href)}
              className={clsx(
                "flex flex-col items-center justify-center gap-1 transition-all duration-150",
                isActive ? "scale-110" : "hover:scale-110"
              )}
            >
              <div
                className={clsx(
                  "flex h-10 w-10 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--botanical-bg-surface)] border border-transparent transition-all duration-[var(--motion-fast)] ease-[var(--motion-smooth)]",
                  isActive && "border-[var(--botanical-accent)] bg-[var(--botanical-bg-surface)] shadow-lg shadow-[var(--botanical-glow)]"
                )}
              >
                <Icon
                  className={clsx(
                    "h-5 w-5 transition-colors",
                    isActive ? "text-[var(--botanical-accent)]" : "text-[var(--botanical-text-muted)]"
                  )}
                />
              </div>

              {/* Active Indicator Dot with Status */}
              <div className="h-1 flex items-center justify-center gap-0.5">
                {isActive && (
                  <div className="h-1 w-1 rounded-full bg-[var(--botanical-accent)]" />
                )}
                {statusColor && statusColor !== statusColorMap.idle && (
                  <div
                    className={clsx(
                      "h-1 w-1 rounded-full",
                      isRunning && "pulse"
                    )}
                    style={{ backgroundColor: statusColor }}
                  />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
