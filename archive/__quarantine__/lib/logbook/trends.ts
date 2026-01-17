export function compareMetrics(a: any, b: any) {
  const diff = (x:number,y:number) => x - y;

  return {
    logs: diff(a.totalLogs, b.totalLogs),
    photos: diff(a.totalPhotos, b.totalPhotos),
    streak: diff(a.streak, b.streak),
  };
}
