# B2B Connect — Design Doc

Business networking inside StrainSpotter: growers, labs, dispensaries, breeders, and processors find each other and exchange contact info (email/phone) by **mutual consent**. Average consumers never see any of it.

Migration: `supabase/migrations/017_b2b_connect.sql`

## Vision

Cannabis businesses need each other constantly — a grower needs a lab for COAs, a dispensary needs verified growers, a breeder wants processors. StrainSpotter already has all of these users; B2B Connect turns that audience into a directory + handshake flow. The product is deliberately minimal at first: a browsable directory (no contact info) and a request/accept flow that unlocks the other party's email/phone only after both sides agree.

Consumers are structurally excluded: every read path requires the caller to hold a `business_profiles` row, and contact fields are only reachable through `get_connection_contact()` on an **accepted** connection.

## Gating

1. **Active subscription** — B2B Connect is a paid-membership feature; API routes check the existing membership tables before any B2B call.
2. **Business profile** — the user must create a `business_profiles` row (role, business name, region, bio, license number) before browsing the directory or sending requests.
3. **Directory opt-in** — profiles are invisible in the directory until `directory_opt_in = true`. Opt-in never exposes contact fields.
4. **Mutual accept** — contact info flows only via the security-definer function `get_connection_contact(connection_id)`, which requires the caller to own one side of a connection with `status = 'accepted'`.

The directory is read through the `business_directory` view (non-contact columns only); clients never select contact columns from the base table.

## Verification story

- **Now:** `license_number` is self-reported. `verified` is a boolean set manually by an admin (service role) after eyeballing the license against the issuing state's public lookup. Verified profiles get a badge in the directory.
- **Later:** automated checks against state license registries (many states expose CSV/API lookups — Metrc-adjacent data, CA DCC, OK OMMA, etc.), periodic re-verification, and expiry tracking. Possibly a `verification_events` audit table.

## API surface (next to build)

| Route | Purpose |
|---|---|
| `POST /api/b2b/profile` | Create/update the caller's business profile (server strips `verified`) |
| `GET /api/b2b/directory` | Browse opted-in profiles via `business_directory`; filters: role, region; requires sub + profile |
| `POST /api/b2b/connect` | Send a connection request (`to_profile`, optional message <= 500 chars) |
| `POST /api/b2b/connect/:id/respond` | Recipient accepts/declines; sets `responded_at` |
| `GET /api/b2b/connections` | List the caller's requests (sent/received, by status); accepted rows include contact via `get_connection_contact()` |

## Abuse controls

- **Rate limit** connection requests per profile (e.g. 10/day) at the API layer; DB unique constraint already prevents duplicate directed requests.
- **Withdraw/decline semantics:** declined requests should cool down before a re-request is allowed (app-layer).
- **Block list (later):** `b2b_blocks(blocker, blocked)` table; blocked profiles can't send requests and disappear from each other's directory results.
- **Report:** reuse the existing moderation/report pipeline for spammy or fraudulent business profiles; admin can flip `directory_opt_in` off and clear `verified`.
- Message field is capped at 500 chars and should pass the existing content-moderation check before insert.

## Open product questions

- **Paid tier:** is B2B Connect part of the existing Pro membership, or its own add-on SKU?
- **Per-role pricing:** dispensaries/labs (B2B buyers) may bear a higher price than solo growers — worth a role-based tier?
- **In-app messaging:** do we bolt B2B threads onto the existing garden messaging (`chat_threads type='direct'`) after acceptance, instead of (or before) releasing raw email/phone?
- **Re-request policy:** after decline/withdraw, allow status reset on the same row, or one-shot forever?
- **Verification badge weight:** should unverified profiles be hidden from the directory by default, or just ranked lower?
