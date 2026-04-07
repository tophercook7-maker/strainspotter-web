import type { PlantTimelineItem } from "@/lib/plants/plantsRepo";

function timelineTimeLabel(ts: string): string {
  const days = Math.max(
    0,
    Math.floor((Date.now() - new Date(ts).getTime()) / 86400000)
  );
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

type Props = {
  items: PlantTimelineItem[];
};

export default function TimelineCard({ items }: Props) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-5">
      <h2 className="text-white font-medium mb-3">Timeline</h2>
      {items.length === 0 ? (
        <p className="text-white/50 text-sm">No activity yet.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-start gap-2 py-2 border-b border-white/10 last:border-0"
            >
              <span className="shrink-0 px-2 py-0.5 rounded text-xs font-medium bg-white/10 text-white/80">
                {item.badge}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-white/90 text-sm">{item.title}</p>
                {item.subtitle && (
                  <p className="text-white/60 text-xs mt-0.5">{item.subtitle}</p>
                )}
              </div>
              <span className="shrink-0 text-white/50 text-xs whitespace-nowrap">
                {timelineTimeLabel(item.ts)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
