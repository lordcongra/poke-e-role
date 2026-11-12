import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
    DB_NAME,
    STORE_NAME,
    SUMMARY_STORE_NAME,
    loadPcStorage,
    savePcStorage,
    flushPcStorage,
    savePcSummaryDelta,
    deletePcSummaryDelta,
    sanitizePcData,
    emergencyClearPcStorage
} from '@/utils/pc/pcStorageAdapter';
import { useCharacterStore } from '@/store/useCharacterStore';
import type { PcPokemonSummary, PcStorageData } from '@/types/pcStorageTypes';

const STORAGE_KEY = 'pkr_pc_storage_v1';

function buildSampleStorageData(): PcStorageData {
    return {
        activeCampaignId: 'camp-main',
        version: 1,
        campaigns: {
            'camp-main': {
                id: 'camp-main',
                name: 'Johto Run',
                activeTrainerId: 'trainer-1',
                trainers: {
                    'trainer-1': {
                        id: 'trainer-1',
                        name: 'Ethan',
                        party: ['mon-1', null, null, null, null, null],
                        boxes: [
                            {
                                id: 'box-1',
                                name: 'Box 1',
                                slots: Array(30).fill(null)
                            }
                        ],
                        fullMetadata: {
                            rank: 'Starter',
                            'vit-base': 1,
                            'hp-curr': 10,
                            'hp-max-display': 10,
                            'hp-base': 8,
                            'will-curr': 5,
                            'will-max-display': 5,
                            'will-base': 4
                        }
                    }
                },
                boxes: [{ id: 'camp-box-1', name: 'Box 1', slots: Array(30).fill(null) }],
                teamParty: Array(6).fill(null)
            }
        },
        pokemonSummaries: {
            'mon-1': {
                entityId: 'a0b92b6c-7399-4dc8-956d-7b29475c9cc1',
                trainerId: 'trainer-1',
                name: 'Porygon',
                species: 'Rotom-Fan',
                rank: 'Starter',
                type1: 'Electric',
                type2: 'Flying',
                hp: 10,
                maxHp: 10,
                will: 5,
                maxWill: 5,
                fullMetadata: {
                    species: 'Rotom-Fan',
                    nickname: 'Porygon',
                    type1: 'Electric',
                    type2: 'Flying',
                    ability: 'Levitate'
                }
            }
        }
    };
}

describe('pcStorageAdapter safety invariants', () => {
    const originalHref = typeof window !== 'undefined' ? window.location.href : 'http://localhost/';

    beforeEach(() => {
        localStorage.clear();
    });

    afterEach(() => {
        localStorage.clear();
        if (typeof window !== 'undefined') {
            window.history.replaceState({}, '', originalHref);
        }
    });

    it('does not wipe PC storage when ?reset-pc or #reset-pc appears in URL', async () => {
        const stored = buildSampleStorageData();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));

        window.history.replaceState({}, '', '/?reset-pc');
        const loadedFromSearch = await loadPcStorage();
        expect(loadedFromSearch.campaigns['camp-main']?.name).toBe('Johto Run');
        expect(loadedFromSearch.pokemonSummaries['mon-1']).toBeDefined();
        expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull();

        window.history.replaceState({}, '', '/#reset-pc');
        const loadedFromHash = await loadPcStorage();
        expect(loadedFromHash.campaigns['camp-main']?.name).toBe('Johto Run');
        expect(loadedFromHash.pokemonSummaries['mon-1']).toBeDefined();
    });

    it('preserves 10 HP / 5 Will on Starter trainers during sanitizePcData', () => {
        const data = buildSampleStorageData();
        const sanitized = sanitizePcData(data);
        const trainerMeta = sanitized.campaigns['camp-main'].trainers['trainer-1'].fullMetadata!;

        expect(trainerMeta['hp-curr']).toBe(10);
        expect(trainerMeta['hp-max-display']).toBe(10);
        expect(trainerMeta['hp-base']).toBe(8);
        expect(trainerMeta['will-curr']).toBe(5);
        expect(trainerMeta['will-max-display']).toBe(5);
        expect(trainerMeta['will-base']).toBe(4);
    });

    it('preserves a Rotom nicknamed Porygon without rewriting species or metadata', () => {
        const data = buildSampleStorageData();
        const sanitized = sanitizePcData(data);
        const summary = sanitized.pokemonSummaries['mon-1'];

        expect(summary.species).toBe('Rotom-Fan');
        expect(summary.name).toBe('Porygon');
        expect(summary.type1).toBe('Electric');
        expect(summary.type2).toBe('Flying');
        expect(summary.fullMetadata?.['species']).toBe('Rotom-Fan');
        expect(summary.fullMetadata?.['ability']).toBe('Levitate');
    });

    it('sanitizePcData does not resurrect deleted pkr_char_* Pokémon or trainer entries from localStorage', () => {
        localStorage.setItem(
            'pkr_char_ghost-mon',
            JSON.stringify({ species: 'Gastly', nickname: 'Ghost', 'hp-curr': 10, 'hp-max-display': 10 })
        );
        localStorage.setItem(
            'pkr_char_trainer-1',
            JSON.stringify({ species: 'StaleTrainer', nickname: 'StaleTrainer', 'hp-curr': 99 })
        );

        const data = buildSampleStorageData();
        data.campaigns['camp-main'].trainers['trainer-1'].party = ['ghost-mon', null, null, null, null, null];
        delete data.pokemonSummaries['mon-1'];

        const sanitized = sanitizePcData(data);
        expect(sanitized.pokemonSummaries['ghost-mon']).toBeUndefined();
        expect(sanitized.campaigns['camp-main'].trainers['trainer-1'].fullMetadata?.['hp-curr']).toBe(10);
    });
});

