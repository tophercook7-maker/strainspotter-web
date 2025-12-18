export function calculateStreak(logs: any[]) {
  if (!logs || logs.length === 0) return 0;

  const days = new Set(
    logs.map(l =>
      new Date(l.created_at).toISOString().slice(0, 10)
    )
  );

  let streak = 0;
  let day = new Date();

  while (true) {
    const key = day.toISOString().slice(0, 10);
    if (!days.has(key)) break;
    streak++;
    day.setDate(day.getDate() - 1);
  }

  return streak;
}
