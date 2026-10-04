import { useEffect, useRef, useState, useCallback } from 'react';
import OBR from '@owlbear-rodeo/sdk';
import type { PcPokemonSummary } from '../../../types/pcStorageTypes';
import type { CustomType } from '../../../store/storeTypes';
import { useCharacterStore } from '../../../store/useCharacterStore';
import { setActiveTokenId, setIsPcSheetActive, getIsRemoteSyncActive, METADATA_ID } from '../../../utils/sync/obr';
import { applyDynamicThemeColors } from '../../../utils/common/colorUtils';
import { extractEntityId, renderTokenGraphicsForMeta } from '../../../hooks/owlbearSync/setupOwlbearTokenSync';
import { broadcastGmPc, broadcastPlayerPc } from '../../../hooks/owlbearSync/setupOwlbearPcSync';
import { hydrateActiveSheet } from '../../../utils/sync/unifiedSheetHydration';
import {
    hasCharacterSheetChanged,
    buildSummaryFromStore,
    resolvePcSheetThemeColors,
    restorePreviousCharacterState
} from './pcSheetSyncUtils';

export { hasCharacterSheetChanged };

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
    const isUnmountingRef = useRef(false);
    const isDirtyRef = useRef(false);
    const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const remoteHydrateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const activeUnsubRef = useRef<(() => void) | null>(null);

    const prevThemeRef = useRef<{ primary: string; secondary: string } | null>(null);
    const prevMetaRef = useRef<Record<string, unknown> | null>(null);
    const prevTokenIdRef = useRef<string | null>(null);
    const initialMapTokenIdRef = useRef<string | undefined>(
        currentSummary.mapTokenId || currentSummary.savedTokenItem?.id
    );
    const initialEntityIdRef = useRef<string>(currentSummary.entityId);

    const currentSummaryRef = useRef(currentSummary);
    currentSummaryRef.current = currentSummary;

    const onUpdateSummaryRef = useRef(onUpdateSummary);
    onUpdateSummaryRef.current = onUpdateSummary;

    const modeRef = useRef(mode);
    modeRef.current = mode;

    const roomCustomTypesRef = useRef(roomCustomTypes);
    roomCustomTypesRef.current = roomCustomTypes;

    // Core two-way persistence: serializes active Zustand store into metadata and summaries
    const syncNow = useCallback((targetSummary?: PcPokemonSummary) => {
        // Guard against running sync during remote hydration unless this is a dirty local edit
        if (getIsRemoteSyncActive() || (isHydratingRef.current && !isDirtyRef.current)) return;
        if (syncTimeoutRef.current) {
            clearTimeout(syncTimeoutRef.current);
            syncTimeoutRef.current = null;
        }
        isDirtyRef.current = false;

        const currentStore = useCharacterStore.getState();
        const curr = { ...currentSummaryRef.current, ...(targetSummary || {}) };
        if (!curr.entityId) return;

        // Ensure curr reflects latest map status from canonical PC storage
        const targetSummaryFromStore = currentStore.pcData.pokemonSummaries[curr.entityId];
        if (targetSummaryFromStore) {
            curr.isOnMap = targetSummaryFromStore.isOnMap;
            curr.mapTokenId = targetSummaryFromStore.mapTokenId;
        }

        // Anti-Contamination Guard: Never let Zustand serialize one entity into another entity's summary!
        if (currentStore.identity.entityId && currentStore.identity.entityId !== curr.entityId) {
            console.warn(
                `[usePcSheetSync] Blocked syncNow: store entityId (${currentStore.identity.entityId}) does not match target summary (${curr.entityId})`
            );
            return;
        }

        const { updatedSummary, nextMeta } = buildSummaryFromStore(currentStore, curr);
        currentSummaryRef.current = updatedSummary;
        onUpdateSummaryRef.current(updatedSummary);

        if (OBR.isAvailable) {
            let targetCampId =
                curr.campaignId && currentStore.pcData.campaigns[curr.campaignId]
                    ? curr.campaignId
                    : currentStore.identity.activeRoomCampaignId &&
                        currentStore.pcData.campaigns[currentStore.identity.activeRoomCampaignId]
                      ? currentStore.identity.activeRoomCampaignId
                      : currentStore.pcData.activeCampaignId;

            if (!targetCampId || !currentStore.pcData.campaigns[targetCampId]) {
                targetCampId =
                    Object.keys(currentStore.pcData.campaigns || {}).find(
                        (k) => !currentStore.pcData.campaigns[k]?.isPrivate
                    ) || currentStore.pcData.activeCampaignId;
            }

            const targetCamp = targetCampId ? currentStore.pcData.campaigns[targetCampId] : undefined;
            const targetTrainer =
                (curr.trainerId ? targetCamp?.trainers?.[curr.trainerId] : undefined) ||
                (targetCamp?.activeTrainerId ? targetCamp.trainers?.[targetCamp.activeTrainerId] : undefined);

            const effectiveRole = (currentStore.role as 'PLAYER' | 'GM') || 'PLAYER';
            if (effectiveRole === 'GM') {
                broadcastGmPc({
                    campaignId: targetCampId,
                    trainer: targetTrainer,
                    summaries: [updatedSummary]
                }).catch(() => {});
            } else {
                broadcastPlayerPc({
                    campaignId: targetCampId,
                    trainer: targetTrainer,
                    summaries: [updatedSummary]
                }).catch(() => {});
            }
        }

        // If the token IS currently placed on the map, push metadata to OBR scene item
        if (curr.isOnMap && OBR.isAvailable) {
            const targetMapId = curr.mapTokenId;
            OBR.scene.items
                .updateItems(
                    (it) => it.id === targetMapId || (Boolean(curr.entityId) && extractEntityId(it) === curr.entityId),
                    (items) => {
                        for (const item of items) {
                            item.name = updatedSummary.name;
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
                    }
                )
                .then(async () => {
                    try {
                        const items = await OBR.scene.items.getItems(
                            (it) =>
                                it.id === targetMapId ||
                                (Boolean(curr.entityId) && extractEntityId(it) === curr.entityId)
                        );
                        const currentRole = (currentStore.role as 'PLAYER' | 'GM') || 'PLAYER';
                        for (const item of items) {
                            const meta = (item.metadata[METADATA_ID] ||
                                item.metadata['pokerole-pmd-extension/stats']) as Record<string, unknown>;
                            if (meta) {
                                renderTokenGraphicsForMeta(item, meta, currentRole, false).catch(() => {});
                            }
                        }
                    } catch {}
                })
                .catch((err) => {
                    console.error('[usePcSheetSync] Failed to sync live map token item:', err);
                });
        }
    }, []);

    const flushSync = useCallback(
        (targetSummary?: PcPokemonSummary) => {
            if (isDirtyRef.current || syncTimeoutRef.current || targetSummary) {
                syncNow(targetSummary || currentSummaryRef.current);
            }
        },
        [syncNow]
    );

    // Save previous character state and theme on mount, restore on unmount
    useEffect(() => {
        isUnmountingRef.current = false;
        isHydratingRef.current = false;
        isDirtyRef.current = false;
        setIsPcSheetActive(true);
        if (OBR.isAvailable) {
            OBR.player.select([]).catch(() => {});
        }

        const store = useCharacterStore.getState();
        prevTokenIdRef.current = store.tokenId;
        prevMetaRef.current = buildSummaryFromStore(store, currentSummaryRef.current).nextMeta;

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
            isUnmountingRef.current = true;
            setIsPcSheetActive(false);

            // Destroy active store subscriber BEFORE any character rollback so it can NEVER trigger sync!
            if (activeUnsubRef.current) {
                activeUnsubRef.current();
                activeUnsubRef.current = null;
            }
            if (syncTimeoutRef.current) {
                clearTimeout(syncTimeoutRef.current);
                syncTimeoutRef.current = null;
            }
            if (remoteHydrateTimerRef.current) {
                clearTimeout(remoteHydrateTimerRef.current);
                remoteHydrateTimerRef.current = null;
            }

            // Only flush if local state has dirty uncommitted edits!
            const storeAtUnmount = useCharacterStore.getState();
            if (
                isDirtyRef.current &&
                currentSummaryRef.current?.entityId &&
                storeAtUnmount.identity.entityId === currentSummaryRef.current.entityId
            ) {
                syncNow(currentSummaryRef.current);
            }
            isHydratingRef.current = true;

            restorePreviousCharacterState({
                prevTokenId: prevTokenIdRef.current,
                prevMeta: prevMetaRef.current,
                prevTheme: prevThemeRef.current,
                currentSummary: currentSummaryRef.current,
                initialMapTokenId: initialMapTokenIdRef.current,
                initialEntityId: initialEntityIdRef.current,
                mode: modeRef.current,
                roomCustomTypes: roomCustomTypesRef.current
            });
        };
    }, []);

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

        let isCancelled = false;
        const hydrateEntity = async () => {
            let tokenItem: import('@owlbear-rodeo/sdk').Item | undefined;
            if (activeEntity.isOnMap && activeEntity.mapTokenId && OBR.isAvailable) {
                try {
                    const items = await OBR.scene.items.getItems([activeEntity.mapTokenId]);
                    if (items.length > 0) tokenItem = items[0];
                } catch (e) {
                    console.warn('[usePcSheetSync] Failed to fetch live token for hydration:', e);
                }
            }

            if (isCancelled) return;

            try {
                await hydrateActiveSheet({
                    targetId: targetTokenId,
                    entityId: activeEntity.entityId,
                    overrideRole: (store.role as 'PLAYER' | 'GM') || 'PLAYER',
                    sourceMeta: activeEntity.fullMetadata,
                    tokenItem,
                    saveIfNewer: true,
                    applyTheme: true,
                    fetchSpecies: true
                });
            } catch (e) {
                console.error('[usePcSheetSync] Error during unified sheet hydration:', e);
            }

            if (isCancelled) return;
            setLoading(false);
            setTimeout(() => {
                if (!isCancelled) {
                    isHydratingRef.current = false;
                }
            }, 100);
        };

        hydrateEntity();

        const unsub = useCharacterStore.subscribe((state, prevState) => {
            if (getIsRemoteSyncActive() || isHydratingRef.current || isUnmountingRef.current) return;
            if (hasCharacterSheetChanged(state, prevState)) {
                isDirtyRef.current = true;
                if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
                syncTimeoutRef.current = setTimeout(() => {
                    syncNow();
                }, 150);
            }
        });
        activeUnsubRef.current = unsub;

        const handleRemoteApplied = (e: Event) => {
            const customEvt = e as CustomEvent<{ entityId: string; summary: PcPokemonSummary }>;
            const nextSummary = customEvt.detail?.summary;
            if (!nextSummary || customEvt.detail?.entityId !== activeEntity.entityId) {
                return;
            }

            const incomingMod = Number(nextSummary.lastModified) || 0;
            const localMod = Number(currentSummaryRef.current.lastModified) || 0;

            // Strict timestamp guard: only overwrite local state if incoming is strictly newer
            if (localMod > 0 && incomingMod > 0 && incomingMod <= localMod) {
                return;
            }

            // Cancel any pending debounced sync since remote update is authoritative
            if (syncTimeoutRef.current) {
                clearTimeout(syncTimeoutRef.current);
                syncTimeoutRef.current = null;
            }
            isDirtyRef.current = false;

            currentSummaryRef.current = nextSummary;

            // Dynamically re-bind active token ID if on-map status changed (e.g. sent out or recalled)
            const targetTokenId =
                nextSummary.isOnMap && nextSummary.mapTokenId ? nextSummary.mapTokenId : nextSummary.entityId;
            setActiveTokenId(targetTokenId);

            const s = useCharacterStore.getState();
            s.setTokenData(targetTokenId, s.role || 'PLAYER');

            // Apply theme colors reactively
            const colors = resolvePcSheetThemeColors(nextSummary, modeRef.current, s, roomCustomTypesRef.current);
            applyDynamicThemeColors(colors.primary, colors.secondary);
        };

        if (typeof window !== 'undefined') {
            window.addEventListener('pkr-remote-summary-applied', handleRemoteApplied);
        }

        return () => {
            isCancelled = true;
            if (typeof window !== 'undefined') {
                window.removeEventListener('pkr-remote-summary-applied', handleRemoteApplied);
            }
            if (activeUnsubRef.current) {
                activeUnsubRef.current();
                activeUnsubRef.current = null;
            }
            if (remoteHydrateTimerRef.current) {
                clearTimeout(remoteHydrateTimerRef.current);
                remoteHydrateTimerRef.current = null;
            }
            if (!isUnmountingRef.current && (isDirtyRef.current || syncTimeoutRef.current)) {
                syncNow();
            }
        };
    }, [currentSummary.entityId, syncNow]);

    // Reactive Theme Application
    useEffect(() => {
        const storeState = useCharacterStore.getState();
        const colors = resolvePcSheetThemeColors(currentSummary, mode, storeState, roomCustomTypes);
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
