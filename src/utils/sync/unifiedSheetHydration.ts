import OBR, { type Item, type Image } from '@owlbear-rodeo/sdk';
import { useCharacterStore } from '../../store/useCharacterStore';
import { setActiveTokenId, saveToOwlbear } from './obr';
import { METADATA_ID } from '../../hooks/owlbearSync/owlbearSyncConstants';
import { extractEntityId, renderTokenGraphicsForMeta } from '../../hooks/owlbearSync/setupOwlbearTokenSync';
import { resolveCharacterThemeColors, applyDynamicThemeColors } from '../common/colorUtils';
import { harvestTokensItemArt, setItemArt } from '../graphics/itemArtCatalog';
import { fetchPokemonData } from '../api/api';
import { extractTokenImage } from '../combat/initiativeHelpers';

export interface HydrateSheetParams {
    targetId: string;
    overrideRole?: 'PLAYER' | 'GM';
    sourceMeta?: Record<string, unknown>;
    entityId?: string;
    tokenItem?: Item;
    saveIfNewer?: boolean;
    applyTheme?: boolean;
    fetchSpecies?: boolean;
}

export interface HydrateSheetResult {
    resolvedMeta: Record<string, unknown>;
    source: 'pc_summary' | 'token_or_local';
    entityId?: string;
    lastModified: number;
}

/**
 * Single source of truth for opening, inspecting, or hydrating character sheets
 * across canvas tokens, PC storage, Battle Organizer, and Standalone sidebar.
 * Harmonizes timestamp comparisons, PC summary fallback, token updates, and theming.
 */
