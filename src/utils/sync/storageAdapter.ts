import OBR from '@owlbear-rodeo/sdk';
import { waitForObr } from '@/utils/sync/obrHelpers';
import { CombatStat, SocialStat, Skill } from '@/types/enums';
import { setItemArt } from '@/utils/graphics/itemArtCatalog';
import { parseOptionalFiniteNumber } from '@/utils/sync/mappers/mapperHelpers';
import { METADATA_ID } from '@/hooks/owlbearSync/owlbearSyncConstants';
import {
    MIGRATION_FLAG_KEY,
    idbGetAllCharacters,
    idbGetCharacter,
    idbPutCharacter,
    idbDeleteCharacter,
    idbGetAllFolders,
    idbPutFolder,
    idbDeleteFolder,
    idbOverwriteAll
} from '@/utils/sync/standaloneIdb';

export const isStandaloneMode = window.self === window.top;

export const LOCAL_STORAGE_PREFIX = 'pkr_char_';
export const FOLDER_STORAGE_KEY = 'pkr_folders';

export const BACKUP_TIMESTAMP_KEY = 'pkr_last_master_backup_time';
export const CHANGE_TIMESTAMP_KEY = 'pkr_last_local_change_time';
export const BACKUP_STATUS_EVENT = 'pkr-backup-status-changed';

export interface LocalFolder {
    id: string;
    name: string;
    parentId: string | null;
}

export interface LocalCharacter {
    id: string;
    name: string;
    parentId: string | null;
    metadata: Record<string, unknown>;
}

/**
 * Validates whether an update contains permanent sheet changes that warrant a backup prompt.
 * Only base stats, limits, rank, skills, moves, and bag inventory items are tracked.
 * Combat buffs, debuffs, HP/Will tracking, and in-combat transient stats are explicitly ignored.
 */
export function isTrackedBackupChange(updates: Record<string, unknown>, existing?: Record<string, unknown>): boolean {
    const trackedDirectKeys = new Set([
        'moves-data',
        'moves-wishlist-data',
        'skill-checks-data',
        'inv-data',
        'passives-data',
        'extra-skills-data',
        'extra-core',
        'extra-social',
        'extra-skill',
        'hp-base',
        'will-base',
        'rank',
        'identity-rank',
        'pokedex-data'
    ]);

    const combatStats = Object.values(CombatStat);
    const socialStats = Object.values(SocialStat);
    const allStats = [...combatStats, ...socialStats];
    const officialSkills = Object.values(Skill);

    for (const [key, val] of Object.entries(updates)) {
        let isTracked = false;

        if (trackedDirectKeys.has(key)) {
            isTracked = true;
        } else {
            // Check stat base, rank, or limit/max (buffs/debuffs explicitly ignored)
            for (const stat of allStats) {
                if (
                    key === `${stat}-base` ||
                    key === `${stat}-rank` ||
                    key === `${stat}-limit` ||
                    key === `${stat}-max`
                ) {
                    isTracked = true;
                    break;
                }
            }

            if (!isTracked) {
                // Check official skills base or custom label (buffs ignored)
                for (const skill of officialSkills) {
                    if (key === `${skill}-base` || key === `label-${skill}`) {
                        isTracked = true;
                        break;
                    }
                }
            }
        }

        if (isTracked) {
            // If existing is present, verify whether the value ACTUALLY changed!
            if (existing) {
                const prev = existing[key];
                // Ignore if value is unchanged
                if (String(prev ?? '') === String(val ?? '')) {
                    continue;
                }
            }
            return true;
        }
    }

    return false;
}

export const markDataChanged = () => {
    if (isStandaloneMode) {
        try {
            localStorage.setItem(CHANGE_TIMESTAMP_KEY, Date.now().toString());
            window.dispatchEvent(new Event(BACKUP_STATUS_EVENT));
        } catch (e) {
            console.error('[storageAdapter] Failed to mark local data changed', e);
        }
    }
};

export const markBackupComplete = () => {
    if (isStandaloneMode) {
        try {
            localStorage.setItem(BACKUP_TIMESTAMP_KEY, Date.now().toString());
            window.dispatchEvent(new Event(BACKUP_STATUS_EVENT));
        } catch (e) {
            console.error('[storageAdapter] Failed to mark backup complete', e);
        }
    }
};

