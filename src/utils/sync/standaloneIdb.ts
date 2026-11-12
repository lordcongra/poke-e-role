import type { LocalCharacter, LocalFolder } from '@/utils/sync/storageAdapter';
import { openIdbDatabase, runIdbTransaction } from '@/utils/sync/idbHelpers';

const DB_NAME = 'pkr_standalone_db';
const DB_VERSION = 1;
const CHAR_STORE = 'characters';
const FOLDER_STORE = 'folders';
export const MIGRATION_FLAG_KEY = 'pkr_idb_standalone_migrated_v1';
const LOCAL_STORAGE_PREFIX = 'pkr_char_';
const FOLDER_STORAGE_KEY = 'pkr_folders';

let inFlightMigration: Promise<void> | null = null;

function openStandaloneDb(): Promise<IDBDatabase> {
    return openIdbDatabase(DB_NAME, DB_VERSION, (db) => {
        if (!db.objectStoreNames.contains(CHAR_STORE)) {
            db.createObjectStore(CHAR_STORE, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(FOLDER_STORE)) {
            db.createObjectStore(FOLDER_STORE, { keyPath: 'id' });
        }
    });
}

/**
 * Migrates existing characters and folders from localStorage into IndexedDB on first run.
 * Returns immediately once `MIGRATION_FLAG_KEY` is `'true'` so deleted characters or
 * folders are never resurrected from stale `localStorage` entries.
 */
export async function migrateLocalStorageToIdbIfNeeded(): Promise<void> {
    if (typeof window === 'undefined' || !window.localStorage) return;
    if (localStorage.getItem(MIGRATION_FLAG_KEY) === 'true') return;
    if (inFlightMigration) return inFlightMigration;

    inFlightMigration = (async () => {
        try {
            if (localStorage.getItem(MIGRATION_FLAG_KEY) === 'true') return;

            const db = await openStandaloneDb();

            // Harvest characters from localStorage
            const charsToMigrate: LocalCharacter[] = [];
            const migratedCharKeys: string[] = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(LOCAL_STORAGE_PREFIX)) {
                    try {
                        const raw = localStorage.getItem(key);
                        if (raw) {
                            const metadata = JSON.parse(raw) as Record<string, unknown>;
                            const id = key.replace(LOCAL_STORAGE_PREFIX, '');
                            const nickname = metadata.nickname ? String(metadata.nickname).trim() : '';
                            const species = metadata.species ? String(metadata.species).trim() : '';
                            const name = nickname || species || 'Unnamed Character';
                            const parentId = metadata.parentId ? String(metadata.parentId) : null;
                            charsToMigrate.push({ id, name, parentId, metadata });
                            migratedCharKeys.push(key);
                        }
                    } catch (e) {
                        console.warn('[standaloneIdb] Failed to parse character during migration:', key, e);
                    }
                }
            }

            // Harvest folders from localStorage
            let foldersToMigrate: LocalFolder[] = [];
            let hasFolderKey = false;
            try {
                const rawFolders = localStorage.getItem(FOLDER_STORAGE_KEY);
                if (rawFolders !== null) {
                    hasFolderKey = true;
                    const parsed = JSON.parse(rawFolders);
                    if (Array.isArray(parsed)) {
                        foldersToMigrate = parsed as LocalFolder[];
                    }
                }
            } catch (e) {
                console.warn('[standaloneIdb] Failed to parse folders during migration:', e);
            }

            if (charsToMigrate.length > 0 || foldersToMigrate.length > 0) {
                await runIdbTransaction(db, [CHAR_STORE, FOLDER_STORE], 'readwrite', (tx) => {
                    const charStore = tx.objectStore(CHAR_STORE);
                    for (const c of charsToMigrate) {
                        charStore.put(c);
                    }
                    const folderStore = tx.objectStore(FOLDER_STORE);
                    for (const f of foldersToMigrate) {
                        folderStore.put(f);
                    }
                });
                console.log(
                    `[standaloneIdb] Successfully migrated ${charsToMigrate.length} characters and ${foldersToMigrate.length} folders from localStorage into IndexedDB.`
                );
            }

            localStorage.setItem(MIGRATION_FLAG_KEY, 'true');
            for (const key of migratedCharKeys) {
                localStorage.removeItem(key);
            }
            if (hasFolderKey) {
                localStorage.removeItem(FOLDER_STORAGE_KEY);
            }
        } catch (e) {
            console.warn('[standaloneIdb] Migration check/execution encountered error:', e);
        } finally {
            inFlightMigration = null;
        }
    })();

    return inFlightMigration;
}

