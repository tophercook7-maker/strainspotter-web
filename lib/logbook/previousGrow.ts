export function getPreviousGrow(current: any, grows: any[]) {
  const ordered = grows
    .filter(g => g.id !== current.id)
    .sort(
      (a,b) =>
        new Date(b.start_date).getTime() -
        new Date(a.start_date).getTime()
    );
  return ordered[0] ?? null;
}
