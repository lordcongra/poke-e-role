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

function ensurePokemonSummaryInPc(characterId: string, trainerId?: string): void {
    const pcData = useCharacterStore.getState().pcData;
    if (pcData.pokemonSummaries[characterId]) return;

    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
        const raw = window.localStorage.getItem(`pkr_char_${characterId}`);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (!parsed) return;

        const newSummary = {
            entityId: characterId,
            trainerId,
            name: parsed.nickname || parsed.species || parsed.name || 'Pokémon',
            species: parsed.species || parsed.name || 'Unknown',
            rank: parsed.rank || 'Starter',
            type1: parsed.type1 || 'Normal',
            type2: parsed.type2,
            hp: Number(parsed['hp-curr']) || Number(parsed.hp) || 10,
            maxHp: Number(parsed['hp-max-display']) || Number(parsed.hpMax) || 10,
            will: Number(parsed['will-curr']) || Number(parsed.will) || 5,
            maxWill: Number(parsed['will-max-display']) || Number(parsed.willMax) || 5,
            tokenImageUrl: parsed['token-image-url'] || parsed.tokenImageUrl,
            isOnMap: false,
            fullMetadata: parsed,
            lastModified: Date.now()
        };
        useCharacterStore.getState().updatePokemonSummary(newSummary);
    } catch {}
}

/**
 * Synchronizes a drag-and-drop move in the Standalone Sidebar to the PC Storage system.
 * If moved into a "Belt" folder under a Trainer, adds to that Trainer's party.
 * If moved into a Box folder under a Trainer, deposits into that Box.
 * Also supports root-level Active Team and Box folders in PMD mode.
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
        if (!targetFolder) return;

        const camp = pcData.campaigns[pcData.activeCampaignId];
        if (!camp) return;

        // PMD / No-Trainer Root Folder Support
        if (!targetFolder.parentId) {
            const { isActiveTeamFolderName } = await import('./pcPmdSidebarSync');
            if (isActiveTeamFolderName(targetFolder.name)) {
                ensurePokemonSummaryInPc(characterId);
                useCharacterStore.getState().movePokemonToParty(characterId);
            } else {
                const boxes = camp.boxes || [];
                const boxIndex = boxes.findIndex(
                    (b) => b.name.trim().toLowerCase() === targetFolder.name.trim().toLowerCase()
                );
                if (boxIndex !== -1) {
                    ensurePokemonSummaryInPc(characterId);
                    useCharacterStore.getState().depositPokemonToBox(characterId, boxIndex);
                }
            }
            return;
        }

        const localChars = await storageAdapter.getLocalCharacters();
        const parentTrainer = localChars.find((c) => c.id === targetFolder.parentId && isTrainerMetadata(c.metadata));
        if (!parentTrainer) return;

        let trainerRoster = Object.values(camp.trainers).find(
            (t) =>
                t.id === parentTrainer.id ||
                t.savedTokenItem?.id === parentTrainer.id ||
                t.mapTokenId === parentTrainer.id ||
                t.name.trim().toLowerCase() === parentTrainer.name.trim().toLowerCase()
        );

        if (!trainerRoster) {
            useCharacterStore.getState().addTrainer(parentTrainer.name, {
                existingCharacterId: parentTrainer.id,
                isLinked: true
            });
            const updatedCamp =
                useCharacterStore.getState().pcData.campaigns[useCharacterStore.getState().pcData.activeCampaignId];
            trainerRoster = Object.values(updatedCamp?.trainers || {}).find(
                (t) =>
                    t.id === parentTrainer.id ||
                    t.savedTokenItem?.id === parentTrainer.id ||
                    t.mapTokenId === parentTrainer.id ||
                    t.name.trim().toLowerCase() === parentTrainer.name.trim().toLowerCase()
            );
        }
        if (!trainerRoster) return;

        ensurePokemonSummaryInPc(characterId, trainerRoster.id);

        if (isBeltFolderName(targetFolder.name)) {
            if (!trainerRoster.party.includes(characterId)) {
                useCharacterStore.getState().movePokemonToParty(characterId, trainerRoster.id);
            }
        } else {
            const boxes = trainerRoster.boxes && trainerRoster.boxes.length > 0 ? trainerRoster.boxes : camp.boxes;
            const boxIndex = boxes.findIndex(
                (b) => b.name.trim().toLowerCase() === targetFolder.name.trim().toLowerCase()
            );
            if (boxIndex !== -1 && !boxes[boxIndex].slots.includes(characterId)) {
                useCharacterStore.getState().depositPokemonToBox(characterId, boxIndex, trainerRoster.id);
            }
        }
    } catch (e) {
        console.warn('[pcSidebarSyncEvents] Failed to sync sidebar move to PC:', e);
    }
}
