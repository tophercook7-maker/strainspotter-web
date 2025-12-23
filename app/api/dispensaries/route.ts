import { NextRequest, NextResponse } from "next/server";

interface DispensaryResult {
  id: string;
  name: string;
  address: string;
  distance?: number; // in meters
  latitude: number;
  longitude: number;
  openNow?: boolean | null;
  openingHours?: string;
  placeId?: string;
  source: 'google' | 'osm';
  mapsUrl?: string | null;
  website?: string | null;
}

const isDev = process.env.NODE_ENV === 'development';

// Search radius constants (in meters)
const MILES_30 = 50000; // ~31 miles - Google Places max radius per request
const MILES_60 = 96560; // ~60 miles - target coverage
const MIN_RESULTS_THRESHOLD = 10; // If results < this, do second pass

// Cache for results (in-memory, simple implementation)
const resultCache = new Map<string, { data: DispensaryResult[]; timestamp: number }>();
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

/**
 * GET /api/dispensaries
 * Search for nearby dispensaries using Google Places API
 * 
 * Query params:
 * - lat: latitude
 * - lng: longitude
 * - city?: city name (for manual search)
 * - zip?: ZIP code (for manual search)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const latParam = searchParams.get('lat');
    const lngParam = searchParams.get('lng');
    const city = searchParams.get('city') || '';
    const zip = searchParams.get('zip') || '';

    // Check for API key (GOOGLE_MAPS_API_KEY or GOOGLE_PLACES_API_KEY)
    const googleApiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_PLACES_API_KEY;

    if (!googleApiKey) {
      // No API key: return mock in dev, 503 in prod
      if (isDev) {
        console.log('[DISPENSARY API] No API key found, returning mock results (dev mode)');
        return NextResponse.json({
          dispensaries: getMockResults(),
          count: 3,
          location: latParam && lngParam ? `${latParam}, ${lngParam}` : (city || zip || 'mock'),
        });
      } else {
        return NextResponse.json({
          error: 'Dispensary search not configured.',
          dispensaries: [],
          count: 0,
        }, { status: 503 });
      }
    }

    let lat: number | null = null;
    let lng: number | null = null;
    let searchLocation = '';

    // Validate coordinates or city/ZIP
    if (latParam && lngParam) {
      lat = parseFloat(latParam);
      lng = parseFloat(lngParam);
      if (isNaN(lat) || isNaN(lng)) {
        return NextResponse.json({
          error: 'Invalid coordinates. Provide valid lat and lng numbers.',
          dispensaries: [],
          count: 0,
        }, { status: 400 });
      }
      searchLocation = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    } else if (city || zip) {
      // Geocode city/ZIP first
      const location = await geocodeLocation(city, zip, googleApiKey);
      if (!location) {
        return NextResponse.json({
          error: `Could not find location for "${city || zip}". Please try a different city or ZIP code.`,
          dispensaries: [],
          count: 0,
        }, { status: 400 });
      }
      lat = location.lat;
      lng = location.lng;
      searchLocation = city || zip;
    } else {
      return NextResponse.json({
        error: 'Location required. Provide lat/lng coordinates or city/ZIP code.',
        dispensaries: [],
        count: 0,
      }, { status: 400 });
    }

    // Check cache (by rounded coordinates)
    const cacheKey = `${Math.round(lat * 1000) / 1000},${Math.round(lng * 1000) / 1000}`;
    const cached = resultCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log('[DISPENSARY API] Returning cached results');
      return NextResponse.json({
        dispensaries: cached.data,
        count: cached.data.length,
        location: searchLocation,
      }, {
        headers: {
          'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=1800',
        },
      });
    }

    // Search using Google Places API
    console.log('[DISPENSARY API] Searching Google Places for:', searchLocation);
    const results = await searchGooglePlaces(lat, lng, googleApiKey);

    // Store in cache
    resultCache.set(cacheKey, { data: results, timestamp: Date.now() });

    return NextResponse.json({
      dispensaries: results,
      count: results.length,
      location: searchLocation,
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=1800',
      },
    });
  } catch (error: any) {
    console.error('[DISPENSARY API] Error:', error);
    
    // Handle Google API errors
    if (error.message?.includes('OVER_QUERY_LIMIT')) {
      return NextResponse.json({
        error: isDev 
          ? 'Google Places API: OVER_QUERY_LIMIT - Billing/quota issue'
          : 'Dispensary search temporarily unavailable. Please try again later.',
        dispensaries: [],
        count: 0,
      }, { status: 500 });
    }
    
    if (error.message?.includes('REQUEST_DENIED')) {
      return NextResponse.json({
        error: isDev
          ? 'Google Places API: REQUEST_DENIED - API not enabled or key restrictions wrong'
          : 'Dispensary search not available.',
        dispensaries: [],
        count: 0,
      }, { status: 500 });
    }
    
    if (error.message?.includes('INVALID_REQUEST')) {
      return NextResponse.json({
        error: isDev
          ? `Google Places API: INVALID_REQUEST - ${error.message}`
          : 'Invalid search request. Please try again.',
        dispensaries: [],
        count: 0,
      }, { status: 400 });
    }

    return NextResponse.json({
      error: 'Failed to search dispensaries. Please try again.',
      dispensaries: [],
      count: 0,
    }, { status: 500 });
  }
}

/**
 * Search using Google Places API Nearby Search + Place Details
 * Two-pass strategy to cover ~60 miles:
 * - Pass 1: 50,000 meters (max allowed, ~31 miles)
 * - Pass 2: If results < threshold, do additional searches at offset locations
 */
