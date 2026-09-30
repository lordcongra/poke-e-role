import OBR, { buildSceneUpload } from '@owlbear-rodeo/sdk';
import type { Item, SceneDownload } from '@owlbear-rodeo/sdk';
import type { PcStorageData, PcBox, CampaignProfile } from '../../types/pcStorageTypes';

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

function openDatabase(): Promise<IDBDatabase> {
    if (typeof indexedDB === 'undefined') {
        return Promise.reject(new Error('IndexedDB not supported'));
    }
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error || new Error('Failed to open IndexedDB for PC'));
    });
}

export async function loadPcStorage(): Promise<PcStorageData> {
    try {
        const db = await openDatabase();
        const data = await new Promise<PcStorageData | undefined>((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const req = store.get('master_record');
            req.onsuccess = () => resolve(req.result as PcStorageData | undefined);
            req.onerror = () => reject(req.error);
        });

        if (data && data.campaigns) {
            return data;
        }
    } catch (e) {
        console.warn('[PcStorageAdapter] IndexedDB read failed, trying localStorage fallback:', e);
    }

    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw) as PcStorageData;
            if (parsed && parsed.campaigns) {
                return parsed;
            }
        }
    } catch (e) {
        console.warn('[PcStorageAdapter] localStorage read failed:', e);
    }

    const initial = createInitialPcStorageData();
    await savePcStorage(initial);
    return initial;
}

export async function savePcStorage(data: PcStorageData): Promise<void> {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
        console.warn('[PcStorageAdapter] localStorage write failed:', e);
    }

    try {
        const db = await openDatabase();
        await new Promise<void>((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const req = store.put(data, 'master_record');
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
        });
    } catch (e) {
        console.warn('[PcStorageAdapter] IndexedDB write failed:', e);
    }
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
        await OBR.assets.uploadScenes([sceneUpload], false);
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
