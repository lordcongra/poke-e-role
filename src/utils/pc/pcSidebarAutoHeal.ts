import { storageAdapter, type LocalFolder, type LocalCharacter, isStandaloneMode } from '../sync/storageAdapter';
import type { PcStorageData } from '../../types/pcStorageTypes';
import { isTrainerMetadata, isBeltFolderName } from './pcSidebarSync';
import { findAndLinkLocalCharacter } from './pcSidebarFolderMatching';

/**
 * Automatically repairs and heals Belt Pokémon placement in the Standalone Sidebar.
 * Ensures any Pokémon on a Trainer's active belt is nested directly inside the "Belt" folder,
 * rather than hanging directly under the Trainer, being nested inside another character, or orphaned.
 */
export async function autoHealTrainerBeltPokemon(
    localChars: LocalCharacter[],
    folders: LocalFolder[],
    pcData: PcStorageData
): Promise<boolean> {
    if (!isStandaloneMode || !pcData?.campaigns) return false;
    let anyMoved = false;

    for (const camp of Object.values(pcData.campaigns)) {
        for (const tr of Object.values(camp.trainers || {})) {
            if (!tr.party || tr.party.length === 0) continue;

            const trainerSidebarId = localChars.find(
                (c) =>
                    c.id === tr.id ||
                    c.id === tr.savedTokenItem?.id ||
                    c.id === tr.mapTokenId ||
                    (isTrainerMetadata(c.metadata) && c.name.trim().toLowerCase() === tr.name.trim().toLowerCase())
            )?.id;
            if (!trainerSidebarId) continue;

            const beltFolder = folders.find((f) => f.parentId === trainerSidebarId && isBeltFolderName(f.name));
            if (!beltFolder) continue;

            const partyIds = tr.party.filter(Boolean) as string[];
            const claimedCharIds = new Set<string>();

            // 1. Link and heal active party members (strictly 1 sheet per slot)
            for (const pId of partyIds) {
                const charMatch = await findAndLinkLocalCharacter(
                    pId,
                    localChars,
                    pcData.pokemonSummaries || {},
                    claimedCharIds
                );
                if (charMatch && !isTrainerMetadata(charMatch.metadata)) {
                    claimedCharIds.add(charMatch.id);
                    if (charMatch.parentId !== beltFolder.id) {
                        await storageAdapter.moveItem(charMatch.id, beltFolder.id);
                        charMatch.parentId = beltFolder.id;
                        anyMoved = true;
                    }
                }
            }

            // 2. Relocate any unlinked / duplicate sheets out of the Belt folder to Trainer root
            for (const c of localChars) {
                if (isTrainerMetadata(c.metadata)) continue;

                if (c.parentId === beltFolder.id && !claimedCharIds.has(c.id)) {
                    // This sheet is not on the active belt - move directly under Trainer to prevent duplication in Belt
                    await storageAdapter.moveItem(c.id, trainerSidebarId);
                    c.parentId = trainerSidebarId;
                    anyMoved = true;
                } else if (c.parentId && !folders.some((f) => f.id === c.parentId)) {
                    // Corruption safeguard: c.parentId is set to another character sheet!
                    // Heal by moving to the parent character's folder or parent
                    const parentChar = localChars.find((p) => p.id === c.parentId);
                    const safeParent = parentChar ? parentChar.parentId : null;
                    await storageAdapter.moveItem(c.id, safeParent);
                    c.parentId = safeParent;
                    anyMoved = true;
                }
            }
        }
    }

    return anyMoved;
}
