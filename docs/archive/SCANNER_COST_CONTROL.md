# Scanner cost control (OpenAI optional)

By default this project **does not call OpenAI on every scan**. `/api/scan` runs **local CLIP embedding matching** (Xenova `clip-vit-base-patch32` when configured), your **reference / embedding index**, **feedback priors**, and **local metadata**—without billing OpenAI vision.

OpenAI remains supported for **optional paid insights** when you explicitly enable it.

## Default (recommended dev)

```bash
SCANNER_COST_MODE=free
SCANNER_USE_OPENAI_ON_SCAN=false
SCANNER_AI_PROVIDER=off
SCANNER_MATCHING_MODE=normal
```

- **`SCANNER_COST_MODE=free`** — Cost posture is “free”: scans should not rely on paid OpenAI unless you opt in per request or switch to paid mode below.
- **`SCANNER_USE_OPENAI_ON_SCAN=false`** — The server will **not** call OpenAI from `POST /api/scan`, even if `OPENAI_API_KEY` is set.
- **`SCANNER_AI_PROVIDER=off`** — AI vision provider is off unless you set it to `openai` for paid flows.
- **`SCANNER_MATCHING_MODE=normal`** — Still uses **local embeddings**, reference index, feedback, and metadata in `rankLocalStrains`; OpenAI is **not** required for traits.

## Quick setup scripts

From the repo root (updates `.env.local` and `env/.env.local` when that folder exists). **Secrets are never printed.**

```bash
npm run scanner:free-mode
```

To enable **automatic OpenAI on every scan** (costs money):

```bash
npm run scanner:paid-ai-mode
```

You must type exactly `ENABLE PAID AI` when prompted.

## Enable paid OpenAI temporarily (manual)

1. Set:

   ```bash
   SCANNER_COST_MODE=paid_ai
   SCANNER_USE_OPENAI_ON_SCAN=true
   SCANNER_AI_PROVIDER=openai
   ```

2. Ensure **`OPENAI_API_KEY`** is set server-side only (never `NEXT_PUBLIC_*`).

3. Restart `npm run dev`.

**Warning:** Each scan may invoke OpenAI vision and **incur charges**.

## Free mode + one-off OpenAI from the UI

With **`SCANNER_COST_MODE=free`** and env gates allowing OpenAI (`SCANNER_USE_OPENAI_ON_SCAN=true`, `SCANNER_AI_PROVIDER=openai`, valid key), the Garden scanner shows **“Run paid AI insights (next scan only)”**. Only that path sends `useOpenAI: true`. The server still refuses OpenAI if env disallows it.

## Health / debugging

- **`GET /api/scan`** returns `costMode`, `openaiOnScanEnabled`, `aiProvider`, `localEmbeddingEnabled`, `embeddingImageCount` (no secrets).
- With **`SCANNER_DEBUG_MATCHING=true`**, scan debug JSON includes `costMode`, `openaiUsed`, `openaiSkippedReason`, `provider`, and `model`.

## Local-only response shape

When OpenAI is skipped, `POST /api/scan` uses:

- **`provider`**: `"local-embedding"`
- **`model`**: embedding model label (default `Xenova/clip-vit-base-patch32`)
- **`costMode`**: `"free"` or `"paid_ai"`
- **`notes`**: includes `"OpenAI skipped: free local matching mode enabled."` when vision is skipped

Plant-level AI insights may be minimal; strain matching still runs locally.
