# StrainSpotter OpenAI Scanner Setup

## Local Setup

Run the backend-only setup prompt:

```bash
npm run setup:openai
```

Paste your OpenAI API key when prompted. The helper writes the key to
`env/.env.local`, preserves existing values, and does not print the key back.

`env/.env.local` is ignored by git. Do not commit real env files or screenshots
that contain secrets.

## Backend-Only Rule

`OPENAI_API_KEY` must only be read by server code such as Next.js API routes.
Never add OpenAI secrets to frontend public env names:

```text
NEXT_PUBLIC_OPENAI_API_KEY
VITE_OPENAI_API_KEY
EXPO_PUBLIC_OPENAI_API_KEY
REACT_APP_OPENAI_API_KEY
```

Any variable with those public prefixes can be bundled into a browser or mobile
client.

## Vercel

In Vercel, add these as server-side environment variables for the project:

```text
OPENAI_API_KEY=<your key>
SCANNER_AI_PROVIDER=openai
SCANNER_MAX_IMAGE_MB=4
SCANNER_RATE_LIMIT_PER_MINUTE=10
```

Do not prefix `OPENAI_API_KEY` with `NEXT_PUBLIC_`.

## Provider Controls

Use `SCANNER_AI_PROVIDER` to control scanner behavior:

```text
SCANNER_AI_PROVIDER=openai
SCANNER_AI_PROVIDER=google
SCANNER_AI_PROVIDER=off
```

`openai` uses the backend OpenAI vision path. `google` is reserved for a Google
Vision scanner path if one is added later. `off` returns `503` with
`Scanner AI provider is disabled.`

## Health And Logs

Start the app locally:

```bash
npm run dev
```

Check scanner health:

```bash
curl http://localhost:3000/api/scan
```

Scan usage logs are emitted by the API route and include timestamp, route,
provider, model, image size, and success/failure status. Logs intentionally do
not include `OPENAI_API_KEY` or raw base64 image data.

## Billing Safety

The scanner defaults to `gpt-4o-mini`, low image detail, a 4 MB image limit, and
10 scan requests per minute per IP in the server process.

To avoid runaway billing:

- Set OpenAI project usage limits and alerts.
- Keep `SCANNER_RATE_LIMIT_PER_MINUTE` conservative in production.
- Keep `SCANNER_MAX_IMAGE_MB` small unless there is a measured reason to raise it.
- Set `SCANNER_AI_PROVIDER=off` during maintenance or incident response.
