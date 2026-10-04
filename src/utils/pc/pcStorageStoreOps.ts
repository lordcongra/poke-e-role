import OBR from '@owlbear-rodeo/sdk';
import type { CampaignProfile, TrainerRoster, PcPokemonSummary } from '../../types/pcStorageTypes';
import { relocateSidebarPokemon } from './pcSidebarSync';

/**
 * Dispatches sidebar relocation events when moving a Pokémon to the party in standalone mode.
 */
export function syncSidebarOnMoveToParty(tr: TrainerRoster | undefined, entityId: string): void {
    if (OBR.isAvailable) return;
    if (tr) {
        relocateSidebarPokemon(tr, entityId, { type: 'party' }).catch(console.warn);
    } else {
        import('./pcPmdSidebarSync')
            .then(({ relocatePmdSidebarPokemon }) => {
                relocatePmdSidebarPokemon(entityId, { type: 'party' }).catch(console.warn);
            })
            .catch(console.warn);
    }
}

/**
 * Dispatches sidebar relocation events when depositing a Pokémon to a box in standalone mode.
 */
export function syncSidebarOnDeposit(
    camp: CampaignProfile | undefined,
    tr: TrainerRoster | undefined,
    entityId: string,
    targetIdx: number
): void {
    if (OBR.isAvailable || !camp) return;
    const boxName = (tr?.boxes?.[targetIdx] || camp.boxes[targetIdx])?.name || `Box ${targetIdx + 1}`;
    if (tr) {
        relocateSidebarPokemon(tr, entityId, {
            type: 'box',
            boxIndex: targetIdx,
            boxName
        }).catch(console.warn);
    } else {
        import('./pcPmdSidebarSync')
            .then(({ relocatePmdSidebarPokemon }) => {
                relocatePmdSidebarPokemon(entityId, {
                    type: 'box',
                    boxIndex: targetIdx,
                    boxName
                }).catch(console.warn);
            })
            .catch(console.warn);
    }
}

/**
 * Writes updated character sheet metadata to local storage in standalone mode.
 */
export function syncStandaloneSummaryUpdate(summary: PcPokemonSummary): void {
    if (OBR.isAvailable || !summary.entityId || typeof window === 'undefined' || !window.localStorage) {
        return;
    }
    const localKey = `pkr_char_${summary.entityId}`;
    const existing = localStorage.getItem(localKey);
    if (existing) {
        try {
            const parsed = JSON.parse(existing);
            const merged = {
                ...parsed,
                ...(summary.fullMetadata || {}),
                nickname: summary.name || parsed.nickname
            };
            localStorage.setItem(localKey, JSON.stringify(merged));
            window.dispatchEvent(new Event('pkr-local-data-changed'));
        } catch {}
    }
}

/**
 * Initializes local storage metadata for a newly created trainer profile in standalone mode.
 */
export function initStandaloneTrainerSheet(trainerId: string, name: string): void {
    if (OBR.isAvailable || typeof window === 'undefined' || !window.localStorage) {
        return;
    }
    const cleanName = name.trim();
    const initialMetadata = {
        nickname: cleanName,
        name: cleanName,
        species: cleanName,
        mode: 'Trainer',
        rank: 'Trainer',
        'hp-curr': 10,
        'hp-max-display': 10,
        'will-curr': 5,
        'will-max-display': 5,
        'v2-migrated': true
    };
    try {
        localStorage.setItem(`pkr_char_${trainerId}`, JSON.stringify(initialMetadata));
        window.dispatchEvent(new Event('pkr-local-data-changed'));
    } catch {}
}

/**
 * Synchronizes a renamed trainer profile to standalone character sheet local storage.
 */
export function syncStandaloneTrainerRename(trainerId: string, newName: string): void {
    if (OBR.isAvailable || typeof window === 'undefined' || !window.localStorage) {
        return;
    }
    const cleanName = newName.trim();
    if (!cleanName) return;
    try {
        const localKey = `pkr_char_${trainerId}`;
        const existing = localStorage.getItem(localKey);
        if (existing) {
            const parsed = JSON.parse(existing);
            localStorage.setItem(
                localKey,
                JSON.stringify({
                    ...parsed,
                    nickname: cleanName,
                    name: cleanName,
                    species: cleanName
                })
            );
        }
        window.dispatchEvent(new Event('pkr-local-data-changed'));
    } catch {}
}
