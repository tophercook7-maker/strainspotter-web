import { GlassBackground } from "@/app/_components/GlassBackground";
import { IconButton } from "@/app/_components/IconButton";
import { PageHeaderNav } from "@/app/_components/PageHeaderNav";
import { FeedbackButton } from "@/app/_components/FeedbackButton";
import GardenConsoleLiveClient from "./GardenConsoleLiveClient";
import { getLatestGardenSensorReading } from "@/lib/garden/getLatestGardenSensorReading";

type Tile = {
  label: string;
  href: string;
  icon: string;
  subtitle?: string;
};

const DASH_TILES: Tile[] = [
  { label: "AI Strain Scan", href: "/garden/scanner", icon: "📷" },
  { label: "Scraper Status", href: "/garden/scraper-status", icon: "🧲" },
  { label: "Strain Browser", href: "/coming-soon", icon: "🌿" },
  { label: "Reviews Hub", href: "/coming-soon", icon: "⭐️" },

  { label: "Community Groups", href: "/coming-soon", icon: "👥" },
  { label: "Grow Coach", href: "/coming-soon", icon: "🌱" },
  { label: "Grow Logbook", href: "/garden/plants", icon: "📓" },

  { label: "Grower Directory", href: "/coming-soon", icon: "🧑‍🌾" },
  { label: "Seed Vendors", href: "/coming-soon", icon: "🌾" },
  { label: "Dispensaries", href: "/coming-soon", icon: "🏪" },

  { label: "Chat with Spot", href: "/coming-soon", icon: "💬" },
  { label: "AI Chat", href: "/coming-soon", icon: "🤖" },
  { label: "Favorites", href: "/coming-soon", icon: "⭐️" },

  { label: "Achievements", href: "/coming-soon", icon: "🏆" },
  { label: "Cannabis News", href: "/coming-soon", icon: "📰" },
];

export const dynamic = "force-dynamic";

export default async function GardenPage() {
  let initial: { gardenId: string; reading: Awaited<ReturnType<typeof getLatestGardenSensorReading>>["reading"] } | null = null;

  try {
    const res = await getLatestGardenSensorReading();
    if (res) {
      initial = { gardenId: res.gardenId, reading: res.reading };
    }
  } catch {
    initial = null;
  }

  return (
    <main className="min-h-screen text-white">
      <GlassBackground />
      <FeedbackButton />

      <div className="mx-auto w-full max-w-[980px] px-4 py-6 space-y-6">
        {/* Garden IS Home */}
        <PageHeaderNav title="The Garden" hideHome />

        {/* Live first */}
        <section className="rounded-2xl border border-white/10 bg-black/25 backdrop-blur-md p-6">
          <div className="flex items-baseline justify-between gap-3">
            <div className="text-lg font-semibold text-white">Live Environment</div>
            <div className="text-xs text-white/60">Auto-refresh every 5 seconds</div>
          </div>

          <div className="mt-4">
            <GardenConsoleLiveClient initial={initial} />
          </div>
        </section>

        {/* Then dashboard icon buttons */}
        <section className="rounded-2xl border border-white/10 bg-black/25 backdrop-blur-md p-6">
          <div className="text-lg font-semibold text-white">Dashboard</div>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {DASH_TILES.map((t) => (
              <IconButton
                key={t.label}
                href={t.href}
                icon={t.icon}
                label={t.label}
                subtitle={t.subtitle}
              />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
