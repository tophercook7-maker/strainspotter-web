# Supabase Storage buckets (scanner assets)

Buckets **`scanner-reference-images`** and **`scanner-training-images`** can be created in either order:

1. **SQL migration (recommended)** — apply `supabase/migrations/create_scanner_storage_buckets.sql` via Supabase CLI (`supabase db push` / linked project) or paste into the SQL editor. This inserts rows into `storage.buckets` and adds a public read policy on `storage.objects` for the reference bucket only.

2. **Dashboard** — Storage → New bucket. Match IDs exactly:
   - `scanner-reference-images` — **public** (read), MIME filter jpeg/png/webp optional.
   - `scanner-training-images` — **private**.

Upload scripts also call `ensureScannerBuckets()` using the service role, which creates missing buckets at runtime if your API key allows `storage.createBucket`.

See [SUPABASE_SCANNER_STORAGE.md](./SUPABASE_SCANNER_STORAGE.md) for end-to-end ops.
