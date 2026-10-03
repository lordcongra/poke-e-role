import { useEffect, useRef, useState, useCallback } from 'react';
import OBR from '@owlbear-rodeo/sdk';
import type { PcPokemonSummary } from '../../../types/pcStorageTypes';
import type { CharacterState, CustomType } from '../../../store/storeTypes';
import { useCharacterStore } from '../../../store/useCharacterStore';
import { setActiveTokenId, setIsPcSheetActive, METADATA_ID } from '../../../utils/sync/obr';
import { flattenStateToMetadata } from '../../../utils/sync/stateMapper';
import { resolveCharacterThemeColors, applyDynamicThemeColors } from '../../../utils/common/colorUtils';

/**
 * Pure predicate checking if any persistent character sheet slice changed in Zustand.
 * Ignores non-character slices (pcData, homebrew, generatorConfig, etc.) to prevent infinite loops.
 */
export function hasCharacterSheetChanged(state: CharacterState, prevState: CharacterState): boolean {
    return (
        state.health !== prevState.health ||
        state.will !== prevState.will ||
        state.derived !== prevState.derived ||
        state.extras !== prevState.extras ||
        state.stats !== prevState.stats ||
        state.socials !== prevState.socials ||
        state.skills !== prevState.skills ||
        state.moves !== prevState.moves ||
        state.skillChecks !== prevState.skillChecks ||
        state.wishlist !== prevState.wishlist ||
        state.inventory !== prevState.inventory ||
        state.notes !== prevState.notes ||
        state.customInfo !== prevState.customInfo ||
        state.tp !== prevState.tp ||
        state.currency !== prevState.currency ||
        state.passives !== prevState.passives ||
        state.statuses !== prevState.statuses ||
        state.effects !== prevState.effects ||
        state.trackers !== prevState.trackers ||
        state.extraCategories !== prevState.extraCategories ||
        state.identity !== prevState.identity
    );
}

export interface UsePcSheetSyncParams {
    currentSummary: PcPokemonSummary;
    onUpdateSummary: (summary: PcPokemonSummary) => void;
    mode: string;
    roomCustomTypes: CustomType[];
}

export interface UsePcSheetSyncResult {
    loading: boolean;
    syncNow: (targetSummary?: PcPokemonSummary) => void;
    flushSync: (targetSummary?: PcPokemonSummary) => void;
}

