# Vercel Environment Variables Setup

Your backend is now deployed at: **https://backend-qp9e6f9oh-tophercook7-makers-projects.vercel.app**

## Required Configuration

Go to [Vercel Dashboard](https://vercel.com/tophercook7-makers-projects/backend/settings/environment-variables) and add these variables:

### 1. SUPABASE_URL
- Value: Copy from `env/.env.local`
- Environments: Production, Preview, Development

### 2. SUPABASE_ANON_KEY
- Value: Copy from `env/.env.local`
- Environments: Production, Preview, Development

### 3. SUPABASE_SERVICE_ROLE_KEY
- Value: Copy from `env/.env.local`
- Environments: Production, Preview, Development

### 4. GOOGLE_VISION_JSON
- Value: Copy the **entire contents** of `env/google-vision-key.json` (should be a single-line JSON string with your service account key)
- Environments: Production, Preview, Development

**Note**: Use `GOOGLE_VISION_JSON` instead of `GOOGLE_APPLICATION_CREDENTIALS` because Vercel serverless functions can't easily reference local files. The backend automatically writes this JSON to a temp file at runtime.

### 5. CORS_ALLOW_ORIGINS (Optional)
- Value: `https://your-frontend-domain.vercel.app` (add your deployed frontend URL)
- Environments: Production
- Default: `http://localhost:5173,http://127.0.0.1:5173`

## After Adding Variables

1. Go to Vercel → Deployments
2. Find the latest deployment
3. Click "..." → "Redeploy"
4. Test health endpoint: `https://backend-qp9e6f9oh-tophercook7-makers-projects.vercel.app/health`

Expected response:
```json
{
  "ok": true,
  "supabaseConfigured": true,
  "googleVisionConfigured": true
}
```

## Update Frontend Config

Once backend is working, update `frontend/src/config.js`:

```javascript
const fallback = isLocalhost 
  ? 'http://localhost:5181' 
  : 'https://backend-qp9e6f9oh-tophercook7-makers-projects.vercel.app';
```

Or set `VITE_API_BASE` environment variable in your frontend Vercel project to:
```
https://backend-qp9e6f9oh-tophercook7-makers-projects.vercel.app
```

## Test Diagnostic Endpoint

After configuration, test the full pipeline:
```bash
curl "https://backend-qp9e6f9oh-tophercook7-makers-projects.vercel.app/api/diagnostic/scan"
```

Should return comprehensive diagnostics JSON with all steps passing.

## Commands to Get Your Current Values

```bash
# Get SUPABASE_URL
grep SUPABASE_URL env/.env.local

# Get SUPABASE_ANON_KEY
grep SUPABASE_ANON_KEY env/.env.local

# Get SUPABASE_SERVICE_ROLE_KEY
grep SUPABASE_SERVICE_ROLE_KEY env/.env.local

# Get GOOGLE_VISION_JSON (entire file content)
cat env/google-vision-key.json
```
