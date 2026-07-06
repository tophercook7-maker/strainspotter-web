// lib/education/effects.ts — plain-language explanations of the effects a strain
// is reported to produce, so a result teaches *why* you feel something, not just
// that you might. Educational, honest ("reported", "often"), never medical claims.

export type EffectInfo = { name: string; emoji: string; why: string };

const EFFECTS: Record<string, EffectInfo> = {
  relaxed: { name: "Relaxed", emoji: "😌", why: "Often driven by myrcene + higher THC — the body-softening, tension-melting side of the plant." },
  happy: { name: "Happy", emoji: "😄", why: "A mood lift commonly tied to limonene (citrus terpene) and a balanced THC response." },
  euphoric: { name: "Euphoric", emoji: "🌈", why: "THC's hit on the brain's reward pathways — the bright, floaty peak of the experience." },
  uplifted: { name: "Uplifted", emoji: "🎈", why: "A lighter, heady lift — associated with limonene/pinene-forward, sativa-leaning profiles." },
  sleepy: { name: "Sleepy", emoji: "😴", why: "The classic 'nightcap' effect — high myrcene plus THC breaking down toward sedating CBN as flower ages." },
  hungry: { name: "Hungry", emoji: "🍕", why: "THC nudges the appetite circuits — the well-known 'munchies.'" },
  creative: { name: "Creative", emoji: "🎨", why: "A loosening of linear thinking — often reported with terpinolene/pinene 'haze'-style strains." },
  energetic: { name: "Energetic", emoji: "⚡", why: "Get-up-and-go — associated with limonene + terpinolene and sativa-dominant genetics." },
  focused: { name: "Focused", emoji: "🎯", why: "Clear-headed attention — pinene may help offset THC's short-term memory haze." },
  talkative: { name: "Talkative", emoji: "💬", why: "The social, chatty lift — common in lower-dose, uplifting sessions." },
  giggly: { name: "Giggly", emoji: "😂", why: "The lighthearted, easily-amused side of a euphoric, mood-forward high." },
  tingly: { name: "Tingly", emoji: "✨", why: "A physical, buzzy body sensation — part of the relaxing body-load some strains bring." },
  calm: { name: "Calm", emoji: "🧘", why: "A settled, even feeling — associated with linalool (lavender) and balanced THC:CBD." },
  aroused: { name: "Aroused", emoji: "🔥", why: "A heightened-sensation report some users note with warm, relaxing profiles." },
};

export function getEffectInfo(name: string): EffectInfo | null {
  const n = name.toLowerCase().replace(/[^a-z]/g, "");
  return EFFECTS[n] ?? null;
}
