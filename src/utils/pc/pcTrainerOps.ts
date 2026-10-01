import OBR, { buildImage, type Item } from '@owlbear-rodeo/sdk';
import type { TrainerRoster } from '../../types/pcStorageTypes';
import type { CharacterState } from '../../store/storeTypes';
import { useCharacterStore } from '../../store/useCharacterStore';
import { flattenStateToMetadata } from '../sync/stateMapper';
import { METADATA_ID } from '../sync/obr';
import { getAbsolutePokeballUrl, resolveImageDimensions } from '../generators/trainerTokenSpawner';
import { buildGraphicsFromMeta, renderTokenGraphics } from '../graphics/graphicsManager';
import { markTokenAsRecentlySpawned } from './pcModalOps';

/**
 * Checks if the trainer's token is actively placed on the current scene.
 */
export async function checkTrainerOnMap(trainer?: TrainerRoster): Promise<boolean> {
    if (!OBR.isAvailable || !trainer) return false;
    try {
        const items = await OBR.scene.items.getItems();
        return items.some((i) => {
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
    const hpCurr = store.health.hpCurr ?? 10;
    const hpMax = store.health.hpMax ?? 10;
    const willCurr = store.will.willCurr ?? 5;
    const willMax = store.will.willMax ?? 5;
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
    const hpCurr =
        typeof trainer.fullMetadata?.['hp-curr'] === 'number' ? (trainer.fullMetadata['hp-curr'] as number) : 10;
    const hpMax =
        typeof trainer.fullMetadata?.['hp-max-display'] === 'number'
            ? (trainer.fullMetadata['hp-max-display'] as number)
            : 10;
    const willCurr =
        typeof trainer.fullMetadata?.['will-curr'] === 'number' ? (trainer.fullMetadata['will-curr'] as number) : 5;
    const willMax =
        typeof trainer.fullMetadata?.['will-max-display'] === 'number'
            ? (trainer.fullMetadata['will-max-display'] as number)
            : 5;
    const trainerType1 = (trainer.fullMetadata?.type1 as string) || '';
    const trainerType2 = (trainer.fullMetadata?.type2 as string) || undefined;
    const tokenMeta = (trainer.savedTokenItem?.metadata?.[METADATA_ID] as Record<string, unknown>) || {};
    const store = useCharacterStore.getState();
    const isStoreTrainer = store.identity.mode === 'Trainer' || (store.identity.rank as string) === 'Trainer';
    const storeMatchesTrainer =
        isStoreTrainer &&
        (store.identity.nickname === trainer.name || store.identity.species === trainer.name || !trainer.name);

    const primaryOverride =
        (trainer.fullMetadata?.['theme-primary-override'] as string) ||
        (trainer.fullMetadata?.themePrimaryOverride as string) ||
        (tokenMeta['theme-primary-override'] as string) ||
        (storeMatchesTrainer ? store.identity.themePrimaryOverride : '') ||
        '';
    const secondaryOverride =
        (trainer.fullMetadata?.['theme-secondary-override'] as string) ||
        (trainer.fullMetadata?.themeSecondaryOverride as string) ||
        (tokenMeta['theme-secondary-override'] as string) ||
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
        tokenImageUrl: trainer.avatarUrl,
        isOnMap: Boolean(trainer.mapTokenId),
        mapTokenId: trainer.mapTokenId,
        savedTokenItem: trainer.savedTokenItem,
        fullMetadata: {
            ...(trainer.fullMetadata || {}),
            name: trainer.name,
            nickname: trainer.name,
            species: trainer.name,
            mode: 'Trainer',
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
        const hpCurr =
            typeof trainer.fullMetadata?.['hp-curr'] === 'number'
                ? (trainer.fullMetadata['hp-curr'] as number)
                : Number(trainer.fullMetadata?.['hp-curr']) || hpMax;

        const willMax = Number(trainer.fullMetadata?.['will-max-display'] || trainer.fullMetadata?.['willMax']) || 5;
        const willCurr =
            typeof trainer.fullMetadata?.['will-curr'] === 'number'
                ? (trainer.fullMetadata['will-curr'] as number)
                : Number(trainer.fullMetadata?.['will-curr']) || willMax;

        const metaObj: Record<string, unknown> = {
            ...(trainer.fullMetadata || {}),
            name: trainer.name,
            nickname: trainer.name,
            species: trainer.name,
            mode: 'Trainer',
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
