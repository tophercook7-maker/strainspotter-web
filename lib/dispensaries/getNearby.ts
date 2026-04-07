import ar from "./ar.json";
import { milesBetween } from "./distance";

export function getNearbyDispensaries(
  userLat: number,
  userLng: number,
  radiusMiles = 25
) {
  return ar
    .map((d) => ({
      ...d,
      distance: milesBetween(userLat, userLng, d.lat, d.lng),
    }))
    .filter((d) => d.distance <= radiusMiles)
    .sort((a, b) => a.distance - b.distance);
}
