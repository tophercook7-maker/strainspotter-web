import { NextRequest, NextResponse } from "next/server";

import "server-only";
interface DispensaryResult {
  id: string;
  name: string;
  address: string;
  distance?: number; // in meters
  latitude: number;
  longitude: number;
  openNow?: boolean;
  openingHours?: string;
  placeId?: string;
  source: 'google' | 'osm';
}

/**
 * GET /api/dispensaries/search
 * Search for nearby dispensaries using location
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
    const lat = parseFloat(searchParams.get('lat') || '');
    const lng = parseFloat(searchParams.get('lng') || '');
    const city = searchParams.get('city') || '';
    const zip = searchParams.get('zip') || '';

    // Validate coordinates or city/ZIP
    if (!isNaN(lat) && !isNaN(lng)) {
      // Use coordinates
      const results = await searchDispensariesByLocation(lat, lng);
      return NextResponse.json({ 
        dispensaries: results,
        count: results.length,
      }, {
        headers: {
          'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=1800', // 15 min cache
        },
      });
    } else if (city || zip) {
      // Geocode city/ZIP first, then search
      const location = await geocodeLocation(city, zip);
      if (location) {
        const results = await searchDispensariesByLocation(location.lat, location.lng);
        return NextResponse.json({ 
          dispensaries: results,
          count: results.length,
        }, {
          headers: {
            'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=1800',
          },
        });
      }
    }

    return NextResponse.json({ 
      error: 'Invalid location. Provide lat/lng or city/ZIP.',
      dispensaries: [],
      count: 0,
    }, { status: 400 });
  } catch (error: any) {
    console.error('Error searching dispensaries:', error);
    return NextResponse.json({ 
      error: 'Failed to search dispensaries',
      dispensaries: [],
      count: 0,
    }, { status: 500 });
  }
}

/**
 * Search dispensaries using Google Places API (primary) or OpenStreetMap (fallback)
 */
async function searchDispensariesByLocation(
  lat: number,
  lng: number
): Promise<DispensaryResult[]> {
  const googleApiKey = process.env.GOOGLE_PLACES_API_KEY;

  // Try Google Places API first if key exists
  if (googleApiKey) {
    try {
      const results = await searchGooglePlaces(lat, lng, googleApiKey);
      if (results.length > 0) {
        return results;
      }
    } catch (error) {
      console.warn('Google Places API failed, falling back to OSM:', error);
    }
  }

  // Fallback to OpenStreetMap
  try {
    return await searchOpenStreetMap(lat, lng);
  } catch (error) {
    console.error('OpenStreetMap search failed:', error);
    return [];
  }
}

/**
 * Search using Google Places API Nearby Search
 */
async function searchGooglePlaces(
  lat: number,
  lng: number,
  apiKey: string
): Promise<DispensaryResult[]> {
  const radius = 5000; // 5km radius
  const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&keyword=cannabis%20dispensary&type=store&key=${apiKey}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Google Places API error: ${response.status}`);
  }

  const data = await response.json();
  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    throw new Error(`Google Places API status: ${data.status}`);
  }

  const results: DispensaryResult[] = (data.results || []).map((place: any, index: number) => {
    // Calculate distance
    const distance = place.distance || calculateDistance(lat, lng, place.geometry.location.lat, place.geometry.location.lng);

    return {
      id: place.place_id || `google-${index}`,
      name: place.name,
      address: place.vicinity || place.formatted_address || 'Address not available',
      distance,
      latitude: place.geometry.location.lat,
      longitude: place.geometry.location.lng,
      openNow: place.opening_hours?.open_now,
      openingHours: place.opening_hours?.weekday_text?.join(', ') || undefined,
      placeId: place.place_id,
      source: 'google',
    };
  });

  // Sort by distance
  return results.sort((a, b) => (a.distance || 0) - (b.distance || 0));
}

/**
 * Search using OpenStreetMap Overpass API
 */
async function searchOpenStreetMap(
  lat: number,
  lng: number
): Promise<DispensaryResult[]> {
  const radius = 5000; // 5km radius in meters
  const overpassUrl = 'https://overpass-api.de/api/interpreter';

  // Overpass QL query for dispensaries
  const query = `
    [out:json][timeout:25];
    (
      node["amenity"="dispensary"](around:${radius},${lat},${lng});
      node["shop"="cannabis"](around:${radius},${lat},${lng});
      way["amenity"="dispensary"](around:${radius},${lat},${lng});
      way["shop"="cannabis"](around:${radius},${lat},${lng});
    );
    out center meta;
  `;

  const response = await fetch(overpassUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: `data=${encodeURIComponent(query)}`,
  });

  if (!response.ok) {
    throw new Error(`OpenStreetMap API error: ${response.status}`);
  }

  const data = await response.json();
  const results: DispensaryResult[] = [];

  for (const element of data.elements || []) {
    const elementLat = element.lat || element.center?.lat;
    const elementLng = element.lon || element.center?.lon;

    if (!elementLat || !elementLng) continue;

    const distance = calculateDistance(lat, lng, elementLat, elementLng);
    const name = element.tags?.name || element.tags?.['name:en'] || 'Dispensary';
    const address = [
      element.tags?.['addr:housenumber'],
      element.tags?.['addr:street'],
      element.tags?.['addr:city'],
      element.tags?.['addr:state'],
    ].filter(Boolean).join(', ') || 'Address not available';

    results.push({
      id: `osm-${element.type}-${element.id}`,
      name,
      address,
      distance,
      latitude: elementLat,
      longitude: elementLng,
      source: 'osm',
    });
  }

  // Sort by distance
  return results.sort((a, b) => (a.distance || 0) - (b.distance || 0));
}

/**
 * Geocode city or ZIP to coordinates using Nominatim (OpenStreetMap)
 */
async function geocodeLocation(city: string, zip: string): Promise<{ lat: number; lng: number } | null> {
  const query = zip || city;
  if (!query) return null;

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'StrainSpotter/1.0',
      },
    });

    if (!response.ok) return null;

    const data = await response.json();
    if (data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
      };
    }
  } catch (error) {
    console.error('Geocoding error:', error);
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
