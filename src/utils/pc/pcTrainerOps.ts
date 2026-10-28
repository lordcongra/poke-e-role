import OBR, { buildImage, type Item } from '@owlbear-rodeo/sdk';
import type { TrainerRoster, CampaignProfile } from '../../types/pcStorageTypes';
import type { CharacterState } from '../../store/storeTypes';
import { useCharacterStore } from '../../store/useCharacterStore';
import { flattenStateToMetadata } from '../sync/stateMapper';
import { METADATA_ID } from '../sync/obr';
import { getAbsolutePokeballUrl, resolveImageDimensions } from '../generators/trainerTokenSpawner';
import { buildGraphicsFromMeta, renderTokenGraphics } from '../graphics/graphicsManager';
import { markTokenAsRecentlySpawned } from './pcModalOps';
import { isEntityLockedByGm } from './pcCandidateMatching';

import { VALID_RANKS, parseNumericMeta, buildTrainerSummary } from './pcTrainerSummaryOps';

export { buildTrainerSummary };

/**
 * Checks if the trainer's token is actively placed on the current scene,
 * and if so, updates the trainer profile with live map references and full metadata.
 */
export async function checkTrainerOnMap(trainer?: TrainerRoster): Promise<boolean> {
    if (!OBR.isAvailable || !trainer) return false;
    try {
        const items = await OBR.scene.items.getItems();
        const found = items.find((i) => {
            if (i.layer !== 'CHARACTER') return false;
            if (trainer.mapTokenId && i.id === trainer.mapTokenId) return true;
            const meta = (i.metadata[METADATA_ID] || i.metadata['pokerole-pmd-extension/stats']) as
                | Record<string, unknown>
                | undefined;
            if (!meta) return false;
            const isTrainer = meta.mode === 'Trainer' || meta.mode === 'Trainer (Special)';
            return (
                isTrainer && (meta.name === trainer.name || meta.nickname === trainer.name || i.name === trainer.name)
            );
        });

        if (found) {
            trainer.mapTokenId = found.id;
            trainer.savedTokenItem = found;
            const meta = (found.metadata[METADATA_ID] || found.metadata['pokerole-pmd-extension/stats']) as
                | Record<string, unknown>
                | undefined;
            if (meta) {
                trainer.fullMetadata = { ...(trainer.fullMetadata || {}), ...meta };
            }
            return true;
        }
        return false;
    } catch {
        return false;
    }
}

/**
 * Builds an updated Trainer profile with complete snapshot metadata from the active character store.
 */
export function buildLinkedTrainer(
    trainer: TrainerRoster,
    store: CharacterState,
    identityName: string,
    avatarUrl?: string
): TrainerRoster {
    const fullMeta = flattenStateToMetadata(store);
    const tokenMeta = (trainer.savedTokenItem?.metadata?.[METADATA_ID] as Record<string, unknown>) || null;
    const sources = [tokenMeta, trainer.fullMetadata];

    const hpCurr = store.health.hpCurr ?? parseNumericMeta(['hp-curr', 'hp', 'currentHp'], sources, 5);
    const hpMax = store.health.hpMax ?? parseNumericMeta(['hp-max-display', 'hpMax', 'maxHp'], sources, 5);
    const willCurr = store.will.willCurr ?? parseNumericMeta(['will-curr', 'will', 'currentWill'], sources, 4);
    const willMax = store.will.willMax ?? parseNumericMeta(['will-max-display', 'willMax', 'maxWill'], sources, 4);

    fullMeta['hp-curr'] = hpCurr;
    fullMeta['hp-max-display'] = hpMax;
    fullMeta['will-curr'] = willCurr;
    fullMeta['will-max-display'] = willMax;
    fullMeta['mode'] = store.identity.mode || 'Trainer';

    return {
        ...trainer,
        name: identityName || 'Trainer',
        avatarUrl: avatarUrl ?? trainer.avatarUrl,
        fullMetadata: fullMeta,
        mapTokenId: store.tokenId || trainer.mapTokenId,
        isLinked: true
    };
}

