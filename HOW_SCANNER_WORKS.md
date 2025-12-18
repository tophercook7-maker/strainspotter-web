# How the StrainSpotter Scanner Works

## Quick Answer: Yes, it's looking for TEXT (strain names) in your pictures!

The scanner uses **Google Vision API** to read text from images, then matches that text against our database of 35,000+ cannabis strains.

## How It Works (Step-by-Step)

### 1. You Upload an Image
- Take a photo or upload an existing image
- The image can be of packaging, labels, seed packets, or menu boards

### 2. Image is Sent to Google Vision API
- Google's AI reads ALL visible text in the image
- This includes:
  - Strain names
  - THC/CBD percentages
  - Brand names
  - Warnings and legal text
  - Any other readable text

### 3. Text is Cleaned and Processed
Our algorithm:
- Removes common noise words (cannabis, THC, CBD, product, package, warning, etc.)
- Filters out special characters
- Preserves important punctuation (hyphens, apostrophes) for strain names like "Jack Herer" or "Girl Scout Cookies"

### 4. Strain Matching (3 Strategies)
The app tries multiple approaches to find a match:

**Strategy 1: Full Text Search**
- Searches the entire cleaned text for multi-word strain names
- Works best when strain name is clearly visible
- Example: "Blue Dream Hybrid" → matches "Blue Dream"

**Strategy 2: Multi-Word Phrases**
- Extracts 2-4 word combinations and tries each
- Helps with partial visibility or extra text
- Example: "Premium Blue Dream 22% THC" → tries "Blue Dream", "Dream Premium", etc.

**Strategy 3: Individual Word Fallback**
- Searches significant words (>3 letters) individually
- Last resort for unclear or partial images
- Example: "Blue" alone might match "Blue Dream", "Alpha Blue", "Blue Cookies", etc.

### 5. Results Displayed
- **Exact Match**: Shows full strain details immediately (name, type, THC/CBD, effects, flavors, genetics)
- **Partial Match**: Shows up to 5 suggested strains you can tap to view
- **No Match**: Shows what text was detected to help you troubleshoot

## What Images Work Best

### ✅ GOOD Images
- Cannabis product packaging with clear strain name
- Dispensary labels with printed strain information
- Seed packets or breeder labels
- Menu boards or digital displays
- Close-up, well-lit, in-focus photos

### ❌ BAD Images
- Just the bud itself (no text visible)
- Blurry or out-of-focus text
- Text that's too small or too far away
- Handwritten strain names (Vision API struggles with handwriting)
- Dark lighting or heavy shadows

## Example Scenarios

### Scenario 1: Perfect Match
```
Image: Clear dispensary label showing "Blue Dream - Hybrid - 24% THC"
↓
Vision detects: "Blue Dream Hybrid 24 THC Premium Cannabis Product"
↓
Cleaning: "Blue Dream Hybrid 24"
↓
Result: ✅ Exact match found: Blue Dream (Hybrid, 24% THC)
```

### Scenario 2: Partial Match
```
Image: Blurry packaging with "...ue Dr... Hyb..."
↓
Vision detects: "ue Dr Hyb"
↓
Cleaning: "ue Dr Hyb"
↓
Result: 💡 Suggested: Blue Dream, Blue Cookies, Blue Diesel
```

### Scenario 3: No Match
```
Image: Just a photo of cannabis buds (no text)
↓
Vision detects: "" (empty)
↓
Cleaning: ""
↓
Result: ❌ No text detected. Try photographing the label or packaging.
```

## Troubleshooting

### "No text detected"
**Problem**: Vision API can't read any text from the image

**Solutions**:
- Ensure there's visible text in the image (label, packaging, etc.)
- Improve lighting
- Get closer to the text
- Make sure text is in focus
- Clean the camera lens

### "Detected text but no match"
**Problem**: Vision API reads text, but it doesn't match any strains

**Possible Causes**:
- Strain name is misspelled on the product
- It's a very rare or new strain not in our database (35,137 strains)
- The text detected is all noise (warnings, legal text, brand names)

**Solutions**:
- Use the Vision Diagnostic tool in Dev Dashboard to see exactly what text was detected
- Try photographing a different part of the packaging where the strain name is clearer
- Check browser console logs to see what matching attempts were made
- Search manually in the Browse tab to see if the strain exists

### "Suggested strains don't match"
**Problem**: The suggestions shown aren't what you're looking for

**This is normal** when:
- Only partial strain name is visible
- Multiple strains share similar words
- The packaging has more brand names than strain names

**Solutions**:
- Try a clearer photo focusing on the strain name area
- Cover background text with your finger/hand when photographing
- Use the diagnostic tool to understand what Vision is seeing

## Advanced: Vision API Diagnostic Tool

### Location
Dev Dashboard → "Open Vision Diagnostic Tool"

### What It Shows
- Exact text detected by Google Vision
- Text length (character count)
- Image labels/objects detected
- Raw Vision API response

### How to Use
1. Open http://localhost:5173
2. Navigate to Dev Dashboard
3. Click "Open Vision Diagnostic Tool"
4. Upload your image
5. Review "Full Text Detected"
6. Compare with what you expected

### Interpreting Results
- **Empty text**: Image has no readable text
- **Gibberish**: Image is too blurry
- **Correct strain name present**: Our matching algorithm missed it (rare)
- **Lots of extra text**: Try cropping to focus on strain name

## Browser Console Logs

All matching attempts are logged to your browser console for debugging:

```javascript
[Scanner] Detected text from Vision API: Blue Dream Hybrid 22% THC
[Scanner] Cleaned text for matching: Blue Dream Hybrid 22
[Scanner] Full text match found: Blue Dream
```

**To view**:
1. Open browser DevTools (F12 or Cmd+Option+I)
2. Go to Console tab
3. Use the Scanner feature
4. Watch for `[Scanner]` log messages

## Database Information

- **Total strains**: 35,137
- **Strain types**: Indica, Sativa, Hybrid
- **Data includes**: Name, type, description, effects, flavors, THC/CBD, genetics
- **Sources**: Multiple cannabis databases aggregated and normalized

## Tips for Best Results

1. **Focus on strain name area**: Don't include the entire package, just the label with the strain name
2. **Use good lighting**: Natural light or bright indoor lighting works best
3. **Hold steady**: Avoid motion blur
4. **Get close but not too close**: Text should be large but still in focus
5. **Try multiple angles**: If first attempt fails, try photographing from a different angle
6. **Clean text is key**: Printed text works much better than handwritten

## Technical Details

### Vision API Features Used
- `TEXT_DETECTION`: Optical Character Recognition (OCR) for reading text
- `LABEL_DETECTION`: Object and scene recognition (for future features)

### Text Processing
- Regular expressions to clean noise
- Multi-word phrase extraction (n-grams)
- Fuzzy matching via backend search API
- Case-insensitive comparison

### Privacy
- Images are uploaded to Supabase Storage temporarily
- Processed immediately by Vision API
- Results stored in database for your scan history
- You can view/delete your scan history anytime

## Need Help?

1. **Try the Vision Diagnostic tool first** to see what text is being detected
2. **Check browser console logs** to see the matching process
3. **Read SCAN_DEBUGGING.md** for comprehensive troubleshooting
4. **Test backend search directly**: 
   ```bash
   curl 'http://localhost:5181/api/search?q=your+strain+name'
   ```
