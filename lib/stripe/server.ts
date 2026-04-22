import Stripe from "stripe";

/**
 * Pin API version to the account/dashboard; must match supported `stripe` package types.
 */
const STRIPE_API_VERSION = "2025-02-24.acacia" as const;

let stripeSingleton: Stripe | null = null;

/**
 * Lazy Stripe client: safe to import during `next build` without `STRIPE_SECRET_KEY`.
 * Throws only when invoked at runtime without a secret.
 */
export function getStripe(): Stripe {
  if (stripeSingleton) {
    return stripeSingleton;
  }

  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }

  stripeSingleton = new Stripe(key, { apiVersion: STRIPE_API_VERSION });
  return stripeSingleton;
}