function createControlledPcIdbMock() {
    type StoreDef = { keyPath?: string; data: Map<string, unknown> };
    const registry = new Map<string, { version: number; stores: Map<string, StoreDef> }>();
    const openConns = new Set<{ close: () => void; onversionchange: ((e: unknown) => void) | null }>();
    let deferNextComplete = false;
    let deferredCompleteTrigger: (() => void) | null = null;
    let failNextWriteError: Error | null = null;
    const putCalls: Array<{ store: string; key: string }> = [];
    const schedule = (fn: () => void) => Promise.resolve().then(fn);
    const makeReq = <T>() => ({
        result: undefined as unknown as T,
        error: null as Error | null,
        onsuccess: null as ((e: unknown) => void) | null,
        onerror: null as ((e: unknown) => void) | null
    });

    const factory = {
        getStoreData: (storeName: string) => registry.get(DB_NAME)?.stores.get(storeName)?.data,
        getPutCalls: () => putCalls,
        clearPutCalls: () => {
            putCalls.length = 0;
        },
        setDeferNextComplete: (val: boolean) => {
            deferNextComplete = val;
        },
        triggerDeferredComplete: () => {
            const fn = deferredCompleteTrigger;
            deferredCompleteTrigger = null;
            fn?.();
        },
        setFailNextWrite: (err: Error | null) => {
            failNextWriteError = err;
        },
        resetAll: () => {
            for (const c of Array.from(openConns)) {
                c.onversionchange?.(new Event('versionchange'));
                c.close();
            }
            openConns.clear();
            registry.clear();
            putCalls.length = 0;
            deferNextComplete = false;
            deferredCompleteTrigger = null;
            failNextWriteError = null;
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
                const conn = { close: () => dbObj.onclose?.(new Event('close')), onversionchange: null as ((e: unknown) => void) | null };
                const dbObj = {
                    name,
                    version: entry.version,
                    objectStoreNames: { contains: (n: string) => entry!.stores.has(n) } as unknown as DOMStringList,
                    createObjectStore: (s: string, opts?: { keyPath?: string }) => {
                        if (!entry!.stores.has(s)) entry!.stores.set(s, { keyPath: opts?.keyPath, data: new Map() });
                        return {} as IDBObjectStore;
                    },
                    close: () => conn.close(),
                    set onversionchange(fn: ((e: unknown) => void) | null) { conn.onversionchange = fn; },
                    get onversionchange() { return conn.onversionchange; },
                    onclose: null as ((e: unknown) => void) | null,
                    transaction(storeNames: string | string[]) {
                        const allowed = new Set(Array.isArray(storeNames) ? storeNames : [storeNames]);
                        let pending = 0;
                        let aborted = false;
                        const tx = {
                            error: null as Error | null,
                            oncomplete: null as ((e: unknown) => void) | null,
                            onerror: null as ((e: unknown) => void) | null,
                            onabort: null as ((e: unknown) => void) | null,
                            abort() { aborted = true; tx.onabort?.(new Event('abort')); },
                            objectStore(storeName: string) {
                                if (!allowed.has(storeName) || !entry!.stores.has(storeName)) throw new Error(`Store ${storeName} not found`);
                                const storeDef = entry!.stores.get(storeName)!;
                                const finish = (err?: Error) => {
                                    pending--;
                                    if (aborted) return;
                                    if (err) { tx.error = err; tx.onerror?.(new Event('error')); return; }
                                    if (pending === 0) {
                                        const emit = () => !aborted && tx.oncomplete?.(new Event('complete'));
                                        if (deferNextComplete) { deferNextComplete = false; deferredCompleteTrigger = () => schedule(emit); }
                                        else schedule(emit);
                                    }
                                };
                                const enqueue = <T>(exec: () => T) => {
                                    pending++;
                                    const r = makeReq<T>();
                                    schedule(() => {
                                        if (aborted) return;
                                        try { r.result = exec(); r.onsuccess?.({ target: r }); finish(); }
                                        catch (e) { r.error = e as Error; r.onerror?.({ target: r }); finish(e as Error); }
                                    });
                                    return r as unknown as IDBRequest<T>;
                                };
                                return {
                                    get: (k: IDBValidKey) => enqueue(() => storeDef.data.get(String(k))),
                                    getAll: () => enqueue(() => Array.from(storeDef.data.values())),
                                    put: (val: unknown, key?: IDBValidKey) => enqueue(() => {
                                        if (failNextWriteError) { const e = failNextWriteError; failNextWriteError = null; throw e; }
                                        const k = storeDef.keyPath ? String((val as Record<string, unknown>)[storeDef.keyPath]) : String(key);
                                        putCalls.push({ store: storeName, key: k });
                                        storeDef.data.set(k, structuredClone(val));
                                        return k as unknown as IDBValidKey;
                                    }),
                                    delete: (k: IDBValidKey) => enqueue(() => { storeDef.data.delete(String(k)); return undefined; }),
                                    clear: () => enqueue(() => { storeDef.data.clear(); return undefined; })
                                };
                            }
                        };
                        return tx as unknown as IDBTransaction;
                    }
                } as unknown as IDBDatabase;
                openConns.add(conn);
                (req as unknown as { result: IDBDatabase }).result = dbObj;
                if (needsUpgrade) req.onupgradeneeded?.({ target: req });
                req.onsuccess?.({ target: req } as unknown as Event);
            });
            return req as unknown as IDBOpenDBRequest;
        },
        deleteDatabase() {
            const req = makeReq<undefined>();
            schedule(() => { factory.resetAll(); req.onsuccess?.({ target: req }); });
            return req as unknown as IDBOpenDBRequest;
        }
    };
    return factory;
}

