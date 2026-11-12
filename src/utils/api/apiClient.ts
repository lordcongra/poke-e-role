const memoryCache = new Map<string, unknown>();
const inFlightRequests = new Map<string, Promise<unknown>>();
const MAX_NEGATIVE_CACHE_SIZE = 250;
const negativeCache = new Set<string>();

function addToNegativeCache(cacheKey: string): void {
    if (negativeCache.has(cacheKey)) {
        negativeCache.delete(cacheKey);
    } else if (negativeCache.size >= MAX_NEGATIVE_CACHE_SIZE) {
        const oldestKey = negativeCache.values().next().value;
        if (oldestKey !== undefined) {
            negativeCache.delete(oldestKey);
        }
    }
    negativeCache.add(cacheKey);
}

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
    negativeCache.clear();
}

/**
 * Fetches dataset JSON files efficiently:
 * 1. Checks in-memory session cache first (<1ms instant retrieval).
 * 2. Checks bounded negative cache for previously failed/404 lookups.
 * 3. Deduplicates simultaneous requests (single-flighting).
 * 4. Uses standard HTTP fetch (the browser's native HTTP disk cache manages ETags & 304 Not Modified).
 * 5. Never pollutes or competes for the browser's 5MB localStorage quota.
 */
export async function fetchWithCache<T>(url: string, cacheKey: string, itemName: string): Promise<T | null> {
    // 1. Instant RAM Cache hit
    if (memoryCache.has(cacheKey)) {
        return memoryCache.get(cacheKey) as T;
    }

    // 2. Bounded Negative Cache hit (avoid repeating 404/failed fetches)
    if (negativeCache.has(cacheKey)) {
        return null;
    }

    // 3. Single-flight deduplication: return running request if active
    if (inFlightRequests.has(cacheKey)) {
        return (await inFlightRequests.get(cacheKey)) as T | null;
    }

    const requestPromise = (async (): Promise<T | null> => {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                addToNegativeCache(cacheKey);
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = (await response.json()) as T;
            memoryCache.set(cacheKey, data);
            return data;
        } catch (error) {
            addToNegativeCache(cacheKey);
            console.error(`[ApiClient] Failed to load ${itemName}:`, error);
            return null;
        } finally {
            inFlightRequests.delete(cacheKey);
        }
    })();

    inFlightRequests.set(cacheKey, requestPromise);
    return await requestPromise;
}
