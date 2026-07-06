# Ops Runbook — the Medic's knowledge

Every failure class below was hit **in production in July 2026** and fixed.
The Medic routine (cloud watchdog, every 4h) reads `/api/ops/health`, matches
failures to these sections via each check's `runbook` id, and prescribes the
fix. DB-level fixes require the Supabase management token (macOS Keychain on
Topher's Mac, service `Supabase CLI`) — the cloud Medic PRESCRIBES; an
interactive Claude session on the Mac APPLIES.

Management-API pattern for all SQL fixes (run on the Mac):

```bash
TOKEN=$(security find-generic-password -s "Supabase CLI" -w | sed 's/^go-keyring-base64://' | base64 -d)
echo '{"query":"<SQL>"}' | curl -sS -X POST \
  "https://api.supabase.com/v1/projects/rdqpxixsbqcsyfewcmbz/database/query" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -H "User-Agent: supabase-cli/2.109.0" --data-binary @-
```

Always save the fix as a numbered migration in `supabase/migrations/` and push.

---

## rls-recursion
**Symptom:** every gated API 500s; PostgREST error `54001 stack depth limit
exceeded` on a table read; `requireSubscription` returns `profile_error`.
**Cause:** an RLS policy calls a SQL function that reads the same table as
SECURITY INVOKER → policy re-evaluates → infinite loop. (July case:
`profiles_read_own_or_moderator` ↔ `is_moderator()`.)
**Diagnose:** `select policyname, qual from pg_policies where tablename='<t>'`;
inspect any function in `qual` via `pg_get_functiondef`.
**Fix:** recreate the function with `SECURITY DEFINER SET search_path = public`
(migration 026 is the template). **Risk: low** — behavior-preserving.

## phantom-column
**Symptom:** inserts/updates fail `42703 column "x" does not exist`; feature
that "worked yesterday" breaks at a period boundary (e.g. monthly reset) or
first use.
**Cause:** prod DB objects (functions, older tables) reference columns no
migration created — prod was edited outside the repo historically.
**Diagnose:** the error names the column and the statement; check
`information_schema.columns` for the table.
**Fix:** `alter table ... add column if not exists ...` matching the
function's expectation (migrations 027, 028 are templates), THEN ALWAYS
`notify pgrst, 'reload schema'` — without it the REST API still can't see the
column. **Risk: low** — additive.

## postgrest-cache
**Symptom:** SQL-level operations succeed but the API keeps failing with
"column does not exist" after a schema change.
**Fix:** `notify pgrst, 'reload schema';` **Risk: none.**

## dead-api-key
**Symptom:** `/api/scan` 502 with OpenAI 401 `invalid_api_key`; health check
`openai_key` failing.
**Fix:** CANNOT self-heal — needs a fresh key from Topher
(platform.openai.com/api-keys) → `vercel env rm/add OPENAI_API_KEY production`
→ redeploy. If the error is 429 `insufficient_quota` instead, the account is
out of credit — same owner action, add funds. **Escalate to Topher.**

## external-rejection
**Symptom:** a route that proxies a third-party API (Overpass, RSS feeds)
500s or returns empty; upstream returns 406/429/HTML.
**Cause:** missing User-Agent (etiquette enforcement), rate limits, or
upstream flakiness.
**Fix pattern:** descriptive `User-Agent: StrainSpotter/1.0
(+https://strainspotter.app)`, mirror/endpoint fallback list, per-try
timeouts, and degrade to empty-with-200 so the client falls back gracefully
(dispensaries route is the template). **Risk: low.**

## vercel-timeout
**Symptom:** an API route 504s, often only after data grows.
**Cause:** work per request scaling with total progress (July case: the
enrichment batch re-probing every completed row per run), or too many
sequential upstream calls under `maxDuration`.
**Fix pattern:** bulk queries over per-row probes (`.in()` chunks + `.is()`
filters), smaller batches, `export const maxDuration = 60`. Client loops
retry transient failures (3 strikes, 10s backoff) instead of dying.
**Risk: low** — but verify with a live call after deploy.

## quota-machinery
**Symptom:** scans 503 "Couldn't verify scan quota"; consume_scan RPC errors.
**Diagnose:** call `select public.consume_scan('<uuid>')` via management API —
the PL/pgSQL error names the problem (usually phantom-column).
**Note:** grants/refunds must use `id_scan_topups_remaining` — the legacy
`scans_remaining` column is DEAD (nothing reads it; July webhook bug).

## money-pipe
**Symptom:** purchases complete but credits/membership don't land.
**Diagnose:** `stripe_webhook_events` — did the event arrive? Then check the
webhook handler's target columns (see quota-machinery). Stripe webhook
endpoint + prices verified live 2026-07-03; promo codes enabled on all SKUs.
**Test harness:** a 100%-off coupon checkout is a free end-to-end test.

## deploy-broken
**Symptom:** site down or a page 500ing right after a deploy.
**Fix:** `npx vercel rollback` to the previous Ready deployment, then debug
locally. Verify with the uptime URLs in the Morning Ops routine.

## auth-dead-ends (UX class)
**Symptom:** users report "stuck/no way out" screens.
**Known causes:** router.back() with empty history (fixed globally in TopNav);
lock screens rendering before auth hydration (admin page template);
missing sign-in CTAs for signed-out visitors (business page template).