export const hasUnbackedData = (characterCount: number, folderCount: number): boolean => {
    if (!isStandaloneMode) return false;
    if (characterCount === 0 && folderCount === 0) return false;

    try {
        const lastBackupStr = localStorage.getItem(BACKUP_TIMESTAMP_KEY);
        if (!lastBackupStr) {
            // Data exists in directory, but no backup was ever performed
            return true;
        }
        const lastBackup = parseOptionalFiniteNumber(lastBackupStr);
        if (lastBackup === undefined) {
            return true;
        }
        const lastChangeStr = localStorage.getItem(CHANGE_TIMESTAMP_KEY);
        if (!lastChangeStr) {
            return false;
        }
        const lastChange = parseOptionalFiniteNumber(lastChangeStr);
        if (lastChange === undefined) {
            return false;
        }
        return lastChange > lastBackup;
    } catch (e) {
        console.error('[storageAdapter] Error checking unbacked data status', e);
        return false;
    }
};

// Emits an event so the Sidebar instantly updates when data changes!
const notifyChange = () => {
    if (isStandaloneMode) {
        window.dispatchEvent(new Event('pkr-local-data-changed'));
    }
};

export const storageAdapter = {
    async saveCharacter(id: string, updates: Record<string, unknown>, _metadataId: string): Promise<void> {
        if (isStandaloneMode) {
            try {
                const existingChar = await idbGetCharacter(id);
                const existingMeta: Record<string, unknown> = (existingChar?.metadata as Record<string, unknown>) || {};

                const merged = { ...existingMeta, ...updates };
                const nickname = merged.nickname ? String(merged.nickname).trim() : '';
                const species = merged.species ? String(merged.species).trim() : '';
                const charName = nickname || species || existingChar?.name || 'Unnamed Character';
                const parentId =
                    (merged.parentId !== undefined
                        ? (merged.parentId as string | null)
                        : (existingChar?.parentId ?? null)) ?? null;

                const updatedChar: LocalCharacter = {
                    id,
                    name: charName,
                    parentId,
                    metadata: merged
                };

                await idbPutCharacter(updatedChar);

                if (isTrackedBackupChange(updates, existingMeta)) {
                    markDataChanged();
                }
                notifyChange();

                // Passively harvest any inventory artwork updates into the catalog
                if (updates['inv-data']) {
                    try {
                        const rawInv = updates['inv-data'];
                        const items = typeof rawInv === 'string' ? JSON.parse(rawInv) : rawInv;
                        if (Array.isArray(items)) {
                            for (const it of items) {
                                if (it && it.name && it.imageUrl && it.imageUrl !== 'none') {
                                    setItemArt(it.name, it.imageUrl);
                                }
                            }
                        }
                    } catch {
                        // Ignore malformed inventory payloads during art harvesting
                    }
                }
            } catch (error) {
                console.error('[storageAdapter] Failed to save character', error);
                throw error;
            }
        } else {
            try {
                await waitForObr();
                const now = Date.now();
                const safeUpdates = {
                    ...updates,
                    lastModified: updates.lastModified || now
                };
                await OBR.scene.items.updateItems([id], (items) => {
                    for (const item of items) {
                        if (!item.metadata[METADATA_ID]) {
                            const legacy = item.metadata['pokerole-pmd-extension/stats'];
                            item.metadata[METADATA_ID] =
                                legacy && typeof legacy === 'object' ? { ...(legacy as Record<string, unknown>) } : {};
                        }
                        Object.assign(item.metadata[METADATA_ID] as Record<string, unknown>, safeUpdates);
                    }
                });
            } catch (error) {
                console.error('[storageAdapter] Failed to securely save to Owlbear Rodeo.', error);
                throw error;
            }
        }
    },

    async getLocalCharacters(): Promise<
        { id: string; name: string; parentId: string | null; metadata: Record<string, unknown> }[]
    > {
        try {
            return await idbGetAllCharacters();
        } catch (e) {
            console.error('[storageAdapter] IndexedDB getLocalCharacters failed:', e);
            return [];
        }
    },

    async createLocalCharacter(name: string, parentId: string | null = null): Promise<string> {
        const newId = crypto.randomUUID();
        const initialMetadata = {
            nickname: name.trim(),
            parentId: parentId,
            rank: 'Starter',
            'v2-migrated': true
        };

        const newChar: LocalCharacter = {
            id: newId,
            name: name.trim(),
            parentId,
            metadata: initialMetadata
        };

        try {
            await idbPutCharacter(newChar);
            markDataChanged();
            notifyChange();
        } catch (error) {
            console.error('[storageAdapter] Failed to create new character', error);
            throw error;
        }
        return newId;
    },

    async deleteLocalCharacter(id: string): Promise<void> {
        try {
            await idbDeleteCharacter(id);

            const chars = await this.getLocalCharacters();
            for (const char of chars) {
                if (char.parentId === id) await this.moveItem(char.id, null);
            }
            const folders = await this.getFolders();
            for (const f of folders) {
                if (f.parentId === id) await this.moveFolder(f.id, null);
            }
            markDataChanged();
            notifyChange();
        } catch (error) {
            console.error('[storageAdapter] Failed to delete character', error);
            throw error;
        }
    },

    async moveItem(id: string, parentId: string | null): Promise<void> {
        try {
            const char = await idbGetCharacter(id);
            if (char) {
                char.parentId = parentId;
                if (char.metadata) {
                    char.metadata.parentId = parentId;
                }
                await idbPutCharacter(char);
                markDataChanged();
                notifyChange();
            }
        } catch (error) {
            console.error('[storageAdapter] Failed to move character', error);
            throw error;
        }
    },

    async getFolders(): Promise<LocalFolder[]> {
        try {
            return await idbGetAllFolders();
        } catch (e) {
            console.error('[storageAdapter] IndexedDB getFolders failed:', e);
            return [];
        }
    },

    async createFolder(name: string, parentId: string | null = null): Promise<string> {
        const newFolder: LocalFolder = { id: crypto.randomUUID(), name, parentId };
        try {
            await idbPutFolder(newFolder);
            markDataChanged();
            notifyChange();
        } catch (error) {
            console.error('[storageAdapter] Failed to save new folder', error);
            throw error;
        }
        return newFolder.id;
    },

    async moveFolder(folderId: string, newParentId: string | null): Promise<void> {
        const folders = await this.getFolders();
        const target = folders.find((f) => f.id === folderId);
        if (target) {
            target.parentId = newParentId;
            await idbPutFolder(target);
            markDataChanged();
            notifyChange();
        }
    },

    async renameFolder(id: string, newName: string): Promise<void> {
        const folders = await this.getFolders();
        const target = folders.find((f) => f.id === id);
        if (target) {
            target.name = newName.trim();
            await idbPutFolder(target);
            markDataChanged();
            notifyChange();
        }
    },

    async deleteFolder(id: string): Promise<void> {
        try {
            const folders = await this.getFolders();
            await idbDeleteFolder(id);

            const chars = await this.getLocalCharacters();
            for (const char of chars) {
                if (char.parentId === id) await this.moveItem(char.id, null);
            }
            for (const f of folders) {
                if (f.id !== id && f.parentId === id) await this.moveFolder(f.id, null);
            }
            markDataChanged();
            notifyChange();
        } catch (error) {
            console.error('[storageAdapter] Failed to delete folder', error);
            throw error;
        }
    },

    async overwriteAll(characters: LocalCharacter[], folders: LocalFolder[]): Promise<void> {
        try {
            await idbOverwriteAll(characters, folders);
            if (typeof window !== 'undefined' && window.localStorage) {
                try {
                    const keysToRemove: string[] = [];
                    for (let i = 0; i < localStorage.length; i++) {
                        const key = localStorage.key(i);
                        if (key && (key.startsWith(LOCAL_STORAGE_PREFIX) || key === FOLDER_STORAGE_KEY)) {
                            keysToRemove.push(key);
                        }
                    }
                    for (const key of keysToRemove) {
                        localStorage.removeItem(key);
                    }
                    localStorage.setItem(MIGRATION_FLAG_KEY, 'true');
                } catch (e) {
                    console.warn('[storageAdapter] Failed to purge legacy localStorage keys during overwriteAll:', e);
                }
            }
            markBackupComplete();
            notifyChange();
        } catch (error) {
            console.error('[storageAdapter] Failed to overwrite all characters/folders in IDB:', error);
            throw error;
        }
    }
};
