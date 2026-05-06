import Stripe from "stripe";

let stripe: Stripe | null = null;

export function getStripeServerClient(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is not configured.");
  }

  if (!stripe) {
    stripe = new Stripe(secretKey, {
      apiVersion: "2025-02-24.acacia",
    });
  }

  return stripe;
}
