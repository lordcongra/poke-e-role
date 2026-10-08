import { storageAdapter, type LocalFolder, isStandaloneMode, markDataChanged } from '../sync/storageAdapter';
import type { TrainerRoster, PcBox, PcStorageData } from '../../types/pcStorageTypes';
import { useCharacterStore } from '../../store/useCharacterStore';
import { savePcStorage } from './pcStorageAdapter';
import { findAndLinkLocalCharacter } from './pcSidebarFolderMatching';

/**
 * Checks if a character's metadata represents a Trainer.
 */
export function isTrainerMetadata(meta?: Record<string, unknown>): boolean {
    if (!meta) return false;
    const mode = (meta.mode as string) || (meta.rank as string) || '';
    return mode === 'Trainer' || mode === 'Trainer (Special)';
}

/**
 * Finds the local character ID in the Standalone Sidebar that corresponds to this Trainer.
 */
export async function findTrainerSidebarId(trainer?: TrainerRoster): Promise<string | null> {
    if (!trainer || !isStandaloneMode) return null;

    try {
        const localChars = await storageAdapter.getLocalCharacters();

        const cleanName = (trainer.name || '').trim().toLowerCase();

        // 1. Match by linked mapTokenId, savedTokenItem or entityId
        if (trainer.mapTokenId) {
            const byMap = localChars.find((c) => c.id === trainer.mapTokenId);
            if (byMap) return byMap.id;
        }
        if (trainer.savedTokenItem?.id) {
            const byToken = localChars.find((c) => c.id === trainer.savedTokenItem?.id);
            if (byToken) return byToken.id;
        }
        if (trainer.fullMetadata?.entityId) {
            const byEntity = localChars.find((c) => c.id === trainer.fullMetadata?.entityId);
            if (byEntity) return byEntity.id;
        }

        // 1b. Match by currently active sheet in store (if viewing this trainer)
        const activeStore = useCharacterStore.getState();
        if (activeStore.tokenId) {
            const activeName = (activeStore.identity.nickname || activeStore.identity.species || '')
                .trim()
                .toLowerCase();
            const isTrainerMode =
                activeStore.identity.mode === 'Trainer' || activeStore.identity.mode === 'Trainer (Special)';
            if (isTrainerMode && cleanName && activeName === cleanName) {
                const byActive = localChars.find((c) => c.id === activeStore.tokenId);
                if (byActive) return byActive.id;
            }
        }

        // 2. Match by Trainer mode & name
        if (cleanName) {
            const byNameAndMode = localChars.find((c) => {
                const isTrainer = isTrainerMetadata(c.metadata);
                return isTrainer && c.name.trim().toLowerCase() === cleanName;
            });
            if (byNameAndMode) return byNameAndMode.id;
        }

        // 3. Fallback to direct trainer.id (only if it matches a Trainer or name)
        if (trainer.id) {
            const byId = localChars.find(
                (c) =>
                    c.id === trainer.id &&
                    (!cleanName || c.name.trim().toLowerCase() === cleanName || isTrainerMetadata(c.metadata))
            );
            if (byId) return byId.id;
        }

        return null;
    } catch (e) {
        console.warn('[pcSidebarSync] Failed to find trainer sidebar id:', e);
        return null;
    }
}

/**
 * Checks if a Trainer currently has a "Belt" folder in the sidebar directory.
 */
export async function hasTrainerOrganizedFolders(trainer?: TrainerRoster): Promise<boolean> {
    const trainerSidebarId = await findTrainerSidebarId(trainer);
    if (!trainerSidebarId) return false;

    try {
        const folders = await storageAdapter.getFolders();
        return folders.some((f) => f.parentId === trainerSidebarId && isBeltFolderName(f.name));
    } catch {
        return false;
    }
}

export function isBeltFolderName(name: string): boolean {
    const lower = name.trim().toLowerCase();
    return lower === 'belt' || lower === 'belt party' || lower === 'party' || lower === 'belt pokémon';
}

/**
 * Gets or creates the "Belt" folder under a specific Trainer.
 */
export async function getOrCreateBeltFolder(trainerSidebarId: string): Promise<LocalFolder> {
    const folders = await storageAdapter.getFolders();
    const existing = folders.find((f) => f.parentId === trainerSidebarId && isBeltFolderName(f.name));
    if (existing) return existing;

    const newId = await storageAdapter.createFolder('Belt', trainerSidebarId);
    return { id: newId, name: 'Belt', parentId: trainerSidebarId };
}

/**
 * Gets or creates a Box folder (e.g. "Box 1" or "Meadow") under a specific Trainer.
 */
