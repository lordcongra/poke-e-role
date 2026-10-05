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

/**
 * Checks if the trainer's token is actively placed on the current scene.
 */
function parseNumericMeta(
    keys: string[],
    sources: (Record<string, unknown> | null | undefined)[],
    fallback: number
): number {
    for (const src of sources) {
        if (!src) continue;
        for (const k of keys) {
            const val = src[k];
            if (val !== undefined && val !== null && val !== '') {
                const num = Number(val);
                if (!isNaN(num)) return num;
            }
        }
    }
    return fallback;
}

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

    const hpCurr = store.health.hpCurr ?? parseNumericMeta(['hp-curr', 'hp', 'currentHp'], sources, 10);
    const hpMax = store.health.hpMax ?? parseNumericMeta(['hp-max-display', 'hpMax', 'maxHp'], sources, 10);
    const willCurr = store.will.willCurr ?? parseNumericMeta(['will-curr', 'will', 'currentWill'], sources, 5);
    const willMax = store.will.willMax ?? parseNumericMeta(['will-max-display', 'willMax', 'maxWill'], sources, 5);

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
 * Builds a PcPokemonSummary representation of a Trainer profile for sheet viewing.
 */
export function buildTrainerSummary(trainer: TrainerRoster): import('../../types/pcStorageTypes').PcPokemonSummary {
    let localMeta: Record<string, unknown> | null = null;
    if (typeof window !== 'undefined' && window.localStorage) {
        try {
            const raw = window.localStorage.getItem(`pkr_char_${trainer.id}`);
            if (raw) localMeta = JSON.parse(raw);
            if (!localMeta && trainer.savedTokenItem?.id) {
                const rawTok = window.localStorage.getItem(`pkr_char_${trainer.savedTokenItem.id}`);
                if (rawTok) localMeta = JSON.parse(rawTok);
            }
        } catch {}
    }

    const tokenMeta =
        (trainer.savedTokenItem?.metadata?.[METADATA_ID] as Record<string, unknown>) ||
        (trainer.savedTokenItem?.metadata?.['pokerole-pmd-extension/stats'] as Record<string, unknown>) ||
        null;

    const sources = [tokenMeta, trainer.fullMetadata, localMeta];

    const store = useCharacterStore.getState();
    const isStoreTrainer = store.identity.mode === 'Trainer' || (store.identity.rank as string) === 'Trainer';
    const storeMatchesTrainer =
        isStoreTrainer &&
        (store.identity.nickname === trainer.name || store.identity.species === trainer.name || !trainer.name);

    const hpCurr =
        storeMatchesTrainer && store.health.hpCurr !== undefined
            ? store.health.hpCurr
            : parseNumericMeta(['hp-curr', 'hp', 'currentHp'], sources, 10);

    const hpMax =
        storeMatchesTrainer && store.health.hpMax !== undefined
            ? store.health.hpMax
            : parseNumericMeta(['hp-max-display', 'hpMax', 'maxHp'], sources, 10);

    const willCurr =
        storeMatchesTrainer && store.will.willCurr !== undefined
            ? store.will.willCurr
            : parseNumericMeta(['will-curr', 'will', 'currentWill'], sources, 5);

    const willMax =
        storeMatchesTrainer && store.will.willMax !== undefined
            ? store.will.willMax
            : parseNumericMeta(['will-max-display', 'willMax', 'maxWill'], sources, 5);

    const trainerType1 =
        (tokenMeta?.type1 as string) || (localMeta?.type1 as string) || (trainer.fullMetadata?.type1 as string) || '';
    const trainerType2 =
        (tokenMeta?.type2 as string) ||
        (localMeta?.type2 as string) ||
        (trainer.fullMetadata?.type2 as string) ||
        undefined;
    const resolvedAvatar =
        (tokenMeta?.['token-image-url'] as string) ||
        (localMeta?.['token-image-url'] as string) ||
        (localMeta?.tokenImageUrl as string) ||
        (trainer.fullMetadata?.['token-image-url'] as string) ||
        trainer.avatarUrl;
    const primaryOverride =
        (trainer.fullMetadata?.['theme-primary-override'] as string) ||
        (trainer.fullMetadata?.themePrimaryOverride as string) ||
        ((tokenMeta?.['theme-primary-override'] as string) ?? '') ||
        (storeMatchesTrainer ? store.identity.themePrimaryOverride : '') ||
        '';
    const secondaryOverride =
        (trainer.fullMetadata?.['theme-secondary-override'] as string) ||
        (trainer.fullMetadata?.themeSecondaryOverride as string) ||
        ((tokenMeta?.['theme-secondary-override'] as string) ?? '') ||
        (storeMatchesTrainer ? store.identity.themeSecondaryOverride : '') ||
        '';

    return {
        entityId: trainer.id,
        name: trainer.name,
        species: trainer.name,
        rank: 'Trainer',
        type1: trainerType1,
        type2: trainerType2,
        hp: hpCurr,
        maxHp: hpMax,
        will: willCurr,
        maxWill: willMax,
        tokenImageUrl: resolvedAvatar,
        isOnMap: Boolean(trainer.mapTokenId),
        mapTokenId: trainer.mapTokenId,
        savedTokenItem: trainer.savedTokenItem,
        fullMetadata: {
            ...(trainer.fullMetadata || {}),
            name: trainer.name,
            nickname: trainer.name,
            species: trainer.name,
            mode: 'Trainer',
            rank: 'Trainer',
            'str-base': trainer.fullMetadata?.['str-base'] ?? 1,
            'dex-base': trainer.fullMetadata?.['dex-base'] ?? 1,
            'vit-base': trainer.fullMetadata?.['vit-base'] ?? 1,
            'ins-base': trainer.fullMetadata?.['ins-base'] ?? 1,
            'spe-base': trainer.fullMetadata?.['spe-base'] ?? 1,
            type1: trainerType1,
            type2: trainerType2 || '',
            'token-image-url': trainer.avatarUrl,
            'hp-curr': hpCurr,
            'hp-max-display': hpMax,
            'will-curr': willCurr,
            'will-max-display': willMax,
            'theme-primary-override': primaryOverride,
            'theme-secondary-override': secondaryOverride,
            themePrimaryOverride: primaryOverride,
            themeSecondaryOverride: secondaryOverride
        },
        lastModified: 0
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

        const hpMax = Number(trainer.fullMetadata?.['hp-max-display'] || trainer.fullMetadata?.['hpMax']) || 10;
        const rawHpCurr = trainer.fullMetadata?.['hp-curr'] ?? trainer.fullMetadata?.['hpCurr'];
        const hpCurr =
            rawHpCurr !== undefined && rawHpCurr !== null && !isNaN(Number(rawHpCurr)) ? Number(rawHpCurr) : hpMax;

        const willMax = Number(trainer.fullMetadata?.['will-max-display'] || trainer.fullMetadata?.['willMax']) || 5;
        const rawWillCurr = trainer.fullMetadata?.['will-curr'] ?? trainer.fullMetadata?.['willCurr'];
        const willCurr =
            rawWillCurr !== undefined && rawWillCurr !== null && !isNaN(Number(rawWillCurr))
                ? Number(rawWillCurr)
                : willMax;

        const metaObj: Record<string, unknown> = {
            ...(trainer.fullMetadata || {}),
            name: trainer.name,
            nickname: trainer.name,
            species: trainer.name,
            mode: 'Trainer',
            rank: 'Trainer',
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
            const maxDim = Math.max(dims.width, dims.height);
            const imageContent = {
                url: trainerUrl,
                mime: trainerUrl.endsWith('.svg') ? 'image/svg+xml' : 'image/png',
                width: dims.width,
                height: dims.height
            };
            const imageGrid = {
                dpi: maxDim, // Fits within 1 standard grid unit by default
                offset: { x: dims.width / 2, y: dims.height / 2 }
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
                trainerName: trainer.name
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
    };
    role?: 'PLAYER' | 'GM';
    saveTrainerProfile: (t: TrainerRoster) => void;
}): Promise<void> {
    const { trainer, campaign, canLinkActiveTrainer, identity, role, saveTrainerProfile } = params;
    if (!trainer || !campaign) return;

    if (!canLinkActiveTrainer) {
        const store = useCharacterStore.getState();
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
                OBR.notification.show(
                    'Only tokens set to Trainer or Trainer (Special) mode can be linked to the belt.',
                    'WARNING'
                );
            }
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
        const myId = OBR.isAvailable ? await OBR.player.getId().catch(() => undefined) : undefined;
        const claim = savedItem?.metadata?.['pokerole-pmd-extension/claimed-by'] as { playerId?: string } | undefined;
        if (claim?.playerId && myId && claim.playerId !== myId) {
            if (OBR.isAvailable) {
                OBR.notification.show('Cannot link: This trainer token belongs to another player.', 'WARNING');
            }
            return;
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
