# Supabase Setup Guide

## Required Setup for StrainSpotter

### 1. Database Table: `scans`

Run this SQL in your Supabase SQL Editor:

```sql
CREATE TABLE IF NOT EXISTS scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'uploaded',
  vision_results JSONB,
  match_result JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_scans_created_at ON scans(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scans_status ON scans(status);
```

### 2. Storage Bucket: `scans`

**Option A: Via Supabase Dashboard**
1. Go to your Supabase project dashboard
2. Navigate to **Storage**
3. Click **"New bucket"**
4. Name: `scans`
5. Public: `false` (or `true` if you want public URLs)
6. File size limit: `10485760` (10MB)
7. Allowed MIME types: `image/jpeg, image/png, image/webp, image/heic`
8. Click **"Create bucket"**

**Option B: Via SQL (if you have RLS policies)**
```sql
-- Note: Buckets are typically created via the dashboard
-- But you can check if it exists via storage API
```

### 3. Storage Policies (if bucket is private)

If your bucket is private, you'll need policies. For now, if you set it to public, you won't need policies.

**For private bucket, add policy:**
```sql
-- Allow service role to upload
CREATE POLICY "Service role can upload"
ON storage.objects FOR INSERT
TO service_role
WITH CHECK (bucket_id = 'scans');

-- Allow service role to read
CREATE POLICY "Service role can read"
ON storage.objects FOR SELECT
TO service_role
USING (bucket_id = 'scans');
```

### 4. Verify Setup

**Check health endpoint:**
```bash
curl http://localhost:3000/api/health
```

**Expected response:**
```json
{
  "status": "healthy",
  "checks": {
    "env": { ... },
    "supabase": { ... },
    "database": {
      "scansTableExists": true
    },
    "storage": {
      "scansBucketExists": true
    }
  }
}
```

### 5. Optional: `strains` Table

If you want visual matching to work, you need a `strains` table:

```sql
CREATE TABLE IF NOT EXISTS strains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  type TEXT,
  colors JSONB,
  terpenes JSONB,
  thc NUMERIC,
  cbd NUMERIC,
  description TEXT,
  effects JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_strains_slug ON strains(slug);
```

---

## Quick Setup Script

Run this in Supabase SQL Editor to set up everything:

```sql
-- Create scans table
CREATE TABLE IF NOT EXISTS scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'uploaded',
  vision_results JSONB,
  match_result JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_scans_created_at ON scans(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scans_status ON scans(status);

-- Note: Create the 'scans' storage bucket via the dashboard
```

---

## Troubleshooting

**If you get "Scans table does not exist":**
- Run the SQL above in Supabase SQL Editor

**If you get "Bucket not found":**
- Create the `scans` bucket in Storage section of dashboard
- Make sure it's named exactly `scans` (lowercase)

**If you get "Storage upload failed":**
- Check bucket permissions
- Make sure bucket allows the file types you're uploading
- Check file size limits

---

**After setup, restart your dev server:**
```bash
npm run dev
```

