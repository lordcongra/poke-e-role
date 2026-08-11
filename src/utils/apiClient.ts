const CACHE_EXPIRY_MS = 1000 * 60 * 60 * 24; // 24 hours

const activeRequests = new Map<string, AbortController>();

/**
 * Prunes the oldest 50% of our cache entries to free up localStorage space
 * when the browser's 5MB limit is reached.
 */
function pruneOldCache() {
    try {
        const cacheEntries: { dataKey: string; timeKey: string; time: number }[] = [];

        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('pkr_cache_time_')) {
                const dataKey = key.replace('pkr_cache_time_', 'pkr_cache_');
                const timeVal = localStorage.getItem(key);
                if (timeVal) {
                    cacheEntries.push({ dataKey, timeKey: key, time: parseInt(timeVal, 10) });
                }
            }
        }

        // Sort by oldest first
        cacheEntries.sort((a, b) => a.time - b.time);

        // Remove half of the oldest entries
        const itemsToPrune = Math.max(1, Math.floor(cacheEntries.length / 2));
        for (let i = 0; i < itemsToPrune; i++) {
            const entry = cacheEntries[i];
            localStorage.removeItem(entry.dataKey);
            localStorage.removeItem(entry.timeKey);
        }
        console.log(`[Cache] Pruned ${itemsToPrune} old entries to free up space.`);
    } catch (error) {
        console.error('[Cache] Failed to prune cache.', error);
    }
}

/**
 * A safe wrapper for setting localStorage that automatically handles QuotaExceededError crashes.
 */
function safeSetItem(dataKey: string, dataValue: string, timeKey: string, timeValue: string) {
    try {
        localStorage.setItem(dataKey, dataValue);
        localStorage.setItem(timeKey, timeValue);
    } catch (error) {
        if (
            error instanceof DOMException &&
            (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED')
        ) {
            console.warn('[Cache] LocalStorage quota exceeded. Pruning old cache...');
            pruneOldCache();

            // Retry saving after pruning
            try {
                localStorage.setItem(dataKey, dataValue);
                localStorage.setItem(timeKey, timeValue);
            } catch (retryError) {
                console.error('[Cache] Still exceeding quota after pruning. Discarding cache for this item.');
            }
        } else {
            console.error('[Cache] Failed to set localStorage item.', error);
        }
    }
}

export async function fetchWithCache<T>(url: string, cacheKey: string, itemName: string): Promise<T | null> {
    if (activeRequests.has(cacheKey)) {
        activeRequests.get(cacheKey)?.abort();
    }

    try {
        // Check cache FIRST to prevent API rate-limiting!
        const cachedData = localStorage.getItem(`pkr_cache_${cacheKey}`);
        const cacheTime = localStorage.getItem(`pkr_cache_time_${cacheKey}`);

        if (cachedData && cacheTime) {
            const age = Date.now() - parseInt(cacheTime, 10);
            // If the cache is less than 24 hours old, return it instantly without hitting the network
            if (age < CACHE_EXPIRY_MS) {
                return JSON.parse(cachedData) as T;
            }
        }
    } catch (e) {
        console.warn(`[Cache] Error reading cache for ${itemName}`, e);
    }

    const controller = new AbortController();
    activeRequests.set(cacheKey, controller);

    try {
        // If cache is missing or older than 24 hours, fetch the live update
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const data = (await response.json()) as T;

        // Defensively save to localStorage without crashing
        safeSetItem(`pkr_cache_${cacheKey}`, JSON.stringify(data), `pkr_cache_time_${cacheKey}`, Date.now().toString());

        return data;
    } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
            return null;
        }

        // Defensive Offline Fallback parsing
        try {
            const cached = localStorage.getItem(`pkr_cache_${cacheKey}`);
            if (cached) {
                return JSON.parse(cached) as T;
            }
        } catch (fallbackError) {
            console.error(`[Cache] Failed to parse offline fallback for ${itemName}`, fallbackError);
        }

        console.error(`Failed to load ${itemName}. No offline cache found.`);
        return null;
    } finally {
        activeRequests.delete(cacheKey);
    }
}
