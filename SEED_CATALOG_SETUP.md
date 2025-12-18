# Seed Catalog Implementation Guide

## Current State
The Seeds & Genetics page pulls from `backend/strains/strains-sample.json`, which only contains two sample strains (Blue Dream and Sour Diesel). The frontend hides this placeholder by showing "catalog being populated" when ≤ 2 items are returned.

## How to Populate the Seed Catalog

### Option 1: Manual CSV Import (Quick Start)
1. Create a CSV with columns: `strain_name, breeder, seed_vendor_name, seed_vendor_url, type, thc, cbd, description`
2. Example row:
   ```
   Blue Dream,ILGM,ILGM,https://ilgm.com/products/blue-dream-feminized-seeds,hybrid,18,2,Sativa-dominant hybrid
   ```
3. Convert to JSON and merge into `backend/strains/strains-sample.json`
4. Restart backend—API will automatically serve the expanded catalog

### Option 2: Add to Main Strain Library (Integrated)
The primary strain database is at `backend/data/strain_library.json`. Currently, most entries have empty `seed_vendors` arrays. To populate:

1. Open `backend/data/strain_library.json`
2. Find strains you want to add seed vendors for
3. Add `seed_vendors` array to each strain:
   ```json
   {
     "slug": "blue-dream",
     "name": "Blue Dream",
     "type": "Hybrid",
     "thc": 18,
     "cbd": 2,
     "description": "...",
     "seed_vendors": [
       {
         "name": "ILGM",
         "url": "https://ilgm.com/products/blue-dream-feminized-seeds"
       },
       {
         "name": "Seedsman",
         "url": "https://www.seedsman.com/en/blue-dream-seeds"
       }
     ]
   }
   ```
4. Backend route `/api/seeds` automatically extracts these

### Option 3: Scrape Seed Banks (Automated)
Common seed bank APIs/sites:
- **ILGM** (ilgm.com) — no public API, scrape with Playwright/Puppeteer
- **Seedsman** (seedsman.com) — structured HTML, easier to scrape
- **Attitude Seed Bank** (cannabis-seeds-bank.co.uk)
- **SeedsHereNow** (seedsherenow.com)

**Steps:**
1. Create `tools/scrape_seed_vendors.mjs`:
   ```javascript
   import puppeteer from 'puppeteer';
   import fs from 'fs';
   
   const strains = JSON.parse(fs.readFileSync('backend/data/strain_library.json', 'utf8'));
   const browser = await puppeteer.launch();
   
   for (const strain of strains.slice(0, 100)) {
     const searchUrl = `https://ilgm.com/search?q=${encodeURIComponent(strain.name)}`;
     const page = await browser.newPage();
     await page.goto(searchUrl);
     // Extract product links
     const links = await page.$$eval('a.product-link', els => els.map(e => e.href));
     if (links.length > 0) {
       strain.seed_vendors = strain.seed_vendors || [];
       strain.seed_vendors.push({ name: 'ILGM', url: links[0] });
     }
     await page.close();
   }
   
   fs.writeFileSync('backend/data/strain_library_enhanced.json', JSON.stringify(strains, null, 2));
   ```
2. Run: `node tools/scrape_seed_vendors.mjs`
3. Replace `strain_library.json` with enhanced version

### Option 4: Use Seed Vendor APIs (Best for Live Data)
Some seed banks offer affiliate/wholesale APIs:
- Contact seed banks directly for partnership/API access
- Wire API responses into `/api/seeds` dynamically instead of static JSON

**Implementation:**
1. Store API keys in `env/.env.local`:
   ```
   SEED_VENDOR_API_KEY=xxxxx
   ```
2. Update `backend/routes/seeds.js`:
   ```javascript
   router.get('/', async (req, res) => {
     const { strain_slug } = req.query;
     // Call external API
     const response = await fetch(`https://api.seedvendor.com/strains/${strain_slug}`, {
       headers: { 'Authorization': `Bearer ${process.env.SEED_VENDOR_API_KEY}` }
     });
     const data = await response.json();
     res.json(data.products);
   });
   ```

## Recommended Approach for Production

1. **Phase 1 (Now):** Manually curate 50–100 popular strains with seed vendor links in `strain_library.json`
2. **Phase 2:** Set up a weekly scraper to refresh seed availability and pricing
3. **Phase 3:** Integrate with seed bank affiliate programs for real-time inventory + revenue

## Testing After Adding Seeds

```bash
# Check seed count
curl http://localhost:5181/api/seeds | jq 'length'

# Should return > 2 to show real catalog
# Frontend will automatically display cards instead of placeholder
```

## Notes
- Seed vendors change URLs frequently—plan for link validation/refresh
- Consider storing `last_verified` timestamp per vendor link
- Add `in_stock` boolean if vendor APIs support it
- Pricing is volatile; scrape or API call for real-time data
