/**
 * Safe Fetch Utility
 * Handles timeouts, errors, and provides graceful fallbacks
 */

interface SafeFetchOptions extends RequestInit {
  timeout?: number; // Timeout in milliseconds (default: 30000)
  retries?: number; // Number of retries (default: 0)
}

/**
 * Safe fetch with timeout and error handling
 */
export async function safeFetch(
  url: string,
  options: SafeFetchOptions = {}
): Promise<Response> {
  const { timeout = 30000, retries = 0, ...fetchOptions } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        const response = await fetch(url, {
          ...fetchOptions,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        return response;
      } catch (error: any) {
        clearTimeout(timeoutId);
        
        // If aborted, it's a timeout
        if (error.name === 'AbortError') {
          throw new Error(`Request timeout after ${timeout}ms`);
        }
        throw error;
      }
    } catch (error: any) {
      lastError = error;
      
      // Don't retry on certain errors
      if (error.message?.includes('timeout') && attempt < retries) {
        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.min(1000 * Math.pow(2, attempt), 5000)));
        continue;
      }
      
      // If this is the last attempt, throw
      if (attempt === retries) {
        throw error;
      }
    }
  }

  throw lastError || new Error('Request failed');
}

/**
 * Safe fetch with JSON parsing and error handling
 */
export async function safeFetchJson<T = any>(
  url: string,
  options: SafeFetchOptions = {}
): Promise<T> {
  try {
    const response = await safeFetch(url, options);

    if (!response.ok) {
      // Try to parse error message
      let errorMessage = `Request failed with status ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorData.message || errorMessage;
      } catch {
        // If JSON parsing fails, use status text
        errorMessage = response.statusText || errorMessage;
      }
      throw new Error(errorMessage);
    }

    // Parse JSON
    try {
      const text = await response.text();
      if (!text) {
        return {} as T;
      }
      return JSON.parse(text) as T;
    } catch (parseError) {
      throw new Error('Failed to parse response as JSON');
    }
  } catch (error: any) {
    // Re-throw with context
    throw new Error(error.message || 'Request failed');
  }
}
