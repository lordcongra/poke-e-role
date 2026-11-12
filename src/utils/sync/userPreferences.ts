/**
 * Client-side user preferences and settings persistence via IndexedDB with localStorage mirroring.
 * Stored locally per-browser/user to preserve UI, theme color presets, and accessibility preferences.
 * Provides resilient automatic backup & recovery against browser localStorage purges.
 */

import { openIdbDatabase, runIdbTransaction } from '@/utils/sync/idbHelpers';

const DB_NAME = 'pkr_user_preferences';
const STORE_NAME = 'preferences';
const DB_VERSION = 1;
const TOMBSTONE_PREFIX = '_pkr_deleted:';

function getDB(): Promise<IDBDatabase> {
    return openIdbDatabase(DB_NAME, DB_VERSION, (db) => {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME);
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
        key === 'pkr_last_local_change_time' ||
        key === 'pkr_roll_log' ||
        key.startsWith('pkr_roll_log_') ||
        key === 'pkr_battle_organizer_data' ||
        key.startsWith('pkr_battle_organizer_data_') ||
        key === 'pkr_battle_organizer_open' ||
        key.startsWith('pkr_battle_organizer_open_') ||
        key === 'pkr_battle_organizer_offline_migrated'
    );
}

/**
 * Checks whether a given key is a persistent Pokerole setting that should be backed up.
 */
export function isPersistentSettingKey(key: string): boolean {
    if (!key || typeof key !== 'string') return false;
    if (key.startsWith('pkr_char_temp') || key.startsWith('_pkr_temp')) return false;
    if (key === 'pkr_roll_log' || key.startsWith('pkr_roll_log_')) return false;
    if (
        key === 'pkr_battle_organizer_data' ||
        key.startsWith('pkr_battle_organizer_data_') ||
        key === 'pkr_battle_organizer_open' ||
        key.startsWith('pkr_battle_organizer_open_') ||
        key === 'pkr_battle_organizer_offline_migrated'
    )
        return false;
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

function readLocalStoragePreference<T>(key: string, defaultValue: T): T {
    try {
        if (typeof localStorage !== 'undefined') {
            const lsVal = localStorage.getItem(`pkr_pref_${key}`);
            if (lsVal !== null) {
                return JSON.parse(lsVal) as T;
            }
        }
    } catch {
        // Ignore localStorage errors
    }
    return defaultValue;
}

/**
 * Reads a user preference by key from IndexedDB, falling back to localStorage or the default value.
 */
export async function getUserPreference<T>(key: string, defaultValue: T): Promise<T> {
    try {
        const db = await getDB();
        const result = await runIdbTransaction(
            db,
            STORE_NAME,
            'readonly',
            (tx) => tx.objectStore(STORE_NAME).get(key) as IDBRequest<T | undefined>
        );
        if (result !== undefined) {
            return result;
        }
        return readLocalStoragePreference(key, defaultValue);
    } catch {
        return readLocalStoragePreference(key, defaultValue);
    }
}

/**
 * Saves a user preference by key to IndexedDB and mirrors to localStorage for instant synchronous retrieval.
 */
export async function setUserPreference<T>(key: string, value: T): Promise<void> {
    try {
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem(`pkr_pref_${key}`, JSON.stringify(value));
        }
    } catch {
        // Ignore localStorage errors
    }

    try {
        const db = await getDB();
        await runIdbTransaction(db, STORE_NAME, 'readwrite', (tx) => {
            const store = tx.objectStore(STORE_NAME);
            store.delete(`${TOMBSTONE_PREFIX}${key}`);
            store.put(value, key);
        });
    } catch (e) {
        console.warn(`[UserPreferences] Failed to save preference '${key}' to IndexedDB:`, e);
    }
}

/**
 * Backs up a single key-value setting to IndexedDB and clears any prior deletion tombstone.
 */
export async function backupSettingToIndexedDB(key: string, value: string): Promise<void> {
    try {
        const db = await getDB();
        await runIdbTransaction(db, STORE_NAME, 'readwrite', (tx) => {
            const store = tx.objectStore(STORE_NAME);
            store.delete(`${TOMBSTONE_PREFIX}${key}`);
            store.put(value, key);
        });
    } catch (e) {
        console.warn(`[UserPreferences] Failed to backup setting '${key}' to IndexedDB:`, e);
    }
}

/**
 * Removes a single setting from IndexedDB and records a deletion tombstone so it is not resurrected.
 */
export async function removeSettingFromIndexedDB(key: string): Promise<void> {
    try {
        const db = await getDB();
        await runIdbTransaction(db, STORE_NAME, 'readwrite', (tx) => {
            const store = tx.objectStore(STORE_NAME);
            store.delete(key);
            store.put(Date.now(), `${TOMBSTONE_PREFIX}${key}`);
        });
    } catch (e) {
        console.warn(`[UserPreferences] Failed to remove setting '${key}' from IndexedDB:`, e);
    }
}

/**
 * Scans all persistent settings currently in localStorage, mirrors them to IndexedDB,
 * and prunes persistent IDB keys that are no longer present in localStorage.
 * Returns the count of backed up settings.
 */
