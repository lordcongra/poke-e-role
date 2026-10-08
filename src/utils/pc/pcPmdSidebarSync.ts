import { storageAdapter, type LocalFolder, isStandaloneMode } from '../sync/storageAdapter';
import type { PcBox } from '../../types/pcStorageTypes';
import { isTrainerMetadata } from './pcSidebarSync';
import { findAndLinkLocalCharacter } from './pcSidebarFolderMatching';
import { useCharacterStore } from '../../store/useCharacterStore';

/**
 * Checks if a folder name represents the PMD Active Team folder.
 */
export function isActiveTeamFolderName(name: string): boolean {
    const lower = name.trim().toLowerCase();
    return lower === 'active team' || lower === 'team' || lower === 'rescue team' || lower === 'exploration team';
}

/**
 * Gets or creates the root "Active Team" folder in PMD / No-Trainer mode.
 */
export async function getOrCreateActiveTeamFolder(): Promise<LocalFolder> {
    const folders = await storageAdapter.getFolders();
    const existing = folders.find((f) => !f.parentId && isActiveTeamFolderName(f.name));
    if (existing) return existing;

    const newId = await storageAdapter.createFolder('Active Team', null);
    return { id: newId, name: 'Active Team', parentId: null };
}

/**
 * Gets or creates a root Box / Assembly folder in PMD / No-Trainer mode.
 */
export async function getOrCreateRootBoxFolder(boxName: string): Promise<LocalFolder> {
    const folders = await storageAdapter.getFolders();
    const cleanBoxName = boxName.trim();
    const existing = folders.find((f) => !f.parentId && f.name.trim().toLowerCase() === cleanBoxName.toLowerCase());
    if (existing) return existing;

    const newId = await storageAdapter.createFolder(cleanBoxName, null);
    return { id: newId, name: cleanBoxName, parentId: null };
}

/**
 * Organizes the Standalone Sidebar for a PMD / No-Trainer campaign:
 * - Creates an "Active Team" root folder and moves active team members into it.
 * - Creates root Box folders for occupied PC boxes and moves stored Pokémon into them.
 */
export async function organizePmdSidebarFolders(
    teamParty: (string | null)[],
    boxes: PcBox[]
): Promise<{ success: boolean; createdBelt: boolean; createdBoxes: number; movedPokemonCount: number }> {
    if (!isStandaloneMode) {
        return { success: false, createdBelt: false, createdBoxes: 0, movedPokemonCount: 0 };
    }

    try {
        const localChars = await storageAdapter.getLocalCharacters();
        const existingFolders = await storageAdapter.getFolders();

        let createdBelt = false;
        let teamFolder = existingFolders.find((f) => !f.parentId && isActiveTeamFolderName(f.name));
        if (!teamFolder) {
            const bId = await storageAdapter.createFolder('Active Team', null);
            teamFolder = { id: bId, name: 'Active Team', parentId: null };
            createdBelt = true;
        }

        let movedPokemonCount = 0;
        let createdBoxes = 0;

        const summaries = useCharacterStore.getState().pcData.pokemonSummaries || {};
        const { ensureSidebarPokemonSheet } = await import('./pcSidebarGenerator');

        // Move active team members into the "Active Team" folder (auto-creating missing sheets)
        const partyIds = teamParty.filter(Boolean) as string[];
        for (const pId of partyIds) {
            let charMatch = await findAndLinkLocalCharacter(pId, localChars, summaries);
            if (!charMatch && summaries[pId]) {
                charMatch = await ensureSidebarPokemonSheet(pId, summaries[pId], teamFolder.id, localChars);
            }
            if (charMatch && !isTrainerMetadata(charMatch.metadata) && charMatch.parentId !== teamFolder.id) {
                await storageAdapter.moveItem(charMatch.id, teamFolder.id);
                charMatch.parentId = teamFolder.id;
                movedPokemonCount++;
            }
        }

        // Create Box folders at root level and move stored Pokémon (auto-creating missing sheets)
        for (let i = 0; i < boxes.length; i++) {
            const box = boxes[i];
            const storedSlotIds = (box.slots || []).filter(Boolean) as string[];
            if (storedSlotIds.length === 0 && i > 0) {
                continue;
            }

            const boxName = box.name || `Box ${i + 1}`;
            let boxFolder = existingFolders.find(
                (f) => !f.parentId && f.name.trim().toLowerCase() === boxName.trim().toLowerCase()
            );

            if (!boxFolder) {
                const bId = await storageAdapter.createFolder(boxName, null);
                boxFolder = { id: bId, name: boxName, parentId: null };
                createdBoxes++;
            }

            for (const sId of storedSlotIds) {
                let charMatch = await findAndLinkLocalCharacter(sId, localChars, summaries);
                if (!charMatch && summaries[sId]) {
                    charMatch = await ensureSidebarPokemonSheet(sId, summaries[sId], boxFolder.id, localChars);
                }
                if (charMatch && !isTrainerMetadata(charMatch.metadata) && charMatch.parentId !== boxFolder.id) {
                    await storageAdapter.moveItem(charMatch.id, boxFolder.id);
                    charMatch.parentId = boxFolder.id;
                    movedPokemonCount++;
                }
            }
        }

        return { success: true, createdBelt, createdBoxes, movedPokemonCount };
    } catch (e) {
        console.error('[pcPmdSidebarSync] Failed to organize PMD folders:', e);
        return { success: false, createdBelt: false, createdBoxes: 0, movedPokemonCount: 0 };
    }
}

/**
 * Automatically relocates a Pokémon sheet in PMD / No-Trainer mode when moved
 * between the Active Team and PC Storage Boxes.
 */
export async function relocatePmdSidebarPokemon(
    pokemonId: string,
    target: { type: 'party' } | { type: 'box'; boxIndex: number; boxName: string }
): Promise<void> {
    if (!isStandaloneMode || !pokemonId) return;

    try {
        const localChars = await storageAdapter.getLocalCharacters();
        const summaries = useCharacterStore.getState().pcData.pokemonSummaries || {};
        const charMatch = await findAndLinkLocalCharacter(pokemonId, localChars, summaries);
        if (!charMatch || isTrainerMetadata(charMatch.metadata)) return;

        if (target.type === 'party') {
            const teamFolder = await getOrCreateActiveTeamFolder();
            if (charMatch.parentId !== teamFolder.id) {
                await storageAdapter.moveItem(charMatch.id, teamFolder.id);
                window.dispatchEvent(new Event('pkr-local-data-changed'));
            }
        } else {
            const boxFolder = await getOrCreateRootBoxFolder(target.boxName);
            if (charMatch.parentId !== boxFolder.id) {
                await storageAdapter.moveItem(charMatch.id, boxFolder.id);
                window.dispatchEvent(new Event('pkr-local-data-changed'));
            }
        }
    } catch (e) {
        console.warn('[pcPmdSidebarSync] Failed to relocate PMD sidebar character:', e);
    }
}
