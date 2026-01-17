import { calculateStreak } from "@/lib/logbook/streaks";

function dayKey(d: string) {
  return new Date(d).toISOString().slice(0, 10);
}

export function summarizeGrow(grow: any, logs: any[]) {
  const growLogs = logs.filter(l => l.grow_id === grow.id);
  const totalLogs = growLogs.length;
  const totalPhotos = growLogs.filter(l => !!l.photo_url).length;

  const stageCounts: Record<string, number> = {};
  for (const l of growLogs) stageCounts[l.stage] = (stageCounts[l.stage] ?? 0) + 1;

  const streak = calculateStreak(growLogs);

  // simple keyword tally (premium feel, low cost)
  const words: Record<string, number> = {};
  const stop = new Set(["the","and","a","to","of","in","it","is","on","for","with","my","at","as","was","were","today","day"]);
  for (const l of growLogs) {
    const tokens = (l.note ?? "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter(Boolean)
      .filter((w: string) => w.length >= 4 && !stop.has(w));
    for (const w of tokens) {
      words[w] = ((words[w] as number) ?? 0) + 1;
    }
  }

  const topKeywords = Object.entries(words)
    .sort((a,b) => b[1]-a[1])
    .slice(0, 8)
    .map(([w,c]) => ({ w, c }));

  return {
    id: grow.id,
    strain_name: grow.strain_name,
    start_date: grow.start_date,
    stage: grow.stage,
    totalLogs,
    totalPhotos,
    streak,
    stageCounts,
    topKeywords,
  };
}
