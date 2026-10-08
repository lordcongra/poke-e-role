import OBR, { type Item, type Image } from '@owlbear-rodeo/sdk';
import { useCharacterStore } from '../../store/useCharacterStore';
import { setActiveTokenId, setIsRemoteSyncActive } from './obr';
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

    // 1. Resolve live token metadata vs source metadata
    const tokenItemMeta =
        ((tokenItem?.metadata?.[METADATA_ID] ||
            tokenItem?.metadata?.['pokerole-pmd-extension/stats'] ||
            tokenItem?.metadata) as Record<string, unknown> | undefined) || {};

    const hasLiveTokenData = Boolean(
        tokenItemMeta &&
        Object.keys(tokenItemMeta).length > 0 &&
        (tokenItemMeta['moves-data'] || tokenItemMeta['species'] || tokenItemMeta['hp-curr'] !== undefined)
    );

    const hasSourceData = Boolean(
        sourceMeta &&
        Object.keys(sourceMeta).length > 0 &&
        (sourceMeta['moves-data'] || sourceMeta['species'] || sourceMeta['hp-curr'] !== undefined)
    );

    // 2. Resolve entityId
    let resolvedEntityId = params.entityId;
    if (!resolvedEntityId && tokenItem) {
        resolvedEntityId = extractEntityId(tokenItem);
    }
    if (!resolvedEntityId && hasSourceData) {
        resolvedEntityId = (sourceMeta!['entityId'] as string) || (sourceMeta!.entityId as string) || undefined;
    }
    if (!resolvedEntityId && hasLiveTokenData) {
        resolvedEntityId = (tokenItemMeta['entityId'] as string) || (tokenItemMeta.entityId as string) || undefined;
    }
    if (!resolvedEntityId && store.pcData?.pokemonSummaries?.[targetId]) {
        resolvedEntityId = targetId;
    }

    // 3. Lookup PC Summary & Trainer Roster to evaluate timestamps
    // 3. Lookup PC Summary & Trainer Roster to evaluate timestamps
    const existingSum = resolvedEntityId ? store.pcData?.pokemonSummaries?.[resolvedEntityId] : undefined;
    const activeCamp = store.pcData?.campaigns?.[store.pcData?.activeCampaignId];
    const existingTrainer =
        resolvedEntityId && activeCamp?.trainers ? activeCamp.trainers[resolvedEntityId] : undefined;

    const summaryMeta =
        (hasSourceData ? sourceMeta : undefined) ||
        existingSum?.fullMetadata ||
        (existingTrainer?.fullMetadata as Record<string, unknown> | undefined);

    const hasValidSummary = Boolean(
        summaryMeta &&
        Object.keys(summaryMeta).length > 0 &&
        (summaryMeta['moves-data'] || summaryMeta['species'] || summaryMeta['hp-curr'] !== undefined)
    );

    // Verify whether the live tokenItem actually corresponds to this entity
    const tokenEntityId = tokenItem ? extractEntityId(tokenItem) : undefined;
    const tokenItemSpecies = String(tokenItemMeta['species'] || tokenItem?.name || '');
    const summarySpecies = String(summaryMeta?.['species'] || existingSum?.species || existingSum?.name || '');
    const isSpeciesCompatible =
        !tokenItemSpecies ||
        !summarySpecies ||
        tokenItemSpecies.toLowerCase().includes(summarySpecies.toLowerCase()) ||
        summarySpecies.toLowerCase().includes(tokenItemSpecies.toLowerCase());

    // Clean up contaminated tokens that stole another entity's ID
    if (
        tokenItem &&
        tokenEntityId &&
        resolvedEntityId &&
        tokenEntityId === resolvedEntityId &&
        !isSpeciesCompatible &&
        OBR.isAvailable
    ) {
        OBR.scene.items
            .updateItems([tokenItem.id], (items) => {
                for (const item of items) {
                    if (item.metadata[METADATA_ID])
                        delete (item.metadata[METADATA_ID] as Record<string, unknown>).entityId;
                    if (item.metadata['pokerole-pmd-extension/stats']) {
                        delete (item.metadata['pokerole-pmd-extension/stats'] as Record<string, unknown>).entityId;
                    }
                    delete item.metadata['entityId'];
                }
            })
            .catch(() => {});
    }

    const isTokenEntityMatch = Boolean(
        tokenItem && resolvedEntityId && tokenEntityId && tokenEntityId === resolvedEntityId && isSpeciesCompatible
    );

    const effectiveLiveTokenData = hasLiveTokenData && isTokenEntityMatch;

    // Use extension's explicit lastModified timestamps.
    const tMod = effectiveLiveTokenData ? Number(tokenItemMeta?.lastModified) || 0 : 0;
    const pMod =
        Number(summaryMeta?.lastModified) ||
        Number(existingSum?.lastModified) ||
        Number(existingTrainer?.fullMetadata?.lastModified) ||
        0;

    let finalMeta: Record<string, unknown>;
    let source: 'pc_summary' | 'token_or_local';
    let finalMod: number;

    const pcIsStrictlyNewer = Boolean(hasValidSummary && (pMod >= tMod || !effectiveLiveTokenData));

    if (pcIsStrictlyNewer && summaryMeta) {
        finalMeta = { ...summaryMeta };
        source = 'pc_summary';
        finalMod = pMod;

        // If the token is live on canvas and the PC is strictly newer, update the scene token
        if (saveIfNewer && OBR.isAvailable && isTokenEntityMatch && tokenItem) {
            OBR.scene.items
                .updateItems([tokenItem.id], (items) => {
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
    } else if (effectiveLiveTokenData) {
        // Live token on canvas has valid data and is newer or equally recent.
        // PC Summary holds authoritative character identity, species, rank, and move list.
        // Canvas token provides live combat state (current HP, current Will, temp stats, statuses).
        const baseMeta = summaryMeta && Object.keys(summaryMeta).length > 0 ? summaryMeta : tokenItemMeta;
        finalMeta = { ...baseMeta, ...tokenItemMeta };

        // Safeguard: Authoritative fields from PC summary MUST NEVER be overwritten by live token!
        if (summaryMeta?.['species']) finalMeta['species'] = summaryMeta['species'];
        if (summaryMeta && ('nickname' in summaryMeta || summaryMeta['nickname'] !== undefined)) {
            finalMeta['nickname'] = summaryMeta['nickname'] ?? '';
        }
        if (summaryMeta?.['rank']) finalMeta['rank'] = summaryMeta['rank'];
        if (summaryMeta?.['moves-data'] && summaryMeta['moves-data'] !== '[]') {
            finalMeta['moves-data'] = summaryMeta['moves-data'];
        }
        if (summaryMeta?.['type1']) finalMeta['type1'] = summaryMeta['type1'];
        if (summaryMeta?.['type2'] !== undefined) finalMeta['type2'] = summaryMeta['type2'];
        if (summaryMeta?.['ability']) finalMeta['ability'] = summaryMeta['ability'];
        if (summaryMeta?.['ability-tags']) finalMeta['ability-tags'] = summaryMeta['ability-tags'];
        if (summaryMeta?.['ability-list']) finalMeta['ability-list'] = summaryMeta['ability-list'];
        if (summaryMeta?.['dex-id']) finalMeta['dex-id'] = summaryMeta['dex-id'];
        if (summaryMeta?.['dex-category']) finalMeta['dex-category'] = summaryMeta['dex-category'];
        if (summaryMeta?.['dex-description']) finalMeta['dex-description'] = summaryMeta['dex-description'];
        if (summaryMeta?.['token-image-url']) finalMeta['token-image-url'] = summaryMeta['token-image-url'];

        // Fallback: If live token metadata was missing any core stats, socials, or limits, pull from PC summary
        if (summaryMeta) {
            for (const stat of ['str', 'dex', 'vit', 'spe', 'ins', 'tou', 'coo', 'bea', 'cut', 'cle']) {
                if (finalMeta[`${stat}-base`] === undefined && summaryMeta[`${stat}-base`] !== undefined) {
                    finalMeta[`${stat}-base`] = summaryMeta[`${stat}-base`];
                }
                if (finalMeta[`${stat}-rank`] === undefined && summaryMeta[`${stat}-rank`] !== undefined) {
                    finalMeta[`${stat}-rank`] = summaryMeta[`${stat}-rank`];
                }
                if (finalMeta[`${stat}-limit`] === undefined && summaryMeta[`${stat}-limit`] !== undefined) {
                    finalMeta[`${stat}-limit`] = summaryMeta[`${stat}-limit`];
                }
            }
        }

        source = 'token_or_local';
        finalMod = tMod || Date.now();
        if (!finalMeta.lastModified) finalMeta.lastModified = finalMod;

        // If live token is strictly newer than PC storage, update PC summary to reflect live combat stats
        if (existingSum && tMod > pMod) {
            const curHp =
                typeof tokenItemMeta['hp-curr'] === 'number'
                    ? tokenItemMeta['hp-curr']
                    : !isNaN(Number(tokenItemMeta['hp-curr'])) && tokenItemMeta['hp-curr'] !== ''
                      ? Number(tokenItemMeta['hp-curr'])
                      : existingSum.hp;
            const curMaxHp =
                typeof tokenItemMeta['hp-max-display'] === 'number'
                    ? tokenItemMeta['hp-max-display']
                    : !isNaN(Number(tokenItemMeta['hp-max-display'])) && tokenItemMeta['hp-max-display'] !== ''
                      ? Number(tokenItemMeta['hp-max-display'])
                      : existingSum.maxHp;
            const curWill =
                typeof tokenItemMeta['will-curr'] === 'number'
                    ? tokenItemMeta['will-curr']
                    : !isNaN(Number(tokenItemMeta['will-curr'])) && tokenItemMeta['will-curr'] !== ''
                      ? Number(tokenItemMeta['will-curr'])
                      : existingSum.will;
            const curMaxWill =
                typeof tokenItemMeta['will-max-display'] === 'number'
                    ? tokenItemMeta['will-max-display']
                    : !isNaN(Number(tokenItemMeta['will-max-display'])) && tokenItemMeta['will-max-display'] !== ''
                      ? Number(tokenItemMeta['will-max-display'])
                      : existingSum.maxWill;

            store.updatePokemonSummary({
                ...existingSum,
                hp: curHp,
                maxHp: curMaxHp,
                will: curWill,
                maxWill: curMaxWill,
                mapTokenId: targetId,
                fullMetadata: finalMeta,
                lastModified: tMod
            });
        } else if (existingTrainer && resolvedEntityId && tMod > pMod) {
            store.updateTrainerProfile(resolvedEntityId, {
                mapTokenId: targetId,
                fullMetadata: { ...(existingTrainer.fullMetadata || {}), ...tokenItemMeta }
            });
        }
    } else if (hasValidSummary && summaryMeta) {
        finalMeta = { ...summaryMeta };
        source = 'pc_summary';
        finalMod = pMod || Date.now();
    } else {
        finalMeta = hasSourceData ? { ...sourceMeta! } : { ...tokenItemMeta };
        source = hasSourceData ? 'pc_summary' : 'token_or_local';
        finalMod = tMod || pMod || Date.now();
        if (!finalMeta.lastModified) finalMeta.lastModified = finalMod;
    }

    // 4. Hydrate character store with resolved metadata
    store.setTokenData(targetId, currentRole);
    setIsRemoteSyncActive(true, 150);
    if (resolvedEntityId) {
        finalMeta.entityId = resolvedEntityId;
    }

    // Extract token image and name if available (especially on fresh or uninitialized tokens)
    const imgItem = tokenItem as Image | undefined;
    const defaultTokenUrl = `${(import.meta.env.BASE_URL || '/').replace(/\/$/, '')}/pokeball-token.svg`;
    let rawImgUrl =
        imgItem?.image?.url ||
        (finalMeta['token-image-url'] as string) ||
        (finalMeta['tokenImageUrl'] as string) ||
        extractTokenImage(finalMeta) ||
        existingSum?.tokenImageUrl ||
        existingTrainer?.avatarUrl ||
        null;
    if (!rawImgUrl || rawImgUrl.endsWith('pokeball.svg')) {
        rawImgUrl = defaultTokenUrl;
    }
    const resolvedImgUrl = rawImgUrl;
    if (
        resolvedImgUrl &&
        (!finalMeta['token-image-url'] || (finalMeta['token-image-url'] as string).endsWith('pokeball.svg'))
    ) {
        finalMeta['token-image-url'] = resolvedImgUrl;
    }
    if (
        resolvedImgUrl &&
        (!finalMeta['tokenImageUrl'] || (finalMeta['tokenImageUrl'] as string).endsWith('pokeball.svg'))
    ) {
        finalMeta['tokenImageUrl'] = resolvedImgUrl;
    }

    store.loadFromOwlbear(finalMeta);

    // 5. Reconcile token image
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
