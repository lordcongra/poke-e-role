import { getEffectiveRoomId } from '@/utils/sync/roomScopedStorage';
import { isStandaloneMode } from '@/utils/sync/storageAdapter';
import { openIdbDatabase, runIdbTransaction } from '@/utils/sync/idbHelpers';
import { sanitizeHomebrewData, type HomebrewStorageData } from '@/utils/sync/homebrewSanitizer';

export type { HomebrewStorageData };
export { sanitizeHomebrewData };

export interface HomebrewStorageStats {
    isIndexedDB: boolean;
    dataBytes: number;
    dataFormatted: string;
    quotaBytes?: number;
    quotaFormatted?: string;
    percent: number;
    storageType: 'IndexedDB' | 'localStorage (Fallback)';
    isNearLimit: boolean;
}

interface HomebrewBroadcastMessage {
    type: 'PKR_HOMEBREW_SYNC';
    roomId: string;
    data: HomebrewStorageData;
    senderId: string;
}

const DB_NAME = 'pkr_homebrew_db';
const STORE_NAME = 'homebrew';
const DB_VERSION = 1;
const STORAGE_PREFIX = 'pkr_homebrew_';
const BROADCAST_CHANNEL_NAME = 'pkr_homebrew_sync';
const MIGRATION_DONE_KEY = 'pkr_homebrew_idb_migrated';
const UI_MAXIMIZED_KEY = 'pkr_homebrew_standalone_maximized';

const TAB_ID = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `tab_${Math.random()}`;

let isIdbSupported: boolean | null = null;
let broadcastChannel: BroadcastChannel | null = null;

const memoryCache = new Map<string, HomebrewStorageData>();
type BroadcastListener = (data: HomebrewStorageData, roomId: string) => void;
const broadcastListeners = new Set<BroadcastListener>();
type StorageChangeListener = () => void;
const changeListeners = new Set<StorageChangeListener>();

export { getEffectiveRoomId };

export function getHomebrewStorageKey(roomId?: string): string {
    const id = roomId || getEffectiveRoomId();
    return `${STORAGE_PREFIX}${id}`;
}

function isEmptyHomebrew(data: HomebrewStorageData): boolean {
    return (
        data.customTypes.length === 0 &&
        data.customAbilities.length === 0 &&
        data.customMoves.length === 0 &&
        data.customPokemon.length === 0 &&
        data.customItems.length === 0 &&
        data.customForms.length === 0 &&
        data.customStatuses.length === 0 &&
        (!data.customFieldEffects || data.customFieldEffects.length === 0)
    );
}

async function getDB(): Promise<IDBDatabase> {
    try {
        const db = await openIdbDatabase(DB_NAME, DB_VERSION, (upgradeDb) => {
            if (!upgradeDb.objectStoreNames.contains(STORE_NAME)) {
                upgradeDb.createObjectStore(STORE_NAME);
            }
        });
        isIdbSupported = true;
        return db;
    } catch (err) {
        isIdbSupported = false;
        throw err;
    }
}

function loadFromLocalStorage(key: string): HomebrewStorageData | null {
    if (typeof localStorage === 'undefined') return null;
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return sanitizeHomebrewData(parsed);
    } catch (e) {
        console.warn(`[HomebrewStorage] Failed to read ${key} from localStorage:`, e);
        return null;
    }
}

function saveToLocalStorage(key: string, data: HomebrewStorageData): void {
    if (typeof localStorage === 'undefined') return;
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
        console.error(`[HomebrewStorage] Failed to save ${key} to localStorage:`, e);
    }
}

async function readFromIndexedDB(key: string): Promise<HomebrewStorageData | null> {
    const db = await getDB();
    const raw = await runIdbTransaction(
        db,
        STORE_NAME,
        'readonly',
        (tx) => tx.objectStore(STORE_NAME).get(key) as IDBRequest<unknown>
    );
    return raw ? sanitizeHomebrewData(raw) : null;
}

async function writeToIndexedDB(key: string, data: HomebrewStorageData): Promise<void> {
    const db = await getDB();
    await runIdbTransaction(db, STORE_NAME, 'readwrite', (tx) => {
        tx.objectStore(STORE_NAME).put(data, key);
    });
}

function getChannel(): BroadcastChannel | null {
    if (typeof BroadcastChannel === 'undefined') return null;
    if (!broadcastChannel) {
        try {
            broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
            broadcastChannel.onmessage = (event: MessageEvent<HomebrewBroadcastMessage>) => {
                const msg = event.data;
                if (msg && msg.type === 'PKR_HOMEBREW_SYNC' && msg.senderId !== TAB_ID && msg.data) {
                    broadcastListeners.forEach((fn) => {
                        try {
                            fn(sanitizeHomebrewData(msg.data), msg.roomId);
                        } catch (err) {
                            console.error('[HomebrewStorage] Broadcast listener error:', err);
                        }
                    });
                }
            };
        } catch (e) {
            console.warn('[HomebrewStorage] Failed to initialize BroadcastChannel:', e);
            broadcastChannel = null;
        }
    }
    return broadcastChannel;
}

