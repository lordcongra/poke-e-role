import { storageAdapter, type LocalCharacter, isStandaloneMode } from '../sync/storageAdapter';
import type { TrainerRoster, PcPokemonSummary, PcStorageData } from '../../types/pcStorageTypes';
import { isTrainerMetadata } from './pcSidebarSync';
import { findAndLinkLocalCharacter } from './pcSidebarFolderMatching';

/**
 * Ensures that a character sheet exists in the Standalone Sidebar for a given Trainer.
 * Creates the sheet if missing.
 */
export async function ensureSidebarTrainerSheet(
    trainer: TrainerRoster,
    localChars: LocalCharacter[]
): Promise<LocalCharacter> {
    const cleanName = (trainer.name || 'Trainer').trim();
    const cleanLower = cleanName.toLowerCase();

    // 1. Check existing matches in localChars
    let match = localChars.find(
        (c) =>
            c.id === trainer.id ||
            c.id === trainer.mapTokenId ||
            c.id === trainer.savedTokenItem?.id ||
            c.metadata?.entityId === trainer.id
    );

    if (!match && cleanName) {
        match = localChars.find((c) => isTrainerMetadata(c.metadata) && c.name.trim().toLowerCase() === cleanLower);
    }

    if (match) {
        return match;
    }

    // 2. Generate new Trainer sheet
    const trainerId = trainer.id || crypto.randomUUID();
    const initialMetadata: Record<string, unknown> = {
        nickname: cleanName,
        name: cleanName,
        species: cleanName,
        mode: 'Trainer',
        rank: trainer.fullMetadata?.rank || 'Starter',
        'hp-curr': trainer.fullMetadata?.['hp-curr'] ?? 5,
        'hp-max-display': trainer.fullMetadata?.['hp-max-display'] ?? 5,
        'hp-base': trainer.fullMetadata?.['hp-base'] ?? 4,
        'will-curr': trainer.fullMetadata?.['will-curr'] ?? 4,
        'will-max-display': trainer.fullMetadata?.['will-max-display'] ?? 4,
        'will-base': trainer.fullMetadata?.['will-base'] ?? 3,
        'str-base': 1,
        'dex-base': 1,
        'vit-base': 1,
        'spe-base': 1,
        'ins-base': 1,
        'tou-base': 1,
        'coo-base': 1,
        'bea-base': 1,
        'cut-base': 1,
        'cle-base': 1,
        ...(trainer.fullMetadata || {}),
        parentId: null,
        'v2-migrated': true
    };

    if (trainer.avatarUrl) {
        initialMetadata['token-image-url'] = trainer.avatarUrl;
    }

    await storageAdapter.saveCharacter(trainerId, initialMetadata, 'pokerole-pmd-extension/stats');

    const createdChar: LocalCharacter = {
        id: trainerId,
        name: cleanName,
        parentId: null,
        metadata: initialMetadata
    };
    localChars.push(createdChar);
    return createdChar;
}

/**
 * Ensures that a character sheet exists in the Standalone Sidebar for a given Pokémon summary.
 * Creates the sheet if missing.
 */
export async function ensureSidebarPokemonSheet(
    entityId: string,
    summary: PcPokemonSummary,
    parentId: string | null,
    localChars: LocalCharacter[],
    excludeIds?: Set<string>
): Promise<LocalCharacter> {
    const match = await findAndLinkLocalCharacter(entityId, localChars, { [entityId]: summary }, excludeIds);
    if (match) {
        return match;
    }

    const displayName = summary.name || summary.species || 'Pokémon';
    const explicitNick = summary.fullMetadata?.nickname ?? summary.fullMetadata?.['nickname'];
    const nickToSave =
        explicitNick !== undefined
            ? explicitNick
            : summary.name && summary.species && summary.name !== summary.species
              ? summary.name
              : '';

    const initialMetadata: Record<string, unknown> = {
        nickname: nickToSave,
        name: displayName,
        species: summary.species || displayName,
        entityId: entityId,
        parentId: parentId,
        type1: summary.type1 || 'Normal',
        type2: summary.type2 || '',
        rank: summary.rank || 'Starter',
        ...(summary.fullMetadata || {}),
        'v2-migrated': true
    };

    if (summary.tokenImageUrl) {
        initialMetadata['token-image-url'] = summary.tokenImageUrl;
    }
    if (summary.hp !== undefined) {
        initialMetadata['hp-curr'] = summary.hp;
    }
    if (summary.maxHp !== undefined) {
        initialMetadata['hp-max-display'] = summary.maxHp;
    }
    if (summary.will !== undefined) {
        initialMetadata['will-curr'] = summary.will;
    }
    if (summary.maxWill !== undefined) {
        initialMetadata['will-max-display'] = summary.maxWill;
    }

    await storageAdapter.saveCharacter(entityId, initialMetadata, 'pokerole-pmd-extension/stats');

    const createdChar: LocalCharacter = {
        id: entityId,
        name: displayName,
        parentId,
        metadata: initialMetadata
    };
    localChars.push(createdChar);
    return createdChar;
}

