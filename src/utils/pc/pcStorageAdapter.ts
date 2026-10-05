import OBR, { buildSceneUpload } from '@owlbear-rodeo/sdk';
import type { Item, SceneDownload } from '@owlbear-rodeo/sdk';
import type {
    PcStorageData,
    PcBox,
    CampaignProfile,
    PcPokemonSummary,
    TrainerRoster
} from '../../types/pcStorageTypes';

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
    const boxes = Array.from({ length: 8 }, (_, i) => createDefaultBox(i));
    return {
        id,
        name,
        activeTrainerId: trainerId,
        trainers: {
            [trainerId]: {
                id: trainerId,
                name: 'Trainer',
                party: Array(6).fill(null),
                boxes: Array.from({ length: 8 }, (_, i) => createDefaultBox(i))
            }
        },
        boxes,
        teamParty: Array(6).fill(null),
        lastSynced: Date.now()
    };
}

export function createInitialPcStorageData(): PcStorageData {
    if (typeof window !== 'undefined' && window.localStorage) {
        try {
            const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('pkr_pc_storage_default');
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
        const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('pkr_pc_storage_default');
        if (raw) {
            const parsed = JSON.parse(raw) as PcStorageData;
            if (parsed && parsed.campaigns && typeof parsed.campaigns === 'object') {
                return sanitizePcData(parsed);
            }
        }
    } catch (e) {
        console.warn('[PcStorageAdapter] localStorage read failed:', e);
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

export function sanitizePcData(data: PcStorageData): PcStorageData {
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
        if (!Array.isArray(camp.teamParty)) {
            camp.teamParty = Array(6).fill(null);
        }
        if (!Array.isArray(camp.boxes)) {
            camp.boxes = Array.from({ length: 8 }, (_, i) => createDefaultBox(i));
        }

        const claimedByTrainer = new Map<string, string>();

        // Helper to check and resolve valid Pokémon summary or attempt localStorage restoration
        const resolveValidPokemonId = (pid: string | null, targetTrainerId?: string): string | null => {
            if (!pid) return null;
            const existingTrainer = claimedByTrainer.get(pid);
            if (existingTrainer && targetTrainerId && existingTrainer !== targetTrainerId) return null;

            let sum = data.pokemonSummaries[pid];
            if (!sum && typeof window !== 'undefined' && window.localStorage) {
                try {
                    const raw = window.localStorage.getItem(`pkr_char_${pid}`);
                    if (raw) {
                        const parsed = JSON.parse(raw);
                        if (parsed && (parsed.nickname || parsed.species || parsed.name)) {
                            sum = {
                                entityId: pid,
                                trainerId: targetTrainerId,
                                name: parsed.nickname || parsed.species || parsed.name || 'Recovered Pokémon',
                                species: parsed.species || parsed.name || 'Unknown',
                                rank: parsed.rank || 'Starter',
                                type1: parsed.type1 || 'Normal',
                                type2: parsed.type2,
                                hp:
                                    parsed['hp-curr'] !== undefined &&
                                    parsed['hp-curr'] !== '' &&
                                    !isNaN(Number(parsed['hp-curr']))
                                        ? Number(parsed['hp-curr'])
                                        : Number(parsed.hp) || 10,
                                maxHp: Number(parsed['hp-max-display']) || Number(parsed.hpMax) || 10,
                                will:
                                    parsed['will-curr'] !== undefined &&
                                    parsed['will-curr'] !== '' &&
                                    !isNaN(Number(parsed['will-curr']))
                                        ? Number(parsed['will-curr'])
                                        : Number(parsed.will) || 5,
                                maxWill: Number(parsed['will-max-display']) || Number(parsed.willMax) || 5,
                                tokenImageUrl: parsed['token-image-url'] || parsed.tokenImageUrl,
                                isOnMap: false,
                                fullMetadata: parsed,
                                lastModified: Date.now()
                            };
                            data.pokemonSummaries[pid] = sum;
                        }
                    }
                } catch {}
            }

            if (!sum) return null; // Prune ghost slot!
            if (targetTrainerId) {
                sum.trainerId = targetTrainerId;
                claimedByTrainer.set(pid, targetTrainerId);
            }
            return pid;
        };

        for (const [tid, t] of Object.entries(camp.trainers)) {
            if (!t || typeof t !== 'object' || !t.id) {
                delete camp.trainers[tid];
                continue;
            }

            // Prune pseudo "None / PMD" trainer from camp.trainers so it never creates a duplicate profile
            const isPmdPseudo =
                tid === '__none__' ||
                tid.startsWith('__pmd_') ||
                (t.name && t.name.trim().toLowerCase().startsWith('none (pmd'));

            if (isPmdPseudo) {
                if (Array.isArray(t.party)) {
                    for (const pid of t.party) {
                        if (pid && !camp.teamParty.includes(pid)) {
                            const emptyIdx = camp.teamParty.findIndex((s) => s === null);
                            if (emptyIdx !== -1) camp.teamParty[emptyIdx] = pid;
                            else if (camp.boxes[0]) camp.boxes[0].slots.push(pid);
                        }
                    }
                }
                if (Array.isArray(t.boxes)) {
                    for (const b of t.boxes) {
                        for (const pid of b.slots || []) {
                            if (pid && camp.boxes[0]) camp.boxes[0].slots.push(pid);
                        }
                    }
                }
                delete camp.trainers[tid];
                continue;
            }

            if (!t.name || !t.name.trim()) t.name = 'Trainer';

            if (t.avatarUrl && (t.avatarUrl.startsWith('file:') || t.avatarUrl.startsWith('file:///'))) {
                t.avatarUrl = undefined;
            }
            if (!Array.isArray(t.party)) {
                t.party = Array(6).fill(null);
            }
            if (!Array.isArray(t.boxes) || t.boxes.length === 0) {
                const isSingleLegacyTrainer =
                    Object.keys(camp.trainers).length === 1 &&
                    Array.isArray(camp.boxes) &&
                    camp.boxes.some((b) => b.slots.some(Boolean));
                t.boxes = isSingleLegacyTrainer
                    ? JSON.parse(JSON.stringify(camp.boxes))
                    : Array.from({ length: 8 }, (_, i) => createDefaultBox(i));
            }

            t.party = t.party.map((pid) => resolveValidPokemonId(pid, t.id));

            for (const b of t.boxes || []) {
                if (Array.isArray(b.slots)) {
                    b.slots = b.slots.map((pid) => resolveValidPokemonId(pid, t.id));
                }
            }
        }

        if (Object.keys(camp.trainers).length > 0) {
            for (const b of camp.boxes) {
                if (Array.isArray(b.slots)) {
                    b.slots = b.slots.map((pid) =>
                        pid && claimedByTrainer.has(pid) ? null : resolveValidPokemonId(pid)
                    );
                }
            }
            camp.teamParty = camp.teamParty.map((pid) =>
                pid && claimedByTrainer.has(pid) ? null : resolveValidPokemonId(pid)
            );
        }

        // Active trainer sanity check
        if (camp.activeTrainerId !== '__none__') {
            if (!camp.trainers[camp.activeTrainerId]) {
                const firstId = Object.keys(camp.trainers)[0];
                camp.activeTrainerId = firstId || '__none__';
            }
        }

        for (const t of Object.values(camp.trainers)) {
            for (const pid of t.party) {
                if (pid) referencedIds.add(pid);
            }
            for (const b of t.boxes || []) {
                for (const pid of b.slots || []) {
                    if (pid) referencedIds.add(pid);
                }
            }
        }
        for (const b of camp.boxes) {
            for (const pid of b.slots || []) {
                if (pid) referencedIds.add(pid);
            }
        }
        for (const pid of camp.teamParty) {
            if (pid) referencedIds.add(pid);
        }
    }

    // Prune invalid or corrupted Pokémon summaries
    for (const [id, s] of Object.entries(data.pokemonSummaries)) {
        if (!s || typeof s !== 'object' || (!s.name && !s.species)) {
            delete data.pokemonSummaries[id];
        }
    }

    // Sanitize any file:/// URLs from stored Pokémon summaries and auto-heal contaminated entities
    for (const summary of Object.values(data.pokemonSummaries)) {
        if (
            summary.tokenImageUrl &&
            (summary.tokenImageUrl.startsWith('file:') || summary.tokenImageUrl.startsWith('file:///'))
        ) {
            summary.tokenImageUrl = undefined;
        }

        // Auto-heal cross-entity contamination (e.g. Porygon contaminated with Rotom Fan traits)
        const isPorygon =
            summary.entityId === 'a0b92b6c-7399-4dc8-956d-7b29475c9cc1' || summary.name?.toLowerCase() === 'porygon';
        if (isPorygon && summary.species?.toLowerCase().includes('rotom')) {
            summary.species = 'Porygon';
            summary.name = 'Porygon';
            summary.type1 = 'Normal';
            summary.type2 = undefined;
            if (summary.fullMetadata) {
                summary.fullMetadata['species'] = 'Porygon';
                summary.fullMetadata['nickname'] = 'Porygon';
                summary.fullMetadata['type1'] = 'Normal';
                summary.fullMetadata['type2'] = '';
                summary.fullMetadata['ability'] = 'Trace';
                summary.fullMetadata['ability-tags'] = '';
                summary.fullMetadata['ability-list'] = 'Trace,Download,Analytic';
                delete summary.fullMetadata['dex-id'];
                delete summary.fullMetadata['dex-category'];
                delete summary.fullMetadata['dex-description'];
                delete summary.fullMetadata['y-offset'];
                delete summary.fullMetadata['token-image-url'];
            }
        }
    }

    // Auto-recovery: If any valid Pokémon summary in data.pokemonSummaries has a trainerId matching a trainer,
    // but was accidentally unreferenced from slots due to prior cross-claim conflicts, recover it into their boxes.
    for (const [id, summary] of Object.entries(data.pokemonSummaries)) {
        if (!summary || referencedIds.has(id) || summary.isOnMap) continue;
        if (summary.trainerId) {
            for (const camp of Object.values(data.campaigns)) {
                const tr: TrainerRoster | undefined = camp.trainers?.[summary.trainerId];
                if (tr && Array.isArray(tr.boxes) && tr.boxes.length > 0) {
                    for (const b of tr.boxes) {
                        const emptyIdx = b.slots.findIndex((s: string | null) => s === null);
                        if (emptyIdx !== -1) {
                            b.slots[emptyIdx] = id;
                            referencedIds.add(id);
                            break;
                        }
                    }
                    if (referencedIds.has(id)) break;
                }
            }
        }
    }

    // Auto-cleansing: prune unreferenced orphan summaries that are not in any party/box and not on the map
    const pruned: Record<string, PcPokemonSummary> = {};
    for (const [id, summary] of Object.entries(data.pokemonSummaries)) {
        if (referencedIds.has(id) || summary.isOnMap) {
            pruned[id] = summary;
        }
    }
    data.pokemonSummaries = pruned;

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

        try {
            const serialized = JSON.stringify(payload);
            if (serialized.length < 2_500_000) {
                localStorage.setItem(STORAGE_KEY, serialized);
            }
        } catch (e) {
            console.warn('[PcStorageAdapter] localStorage fallback write skipped or exceeded quota:', e);
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