function notifyChangeListeners(): void {
    changeListeners.forEach((listener) => {
        try {
            listener();
        } catch (e) {
            console.error('[HomebrewStorage] Change listener error:', e);
        }
    });
}

export const homebrewStorage = {
    getEffectiveRoomId,
    getHomebrewStorageKey,

    async runLocalStorageMigration(): Promise<void> {
        if (typeof localStorage === 'undefined') return;
        if (localStorage.getItem(MIGRATION_DONE_KEY) === 'true') return;

        try {
            const candidateKeys: string[] = [];
            for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                if (k && k.startsWith(STORAGE_PREFIX) && k !== MIGRATION_DONE_KEY && k !== UI_MAXIMIZED_KEY) {
                    candidateKeys.push(k);
                }
            }

            if (candidateKeys.length === 0) {
                localStorage.setItem(MIGRATION_DONE_KEY, 'true');
                return;
            }

            let migrationHadError = false;
            const keysToRemove: string[] = [];

            for (const key of candidateKeys) {
                const localData = loadFromLocalStorage(key);
                if (!localData || isEmptyHomebrew(localData)) {
                    keysToRemove.push(key);
                    continue;
                }

                try {
                    const existing = await readFromIndexedDB(key);
                    if (!existing || isEmptyHomebrew(existing)) {
                        await writeToIndexedDB(key, localData);
                    }
                    keysToRemove.push(key);
                } catch (err) {
                    migrationHadError = true;
                    console.warn(`[HomebrewStorage] Migration error for ${key}:`, err);
                }
            }

            if (!migrationHadError) {
                localStorage.setItem(MIGRATION_DONE_KEY, 'true');
            }
            for (const key of keysToRemove) {
                localStorage.removeItem(key);
            }
        } catch (e) {
            console.warn('[HomebrewStorage] Migration check failed:', e);
        }
    },

    async loadHomebrew(roomId?: string): Promise<HomebrewStorageData | null> {
        const key = getHomebrewStorageKey(roomId);

        try {
            const idbData = await readFromIndexedDB(key);
            if (idbData !== null) {
                memoryCache.set(key, idbData);
                return idbData;
            }

            // Only migrate from localStorage when IDB has no record at all and migration hasn't completed
            if (typeof localStorage !== 'undefined' && localStorage.getItem(MIGRATION_DONE_KEY) !== 'true') {
                const localData = loadFromLocalStorage(key);
                if (localData && !isEmptyHomebrew(localData)) {
                    writeToIndexedDB(key, localData)
                        .then(() => {
                            try {
                                localStorage.removeItem(key);
                            } catch {
                                // Ignore localStorage cleanup errors
                            }
                        })
                        .catch((err) => {
                            console.warn('[HomebrewStorage] Failed to cache migrated data to IDB:', err);
                        });
                    memoryCache.set(key, localData);
                    return localData;
                }
            }

            return null;
        } catch (e) {
            // Defensive fallback to localStorage
            console.warn('[HomebrewStorage] IndexedDB read failed; using localStorage fallback:', e);
            const fallbackData = loadFromLocalStorage(key);
            if (fallbackData) {
                memoryCache.set(key, fallbackData);
            }
            return fallbackData;
        }
    },

    async saveHomebrew(
        data: HomebrewStorageData,
        roomId?: string,
        options?: { skipBroadcast?: boolean; allowEmpty?: boolean }
    ): Promise<void> {
        const activeRoomId = roomId || getEffectiveRoomId();
        const key = getHomebrewStorageKey(activeRoomId);
        const sanitized = sanitizeHomebrewData(data);

        if (isEmptyHomebrew(sanitized) && !options?.allowEmpty) {
            let existing = memoryCache.get(key) || null;
            if (!existing || isEmptyHomebrew(existing)) {
                try {
                    existing = await readFromIndexedDB(key);
                } catch {
                    existing = null;
                }
                if (
                    (!existing || isEmptyHomebrew(existing)) &&
                    (typeof localStorage === 'undefined' || localStorage.getItem(MIGRATION_DONE_KEY) !== 'true')
                ) {
                    existing = loadFromLocalStorage(key);
                }
            }
            if (existing && !isEmptyHomebrew(existing)) {
                console.warn(
                    `[HomebrewStorage] Blocked overwriting existing non-empty homebrew data for key '${key}' with empty payload.`
                );
                return;
            }
        }

        memoryCache.set(key, sanitized);

        try {
            await writeToIndexedDB(key, sanitized);
            if (typeof localStorage !== 'undefined') {
                try {
                    localStorage.removeItem(key);
                } catch {
                    // Ignore localStorage cleanup errors
                }
            }
        } catch (e) {
            console.warn('[HomebrewStorage] IndexedDB write failed; falling back to localStorage:', e);
            saveToLocalStorage(key, sanitized);
        }

        notifyChangeListeners();

        // Multi-tab broadcast channel sync for standalone mode
        if (!options?.skipBroadcast && isStandaloneMode) {
            try {
                const ch = getChannel();
                if (ch) {
                    ch.postMessage({
                        type: 'PKR_HOMEBREW_SYNC',
                        roomId: activeRoomId,
                        data: sanitized,
                        senderId: TAB_ID
                    });
                }
            } catch (broadcastErr) {
                console.warn('[HomebrewStorage] Failed to broadcast multi-tab sync:', broadcastErr);
            }
        }
    },

    getCachedHomebrew(roomId?: string): HomebrewStorageData | null {
        const key = getHomebrewStorageKey(roomId);
        return memoryCache.get(key) || null;
    },

    subscribeHomebrewBroadcast(listener: BroadcastListener): () => void {
        getChannel();
        broadcastListeners.add(listener);
        return () => {
            broadcastListeners.delete(listener);
        };
    },

    subscribeHomebrewStorageChange(listener: StorageChangeListener): () => void {
        changeListeners.add(listener);
        return () => {
            changeListeners.delete(listener);
        };
    },

    async getStorageStats(currentData?: HomebrewStorageData, roomId?: string): Promise<HomebrewStorageStats> {
        const key = getHomebrewStorageKey(roomId);
        const data = currentData ||
            memoryCache.get(key) ||
            loadFromLocalStorage(key) || {
                customTypes: [],
                customAbilities: [],
                customMoves: [],
                customPokemon: [],
                customItems: [],
                customForms: [],
                customStatuses: [],
                customFieldEffects: []
            };

        const jsonString = JSON.stringify(data);
        const dataBytes = typeof Blob !== 'undefined' ? new Blob([jsonString]).size : jsonString.length * 2;
        const dataMb = dataBytes / (1024 * 1024);

        const dataFormatted =
            dataBytes < 1024 * 1024 ? `${(dataBytes / 1024).toFixed(1)} KB` : `${dataMb.toFixed(2)} MB`;

        const isIdbActive = isIdbSupported !== false && typeof indexedDB !== 'undefined';

        if (!isIdbActive) {
            const percent = Math.min(100, Math.max(0, (dataMb / 5.0) * 100));
            return {
                isIndexedDB: false,
                dataBytes,
                dataFormatted,
                quotaBytes: 5 * 1024 * 1024,
                quotaFormatted: '5.0 MB',
                percent,
                storageType: 'localStorage (Fallback)',
                isNearLimit: percent > 85
            };
        }

        let quotaBytes: number | undefined;
        let quotaFormatted: string | undefined;
        let percent = 0;
        let isNearLimit = false;

        if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
            try {
                const estimate = await navigator.storage.estimate();
                if (estimate.quota) {
                    quotaBytes = estimate.quota;
                    const qGb = quotaBytes / (1024 * 1024 * 1024);
                    quotaFormatted =
                        qGb >= 1 ? `${qGb.toFixed(1)} GB` : `${(quotaBytes / (1024 * 1024)).toFixed(0)} MB`;
                    if (estimate.usage) {
                        const totalUsagePercent = (estimate.usage / estimate.quota) * 100;
                        percent = Math.min(100, totalUsagePercent);
                        isNearLimit = percent > 90;
                    }
                }
            } catch {
                // Ignore estimate calculation error
            }
        }

        // If overall quota estimate is tiny or not available, use safe visual baseline
        if (percent === 0) {
            percent = Math.min(100, (dataMb / 50.0) * 100);
        }

        return {
            isIndexedDB: true,
            dataBytes,
            dataFormatted,
            quotaBytes,
            quotaFormatted: quotaFormatted || 'Expanded Quota',
            percent,
            storageType: 'IndexedDB',
            isNearLimit
        };
    }
};

export function initHomebrewBroadcastSync(onSync: (data: HomebrewStorageData) => void): () => void {
    return homebrewStorage.subscribeHomebrewBroadcast((data, roomId) => {
        if (roomId === homebrewStorage.getEffectiveRoomId()) {
            onSync(data);
        }
    });
}
