import OBR from '@owlbear-rodeo/sdk';
import { waitForObr } from './obrHelpers';

// Automatically dictates mode based on our .env variables
export const isStandaloneMode = import.meta.env.VITE_APP_MODE === 'standalone';

// The namespace prefix for all local storage keys to prevent collisions
export const LOCAL_STORAGE_PREFIX = 'pkr_char_';

export const storageAdapter = {
    /**
     * Saves flattened metadata updates to either Local Storage or Owlbear Rodeo.
     */
    async saveCharacter(id: string, updates: Record<string, unknown>, metadataId: string): Promise<void> {
        if (isStandaloneMode) {
            try {
                const existingStr = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}${id}`);
                const existing = existingStr ? JSON.parse(existingStr) : {};
                const merged = { ...existing, ...updates };
                localStorage.setItem(`${LOCAL_STORAGE_PREFIX}${id}`, JSON.stringify(merged));
            } catch (error) {
                console.error('[storageAdapter] Failed to save character to localStorage', error);
                throw error;
            }
        } else {
            try {
                await waitForObr();
                await OBR.scene.items.updateItems([id], (items) => {
                    for (const item of items) {
                        if (!item.metadata[metadataId]) item.metadata[metadataId] = {};
                        Object.assign(item.metadata[metadataId] as Record<string, unknown>, updates);
                    }
                });
            } catch (error) {
                console.error('[storageAdapter] Failed to securely save to Owlbear Rodeo.', error);
                throw error;
            }
        }
    },

    /**
     * Retrieves a list of all locally saved characters for the Main Menu.
     */
    async getLocalCharacters(): Promise<{ id: string; name: string; metadata: Record<string, unknown> }[]> {
        const characters = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(LOCAL_STORAGE_PREFIX)) {
                try {
                    const metadataStr = localStorage.getItem(key);
                    const metadata = metadataStr ? JSON.parse(metadataStr) : {};
                    characters.push({
                        id: key.replace(LOCAL_STORAGE_PREFIX, ''),
                        name: String(metadata.nickname || metadata.species || 'Unknown Character'),
                        metadata
                    });
                } catch (e) {
                    console.error('[storageAdapter] Skipped corrupt local character data', e);
                }
            }
        }
        return characters;
    },

    /**
     * Instantiates a fresh character sheet in local storage.
     */
    async createLocalCharacter(name: string): Promise<string> {
        const newId = crypto.randomUUID();
        const initialMetadata = { 
            nickname: name, 
            'v2-migrated': true // Instantly mark as v2 to prevent legacy migration scripts from firing
        };
        
        try {
            localStorage.setItem(`${LOCAL_STORAGE_PREFIX}${newId}`, JSON.stringify(initialMetadata));
        } catch (error) {
            console.error('[storageAdapter] Failed to create new character', error);
        }
        return newId;
    },

    /**
     * Wipes a character from local storage.
     */
    async deleteLocalCharacter(id: string): Promise<void> {
        try {
            localStorage.removeItem(`${LOCAL_STORAGE_PREFIX}${id}`);
        } catch (error) {
            console.error('[storageAdapter] Failed to delete character', error);
        }
    }
};