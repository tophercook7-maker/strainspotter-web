# Scanner feedback rewards

## Principles

- Points reward **honest, confirmed feedback** that improves training — not blind clicking. That aligns incentives with **high-trust labels**: confirmed scan photos become promoted references and earn embedding weight via `userConfirmedReferenceScore` in the matcher (still capped without label text).
- **Reputation / trust weight** nudges how much a user’s past confirmations influence tie-break scoring in `feedbackPrior.ts`. It is **capped** and **never overrides** strong visual or text evidence from the matcher.
- **Corrections** (especially with a saved training image) feed the same confirmed-scan pipeline as `SCANNER_RECALIBRATION_SYSTEM.md`; embedding rebuilds improve future matches separately from points.

## Rules (summary)

| Action | Points |
|--------|--------|
| Confirm a suggested match (normal case) | +5 |
| Confirm rank-1 when already high-confidence | +2 |
| **None of these** + corrected strain name | +10 |
| Training image saved for reference promotion | +15 |
| Consensus bonus (another user already matched same correction pattern) | +20 |

**Anti-farming**

- **One saved feedback row per `(userId, scanId)`** — repeat submits return “Already saved…” with **0** points.
- **One positive reward per `(userId, scanId)`** in `user-rewards.jsonl`.
- **Rate limit**: more than **25** rewarded events in **1 hour** → no points (logged as `spam_penalty`).
- Conflicting opinions on the **same scan** lightly increase `conflictPenalties` for minority voters (reduces trust weight).

## Identity

- Logged-in users: Supabase user id via `Authorization: Bearer <session token>`.
- Logged-out: stable **`ss_feedback_device_v1`** in `localStorage`, sent as `X-Ss-Feedback-Device` and `anonymousDeviceId`.
- Fallback id: `"anonymous"` (shared bucket — not recommended).

## Badges (lifetime points)

| Points | Badge |
|--------|--------|
| 25 | Scanner Helper |
| 100 | Strain Trainer |
| 250 | Accuracy Builder |
| 500 | Master Spotter |
| 1000 | StrainSpotter Elite |

## API

- **`POST /api/scan/feedback`** — returns `reward: { pointsAwarded, totalPoints, badgeUnlocked, message, trustLevel, trustWeight }`.
- **`GET /api/rewards/summary`** — totals, badges, recent reward events (Bearer / device header same as feedback).

## Files

- `data/scanner-training/user-rewards.jsonl` — append-only reward events.
- `data/scanner-training/user-reputation.json` — per-user totals, badge ids, conflict penalties.

Do not commit secrets; these paths hold **local dev** training/reward state only.