async function searchGooglePlaces(
  lat: number,
  lng: number,
  apiKey: string
): Promise<DispensaryResult[]> {
  const allPlaces: any[] = [];
  const seenPlaceIds = new Set<string>();

  // PASS 1: Search at center with max radius (50,000 meters = ~31 miles)
  console.log('[DISPENSARY API] Pass 1: Searching 50km radius from center');
  const pass1Results = await performNearbySearch(lat, lng, MILES_30, apiKey);
  
  for (const place of pass1Results) {
    if (!seenPlaceIds.has(place.place_id)) {
      allPlaces.push(place);
      seenPlaceIds.add(place.place_id);
    }
  }

  console.log(`[DISPENSARY API] Pass 1 found ${pass1Results.length} results`);

  // PASS 2: If results are low, do additional searches at offset locations to cover ~60 miles
  if (pass1Results.length < MIN_RESULTS_THRESHOLD) {
    console.log(`[DISPENSARY API] Pass 2: Results low (${pass1Results.length}), expanding search area`);
    
    // Calculate offset locations (north, south, east, west) to cover larger area
    // Each offset is ~25km from center, so combined with 50km radius, we cover ~60 miles total
    const offsetDistance = 0.225; // ~25km in degrees (rough approximation)
    const offsets = [
      { lat: lat + offsetDistance, lng: lng }, // North
      { lat: lat - offsetDistance, lng: lng }, // South
      { lat: lat, lng: lng + offsetDistance }, // East
      { lat: lat, lng: lng - offsetDistance }, // West
    ];

    // Do additional searches at offset locations
    for (const offset of offsets) {
      try {
        const offsetResults = await performNearbySearch(offset.lat, offset.lng, MILES_30, apiKey);
        for (const place of offsetResults) {
          // Only add if within ~60 miles of original location
          const distance = calculateDistance(lat, lng, place.geometry.location.lat, place.geometry.location.lng);
          if (distance <= MILES_60 && !seenPlaceIds.has(place.place_id)) {
            allPlaces.push(place);
            seenPlaceIds.add(place.place_id);
          }
        }
      } catch (error) {
        console.warn('[DISPENSARY API] Offset search failed:', error);
        // Continue with other offsets
      }
    }

    console.log(`[DISPENSARY API] Pass 2 complete, total results: ${allPlaces.length}`);
  }

  if (allPlaces.length === 0) {
    return [];
  }

  // Step 2: Fetch Place Details for top results (to get formatted_address, opening_hours, website)
  // Limit to top 20 to keep performance acceptable
  const topPlaces = allPlaces.slice(0, 20);
  const detailPromises = topPlaces.map(async (place: any) => {
    try {
      const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=name,formatted_address,geometry,opening_hours,website,url&key=${apiKey}`;
      
      const detailsResponse = await fetch(detailsUrl, {
        next: { revalidate: 900 },
      });

      if (!detailsResponse.ok) {
        return null;
      }

      const detailsData = await detailsResponse.json();
      if (detailsData.status !== 'OK') {
        return null;
      }

      return detailsData.result;
    } catch (error) {
      console.warn('[DISPENSARY API] Failed to fetch place details for:', place.place_id);
      return null;
    }
  });

  const placeDetails = await Promise.all(detailPromises);
  const detailsMap = new Map<string, any>();
  placeDetails.forEach((details: any) => {
    if (details) {
      detailsMap.set(details.place_id || details.name, details);
    }
  });

  // Step 3: Combine and normalize results
  const results: DispensaryResult[] = allPlaces.map((place: any, index: number) => {
    const details = detailsMap.get(place.place_id) || place;
    const distance = calculateDistance(lat, lng, place.geometry.location.lat, place.geometry.location.lng);

    // Construct maps URL
    const mapsUrl = details.url || 
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.geometry.location.lat)},${encodeURIComponent(place.geometry.location.lng)}&query_place_id=${place.place_id}`;

    return {
      id: place.place_id || `google-${index}`,
      name: place.name,
      address: details.formatted_address || place.vicinity || place.formatted_address || 'Address not available',
      distance,
      latitude: place.geometry.location.lat,
      longitude: place.geometry.location.lng,
      openNow: place.opening_hours?.open_now ?? details.opening_hours?.open_now ?? null,
      openingHours: details.opening_hours?.weekday_text?.join(', ') || place.opening_hours?.weekday_text?.join(', ') || undefined,
      placeId: place.place_id,
      source: 'google' as const,
      mapsUrl,
      website: details.website || undefined,
    };
  });

  // Sort by distance
  return results.sort((a, b) => (a.distance || 0) - (b.distance || 0));
}

/**
 * Perform a single Google Places Nearby Search
 */
async function performNearbySearch(
  lat: number,
  lng: number,
  radius: number,
  apiKey: string
): Promise<any[]> {
  const nearbyUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&keyword=cannabis%20dispensary&type=store&key=${apiKey}`;

  const nearbyResponse = await fetch(nearbyUrl, {
    next: { revalidate: 900 }, // Cache for 15 minutes
  });

  if (!nearbyResponse.ok) {
    throw new Error(`Google Places API error: ${nearbyResponse.status}`);
  }

  const nearbyData = await nearbyResponse.json();
  
  // Handle Google API status codes
  if (nearbyData.status === 'OVER_QUERY_LIMIT') {
    throw new Error('OVER_QUERY_LIMIT');
  }
  if (nearbyData.status === 'REQUEST_DENIED') {
    throw new Error('REQUEST_DENIED');
  }
  if (nearbyData.status === 'INVALID_REQUEST') {
    throw new Error(`INVALID_REQUEST: ${nearbyData.error_message || 'Invalid request'}`);
  }
  if (nearbyData.status !== 'OK' && nearbyData.status !== 'ZERO_RESULTS') {
    throw new Error(`Google Places API status: ${nearbyData.status}`);
  }

  return nearbyData.results || [];
}

/**
 * Geocode city or ZIP to coordinates using Google Geocoding API
 */
async function geocodeLocation(
  city: string,
  zip: string,
  apiKey: string
): Promise<{ lat: number; lng: number } | null> {
  const query = zip || city;
  if (!query) return null;

  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${apiKey}`;
    const response = await fetch(url, {
      next: { revalidate: 3600 }, // Cache for 1 hour
    });

    if (!response.ok) return null;

    const data = await response.json();
    if (data.status === 'OK' && data.results.length > 0) {
      const location = data.results[0].geometry.location;
      return {
        lat: location.lat,
        lng: location.lng,
      };
    }
  } catch (error) {
    console.error('[DISPENSARY API] Geocoding error:', error);
  }

  return null;
}

/**
 * Calculate distance between two coordinates (Haversine formula)
 * Returns distance in meters
 */
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // Earth radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Mock results for dev mode when API key is missing
 */
function getMockResults(): DispensaryResult[] {
  return [
    {
      id: 'mock-1',
      name: 'Test Dispensary One',
      address: '123 Main St',
      distance: 1931,
      latitude: 40.0,
      longitude: -75.0,
      source: 'osm',
    },
    {
      id: 'mock-2',
      name: 'Green Leaf Dispensary',
      address: '456 Oak Ave',
      distance: 4506,
      latitude: 40.01,
      longitude: -75.02,
      source: 'osm',
    },
    {
      id: 'mock-3',
      name: 'Highland Cannabis',
      address: '789 Pine Rd',
      distance: 7242,
      latitude: 40.03,
      longitude: -75.04,
      source: 'osm',
    },
  ];
}
