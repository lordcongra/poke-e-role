import OBR, { buildSceneUpload } from '@owlbear-rodeo/sdk';
import type { Item, SceneDownload } from '@owlbear-rodeo/sdk';
import type { PcStorageData, PcPokemonSummary } from '@/types/pcStorageTypes';
import { openIdbDatabase, runIdbTransaction } from '@/utils/sync/idbHelpers';
import { createDefaultBox, createDefaultCampaign, sanitizePcData } from '@/utils/pc/pcDataSanitizer';

export { createDefaultBox, createDefaultCampaign, sanitizePcData };

export const DB_NAME = 'pkr_pc_db';
export const DB_VERSION = 2;
export const STORE_NAME = 'pc_storage';
export const SUMMARY_STORE_NAME = 'pokemon_summaries';
const MASTER_RECORD_KEY = 'master_record';
const STORAGE_KEY = 'pkr_pc_storage_v1';
const LEGACY_DEFAULT_KEY = 'pkr_pc_storage_default';
const LEGACY_STORAGE_PREFIX = 'pkr_pc_storage_';
const SAVE_COALESCE_MS = 150;

function openPcDatabase(): Promise<IDBDatabase> {
    return openIdbDatabase(DB_NAME, DB_VERSION, (db) => {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME);
        }
        if (!db.objectStoreNames.contains(SUMMARY_STORE_NAME)) {
            db.createObjectStore(SUMMARY_STORE_NAME, { keyPath: 'entityId' });
        }
    });
}

function clearLegacyPcLocalStorageKeys(): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(LEGACY_STORAGE_PREFIX)) {
                keysToRemove.push(key);
            }
        }
        for (const key of keysToRemove) {
            localStorage.removeItem(key);
        }
    } catch {
        // Ignore localStorage cleanup errors
    }
}

export function createInitialPcStorageData(): PcStorageData {
    if (typeof window !== 'undefined' && window.localStorage) {
        try {
            const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_DEFAULT_KEY);
            if (raw) {
                const parsed = JSON.parse(raw) as PcStorageData;
                if (
                    parsed &&
                    parsed.campaigns &&
                    typeof parsed.campaigns === 'object' &&
                    Object.keys(parsed.campaigns).length > 0
                ) {
                    return sanitizePcData(parsed);
                }
            }
        } catch {}
    }

    const defaultCamp = createDefaultCampaign();
    return {
        activeCampaignId: defaultCamp.id,
        campaigns: {
            [defaultCamp.id]: defaultCamp
        },
        pokemonSummaries: {},
        version: 1
    };
}

function normalizeSummaryRecord(id: string, summary: PcPokemonSummary): PcPokemonSummary {
    return summary.entityId === id ? summary : { ...summary, entityId: id };
}

async function executePcWrite(data: PcStorageData): Promise<void> {
    const db = await openPcDatabase();
    const masterPayload: PcStorageData = {
        ...data,
        pokemonSummaries: {}
    };
    const summaryEntries = Object.entries(data.pokemonSummaries || {});

    await runIdbTransaction(db, [STORE_NAME, SUMMARY_STORE_NAME], 'readwrite', (tx) => {
        tx.objectStore(STORE_NAME).put(masterPayload, MASTER_RECORD_KEY);
        const summaryStore = tx.objectStore(SUMMARY_STORE_NAME);
        summaryStore.clear();
        for (const [id, summary] of summaryEntries) {
            if (!summary || typeof summary !== 'object') continue;
            summaryStore.put(normalizeSummaryRecord(id, summary));
        }
    });
}

