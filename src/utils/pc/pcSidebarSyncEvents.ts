import { storageAdapter, isStandaloneMode } from '../sync/storageAdapter';
import type { PcStorageData } from '../../types/pcStorageTypes';
import { useCharacterStore } from '../../store/useCharacterStore';
import { savePcStorage } from './pcStorageAdapter';
import { isTrainerMetadata, isBeltFolderName } from './pcSidebarSync';

/**
 * Synchronizes a nickname update to the corresponding Pokémon character in the Standalone Sidebar.
 */
export async function syncPokemonNicknameToSidebar(pokemonId: string, newNickname: string): Promise<void> {
    if (!isStandaloneMode || !pokemonId || !newNickname.trim()) return;

    try {
        const localChars = await storageAdapter.getLocalCharacters();
        const match = localChars.find((c) => c.id === pokemonId || c.metadata?.entityId === pokemonId);
        if (match) {
            await storageAdapter.saveCharacter(
                match.id,
                { nickname: newNickname.trim() },
                'pokerole-pmd-extension/stats'
            );
        }
    } catch (e) {
        console.warn('[pcSidebarSyncEvents] Failed to sync nickname to sidebar character:', e);
    }
}

/**
 * Synchronizes a character rename from the Sidebar to the PC Storage data.
 */
export async function syncSidebarCharacterRenameToPc(
    characterId: string,
    newNickname: string,
    pcData: PcStorageData
): Promise<boolean> {
    if (!isStandaloneMode) return false;

    try {
        const summary = pcData.pokemonSummaries[characterId];
        if (summary && summary.name !== newNickname.trim()) {
            const nextSummaries = {
                ...pcData.pokemonSummaries,
                [characterId]: {
                    ...summary,
                    name: newNickname.trim(),
                    fullMetadata: {
                        ...summary.fullMetadata,
                        nickname: newNickname.trim()
                    }
                }
            };
            const nextData = { ...pcData, pokemonSummaries: nextSummaries };
            useCharacterStore.setState({ pcData: nextData });
            await savePcStorage(nextData);
            return true;
        }
        return false;
    } catch (e) {
        console.warn('[pcSidebarSyncEvents] Failed to sync sidebar rename to PC summary:', e);
        return false;
    }
}

/**
 * Synchronizes a drag-and-drop move in the Standalone Sidebar to the PC Storage system.
 * If moved into a "Belt" folder under a Trainer, adds to the Trainer's party.
 * If moved into a Box folder under a Trainer, deposits into that Box.
 */
export async function syncSidebarMoveToPc(
    characterId: string,
    targetFolderId: string | null,
    pcData: PcStorageData
): Promise<void> {
    if (!isStandaloneMode || !characterId || !targetFolderId) return;

    try {
        const folders = await storageAdapter.getFolders();
        const targetFolder = folders.find((f) => f.id === targetFolderId);
        if (!targetFolder || !targetFolder.parentId) return;

        const localChars = await storageAdapter.getLocalCharacters();
        const parentTrainer = localChars.find((c) => c.id === targetFolder.parentId && isTrainerMetadata(c.metadata));
        if (!parentTrainer) return;

        const camp = pcData.campaigns[pcData.activeCampaignId];
        if (!camp) return;

        const trainerRoster = Object.values(camp.trainers).find(
            (t) =>
                t.id === parentTrainer.id ||
                t.savedTokenItem?.id === parentTrainer.id ||
                t.mapTokenId === parentTrainer.id ||
                t.name.trim().toLowerCase() === parentTrainer.name.trim().toLowerCase()
        );
        if (!trainerRoster) return;

        if (isBeltFolderName(targetFolder.name)) {
            if (!trainerRoster.party.includes(characterId)) {
                useCharacterStore.getState().movePokemonToParty(characterId);
            }
        } else {
            const boxes = trainerRoster.boxes && trainerRoster.boxes.length > 0 ? trainerRoster.boxes : camp.boxes;
            const boxIndex = boxes.findIndex(
                (b) => b.name.trim().toLowerCase() === targetFolder.name.trim().toLowerCase()
            );
            if (boxIndex !== -1 && !boxes[boxIndex].slots.includes(characterId)) {
                useCharacterStore.getState().depositPokemonToBox(characterId, boxIndex);
            }
        }
    } catch (e) {
        console.warn('[pcSidebarSyncEvents] Failed to sync sidebar move to PC:', e);
    }
}
