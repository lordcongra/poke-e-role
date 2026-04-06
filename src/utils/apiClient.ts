const CACHE_EXPIRY_MS = 1000 * 60 * 60 * 24; // 24 hours

const activeRequests = new Map<string, AbortController>();

export async function fetchWithCache<T>(url: string, cacheKey: string, itemName: string): Promise<T | null> {
    if (activeRequests.has(cacheKey)) {
        activeRequests.get(cacheKey)?.abort();
    }

    try {
        // Check cache FIRST to prevent GitHub API rate-limiting!
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
        localStorage.setItem(`pkr_cache_${cacheKey}`, JSON.stringify(data));
        localStorage.setItem(`pkr_cache_time_${cacheKey}`, Date.now().toString());
        return data;
    } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
            return null;
        }

        // If the live fetch fails (e.g. rate limit or no internet), silently fallback to whatever is in the cache
        const cached = localStorage.getItem(`pkr_cache_${cacheKey}`);
        if (cached) {
            return JSON.parse(cached) as T;
        }

        console.error(`Failed to load ${itemName}. No offline cache found.`);
        return null;
    } finally {
        activeRequests.delete(cacheKey);
    }
}
