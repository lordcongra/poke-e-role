import OBR, { buildSceneUpload } from '@owlbear-rodeo/sdk';
import type { Item, SceneDownload } from '@owlbear-rodeo/sdk';
import type { PcStorageData, PcBox, CampaignProfile, PcPokemonSummary } from '../../types/pcStorageTypes';

const DB_NAME = 'pkr_pc_db';
const DB_VERSION = 1;
const STORE_NAME = 'pc_storage';
const STORAGE_KEY = 'pkr_pc_storage_v1';

export function createDefaultBox(index: number): PcBox {
    return {
        id: `box-${index + 1}-${crypto.randomUUID().slice(0, 8)}`,
        name: `Box ${index + 1}`,
        themeColor: '#3b82f6',
        wallpaper: 'default',
        slots: Array(30).fill(null)
    };
}

export function createDefaultCampaign(id = 'default', name = 'Main Adventure'): CampaignProfile {
    const trainerId = `trainer-${crypto.randomUUID().slice(0, 8)}`;
    return {
        id,
        name,
        activeTrainerId: trainerId,
        trainers: {
            [trainerId]: {
                id: trainerId,
                name: 'Trainer',
                party: Array(6).fill(null)
            }
        },
        boxes: Array.from({ length: 8 }, (_, i) => createDefaultBox(i)),
        lastSynced: Date.now()
    };
}

export function createInitialPcStorageData(): PcStorageData {
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

function withTimeout<T>(promise: Promise<T>, ms: number, errorMsg: string): Promise<T> {
    return Promise.race([
        promise,
        new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`Timeout (${ms}ms): ${errorMsg}`)), ms))
    ]);
}

function openDatabase(): Promise<IDBDatabase> {
    if (typeof indexedDB === 'undefined') {
        return Promise.reject(new Error('IndexedDB not supported'));
    }
    const openPromise = new Promise<IDBDatabase>((resolve, reject) => {
        try {
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            request.onupgradeneeded = () => {
                const db = request.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME);
                }
            };
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error || new Error('Failed to open IndexedDB for PC'));
            request.onblocked = () => reject(new Error('IndexedDB open blocked'));
        } catch (e) {
            reject(e);
        }
    });

    return withTimeout(openPromise, 1500, 'IndexedDB openDatabase timed out');
}

export async function loadPcStorage(): Promise<PcStorageData> {
    if (
        typeof window !== 'undefined' &&
        (window.location.search.includes('reset-pc') || window.location.hash.includes('reset-pc'))
    ) {
        console.warn('[PcStorageAdapter] Reset trigger (?reset-pc) detected in URL. Auto-cleansing PC cache.');
        emergencyClearPcStorage();
        const fresh = createInitialPcStorageData();
        savePcStorage(fresh);
        return fresh;
    }

    try {
        const db = await openDatabase();
        const dataPromise = new Promise<PcStorageData | undefined>((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const req = store.get('master_record');
            req.onsuccess = () => resolve(req.result as PcStorageData | undefined);
            req.onerror = () => reject(req.error);
        });

        const data = await withTimeout(dataPromise, 1500, 'IndexedDB get master_record timed out');

        if (data && data.campaigns && typeof data.campaigns === 'object') {
            const sanitized = sanitizePcData(data);
            return sanitized;
        }
    } catch (e) {
        console.warn('[PcStorageAdapter] IndexedDB read failed or timed out, trying localStorage fallback:', e);
    }

    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            if (raw.length > 500_000) {
                console.warn(
                    '[PcStorageAdapter] Detected oversized storage payload (>500KB), auto-clearing corrupt cache.'
                );
                emergencyClearPcStorage();
                const fresh = createInitialPcStorageData();
                savePcStorage(fresh);
                return fresh;
            }
            const parsed = JSON.parse(raw) as PcStorageData;
            if (parsed && parsed.campaigns && typeof parsed.campaigns === 'object') {
                return sanitizePcData(parsed);
            }
        }
    } catch (e) {
        console.warn('[PcStorageAdapter] localStorage read failed:', e);
        emergencyClearPcStorage();
    }

    const initial = createInitialPcStorageData();
    savePcStorage(initial);
    return initial;
}

export function emergencyClearPcStorage(): void {
    try {
        localStorage.removeItem(STORAGE_KEY);
        console.log('[PcStorageAdapter] Cleared localStorage PC storage key.');
    } catch {}
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

function sanitizePcData(data: PcStorageData): PcStorageData {
    if (!data.pokemonSummaries || typeof data.pokemonSummaries !== 'object') {
        data.pokemonSummaries = {};
    }
    if (!data.campaigns || typeof data.campaigns !== 'object') {
        data.campaigns = {};
    }

    const referencedIds = new Set<string>();

    for (const camp of Object.values(data.campaigns)) {
        if (!camp.trainers || typeof camp.trainers !== 'object') {
            camp.trainers = {};
        }
        for (const t of Object.values(camp.trainers)) {
            if (!Array.isArray(t.party)) {
                t.party = Array(6).fill(null);
            } else {
                for (const pid of t.party) {
                    if (pid) referencedIds.add(pid);
                }
            }
        }
        if (!Array.isArray(camp.boxes)) {
            camp.boxes = Array.from({ length: 8 }, (_, i) => createDefaultBox(i));
        } else {
            for (const b of camp.boxes) {
                if (Array.isArray(b.slots)) {
                    for (const pid of b.slots) {
                        if (pid) referencedIds.add(pid);
                    }
                }
            }
        }
    }

    // Defensive auto-cleansing: If summaries ballooned beyond 250 (e.g. from an infinite loop)
    // prune all unreferenced orphan summaries immediately.
    const summaryKeys = Object.keys(data.pokemonSummaries);
    if (summaryKeys.length > 250) {
        console.warn(
            `[PcStorageAdapter] Detected summary bloat (${summaryKeys.length} summaries). Pruning to referenced entities only.`
        );
        const pruned: Record<string, PcPokemonSummary> = {};
        for (const [id, summary] of Object.entries(data.pokemonSummaries)) {
            if (referencedIds.has(id)) {
                pruned[id] = summary;
            }
        }
        data.pokemonSummaries = pruned;
    }

    return data;
}

let debouncedSaveTimer: ReturnType<typeof setTimeout> | null = null;
let latestDataToSave: PcStorageData | null = null;

export async function savePcStorage(data: PcStorageData): Promise<void> {
    latestDataToSave = data;
    if (debouncedSaveTimer) {
        clearTimeout(debouncedSaveTimer);
    }

    debouncedSaveTimer = setTimeout(async () => {
        const payload = latestDataToSave;
        if (!payload) return;

        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
        } catch (e) {
            console.warn('[PcStorageAdapter] localStorage write failed:', e);
        }

        try {
            const db = await openDatabase();
            await new Promise<void>((resolve, reject) => {
                const tx = db.transaction(STORE_NAME, 'readwrite');
                const store = tx.objectStore(STORE_NAME);
                const req = store.put(payload, 'master_record');
                req.onsuccess = () => resolve();
                req.onerror = () => reject(req.error);
            });
        } catch (e) {
            console.warn('[PcStorageAdapter] IndexedDB write failed:', e);
        }
    }, 150);
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
export async function downloadBoxFromObrCloud(campaignName: string): Promise<SceneDownload[]> {
    if (!OBR.isAvailable) {
        return [];
    }
    try {
        const query = `"PKR [${campaignName}]"`;
        const scenes = await OBR.assets.downloadScenes(false, query);
        return scenes || [];
    } catch (e) {
        console.error('[PcStorageAdapter] Failed to download Box from Owlbear Cloud:', e);
        return [];
    }
}
