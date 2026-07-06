// lib/education/terpenes.ts — a factual knowledge base of the major cannabis
// terpenes, so every scan can EXPLAIN the aromatic compounds it detects instead
// of just naming them. Static + client-safe (no API cost, always available).
//
// Language is deliberately educational, not medical advice — "associated with",
// "may", "reported." Boiling points are the commonly-cited aromatherapy/vapor
// figures (°C / °F) — useful, approximate, not lab-exact.

export type TerpeneInfo = {
  name: string;
  emoji: string;
  aroma: string;
  /** Short effect profile users actually feel/notice. */
  effects: string;
  /** What it's popularly associated with (educational, not a health claim). */
  benefits: string;
  /** Other plants/foods it shows up in — the "oh, that's why" hook. */
  alsoFoundIn: string;
  /** Commonly-cited boiling point, handy for vape-temp curiosity. */
  boilC: number;
  boilF: number;
  /** One memorable fact. */
  note: string;
};

// Keyed by normalized name (see normalizeTerpene). Common aliases fold in.
const TERPENES: Record<string, TerpeneInfo> = {
  myrcene: {
    name: "Myrcene", emoji: "🥭",
    aroma: "Earthy, musky, ripe mango, clove",
    effects: "Relaxing, body-heavy; the classic 'couch-lock' driver",
    benefits: "Associated with relaxation, restfulness, and muscle ease",
    alsoFoundIn: "Mango, lemongrass, hops, thyme",
    boilC: 167, boilF: 332,
    note: "The most common cannabis terpene — high myrcene is what leans a strain 'indica.'",
  },
  limonene: {
    name: "Limonene", emoji: "🍋",
    aroma: "Bright citrus — lemon, orange peel",
    effects: "Uplifting, mood-brightening, energizing",
    benefits: "Associated with elevated mood and stress relief",
    alsoFoundIn: "Citrus rinds, juniper, peppermint",
    boilC: 176, boilF: 349,
    note: "Second-most-common terpene; the zesty smell of many 'happy' sativas.",
  },
  caryophyllene: {
    name: "Caryophyllene", emoji: "🌶️",
    aroma: "Peppery, spicy, warm wood",
    effects: "Calming without being sleepy; grounding",
    benefits: "Associated with comfort and easing tension",
    alsoFoundIn: "Black pepper, cloves, cinnamon, basil",
    boilC: 130, boilF: 266,
    note: "Uniquely binds the body's CB2 receptors — the only terpene that acts like a cannabinoid.",
  },
  pinene: {
    name: "Pinene", emoji: "🌲",
    aroma: "Fresh pine, rosemary, sharp forest air",
    effects: "Alert, clear-headed, focused",
    benefits: "Associated with mental clarity and easier breathing",
    alsoFoundIn: "Pine needles, rosemary, basil, dill",
    boilC: 155, boilF: 311,
    note: "May counter some of THC's short-term memory fuzz — the 'clarity' terpene.",
  },
  linalool: {
    name: "Linalool", emoji: "💜",
    aroma: "Floral lavender with a touch of spice",
    effects: "Soothing, calming, mellow",
    benefits: "Associated with relaxation and easing restlessness",
    alsoFoundIn: "Lavender, mint, cinnamon, coriander",
    boilC: 198, boilF: 388,
    note: "The reason a lavender-forward strain feels like a warm bath.",
  },
  humulene: {
    name: "Humulene", emoji: "🍺",
    aroma: "Hoppy, earthy, woody",
    effects: "Grounding, subtly appetite-dulling",
    benefits: "Historically noted in herbal traditions for balance",
    alsoFoundIn: "Hops, coriander, cloves, sage",
    boilC: 106, boilF: 223,
    note: "Gives craft beer its bite — and unlike most terpenes, it can curb the munchies.",
  },
  terpinolene: {
    name: "Terpinolene", emoji: "🌿",
    aroma: "Complex — floral, herbal, piney, faintly citrus",
    effects: "Uplifting, fresh, lightly energetic",
    benefits: "Associated with an upbeat, creative feel",
    alsoFoundIn: "Apples, nutmeg, cumin, lilac",
    boilC: 186, boilF: 366,
    note: "Rare as a dominant terpene — a signature of many lively, 'haze'-style cultivars.",
  },
  ocimene: {
    name: "Ocimene", emoji: "🌼",
    aroma: "Sweet, herbal, woody with citrus lift",
    effects: "Fresh, uplifting",
    benefits: "Associated with a bright, decongesting quality",
    alsoFoundIn: "Mint, parsley, orchids, mango",
    boilC: 100, boilF: 212,
    note: "A plant-defense terpene — it's part of how cannabis wards off pests.",
  },
  bisabolol: {
    name: "Bisabolol", emoji: "🌸",
    aroma: "Soft, sweet chamomile and florals",
    effects: "Gentle, calming, skin-soothing",
    benefits: "Associated with soothing and comfort",
    alsoFoundIn: "Chamomile, candeia tree",
    boilC: 153, boilF: 307,
    note: "A star of the skincare world for its calming reputation.",
  },
  nerolidol: {
    name: "Nerolidol", emoji: "🌳",
    aroma: "Woody, fresh bark, faint citrus and apple",
    effects: "Relaxing, mellow",
    benefits: "Associated with restfulness",
    alsoFoundIn: "Ginger, jasmine, tea tree, lemongrass",
    boilC: 122, boilF: 252,
    note: "Its subtle wood-and-citrus tone rounds out many relaxing blends.",
  },
  eucalyptol: {
    name: "Eucalyptol", emoji: "🧊",
    aroma: "Cool, minty eucalyptus",
    effects: "Refreshing, clearing",
    benefits: "Associated with a crisp, decongesting sensation",
    alsoFoundIn: "Eucalyptus, tea tree, bay leaves, sage",
    boilC: 176, boilF: 349,
    note: "Only a trace shows up in cannabis, but you'll notice its cooling snap immediately.",
  },
  guaiol: {
    name: "Guaiol", emoji: "🪵",
    aroma: "Piney, woody, faintly rosy",
    effects: "Grounding, calm",
    benefits: "Noted in traditional herbal use",
    alsoFoundIn: "Cypress pine, guaiacum tree",
    boilC: 92, boilF: 198,
    note: "Unusual for a terpene, it's a solid at room temperature.",
  },
};

// Fold common prefixes/spellings so "β-Caryophyllene", "beta caryophyllene",
// "a-Pinene", "d-Limonene" all resolve to the base entry.
export function normalizeTerpene(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\(.*?\)/g, "")
    .replace(/(^|[\s-])(alpha|beta|gamma|delta|α|β|γ|δ|a|b|d|l|trans|cis)([\s-]|$)/g, " ")
    .replace(/[^a-z]/g, "")
    .trim();
}

export function getTerpeneInfo(name: string): TerpeneInfo | null {
  const n = normalizeTerpene(name);
  if (TERPENES[n]) return TERPENES[n];
  // last-ditch: substring match (e.g. "caryophylleneoxide" → caryophyllene)
  const key = Object.keys(TERPENES).find((k) => n.includes(k));
  return key ? TERPENES[key] : null;
}