/**
 * Spawns the linked Trainer token onto the Owlbear Rodeo map, restoring
 * the scale and sizing from previous maps or defaulting cleanly to 1 grid cell.
 */
export async function spawnTrainerToMap(
    trainer: { name: string; avatarUrl?: string; fullMetadata?: Record<string, unknown>; savedTokenItem?: Item },
    role: 'PLAYER' | 'GM' = 'PLAYER'
): Promise<{ success: boolean; newMapTokenId?: string; alreadyOnMap?: boolean }> {
    if (!OBR.isAvailable) return { success: true };

    try {
        const sceneItems = await OBR.scene.items.getItems();
        const existing = sceneItems.find((i) => {
            if (i.layer !== 'CHARACTER') return false;
            const meta = (i.metadata[METADATA_ID] || i.metadata['pokerole-pmd-extension/stats']) as
                | Record<string, unknown>
                | undefined;
            if (!meta) return false;
            const isTrainerMode = meta.mode === 'Trainer' || meta.mode === 'Trainer (Special)';
            const nameMatch = meta.name === trainer.name || meta.nickname === trainer.name || i.name === trainer.name;
            return isTrainerMode && nameMatch;
        });

        if (existing) {
            await OBR.player.select([existing.id]);
            return { success: true, newMapTokenId: existing.id, alreadyOnMap: true };
        }

        const vpWidth = (await OBR.viewport.getWidth()) || 800;
        const vpHeight = (await OBR.viewport.getHeight()) || 600;
        const centerPos = await OBR.viewport.inverseTransformPoint({
            x: vpWidth * 0.35,
            y: vpHeight * 0.5
        });

        const hpMax = Number(trainer.fullMetadata?.['hp-max-display'] || trainer.fullMetadata?.['hpMax']) || 5;
        const rawHpCurr = trainer.fullMetadata?.['hp-curr'] ?? trainer.fullMetadata?.['hpCurr'];
        const hpCurr =
            rawHpCurr !== undefined && rawHpCurr !== null && !isNaN(Number(rawHpCurr)) ? Number(rawHpCurr) : hpMax;

        const willMax = Number(trainer.fullMetadata?.['will-max-display'] || trainer.fullMetadata?.['willMax']) || 4;
        const rawWillCurr = trainer.fullMetadata?.['will-curr'] ?? trainer.fullMetadata?.['willCurr'];
        const willCurr =
            rawWillCurr !== undefined && rawWillCurr !== null && !isNaN(Number(rawWillCurr))
                ? Number(rawWillCurr)
                : willMax;

        const rawRank = trainer.fullMetadata?.['rank'] || trainer.fullMetadata?.rank;
        const trainerRank = typeof rawRank === 'string' && VALID_RANKS.has(rawRank) ? rawRank : 'Starter';

        const metaObj: Record<string, unknown> = {
            ...(trainer.fullMetadata || {}),
            name: trainer.name,
            nickname: trainer.name,
            species: trainer.fullMetadata?.species || trainer.name,
            mode: trainer.fullMetadata?.mode || 'Trainer',
            rank: trainerRank,
            'str-base': trainer.fullMetadata?.['str-base'] ?? 1,
            'dex-base': trainer.fullMetadata?.['dex-base'] ?? 1,
            'vit-base': trainer.fullMetadata?.['vit-base'] ?? 1,
            'ins-base': trainer.fullMetadata?.['ins-base'] ?? 1,
            'spe-base': trainer.fullMetadata?.['spe-base'] ?? 1,
            'token-image-url': trainer.avatarUrl,
            'hp-curr': hpCurr,
            'hp-max-display': hpMax,
            'will-curr': willCurr,
            'will-max-display': willMax
        };

        let trainerItem: Item;

        if (trainer.savedTokenItem) {
            const raw = JSON.parse(JSON.stringify(trainer.savedTokenItem)) as Item;
            trainerItem = {
                ...raw,
                id: crypto.randomUUID(),
                position: centerPos,
                layer: 'CHARACTER',
                scale: raw.scale ? { ...raw.scale } : { x: 1, y: 1 }
            } as Item;
            const merged = {
                ...((trainerItem.metadata?.[METADATA_ID] as Record<string, unknown>) || {}),
                ...metaObj
            };
            trainerItem.metadata = {
                ...trainerItem.metadata,
                [METADATA_ID]: merged,
                'pokerole-pmd-extension/stats': merged
            };
        } else {
            const trainerUrl = trainer.avatarUrl || getAbsolutePokeballUrl();
            const dims = await resolveImageDimensions(trainerUrl);
            const tokenWidth = dims.width || 300;
            const tokenHeight = dims.height || 300;
            const maxDim = Math.max(tokenWidth, tokenHeight) || 300;
            const imageContent = {
                url: trainerUrl,
                mime: trainerUrl.endsWith('.svg') ? 'image/svg+xml' : 'image/png',
                width: tokenWidth,
                height: tokenHeight
            };
            const imageGrid = {
                dpi: maxDim, // Fits within 1 standard grid unit by default (300dpi for standard 300x300 tokens)
                offset: { x: tokenWidth / 2, y: tokenHeight / 2 }
            };

            trainerItem = buildImage(imageContent, imageGrid)
                .name(trainer.name)
                .position(centerPos)
                .layer('CHARACTER')
                .metadata({
                    [METADATA_ID]: metaObj,
                    'pokerole-pmd-extension/stats': metaObj
                })
                .build();
        }

        try {
            const myId = await OBR.player.getId();
            const myName = await OBR.player.getName();
            trainerItem.metadata['pokerole-pmd-extension/claimed-by'] = {
                playerId: myId,
                playerName: myName,
                trainerId: (trainer as { id?: string }).id,
                trainerName: trainer.name,
                isTrainer: true
            };
        } catch {}

        markTokenAsRecentlySpawned(trainerItem.id);
        await OBR.scene.items.addItems([trainerItem]);
        await OBR.player.select([trainerItem.id]);

        try {
            const gData = buildGraphicsFromMeta(metaObj);
            await renderTokenGraphics(trainerItem, gData, role, true);
        } catch {}

        return { success: true, newMapTokenId: trainerItem.id };
    } catch (e) {
        console.error('[PcTrainerOps] Failed to spawn Trainer token:', e);
        return { success: false };
    }
}

