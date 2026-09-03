const DB_NAME = 'pkr_local_images';
const STORE_NAME = 'images';
const DB_VERSION = 1;

/**
 * Initializes the IndexedDB database for storing local character images.
 */
function getDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
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
 * Reads an image file, detects the bounding box of non-transparent pixels,
 * and returns a cropped Blob.
 */
export async function autoCropTransparency(file: File, square = false): Promise<Blob> {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = URL.createObjectURL(file);

        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');

            if (!ctx) return resolve(file);

            ctx.drawImage(img, 0, 0);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;

            let top: number | null = null;
            let bottom: number | null = null;
            let left: number | null = null;
            let right: number | null = null;

            // Scan every pixel to locate non-transparent content
            for (let y = 0; y < canvas.height; y++) {
                for (let x = 0; x < canvas.width; x++) {
                    const alpha = data[(y * canvas.width + x) * 4 + 3];
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
        };

        img.onerror = () => resolve(file);
    });
}

export const imageManager = {
    /**
     * Saves a binary image file to IndexedDB and returns a 'local-img:' identifier string.
     */
    async saveImage(file: File): Promise<string> {
        const id = crypto.randomUUID();
        const db = await getDB();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.put(file, id);

            request.onsuccess = () => {
                resolve(`local-img:${id}`);
            };
            request.onerror = () => reject(request.error);
        });
    },

    /**
     * Reads a 'local-img:' ID, fetches the binary file from IndexedDB,
     * and creates a temporary blob URL for the browser to render.
     */
    async getImageUrl(formattedId: string): Promise<string | null> {
        if (!formattedId.startsWith('local-img:')) return formattedId;

        const id = formattedId.replace('local-img:', '');
        const db = await getDB();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.get(id);

            request.onsuccess = () => {
                if (request.result) {
                    const blobUrl = URL.createObjectURL(request.result as Blob);
                    resolve(blobUrl);
                } else {
                    resolve(null);
                }
            };
            request.onerror = () => reject(request.error);
        });
    },

    /**
     * Deletes an image record from IndexedDB.
     */
    async deleteImage(formattedId: string): Promise<void> {
        if (!formattedId.startsWith('local-img:')) return;

        const id = formattedId.replace('local-img:', '');
        const db = await getDB();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.delete(id);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }
};
