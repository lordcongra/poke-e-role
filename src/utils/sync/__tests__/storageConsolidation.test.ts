import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const { mockIdb } = vi.hoisted(() => {
    if (typeof window !== 'undefined') {
        Object.defineProperty(window, 'top', { value: window.self, configurable: true });
    }
    type DbEntry = { version: number; stores: Map<string, { keyPath?: string; data: Map<string, unknown> }> };
    const registry = new Map<string, DbEntry>();
    const openConns = new Map<string, Set<{ close: () => void; onversionchange: ((e: unknown) => void) | null }>>();
    let failNextGet: Error | null = null;
    const schedule = (fn: () => void) => Promise.resolve().then(fn);
    const makeReq = <T>() => ({
        result: undefined as unknown as T,
        error: null as Error | null,
        onsuccess: null as ((e: unknown) => void) | null,
        onerror: null as ((e: unknown) => void) | null
    });

    const factory = {
        setNextGetError(err: Error | null) {
            failNextGet = err;
        },
        resetAll() {
            registry.clear();
            openConns.clear();
            failNextGet = null;
        },
        open(name: string, version = 1) {
            const req = makeReq<IDBDatabase>() as IDBOpenDBRequest & {
                onupgradeneeded: ((e: unknown) => void) | null;
                onblocked: ((e: unknown) => void) | null;
            };
            req.onupgradeneeded = null;
            req.onblocked = null;

            schedule(() => {
                let entry = registry.get(name);
                const needsUpgrade = !entry || entry.version < version;
                if (!entry) {
                    entry = { version, stores: new Map() };
                    registry.set(name, entry);
                } else if (needsUpgrade) {
                    entry.version = version;
                }

                let closed = false;
                const conn = {
                    close: () => {
                        closed = true;
                        dbObj.onclose?.(new Event('close'));
                    },
                    onversionchange: null as ((e: unknown) => void) | null
                };
                const dbObj = {
                    name,
                    version: entry.version,
                    get objectStoreNames() {
                        return { contains: (n: string) => entry!.stores.has(n) } as unknown as DOMStringList;
                    },
                    createObjectStore(storeName: string, options?: { keyPath?: string }) {
                        if (!entry!.stores.has(storeName)) {
                            entry!.stores.set(storeName, { keyPath: options?.keyPath, data: new Map() });
                        }
                        return {} as IDBObjectStore;
                    },
                    close: () => conn.close(),
                    set onversionchange(fn: ((e: unknown) => void) | null) {
                        conn.onversionchange = fn;
                    },
                    get onversionchange() {
                        return conn.onversionchange;
                    },
                    onclose: null as ((e: unknown) => void) | null,
                    transaction(storeNames: string | string[]) {
                        if (closed) throw new Error('Database is closed');
                        const allowed = new Set(Array.isArray(storeNames) ? storeNames : [storeNames]);
                        let pending = 0;
                        let aborted = false;
                        const tx = {
                            error: null as Error | null,
                            oncomplete: null as ((e: unknown) => void) | null,
                            onerror: null as ((e: unknown) => void) | null,
                            onabort: null as ((e: unknown) => void) | null,
                            abort() {
                                aborted = true;
                                tx.onabort?.(new Event('abort'));
                            },
                            objectStore(storeName: string) {
                                if (!allowed.has(storeName) || !entry!.stores.has(storeName)) {
                                    throw new Error(`Store ${storeName} not found`);
                                }
                                const storeDef = entry!.stores.get(storeName)!;
                                const finishOne = (failedErr?: Error) => {
                                    pending--;
                                    if (aborted) return;
                                    if (failedErr) {
                                        tx.error = failedErr;
                                        tx.onerror?.(new Event('error'));
                                        return;
                                    }
                                    if (pending === 0) schedule(() => !aborted && tx.oncomplete?.(new Event('complete')));
                                };
                                const enqueue = <T>(exec: () => T) => {
                                    pending++;
                                    const r = makeReq<T>();
                                    schedule(() => {
                                        if (aborted) return;
                                        try {
                                            r.result = exec();
                                            r.onsuccess?.({ target: r });
                                            finishOne();
                                        } catch (err) {
                                            r.error = err as Error;
                                            r.onerror?.({ target: r });
                                            finishOne(err as Error);
                                        }
                                    });
                                    return r as unknown as IDBRequest<T>;
                                };
                                return {
                                    get: (key: IDBValidKey) =>
                                        enqueue(() => {
                                            if (failNextGet) {
                                                const err = failNextGet;
                                                failNextGet = null;
                                                throw err;
                                            }
                                            return storeDef.data.get(String(key));
                                        }),
                                    getAll: () => enqueue(() => Array.from(storeDef.data.values())),
                                    put: (val: unknown, key?: IDBValidKey) =>
                                        enqueue(() => {
                                            const k = storeDef.keyPath
                                                ? String((val as Record<string, unknown>)[storeDef.keyPath])
                                                : String(key);
                                            storeDef.data.set(k, structuredClone(val));
                                            return k as unknown as IDBValidKey;
                                        }),
                                    delete: (key: IDBValidKey) =>
                                        enqueue(() => {
                                            storeDef.data.delete(String(key));
                                            return undefined;
                                        }),
                                    clear: () =>
                                        enqueue(() => {
                                            storeDef.data.clear();
                                            return undefined;
                                        }),
                                    openCursor: () => {
                                        pending++;
                                        const r = makeReq<IDBCursorWithValue | null>();
                                        const snapshot = Array.from(storeDef.data.entries());
                                        let idx = 0;
                                        const emitNext = () => {
                                            schedule(() => {
                                                if (aborted) return;
                                                if (idx < snapshot.length) {
                                                    const [k, v] = snapshot[idx++];
                                                    r.result = {
                                                        key: k,
                                                        value: structuredClone(v),
                                                        delete: () => {
                                                            storeDef.data.delete(k);
                                                            return makeReq() as unknown as IDBRequest<undefined>;
                                                        },
                                                        continue: () => emitNext()
                                                    } as unknown as IDBCursorWithValue;
                                                    r.onsuccess?.({ target: r });
                                                } else {
                                                    r.result = null;
                                                    r.onsuccess?.({ target: r });
                                                    finishOne();
                                                }
                                            });
                                        };
                                        emitNext();
                                        return r as unknown as IDBRequest<IDBCursorWithValue | null>;
                                    }
                                };
                            }
                        };
                        return tx as unknown as IDBTransaction;
                    }
                } as unknown as IDBDatabase;

                if (!openConns.has(name)) openConns.set(name, new Set());
                openConns.get(name)!.add(conn);
                (req as unknown as { result: IDBDatabase }).result = dbObj;
                if (needsUpgrade) req.onupgradeneeded?.({ target: req });
                req.onsuccess?.({ target: req } as unknown as Event);
            });
            return req as unknown as IDBOpenDBRequest;
        },
        deleteDatabase(name: string) {
            const req = makeReq<undefined>();
            schedule(() => {
                for (const c of Array.from(openConns.get(name) || [])) {
                    c.onversionchange?.(new Event('versionchange'));
                    c.close();
                }
                openConns.delete(name);
                registry.delete(name);
                req.onsuccess?.({ target: req });
            });
            return req as unknown as IDBOpenDBRequest;
        }
    };
    Object.defineProperty(globalThis, 'indexedDB', { value: factory, configurable: true, writable: true });
    return { mockIdb: factory };
});

