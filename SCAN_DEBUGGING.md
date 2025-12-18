# StrainSpotter - Scan Debugging Guide

## Problem: "No strain match found"

If you're seeing this error, it means Google Vision detected text from your image, but the strain matching algorithm couldn't find any strains in the database that match.

## Diagnostic Tools

### 1. Vision API Diagnostic (NEW!)

**Location:** Dev Dashboard → "Open Vision Diagnostic Tool"

**What it does:**
- Shows you EXACTLY what text Google Vision detects from your image
- Displays image labels/objects detected
- Helps you understand if the image quality is good enough

**How to use:**
1. Open the app at http://localhost:5174
2. Click "Dev Dashboard" in navigation
3. Scroll to "Vision API Diagnostic" section
4. Click "Open Vision Diagnostic Tool"
5. Upload your cannabis product image
6. Click "Test Vision API"
7. Review the "Full Text Detected" output

**What to look for:**
- ✅ **Good**: Text contains the strain name (e.g., "Blue Dream", "Girl Scout Cookies")
- ❌ **Bad**: No text detected or only generic words (e.g., "Cannabis", "THC 22%", "Product")
- ⚠️ **Partial**: Text detected but strain name is misspelled or broken up

### 2. Browser Console Logs

**How to view:**
1. Open your browser's Developer Tools (F12 or Cmd+Option+I)
2. Click "Console" tab
3. Use the Scanner feature
4. Watch for `[Scanner]` log messages

**What the logs show:**
```
[Scanner] Detected text from Vision API: Blue Dream Hybrid 22% THC
[Scanner] Cleaned text for matching: Blue Dream Hybrid 22
[Scanner] Full text match found: Blue Dream
```

**Troubleshooting from logs:**
- If "Detected text" is empty → Image has no readable text
- If "Cleaned text" is very short → Not enough keywords to match
- If you see multiple "Trying phrase/word" logs → Matching is working but no results in database

## Common Issues & Solutions

### Issue 1: Image Quality
**Symptoms:** Vision detects little or no text
**Solutions:**
- Use better lighting
- Hold camera steady (avoid blur)
- Get closer to the text/label
- Ensure text is in focus
- Try a different angle

### Issue 2: Strain Not in Database
**Symptoms:** Vision detects correct strain name but no match found
**Solutions:**
- Check if strain name is spelled correctly in the image
- Try searching manually in the Browse tab
- Check console logs to see what Vision detected
- The database has 35,137 strains, but some rare/new strains may be missing

### Issue 3: Noisy Background
**Symptoms:** Vision detects lots of irrelevant text (warnings, logos, legal text)
**Solutions:**
- Crop the image to focus on the strain name area
- Cover background text with your hand/finger
- The algorithm filters common words but may miss some

### Issue 4: Multi-Word Strain Names
**Symptoms:** Strain names like "Girl Scout Cookies" don't match
**Solutions:**
- The updated algorithm now tries multi-word phrases (2-4 words)
- Console logs will show each phrase attempt
- If still failing, the exact name spelling might differ in the database

## Testing the Enhanced Matching

The Scanner now uses 3 strategies:

1. **Full text search** → Tries entire detected text
2. **Phrase matching** → Tries 2-4 word combinations
3. **Individual words** → Falls back to single significant words

Plus a **fallback UI** that shows:
- Detected text preview
- Top 5 suggested strains based on partial matches
- Manual selection option

## Quick Test Examples

### Test 1: Upload a Clear Label
1. Find a cannabis product with a clear strain name on the label
2. Take/upload photo in Scanner
3. Check console for "[Scanner] Full text match found: ..."
4. Should show strain details immediately

### Test 2: Blurry/Partial Text
1. Upload image with partially visible strain name
2. Should see suggested strains in results dialog
3. Tap a suggestion to view its details

### Test 3: Diagnostic Tool
1. Use same image in Vision Diagnostic tool
2. Compare "Full Text Detected" with what you expected
3. If text is way off → image quality issue
4. If text is correct but no match → database doesn't have that strain

## Backend API Endpoints

### Test Vision Detection Directly
```bash
# Create base64 from image
BASE64=$(base64 -i your-image.jpg | tr -d '\n')

# Test Vision API
curl -X POST http://localhost:5181/api/diagnostic/vision-test \
  -H 'Content-Type: application/json' \
  -d "{\"base64\":\"$BASE64\"}" | jq .
```

### Test Search Directly
```bash
# Search for "Blue Dream"
curl -s 'http://localhost:5181/api/search?q=blue+dream&limit=5' | jq .

# Search for single word
curl -s 'http://localhost:5181/api/search?q=blue&limit=5' | jq .
```

## Next Steps

1. **Try the Vision Diagnostic tool** with your image first
2. **Check browser console** when using Scanner
3. **Review detected text** to understand what Vision sees
4. **Adjust image quality** based on diagnostic results
5. **Use suggested strains** feature when exact match fails

## Status

- ✅ Backend: Running on http://localhost:5181
- ✅ Frontend: Running on http://localhost:5174
- ✅ Vision API: Configured
- ✅ Service Role: Configured (RLS bypass working)
- ✅ Database: 35,137 strains loaded
- ✅ Enhanced matching: 3-strategy algorithm active
- ✅ Diagnostic tools: Available in Dev Dashboard

## Support

If you're still having issues:
1. Share the output from Vision Diagnostic tool
2. Share the console logs from Scanner
3. Describe what strain name you expect to find
4. Check if that strain exists: `curl 'http://localhost:5181/api/search?q=YOUR_STRAIN'`
