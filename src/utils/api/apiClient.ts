const memoryCache = new Map<string, unknown>();
const inFlightRequests = new Map<string, Promise<unknown>>();
const activeControllers = new Map<string, AbortController>();

/**
 * Automatically purges legacy `pkr_cache_*` and `pkr_cache_time_*` entries from
 * localStorage to reclaim space for Homebrew content and Standalone character sheets.
 */
export function clearLegacyLocalStorageCache(): void {
    try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.startsWith('pkr_cache_') || key.startsWith('pkr_cache_time_'))) {
                keysToRemove.push(key);
            }
        }
        for (const k of keysToRemove) {
            localStorage.removeItem(k);
        }
        if (keysToRemove.length > 0) {
            console.log(
                `[Cache] Reclaimed space: removed ${keysToRemove.length} legacy dataset cache items from localStorage.`
            );
        }
    } catch (e) {
        console.warn('[Cache] Could not purge legacy localStorage cache:', e);
    }
}

// Run one-time cleanup on module initialization
clearLegacyLocalStorageCache();

/**
 * Clears the in-memory cache if needed (e.g., tests or full reset).
 */
export function clearMemoryCache(): void {
    memoryCache.clear();
}

/**
 * Fetches dataset JSON files efficiently:
 * 1. Checks in-memory session cache first (<1ms instant retrieval).
 * 2. Deduplicates simultaneous requests (single-flighting).
 * 3. Uses standard HTTP fetch (the browser's native HTTP disk cache manages ETags & 304 Not Modified).
 * 4. Never pollutes or competes for the browser's 5MB localStorage quota.
 */
export async function fetchWithCache<T>(url: string, cacheKey: string, itemName: string): Promise<T | null> {
    // 1. Instant RAM Cache hit
    if (memoryCache.has(cacheKey)) {
        return memoryCache.get(cacheKey) as T;
    }

    // 2. Single-flight deduplication: return running request if active
    if (inFlightRequests.has(cacheKey)) {
        return (await inFlightRequests.get(cacheKey)) as T | null;
    }

    // Abort any previous controller if present
    if (activeControllers.has(cacheKey)) {
        activeControllers.get(cacheKey)?.abort();
    }

    const controller = new AbortController();
    activeControllers.set(cacheKey, controller);

    const requestPromise = (async (): Promise<T | null> => {
        try {
            const response = await fetch(url, { signal: controller.signal });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = (await response.json()) as T;
            memoryCache.set(cacheKey, data);
            return data;
        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                return null;
            }
            console.error(`[ApiClient] Failed to load ${itemName}:`, error);
            return null;
        } finally {
            activeControllers.delete(cacheKey);
            inFlightRequests.delete(cacheKey);
        }
    })();

    inFlightRequests.set(cacheKey, requestPromise);
    return await requestPromise;
}
