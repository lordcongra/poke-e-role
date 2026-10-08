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
            const explicitNick = summary.fullMetadata?.nickname ?? summary.fullMetadata?.['nickname'];
            const nickToSave =
                explicitNick !== undefined
                    ? explicitNick
                    : summary.name && summary.species && summary.name !== summary.species
                      ? summary.name
                      : '';
            const merged = {
                ...parsed,
                ...(summary.fullMetadata || {}),
                name: summary.name,
                nickname: nickToSave
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
    if (!cleanName) return;

    try {
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('pkr_char_')) {
                const charId = key.replace('pkr_char_', '');
                if (charId === trainerId) return;
                try {
                    const data = JSON.parse(localStorage.getItem(key) || '{}');
                    const charName = (data.nickname || data.name || data.species || '').trim().toLowerCase();
                    const isTrainer = data.mode === 'Trainer' || data.mode === 'Trainer (Special)';
                    if (isTrainer && charName === cleanName.toLowerCase()) {
                        return;
                    }
                } catch {}
            }
        }
    } catch {}

    const initialMetadata = {
        nickname: cleanName,
        name: cleanName,
        species: cleanName,
        mode: 'Trainer',
        rank: 'Starter',
        'hp-curr': 5,
        'hp-max-display': 5,
        'hp-base': 4,
        'will-curr': 4,
        'will-max-display': 4,
        'will-base': 3,
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

/**
 * Broadcasts a Pokémon deletion from PC across Owlbear Rodeo peers.
 */
export function broadcastPcPokemonDelete(
    campaignId: string,
    entityId: string,
    options?: { wasUnlinked?: boolean; pokemonName?: string },
    summary?: PcPokemonSummary
): void {
    if (!OBR.isAvailable) return;
    import('../../hooks/owlbearSync/owlbearSyncConstants')
        .then(({ EXTENSION_ID }) => {
            OBR.broadcast
                .sendMessage(
                    `${EXTENSION_ID}/pc-pokemon-delete`,
                    {
                        campaignId,
                        entityId,
                        pokemonName: options?.pokemonName || summary?.name || summary?.species,
                        wasUnlinked: options?.wasUnlinked
                    },
                    { destination: 'REMOTE' }
                )
                .catch(() => {});
        })
        .catch(() => {});
}

/**
 * Synchronizes Owlbear Rodeo room settings when a campaign is edited by the GM.
 */
export function syncCampaignRoomSettingsOnEdit(
    isGm: boolean,
    campaignId: string,
    updatedCampaign: CampaignProfile | undefined,
    updates: { name?: string; isPrivate?: boolean; isRoomActive?: boolean },
    activeRoomCampaignId: string | undefined,
    updateRoomSetting: (key: 'activeRoomCampaignId' | 'activeRoomCampaignName', value: string) => void
): void {
    if (!OBR.isAvailable || !isGm) return;
    if (updates.isRoomActive === true && updatedCampaign && !updatedCampaign.isPrivate) {
        updateRoomSetting('activeRoomCampaignId', campaignId);
        updateRoomSetting('activeRoomCampaignName', updatedCampaign.name);
    } else if (updates.isRoomActive === false || updates.isPrivate === true) {
        if (activeRoomCampaignId === campaignId) {
            updateRoomSetting('activeRoomCampaignId', '');
            updateRoomSetting('activeRoomCampaignName', '');
        }
    } else if (updates.name && updatedCampaign?.isRoomActive) {
        updateRoomSetting('activeRoomCampaignName', updatedCampaign.name);
    }
}
