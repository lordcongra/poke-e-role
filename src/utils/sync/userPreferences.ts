/**
 * Client-side user preferences persistence via IndexedDB with localStorage fallback.
 * Stored locally per-browser/user to preserve individual UI and display preferences.
 */

const DB_NAME = 'pkr_user_preferences';
const STORE_NAME = 'preferences';
const DB_VERSION = 1;

let dbInstance: IDBDatabase | null = null;

function getDB(): Promise<IDBDatabase> {
    if (dbInstance) return Promise.resolve(dbInstance);
    if (typeof indexedDB === 'undefined') {
        return Promise.reject(new Error('IndexedDB is not supported'));
    }

    return new Promise((resolve, reject) => {
        try {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME);
                }
            };

            request.onsuccess = () => {
                dbInstance = request.result;
                dbInstance.onversionchange = () => {
                    dbInstance?.close();
                    dbInstance = null;
                };
                resolve(dbInstance);
            };

            request.onerror = () => {
                reject(request.error || new Error('Failed to open IndexedDB for user preferences'));
            };
        } catch (e) {
            reject(e);
        }
    });
}

/**
 * Reads a user preference by key from IndexedDB, falling back to localStorage or the default value.
 */
export async function getUserPreference<T>(key: string, defaultValue: T): Promise<T> {
    try {
        const db = await getDB();
        return new Promise<T>((resolve) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const req = store.get(key);

            req.onsuccess = () => {
                if (req.result !== undefined) {
                    resolve(req.result as T);
                } else {
                    // Try fallback localStorage
                    try {
                        const lsVal = localStorage.getItem(`pkr_pref_${key}`);
                        if (lsVal !== null) {
                            resolve(JSON.parse(lsVal) as T);
                            return;
                        }
                    } catch {
                        // Ignore localStorage errors
                    }
                    resolve(defaultValue);
                }
            };

            req.onerror = () => {
                try {
                    const lsVal = localStorage.getItem(`pkr_pref_${key}`);
                    if (lsVal !== null) {
                        resolve(JSON.parse(lsVal) as T);
                        return;
                    }
                } catch {
                    // Ignore localStorage errors
                }
                resolve(defaultValue);
            };
        });
    } catch {
        try {
            const lsVal = localStorage.getItem(`pkr_pref_${key}`);
            if (lsVal !== null) {
                return JSON.parse(lsVal) as T;
            }
        } catch {
            // Ignore localStorage errors
        }
        return defaultValue;
    }
}

/**
 * Saves a user preference by key to IndexedDB and mirrors to localStorage for instant synchronous retrieval.
 */
export async function setUserPreference<T>(key: string, value: T): Promise<void> {
    try {
        localStorage.setItem(`pkr_pref_${key}`, JSON.stringify(value));
    } catch {
        // Ignore localStorage errors
    }

    try {
        const db = await getDB();
        return new Promise<void>((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const req = store.put(value, key);

            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
        });
    } catch (e) {
        console.warn(`[UserPreferences] Failed to save preference '${key}' to IndexedDB:`, e);
    }
}
