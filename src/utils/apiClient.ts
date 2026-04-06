const activeRequests = new Map<string, AbortController>();

export async function fetchWithCache<T>(url: string, cacheKey: string, itemName: string): Promise<T | null> {
    if (activeRequests.has(cacheKey)) {
        activeRequests.get(cacheKey)?.abort();
    }

    const controller = new AbortController();
    activeRequests.set(cacheKey, controller);

    try {
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const data = (await response.json()) as T;
        localStorage.setItem(`pkr_cache_${cacheKey}`, JSON.stringify(data));
        return data;
    } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
            console.log(`[Network] Fetch aborted for ${itemName}.`);
            return null;
        }

        console.warn(`[Network] Fetch failed for ${itemName}, checking cache...`);
        const cached = localStorage.getItem(`pkr_cache_${cacheKey}`);

        if (cached) {
            console.log(`Using cached data for ${itemName}.`);
            return JSON.parse(cached) as T;
        }

        console.error(`Failed to load ${itemName}. No offline cache found.`);
        return null;
    } finally {
        activeRequests.delete(cacheKey);
    }
}