export async function idbGetAllCharacters(): Promise<LocalCharacter[]> {
    await migrateLocalStorageToIdbIfNeeded();
    const db = await openStandaloneDb();
    const result = await runIdbTransaction(
        db,
        CHAR_STORE,
        'readonly',
        (tx) => tx.objectStore(CHAR_STORE).getAll() as IDBRequest<LocalCharacter[]>
    );
    return result || [];
}

export async function idbGetCharacter(id: string): Promise<LocalCharacter | undefined> {
    await migrateLocalStorageToIdbIfNeeded();
    const db = await openStandaloneDb();
    return runIdbTransaction(
        db,
        CHAR_STORE,
        'readonly',
        (tx) => tx.objectStore(CHAR_STORE).get(id) as IDBRequest<LocalCharacter | undefined>
    );
}

export async function idbPutCharacter(char: LocalCharacter): Promise<void> {
    const db = await openStandaloneDb();
    await runIdbTransaction(db, CHAR_STORE, 'readwrite', (tx) => {
        tx.objectStore(CHAR_STORE).put(char);
    });
}

export async function idbPutCharacters(chars: LocalCharacter[]): Promise<void> {
    const db = await openStandaloneDb();
    await runIdbTransaction(db, CHAR_STORE, 'readwrite', (tx) => {
        const store = tx.objectStore(CHAR_STORE);
        for (const c of chars) {
            store.put(c);
        }
    });
}

export async function idbDeleteCharacter(id: string): Promise<void> {
    const db = await openStandaloneDb();
    await runIdbTransaction(db, CHAR_STORE, 'readwrite', (tx) => {
        tx.objectStore(CHAR_STORE).delete(id);
    });
}

export async function idbGetAllFolders(): Promise<LocalFolder[]> {
    await migrateLocalStorageToIdbIfNeeded();
    const db = await openStandaloneDb();
    const result = await runIdbTransaction(
        db,
        FOLDER_STORE,
        'readonly',
        (tx) => tx.objectStore(FOLDER_STORE).getAll() as IDBRequest<LocalFolder[]>
    );
    return result || [];
}

export async function idbPutFolder(folder: LocalFolder): Promise<void> {
    const db = await openStandaloneDb();
    await runIdbTransaction(db, FOLDER_STORE, 'readwrite', (tx) => {
        tx.objectStore(FOLDER_STORE).put(folder);
    });
}

export async function idbPutFolders(folders: LocalFolder[]): Promise<void> {
    const db = await openStandaloneDb();
    await runIdbTransaction(db, FOLDER_STORE, 'readwrite', (tx) => {
        const store = tx.objectStore(FOLDER_STORE);
        for (const f of folders) {
            store.put(f);
        }
    });
}

export async function idbDeleteFolder(id: string): Promise<void> {
    const db = await openStandaloneDb();
    await runIdbTransaction(db, FOLDER_STORE, 'readwrite', (tx) => {
        tx.objectStore(FOLDER_STORE).delete(id);
    });
}

export async function idbOverwriteAll(chars: LocalCharacter[], folders: LocalFolder[]): Promise<void> {
    const db = await openStandaloneDb();
    await runIdbTransaction(db, [CHAR_STORE, FOLDER_STORE], 'readwrite', (tx) => {
        const charStore = tx.objectStore(CHAR_STORE);
        const folderStore = tx.objectStore(FOLDER_STORE);

        charStore.clear();
        folderStore.clear();

        for (const c of chars) {
            charStore.put(c);
        }
        for (const f of folders) {
            folderStore.put(f);
        }
    });
}
