import type { LocalCharacter, LocalFolder } from './storageAdapter';

const DB_NAME = 'pkr_standalone_db';
const DB_VERSION = 1;
const CHAR_STORE = 'characters';
const FOLDER_STORE = 'folders';
const MIGRATION_FLAG_KEY = 'pkr_idb_standalone_migrated_v1';
const LOCAL_STORAGE_PREFIX = 'pkr_char_';
const FOLDER_STORAGE_KEY = 'pkr_folders';

let dbPromise: Promise<IDBDatabase> | null = null;

function openStandaloneDb(): Promise<IDBDatabase> {
    if (typeof indexedDB === 'undefined') {
        return Promise.reject(new Error('IndexedDB not supported'));
    }
    if (dbPromise) return dbPromise;

    dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
        try {
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            request.onupgradeneeded = () => {
                const db = request.result;
                if (!db.objectStoreNames.contains(CHAR_STORE)) {
                    db.createObjectStore(CHAR_STORE, { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains(FOLDER_STORE)) {
                    db.createObjectStore(FOLDER_STORE, { keyPath: 'id' });
                }
            };
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => {
                dbPromise = null;
                reject(request.error || new Error('Failed to open standalone IndexedDB'));
            };
            request.onblocked = () => {
                console.warn('[standaloneIdb] Database open blocked');
            };
        } catch (e) {
            dbPromise = null;
            reject(e);
        }
    });

    return dbPromise;
}

/**
 * Migrates existing characters and folders from localStorage into IndexedDB on first run.
 */
export async function migrateLocalStorageToIdbIfNeeded(): Promise<void> {
    if (typeof window === 'undefined' || !window.localStorage) return;

    try {
        const isMigrated = localStorage.getItem(MIGRATION_FLAG_KEY) === 'true';
        const db = await openStandaloneDb();

        const countPromise = new Promise<number>((resolve, reject) => {
            const tx = db.transaction(CHAR_STORE, 'readonly');
            const req = tx.objectStore(CHAR_STORE).count();
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });

        const idbCount = await countPromise;

        // If already migrated and IDB has items, nothing to do
        if (isMigrated && idbCount > 0) return;

        // Harvest characters from localStorage
        const charsToMigrate: LocalCharacter[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(LOCAL_STORAGE_PREFIX)) {
                try {
                    const raw = localStorage.getItem(key);
                    if (raw) {
                        const metadata = JSON.parse(raw);
                        const id = key.replace(LOCAL_STORAGE_PREFIX, '');
                        const nickname = metadata.nickname ? String(metadata.nickname).trim() : '';
                        const species = metadata.species ? String(metadata.species).trim() : '';
                        const name = nickname || species || 'Unnamed Character';
                        const parentId = metadata.parentId ? String(metadata.parentId) : null;
                        charsToMigrate.push({ id, name, parentId, metadata });
                    }
                } catch (e) {
                    console.warn('[standaloneIdb] Failed to parse character during migration:', key, e);
                }
            }
        }

        // Harvest folders from localStorage
        let foldersToMigrate: LocalFolder[] = [];
        try {
            const rawFolders = localStorage.getItem(FOLDER_STORAGE_KEY);
            if (rawFolders) {
                const parsed = JSON.parse(rawFolders);
                if (Array.isArray(parsed)) {
                    foldersToMigrate = parsed;
                }
            }
        } catch (e) {
            console.warn('[standaloneIdb] Failed to parse folders during migration:', e);
        }

        if (charsToMigrate.length > 0 || foldersToMigrate.length > 0) {
            const tx = db.transaction([CHAR_STORE, FOLDER_STORE], 'readwrite');
            const charStore = tx.objectStore(CHAR_STORE);
            for (const c of charsToMigrate) {
                charStore.put(c);
            }
            const folderStore = tx.objectStore(FOLDER_STORE);
            for (const f of foldersToMigrate) {
                folderStore.put(f);
            }

            await new Promise<void>((resolve, reject) => {
                tx.oncomplete = () => resolve();
                tx.onerror = () => reject(tx.error);
            });
            console.log(
                `[standaloneIdb] Successfully migrated ${charsToMigrate.length} characters and ${foldersToMigrate.length} folders from localStorage into IndexedDB.`
            );
        }

        localStorage.setItem(MIGRATION_FLAG_KEY, 'true');
    } catch (e) {
        console.warn('[standaloneIdb] Migration check/execution encountered error:', e);
    }
}