export async function hydrateActiveSheet(params: HydrateSheetParams): Promise<HydrateSheetResult> {
    const {
        targetId,
        overrideRole,
        sourceMeta,
        tokenItem,
        saveIfNewer = false,
        applyTheme = true,
        fetchSpecies = true
    } = params;

    const store = useCharacterStore.getState();
    const currentRole =
        overrideRole ||
        (OBR.isAvailable ? await OBR.player.getRole().catch(() => undefined) : undefined) ||
        store.role ||
        'PLAYER';

    // 0. Bind active token ID immediately so any save operations target the correct token
    setActiveTokenId(targetId);

    // 1. Resolve source metadata if not directly provided
    const rawMeta =
        sourceMeta ||
        ((tokenItem?.metadata?.[METADATA_ID] ||
            tokenItem?.metadata?.['pokerole-pmd-extension/stats'] ||
            tokenItem?.metadata) as Record<string, unknown> | undefined) ||
        {};

    // 2. Resolve entityId
    let resolvedEntityId = params.entityId;
    if (!resolvedEntityId && tokenItem) {
        resolvedEntityId = extractEntityId(tokenItem);
    }
    if (!resolvedEntityId && rawMeta) {
        resolvedEntityId = (rawMeta.entityId as string) || (rawMeta['entityId'] as string) || undefined;
    }
    if (!resolvedEntityId && store.pcData?.pokemonSummaries?.[targetId]) {
        resolvedEntityId = targetId;
    }

    // 3. Lookup PC Summary & Trainer Roster to evaluate timestamps
    const existingSum = resolvedEntityId ? store.pcData?.pokemonSummaries?.[resolvedEntityId] : undefined;
    const activeCamp = store.pcData?.campaigns?.[store.pcData?.activeCampaignId];
    const existingTrainer =
        resolvedEntityId && activeCamp?.trainers ? activeCamp.trainers[resolvedEntityId] : undefined;

    const tMod = Number(rawMeta?.lastModified) || 0;
    const pMod = Number(existingSum?.lastModified) || Number(existingTrainer?.fullMetadata?.lastModified) || 0;

    let finalMeta: Record<string, unknown>;
    let source: 'pc_summary' | 'token_or_local';
    let finalMod: number;

    const summaryMeta =
        existingSum?.fullMetadata || (existingTrainer?.fullMetadata as Record<string, unknown> | undefined);

    if (summaryMeta && pMod > tMod) {
        finalMeta = summaryMeta;
        source = 'pc_summary';
        finalMod = pMod;

        // If the token is live on canvas and the PC is strictly newer, update the scene token
        if (saveIfNewer && OBR.isAvailable) {
            saveToOwlbear(summaryMeta).catch(() => {});
            OBR.scene.items
                .updateItems([targetId], (items) => {
                    for (const item of items) {
                        if (!item.metadata[METADATA_ID]) item.metadata[METADATA_ID] = {};
                        Object.assign(item.metadata[METADATA_ID] as Record<string, unknown>, summaryMeta);
                        if (item.metadata['pokerole-pmd-extension/stats']) {
                            Object.assign(
                                item.metadata['pokerole-pmd-extension/stats'] as Record<string, unknown>,
                                summaryMeta
                            );
                        }
                    }
                })
                .catch(() => {});
        }
    } else {
        finalMeta = rawMeta;
        source = 'token_or_local';
        finalMod = tMod || Date.now();

        // If token on canvas is strictly newer than PC storage, update PC summary to reflect live combat stats
        if (existingSum && tMod > pMod) {
            const curHp =
                typeof rawMeta['hp-curr'] === 'number'
                    ? rawMeta['hp-curr']
                    : !isNaN(Number(rawMeta['hp-curr'])) && rawMeta['hp-curr'] !== ''
                      ? Number(rawMeta['hp-curr'])
                      : existingSum.hp;
            const curMaxHp =
                typeof rawMeta['hp-max-display'] === 'number'
                    ? rawMeta['hp-max-display']
                    : !isNaN(Number(rawMeta['hp-max-display'])) && rawMeta['hp-max-display'] !== ''
                      ? Number(rawMeta['hp-max-display'])
                      : existingSum.maxHp;
            const curWill =
                typeof rawMeta['will-curr'] === 'number'
                    ? rawMeta['will-curr']
                    : !isNaN(Number(rawMeta['will-curr'])) && rawMeta['will-curr'] !== ''
                      ? Number(rawMeta['will-curr'])
                      : existingSum.will;
            const curMaxWill =
                typeof rawMeta['will-max-display'] === 'number'
                    ? rawMeta['will-max-display']
                    : !isNaN(Number(rawMeta['will-max-display'])) && rawMeta['will-max-display'] !== ''
                      ? Number(rawMeta['will-max-display'])
                      : existingSum.maxWill;

            store.updatePokemonSummary({
                ...existingSum,
                hp: curHp,
                maxHp: curMaxHp,
                will: curWill,
                maxWill: curMaxWill,
                mapTokenId: targetId,
                fullMetadata: { ...(existingSum.fullMetadata || {}), ...rawMeta },
                lastModified: tMod
            });
        } else if (existingTrainer && resolvedEntityId && tMod > pMod) {
            store.updateTrainerProfile(resolvedEntityId, {
                mapTokenId: targetId,
                fullMetadata: { ...(existingTrainer.fullMetadata || {}), ...rawMeta }
            });
        }
    }

    // 4. Hydrate character store with resolved metadata
    store.setTokenData(targetId, currentRole);
    store.loadFromOwlbear(finalMeta);
    if (resolvedEntityId) {
        store.setIdentity('entityId', resolvedEntityId);
    }

    // 5. Reconcile token image
    const imgItem = tokenItem as Image | undefined;
    const resolvedImgUrl =
        imgItem?.image?.url ||
        (finalMeta['token-image-url'] as string) ||
        (finalMeta['tokenImageUrl'] as string) ||
        extractTokenImage(finalMeta) ||
        existingSum?.tokenImageUrl ||
        existingTrainer?.avatarUrl ||
        null;
    if (resolvedImgUrl) {
        store.setIdentity('tokenImageUrl', resolvedImgUrl);
    }

    // 6. Harvest item artwork from inventory
    if (finalMeta['inv-data']) {
        try {
            const rawInv = finalMeta['inv-data'];
            const items = typeof rawInv === 'string' ? JSON.parse(rawInv) : rawInv;
            if (Array.isArray(items)) {
                for (const it of items) {
                    if (it?.name && it?.imageUrl && it.imageUrl !== 'none') {
                        setItemArt(it.name, it.imageUrl);
                    }
                }
            }
        } catch {}
    }

    // 7. Update canvas HUD graphics if tokenItem is available
    if (tokenItem && OBR.isAvailable) {
        harvestTokensItemArt([tokenItem]).catch(() => {});
        renderTokenGraphicsForMeta(tokenItem, finalMeta, currentRole, false).catch((err) =>
            console.warn('[SheetHydrator] Failed to render graphics:', err)
        );
    }

    // 8. Apply dynamic theme colors if requested
    if (applyTheme) {
        const fresh = useCharacterStore.getState();
        const resolvedTheme = resolveCharacterThemeColors(
            {
                type1: fresh.identity.type1,
                type2: fresh.identity.type2,
                themePrimaryOverride: fresh.identity.themePrimaryOverride,
                themeSecondaryOverride: fresh.identity.themeSecondaryOverride
            },
            fresh.roomCustomTypes
        );
        applyDynamicThemeColors(resolvedTheme.primary, resolvedTheme.secondary);
    }

    // 9. Fetch species data and learnsets asynchronously if requested
    if (fetchSpecies) {
        const speciesName = String(finalMeta['species'] || '');
        if (speciesName) {
            fetchPokemonData(speciesName)
                .then((data) => {
                    if (data && useCharacterStore.getState().tokenId === targetId) {
                        useCharacterStore.getState().refreshSpeciesData(data as Record<string, unknown>, false);
                    }
                })
                .catch((e) => console.warn('[SheetHydrator] Failed to fetch species data on load:', e));
        } else {
            store.applyLearnset({ Moves: [] });
        }
    }

    return {
        resolvedMeta: finalMeta,
        source,
        entityId: resolvedEntityId,
        lastModified: finalMod
    };
}