export async function getOrCreateBoxFolder(trainerSidebarId: string, boxName: string): Promise<LocalFolder> {
    const folders = await storageAdapter.getFolders();
    const cleanBoxName = boxName.trim();
    const existing = folders.find(
        (f) => f.parentId === trainerSidebarId && f.name.trim().toLowerCase() === cleanBoxName.toLowerCase()
    );
    if (existing) return existing;

    const newId = await storageAdapter.createFolder(cleanBoxName, trainerSidebarId);
    return { id: newId, name: cleanBoxName, parentId: trainerSidebarId };
}

/**
 * Organizes the Standalone Sidebar under a Trainer:
 * - Creates a "Belt" folder and moves the 6 party Pokémon into it.
 * - Creates Box folders for any boxes containing Pokémon for this Trainer and moves them in.
 * - NEVER moves or alters child Trainer sheets (e.g. Team Rocket Grunts grouped under a Boss).
 */
export async function organizeTrainerSidebarFolders(
    trainer: TrainerRoster,
    boxes: PcBox[]
): Promise<{ success: boolean; createdBelt: boolean; createdBoxes: number; movedPokemonCount: number }> {
    if (!isStandaloneMode) {
        return { success: false, createdBelt: false, createdBoxes: 0, movedPokemonCount: 0 };
    }

    const trainerSidebarId = await findTrainerSidebarId(trainer);
    if (!trainerSidebarId) {
        return { success: false, createdBelt: false, createdBoxes: 0, movedPokemonCount: 0 };
    }

    try {
        const localChars = await storageAdapter.getLocalCharacters();
        const existingFolders = await storageAdapter.getFolders();

        // 1. Ensure "Belt" folder exists
        let createdBelt = false;
        let beltFolder = existingFolders.find((f) => f.parentId === trainerSidebarId && isBeltFolderName(f.name));
        if (!beltFolder) {
            const bId = await storageAdapter.createFolder('Belt', trainerSidebarId);
            beltFolder = { id: bId, name: 'Belt', parentId: trainerSidebarId };
            createdBelt = true;
        }

        let movedPokemonCount = 0;
        let createdBoxes = 0;

        const summaries = useCharacterStore.getState().pcData.pokemonSummaries || {};

        // 2. Move active belt Pokémon into the "Belt" folder
        const partyIds = (trainer.party || []).filter(Boolean) as string[];
        const beltCharIds = new Set<string>();
        for (const pId of partyIds) {
            const charMatch = await findAndLinkLocalCharacter(pId, localChars, summaries, beltCharIds);
            if (charMatch) {
                beltCharIds.add(charMatch.id);
                // Verify this character is not a Trainer!
                if (!isTrainerMetadata(charMatch.metadata) && charMatch.parentId !== beltFolder.id) {
                    await storageAdapter.moveItem(charMatch.id, beltFolder.id);
                    charMatch.parentId = beltFolder.id;
                    movedPokemonCount++;
                }
            }
        }

        // 3. Create Box folders and move stored Pokémon
        const activeBoxes = trainer.boxes && trainer.boxes.length > 0 ? trainer.boxes : boxes;
        for (let i = 0; i < activeBoxes.length; i++) {
            const box = activeBoxes[i];
            const storedSlotIds = (box.slots || []).filter(Boolean) as string[];
            if (storedSlotIds.length === 0 && i > 0) {
                // Skip creating empty box folders beyond Box 1 unless occupied
                continue;
            }

            const boxName = box.name || `Box ${i + 1}`;
            let boxFolder = existingFolders.find(
                (f) => f.parentId === trainerSidebarId && f.name.trim().toLowerCase() === boxName.trim().toLowerCase()
            );

            if (!boxFolder) {
                const bId = await storageAdapter.createFolder(boxName, trainerSidebarId);
                boxFolder = { id: bId, name: boxName, parentId: trainerSidebarId };
                createdBoxes++;
            }

            for (const sId of storedSlotIds) {
                const charMatch = await findAndLinkLocalCharacter(sId, localChars, summaries, beltCharIds);
                if (charMatch) {
                    if (
                        !isTrainerMetadata(charMatch.metadata) &&
                        !beltCharIds.has(charMatch.id) &&
                        charMatch.parentId !== boxFolder.id
                    ) {
                        await storageAdapter.moveItem(charMatch.id, boxFolder.id);
                        charMatch.parentId = boxFolder.id;
                        movedPokemonCount++;
                    }
                }
            }
        }

        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('pkr-expand-sidebar-node', { detail: { id: trainerSidebarId } }));
            if (beltFolder) {
                window.dispatchEvent(new CustomEvent('pkr-expand-sidebar-node', { detail: { id: beltFolder.id } }));
            }
        }

        return { success: true, createdBelt, createdBoxes, movedPokemonCount };
    } catch (e) {
        console.error('[pcSidebarSync] Failed to organize trainer folders:', e);
        return { success: false, createdBelt: false, createdBoxes: 0, movedPokemonCount: 0 };
    }
}

