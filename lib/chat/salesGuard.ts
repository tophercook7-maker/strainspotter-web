// lib/chat/salesGuard.ts
//
// The no-sales guard for community group chat. Apple/Google treat
// facilitating cannabis SALES as the existential violation (see ROADMAP
// store-policy note), and our groups are educational — so clear buy/sell
// solicitations are blocked at post time with a friendly nudge.
//
// Deliberately CONSERVATIVE: only unambiguous solicitation patterns block.
// Talking about prices you paid at a dispensary, legality, or "selling
// points" of a strain must NOT trip it. False positives erode trust faster
// than the occasional miss — moderators catch the rest.

const SOLICITATION_PATTERNS: RegExp[] = [
  // direct offers to sell/ship
  /\bfor sale\b/i,
  /\b(i'?m|im|we'?re) selling\b/i,
  /\bselling (some|my|loud|bud|flower|carts?|zips?|packs?)\b/i,
  /\b(dm|hmu|hit me up|message)( me)? (to|for|if you( wanna| want to)?) (buy|order|score|cop)\b/i,
  /\bbuy (from|off) me\b/i,
  /\b(discreet|overnight) shipping\b/i,
  /\bmenu (in|on) (my )?(bio|profile|page)\b/i,
  /\btelegram|wickr|signal me\b/i,
  // payment-handle solicitation
  /\b(cashapp|cash app|venmo|zelle|apple pay|paypal)\b.{0,30}\b(buy|order|pay|send|dm|hmu)\b/i,
  /\b(buy|order|pay|send|dm|hmu)\b.{0,30}\b(cashapp|cash app|venmo|zelle)\b/i,
  // price-per-quantity OFFERS — require offer context so "the dispensary was
  // selling it for $45 an eighth" (a mention) doesn't trip. Context = an
  // offer verb before the price, or a solicitation tail after it.
  /\b(asking|got)\b.{0,30}[$]?\d{2,4}\s?(a|an|per|\/)\s?(oz|ounce|zip|qp|lb|pound|eighth|quarter|half|gram|g)\b/i,
  /[$]?\d{2,4}\s?(a|an|per|\/)\s?(oz|ounce|zip|qp|lb|pound|eighth|quarter|half|gram|g)\b.{0,40}\b(hmu|dm\b|takers|wants? in|pull ?up|holla)/i,
  // plug talk
  /\b(i'?m|im) (the |a )?plug\b/i,
  /\bgot (loud|gas|packs?|zips?) (for|4) (sale|sell|the low)\b/i,
];

export interface SalesGuardResult {
  blocked: boolean;
  /** Which pattern tripped (for moderator/owner logs) — never shown raw to users. */
  reason?: string;
}

export function checkNoSales(text: string): SalesGuardResult {
  const t = String(text ?? "");
  for (const p of SOLICITATION_PATTERNS) {
    if (p.test(t)) return { blocked: true, reason: p.source.slice(0, 60) };
  }
  return { blocked: false };
}

export const NO_SALES_MESSAGE =
  "Let's keep the groups educational — buying and selling isn't allowed here. " +
  "Use the Nearby tab to find licensed dispensaries.";
