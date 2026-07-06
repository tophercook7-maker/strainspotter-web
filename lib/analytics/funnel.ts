// lib/analytics/funnel.ts — conversion-funnel events for Vercel Web Analytics.
//
// Vercel already auto-tracks visitors + page views. These custom events add the
// steps that turn raw traffic into a funnel:
//
//   visitor (auto)  →  scan_completed  →  signup  →  checkout_started  →  subscribed
//
// View them in the Vercel dashboard → Analytics → Events. Custom events require
// the project's Web Analytics plan to include events (Pro). `track` is a no-op
// on the server and when analytics is disabled, so these calls are always safe.

import { track } from "@vercel/analytics";

export const funnel = {
  /** A scan finished and returned a result (the core activation moment). */
  scanCompleted: (p: { free: boolean; health: boolean }) =>
    track("scan_completed", { free: p.free, health: p.health }),

  /** A free account was created. */
  signup: (p: { plan?: string } = {}) =>
    track("signup", { plan: p.plan ?? "free" }),

  /** User left for Stripe checkout (intent to pay). */
  checkoutStarted: (p: { plan: string }) =>
    track("checkout_started", { plan: p.plan }),

  /** Payment verified — a new subscriber. */
  subscribed: (p: { tier: string }) =>
    track("subscribed", { tier: p.tier }),
};
