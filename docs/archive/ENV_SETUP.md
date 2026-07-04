# Environment Variables Setup

## ✅ Configuration Complete

The `.env.local` file has been created with your Supabase credentials.

### Configured Variables

- ✅ `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anonymous key
- ✅ `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key
- ⚠️ `GOOGLE_APPLICATION_CREDENTIALS` - **Not set** (Vision API will use mock results)

---

## 🔧 Optional: Google Vision API Setup

If you want to use real Google Vision API features (text detection, label detection, color extraction), you need to:

1. **Get a Google Cloud Vision API key:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a project or select an existing one
   - Enable the Vision API
   - Create a service account and download the JSON key file

2. **Add the key path to `.env.local`:**
   ```env
   GOOGLE_APPLICATION_CREDENTIALS=/path/to/your/google-vision-key.json
   ```

3. **Restart the dev server:**
   ```bash
   npm run dev
   ```

**Note:** Without the Google Vision API key, the app will still work but will use mock vision results. The visual matching will still function using the mock data.

---

## 🚀 Next Steps

1. **Restart the dev server** to load the new environment variables:
   ```bash
   npm run dev
   ```

2. **Test the configuration:**
   - Visit `/scanner-upload` to test image upload
   - The Supabase integration should now work
   - Uploads will be stored in Supabase Storage

3. **Verify Supabase setup:**
   - Ensure the `scans` table exists in your Supabase database
   - Ensure the `strains` table exists with strain data
   - Ensure the `scans` storage bucket exists in Supabase Storage

---

## 📝 File Locations

- `.env.local` - Your actual environment variables (gitignored)
- `.env.example` - Template file (safe to commit)

---

## 🔒 Security Notes

- ✅ `.env.local` is in `.gitignore` and will not be committed
- ✅ Never commit actual credentials to git
- ✅ Use `.env.example` as a template for other developers

---

**Configuration complete!** 🎉