/**
 * Links the active sheet to the selected trainer roster, validating permissions and Gm locks.
 */
export async function executeLinkActiveTrainer(params: {
    trainer?: TrainerRoster;
    campaign?: CampaignProfile;
    canLinkActiveTrainer: boolean;
    identity: {
        nickname?: string;
        species?: string;
        tokenImageUrl?: string | null;
        mode?: string;
    };
    role?: 'PLAYER' | 'GM';
    saveTrainerProfile: (t: TrainerRoster) => void;
}): Promise<void> {
    const { trainer, campaign, canLinkActiveTrainer, identity, role, saveTrainerProfile } = params;
    if (!trainer || !campaign) return;

    const isTrainerMode = identity.mode === 'Trainer' || identity.mode === 'Trainer (Special)';
    if (!isTrainerMode) {
        if (OBR.isAvailable) {
            OBR.notification.show(
                'Only tokens set to Trainer or Trainer (Special) mode can be linked to the belt.',
                'WARNING'
            );
        }
        return;
    }

    const store = useCharacterStore.getState();
    const trainerName = identity.nickname || identity.species || 'Trainer';
    let savedItem = trainer.savedTokenItem;
    if (OBR.isAvailable && store.tokenId) {
        try {
            const items = await OBR.scene.items.getItems([store.tokenId]);
            if (items.length > 0) savedItem = items[0];
        } catch {}
    }

    let myId: string | undefined;
    let myName: string | undefined;
    if (OBR.isAvailable) {
        try {
            myId = await OBR.player.getId();
            myName = await OBR.player.getName();
        } catch {}
    }

    if (role !== 'GM') {
        if (isEntityLockedByGm(savedItem) || isEntityLockedByGm(trainer)) {
            if (OBR.isAvailable) {
                OBR.notification.show(
                    'Cannot link: This trainer token is locked by the GM. Ask your GM to unlock it.',
                    'WARNING'
                );
            }
            return;
        }

        const claim = savedItem?.metadata?.['pokerole-pmd-extension/claimed-by'] as
            | { playerId?: string; playerName?: string; trainerId?: string; trainerName?: string; isTrainer?: boolean }
            | undefined;

        if (claim?.playerId && myId && claim.playerId !== myId) {
            if (OBR.isAvailable) {
                OBR.notification.show('Cannot link: This trainer token belongs to another player.', 'WARNING');
            }
            return;
        }

        if (claim?.isTrainer && claim.trainerId && claim.trainerId !== trainer.id) {
            if (OBR.isAvailable) {
                OBR.notification.show(
                    `Cannot link: This token is already claimed by Trainer "${claim.trainerName || 'another trainer'}".`,
                    'WARNING'
                );
            }
            return;
        }

        if (!canLinkActiveTrainer) {
            const activeTokenId = store.tokenId;
            const activeTrainerName = (identity.nickname || identity.species || '').trim();
            const otherTrainer = Object.values(campaign.trainers).find(
                (t) =>
                    t.id !== trainer.id &&
                    ((activeTokenId && (t.mapTokenId === activeTokenId || t.savedTokenItem?.id === activeTokenId)) ||
                        (t.isLinked && activeTrainerName && t.name.toLowerCase() === activeTrainerName.toLowerCase()))
            );
            if (OBR.isAvailable) {
                if (otherTrainer) {
                    OBR.notification.show(
                        `Cannot link: This token is already linked to Trainer "${otherTrainer.name}".`,
                        'WARNING'
                    );
                } else {
                    OBR.notification.show('Cannot link this token.', 'WARNING');
                }
            }
            return;
        }
    }

    const claimData = {
        playerId: myId || '',
        playerName: myName || '',
        trainerId: trainer.id,
        trainerName,
        isTrainer: true
    };

    if (OBR.isAvailable && store.tokenId) {
        try {
            await OBR.scene.items.updateItems([store.tokenId], (items) => {
                for (const item of items) {
                    item.metadata['pokerole-pmd-extension/claimed-by'] = claimData;
                }
            });
            if (savedItem) {
                savedItem.metadata = {
                    ...savedItem.metadata,
                    ['pokerole-pmd-extension/claimed-by']: claimData
                };
            }
        } catch (e) {
            console.warn('[pcTrainerOps] Failed to stamp claim on linked trainer token:', e);
        }
    }

    const nextTrainer = {
        ...buildLinkedTrainer(trainer, store, trainerName, identity.tokenImageUrl || undefined),
        savedTokenItem: savedItem
    };
    saveTrainerProfile(nextTrainer);

    if (OBR.isAvailable) {
        OBR.notification.show(`Linked "${trainerName}" to Pokéball Belt!`, 'SUCCESS');
    }
}