import { storageAdapter, isStandaloneMode, LOCAL_STORAGE_PREFIX, FOLDER_STORAGE_KEY } from '@/utils/sync/storageAdapter';
import { MIGRATION_FLAG_KEY, idbGetCharacter } from '@/utils/sync/standaloneIdb';
import { homebrewStorage, type HomebrewStorageData } from '@/utils/sync/homebrewStorage';
import {
    backupAllSettingsToIndexedDB,
    removeSettingFromIndexedDB,
    restoreSettingsFromIndexedDB
} from '@/utils/sync/userPreferences';
import { METADATA_ID } from '@/hooks/owlbearSync/owlbearSyncConstants';
import { useCharacterStore } from '@/store/useCharacterStore';
import { saveHomebrewLocal } from '@/store/slices/homebrew/homebrewSyncOps';

function deleteAllTestDbs(): Promise<void> {
    const del = (name: string) =>
        new Promise<void>((res) => {
            const r = mockIdb.deleteDatabase(name);
            r.onsuccess = () => res();
        });
    return Promise.all([del('pkr_standalone_db'), del('pkr_homebrew_db'), del('pkr_user_preferences')]).then(() =>
        mockIdb.resetAll()
    );
}

describe('Storage consolidation & anti-resurrection invariants (B-07)', () => {
    beforeEach(async () => {
        localStorage.clear();
        await deleteAllTestDbs();
    });

    afterEach(() => {
        vi.restoreAllMocks();
        mockIdb.setNextGetError(null);
    });

    it('deleting the last character or folder does not resurrect from localStorage', async () => {
        localStorage.setItem(`${LOCAL_STORAGE_PREFIX}c1`, JSON.stringify({ nickname: 'Pikachu', species: 'Pikachu' }));
        localStorage.setItem(FOLDER_STORAGE_KEY, JSON.stringify([{ id: 'f1', name: 'Party', parentId: null }]));

        expect(await storageAdapter.getLocalCharacters()).toHaveLength(1);
        expect(await storageAdapter.getFolders()).toHaveLength(1);
        expect(localStorage.getItem(MIGRATION_FLAG_KEY)).toBe('true');
        expect(localStorage.getItem(`${LOCAL_STORAGE_PREFIX}c1`)).toBeNull();
        expect(localStorage.getItem(FOLDER_STORAGE_KEY)).toBeNull();

        await storageAdapter.deleteLocalCharacter('c1');
        await storageAdapter.deleteFolder('f1');

        expect(await storageAdapter.getLocalCharacters()).toHaveLength(0);
        expect(await storageAdapter.getFolders()).toHaveLength(0);
    });

    it('overwriteAll purges stale pkr_char_* and pkr_folders keys from localStorage', async () => {
        localStorage.setItem(`${LOCAL_STORAGE_PREFIX}stale-1`, JSON.stringify({ nickname: 'Ghost' }));
        localStorage.setItem(FOLDER_STORAGE_KEY, JSON.stringify([{ id: 'stale-f', name: 'Old', parentId: null }]));

        await storageAdapter.overwriteAll(
            [{ id: 'fresh-1', name: 'Eevee', parentId: null, metadata: { nickname: 'Eevee', species: 'Eevee' } }],
            [{ id: 'fresh-f', name: 'Box', parentId: null }]
        );

        expect(localStorage.getItem(`${LOCAL_STORAGE_PREFIX}stale-1`)).toBeNull();
        expect(localStorage.getItem(FOLDER_STORAGE_KEY)).toBeNull();
        expect(localStorage.getItem(`${LOCAL_STORAGE_PREFIX}fresh-1`)).toBeNull();
        expect((await storageAdapter.getLocalCharacters()).map((c) => c.id)).toEqual(['fresh-1']);
    });

    it('saveCharacter throws and does not overwrite existing sheet when idbGetCharacter rejects', async () => {
        expect(isStandaloneMode).toBe(true);
        const id = await storageAdapter.createLocalCharacter('Lucario', null);
        await storageAdapter.saveCharacter(id, { species: 'Lucario', 'str-base': 4, 'hp-curr': 12 }, METADATA_ID);

        mockIdb.setNextGetError(new Error('Simulated IDB read failure'));
        await expect(storageAdapter.saveCharacter(id, { 'hp-curr': 7 }, METADATA_ID)).rejects.toThrow(
            'Simulated IDB read failure'
        );

        const intact = await idbGetCharacter(id);
        expect(intact?.metadata.species).toBe('Lucario');
        expect(intact?.metadata['str-base']).toBe(4);
        expect(intact?.metadata['hp-curr']).toBe(12);
    });

    it('homebrewStorage clearing all homebrew does not resurrect stale localStorage entries', async () => {
        const key = homebrewStorage.getHomebrewStorageKey('room-clear');
        const initial: HomebrewStorageData = {
            customTypes: [
                {
                    name: 'Cosmic',
                    color: '#8844ff',
                    weaknesses: [],
                    resistances: [],
                    immunities: [],
                    seAgainst: [],
                    nveAgainst: [],
                    noEffectAgainst: []
                }
            ],
            customAbilities: [],
            customMoves: [],
            customPokemon: [],
            customItems: [],
            customForms: [],
            customStatuses: [],
            customFieldEffects: []
        };
        localStorage.setItem(key, JSON.stringify(initial));

        await homebrewStorage.runLocalStorageMigration();
        expect(localStorage.getItem(key)).toBeNull();
        expect(localStorage.getItem('pkr_homebrew_idb_migrated')).toBe('true');

        localStorage.setItem(key, JSON.stringify(initial));
        await homebrewStorage.saveHomebrew({ ...initial, customTypes: [] }, 'room-clear', {
            allowEmpty: true,
            skipBroadcast: true
        });

        const reloaded = await homebrewStorage.loadHomebrew('room-clear');
        expect(reloaded).not.toBeNull();
        expect(reloaded?.customTypes).toEqual([]);
    });

    it('removeCustomType on the last custom type persists empty customTypes to pkr_homebrew_db while default saveHomebrewLocal still blocks empty overwrites', async () => {
        const cosmicType = {
            name: 'Cosmic',
            color: '#8844ff',
            weaknesses: [],
            resistances: [],
            immunities: [],
            seAgainst: [],
            nveAgainst: [],
            noEffectAgainst: []
        };
        useCharacterStore.setState({
            isHomebrewInitialized: true,
            roomCustomTypes: [cosmicType],
            roomCustomAbilities: [],
            roomCustomMoves: [],
            roomCustomPokemon: [],
            roomCustomItems: [],
            roomCustomForms: [],
            roomCustomStatuses: [],
            roomCustomFieldEffects: [],
            needsBackup: false
        });
        await homebrewStorage.saveHomebrew({
            customTypes: [cosmicType],
            customAbilities: [],
            customMoves: [],
            customPokemon: [],
            customItems: [],
            customForms: [],
            customStatuses: [],
            customFieldEffects: []
        });

        const saveSpy = vi.spyOn(homebrewStorage, 'saveHomebrew');
        useCharacterStore.getState().removeCustomType('Cosmic');

        expect(useCharacterStore.getState().roomCustomTypes).toEqual([]);
        expect(saveSpy).toHaveBeenCalledWith(
            expect.objectContaining({ customTypes: [] }),
            undefined,
            { allowEmpty: true }
        );
        await saveSpy.mock.results[0].value;

        const reloaded = await homebrewStorage.loadHomebrew();
        expect(reloaded?.customTypes).toEqual([]);

        // Default allowEmpty: false protection must still block unintended empty overwrites
        await homebrewStorage.saveHomebrew({
            customTypes: [cosmicType],
            customAbilities: [],
            customMoves: [],
            customPokemon: [],
            customItems: [],
            customForms: [],
            customStatuses: [],
            customFieldEffects: []
        });
        saveSpy.mockClear();
        saveHomebrewLocal(useCharacterStore.getState());
        await saveSpy.mock.results[0].value;

        const stillIntact = await homebrewStorage.loadHomebrew();
        expect(stillIntact?.customTypes.map((t) => t.name)).toEqual(['Cosmic']);
    });

    it('userPreferences removed settings are not resurrected on restore', async () => {
        localStorage.setItem('pkr_global_theme_primary', '#ff0000');
        localStorage.setItem('pkr_accessibility_font_scale', '1.2');
        await backupAllSettingsToIndexedDB();

        localStorage.removeItem('pkr_global_theme_primary');
        await removeSettingFromIndexedDB('pkr_global_theme_primary');

        localStorage.clear();
        const restored = await restoreSettingsFromIndexedDB();

        expect(restored).toBe(1);
        expect(localStorage.getItem('pkr_accessibility_font_scale')).toBe('1.2');
        expect(localStorage.getItem('pkr_global_theme_primary')).toBeNull();
    });
});