describe('pkr_pc_db v2, delta persistence & async flush', () => {
    const originalIdbDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'indexedDB');
    let mockIdb: ReturnType<typeof createControlledPcIdbMock>;

    beforeEach(() => {
        localStorage.clear();
        mockIdb = createControlledPcIdbMock();
        Object.defineProperty(globalThis, 'indexedDB', { value: mockIdb, configurable: true, writable: true });
    });

    afterEach(() => {
        emergencyClearPcStorage();
        mockIdb.resetAll();
        vi.useRealTimers();
        vi.restoreAllMocks();
        if (originalIdbDescriptor) {
            Object.defineProperty(globalThis, 'indexedDB', originalIdbDescriptor);
        } else {
            delete (globalThis as unknown as { indexedDB?: unknown }).indexedDB;
        }
    });

    it('savePcStorage resolves only after 150ms timer + tx.oncomplete, rejects on IDB failure, and flushPcStorage commits immediately', async () => {
        vi.useFakeTimers();
        const data = buildSampleStorageData();
        data.pokemonSummaries['mon-1'].entityId = 'mon-1';

        mockIdb.setDeferNextComplete(true);
        let settled = false;
        const savePromise = savePcStorage(data).then(() => {
            settled = true;
        });

        await vi.advanceTimersByTimeAsync(150);
        await Promise.resolve();
        expect(settled).toBe(false);

        mockIdb.triggerDeferredComplete();
        await savePromise;
        expect(settled).toBe(true);

        // flushPcStorage commits immediately without waiting 150ms
        const data2 = buildSampleStorageData();
        data2.campaigns['camp-main'].name = 'Flushed Run';
        data2.pokemonSummaries['mon-1'].entityId = 'mon-1';
        let flushed = false;
        const p2 = savePcStorage(data2).then(() => {
            flushed = true;
        });
        await flushPcStorage();
        await p2;
        expect(flushed).toBe(true);

        const master = mockIdb.getStoreData(STORE_NAME)?.get('master_record') as PcStorageData;
        expect(master.campaigns['camp-main'].name).toBe('Flushed Run');
        expect(master.pokemonSummaries).toEqual({});

        // Rejection propagation on IDB failure
        mockIdb.setFailNextWrite(new Error('IDB write failed'));
        const p3 = savePcStorage(data2);
        const rejectCheck = expect(p3).rejects.toThrow('IDB write failed');
        await flushPcStorage().catch(() => {});
        await rejectCheck;
    });

    it('savePcSummaryDelta writes only target summary without writing PcStorageData to localStorage, and deletePcSummaryDelta removes it', async () => {
        const data = buildSampleStorageData();
        data.pokemonSummaries['mon-1'].entityId = 'mon-1';
        const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');

        const saveP = savePcStorage(data);
        await flushPcStorage();
        await saveP;
        mockIdb.clearPutCalls();
        setItemSpy.mockClear();

        useCharacterStore.setState({ isInitialized: true, pcData: data });
        const updatedSummary: PcPokemonSummary = {
            ...data.pokemonSummaries['mon-1'],
            hp: 3,
            will: 2
        };

        useCharacterStore.getState().updatePokemonSummary(updatedSummary);
        await flushPcStorage();

        expect(mockIdb.getPutCalls()).toEqual([{ store: SUMMARY_STORE_NAME, key: 'mon-1' }]);
        expect(setItemSpy).not.toHaveBeenCalledWith(STORAGE_KEY, expect.any(String));
        const storedSum = mockIdb.getStoreData(SUMMARY_STORE_NAME)?.get('mon-1') as PcPokemonSummary;
        expect(storedSum.hp).toBe(3);

        await savePcSummaryDelta({ ...updatedSummary, hp: 1 });
        expect((mockIdb.getStoreData(SUMMARY_STORE_NAME)?.get('mon-1') as PcPokemonSummary).hp).toBe(1);

        await deletePcSummaryDelta('mon-1');
        expect(mockIdb.getStoreData(SUMMARY_STORE_NAME)?.get('mon-1')).toBeUndefined();
    });

    it('loadPcStorage migrates legacy localStorage and clears pkr_pc_storage_* keys after tx.oncomplete', async () => {
        const legacy = buildSampleStorageData();
        legacy.pokemonSummaries['mon-1'].entityId = 'mon-1';
        localStorage.setItem(STORAGE_KEY, JSON.stringify(legacy));
        localStorage.setItem('pkr_pc_storage_default', JSON.stringify(legacy));

        const loaded = await loadPcStorage();
        expect(loaded.pokemonSummaries['mon-1']?.name).toBe('Porygon');
        expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
        expect(localStorage.getItem('pkr_pc_storage_default')).toBeNull();

        const master = mockIdb.getStoreData(STORE_NAME)?.get('master_record') as PcStorageData;
        expect(master.pokemonSummaries).toEqual({});
        expect(mockIdb.getStoreData(SUMMARY_STORE_NAME)?.get('mon-1')).toBeDefined();
    });
});

