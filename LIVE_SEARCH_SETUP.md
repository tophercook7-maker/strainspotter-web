# 🔍 Live Dispensary & Seed Vendor Search - Setup Guide

## Overview

Added real-time search capabilities for dispensaries and seed vendors using Google APIs. The system combines your database with live Google search results for comprehensive coverage.

---

## 🆕 New API Endpoints

### **1. Live Dispensary Search**
**Endpoint:** `GET /api/dispensaries-live`

**Parameters:**
- `lat` (required) - User latitude
- `lng` (required) - User longitude
- `radius` (optional) - Search radius in miles (default: 10, max: 50)
- `strain` (optional) - Filter by strain slug
- `limit` (optional) - Max results (default: 20)

**Example:**
```bash
GET /api/dispensaries-live?lat=37.7749&lng=-122.4194&radius=10&strain=blue-dream
```

**Response:**
```json
{
  "total": 15,
  "results": [
    {
      "id": "google-ChIJxxx",
      "name": "Green Cross Dispensary",
      "address": "123 Main St, San Francisco, CA",
      "city": "San Francisco",
      "state": "CA",
      "latitude": 37.7749,
      "longitude": -122.4194,
      "rating": 4.5,
      "review_count": 234,
      "verified": false,
      "source": "google_places",
      "place_id": "ChIJxxx",
      "open_now": true,
      "distance": 0.5
    }
  ],
  "sources": {
    "database": 5,
    "google_places": 10
  }
}
```

---

### **2. Live Seed Vendor Search**
**Endpoint:** `GET /api/seeds-live`

**Parameters:**
- `strain` (optional) - Strain name or slug
- `country` (optional) - Filter by country (e.g., "USA", "Netherlands")
- `limit` (optional) - Max results (default: 20)
- `include_google` (optional) - Include Google search results (default: "true")

**Example:**
```bash
GET /api/seeds-live?strain=blue-dream&country=USA
```

**Response:**
```json
{
  "total": 12,
  "results": [
    {
      "id": "vendor-123",
      "name": "ILGM",
      "website": "https://ilgm.com",
      "description": "Premium cannabis seeds with germination guarantee",
      "country": "Netherlands",
      "shipping_regions": ["USA", "Canada", "Europe"],
      "payment_methods": ["Credit Card", "Bitcoin"],
      "verified": true,
      "rating": 4.8,
      "review_count": 1523,
      "price": 89.00,
      "currency": "USD",
      "seed_count": 10,
      "in_stock": true,
      "source": "database"
    }
  ],
  "sources": {
    "database": 5,
    "google_search": 3,
    "popular": 4
  }
}
```

---

### **3. Popular Seed Banks**
**Endpoint:** `GET /api/seeds-live/popular`

Returns a curated list of 8 popular, trusted seed banks:
- Seedsman
- ILGM (I Love Growing Marijuana)
- Crop King Seeds
- MSNL (Marijuana Seeds NL)
- Homegrown Cannabis Co
- Barney's Farm
- Dutch Passion
- Sensi Seeds

---

## 🔑 Required API Keys

### **Google Places API** (for dispensaries)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable **Places API**
4. Create credentials → API Key
5. Restrict the key to:
   - **API restrictions:** Places API
   - **Application restrictions:** HTTP referrers (optional)

**Add to `env/.env.local`:**
```bash
GOOGLE_PLACES_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

**Pricing:**
- $17 per 1,000 requests (Nearby Search)
- $17 per 1,000 requests (Place Details)
- Free tier: $200/month credit

---

### **Google Custom Search API** (for seed vendors)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Enable **Custom Search API**
3. Create credentials → API Key
4. Go to [Programmable Search Engine](https://programmablesearchengine.google.com/)
5. Create a new search engine:
   - **Sites to search:** Entire web
   - **Name:** Cannabis Seeds Search
6. Copy the **Search Engine ID** (cx parameter)

**Add to `env/.env.local`:**
```bash
GOOGLE_SEARCH_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
GOOGLE_SEARCH_ENGINE_ID=0123456789abcdef:xxxxxxxxx
```

**Pricing:**
- Free tier: 100 queries/day
- Paid tier: $5 per 1,000 queries (up to 10k/day)

---

## 📁 Files Created

### **Backend Routes:**
- `backend/routes/dispensaries-live.js` - Live dispensary search with Google Places
- `backend/routes/seeds-live.js` - Live seed vendor search with Google Custom Search

### **Modified Files:**
- `backend/index.js` - Mounted new routes

---

## 🔧 How It Works

### **Dispensary Search Flow:**

1. **User provides location** (lat/lng) and optional radius
2. **Search database** for dispensaries within radius
3. **Search Google Places API** for nearby cannabis dispensaries
4. **Combine results** and remove duplicates
5. **Sort by distance** from user location
6. **Return top results** with source attribution

**Data Sources:**
- ✅ Your Supabase database (verified, with strain availability)
- ✅ Google Places API (real-time, comprehensive coverage)

---

### **Seed Vendor Search Flow:**

1. **User provides strain name** (optional)
2. **Search database** for vendors carrying that strain
3. **Search Google Custom Search** for seed banks selling the strain
4. **Fallback to popular seed banks** if no results
5. **Filter by country** if specified
6. **Sort by verified status and rating**
7. **Return top results** with source attribution

**Data Sources:**
- ✅ Your Supabase database (verified vendors with pricing)
- ✅ Google Custom Search (real-time web results)
- ✅ Popular seed banks (curated fallback list)

---

## 🎯 Integration Examples

### **Frontend: Dispensary Finder Component**

```javascript
import { useState, useEffect } from 'react';

