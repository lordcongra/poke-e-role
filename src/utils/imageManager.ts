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

export const imageManager = {
    /**
     * Takes a raw File (from an <input type="file">), saves it to IndexedDB,
     * and returns a formatted ID string to save in the character's metadata.
     */
    async saveImage(file: File): Promise<string> {
        const id = crypto.randomUUID();
        const db = await getDB();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);

            const request = store.put(file, id);

            request.onsuccess = () => {
                // Prefix with local-img: so the sheet knows to fetch from IndexedDB instead of the web
                resolve(`local-img:${id}`);
            };
            request.onerror = () => reject(request.error);
        });
    },

    /**
     * Reads a formatted 'local-img:' ID, fetches the binary file from IndexedDB,
     * and creates a temporary blob:// URL for the browser to render.
     */
    async getImageUrl(formattedId: string): Promise<string | null> {
        if (!formattedId.startsWith('local-img:')) return formattedId; // It's just a normal web URL

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
     * Deletes an image from IndexedDB.
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
