# Vercel + Supabase Paste Sheet (Step‑by‑Step)

Note: A private, pre-filled copy with your actual values was generated at `docs/VERCEL_PASTE_SHEET.local.md` (git-ignored). Use that for copy/paste; this public doc keeps instructions only.

This is a fill‑in guide that tells you exactly where to paste each value. Keep it open while you click around Vercel and Supabase.

Tip: Values that look secret come from your local files, not this doc. I’ll show you how to view them locally without sharing them.

---

## 1) Identify your two Vercel projects

You will deploy this repo twice (monorepo):

- Frontend project
  - Root directory: `frontend/`
  - Framework: Vite
  - URL will look like: https://YOUR-FRONTEND.vercel.app

- Backend project
  - Root directory: `backend/`
  - Uses `backend/vercel.json`
  - URL will look like: https://YOUR-BACKEND.vercel.app

In Vercel:
- For each, go to: Project → Settings → Environment Variables.

---

## 2) Frontend variables (React + Vite)

Project: your FRONTEND project → Settings → Environment Variables → Add three vars (Environment: Production)

Paste these names exactly:

- Name: `VITE_SUPABASE_URL`
  - Value: Your Supabase project URL (looks like https://xxxx.supabase.co)
  - Where to find locally: run in terminal and copy the right side
    - macOS Terminal, from repo root:
      - `grep '^VITE_SUPABASE_URL=' frontend/.env.local.backup`

- Name: `VITE_SUPABASE_ANON_KEY`
  - Value: Your Supabase anon key
  - Where to find locally:
      - `grep '^VITE_SUPABASE_ANON_KEY=' frontend/.env.local.backup`

- Name: `VITE_API_BASE`
  - Value: Your BACKEND Vercel URL (e.g., https://YOUR-BACKEND.vercel.app)
  - Where to get: copy from the Vercel dashboard of your backend project → Domains → click the production domain → copy URL

Optional: repeat the same for Environment: Preview (so preview deployments also work).

Click Save (or Add) for each, then hit “Redeploy” on the project Overview.

---

## 3) Backend variables (Express API)

Project: your BACKEND project → Settings → Environment Variables → Add the following (Environment: Production)

Required (Supabase):
- `SUPABASE_URL` = your Supabase project URL
  - Locally: `grep '^SUPABASE_URL=' env/.env.local`
- `SUPABASE_ANON_KEY` = your Supabase anon key
  - Locally: `grep '^SUPABASE_ANON_KEY=' env/.env.local`
- `SUPABASE_SERVICE_ROLE_KEY` = your Supabase service role key
  - Locally: `grep '^SUPABASE_SERVICE_ROLE_KEY=' env/.env.local`

CORS (allow your frontend domain to call this API):
- `CORS_ALLOW_ORIGINS` = https://YOUR-FRONTEND.vercel.app
  - Optional add preview too, comma separated: https://YOUR-FRONTEND.vercel.app, https://YOUR-FRONTEND-git-branch-user.vercel.app

Google Vision (choose ONE approach):
- Easiest inline JSON (recommended for Vercel):
  - `GOOGLE_VISION_JSON` = paste the full JSON for your Google service account
- Or credentials file path (advanced):
  - `GOOGLE_APPLICATION_CREDENTIALS` = path to a credentials file (only if you deploy one)

Feedback email (SMTP; optional but recommended):
- `SMTP_HOST` = smtp.gmail.com (or your provider)
- `SMTP_PORT` = 465 (SSL) or 587 (TLS)
- `SMTP_USER` = your email/SMTP username
- `SMTP_PASS` = your SMTP password (for Gmail: App Password from Google Account → Security → App passwords)
- `EMAIL_FROM` = e.g., `StrainSpotter <no-reply@your-domain.com>` (or your Gmail)
- `EMAIL_TO` = the inbox where you want feedback to arrive

Optional: repeat for Environment: Preview.

After adding variables, Redeploy this backend project.

---

## 4) Supabase Auth redirects (one-time)

In Supabase Dashboard:
- Authentication → URL Configuration → Allowed Redirect URLs
  - Add: `https://YOUR-FRONTEND.vercel.app`
  - Add your Preview domain if you’ll test previews
- Save

This makes magic-link and password reset return to your app.

---

## 5) Verify (copy/paste tests)

Backend health (replace with your backend URL):
- Open: `https://YOUR-BACKEND.vercel.app/health`
- Expected JSON:
  - `ok: true`
  - `supabaseConfigured: true`
  - `googleVisionConfigured: true` (true only if you set Vision credentials)

Frontend app:
- Open: `https://YOUR-FRONTEND.vercel.app`
- Account → Try Sign In (password) or “Send Magic Link”
  - After sign-in, the app auto-creates your user in the database
- Feedback → Send a message
  - If SMTP is configured, you receive an email at `EMAIL_TO`

---

## 6) Troubleshooting quick hits

- Frontend shows “Auth not configured”
  - Fix: Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` on the FRONTEND project; redeploy

- Frontend warns about calling localhost API
  - Fix: Set `VITE_API_BASE` to your backend Vercel URL; redeploy

- Backend `/health` shows supabaseConfigured: false
  - Fix: Set `SUPABASE_URL` and `SUPABASE_ANON_KEY` on BACKEND; redeploy

- Feedback emails not arriving
  - Fix: Ensure `SMTP_*`, `EMAIL_FROM`, and `EMAIL_TO` are set on BACKEND; check Vercel backend logs for `[FEEDBACK]` lines
  - Gmail users: use an App Password, not your normal password

- Image upload fails with RLS/permission errors
  - Fix: Ensure `SUPABASE_SERVICE_ROLE_KEY` is set on BACKEND

---

## 7) Copy blocks you can paste into Vercel

Frontend (Production)
```
# Names only — paste into Vercel FRONTEND → Settings → Environment Variables
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_API_BASE=https://YOUR-BACKEND.vercel.app
```

Backend (Production)
```
# Names only — paste into Vercel BACKEND → Settings → Environment Variables
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
CORS_ALLOW_ORIGINS=https://YOUR-FRONTEND.vercel.app

# One of:
GOOGLE_VISION_JSON=
# or
# GOOGLE_APPLICATION_CREDENTIALS=/var/task/google-vision.json

# Email notifications (optional)
SMTP_HOST=
SMTP_PORT=465
SMTP_USER=
SMTP_PASS=
EMAIL_FROM=
EMAIL_TO=
```

Where to get local values (run in repo root)
```
# Supabase for backend (right side of = is your value)
grep '^SUPABASE_URL=' env/.env.local
grep '^SUPABASE_ANON_KEY=' env/.env.local
grep '^SUPABASE_SERVICE_ROLE_KEY=' env/.env.local

# Supabase for frontend (if you kept a backup)
grep '^VITE_SUPABASE_URL=' frontend/.env.local.backup
grep '^VITE_SUPABASE_ANON_KEY=' frontend/.env.local.backup
```

That’s it. After you paste and redeploy both projects, the app should be fully wired up. If anything doesn’t match what you see, tell me which step and I’ll adjust this sheet for you.
