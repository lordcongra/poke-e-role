interface CachedDatabaseEntry {
    version: number;
    promise: Promise<IDBDatabase>;
}

const dbCache = new Map<string, CachedDatabaseEntry>();

function isIdbRequest<T>(value: unknown): value is IDBRequest<T> {
    return Boolean(
        value &&
            typeof value === 'object' &&
            'onsuccess' in value &&
            'onerror' in value &&
            !('then' in value)
    );
}

/**
 * Opens (or returns a cached singleton) IndexedDB connection.
 * Automatically closes and clears the cache on `onversionchange` and `onclose`
 * so `deleteDatabase` and schema upgrades never block.
 */
export function openIdbDatabase(
    name: string,
    version: number,
    onUpgrade: (db: IDBDatabase, event: IDBVersionChangeEvent) => void
): Promise<IDBDatabase> {
    if (typeof indexedDB === 'undefined') {
        return Promise.reject(new Error('IndexedDB is not supported'));
    }

    const existing = dbCache.get(name);
    if (existing && existing.version === version) {
        return existing.promise;
    }

    let entry: CachedDatabaseEntry;

    const promise = new Promise<IDBDatabase>((resolve, reject) => {
        const clearIfCurrent = () => {
            const current = dbCache.get(name);
            if (current && current.promise === promise) {
                dbCache.delete(name);
            }
        };

        try {
            const request = indexedDB.open(name, version);

            request.onupgradeneeded = (event) => {
                onUpgrade(request.result, event);
            };

            request.onsuccess = () => {
                const db = request.result;
                db.onversionchange = () => {
                    clearIfCurrent();
                    try {
                        db.close();
                    } catch {
                        // Ignore close errors
                    }
                };
                db.onclose = () => {
                    clearIfCurrent();
                };
                resolve(db);
            };

            request.onerror = () => {
                clearIfCurrent();
                reject(request.error || new Error(`Failed to open IndexedDB database "${name}"`));
            };

            request.onblocked = () => {
                console.warn(`[idbHelpers] Database "${name}" open blocked`);
            };
        } catch (err) {
            clearIfCurrent();
            reject(err);
        }
    });

    entry = { version, promise };
    dbCache.set(name, entry);
    return promise;
}

/**
 * Runs an IndexedDB transaction, resolving strictly on `tx.oncomplete` and
 * rejecting on `tx.onerror` or `tx.onabort`.
 */
export function runIdbTransaction<T>(
    db: IDBDatabase,
    storeNames: string | string[],
    mode: IDBTransactionMode,
    fn: (tx: IDBTransaction) => IDBRequest<T>
): Promise<T>;
export function runIdbTransaction<T>(
    db: IDBDatabase,
    storeNames: string | string[],
    mode: IDBTransactionMode,
    fn: (tx: IDBTransaction) => Promise<T> | T
): Promise<T>;
export async function runIdbTransaction<T>(
    db: IDBDatabase,
    storeNames: string | string[],
    mode: IDBTransactionMode,
    fn: (tx: IDBTransaction) => IDBRequest<T> | Promise<T> | T
): Promise<T> {
    const tx = db.transaction(storeNames, mode);

    const txCompletePromise = new Promise<void>((resolve, reject) => {
        const prevComplete = tx.oncomplete;
        const prevError = tx.onerror;
        const prevAbort = tx.onabort;

        tx.oncomplete = (ev) => {
            prevComplete?.call(tx, ev);
            resolve();
        };
        tx.onerror = (ev) => {
            prevError?.call(tx, ev);
            reject(tx.error || new Error('IndexedDB transaction failed'));
        };
        tx.onabort = (ev) => {
            prevAbort?.call(tx, ev);
            reject(tx.error || new Error('IndexedDB transaction aborted'));
        };
    });

    // Prevent unhandled rejection if fn() throws synchronously and tx.abort() triggers onabort
    txCompletePromise.catch(() => {});

    let rawResult: IDBRequest<T> | Promise<T> | T;
    try {
        rawResult = fn(tx);
    } catch (err) {
        try {
            tx.abort();
        } catch {
            // Ignore abort errors if transaction already finished
        }
        throw err;
    }

    if (isIdbRequest<T>(rawResult)) {
        const reqPromise = new Promise<T>((resolve, reject) => {
            const prevSuccess = rawResult.onsuccess;
            const prevError = rawResult.onerror;

            rawResult.onsuccess = (ev) => {
                prevSuccess?.call(rawResult, ev);
                resolve(rawResult.result);
            };
            rawResult.onerror = (ev) => {
                prevError?.call(rawResult, ev);
                reject(rawResult.error || new Error('IndexedDB request failed'));
            };
        });
        reqPromise.catch(() => {});

        const [, value] = await Promise.all([txCompletePromise, reqPromise]);
        return value;
    }

    const valuePromise = Promise.resolve(rawResult);
    valuePromise.catch(() => {});
    const [, value] = await Promise.all([txCompletePromise, valuePromise]);
    return value;
}

