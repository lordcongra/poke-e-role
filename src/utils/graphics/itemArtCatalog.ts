import { useState, useEffect } from 'react';
import OBR from '@owlbear-rodeo/sdk';
import { isStandaloneMode } from '../sync/storageAdapter';

const DB_NAME = 'pkr_item_catalog';
const STORE_NAME = 'item_art';
const DB_VERSION = 1;
const EXTENSION_ID = 'pokerole-pmd-extension';

// In-memory catalog mapping normalized item name -> shareable image URL
const memoryCatalog = new Map<string, string>();
let isInitialized = false;

type CatalogListener = () => void;
const listeners = new Set<CatalogListener>();

export function subscribeItemArtCatalog(listener: CatalogListener): () => void {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

function notifyListeners() {
    listeners.forEach((fn) => {
        try {
            fn();
        } catch (e) {
            console.error('[ItemArtCatalog] Listener error:', e);
        }
    });
}

/**
 * Normalizes item names for consistent lookup (case-insensitive, trimmed).
 */
export function normalizeItemName(name: string | undefined | null): string {
    if (!name || typeof name !== 'string') return '';
    return name.trim().toLowerCase();
}

/**
 * Validates that an image URL is valid to store in the catalog.
 * Allows 'local-img:' (stored in IndexedDB on the local device, valid across sheets),
 * as well as remote web URLs ('http://', 'https://', '/').
 * Transient browser blobs and data URIs are excluded.
 */
export function isValidItemArtUrl(url: unknown): url is string {
    if (typeof url !== 'string') return false;
    const trimmed = url.trim();
    if (!trimmed || trimmed === 'none') return false;
    if (trimmed.startsWith('data:')) return false;
    if (trimmed.startsWith('blob:')) return false;
    return (
        trimmed.startsWith('local-img:') ||
        trimmed.startsWith('http://') ||
        trimmed.startsWith('https://') ||
        trimmed.startsWith('/')
    );
}

/**
 * Validates that an image URL can be shared across different players over the network.
 * Local uploads ('local-img:') are stored only in this browser's IndexedDB and cannot be resolved by remote peers.
 */
export function isRemoteShareableUrl(url: unknown): url is string {
    if (!isValidItemArtUrl(url)) return false;
    const trimmed = url.trim();
    if (trimmed.startsWith('local-img:')) return false;
    return trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('/');
}

// Keep isShareableImageUrl as alias to isRemoteShareableUrl for backwards compatibility
export const isShareableImageUrl = isRemoteShareableUrl;

/**
 * Initializes the IndexedDB database for item artwork catalog.
 */
function getDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        if (typeof indexedDB === 'undefined') {
            return reject(new Error('IndexedDB is not supported'));
        }
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

/**
 * Scans all local character sheets saved in localStorage to harvest item artwork.
 */
export async function harvestLocalCharactersItemArt(): Promise<void> {
    try {
        if (typeof localStorage === 'undefined') return;
        const foundEntries: Record<string, string> = {};

        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('pkr_char_')) {
                const raw = localStorage.getItem(key);
                if (raw) {
                    try {
                        const meta = JSON.parse(raw) as Record<string, unknown>;
                        const rawInv = meta?.['inv-data'];
                        let items: Array<{ name?: string; imageUrl?: string }> = [];

                        if (typeof rawInv === 'string') {
                            items = JSON.parse(rawInv);
                        } else if (Array.isArray(meta?.inventory)) {
                            items = meta.inventory as Array<{ name?: string; imageUrl?: string }>;
                        }

                        if (Array.isArray(items)) {
                            for (const inv of items) {
                                if (inv && inv.name && isValidItemArtUrl(inv.imageUrl)) {
                                    const k = normalizeItemName(inv.name);
                                    if (k) foundEntries[k] = inv.imageUrl.trim();
                                }
                            }
                        }
                    } catch {
                        // Ignore individual parse errors
                    }
                }
            }
        }

        if (Object.keys(foundEntries).length > 0) {
            await mergeItemArt(foundEntries, true /* skipBroadcast */);
        }
    } catch (e) {
        console.warn('[ItemArtCatalog] Failed to harvest local characters:', e);
    }
}

/**
 * Loads all catalog entries from IndexedDB into memory on application start,
 * and harvests existing local characters in Standalone/local storage.
 */
export async function initItemArtCatalog(): Promise<void> {
    if (isInitialized) return;
    try {
        const db = await getDB();
        await new Promise<void>((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const request = store.openCursor();

            request.onsuccess = (e) => {
                const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result;
                if (cursor) {
                    if (typeof cursor.key === 'string' && typeof cursor.value === 'string') {
                        memoryCatalog.set(cursor.key, cursor.value);
                    }
                    cursor.continue();
                } else {
                    resolve();
                }
            };

            request.onerror = () => reject(request.error);
        });

        isInitialized = true;
        notifyListeners();

        // Harvest any item art from existing local characters
        harvestLocalCharactersItemArt().catch(() => {});
    } catch (e) {
        console.warn('[ItemArtCatalog] Failed to load catalog from IndexedDB (falling back to memory):', e);
        isInitialized = true;
        harvestLocalCharactersItemArt().catch(() => {});
    }
}

/**
 * Synchronous lookup from the in-memory catalog.
 */
export function getItemArt(name: string | undefined | null): string | undefined {
    const key = normalizeItemName(name);
    if (!key) return undefined;
    return memoryCatalog.get(key);
}

