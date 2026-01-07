# Dispensary Finder Setup

## Overview

The Dispensary Finder uses location-based search to find nearby cannabis dispensaries. It supports two APIs:

1. **Google Places API** (Primary) - Requires API key, provides rich data
2. **OpenStreetMap** (Fallback) - No API key needed, works worldwide

## Features

- ✅ Location-based search using GPS
- ✅ Manual city/ZIP search fallback
- ✅ Real-time distance calculation
- ✅ Open/Closed status (Google Places only)
- ✅ Opening hours display (Google Places only)
- ✅ "Open in Maps" button for navigation
- ✅ Server-side API calls (keys never exposed to client)
- ✅ 15-minute result caching

## Setup (Optional - Google Places API)

The finder works without any setup using OpenStreetMap, but Google Places provides richer data.

### Step 1: Get Google Places API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project or select existing one
3. Enable **Places API** (New)
4. Create credentials (API Key)
5. Restrict the key to:
   - **Application restrictions**: HTTP referrers (for web) or IP addresses (for server)
   - **API restrictions**: Places API only

### Step 2: Add Environment Variable

Add to `.env.local`:

```env
GOOGLE_PLACES_API_KEY=your_api_key_here
```

### Step 3: Restart Dev Server

```bash
npm run dev
```

## How It Works

### Primary Flow (Google Places)

1. User grants location permission
2. App sends coordinates to `/api/dispensaries/search`
3. Server calls Google Places Nearby Search API
4. Results include: name, address, distance, open status, hours
5. Results cached for 15 minutes

### Fallback Flow (OpenStreetMap)

1. If Google Places fails or no API key:
2. Server queries OpenStreetMap Overpass API
3. Searches for `amenity=dispensary` or `shop=cannabis`
4. Results include: name, address, distance
5. Less rich data but works worldwide without API key

### Manual Search

1. If location denied:
2. User enters city or ZIP code
3. Server geocodes location using Nominatim (OSM)
4. Then searches dispensaries near that location

## API Endpoints

### `GET /api/dispensaries/search`

**Query Parameters:**
- `lat` (number) - Latitude
- `lng` (number) - Longitude
- `city` (string, optional) - City name for manual search
- `zip` (string, optional) - ZIP code for manual search

**Response:**
```json
{
  "dispensaries": [
    {
      "id": "string",
      "name": "string",
      "address": "string",
      "distance": 1234,
      "latitude": 40.7128,
      "longitude": -74.0060,
      "openNow": true,
      "openingHours": "Mon-Fri: 9am-9pm",
      "placeId": "ChIJ...",
      "source": "google"
    }
  ],
  "count": 1
}
```

## Rate Limiting

- Google Places: Subject to Google's quotas (free tier: 1,000 requests/day)
- OpenStreetMap: No strict limits, but be respectful (max 1 request per user per 15 minutes)

## Error Handling

- Location denied → Manual search UI appears
- No results → Empty state message
- API failure → Graceful error message, no page crash
- Network timeout → 30-second timeout with retry option

## Testing

### Test Cases

1. **Location Allowed:**
   - Grant location permission
   - Verify results appear
   - Check distance calculation
   - Test "Open in Maps" button

2. **Location Denied:**
   - Deny location permission
   - Verify manual search appears
   - Enter city/ZIP
   - Verify results

3. **No Results:**
   - Search in area with no dispensaries
   - Verify empty state message

4. **API Failure:**
   - Disable network
   - Verify graceful error message

## Security Notes

- ✅ API keys stored server-side only
- ✅ Client never sees API keys
- ✅ Results cached to reduce API calls
- ✅ Input validation on all parameters
- ✅ Timeout protection (30s)

## Future Enhancements

- [ ] Save favorite dispensaries
- [ ] Filter by distance
- [ ] Show ratings/reviews
- [ ] Display on map view
- [ ] Route directions
- [ ] Menu/inventory preview
