# Environment Setup

## Supabase Sign-In

Browser sign-in requires these public Supabase values in root `.env.local`:

```text
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-supabase-anon-public-key"
```

The anon key is intended for client use, but it must belong to the same Supabase
project as the URL. If it is empty or from a different project, sign-in can fail
with an invalid API key error.

Run:

```bash
npm run setup:supabase
```

Restart `npm run dev` after changing env files.

## Scanner

The scanner requires a backend-only OpenAI key and provider setting:

```text
OPENAI_API_KEY="sk-your-openai-key"
SCANNER_AI_PROVIDER=openai
SCANNER_MAX_IMAGE_MB=4
SCANNER_RATE_LIMIT_PER_MINUTE=10
```

Run:

```bash
npm run setup:openai
```

## Server-Only Service Role

Server/admin Supabase operations use:

```text
SUPABASE_SERVICE_ROLE_KEY="your-server-only-service-role-key"
```

Do not expose this key to browser/client code. `SUPABASE_SERVICE_KEY` is treated
as a legacy fallback only; prefer `SUPABASE_SERVICE_ROLE_KEY`.

## StrainCompass / TerpScout

StrainCompass is the primary external strain provider because its tested
endpoints return `imageUrl` fields. BudProfiles remains a metadata backup.

Authenticated provider access is optional because public endpoints may still
work, but you can store the server-only key with:

```bash
npm run setup:straincompass
```

This writes to `env/.env.local`:

```text
STRAINCOMPASS_API_KEY="your-server-only-provider-key"
STRAINCOMPASS_BASE_URL="https://straincompass.com/api"
```

`TERPSCOUT_API_KEY` is supported as an alias. Do not expose either key through
`NEXT_PUBLIC_`, `VITE_`, `EXPO_PUBLIC_`, or `REACT_APP_` variables.

## External volume (TheVault) for scanner assets

Optional: keep large reference and confirmed-scan training images on an external disk instead of under `data/` in the repo. Add to **`env/.env.local`** (never commit):

```text
REFERENCE_IMAGE_STORAGE_ROOT=/Volumes/TheVault/StrainSpotter/reference-images
SCANNER_TRAINING_STORAGE_ROOT=/Volumes/TheVault/StrainSpotter/training-images
```

See **`THEVAULT_STORAGE_SETUP.md`**. Mount the volume before running `npm run references:download` or saving confirmed training when those variables point at `/Volumes/TheVault`.

## Never Expose

Never expose or commit:

```text
OPENAI_API_KEY
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_SERVICE_KEY
STRAINCOMPASS_API_KEY
TERPSCOUT_API_KEY
```

Do not place OpenAI, StrainCompass, TerpScout, or service-role secrets in public
prefixes such as `NEXT_PUBLIC_`, `VITE_`, `EXPO_PUBLIC_`, or `REACT_APP_`.

If secrets were pasted into chat, terminal output, screenshots, or logs:

- Rotate the OpenAI API key.
- Rotate the Supabase service role key.
- Rotate the StrainCompass / TerpScout API key.
- Restart local and deployed environments after replacing them.

## Validation

Run:

```bash
npm run check:env
npm run storage:check
npm run strain:providers:test
npm run dev
```

`npm run check:env` checks required variables and prints only status, warnings,
and next steps. It does not print secret values.

`npm run storage:check` prints reference/training storage roots, whether `/Volumes/TheVault`
is mounted, and `df -h` for the volume when present (see `THEVAULT_STORAGE_SETUP.md`).