/**
 * Saves a single item name -> image URL pair to memory, IndexedDB, and broadcasts to peers if shareable.
 */
export async function setItemArt(
    name: string | undefined | null,
    imageUrl: string | undefined | null,
    skipBroadcast = false
): Promise<void> {
    const key = normalizeItemName(name);
    if (!key || !isValidItemArtUrl(imageUrl)) return;

    const trimmedUrl = imageUrl.trim();
    if (memoryCatalog.get(key) === trimmedUrl) return;

    memoryCatalog.set(key, trimmedUrl);
    notifyListeners();

    // Async write to IndexedDB
    try {
        const db = await getDB();
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).put(trimmedUrl, key);
    } catch (e) {
        console.warn('[ItemArtCatalog] Failed to write item art to IndexedDB:', e);
    }

    // Broadcast to connected peers if in Owlbear Rodeo AND image is remotely shareable
    if (!skipBroadcast && OBR.isAvailable && !isStandaloneMode && isRemoteShareableUrl(trimmedUrl)) {
        try {
            OBR.broadcast
                .sendMessage(
                    `${EXTENSION_ID}/item-art-update`,
                    { name: key, imageUrl: trimmedUrl },
                    { destination: 'REMOTE' }
                )
                .catch(() => {});
        } catch {
            // Safe ignore if OBR broadcast unavailable
        }
    }
}

/**
 * Returns all currently known catalog entries (including local-img).
 */
export function getAllItemArt(): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [key, value] of memoryCatalog.entries()) {
        result[key] = value;
    }
    return result;
}

/**
 * Returns only catalog entries that are safe to share with remote peers.
 */
export function getRemoteShareableItemArt(): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [key, value] of memoryCatalog.entries()) {
        if (isRemoteShareableUrl(value)) {
            result[key] = value;
        }
    }
    return result;
}

/**
 * Merges multiple entries into the catalog (e.g. from an incoming sync broadcast or backup).
 */
export async function mergeItemArt(entries: Record<string, string>, skipBroadcast = true): Promise<void> {
    if (!entries || typeof entries !== 'object') return;

    let hasChanges = false;
    const toPersist: Array<{ key: string; url: string }> = [];

    for (const [rawKey, rawUrl] of Object.entries(entries)) {
        const key = normalizeItemName(rawKey);
        if (key && isValidItemArtUrl(rawUrl)) {
            const trimmedUrl = rawUrl.trim();
            if (memoryCatalog.get(key) !== trimmedUrl) {
                memoryCatalog.set(key, trimmedUrl);
                toPersist.push({ key, url: trimmedUrl });
                hasChanges = true;
            }
        }
    }

    if (!hasChanges) return;

    notifyListeners();

    try {
        const db = await getDB();
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        for (const item of toPersist) {
            store.put(item.url, item.key);
        }
    } catch (e) {
        console.warn('[ItemArtCatalog] Failed to batch persist entries to IndexedDB:', e);
    }

    if (!skipBroadcast && OBR.isAvailable && !isStandaloneMode) {
        const shareable = getRemoteShareableItemArt();
        if (Object.keys(shareable).length > 0) {
            try {
                OBR.broadcast
                    .sendMessage(`${EXTENSION_ID}/item-art-sync`, shareable, { destination: 'REMOTE' })
                    .catch(() => {});
            } catch {
                // Ignore
            }
        }
    }
}

/**
 * Scans tokens to harvest any item images already placed on map tokens.
 */
export async function harvestTokensItemArt(tokens: unknown[]): Promise<void> {
    if (!Array.isArray(tokens) || tokens.length === 0) return;

    const foundEntries: Record<string, string> = {};

    for (const token of tokens) {
        if (!token || typeof token !== 'object') continue;
        const itemObj = token as { metadata?: Record<string, unknown> };
        const meta =
            (itemObj.metadata?.['pokerole-extension/stats'] as Record<string, unknown>) ||
            (itemObj.metadata?.['pokerole-pmd-extension/stats'] as Record<string, unknown>) ||
            (itemObj.metadata?.['pokerole-pmd-extension/character-sheet'] as Record<string, unknown>);

        if (!meta) continue;

        let items: Array<{ name?: string; imageUrl?: string }> = [];
        const rawInv = meta['inv-data'];
        if (typeof rawInv === 'string') {
            try {
                const parsed = JSON.parse(rawInv);
                if (Array.isArray(parsed)) items = parsed;
            } catch {
                // Ignore parse errors
            }
        } else if (Array.isArray(meta.inventory)) {
            items = meta.inventory as Array<{ name?: string; imageUrl?: string }>;
        }

        for (const inv of items) {
            if (inv && inv.name && isValidItemArtUrl(inv.imageUrl)) {
                const key = normalizeItemName(inv.name);
                if (key) {
                    foundEntries[key] = inv.imageUrl.trim();
                }
            }
        }
    }

    if (Object.keys(foundEntries).length > 0) {
        await mergeItemArt(foundEntries, true /* skipBroadcast */);
    }
}

/**
 * React hook to reactively subscribe to the known artwork for an item name.
 */
export function useItemArt(name: string | undefined | null): string | undefined {
    const currentArt = getItemArt(name);
    const [art, setArt] = useState<string | undefined>(currentArt);

    useEffect(() => {
        setArt(getItemArt(name));
        return subscribeItemArtCatalog(() => {
            setArt(getItemArt(name));
        });
    }, [name]);

    return currentArt || art;
}