/**
 * Automatically relocates a Pokémon sheet in the sidebar when it is moved
 * between the Trainer's Belt and PC Storage Boxes.
 */
export async function relocateSidebarPokemon(
    trainer: TrainerRoster,
    pokemonId: string,
    target: { type: 'party' } | { type: 'box'; boxIndex: number; boxName: string }
): Promise<void> {
    if (!isStandaloneMode || !pokemonId) return;

    // Safety Invariant: If destination is a Box, but this Pokémon is currently on the Trainer's active party,
    // NEVER move it to a Box folder! It is still carried on the Trainer's belt.
    if (target.type === 'box' && trainer.party && trainer.party.includes(pokemonId)) {
        return;
    }

    const trainerSidebarId = await findTrainerSidebarId(trainer);
    if (!trainerSidebarId) return;

    try {
        const localChars = await storageAdapter.getLocalCharacters();
        const summaries = useCharacterStore.getState().pcData.pokemonSummaries || {};
        const charMatch = await findAndLinkLocalCharacter(pokemonId, localChars, summaries);
        if (!charMatch || isTrainerMetadata(charMatch.metadata)) return;

        // Check if the trainer already has folder organization in the sidebar
        const folders = await storageAdapter.getFolders();
        const trainerFolders = folders.filter((f) => f.parentId === trainerSidebarId);
        const hasFolders = trainerFolders.some((f) => isBeltFolderName(f.name));

        if (!hasFolders) {
            // If the user hasn't organized into folders, at minimum parent directly under the Trainer
            if (charMatch.parentId !== trainerSidebarId) {
                await storageAdapter.moveItem(charMatch.id, trainerSidebarId);
            }
            return;
        }

        if (target.type === 'party') {
            const beltFolder = await getOrCreateBeltFolder(trainerSidebarId);
            if (charMatch.parentId !== beltFolder.id) {
                await storageAdapter.moveItem(charMatch.id, beltFolder.id);
            }
        } else {
            const boxName = target.boxName || `Box ${target.boxIndex + 1}`;
            const boxFolder = await getOrCreateBoxFolder(trainerSidebarId, boxName);
            if (charMatch.parentId !== boxFolder.id) {
                await storageAdapter.moveItem(charMatch.id, boxFolder.id);
            }
        }
    } catch (e) {
        console.warn('[pcSidebarSync] Failed to relocate sidebar pokemon:', e);
    }
}

/**
 * Synchronizes PC box rename to the corresponding folder in the Standalone Sidebar.
 */
export async function syncBoxRenameToSidebar(trainer: TrainerRoster, oldName: string, newName: string): Promise<void> {
    if (!isStandaloneMode) return;

    const trainerSidebarId = await findTrainerSidebarId(trainer);
    if (!trainerSidebarId) return;

    try {
        const folders = await storageAdapter.getFolders();
        const target = folders.find(
            (f) => f.parentId === trainerSidebarId && f.name.trim().toLowerCase() === oldName.trim().toLowerCase()
        );
        if (target && target.name !== newName.trim()) {
            await storageAdapter.renameFolder(target.id, newName.trim());
        }
    } catch (e) {
        console.warn('[pcSidebarSync] Failed to sync box rename to sidebar folder:', e);
    }
}

/**
 * Synchronizes a sidebar folder rename to the corresponding PC Box.
 */
export async function syncSidebarFolderRenameToPc(
    folderId: string,
    oldName: string,
    newName: string,
    pcData: PcStorageData
): Promise<boolean> {
    if (!isStandaloneMode) return false;

    try {
        const folders = await storageAdapter.getFolders();
        const target = folders.find((f) => f.id === folderId);
        if (!target || !target.parentId) return false;

        // Check if parentId is a Trainer
        const localChars = await storageAdapter.getLocalCharacters();
        const parentTrainer = localChars.find((c) => c.id === target.parentId && isTrainerMetadata(c.metadata));
        if (!parentTrainer) return false;

        // Look up trainer roster in pcData
        let updated = false;
        const nextData = { ...pcData };

        for (const camp of Object.values(nextData.campaigns)) {
            for (const tr of Object.values(camp.trainers)) {
                if (
                    tr.id === parentTrainer.id ||
                    tr.savedTokenItem?.id === parentTrainer.id ||
                    tr.mapTokenId === parentTrainer.id ||
                    tr.name.toLowerCase() === parentTrainer.name.toLowerCase()
                ) {
                    // Check trainer boxes
                    if (tr.boxes) {
                        for (const b of tr.boxes) {
                            if (b.name.trim().toLowerCase() === oldName.trim().toLowerCase()) {
                                b.name = newName.trim();
                                updated = true;
                            }
                        }
                    }
                }
            }

            // Also check campaign boxes
            if (camp.boxes) {
                for (const b of camp.boxes) {
                    if (b.name.trim().toLowerCase() === oldName.trim().toLowerCase()) {
                        b.name = newName.trim();
                        updated = true;
                    }
                }
            }
        }

        if (updated) {
            useCharacterStore.setState({ pcData: nextData });
            await savePcStorage(nextData);
            return true;
        }
        return false;
    } catch (e) {
        console.warn('[pcSidebarSync] Failed to sync sidebar folder rename to PC:', e);
        return false;
    }
}