export async function backupAllSettingsToIndexedDB(): Promise<number> {
    try {
        if (typeof localStorage === 'undefined') return 0;
        const db = await getDB();

        const settingsToSave: { key: string; value: string }[] = [];
        const liveKeys = new Set<string>();
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && isPersistentSettingKey(key)) {
                const value = localStorage.getItem(key);
                if (value !== null) {
                    settingsToSave.push({ key, value });
                    liveKeys.add(key);
                }
            }
        }

        await runIdbTransaction(db, STORE_NAME, 'readwrite', (tx) => {
            const store = tx.objectStore(STORE_NAME);
            return new Promise<void>((resolve, reject) => {
                const cursorReq = store.openCursor();
                cursorReq.onsuccess = (e) => {
                    const cursor = (e.target as IDBRequest<IDBCursorWithValue | null>).result;
                    if (cursor) {
                        const existingKey = String(cursor.key);
                        if (
                            isLegacyEntityKey(existingKey) ||
                            (isPersistentSettingKey(existingKey) && !liveKeys.has(existingKey))
                        ) {
                            cursor.delete();
                        }
                        cursor.continue();
                    } else {
                        for (const item of settingsToSave) {
                            store.delete(`${TOMBSTONE_PREFIX}${item.key}`);
                            store.put(item.value, item.key);
                        }
                        if (settingsToSave.length > 0) {
                            store.put(Date.now().toString(), '_pkr_last_settings_backup_time');
                        }
                        resolve();
                    }
                };
                cursorReq.onerror = () => reject(cursorReq.error);
            });
        });

        if (settingsToSave.length > 0) {
            try {
                localStorage.setItem('pkr_storage_initialized', 'true');
            } catch {
                // Ignore localStorage quota errors
            }
        }

        return settingsToSave.length;
    } catch (e) {
        console.warn('[UserPreferences] Failed to backup settings to IndexedDB:', e);
        return 0;
    }
}

/**
 * Restores any non-tombstoned settings present in IndexedDB that are missing from localStorage.
 * Automatically runs on app startup to recover from browser localStorage purges.
 * Returns the count of restored settings.
 */
export async function restoreSettingsFromIndexedDB(): Promise<number> {
    try {
        if (typeof localStorage === 'undefined') return 0;
        const db = await getDB();

        const restoredCount = await runIdbTransaction(db, STORE_NAME, 'readwrite', (tx) => {
            const store = tx.objectStore(STORE_NAME);
            return new Promise<number>((resolve, reject) => {
                const req = store.openCursor();
                const tombstonedKeys = new Set<string>();
                const entries: Array<{ key: string; value: unknown }> = [];

                req.onsuccess = (e) => {
                    const cursor = (e.target as IDBRequest<IDBCursorWithValue | null>).result;
                    if (cursor) {
                        const key = String(cursor.key);
                        if (key.startsWith(TOMBSTONE_PREFIX)) {
                            tombstonedKeys.add(key.slice(TOMBSTONE_PREFIX.length));
                        } else {
                            entries.push({ key, value: cursor.value });
                        }
                        cursor.continue();
                    } else {
                        let count = 0;
                        for (const entry of entries) {
                            if (isLegacyEntityKey(entry.key)) {
                                try {
                                    store.delete(entry.key);
                                    console.warn(
                                        `[UserPreferences] Purged legacy entity key '${entry.key}' from user preferences.`
                                    );
                                } catch (delErr) {
                                    console.warn(
                                        `[UserPreferences] Failed to purge legacy entity key '${entry.key}':`,
                                        delErr
                                    );
                                }
                            } else if (tombstonedKeys.has(entry.key)) {
                                try {
                                    store.delete(entry.key);
                                } catch {
                                    // Ignore cleanup errors
                                }
                            } else if (isPersistentSettingKey(entry.key)) {
                                try {
                                    const existing = localStorage.getItem(entry.key);
                                    if (existing === null) {
                                        const stringVal =
                                            typeof entry.value === 'string'
                                                ? entry.value
                                                : JSON.stringify(entry.value);
                                        localStorage.setItem(entry.key, stringVal);
                                        count++;
                                    }
                                } catch {
                                    // Ignore localStorage errors
                                }
                            }
                        }
                        resolve(count);
                    }
                };

                req.onerror = () => reject(req.error);
            });
        });

        if (restoredCount > 0) {
            try {
                localStorage.setItem('pkr_storage_initialized', 'true');
            } catch {
                // Ignore
            }
            console.info(
                `[UserPreferences] Restored ${restoredCount} settings from IndexedDB backup (localStorage was missing them).`
            );
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new Event('theme-override-updated'));
                window.dispatchEvent(new Event('accessibility-settings-updated'));
            }
        }

        return restoredCount;
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

        if (typeof window !== 'undefined') {
            window.addEventListener('theme-override-updated', () => scheduleSettingsBackup(300));
            window.addEventListener('accessibility-settings-updated', () => scheduleSettingsBackup(300));
            window.addEventListener('beforeunload', () => {
                backupAllSettingsToIndexedDB().catch(() => {});
            });
        }
    } catch (e) {
        console.warn('[UserPreferences] Failed to initialize settings backup sync:', e);
    }
}
