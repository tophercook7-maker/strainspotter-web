// lib/scanner/cultivarLibrary.ts
// Phase 2.3 — Cultivar Reference Library

export type CultivarReference = {
  name: string;
  aliases?: string[];
  genetics: string;
  dominantType: "Indica" | "Sativa" | "Hybrid";
  morphology: {
    budDensity: "low" | "medium" | "high";
    leafShape: "narrow" | "broad";
    trichomeDensity: "low" | "medium" | "high";
    pistilColor: string[];
  };
  effects: string[];
  commonTerpenes: string[];
};

export const CULTIVAR_LIBRARY: CultivarReference[] = [
  {
    name: "Northern Lights",
    genetics: "Afghan × Thai",
    dominantType: "Indica",
    morphology: {
      budDensity: "high",
      leafShape: "broad",
      trichomeDensity: "high",
      pistilColor: ["amber", "orange"],
    },
    effects: ["relaxation", "sedation", "body calm", "sleep"],
    commonTerpenes: ["myrcene", "caryophyllene", "pinene"],
  },
  {
    name: "Blue Dream",
    aliases: ["BD"],
    genetics: "Blueberry × Haze",
    dominantType: "Sativa",
    morphology: {
      budDensity: "medium",
      leafShape: "narrow",
      trichomeDensity: "medium",
      pistilColor: ["orange"],
    },
    effects: ["euphoria", "creativity", "uplifted", "focused"],
    commonTerpenes: ["myrcene", "pinene", "caryophyllene"],
  },
  {
    name: "OG Kush",
    aliases: ["OGK", "Kush"],
    genetics: "Hindu Kush × Chemdawg",
    dominantType: "Hybrid",
    morphology: {
      budDensity: "high",
      leafShape: "broad",
      trichomeDensity: "high",
      pistilColor: ["orange"],
    },
    effects: ["relaxation", "euphoria", "hunger", "calm"],
    commonTerpenes: ["myrcene", "limonene", "caryophyllene"],
  },
  {
    name: "White Widow",
    genetics: "Brazilian × South Indian",
    dominantType: "Hybrid",
    morphology: {
      budDensity: "high",
      leafShape: "broad",
      trichomeDensity: "high",
      pistilColor: ["white", "orange"],
    },
    effects: ["euphoria", "energy", "creativity", "uplifted"],
    commonTerpenes: ["myrcene", "pinene", "caryophyllene"],
  },
  {
    name: "Sour Diesel",
    aliases: ["Sour D", "Sour"],
    genetics: "Chemdawg × Super Skunk",
    dominantType: "Sativa",
    morphology: {
      budDensity: "low",
      leafShape: "narrow",
      trichomeDensity: "medium",
      pistilColor: ["orange"],
    },
    effects: ["energy", "euphoria", "creativity", "uplifted"],
    commonTerpenes: ["limonene", "myrcene", "caryophyllene"],
  },
  {
    name: "Purple Haze",
    genetics: "Purple Thai × Haze",
    dominantType: "Sativa",
    morphology: {
      budDensity: "low",
      leafShape: "narrow",
      trichomeDensity: "low",
      pistilColor: ["orange"],
    },
    effects: ["energy", "euphoria", "creativity", "uplifted"],
    commonTerpenes: ["myrcene", "pinene", "limonene"],
  },
  {
    name: "Granddaddy Purple",
    aliases: ["GDP", "Granddaddy Purp"],
    genetics: "Purple Urkle × Big Bud",
    dominantType: "Indica",
    morphology: {
      budDensity: "high",
      leafShape: "broad",
      trichomeDensity: "high",
      pistilColor: ["orange", "amber"],
    },
    effects: ["relaxation", "sedation", "hunger", "sleep"],
    commonTerpenes: ["myrcene", "caryophyllene", "pinene"],
  },
  {
    name: "Girl Scout Cookies",
    aliases: ["GSC", "Cookies"],
    genetics: "OG Kush × Durban Poison",
    dominantType: "Hybrid",
    morphology: {
      budDensity: "high",
      leafShape: "broad",
      trichomeDensity: "high",
      pistilColor: ["orange"],
    },
    effects: ["euphoria", "relaxation", "creativity", "happiness"],
    commonTerpenes: ["caryophyllene", "limonene", "myrcene"],
  },
  {
    name: "Jack Herer",
    genetics: "Northern Lights × Haze × Skunk",
    dominantType: "Sativa",
    morphology: {
      budDensity: "low",
      leafShape: "narrow",
      trichomeDensity: "medium",
      pistilColor: ["orange"],
    },
    effects: ["energy", "euphoria", "creativity", "focus"],
    commonTerpenes: ["pinene", "myrcene", "caryophyllene"],
  },
  {
    name: "Gelato",
    aliases: ["Larry Bird"],
    genetics: "Sunset Sherbet × Thin Mint GSC",
    dominantType: "Hybrid",
    morphology: {
      budDensity: "high",
      leafShape: "broad",
      trichomeDensity: "high",
      pistilColor: ["orange"],
    },
    effects: ["euphoria", "relaxation", "creativity", "happiness"],
    commonTerpenes: ["limonene", "caryophyllene", "myrcene"],
  },
  {
    name: "Wedding Cake",
    aliases: ["Pink Cookies"],
    genetics: "Triangle Kush × Animal Mints",
    dominantType: "Hybrid",
    morphology: {
      budDensity: "high",
      leafShape: "broad",
      trichomeDensity: "high",
      pistilColor: ["orange"],
    },
    effects: ["relaxation", "euphoria", "happiness", "calm"],
    commonTerpenes: ["limonene", "caryophyllene", "myrcene"],
  },
  {
    name: "AK-47",
    genetics: "Colombian × Mexican × Thai × Afghan",
    dominantType: "Hybrid",
    morphology: {
      budDensity: "high",
      leafShape: "broad",
      trichomeDensity: "high",
      pistilColor: ["orange"],
    },
    effects: ["euphoria", "relaxation", "uplifted", "happiness"],
    commonTerpenes: ["myrcene", "pinene", "caryophyllene"],
  },
  {
    name: "Skunk #1",
    genetics: "Afghan × Acapulco Gold × Colombian Gold",
    dominantType: "Hybrid",
    morphology: {
      budDensity: "medium",
      leafShape: "broad",
      trichomeDensity: "medium",
      pistilColor: ["orange"],
    },
    effects: ["euphoria", "relaxation", "happiness", "uplifted"],
    commonTerpenes: ["myrcene", "caryophyllene", "limonene"],
  },
  {
    name: "Trainwreck",
    genetics: "Mexican × Thai × Afghani",
    dominantType: "Sativa",
    morphology: {
      budDensity: "low",
      leafShape: "narrow",
      trichomeDensity: "medium",
      pistilColor: ["orange"],
    },
    effects: ["energy", "euphoria", "creativity", "uplifted"],
    commonTerpenes: ["pinene", "myrcene", "caryophyllene"],
  },
  {
    name: "Chemdawg",
    aliases: ["Chem"],
    genetics: "Unknown (legendary)",
    dominantType: "Hybrid",
    morphology: {
      budDensity: "high",
      leafShape: "broad",
      trichomeDensity: "high",
      pistilColor: ["orange"],
    },
    effects: ["euphoria", "relaxation", "creativity", "uplifted"],
    commonTerpenes: ["limonene", "myrcene", "caryophyllene"],
  },
];