function DispensaryFinder() {
  const [dispensaries, setDispensaries] = useState([]);
  const [loading, setLoading] = useState(false);

  const searchNearby = async (lat, lng, radius = 10) => {
    setLoading(true);
    try {
      const response = await fetch(
        `${API_BASE}/api/dispensaries-live?lat=${lat}&lng=${lng}&radius=${radius}`
      );
      const data = await response.json();
      setDispensaries(data.results);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get user's location
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        searchNearby(position.coords.latitude, position.coords.longitude);
      },
      (error) => {
        console.error('Location access denied:', error);
        // Fallback to default location (e.g., San Francisco)
        searchNearby(37.7749, -122.4194);
      }
    );
  }, []);

  return (
    <div>
      {loading ? (
        <p>Finding dispensaries near you...</p>
      ) : (
        <ul>
          {dispensaries.map(d => (
            <li key={d.id}>
              <h3>{d.name}</h3>
              <p>{d.address}</p>
              <p>Distance: {d.distance.toFixed(1)} miles</p>
              <p>Rating: {d.rating} ⭐ ({d.review_count} reviews)</p>
              <p>Source: {d.source}</p>
              {d.open_now !== undefined && (
                <p>{d.open_now ? '🟢 Open Now' : '🔴 Closed'}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

---

### **Frontend: Seed Vendor Finder Component**

```javascript
import { useState } from 'react';

function SeedVendorFinder({ strainName }) {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(false);

  const searchVendors = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${API_BASE}/api/seeds-live?strain=${encodeURIComponent(strainName)}&country=USA`
      );
      const data = await response.json();
      setVendors(data.results);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button onClick={searchVendors}>Find Seeds</button>
      {loading ? (
        <p>Searching seed vendors...</p>
      ) : (
        <ul>
          {vendors.map(v => (
            <li key={v.id}>
              <h3>{v.name}</h3>
              <p>{v.description}</p>
              <p>Country: {v.country}</p>
              {v.price && <p>Price: ${v.price} ({v.seed_count} seeds)</p>}
              <p>Rating: {v.rating} ⭐</p>
              <a href={v.website || v.product_url} target="_blank">Visit Store →</a>
              <p>Source: {v.source}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

---

## 🚀 Testing

### **Test Dispensary Search:**
```bash
# Search near San Francisco
curl "http://localhost:5181/api/dispensaries-live?lat=37.7749&lng=-122.4194&radius=10"

# Search with strain filter
curl "http://localhost:5181/api/dispensaries-live?lat=37.7749&lng=-122.4194&strain=blue-dream"
```

### **Test Seed Vendor Search:**
```bash
# Search for Blue Dream seeds
curl "http://localhost:5181/api/seeds-live?strain=blue-dream"

# Get popular seed banks
curl "http://localhost:5181/api/seeds-live/popular"

# Filter by country
curl "http://localhost:5181/api/seeds-live?strain=og-kush&country=USA"
```

---

## ⚠️ Important Notes

### **Without API Keys:**
- Dispensary search will only return database results
- Seed vendor search will return database + popular seed banks
- No errors will occur - graceful fallback

### **With API Keys:**
- Full live search capabilities enabled
- Comprehensive coverage from multiple sources
- Real-time data from Google

### **Rate Limits:**
- Google Places: Monitor usage in Cloud Console
- Google Custom Search: 100 free queries/day
- Consider caching results to reduce API calls

### **Privacy:**
- User location is never stored
- All searches are anonymous
- No tracking or logging of user data

---

## 📊 Cost Estimates

### **Low Usage (< 1000 searches/month):**
- Google Places: ~$17/month
- Google Custom Search: Free (under 100/day)
- **Total: ~$17/month**

### **Medium Usage (5000 searches/month):**
- Google Places: ~$85/month
- Google Custom Search: ~$25/month
- **Total: ~$110/month**

### **High Usage (20,000 searches/month):**
- Google Places: ~$340/month
- Google Custom Search: ~$100/month
- **Total: ~$440/month**

**Optimization Tips:**
- Cache popular searches for 24 hours
- Limit radius to reduce API calls
- Use database-first approach
- Only call Google APIs when database has < 5 results

---

## ✅ Next Steps

1. **Get API keys** from Google Cloud Console
2. **Add keys to `env/.env.local`**
3. **Restart backend server**
4. **Test endpoints** with curl or Postman
5. **Create frontend components** for dispensary/seed finder
6. **Monitor API usage** in Google Cloud Console
7. **Implement caching** to reduce costs

---

**Created:** 2025-10-31  
**Status:** Ready for API key configuration  
**Backend Routes:** Deployed ✅

