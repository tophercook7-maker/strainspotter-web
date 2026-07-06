// lib/education/harvest.ts — turn the scanner's free-text trichome read into a
// harvest-window lesson. Trichome color is the grower's #1 harvest signal:
//   clear/glassy → not ready · cloudy/milky → peak THC · amber → sedative/late.
// Educational interpretation only; the actual call is the grower's.

export type HarvestRead = {
  stage: string;
  window: string;   // where in the harvest window this looks
  effect: string;   // what that implies for the high
  emoji: string;
};

export function interpretHarvest(
  trichomes?: string,
  coloration?: string
): HarvestRead | null {
  const t = `${trichomes ?? ""} ${coloration ?? ""}`.toLowerCase();
  if (!t.trim()) return null;

  const has = (...ws: string[]) => ws.some((w) => t.includes(w));
  const amber = has("amber", "brown", "gold");
  const cloudy = has("cloudy", "milky", "opaque", "white");
  const clear = has("clear", "glassy", "translucent", "transparent");

  if (amber && cloudy) {
    return {
      emoji: "🎯", stage: "Peak harvest window",
      window: "Mostly cloudy with some amber — the sweet spot most growers aim for.",
      effect: "Balanced potency: full-strength THC starting to mellow toward a rounded, relaxing high.",
    };
  }
  if (amber) {
    return {
      emoji: "🌙", stage: "Late / sedative harvest",
      window: "Amber-heavy — trichomes are past peak, THC degrading toward sedating CBN.",
      effect: "Expect a heavier, sleepier, couch-lock-leaning body high.",
    };
  }
  if (cloudy) {
    return {
      emoji: "💪", stage: "Peak THC",
      window: "Cloudy/milky trichomes — peak cannabinoid content, right at harvest.",
      effect: "The most potent, head-forward window before amber brings the body-load.",
    };
  }
  if (clear) {
    return {
      emoji: "⏳", stage: "Early / not ready",
      window: "Clear, glassy trichomes — the plant is still building cannabinoids.",
      effect: "Harvested here it'd be weak and racy; a grower would wait for cloudy.",
    };
  }
  return null;
}