/**
 * Synchronizes slot swaps in the PC with the Standalone Sidebar folders.
 */
export async function syncSwappedSlotsToSidebar(
    trainer: TrainerRoster,
    from: { type: 'party' | 'box'; index: number; boxIndex?: number },
    to: { type: 'party' | 'box'; index: number; boxIndex?: number },
    nextPcData: PcStorageData,
    activeBoxIndex: number
): Promise<void> {
    if (!isStandaloneMode) return;

    const camp = nextPcData.campaigns[nextPcData.activeCampaignId];
    if (!camp) return;
    const activeTrainer = camp.trainers[trainer.id] || trainer;
    const trainerBoxes = activeTrainer.boxes && activeTrainer.boxes.length > 0 ? activeTrainer.boxes : camp.boxes;

    const entityInFrom =
        from.type === 'party'
            ? activeTrainer.party[from.index]
            : trainerBoxes[from.boxIndex ?? activeBoxIndex]?.slots[from.index];

    const entityInTo =
        to.type === 'party'
            ? activeTrainer.party[to.index]
            : trainerBoxes[to.boxIndex ?? activeBoxIndex]?.slots[to.index];

    if (entityInFrom) {
        if (from.type === 'party') {
            await relocateSidebarPokemon(activeTrainer, entityInFrom, { type: 'party' });
        } else {
            const bIdx = from.boxIndex ?? activeBoxIndex;
            const bName = trainerBoxes[bIdx]?.name || `Box ${bIdx + 1}`;
            await relocateSidebarPokemon(activeTrainer, entityInFrom, { type: 'box', boxIndex: bIdx, boxName: bName });
        }
    }

    if (entityInTo) {
        if (to.type === 'party') {
            await relocateSidebarPokemon(activeTrainer, entityInTo, { type: 'party' });
        } else {
            const bIdx = to.boxIndex ?? activeBoxIndex;
            const bName = trainerBoxes[bIdx]?.name || `Box ${bIdx + 1}`;
            await relocateSidebarPokemon(activeTrainer, entityInTo, { type: 'box', boxIndex: bIdx, boxName: bName });
        }
    }

    if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('pkr-local-data-changed'));
        markDataChanged();
    }
}

/**
 * Runs the folder organization workflow for PMD or Trainer mode and alerts the user.
 */
export async function runOrganizeFoldersAction(
    trainer: TrainerRoster | undefined,
    partySlots: (string | null)[],
    trainerBoxes: PcBox[]
): Promise<void> {
    const { organizePmdSidebarFolders } = await import('./pcPmdSidebarSync');
    const isPmd = !trainer || trainer.profileType === 'storage';
    const res = isPmd
        ? await organizePmdSidebarFolders(partySlots, trainerBoxes)
        : await organizeTrainerSidebarFolders(trainer, trainerBoxes);

    if (res.success) {
        const label = !isPmd ? `for ${trainer?.name}` : 'for Active Team';
        const details = [
            res.createdBelt ? (!isPmd ? '• Created Belt folder' : '• Created Active Team folder') : '',
            res.createdBoxes > 0 ? `• Created ${res.createdBoxes} Box folder(s)` : '',
            `• Moved ${res.movedPokemonCount} Pokémon sheet(s) into their matching folders.`
        ]
            .filter(Boolean)
            .join('\n');
        alert(`Organized folders ${label}!\n${details}`);
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('pkr-local-data-changed'));
        }
    } else if (!isPmd && trainer) {
        alert(`Unable to organize folders for ${trainer.name}. Please ensure this Trainer exists in the Directory.`);
    }
}

// Re-export auto-heal utility from dedicated module
export { autoHealTrainerBeltPokemon } from './pcSidebarAutoHeal';

// Re-export event functions from dedicated module
export {
    syncPokemonNicknameToSidebar,
    syncSidebarCharacterRenameToPc,
    syncSidebarMoveToPc
} from './pcSidebarSyncEvents';
