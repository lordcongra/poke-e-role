/**
 * Client-side user preferences and settings persistence via IndexedDB with localStorage mirroring.
 * Stored locally per-browser/user to preserve UI, theme color presets, and accessibility preferences.
 * Provides resilient automatic backup & recovery against browser localStorage purges.
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

function isLegacyEntityKey(key: string): boolean {
    return (
        key.startsWith('pkr_char_') ||
        key.startsWith('pkr_pc_') ||
        key === 'pkr_folders' ||
        key.startsWith('pkr_homebrew_') ||
        key.startsWith('pkr_idb_') ||
        key.startsWith('pkr_storage_') ||
        key === 'pkr_last_master_backup_time' ||
        key === 'pkr_last_local_change_time'
    );
}

/**
 * Checks whether a given key is a persistent Pokerole setting that should be backed up.
 */
export function isPersistentSettingKey(key: string): boolean {
    if (!key || typeof key !== 'string') return false;
    if (key.startsWith('pkr_char_temp') || key.startsWith('_pkr_temp')) return false;
    if (
        key.startsWith('pkr_char_') ||
        key.startsWith('pkr_pc_') ||
        key === 'pkr_folders' ||
        key.startsWith('pkr_homebrew_') ||
        key.startsWith('pkr_idb_') ||
        key.startsWith('pkr_storage_') ||
        key === 'pkr_last_master_backup_time' ||
        key === 'pkr_last_local_change_time'
    )
        return false;
    return key.startsWith('pkr_') || key.startsWith('pokerole-');
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

/**
 * Backs up a single key-value setting to IndexedDB.
 */
export async function backupSettingToIndexedDB(key: string, value: string): Promise<void> {
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
        console.warn(`[UserPreferences] Failed to backup setting '${key}' to IndexedDB:`, e);
    }
}

/**
 * Removes a single setting from IndexedDB (e.g. on intentional user reset).
 */
export async function removeSettingFromIndexedDB(key: string): Promise<void> {
    try {
        const db = await getDB();
        return new Promise<void>((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const req = store.delete(key);
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
        });
    } catch (e) {
        console.warn(`[UserPreferences] Failed to remove setting '${key}' from IndexedDB:`, e);
    }
}

/**
 * Scans all persistent settings currently in localStorage and mirrors them to IndexedDB.
 * Returns the count of backed up settings.
 */
export async function backupAllSettingsToIndexedDB(): Promise<number> {
    try {
        if (typeof localStorage === 'undefined') return 0;
        const db = await getDB();

        const settingsToSave: { key: string; value: string }[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && isPersistentSettingKey(key)) {
                const value = localStorage.getItem(key);
                if (value !== null) {
                    settingsToSave.push({ key, value });
                }
            }
        }

        if (settingsToSave.length === 0) return 0;

        return new Promise<number>((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);

            for (const item of settingsToSave) {
                store.put(item.value, item.key);
            }
            store.put(Date.now().toString(), '_pkr_last_settings_backup_time');

            tx.oncomplete = () => {
                try {
                    localStorage.setItem('pkr_storage_initialized', 'true');
                } catch {
                    // Ignore localStorage quota errors
                }
                resolve(settingsToSave.length);
            };
            tx.onerror = () => reject(tx.error);
        });
    } catch (e) {
        console.warn('[UserPreferences] Failed to backup settings to IndexedDB:', e);
        return 0;
    }
}

/**
 * Restores any settings present in IndexedDB that are missing from localStorage.
 * Automatically runs on app startup to recover from browser localStorage purges.
 * Returns the count of restored settings.
 */
export async function restoreSettingsFromIndexedDB(): Promise<number> {
    try {
        if (typeof localStorage === 'undefined') return 0;
        const db = await getDB();

        return new Promise<number>((resolve) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const req = store.openCursor();
            let restoredCount = 0;

            req.onsuccess = (e) => {
                const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result;
                if (cursor) {
                    const key = String(cursor.key);
                    if (isLegacyEntityKey(key)) {
                        try {
                            cursor.delete();
                            console.warn(`[UserPreferences] Purged legacy entity key '${key}' from user preferences.`);
                        } catch (delErr) {
                            console.warn(`[UserPreferences] Failed to purge legacy entity key '${key}':`, delErr);
                        }
                    } else if (isPersistentSettingKey(key)) {
                        try {
                            const existing = localStorage.getItem(key);
                            if (existing === null) {
                                const rawVal = cursor.value;
                                const stringVal = typeof rawVal === 'string' ? rawVal : JSON.stringify(rawVal);
                                localStorage.setItem(key, stringVal);
                                restoredCount++;
                            }
                        } catch {
                            // Ignore localStorage errors
                        }
                    }
                    cursor.continue();
                } else {
                    if (restoredCount > 0) {
                        try {
                            localStorage.setItem('pkr_storage_initialized', 'true');
                        } catch {
                            // Ignore
                        }
                        console.info(
                            `[UserPreferences] Restored ${restoredCount} settings from IndexedDB backup (localStorage was missing them).`
                        );
                        // Notify UI listeners to re-read restored preferences
                        window.dispatchEvent(new Event('theme-override-updated'));
                        window.dispatchEvent(new Event('accessibility-settings-updated'));
                        window.dispatchEvent(new Event('storage'));
                    }
                    resolve(restoredCount);
                }
            };

            req.onerror = () => {
                resolve(0);
            };
        });
    } catch (e) {
        console.warn('[UserPreferences] Failed to restore settings from IndexedDB:', e);
        return 0;
    }
}

let backupTimeout: ReturnType<typeof setTimeout> | null = null;

/**
 * Schedules a debounced backup of all settings to IndexedDB.
 */
export function scheduleSettingsBackup(delayMs = 600): void {
    if (backupTimeout) clearTimeout(backupTimeout);
    backupTimeout = setTimeout(() => {
        backupAllSettingsToIndexedDB().catch((err) => {
            console.warn('[UserPreferences] Scheduled backup failed:', err);
        });
    }, delayMs);
}

/**
 * Initializes settings backup & recovery on application startup.
 * Restores missing settings if localStorage was purged, then saves current state.
 */
export async function initSettingsBackupSync(): Promise<void> {
    try {
        await restoreSettingsFromIndexedDB();
        await backupAllSettingsToIndexedDB();

        // Listen for storage and preference changes
        window.addEventListener('theme-override-updated', () => scheduleSettingsBackup(300));
        window.addEventListener('accessibility-settings-updated', () => scheduleSettingsBackup(300));
        window.addEventListener('beforeunload', () => {
            backupAllSettingsToIndexedDB().catch(() => {});
        });
    } catch (e) {
        console.warn('[UserPreferences] Failed to initialize settings backup sync:', e);
    }
}