export function usePcSheetSync({
    currentSummary,
    onUpdateSummary,
    mode,
    roomCustomTypes
}: UsePcSheetSyncParams): UsePcSheetSyncResult {
    const [loading, setLoading] = useState(true);

    const isHydratingRef = useRef(false);
    const isDirtyRef = useRef(false);
    const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const prevThemeRef = useRef<{ primary: string; secondary: string } | null>(null);
    const prevMetaRef = useRef<Record<string, unknown> | null>(null);
    const prevTokenIdRef = useRef<string | null>(null);

    const currentSummaryRef = useRef(currentSummary);
    currentSummaryRef.current = currentSummary;

    const onUpdateSummaryRef = useRef(onUpdateSummary);
    onUpdateSummaryRef.current = onUpdateSummary;

    // Core two-way persistence: serializes active Zustand store into metadata and summaries
    const syncNow = useCallback((targetSummary?: PcPokemonSummary) => {
        if (isHydratingRef.current) return;
        if (syncTimeoutRef.current) {
            clearTimeout(syncTimeoutRef.current);
            syncTimeoutRef.current = null;
        }
        isDirtyRef.current = false;

        const currentStore = useCharacterStore.getState();
        const curr = targetSummary || currentSummaryRef.current;
        const nextMeta = flattenStateToMetadata(currentStore);
        const nextHp = currentStore.health.hpCurr ?? curr.hp;
        const nextMaxHp = currentStore.health.hpMax ?? curr.maxHp;
        const nextWill = currentStore.will.willCurr ?? curr.will;
        const nextMaxWill = currentStore.will.willMax ?? curr.maxWill;
        const nextName = currentStore.identity.nickname || currentStore.identity.species || curr.name;

        // Keep savedTokenItem metadata synchronized if cached token item exists
        let updatedSavedTokenItem = curr.savedTokenItem;
        if (updatedSavedTokenItem) {
            updatedSavedTokenItem = {
                ...updatedSavedTokenItem,
                name: nextName,
                metadata: {
                    ...(updatedSavedTokenItem.metadata || {}),
                    [METADATA_ID]: {
                        ...((updatedSavedTokenItem.metadata?.[METADATA_ID] as Record<string, unknown>) || {}),
                        ...nextMeta
                    },
                    'pokerole-pmd-extension/stats': {
                        ...((updatedSavedTokenItem.metadata?.['pokerole-pmd-extension/stats'] as Record<
                            string,
                            unknown
                        >) || {}),
                        ...nextMeta
                    }
                }
            };
        }

        onUpdateSummaryRef.current({
            ...curr,
            name: nextName,
            species: currentStore.identity.species || curr.species,
            rank: currentStore.identity.rank || curr.rank,
            type1: currentStore.identity.type1 || curr.type1,
            type2: currentStore.identity.type2,
            hp: nextHp,
            maxHp: nextMaxHp,
            will: nextWill,
            maxWill: nextMaxWill,
            tokenImageUrl: currentStore.identity.tokenImageUrl || curr.tokenImageUrl,
            fullMetadata: nextMeta,
            savedTokenItem: updatedSavedTokenItem,
            lastModified: Date.now()
        });

        // If the token IS currently placed on the map, push metadata to OBR scene item
        if (curr.isOnMap && curr.mapTokenId && OBR.isAvailable) {
            OBR.scene.items
                .updateItems([curr.mapTokenId], (items) => {
                    for (const item of items) {
                        if (!item.metadata[METADATA_ID]) item.metadata[METADATA_ID] = {};
                        Object.assign(item.metadata[METADATA_ID] as Record<string, unknown>, nextMeta);
                        if (!item.metadata['pokerole-pmd-extension/stats']) {
                            item.metadata['pokerole-pmd-extension/stats'] = {};
                        }
                        Object.assign(
                            item.metadata['pokerole-pmd-extension/stats'] as Record<string, unknown>,
                            nextMeta
                        );
                    }
                })
                .catch((err) => {
                    console.error('[usePcSheetSync] Failed to sync live map token item:', err);
                });
        }
    }, []);

    const flushSync = useCallback(
        (targetSummary?: PcPokemonSummary) => {
            if (isDirtyRef.current || syncTimeoutRef.current) {
                syncNow(targetSummary || currentSummaryRef.current);
            }
        },
        [syncNow]
    );

    // Save previous character state and theme on mount, restore on unmount
    useEffect(() => {
        setIsPcSheetActive(true);
        if (OBR.isAvailable) {
            OBR.player.select([]).catch(() => {});
        }

        const store = useCharacterStore.getState();
        prevTokenIdRef.current = store.tokenId;
        prevMetaRef.current = flattenStateToMetadata(store);

        prevThemeRef.current = {
            primary:
                document.documentElement.style.getPropertyValue('--dynamic-type-color') ||
                document.body.style.getPropertyValue('--dynamic-type-color') ||
                '',
            secondary:
                document.documentElement.style.getPropertyValue('--dynamic-secondary-color') ||
                document.body.style.getPropertyValue('--dynamic-secondary-color') ||
                ''
        };

        return () => {
            setIsPcSheetActive(false);
            if (isDirtyRef.current || syncTimeoutRef.current) {
                syncNow(currentSummaryRef.current);
            }
            if (syncTimeoutRef.current) {
                clearTimeout(syncTimeoutRef.current);
                syncTimeoutRef.current = null;
            }

            // Restore previous character
            if (prevMetaRef.current) {
                setActiveTokenId(prevTokenIdRef.current);
                const s = useCharacterStore.getState();
                s.setTokenData(prevTokenIdRef.current || '', s.role || 'PLAYER');
                s.loadFromOwlbear(prevMetaRef.current);
            }
            // Restore previous theme
            if (prevThemeRef.current) {
                applyDynamicThemeColors(prevThemeRef.current.primary, prevThemeRef.current.secondary);
            }
        };
    }, [syncNow]);

    // Load Pokémon metadata whenever currentSummary changes & listen for store changes
    useEffect(() => {
        const activeEntity = currentSummary;
        isHydratingRef.current = true;
        isDirtyRef.current = false;
        setLoading(true);

        const store = useCharacterStore.getState();
        const targetTokenId =
            activeEntity.isOnMap && activeEntity.mapTokenId ? activeEntity.mapTokenId : activeEntity.entityId;

        setActiveTokenId(targetTokenId);
        store.setTokenData(targetTokenId, store.role || 'PLAYER');

        if (activeEntity.fullMetadata && Object.keys(activeEntity.fullMetadata).length > 0) {
            store.loadFromOwlbear(activeEntity.fullMetadata);
        } else {
            // Fallback basic hydration via metadata
            store.loadFromOwlbear({
                name: activeEntity.name,
                nickname: activeEntity.name,
                species: activeEntity.species,
                rank: activeEntity.rank || 'Starter',
                type1: activeEntity.type1 || 'Normal',
                type2: activeEntity.type2 || '',
                'hp-curr': activeEntity.hp,
                'hp-max-display': activeEntity.maxHp,
                'will-curr': activeEntity.will,
                'will-max-display': activeEntity.maxWill,
                'token-image-url': activeEntity.tokenImageUrl || ''
            });
        }

        if (activeEntity.tokenImageUrl) {
            store.setIdentity('tokenImageUrl', activeEntity.tokenImageUrl);
        }

        setLoading(false);

        const timer = setTimeout(() => {
            isHydratingRef.current = false;
        }, 100);

        const unsub = useCharacterStore.subscribe((state, prevState) => {
            if (isHydratingRef.current) return;
            if (hasCharacterSheetChanged(state, prevState)) {
                isDirtyRef.current = true;
                if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
                syncTimeoutRef.current = setTimeout(() => {
                    syncNow(activeEntity);
                }, 150);
            }
        });

        return () => {
            clearTimeout(timer);
            unsub();
            if (isDirtyRef.current || syncTimeoutRef.current) {
                syncNow(activeEntity);
            }
        };
    }, [currentSummary.entityId, syncNow]);

    // Reactive Theme Application
    useEffect(() => {
        const isTrainer =
            currentSummary.rank === 'Trainer' || currentSummary.fullMetadata?.mode === 'Trainer' || mode === 'Trainer';

        const storeState = useCharacterStore.getState();
        const activePrimaryOverride = storeState.identity.themePrimaryOverride;
        const activeSecondaryOverride = storeState.identity.themeSecondaryOverride;
        const storeType1 = storeState.identity.type1;
        const storeType2 = storeState.identity.type2;

        const rawPrimary =
            (currentSummary.fullMetadata?.['theme-primary-override'] as string) ||
            (currentSummary.fullMetadata?.themePrimaryOverride as string) ||
            activePrimaryOverride ||
            '';

        const rawSecondary =
            (currentSummary.fullMetadata?.['theme-secondary-override'] as string) ||
            (currentSummary.fullMetadata?.themeSecondaryOverride as string) ||
            activeSecondaryOverride ||
            '';

        const themeIdentity = {
            type1: isTrainer ? '' : currentSummary.type1 || storeType1 || '',
            type2: isTrainer ? '' : currentSummary.type2 || storeType2 || '',
            themePrimaryOverride: rawPrimary,
            themeSecondaryOverride: rawSecondary
        };

        const colors = resolveCharacterThemeColors(themeIdentity, roomCustomTypes);
        applyDynamicThemeColors(colors.primary, colors.secondary);
    }, [
        currentSummary.entityId,
        currentSummary.type1,
        currentSummary.type2,
        currentSummary.fullMetadata,
        mode,
        roomCustomTypes
    ]);

    return {
        loading,
        syncNow,
        flushSync
    };
}
