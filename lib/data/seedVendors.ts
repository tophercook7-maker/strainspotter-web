export type SeedVendor = {
  id: string;
  name: string;
  region: string;
  specialties: string[];
  shipping: string;
  reputation?: string;
};

export const SEED_VENDORS: SeedVendor[] = [
  {
    id: "nasco",
    name: "North Atlantic Seed Co",
    region: "United States",
    specialties: ["Feminized", "Autoflower", "Photoperiod"],
    shipping: "US shipping",
    reputation: "Trusted by home growers",
  },
  {
    id: "seedsman",
    name: "Seedsman",
    region: "International",
    specialties: ["Huge catalog", "Breeder packs"],
    shipping: "Worldwide shipping",
    reputation: "Long-running global vendor",
  },
  {
    id: "ilgm",
    name: "ILGM",
    region: "United States",
    specialties: ["Beginner-friendly", "Guaranteed delivery"],
    shipping: "US shipping",
    reputation: "Popular with first-time growers",
  },
];
