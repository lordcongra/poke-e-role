import OBR from '@owlbear-rodeo/sdk';
import { waitForObr } from './obrHelpers';

// Automatically detects if we are running as a top-level web app vs. inside an Owlbear iframe!
export const isStandaloneMode = window.self === window.top;

// The namespace prefix for all local storage keys to prevent collisions
export const LOCAL_STORAGE_PREFIX = 'pkr_char_';
export const FOLDER_STORAGE_KEY = 'pkr_folders';

export interface LocalFolder {
    id: string;
    name: string;
    parentId: string | null;
}

export const storageAdapter = {
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

    async getLocalCharacters(): Promise<{ id: string; name: string; parentId: string | null; metadata: Record<string, unknown> }[]> {
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
                        parentId: metadata.parentId ? String(metadata.parentId) : null,
                        metadata
                    });
                } catch (e) {
                    console.error('[storageAdapter] Skipped corrupt local character data', e);
                }
            }
        }
        return characters;
    },

    async createLocalCharacter(name: string, parentId: string | null = null): Promise<string> {
        const newId = crypto.randomUUID();
        const initialMetadata = { 
            nickname: name, 
            parentId: parentId,
            'v2-migrated': true
        };
        
        try {
            localStorage.setItem(`${LOCAL_STORAGE_PREFIX}${newId}`, JSON.stringify(initialMetadata));
        } catch (error) {
            console.error('[storageAdapter] Failed to create new character', error);
        }
        return newId;
    },

    async deleteLocalCharacter(id: string): Promise<void> {
        try {
            localStorage.removeItem(`${LOCAL_STORAGE_PREFIX}${id}`);
            // Move any children to root to prevent orphan data lock
            const chars = await this.getLocalCharacters();
            for (const char of chars) {
                if (char.parentId === id) await this.moveItem(char.id, null);
            }
            const folders = await this.getFolders();
            for (const f of folders) {
                if (f.parentId === id) await this.moveFolder(f.id, null);
            }
        } catch (error) {
            console.error('[storageAdapter] Failed to delete character', error);
        }
    },

    async moveItem(id: string, parentId: string | null): Promise<void> {
        try {
            const existingStr = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}${id}`);
            if (existingStr) {
                const existing = JSON.parse(existingStr);
                existing.parentId = parentId;
                localStorage.setItem(`${LOCAL_STORAGE_PREFIX}${id}`, JSON.stringify(existing));
            }
        } catch (error) {
            console.error('[storageAdapter] Failed to move character', error);
        }
    },

    // ==========================================
    // FOLDER MANAGEMENT
    // ==========================================

    async getFolders(): Promise<LocalFolder[]> {
        try {
            const str = localStorage.getItem(FOLDER_STORAGE_KEY);
            return str ? JSON.parse(str) : [];
        } catch (error) {
            console.error('[storageAdapter] Failed to parse folders', error);
            return [];
        }
    },

    async createFolder(name: string, parentId: string | null = null): Promise<string> {
        const folders = await this.getFolders();
        const newFolder: LocalFolder = { id: crypto.randomUUID(), name, parentId };
        folders.push(newFolder);
        try {
            localStorage.setItem(FOLDER_STORAGE_KEY, JSON.stringify(folders));
        } catch (error) {
            console.error('[storageAdapter] Failed to save new folder', error);
        }
        return newFolder.id;
    },

    async moveFolder(folderId: string, newParentId: string | null): Promise<void> {
        const folders = await this.getFolders();
        const target = folders.find(f => f.id === folderId);
        if (target) {
            target.parentId = newParentId;
            localStorage.setItem(FOLDER_STORAGE_KEY, JSON.stringify(folders));
        }
    },

    async deleteFolder(id: string): Promise<void> {
        const folders = await this.getFolders();
        const filtered = folders.filter(f => f.id !== id);
        try {
            localStorage.setItem(FOLDER_STORAGE_KEY, JSON.stringify(filtered));
            
            // Orphans to Root
            const chars = await this.getLocalCharacters();
            for (const char of chars) {
                if (char.parentId === id) await this.moveItem(char.id, null);
            }
            for (const f of folders) {
                if (f.parentId === id) await this.moveFolder(f.id, null);
            }
        } catch (error) {
            console.error('[storageAdapter] Failed to delete folder', error);
        }
    }
};