-- 2026_05_07_stripe_webhook_idempotency.sql
--
-- Idempotency tracking for the Stripe webhook handler. Every Stripe
-- event has a globally unique event.id (evt_…). Once we've successfully
-- processed an event, we record it here so a redelivery from Stripe
-- (or our own retry) is a no-op.
--
-- Table is single-purpose, append-only, and naturally clean: events
-- older than 30 days can be aged out by a scheduled job, since Stripe
-- guarantees no redelivery beyond that window.

CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  -- The Stripe event.id, e.g. 'evt_1NXyz…'. Globally unique on Stripe's
  -- side, so we use it as the primary key.
  event_id        text PRIMARY KEY,

  -- The event.type we processed it as, for forensics.
  event_type      text NOT NULL,

  -- When we first recorded the event as successfully handled.
  processed_at    timestamptz NOT NULL DEFAULT now()
);

-- Stripe stops redelivering events after 30 days. Index helps the
-- prune job that drops anything older.
CREATE INDEX IF NOT EXISTS stripe_webhook_events_processed_at_idx
  ON stripe_webhook_events (processed_at);

-- RLS not needed — only the Stripe webhook (service-role) writes here.
-- Belt-and-suspenders: explicitly enable RLS with no policies, so
-- anon/authenticated roles can never read/write it via the REST API.
ALTER TABLE stripe_webhook_events ENABLE ROW LEVEL SECURITY;
