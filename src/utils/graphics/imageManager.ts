import { useCharacterStore } from '@/store/useCharacterStore';
import { openIdbDatabase, runIdbTransaction } from '@/utils/sync/idbHelpers';
import { idbGetAllCharacters } from '@/utils/sync/standaloneIdb';

const DB_NAME = 'pkr_local_images';
const STORE_NAME = 'images';
const DB_VERSION = 1;

export const MAX_AUTO_CROP_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_AUTO_CROP_DIMENSION = 1024;

/**
 * Initializes the IndexedDB database for storing local character images.
 */
function getDB(): Promise<IDBDatabase> {
    return openIdbDatabase(DB_NAME, DB_VERSION, (db) => {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME);
        }
    });
}

/**
 * Reads an image file, detects the bounding box of non-transparent pixels,
 * and returns a cropped Blob.
 */
export async function autoCropTransparency(file: File, square = false): Promise<Blob> {
    if (file.size > MAX_AUTO_CROP_FILE_BYTES) {
        return file;
    }

    return new Promise((resolve) => {
        const img = new Image();
        const objectUrl = URL.createObjectURL(file);
        let revoked = false;
        const revokeObjectUrl = () => {
            if (!revoked) {
                revoked = true;
                URL.revokeObjectURL(objectUrl);
            }
        };

        img.onload = () => {
            try {
                const srcWidth = img.naturalWidth || img.width;
                const srcHeight = img.naturalHeight || img.height;
                if (!srcWidth || !srcHeight) {
                    return resolve(file);
                }

                const scale = Math.min(1, MAX_AUTO_CROP_DIMENSION / Math.max(srcWidth, srcHeight));
                const scanWidth = Math.max(1, Math.round(srcWidth * scale));
                const scanHeight = Math.max(1, Math.round(srcHeight * scale));

                const canvas = document.createElement('canvas');
                canvas.width = scanWidth;
                canvas.height = scanHeight;
                const ctx = canvas.getContext('2d');

                if (!ctx) return resolve(file);

                ctx.drawImage(img, 0, 0, scanWidth, scanHeight);
                const imageData = ctx.getImageData(0, 0, scanWidth, scanHeight);
                const data = imageData.data;

                let top: number | null = null;
                let bottom: number | null = null;
                let left: number | null = null;
                let right: number | null = null;

                // Scan every pixel to locate non-transparent content
                for (let y = 0; y < scanHeight; y++) {
                    for (let x = 0; x < scanWidth; x++) {
                        const alpha = data[(y * scanWidth + x) * 4 + 3];
                        if (alpha > 0) {
                            if (top === null) top = y;
                            bottom = y;
                            if (left === null || x < left) left = x;
                            if (right === null || x > right) right = x;
                        }
                    }
                }

                // If the image is fully transparent, fallback to the original file
                if (top === null || bottom === null || left === null || right === null) {
                    return resolve(file);
                }

                const width = right - left + 1;
                const height = bottom - top + 1;
                const padding = 10; // Safety margin around the sprite

                let cropWidth: number;
                let cropHeight: number;
                let destX: number;
                let destY: number;

                if (square) {
                    const maxDim = Math.max(width, height);
                    cropWidth = maxDim + padding * 2;
                    cropHeight = maxDim + padding * 2;
                    destX = padding + (maxDim - width) / 2;
                    destY = padding + (maxDim - height) / 2;
                } else {
                    cropWidth = width + padding * 2;
                    cropHeight = height + padding * 2;
                    destX = padding;
                    destY = padding;
                }

                const cropCanvas = document.createElement('canvas');
                cropCanvas.width = cropWidth;
                cropCanvas.height = cropHeight;
                const cropCtx = cropCanvas.getContext('2d');

                if (!cropCtx) return resolve(file);

                cropCtx.drawImage(canvas, left, top, width, height, destX, destY, width, height);

                cropCanvas.toBlob((blob) => {
                    if (blob) resolve(blob);
                    else resolve(file);
                }, file.type || 'image/png');
            } catch {
                resolve(file);
            } finally {
                revokeObjectUrl();
            }
        };

        img.onerror = () => {
            revokeObjectUrl();
            resolve(file);
        };

        img.src = objectUrl;
    });
}

export const imageManager = {
    /**
     * Saves a binary image file to IndexedDB and returns a 'local-img:' identifier string.
     */
    async saveImage(file: File): Promise<string> {
        const id = crypto.randomUUID();
        const db = await getDB();

        await runIdbTransaction(db, STORE_NAME, 'readwrite', (tx) => {
            tx.objectStore(STORE_NAME).put(file, id);
        });
        return `local-img:${id}`;
    },

    /**
     * Reads a 'local-img:' ID, fetches the binary file from IndexedDB,
     * and creates a temporary blob URL for the browser to render.
     */
    async getImageUrl(formattedId: string): Promise<string | null> {
        if (!formattedId.startsWith('local-img:')) return formattedId;

        const id = formattedId.replace('local-img:', '');
        const db = await getDB();

        const blob = await runIdbTransaction(
            db,
            STORE_NAME,
            'readonly',
            (tx) => tx.objectStore(STORE_NAME).get(id) as IDBRequest<Blob | undefined>
        );
        return blob ? URL.createObjectURL(blob) : null;
    },

    /**
     * Deletes an image record from IndexedDB.
     * Safely verifies if any other character in IndexedDB or PC storage still references this image
     * before deleting it, preventing accidental deletions across duplicated or shared characters.
     */
    async deleteImage(formattedId: string, excludeCharacterId?: string): Promise<void> {
        if (!formattedId.startsWith('local-img:')) return;

        try {
            const characters = await idbGetAllCharacters();
            for (const char of characters) {
                if (excludeCharacterId && char.id === excludeCharacterId) {
                    continue;
                }
                const serialized = JSON.stringify(char.metadata ?? {});
                if (serialized.includes(formattedId)) {
                    // Image is still in use by another character in IndexedDB!
                    return;
                }
            }
        } catch (e) {
            console.warn('[imageManager] Failed to check image references in IndexedDB:', e);
        }

        try {
            const pcData = useCharacterStore.getState().pcData;
            if (pcData) {
                if (pcData.pokemonSummaries) {
                    for (const summary of Object.values(pcData.pokemonSummaries)) {
                        if (summary?.tokenImageUrl === formattedId) {
                            return;
                        }
                    }
                }
                if (pcData.campaigns) {
                    for (const camp of Object.values(pcData.campaigns)) {
                        if ((camp as { avatarUrl?: string })?.avatarUrl === formattedId) {
                            return;
                        }
                        if (camp?.trainers) {
                            for (const trainer of Object.values(camp.trainers)) {
                                if (trainer?.avatarUrl === formattedId) {
                                    return;
                                }
                            }
                        }
                    }
                }
            }
        } catch (e) {
            console.warn('[imageManager] Failed to check PC storage image references:', e);
        }

        const id = formattedId.replace('local-img:', '');
        const db = await getDB();

        await runIdbTransaction(db, STORE_NAME, 'readwrite', (tx) => {
            tx.objectStore(STORE_NAME).delete(id);
        });
    }
};