export async function loadPcStorage(): Promise<PcStorageData> {
    let idbReadSucceeded = false;

    try {
        const db = await openPcDatabase();
        const { masterData, summaryList } = await runIdbTransaction(
            db,
            [STORE_NAME, SUMMARY_STORE_NAME],
            'readonly',
            (tx) => {
                const masterReq = tx.objectStore(STORE_NAME).get(MASTER_RECORD_KEY) as IDBRequest<
                    PcStorageData | undefined
                >;
                const summaryReq = tx.objectStore(SUMMARY_STORE_NAME).getAll() as IDBRequest<PcPokemonSummary[]>;
                return Promise.all([
                    new Promise<PcStorageData | undefined>((resolve, reject) => {
                        masterReq.onsuccess = () => resolve(masterReq.result);
                        masterReq.onerror = () => reject(masterReq.error || new Error('Failed to read master_record'));
                    }),
                    new Promise<PcPokemonSummary[]>((resolve, reject) => {
                        summaryReq.onsuccess = () => resolve(summaryReq.result || []);
                        summaryReq.onerror = () =>
                            reject(summaryReq.error || new Error('Failed to read pokemon_summaries'));
                    })
                ]).then(([master, summaries]) => ({ masterData: master, summaryList: summaries }));
            }
        );

        idbReadSucceeded = true;

        if (
            masterData &&
            masterData.campaigns &&
            typeof masterData.campaigns === 'object' &&
            Object.keys(masterData.campaigns).length > 0
        ) {
            const legacySummaries = masterData.pokemonSummaries || {};
            const hasLegacyEmbeddedSummaries = Object.keys(legacySummaries).length > 0;

            const mergedSummaries: Record<string, PcPokemonSummary> = {};
            for (const [id, sum] of Object.entries(legacySummaries)) {
                if (sum && typeof sum === 'object') {
                    mergedSummaries[id] = normalizeSummaryRecord(id, sum);
                }
            }
            for (const sum of summaryList) {
                if (sum && typeof sum === 'object' && sum.entityId) {
                    mergedSummaries[sum.entityId] = sum;
                }
            }

            const sanitized = sanitizePcData({
                ...masterData,
                pokemonSummaries: mergedSummaries
            });

            if (hasLegacyEmbeddedSummaries) {
                try {
                    await executePcWrite(sanitized);
                    clearLegacyPcLocalStorageKeys();
                } catch (migrationErr) {
                    console.warn('[PcStorageAdapter] Failed to migrate legacy embedded summaries:', migrationErr);
                }
            } else {
                clearLegacyPcLocalStorageKeys();
            }

            return sanitized;
        }
    } catch (e) {
        console.warn('[PcStorageAdapter] IndexedDB read failed, trying localStorage fallback:', e);
    }

    try {
        const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_DEFAULT_KEY);
        if (raw) {
            const parsed = JSON.parse(raw) as PcStorageData;
            if (
                parsed &&
                parsed.campaigns &&
                typeof parsed.campaigns === 'object' &&
                Object.keys(parsed.campaigns).length > 0
            ) {
                const sanitized = sanitizePcData(parsed);
                if (idbReadSucceeded) {
                    try {
                        await executePcWrite(sanitized);
                        clearLegacyPcLocalStorageKeys();
                    } catch (migrationErr) {
                        console.warn('[PcStorageAdapter] Failed to migrate localStorage PC data to IDB:', migrationErr);
                    }
                }
                return sanitized;
            }
        }
    } catch (e) {
        console.warn('[PcStorageAdapter] localStorage read failed:', e);
    }

    // SAFE HANDLING: If IndexedDB read failed, NEVER overwrite the record with an empty campaign!
    const initial = createInitialPcStorageData();
    if (!idbReadSucceeded) {
        console.warn(
            '[PcStorageAdapter] CRITICAL SAFETY: IndexedDB read was not confirmed. Skipping automatic save of empty initial campaign to protect master record.'
        );
    }
    return initial;
}

let debouncedSaveTimer: ReturnType<typeof setTimeout> | null = null;
let latestDataToSave: PcStorageData | null = null;
let pendingWaiters: Array<{ resolve: () => void; reject: (err: unknown) => void }> = [];
const inFlightWrites = new Set<Promise<void>>();

function trackInFlightWrite(promise: Promise<void>): void {
    inFlightWrites.add(promise);
    const cleanup = () => {
        inFlightWrites.delete(promise);
    };
    promise.then(cleanup, cleanup);
}

function commitPendingPcSave(): Promise<void> {
    if (debouncedSaveTimer) {
        clearTimeout(debouncedSaveTimer);
        debouncedSaveTimer = null;
    }

    const payload = latestDataToSave;
    const waiters = pendingWaiters;
    latestDataToSave = null;
    pendingWaiters = [];

    if (!payload) {
        for (const w of waiters) w.resolve();
        return Promise.resolve();
    }

    const commitPromise = executePcWrite(payload).then(
        () => {
            for (const w of waiters) w.resolve();
        },
        (err) => {
            console.warn('[PcStorageAdapter] IndexedDB write failed:', err);
            for (const w of waiters) w.reject(err);
            throw err;
        }
    );

    trackInFlightWrite(commitPromise);
    return commitPromise;
}

export function savePcStorage(data: PcStorageData): Promise<void> {
    latestDataToSave = data;
    if (debouncedSaveTimer) {
        clearTimeout(debouncedSaveTimer);
    }

    return new Promise<void>((resolve, reject) => {
        pendingWaiters.push({ resolve, reject });
        debouncedSaveTimer = setTimeout(() => {
            debouncedSaveTimer = null;
            commitPendingPcSave().catch(() => {
                // Individual caller rejections are handled via pendingWaiters
            });
        }, SAVE_COALESCE_MS);
    });
}

