# 🚀 Render Deployment Checklist

## ✅ Step 1: Check if Render Backend is Live

### A. Find Your Render URL
1. Go to: https://dashboard.render.com
2. Click on your **strainspotter-backend** service
3. Look at the top - you'll see a URL like:
   ```
   https://strainspotter-backend-XXXX.onrender.com
   ```
4. **Copy this URL!**

### B. Test the Backend
Open in browser:
```
https://YOUR-RENDER-URL.onrender.com/health
```

**Expected Response:**
```json
{
  "ok": true,
  "supabaseConfigured": true,
  "googleVisionConfigured": true
}
```

**If you see errors:**
- Check the "Logs" tab in Render
- Make sure all environment variables are set (see below)

---

## ✅ Step 2: Verify Environment Variables in Render

Go to: **Render Dashboard → Your Service → Environment**

Make sure these are set:

```bash
# Supabase (from your env/.env.local file)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Google Vision (the JSON we just added)
GOOGLE_VISION_JSON={"type":"service_account",...}

# Port (Render sets this automatically)
PORT=10000
```

**If any are missing:**
1. Click "Add Environment Variable"
2. Add the missing ones from `env/.env.local`
3. Click "Save Changes"
4. Render will auto-redeploy

---

## ✅ Step 3: Connect Frontend to Render Backend

### A. Update Frontend Config

Edit `frontend/src/config.js` line 16:

**Replace:**
```javascript
const DEFAULT_REMOTE_API = 'https://YOUR-RENDER-URL.onrender.com';
```

**With your actual Render URL:**
```javascript
const DEFAULT_REMOTE_API = 'https://strainspotter-backend-abc123.onrender.com';
```

### B. Deploy Frontend to Vercel

```bash
cd frontend
npm run build
```

Then push to GitHub:
```bash
git add .
git commit -m "Connect frontend to Render backend"
git push
```

Vercel will auto-deploy!

---

## ✅ Step 4: Test the Full Stack

### A. Test Backend Directly
```bash
# Health check
curl https://YOUR-RENDER-URL.onrender.com/health

# Get strains
curl https://YOUR-RENDER-URL.onrender.com/api/strains?limit=5
```

### B. Test Frontend
1. Go to your Vercel URL: `https://strainspotter.vercel.app`
2. Open browser console (F12)
3. Look for API calls - they should go to your Render URL
4. Try browsing strains - should load from backend

---

## 🔍 How to Check Deployment Status

### Render (Backend)
1. Go to: https://dashboard.render.com
2. Click your service
3. Look for:
   - **Green "Live" badge** = Deployed successfully
   - **Yellow "Building"** = Still deploying
   - **Red "Failed"** = Check logs

### Vercel (Frontend)
1. Go to: https://vercel.com/dashboard
2. Click your project
3. Look at "Deployments" tab
4. Latest deployment should be "Ready"

---

## 🐛 Troubleshooting

### Backend Issues

**Problem: Health check returns 500 error**
- Check Render logs: Dashboard → Logs tab
- Verify environment variables are set
- Make sure `GOOGLE_VISION_JSON` is valid JSON

**Problem: "Module not found" errors**
- Render might not have installed dependencies
- Check Build Logs
- Try manual redeploy: Dashboard → Manual Deploy → Clear build cache

**Problem: CORS errors in browser**
- Backend should have CORS enabled for your Vercel domain
- Check `backend/index.js` - should have `cors()` middleware

### Frontend Issues

**Problem: Frontend still calling localhost**
- Check `frontend/src/config.js` - make sure `DEFAULT_REMOTE_API` is updated
- Clear browser cache
- Redeploy frontend

**Problem: 404 on API calls**
- Check Network tab in browser console
- Verify the URL being called matches your Render URL
- Check Render logs to see if requests are arriving

---

## 📝 Quick Commands

### Check Backend Health
```bash
curl https://YOUR-RENDER-URL.onrender.com/health
```

### Test Strain API
```bash
curl https://YOUR-RENDER-URL.onrender.com/api/strains?limit=5
```

### Rebuild Frontend
```bash
cd frontend
npm run build
git add dist
git commit -m "Rebuild frontend"
git push
```

### View Render Logs
```bash
# In Render Dashboard → Logs tab
# Or use Render CLI:
render logs -s strainspotter-backend
```

---

## ✅ Success Checklist

- [ ] Render backend shows "Live" status
- [ ] `/health` endpoint returns `{"ok": true}`
- [ ] `/api/strains` returns strain data
- [ ] Frontend `config.js` points to Render URL
- [ ] Frontend deployed to Vercel
- [ ] Frontend can load strains from backend
- [ ] No CORS errors in browser console

---

## 🎯 Next Steps After Deployment

1. **Test image scanning** - Upload a cannabis image
2. **Check Google Vision** - Make sure it processes images
3. **Monitor Render logs** - Watch for errors
4. **Set up custom domain** (optional) - In Render settings

---

Need help? Check:
- Render logs: https://dashboard.render.com → Your Service → Logs
- Vercel logs: https://vercel.com/dashboard → Your Project → Deployments
- Browser console: F12 → Console tab

