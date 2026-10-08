import OBR from '@owlbear-rodeo/sdk';
import type {
    CustomType,
    CustomAbility,
    CustomMove,
    CustomPokemon,
    CustomItem,
    CustomForm,
    CustomStatus
} from '../../store/storeTypes';
import { isStandaloneMode } from './storageAdapter';

export interface HomebrewStorageData {
    customTypes: CustomType[];
    customAbilities: CustomAbility[];
    customMoves: CustomMove[];
    customPokemon: CustomPokemon[];
    customItems: CustomItem[];
    customForms: CustomForm[];
    customStatuses: CustomStatus[];
    needsBackup?: boolean;
    updatedAt?: number;
}

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
const OFFLINE_ROOM_ID = 'offline';
const STORAGE_PREFIX = 'pkr_homebrew_';
const BROADCAST_CHANNEL_NAME = 'pkr_homebrew_sync';
const MIGRATION_DONE_KEY = 'pkr_homebrew_idb_migrated';

const TAB_ID = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `tab_${Math.random()}`;

let dbInstance: IDBDatabase | null = null;
let isIdbSupported: boolean | null = null;
let broadcastChannel: BroadcastChannel | null = null;

const memoryCache = new Map<string, HomebrewStorageData>();
type BroadcastListener = (data: HomebrewStorageData, roomId: string) => void;
const broadcastListeners = new Set<BroadcastListener>();
type StorageChangeListener = () => void;
const changeListeners = new Set<StorageChangeListener>();

export function getEffectiveRoomId(): string {
    try {
        if (OBR.isAvailable && OBR.room && OBR.room.id) {
            return OBR.room.id;
        }
    } catch (e) {
        console.warn('[HomebrewStorage] Failed to retrieve OBR room ID.', e);
    }
    return OFFLINE_ROOM_ID;
}

export function getHomebrewStorageKey(roomId?: string): string {
    const id = roomId || getEffectiveRoomId();
    return `${STORAGE_PREFIX}${id}`;
}

export function sanitizeHomebrewData(raw: unknown): HomebrewStorageData {
    if (!raw || typeof raw !== 'object') {
        return {
            customTypes: [],
            customAbilities: [],
            customMoves: [],
            customPokemon: [],
            customItems: [],
            customForms: [],
            customStatuses: [],
            needsBackup: false,
            updatedAt: Date.now()
        };
    }
    const obj = raw as Record<string, unknown>;
    return {
        customTypes: Array.isArray(obj.customTypes) ? (obj.customTypes as CustomType[]) : [],
        customAbilities: Array.isArray(obj.customAbilities) ? (obj.customAbilities as CustomAbility[]) : [],
        customMoves: Array.isArray(obj.customMoves) ? (obj.customMoves as CustomMove[]) : [],
        customPokemon: Array.isArray(obj.customPokemon) ? (obj.customPokemon as CustomPokemon[]) : [],
        customItems: Array.isArray(obj.customItems) ? (obj.customItems as CustomItem[]) : [],
        customForms: Array.isArray(obj.customForms) ? (obj.customForms as CustomForm[]) : [],
        customStatuses: Array.isArray(obj.customStatuses) ? (obj.customStatuses as CustomStatus[]) : [],
        needsBackup: Boolean(obj.needsBackup),
        updatedAt: typeof obj.updatedAt === 'number' ? obj.updatedAt : Date.now()
    };
}

function isEmptyHomebrew(data: HomebrewStorageData): boolean {
    return (
        data.customTypes.length === 0 &&
        data.customAbilities.length === 0 &&
        data.customMoves.length === 0 &&
        data.customPokemon.length === 0 &&
        data.customItems.length === 0 &&
        data.customForms.length === 0 &&
        data.customStatuses.length === 0
    );
}

function getDB(): Promise<IDBDatabase> {
    if (dbInstance) return Promise.resolve(dbInstance);
    if (typeof indexedDB === 'undefined') {
        isIdbSupported = false;
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
                isIdbSupported = true;
                dbInstance.onversionchange = () => {
                    dbInstance?.close();
                    dbInstance = null;
                };
                resolve(dbInstance);
            };

            request.onerror = () => {
                isIdbSupported = false;
                reject(request.error || new Error('Failed to open IndexedDB'));
            };
        } catch (e) {
            isIdbSupported = false;
            reject(e);
        }
    });
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

function readFromIndexedDB(key: string): Promise<HomebrewStorageData | null> {
    return getDB().then(
        (db) =>
            new Promise((resolve, reject) => {
                try {
                    const tx = db.transaction(STORE_NAME, 'readonly');
                    const store = tx.objectStore(STORE_NAME);
                    const request = store.get(key);

                    request.onsuccess = () => {
                        if (request.result) {
                            resolve(sanitizeHomebrewData(request.result));
                        } else {
                            resolve(null);
                        }
                    };
                    request.onerror = () => reject(request.error);
                } catch (e) {
                    reject(e);
                }
            })
    );
}

function writeToIndexedDB(key: string, data: HomebrewStorageData): Promise<void> {
    return getDB().then(
        (db) =>
            new Promise((resolve, reject) => {
                try {
                    const tx = db.transaction(STORE_NAME, 'readwrite');
                    const store = tx.objectStore(STORE_NAME);
                    const request = store.put(data, key);

                    request.onsuccess = () => resolve();
                    request.onerror = () => reject(request.error);
                } catch (e) {
                    reject(e);
                }
            })
    );
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
        try {
            const candidateKeys: string[] = [];
            for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                if (k && k.startsWith(STORAGE_PREFIX) && k !== MIGRATION_DONE_KEY) {
                    candidateKeys.push(k);
                }
            }

            if (candidateKeys.length === 0) {
                localStorage.setItem(MIGRATION_DONE_KEY, 'true');
                return;
            }

            for (const key of candidateKeys) {
                const localData = loadFromLocalStorage(key);
                if (!localData || isEmptyHomebrew(localData)) continue;

                try {
                    const existing = await readFromIndexedDB(key);
                    if (!existing || isEmptyHomebrew(existing)) {
                        await writeToIndexedDB(key, localData);
                    }
                } catch (err) {
                    console.warn(`[HomebrewStorage] Migration error for ${key}:`, err);
                }
            }

            localStorage.setItem(MIGRATION_DONE_KEY, 'true');
        } catch (e) {
            console.warn('[HomebrewStorage] Migration check failed:', e);
        }
    },

    async loadHomebrew(roomId?: string): Promise<HomebrewStorageData | null> {
        const key = getHomebrewStorageKey(roomId);

        try {
            const idbData = await readFromIndexedDB(key);
            if (idbData && !isEmptyHomebrew(idbData)) {
                memoryCache.set(key, idbData);
                return idbData;
            }

            // Check if there is data in localStorage to migrate seamlessly
            const localData = loadFromLocalStorage(key);
            if (localData && !isEmptyHomebrew(localData)) {
                writeToIndexedDB(key, localData).catch((err) => {
                    console.warn('[HomebrewStorage] Failed to cache migrated data to IDB:', err);
                });
                memoryCache.set(key, localData);
                return localData;
            }

            if (idbData) {
                memoryCache.set(key, idbData);
                return idbData;
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
                if (!existing || isEmptyHomebrew(existing)) {
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
                customStatuses: []
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
