"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { setupAndroidBackHandler } from "@/lib/navigation/androidBack";
import { useRouter } from "next/navigation";

interface Dispensary {
  id: string;
  name: string;
  address: string;
  distance?: number;
  latitude: number;
  longitude: number;
  openNow?: boolean | null;
  openingHours?: string;
  placeId?: string;
  source: 'google' | 'osm';
  mapsUrl?: string | null;
  website?: string | null;
}

export default function DispensariesPage() {
  const router = useRouter();
  const [locationStatus, setLocationStatus] = useState<'idle' | 'requesting' | 'allowed' | 'denied'>('idle');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [dispensaries, setDispensaries] = useState<Dispensary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manualSearch, setManualSearch] = useState(false);
  const [searchCity, setSearchCity] = useState('');
  const [searchZip, setSearchZip] = useState('');
  const [searchRadius, setSearchRadius] = useState<number>(60); // Default 60 miles (from API)

  // Setup Android back button handler
  useEffect(() => {
    const cleanup = setupAndroidBackHandler(router, '/garden');
    return cleanup;
  }, [router]);

  // Request location permission on mount
  useEffect(() => {
    requestLocation();
  }, []);

  const requestLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      setLocationStatus('denied');
      setManualSearch(true);
      return;
    }

    setLocationStatus('requesting');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        setLocationStatus('allowed');
        searchDispensaries(latitude, longitude);
      },
      (err) => {
        console.warn('Location permission denied:', err);
        setLocationStatus('denied');
        setManualSearch(true);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000, // 5 minutes
      }
    );
  }, []);

  const searchDispensaries = useCallback(async (lat: number, lng: number) => {
    setLoading(true);
    setError(null);

    // CLIENT-SIDE LOGGING
    console.log('========================================');
    console.log('[CLIENT] Dispensary search initiated');
    console.log('[CLIENT] Fetch URL:', `/api/dispensaries?lat=${lat}&lng=${lng}`);
    console.log('[CLIENT] Coordinates:', { lat, lng });
    console.log('========================================');

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

      const fetchUrl = `/api/dispensaries?lat=${lat}&lng=${lng}`;
      console.log('[CLIENT] Making fetch request to:', fetchUrl);

      const response = await fetch(fetchUrl, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      console.log('[CLIENT] Response status:', response.status);
      console.log('[CLIENT] Response ok:', response.ok);

      const data = await response.json();

      console.log('[CLIENT] Response data:', data);
      console.log('[CLIENT] Dispensaries count:', data.dispensaries?.length || 0);
      console.log('[CLIENT] Debug marker:', data.debug);
      console.log('[CLIENT] Response headers:', {
        'X-Dispensary-Debug': response.headers.get('X-Dispensary-Debug'),
        'X-Build-Time': response.headers.get('X-Build-Time'),
      });

      if (!response.ok) {
        throw new Error(data.error || 'Failed to search dispensaries');
      }

      console.log('[CLIENT] Setting dispensaries:', data.dispensaries);
      const results = data.dispensaries || [];
      // Sort by distance to ensure closest first (defensive)
      const sorted = results.sort((a: Dispensary, b: Dispensary) => {
        const distA = a.distance || Infinity;
        const distB = b.distance || Infinity;
        return distA - distB;
      });
      setDispensaries(sorted);
    } catch (err: any) {
      console.error('[CLIENT] Search error:', err);
      if (err.name === 'AbortError') {
        setError('Search timed out. Please try again.');
      } else {
        setError(err.message || 'Failed to load dispensaries. Please try again.');
      }
    } finally {
      setLoading(false);
      console.log('[CLIENT] Search complete, loading set to false');
    }
  }, []);

  const handleManualSearch = useCallback(async () => {
    if (!searchCity && !searchZip) {
      setError('Please enter a city or ZIP code');
      return;
    }

    setLoading(true);
    setError(null);

    // CLIENT-SIDE LOGGING
    console.log('[CLIENT] Manual search initiated');
    console.log('[CLIENT] City:', searchCity);
    console.log('[CLIENT] ZIP:', searchZip);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const params = new URLSearchParams();
      if (searchCity) params.set('city', searchCity);
      if (searchZip) params.set('zip', searchZip);

      const fetchUrl = `/api/dispensaries?${params.toString()}`;
      console.log('[CLIENT] Manual search fetch URL:', fetchUrl);

      const response = await fetch(fetchUrl, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      console.log('[CLIENT] Manual search response status:', response.status);
      const data = await response.json();
      console.log('[CLIENT] Manual search response data:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Failed to search dispensaries');
      }

      const results = data.dispensaries || [];
      // Sort by distance to ensure closest first (defensive)
      const sorted = results.sort((a: Dispensary, b: Dispensary) => {
        const distA = a.distance || Infinity;
        const distB = b.distance || Infinity;
        return distA - distB;
      });
      setDispensaries(sorted);
    } catch (err: any) {
      console.error('[CLIENT] Manual search error:', err);
      if (err.name === 'AbortError') {
        setError('Search timed out. Please try again.');
      } else {
        setError(err.message || 'Failed to load dispensaries. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [searchCity, searchZip]);

  const openInGoogleMaps = useCallback((dispensary: Dispensary) => {
    // Construct Google Maps search URL with name + address for best results
    // This ensures Google shows business details, phone number, and directions
    const query = `${dispensary.name} ${dispensary.address}`;
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
    
    // Open in external browser (works on both web and Electron)
    window.open(url, '_blank', 'noopener,noreferrer');
  }, []);

  const formatDistance = useCallback((meters?: number): string => {
    if (!meters) return '';
    // Convert to miles for consistency
    const miles = meters * 0.000621371;
    if (miles < 0.1) {
      return `${Math.round(meters)} ft`;
    }
    return `${miles.toFixed(1)} mi`;
  }, []);

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden safe-area-bottom pb-24 md:pb-8">
      <div className="max-w-4xl mx-auto p-4 md:p-6">
        {/* Note: Debug marker removed - production ready */}

        {/* Header */}
        <div className="mb-6">
          <Link href="/garden" className="text-emerald-400 mb-4 inline-block text-sm hover:text-emerald-300 transition">
            ← Back to Garden
          </Link>
          <h1 className="text-3xl font-bold mb-2">Dispensary Finder</h1>
          <p className="text-white/70">
            Find cannabis dispensaries near you
          </p>
          <p className="text-xs text-white/50 mt-1">
            Showing dispensaries within {searchRadius} miles
          </p>
        </div>

        {/* Location Status */}
        <div className="mb-6 p-4 rounded-lg bg-white/10 backdrop-blur-md border border-white/10">
          {locationStatus === 'requesting' && (
            <p className="text-sm text-white/80">Requesting location permission...</p>
          )}
          {locationStatus === 'allowed' && userLocation && (
            <div>
              <p className="text-sm text-white/80 mb-2">Using your location</p>
              <button
                onClick={() => requestLocation()}
                className="text-xs text-emerald-400 hover:text-emerald-300 underline"
              >
                Refresh location
              </button>
            </div>
          )}
          {locationStatus === 'denied' && (
            <div>
              <p className="text-sm text-white/80 mb-3">Location access denied. Search by city or ZIP:</p>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  placeholder="City name"
                  value={searchCity}
                  onChange={(e) => setSearchCity(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:border-emerald-500"
                />
                <input
                  type="text"
                  placeholder="ZIP code"
                  value={searchZip}
                  onChange={(e) => setSearchZip(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:border-emerald-500"
                />
                <button
                  onClick={handleManualSearch}
                  disabled={loading}
                  className="px-4 py-2 bg-emerald-600 text-black rounded-lg font-semibold hover:opacity-90 transition disabled:opacity-50"
                >
                  Search
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-900/30 border border-red-500/50">
            <p className="text-sm text-red-200 mb-3">{error}</p>
            <button
              onClick={() => {
                setError(null);
                if (userLocation) {
                  searchDispensaries(userLocation.lat, userLocation.lng);
                } else if (searchCity || searchZip) {
                  handleManualSearch();
                } else {
                  requestLocation();
                }
              }}
              className="px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:opacity-90 transition text-sm"
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-white/80 font-medium">
              Searching dispensaries within {searchRadius} miles…
            </p>
            <p className="text-sm text-white/50 mt-2">
              This may take a few moments
            </p>
          </div>
        )}

        {/* Results */}
        {!loading && dispensaries.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">
                Found {dispensaries.length} {dispensaries.length === 1 ? 'dispensary' : 'dispensaries'}
              </h2>
              <span className="text-sm text-white/50">
                Sorted by distance
              </span>
            </div>
            {dispensaries.map((dispensary) => (
              <div
                key={dispensary.id}
                className="p-4 rounded-lg bg-white/10 backdrop-blur-md border border-white/10 hover:bg-white/15 transition cursor-pointer"
                onClick={() => openInGoogleMaps(dispensary)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openInGoogleMaps(dispensary);
                  }
                }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white mb-1">
                      {dispensary.name}
                    </h3>
                    <p className="text-sm text-white/70 mb-2">
                      {dispensary.address}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-white/60 flex-wrap">
                      {dispensary.distance && (
                        <span className="flex items-center gap-1">
                          <span>{formatDistance(dispensary.distance)} away</span>
                          {dispensary.source === 'osm' && (
                            <span className="text-white/40 italic">(Approximate)</span>
                          )}
                        </span>
                      )}
                      {dispensary.openNow !== null && dispensary.openNow !== undefined && (
                        <span className={dispensary.openNow ? 'text-emerald-400' : 'text-red-400'}>
                          {dispensary.openNow ? 'Open now' : 'Closed'}
                        </span>
                      )}
                    </div>
                    {dispensary.openingHours && (
                      <p className="text-xs text-white/50 mt-2">
                        {dispensary.openingHours}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openInGoogleMaps(dispensary);
                      }}
                      className="px-4 py-2 bg-emerald-600 text-black rounded-lg font-semibold hover:opacity-90 transition text-sm whitespace-nowrap"
                    >
                      Open in Google Maps
                    </button>
                    {dispensary.website && (
                      <a
                        href={dispensary.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="px-4 py-2 bg-white/10 text-white rounded-lg font-semibold hover:bg-white/20 transition text-sm whitespace-nowrap text-center"
                      >
                        Website
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && dispensaries.length === 0 && !error && locationStatus !== 'idle' && locationStatus !== 'requesting' && (
          <div className="text-center py-12">
            <div className="mb-4">
              <p className="text-white/80 font-medium mb-2">
                No dispensaries found within {searchRadius} miles.
              </p>
              <p className="text-sm text-white/60">
                Try searching a different location or city.
              </p>
            </div>
            {locationStatus === 'denied' && (
              <button
                onClick={() => {
                  setSearchCity('');
                  setSearchZip('');
                  setDispensaries([]);
                  setError(null);
                }}
                className="px-4 py-2 bg-emerald-600 text-black rounded-lg font-semibold hover:opacity-90 transition text-sm"
              >
                Try a different location
              </button>
            )}
            {locationStatus === 'allowed' && userLocation && (
              <button
                onClick={() => {
                  if (userLocation) {
                    searchDispensaries(userLocation.lat, userLocation.lng);
                  }
                }}
                className="px-4 py-2 bg-emerald-600 text-black rounded-lg font-semibold hover:opacity-90 transition text-sm"
              >
                Search again
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
