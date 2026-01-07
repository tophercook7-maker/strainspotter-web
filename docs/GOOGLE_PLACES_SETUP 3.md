# Google Places API Setup for Dispensary Finder

## Environment Variable

Add to `.env.local`:

```env
GOOGLE_MAPS_API_KEY=AIzaSyD6CxEmYyoPlV9NxrQlzPFNrthonAnihgc
```

**OR** (backward compatibility):

```env
GOOGLE_PLACES_API_KEY=AIzaSyD6CxEmYyoPlV9NxrQlzPFNrthonAnihgc
```

The API route checks for `GOOGLE_MAPS_API_KEY` first, then falls back to `GOOGLE_PLACES_API_KEY`.

## API Key Requirements

1. **Enable APIs in Google Cloud Console:**
   - Places API (New)
   - Geocoding API (for city/ZIP search)

2. **Billing:**
   - Must have billing enabled
   - Free tier: $200/month credit

3. **Key Restrictions (Recommended):**
   - **API restrictions:** Places API, Geocoding API only
   - **Application restrictions:** IP addresses (server IPs) or HTTP referrers
   - **Note:** Since we call from server-side only, browser restrictions not needed

## How It Works

1. **Nearby Search:**
   - Searches within 25km radius
   - Keyword: "cannabis dispensary"
   - Type: "store"
   - Returns up to 20 results

2. **Place Details:**
   - Fetches details for top 10 results
   - Gets: formatted_address, opening_hours, website, url
   - Enriches results with full address and hours

3. **Caching:**
   - Results cached by rounded coordinates (3 decimal places)
   - Cache TTL: 15 minutes
   - Reduces API calls for same location

4. **Error Handling:**
   - OVER_QUERY_LIMIT → User-friendly message
   - REQUEST_DENIED → Clear error (dev shows details)
   - INVALID_REQUEST → Validation error

## Testing

1. **With API Key:**
   - Navigate to `/garden/dispensaries`
   - Allow location or enter city/ZIP
   - Should see real dispensary results

2. **Without API Key:**
   - Dev mode: Returns 3 mock results
   - Prod mode: Returns 503 error

## Cost Estimates

- **Nearby Search:** $17 per 1,000 requests
- **Place Details:** $17 per 1,000 requests
- **Geocoding:** $5 per 1,000 requests

**Example:** 100 searches/month = ~$3.40/month (well within free tier)

## Current API Key

From notes: `AIzaSyD6CxEmYyoPlV9NxrQlzPFNrthonAnihgc`

**Status:** Ready to use (add to `.env.local`)