export async function idbGetAllCharacters(): Promise<LocalCharacter[]> {
    await migrateLocalStorageToIdbIfNeeded();
    const db = await openStandaloneDb();
    return new Promise<LocalCharacter[]>((resolve, reject) => {
        const tx = db.transaction(CHAR_STORE, 'readonly');
        const req = tx.objectStore(CHAR_STORE).getAll();
        req.onsuccess = () => resolve((req.result as LocalCharacter[]) || []);
        req.onerror = () => reject(req.error);
    });
}

export async function idbGetCharacter(id: string): Promise<LocalCharacter | undefined> {
    const db = await openStandaloneDb();
    return new Promise<LocalCharacter | undefined>((resolve, reject) => {
        const tx = db.transaction(CHAR_STORE, 'readonly');
        const req = tx.objectStore(CHAR_STORE).get(id);
        req.onsuccess = () => resolve(req.result as LocalCharacter | undefined);
        req.onerror = () => reject(req.error);
    });
}

export async function idbPutCharacter(char: LocalCharacter): Promise<void> {
    const db = await openStandaloneDb();
    return new Promise<void>((resolve, reject) => {
        const tx = db.transaction(CHAR_STORE, 'readwrite');
        const req = tx.objectStore(CHAR_STORE).put(char);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
    });
}

export async function idbPutCharacters(chars: LocalCharacter[]): Promise<void> {
    const db = await openStandaloneDb();
    const tx = db.transaction(CHAR_STORE, 'readwrite');
    const store = tx.objectStore(CHAR_STORE);
    for (const c of chars) {
        store.put(c);
    }
    return new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

export async function idbDeleteCharacter(id: string): Promise<void> {
    const db = await openStandaloneDb();
    return new Promise<void>((resolve, reject) => {
        const tx = db.transaction(CHAR_STORE, 'readwrite');
        const req = tx.objectStore(CHAR_STORE).delete(id);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
    });
}

export async function idbGetAllFolders(): Promise<LocalFolder[]> {
    await migrateLocalStorageToIdbIfNeeded();
    const db = await openStandaloneDb();
    return new Promise<LocalFolder[]>((resolve, reject) => {
        const tx = db.transaction(FOLDER_STORE, 'readonly');
        const req = tx.objectStore(FOLDER_STORE).getAll();
        req.onsuccess = () => resolve((req.result as LocalFolder[]) || []);
        req.onerror = () => reject(req.error);
    });
}

export async function idbPutFolder(folder: LocalFolder): Promise<void> {
    const db = await openStandaloneDb();
    return new Promise<void>((resolve, reject) => {
        const tx = db.transaction(FOLDER_STORE, 'readwrite');
        const req = tx.objectStore(FOLDER_STORE).put(folder);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
    });
}

export async function idbPutFolders(folders: LocalFolder[]): Promise<void> {
    const db = await openStandaloneDb();
    const tx = db.transaction(FOLDER_STORE, 'readwrite');
    const store = tx.objectStore(FOLDER_STORE);
    for (const f of folders) {
        store.put(f);
    }
    return new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

export async function idbDeleteFolder(id: string): Promise<void> {
    const db = await openStandaloneDb();
    return new Promise<void>((resolve, reject) => {
        const tx = db.transaction(FOLDER_STORE, 'readwrite');
        const req = tx.objectStore(FOLDER_STORE).delete(id);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
    });
}

export async function idbOverwriteAll(chars: LocalCharacter[], folders: LocalFolder[]): Promise<void> {
    const db = await openStandaloneDb();
    const tx = db.transaction([CHAR_STORE, FOLDER_STORE], 'readwrite');
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

    return new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}
