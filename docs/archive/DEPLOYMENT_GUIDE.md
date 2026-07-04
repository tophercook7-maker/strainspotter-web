# StrainSpotter Deployment Guide

## Current Server Status

✅ **Backend:** http://localhost:5181
✅ **Frontend:** http://localhost:5173

---

## Vercel Deployment Setup

### Issue: "Vercel asking for root directory"

**Problem:** Your project has both `backend/` and `frontend/` in the same repo, but Vercel needs to know which one to deploy.

### Solution: Deploy Frontend to Vercel

Vercel is best for the **frontend only**. The backend needs to be deployed separately (Render, Railway, or Heroku).

---

## Step 1: Prepare Frontend for Vercel

### A. Set Root Directory in Vercel

When Vercel asks for root directory:

**Root Directory:** `frontend`

### B. Configure Build Settings

**Build Command:** `npm run build`
**Output Directory:** `dist`
**Install Command:** `npm install`

### C. Add Environment Variables in Vercel

In Vercel Dashboard → Your Project → Settings → Environment Variables:

```
VITE_API_BASE_URL=https://your-backend-url.onrender.com
```

(You'll get this URL after deploying backend - see Step 2)

### D. Update Frontend API Config

Create/update `frontend/src/config.js`:

```javascript
// Use environment variable in production, localhost in development
export const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5181';
```

---

## Step 2: Deploy Backend Separately

### Option A: Render.com (Recommended - Free Tier)

1. Go to https://render.com
2. Click "New +" → "Web Service"
3. Connect your GitHub repo
4. Configure:
   - **Name:** strainspotter-backend
   - **Root Directory:** `backend`
   - **Build Command:** `npm install`
   - **Start Command:** `node index.js`
   - **Environment:** Node
   - **Instance Type:** Free

5. Add Environment Variables:
   ```
   SUPABASE_URL=your_supabase_url
   SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   GOOGLE_APPLICATION_CREDENTIALS=./google-vision-key.json
   PORT=5181
   ```

6. Copy the deployed URL (e.g., `https://strainspotter-backend.onrender.com`)

### Option B: Railway.app

Similar setup but easier:
1. https://railway.app
2. "New Project" → "Deploy from GitHub"
3. Select repo → Configure backend directory
4. Add environment variables
5. Deploy

---

## Step 3: Update Frontend with Backend URL

After backend is deployed:

1. Go to Vercel → Your Project → Settings → Environment Variables
2. Set: `VITE_API_BASE_URL=https://your-backend-url.onrender.com`
3. Redeploy frontend

---

## Step 4: Organize GitHub Repository

Your current structure is fine, but add these files:

### A. Root `.gitignore`

Create `/Users/christophercook/Projects/strainspotter/.gitignore`:

```
# Environment
env/.env.local
.env
.env.local

# Dependencies
node_modules/
*/node_modules/

# Build outputs
dist/
build/
*/dist/
*/build/

# Logs
*.log
npm-debug.log*
/tmp/*.log

# OS
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/

# Supabase
.supabase/

# Google credentials (NEVER commit)
**/google-vision-key.json
env/google-vision-key.json
```

### B. Root `README.md`

I'll create this for you with deployment instructions.

### C. `vercel.json` in Frontend

Create `frontend/vercel.json`:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

---

## Quick Deployment Checklist

### Before Deploying:

- [ ] Commit all changes to GitHub
- [ ] Ensure `env/.env.local` is in `.gitignore` (secrets should NOT be in repo)
- [ ] Update `frontend/src/config.js` to use environment variable
- [ ] Test locally one more time

### Backend Deployment (Render):

- [ ] Create Render account
- [ ] Deploy backend as Web Service
- [ ] Set all environment variables
- [ ] Get deployed URL
- [ ] Test health endpoint: `https://your-backend.onrender.com/health`

### Frontend Deployment (Vercel):

- [ ] Create Vercel account
- [ ] Connect GitHub repo
- [ ] Set root directory to `frontend`
- [ ] Add `VITE_API_BASE_URL` environment variable
- [ ] Deploy
- [ ] Test deployed site

---

## Troubleshooting

### "Vercel can't find package.json"

**Fix:** Set root directory to `frontend` in Vercel project settings

### "Build fails - missing dependencies"

**Fix:** Make sure `package.json` is in the `frontend/` directory

### "API calls fail in production"

**Fix:** 
1. Check backend is deployed and running
2. Verify `VITE_API_BASE_URL` is set in Vercel
3. Check CORS settings in backend (allow Vercel domain)

### "Backend crashes on Render"

**Fix:**
1. Check logs in Render dashboard
2. Ensure all environment variables are set
3. Verify Google Vision credentials are configured

---

## CORS Configuration for Production

Add to `backend/index.js` (before routes):

```javascript
// CORS - allow Vercel frontend
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5175',
    'https://your-vercel-app.vercel.app'  // Replace with your Vercel URL
  ],
  credentials: true
}));
```

---

## Estimated Costs

- **Frontend (Vercel):** FREE (Hobby plan)
- **Backend (Render):** FREE (with cold starts) or $7/month (always on)
- **Supabase:** FREE (up to 500MB storage)
- **Google Vision API:** ~$1.50 per 1000 images

**Total:** FREE to $10/month depending on traffic

---

## Next Steps

1. **Immediate:** I'll create the necessary config files for Vercel deployment
2. **Backend:** Deploy to Render.com (5-10 minutes)
3. **Frontend:** Deploy to Vercel (2-5 minutes)
4. **Test:** Verify everything works in production

Want me to create these config files now?