/**
 * Determines whether a trainer profile in PC Storage is linked to the active character sheet/token.
 */
export function isTrainerLinkedToActiveSheet(
    trainer: TrainerRoster | undefined,
    activeTokenId: string | null | undefined,
    identity: { mode?: string; nickname?: string; species?: string; entityId?: string }
): boolean {
    if (!trainer || !trainer.isLinked) return false;
    const isTrainerMode = identity.mode === 'Trainer' || identity.mode === 'Trainer (Special)';
    if (!isTrainerMode) return false;

    if (activeTokenId && (trainer.mapTokenId === activeTokenId || trainer.savedTokenItem?.id === activeTokenId)) {
        return true;
    }
    if (
        identity.entityId &&
        (trainer.id === identity.entityId || trainer.fullMetadata?.entityId === identity.entityId)
    ) {
        return true;
    }
    const activeName = (identity.nickname || identity.species || '').trim().toLowerCase();
    const trainerName = (trainer.name || '').trim().toLowerCase();
    if (
        (!activeTokenId || !trainer.mapTokenId || activeTokenId === trainer.mapTokenId) &&
        trainerName &&
        activeName &&
        trainerName !== 'trainer' &&
        trainerName !== 'unnamed character' &&
        trainerName === activeName
    ) {
        return true;
    }

    return false;
}