export interface GenerateSidebarSheetsOptions {
    targetTrainerId?: string;
    includeBoxes?: boolean;
    organizeFolders?: boolean;
}

/**
 * High-level bridge that generates missing sidebar character sheets for Trainers
 * and their Belt Pokémon (and optionally Boxed Pokémon) from PC Storage data in Standalone mode.
 */
export async function generateSidebarSheetsFromPc(
    pcData: PcStorageData,
    options?: GenerateSidebarSheetsOptions
): Promise<{ createdTrainers: number; createdPokemon: number }> {
    if (!isStandaloneMode) {
        return { createdTrainers: 0, createdPokemon: 0 };
    }

    try {
        const localChars = await storageAdapter.getLocalCharacters();
        const initialCharCount = localChars.length;
        let createdTrainers = 0;
        let createdPokemon = 0;

        const campId = pcData.activeCampaignId || Object.keys(pcData.campaigns)[0];
        const camp = pcData.campaigns[campId];
        if (!camp) return { createdTrainers: 0, createdPokemon: 0 };

        const summaries = pcData.pokemonSummaries || {};
        const trainersToProcess = options?.targetTrainerId
            ? [camp.trainers[options.targetTrainerId]].filter(Boolean)
            : Object.values(camp.trainers || {});

        for (const tr of trainersToProcess) {
            if (!tr) continue;
            const isStorageProfile = tr.profileType === 'storage' || tr.id.startsWith('__pmd_') || tr.id === '__none__';

            let trainerSidebarId: string | null = null;
            if (!isStorageProfile) {
                const prevCount = localChars.length;
                const trainerChar = await ensureSidebarTrainerSheet(tr, localChars);
                trainerSidebarId = trainerChar.id;
                if (localChars.length > prevCount) {
                    createdTrainers++;
                }
            }

            // Generate Belt Pokémon sheets
            const partyIds = (tr.party || []).filter(Boolean) as string[];
            for (const pid of partyIds) {
                const sum = summaries[pid];
                if (sum) {
                    const prevCount = localChars.length;
                    await ensureSidebarPokemonSheet(pid, sum, trainerSidebarId, localChars);
                    if (localChars.length > prevCount) {
                        createdPokemon++;
                    }
                }
            }

            // Optionally generate Boxed Pokémon sheets
            if (options?.includeBoxes && tr.boxes) {
                for (const box of tr.boxes) {
                    const storedIds = (box.slots || []).filter(Boolean) as string[];
                    for (const pid of storedIds) {
                        const sum = summaries[pid];
                        if (sum) {
                            const prevCount = localChars.length;
                            await ensureSidebarPokemonSheet(pid, sum, trainerSidebarId, localChars);
                            if (localChars.length > prevCount) {
                                createdPokemon++;
                            }
                        }
                    }
                }
            }

            // Organize into Belt/Box folders if requested
            if (options?.organizeFolders && !isStorageProfile) {
                const { organizeTrainerSidebarFolders } = await import('./pcSidebarSync');
                await organizeTrainerSidebarFolders(tr, tr.boxes || []).catch(console.warn);
            }
        }

        // If in PMD mode or campaign has teamParty
        if (camp.teamParty && Array.isArray(camp.teamParty)) {
            for (const pid of camp.teamParty.filter(Boolean) as string[]) {
                const sum = summaries[pid];
                if (sum) {
                    const prevCount = localChars.length;
                    await ensureSidebarPokemonSheet(pid, sum, null, localChars);
                    if (localChars.length > prevCount) {
                        createdPokemon++;
                    }
                }
            }

            if (options?.organizeFolders && (!trainersToProcess.length || camp.activeTrainerId === '__none__')) {
                const { organizePmdSidebarFolders } = await import('./pcPmdSidebarSync');
                await organizePmdSidebarFolders(camp.teamParty, camp.boxes || []).catch(console.warn);
            }
        }

        if (localChars.length > initialCharCount) {
            window.dispatchEvent(new Event('pkr-local-data-changed'));
        }

        return { createdTrainers, createdPokemon };
    } catch (e) {
        console.error('[pcSidebarGenerator] Failed to generate sidebar sheets from PC:', e);
        return { createdTrainers: 0, createdPokemon: 0 };
    }
}
