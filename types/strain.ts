export interface StrainData {
  name: string;
  slug: string;
  type?: string;
  thc?: number | null;
  cbd?: number | null;
  hero_image?: string;
  primary_effect?: string;
  ai_summary?: string;
  effects?: EffectsData;
  timeline?: TimelineData[];
  vibe?: VibeData;
  flavors?: FlavorData[];
}

export interface EffectsData {
  body: number;
  mental: number;
  social: number;
}

export interface TimelineData {
  label: string;
  intensity: number;
}

export interface VibeData {
  summary: string;
  resonance?: ResonanceData[];
  reasoning?: string;
}

export interface ResonanceData {
  label: string;
  strength: number;
}

export interface FlavorData {
  name: string;
  intensity: number;
  hue: number;
}

export function normalizePercentage(value: any): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const num = parseFloat(value.replace("%", "").trim());
    return isNaN(num) ? null : num;
  }
  return null;
}