export async function flushPcStorage(): Promise<void> {
    const errors: unknown[] = [];

    if (latestDataToSave || debouncedSaveTimer) {
        try {
            await commitPendingPcSave();
        } catch (err) {
            errors.push(err);
        }
    }

    if (inFlightWrites.size > 0) {
        const results = await Promise.allSettled(Array.from(inFlightWrites));
        for (const res of results) {
            if (res.status === 'rejected') {
                errors.push(res.reason);
            }
        }
    }

    if (errors.length > 0) {
        throw errors[0];
    }
}

export async function savePcSummaryDelta(summary: PcPokemonSummary): Promise<void> {
    if (!summary || !summary.entityId) return;
    const record: PcPokemonSummary = {
        ...summary,
        lastModified: summary.lastModified || Date.now()
    };

    if (latestDataToSave) {
        latestDataToSave = {
            ...latestDataToSave,
            pokemonSummaries: {
                ...latestDataToSave.pokemonSummaries,
                [record.entityId]: record
            }
        };
    }

    const writePromise = (async () => {
        const db = await openPcDatabase();
        await runIdbTransaction(db, SUMMARY_STORE_NAME, 'readwrite', (tx) => {
            tx.objectStore(SUMMARY_STORE_NAME).put(record);
        });
    })();

    trackInFlightWrite(writePromise);
    return writePromise;
}

export async function deletePcSummaryDelta(entityId: string): Promise<void> {
    if (!entityId) return;

    if (latestDataToSave) {
        const nextSummaries = { ...latestDataToSave.pokemonSummaries };
        delete nextSummaries[entityId];
        latestDataToSave = {
            ...latestDataToSave,
            pokemonSummaries: nextSummaries
        };
    }

    const writePromise = (async () => {
        const db = await openPcDatabase();
        await runIdbTransaction(db, SUMMARY_STORE_NAME, 'readwrite', (tx) => {
            tx.objectStore(SUMMARY_STORE_NAME).delete(entityId);
        });
    })();

    trackInFlightWrite(writePromise);
    return writePromise;
}

let lifecycleHooksRegistered = false;

export function registerPcStorageLifecycleHooks(): void {
    if (lifecycleHooksRegistered || typeof window === 'undefined') return;
    lifecycleHooksRegistered = true;

    window.addEventListener('beforeunload', () => {
        flushPcStorage().catch(() => {});
    });

    if (typeof document !== 'undefined') {
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                flushPcStorage().catch(() => {});
            }
        });
    }
}

registerPcStorageLifecycleHooks();

export function emergencyClearPcStorage(): void {
    if (debouncedSaveTimer) {
        clearTimeout(debouncedSaveTimer);
        debouncedSaveTimer = null;
    }
    latestDataToSave = null;
    const waiters = pendingWaiters;
    pendingWaiters = [];
    for (const w of waiters) w.resolve();

    clearLegacyPcLocalStorageKeys();
    console.log('[PcStorageAdapter] Cleared localStorage PC storage keys.');
    try {
        if (typeof indexedDB !== 'undefined') {
            indexedDB.deleteDatabase(DB_NAME);
            console.log('[PcStorageAdapter] Deleted IndexedDB pkr_pc_db.');
        }
    } catch {}
}

if (typeof window !== 'undefined') {
    (window as unknown as Record<string, unknown>).pkrClearPcStorage = emergencyClearPcStorage;
}

/**
 * Uploads a collection of tokens representing a Box or Party to Owlbear Rodeo Cloud Storage
 * using the public Asset Manager API (Andrew's Forms/Prefabs technique).
 */
export async function uploadBoxToObrCloud(
    boxName: string,
    campaignName: string,
    items: Item[],
    customSceneName?: string
): Promise<boolean> {
    if (!OBR.isAvailable) {
        return false;
    }
    try {
        const title = customSceneName?.trim() || `PKR [${campaignName}] - ${boxName}`;
        const sceneUpload = buildSceneUpload().name(title).items(items).build();
        await OBR.assets.uploadScenes([sceneUpload], true);
        return true;
    } catch (e) {
        console.error('[PcStorageAdapter] Failed to upload Box to Owlbear Cloud:', e);
        return false;
    }
}

/**
 * Opens Owlbear Rodeo's native Asset Manager picker pre-filtered to this campaign's boxes.
 */
export async function downloadBoxFromObrCloud(_campaignName?: string): Promise<SceneDownload[]> {
    if (!OBR.isAvailable) {
        return [];
    }
    try {
        const scenes = await OBR.assets.downloadScenes(false, 'PKR');
        return scenes || [];
    } catch (e) {
        console.error('[PcStorageAdapter] Failed to download Box from Owlbear Cloud:', e);
        return [];
    }
}
