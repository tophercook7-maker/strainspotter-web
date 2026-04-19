# Troubleshooting Internal Server Error

## Common Issues and Solutions

### 1. Supabase Configuration

**Check if environment variables are set:**
```bash
cat .env.local | grep SUPABASE
```

**Verify:**
- `NEXT_PUBLIC_SUPABASE_URL` is set
- `SUPABASE_SERVICE_ROLE_KEY` is set
- Values are correct (no extra spaces, quotes, etc.)

### 2. Supabase Database Tables

**Required table: `scans`**

Create in Supabase SQL Editor:
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
```

### 3. Supabase Storage Bucket

**Required bucket: `scans`**

Create in Supabase Dashboard:
1. Go to Storage
2. Click "New bucket"
3. Name: `scans`
4. Public: `false` (or `true` if you want public access)
5. File size limit: 10MB
6. Allowed MIME types: `image/jpeg, image/png, image/webp, image/heic`

### 4. Check Server Logs

**View Next.js dev server output:**
- Check the terminal where `npm run dev` is running
- Look for error messages with stack traces
- Common errors:
  - "Supabase admin client not initialized" → Check env vars
  - "relation 'scans' does not exist" → Create table
  - "Bucket not found" → Create storage bucket
  - "Storage upload failed" → Check bucket permissions

### 5. Test API Endpoints

**Test upload endpoint:**
```bash
curl -X POST http://localhost:3000/api/uploads \
  -H "Content-Type: application/json" \
  -d '{"image": "data:image/jpeg;base64,/9j/4AAQ..."}'
```

**Test scans endpoint:**
```bash
curl http://localhost:3000/api/scans
```

### 6. Browser Console

**Check browser console for errors:**
- Open DevTools (F12)
- Check Console tab for JavaScript errors
- Check Network tab for failed API requests
- Look at response bodies for error messages

### 7. Common Error Messages

| Error | Solution |
|-------|----------|
| "Supabase not configured" | Check `.env.local` file exists and has correct values |
| "Scans table does not exist" | Create `scans` table in Supabase |
| "Bucket not found" | Create `scans` storage bucket |
| "Storage upload failed" | Check bucket permissions and file size limits |
| "Failed to create scan" | Check database connection and table schema |

### 8. Restart Dev Server

**After fixing issues:**
```bash
# Stop the server (Ctrl+C)
# Then restart:
npm run dev
```

---

## Quick Fix Checklist

- [ ] `.env.local` file exists
- [ ] Supabase URL is correct
- [ ] Service role key is correct
- [ ] `scans` table exists in Supabase
- [ ] `scans` storage bucket exists
- [ ] Bucket has correct permissions
- [ ] Dev server restarted after changes

---

## Getting More Details

**Enable verbose logging:**
- Check terminal output from `npm run dev`
- Look for error stack traces
- Check browser console for client-side errors
- Check Network tab for API response details

