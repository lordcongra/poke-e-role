import { openIdbDatabase, runIdbTransaction } from '@/utils/sync/idbHelpers';

export type SoloLogEntryType = 'fate' | 'prompt';

export interface SoloLogEntry {
    id: string;
    campaign: string;
    timestamp: number;
    type: SoloLogEntryType;
    question?: string;
    odds?: number;
    oddsLabel?: string;
    chaosFactor?: number;
    target?: number;
    roll: number;
    result: string;
    isRandomEvent?: boolean;
    label: string;
    details?: string;
}

const DB_NAME = 'pkr_solo_oracle_db';
const DB_VERSION = 1;
const LOGS_STORE = 'solo_logs';
const CAMPAIGNS_STORE = 'solo_campaigns';

const ACTIVE_CAMPAIGN_KEY = 'pkr_solo_active_campaign';
const LOCAL_LOGS_KEY = 'pkr_solo_oracle_logs_fallback';
const LOCAL_CAMPAIGNS_KEY = 'pkr_solo_oracle_campaigns_fallback';
export const DEFAULT_CAMPAIGN = 'Main Campaign';

function isIdbAvailable(): boolean {
    return typeof indexedDB !== 'undefined';
}

function getDatabase(): Promise<IDBDatabase> {
    return openIdbDatabase(DB_NAME, DB_VERSION, (db) => {
        if (!db.objectStoreNames.contains(LOGS_STORE)) {
            const logsStore = db.createObjectStore(LOGS_STORE, { keyPath: 'id' });
            logsStore.createIndex('campaign', 'campaign', { unique: false });
            logsStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
        if (!db.objectStoreNames.contains(CAMPAIGNS_STORE)) {
            db.createObjectStore(CAMPAIGNS_STORE, { keyPath: 'name' });
        }
    });
}

// -------------------------------------------------------------
// LocalStorage Fallbacks
// -------------------------------------------------------------
function getLocalLogs(): SoloLogEntry[] {
    try {
        const raw = localStorage.getItem(LOCAL_LOGS_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

function saveLocalLogs(logs: SoloLogEntry[]): void {
    try {
        localStorage.setItem(LOCAL_LOGS_KEY, JSON.stringify(logs));
    } catch (e) {
        console.warn('[SoloLogStorage] Failed to save logs to localStorage fallback:', e);
    }
}

function getLocalCampaigns(): string[] {
    try {
        const raw = localStorage.getItem(LOCAL_CAMPAIGNS_KEY);
        const list = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(list) || list.length === 0) {
            return [DEFAULT_CAMPAIGN];
        }
        return list;
    } catch {
        return [DEFAULT_CAMPAIGN];
    }
}

function saveLocalCampaigns(campaigns: string[]): void {
    try {
        localStorage.setItem(LOCAL_CAMPAIGNS_KEY, JSON.stringify(campaigns));
    } catch (e) {
        console.warn('[SoloLogStorage] Failed to save campaigns to localStorage fallback:', e);
    }
}

// -------------------------------------------------------------
// Campaign Management
// -------------------------------------------------------------
export function getActiveCampaign(): string {
    try {
        return localStorage.getItem(ACTIVE_CAMPAIGN_KEY) || DEFAULT_CAMPAIGN;
    } catch {
        return DEFAULT_CAMPAIGN;
    }
}

export function setActiveCampaign(campaign: string): void {
    try {
        localStorage.setItem(ACTIVE_CAMPAIGN_KEY, campaign || DEFAULT_CAMPAIGN);
    } catch (e) {
        console.warn('[SoloLogStorage] Failed to set active campaign:', e);
    }
}

export async function getSoloCampaigns(): Promise<string[]> {
    if (!isIdbAvailable()) {
        return getLocalCampaigns();
    }
    try {
        const db = await getDatabase();
        const records = await runIdbTransaction<{ name: string }[]>(db, CAMPAIGNS_STORE, 'readonly', (tx) =>
            tx.objectStore(CAMPAIGNS_STORE).getAll()
        );
        const names = records.map((r) => r.name);
        if (!names.includes(DEFAULT_CAMPAIGN)) {
            names.unshift(DEFAULT_CAMPAIGN);
            await createSoloCampaign(DEFAULT_CAMPAIGN);
        }
        return names;
    } catch {
        return getLocalCampaigns();
    }
}

export async function createSoloCampaign(name: string): Promise<void> {
    const trimmed = name.trim();
    if (!trimmed) return;

    if (!isIdbAvailable()) {
        const existing = getLocalCampaigns();
        if (!existing.includes(trimmed)) {
            saveLocalCampaigns([...existing, trimmed]);
        }
        return;
    }

    try {
        const db = await getDatabase();
        await runIdbTransaction(db, CAMPAIGNS_STORE, 'readwrite', (tx) =>
            tx.objectStore(CAMPAIGNS_STORE).put({ name: trimmed, createdAt: Date.now() })
        );
    } catch {
        const existing = getLocalCampaigns();
        if (!existing.includes(trimmed)) {
            saveLocalCampaigns([...existing, trimmed]);
        }
    }
}

export async function deleteSoloCampaign(name: string): Promise<void> {
    const trimmed = name.trim();
    if (!trimmed) return;

    if (!isIdbAvailable()) {
        const existing = getLocalCampaigns().filter((c) => c !== trimmed);
        saveLocalCampaigns(existing.length > 0 ? existing : [DEFAULT_CAMPAIGN]);
        const logs = getLocalLogs().filter((l) => l.campaign !== trimmed);
        saveLocalLogs(logs);
        return;
    }

    try {
        const db = await getDatabase();
        await runIdbTransaction(db, [CAMPAIGNS_STORE, LOGS_STORE], 'readwrite', (tx) => {
            tx.objectStore(CAMPAIGNS_STORE).delete(trimmed);
            const logsStore = tx.objectStore(LOGS_STORE);
            const index = logsStore.index('campaign');
            const req = index.openCursor(IDBKeyRange.only(trimmed));
            req.onsuccess = () => {
                const cursor = req.result;
                if (cursor) {
                    cursor.delete();
                    cursor.continue();
                }
            };
        });
    } catch {
        const existing = getLocalCampaigns().filter((c) => c !== trimmed);
        saveLocalCampaigns(existing.length > 0 ? existing : [DEFAULT_CAMPAIGN]);
        const logs = getLocalLogs().filter((l) => l.campaign !== trimmed);
        saveLocalLogs(logs);
    }
}

// -------------------------------------------------------------
// Log Management
// -------------------------------------------------------------
export async function getSoloLogs(campaign?: string): Promise<SoloLogEntry[]> {
    if (!isIdbAvailable()) {
        const logs = getLocalLogs();
        return campaign ? logs.filter((l) => l.campaign === campaign) : logs;
    }

    try {
        const db = await getDatabase();
        let logs: SoloLogEntry[] = [];
        if (campaign) {
            logs = await runIdbTransaction<SoloLogEntry[]>(db, LOGS_STORE, 'readonly', (tx) => {
                const index = tx.objectStore(LOGS_STORE).index('campaign');
                return index.getAll(IDBKeyRange.only(campaign));
            });
        } else {
            logs = await runIdbTransaction<SoloLogEntry[]>(db, LOGS_STORE, 'readonly', (tx) =>
                tx.objectStore(LOGS_STORE).getAll()
            );
        }
        return logs.sort((a, b) => b.timestamp - a.timestamp);
    } catch {
        const logs = getLocalLogs();
        return (campaign ? logs.filter((l) => l.campaign === campaign) : logs).sort(
            (a, b) => b.timestamp - a.timestamp
        );
    }
}

export async function addSoloLog(entry: Omit<SoloLogEntry, 'id' | 'timestamp'>): Promise<SoloLogEntry> {
    const fullEntry: SoloLogEntry = {
        ...entry,
        id: crypto.randomUUID(),
        timestamp: Date.now()
    };

    if (!isIdbAvailable()) {
        const existing = getLocalLogs();
        saveLocalLogs([fullEntry, ...existing]);
        return fullEntry;
    }

    try {
        const db = await getDatabase();
        await runIdbTransaction(db, LOGS_STORE, 'readwrite', (tx) => tx.objectStore(LOGS_STORE).add(fullEntry));
        return fullEntry;
    } catch {
        const existing = getLocalLogs();
        saveLocalLogs([fullEntry, ...existing]);
        return fullEntry;
    }
}

export async function deleteSoloLog(id: string): Promise<void> {
    if (!isIdbAvailable()) {
        const existing = getLocalLogs().filter((l) => l.id !== id);
        saveLocalLogs(existing);
        return;
    }

    try {
        const db = await getDatabase();
        await runIdbTransaction(db, LOGS_STORE, 'readwrite', (tx) => tx.objectStore(LOGS_STORE).delete(id));
    } catch {
        const existing = getLocalLogs().filter((l) => l.id !== id);
        saveLocalLogs(existing);
    }
}

export async function clearSoloLogs(campaign: string): Promise<void> {
    if (!isIdbAvailable()) {
        const existing = getLocalLogs().filter((l) => l.campaign !== campaign);
        saveLocalLogs(existing);
        return;
    }

    try {
        const db = await getDatabase();
        await runIdbTransaction(db, LOGS_STORE, 'readwrite', (tx) => {
            const store = tx.objectStore(LOGS_STORE);
            const index = store.index('campaign');
            const req = index.openCursor(IDBKeyRange.only(campaign));
            req.onsuccess = () => {
                const cursor = req.result;
                if (cursor) {
                    cursor.delete();
                    cursor.continue();
                }
            };
        });
    } catch {
        const existing = getLocalLogs().filter((l) => l.campaign !== campaign);
        saveLocalLogs(existing);
    }
}
