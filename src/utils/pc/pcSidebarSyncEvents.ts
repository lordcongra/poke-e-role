import { storageAdapter, isStandaloneMode } from '../sync/storageAdapter';
import type { PcStorageData } from '../../types/pcStorageTypes';
import { useCharacterStore } from '../../store/useCharacterStore';
import { savePcStorage } from './pcStorageAdapter';
import { isTrainerMetadata, isBeltFolderName } from './pcSidebarSync';

/**
 * Synchronizes a nickname update to the corresponding Pokémon character in the Standalone Sidebar.
 */
export async function syncPokemonNicknameToSidebar(pokemonId: string, newNickname: string): Promise<void> {
    if (!isStandaloneMode || !pokemonId) return;

    try {
        const localChars = await storageAdapter.getLocalCharacters();
        const match = localChars.find((c) => c.id === pokemonId || c.metadata?.entityId === pokemonId);
        if (match) {
            const cleanNick = (newNickname || '').trim();
            const species = (match.metadata?.species as string) || match.name || 'Pokémon';
            await storageAdapter.saveCharacter(
                match.id,
                {
                    nickname: cleanNick,
                    name: cleanNick || species
                },
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
        const cleanNick = (newNickname || '').trim();
        const effectiveName = cleanNick || summary?.species || '';
        if (summary && (summary.name !== effectiveName || (summary.fullMetadata?.nickname as string) !== cleanNick)) {
            const nextSummaries = {
                ...pcData.pokemonSummaries,
                [characterId]: {
                    ...summary,
                    name: effectiveName,
                    fullMetadata: {
                        ...summary.fullMetadata,
                        name: effectiveName,
                        nickname: cleanNick
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

        const isTrainerEntity = parsed.mode === 'Trainer' || parsed.mode === 'Trainer (Special)';
        const defaultHp = isTrainerEntity ? 5 : 10;
        const defaultWill = isTrainerEntity ? 4 : 5;

        const newSummary = {
            entityId: characterId,
            trainerId,
            name: parsed.nickname || parsed.species || parsed.name || 'Pokémon',
            species: parsed.species || parsed.name || 'Unknown',
            rank: parsed.rank || 'Starter',
            type1: parsed.type1 || 'Normal',
            type2: parsed.type2,
            hp:
                parsed['hp-curr'] !== undefined && parsed['hp-curr'] !== '' && !isNaN(Number(parsed['hp-curr']))
                    ? Number(parsed['hp-curr'])
                    : Number(parsed.hp) || defaultHp,
            maxHp: Number(parsed['hp-max-display']) || Number(parsed.hpMax) || defaultHp,
            will:
                parsed['will-curr'] !== undefined && parsed['will-curr'] !== '' && !isNaN(Number(parsed['will-curr']))
                    ? Number(parsed['will-curr'])
                    : Number(parsed.will) || defaultWill,
            maxWill: Number(parsed['will-max-display']) || Number(parsed.willMax) || defaultWill,
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
