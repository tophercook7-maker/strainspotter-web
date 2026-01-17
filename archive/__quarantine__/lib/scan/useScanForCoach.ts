/**
 * Hook for Grow Coach to access scan results
 * Provides lightweight access to last scan result and associated data
 */

import { useState, useEffect, useCallback } from 'react';

export interface ScanForCoach {
  scan_id: string;
  scan_type: 'id' | 'doctor';
  created_at: string;
  enrichment?: {
    confidence_score: number;
    observed_signals: string[];
    probable_conditions?: string[];
    recommendations: string[];
    follow_up_checks: string[];
    explanation: string;
  };
  match?: {
    name: string;
    slug: string;
    confidence: number;
  } | null;
  logbook_entry_id?: string;
}

/**
 * Get the most recent scan for a user
 * Used by Grow Coach to reference recent scan results
 */
export async function getLastScanForUser(userId: string): Promise<ScanForCoach | null> {
  try {
    const response = await fetch(`/api/scans/latest?user_id=${userId}`);
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    return data.scan || null;
  } catch (error) {
    console.error('Error fetching last scan:', error);
    return null;
  }
}

/**
 * Get scan by ID with enrichment data
 * Used by Grow Coach to reference specific scan results
 */
export async function getScanForCoach(scanId: string): Promise<ScanForCoach | null> {
  try {
    const response = await fetch(`/api/scans/${scanId}`);
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    const scan = data.scan;
    
    if (!scan) {
      return null;
    }
    
    // Extract enrichment from match or directly
    const enrichment = scan.enrichment || scan.match?.enrichment;
    const match = scan.match?.match || scan.match_result?.match;
    
    return {
      scan_id: scan.id,
      scan_type: scan.scan_type || 'id',
      created_at: scan.created_at,
      enrichment,
      match: match ? {
        name: match.name,
        slug: match.slug,
        confidence: match.confidence,
      } : null,
    };
  } catch (error) {
    console.error('Error fetching scan for coach:', error);
    return null;
  }
}

/**
 * Get associated logbook entry for a scan
 * Returns logbook entry ID if scan was saved to logbook
 */
export async function getScanLogbookEntry(scanId: string): Promise<string | null> {
  try {
    // This would query a join table or scan metadata
    // For now, return null as this feature may not be implemented yet
    return null;
  } catch (error) {
    console.error('Error fetching scan logbook entry:', error);
    return null;
  }
}

/**
 * React hook to get last scan for current user
 */
export function useLastScan(): {
  scan: ScanForCoach | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
} {
  const [scan, setScan] = useState<ScanForCoach | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const fetchLastScan = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get current user ID from session
      const userResponse = await fetch('/api/auth/user');
      if (!userResponse.ok) {
        setLoading(false);
        return;
      }
      
      const userData = await userResponse.json();
      if (!userData.user?.id) {
        setLoading(false);
        return;
      }
      
      const lastScan = await getLastScanForUser(userData.user.id);
      setScan(lastScan);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch last scan');
    } finally {
      setLoading(false);
    }
  }, []);
  
  useEffect(() => {
    fetchLastScan();
  }, [fetchLastScan]);
  
  return {
    scan,
    loading,
    error,
    refresh: fetchLastScan,
  };
}
