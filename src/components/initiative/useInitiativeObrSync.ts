import { useEffect, useState, useCallback, useRef } from 'react';
import OBR from '@owlbear-rodeo/sdk';
import type { Item, Image } from '@owlbear-rodeo/sdk';
import { isStandaloneMode, storageAdapter } from '@/utils/sync/storageAdapter';
import { useCharacterStore } from '@/store/useCharacterStore';
import {
    calculateBaseInitFromCharacterData,
    sortCombatants,
    extractTokenImage,
    extractCharacterName,
    extractIsNpc,
    isDefaultPokeballImage,
    resolveActiveCombatantFields,
    areCombatantListsEqual
} from '@/utils/combat/initiativeHelpers';
import { extractEntityId } from '@/hooks/owlbearSync/setupOwlbearTokenSync';
import { BATTLEFIELD_META_ID, ROOM_META_ID } from '@/hooks/owlbearSync/owlbearSyncConstants';
import { mapRoomSettings } from '@/utils/sync/roomSettingsMeta';
import type { BattlefieldData } from '@/types/battleOrganizerTypes';
import type { Combatant } from '@/utils/combat/initiativeHelpers';
import type { StandaloneCharOption, ObrCharOption } from './AddCombatantModal';
import type { InitiativeLayoutMode, InitiativeAvatarShape } from './useInitiativeLayout';

export interface UseInitiativeObrSyncProps {
    combatants: Combatant[];
    setCombatants: React.Dispatch<React.SetStateAction<Combatant[]>>;
    activeTurnId: string | null;
    setActiveTurnId: React.Dispatch<React.SetStateAction<string | null>>;
    setLayout: (layout: InitiativeLayoutMode) => void;
    setShape: (shape: InitiativeAvatarShape) => void;
    setMaxTrackerWidth: (w: number) => void;
    setMaxTrackerHeight: (h: number) => void;
    setViewportMaxWidth: (w: number) => void;
    setTheme: (theme: string) => void;
    applyDynamicColors: (colors: { enabled: boolean; primary?: string; secondary?: string }) => void;
}

export function useInitiativeObrSync({
    combatants,
    setCombatants,
    activeTurnId: _activeTurnId,
    setActiveTurnId,
    setLayout,
    setShape,
    setMaxTrackerWidth,
    setMaxTrackerHeight,
    setViewportMaxWidth,
    setTheme,
    applyDynamicColors
}: UseInitiativeObrSyncProps) {
    const storeIdentity = useCharacterStore((state) => state.identity);
    const activeTokenId = useCharacterStore((state) => state.tokenId);
    const dexStat = useCharacterStore((state) => state.stats?.dex);
    const alertSkill = useCharacterStore((state) => state.skills?.alert);
    const inventory = useCharacterStore((state) => state.inventory);
    const extraCategories = useCharacterStore((state) => state.extraCategories);
    const tokenImageUrl = storeIdentity?.tokenImageUrl;

    const [isReady, setIsReady] = useState(() => isStandaloneMode);
    const [isGM, setIsGM] = useState(() => isStandaloneMode);
    const [availableChars, setAvailableChars] = useState<StandaloneCharOption[]>([]);
    const [availableObrChars, setAvailableObrChars] = useState<ObrCharOption[]>([]);
    const isSelfInitDispatchRef = useRef(false);
    const prevActiveTokenImageRef = useRef<{ tokenId: string | null; url: string }>({
        tokenId: null,
        url: ''
    });
    const tokenImageClearedRef = useRef(false);

    // Adjust active character initiative if stats change in standalone
    useEffect(() => {
        if (!isStandaloneMode) return;

        const currentUrl = tokenImageUrl || '';
        const prevImg = prevActiveTokenImageRef.current;
        if (prevImg.tokenId !== activeTokenId) {
            tokenImageClearedRef.current = false;
        } else if (currentUrl !== '') {
            tokenImageClearedRef.current = false;
        } else if (Boolean(prevImg.url) && !isDefaultPokeballImage(prevImg.url)) {
            tokenImageClearedRef.current = true;
        }
        prevActiveTokenImageRef.current = { tokenId: activeTokenId, url: currentUrl };

        if (!activeTokenId || combatants.length === 0) return;
        const activeCombatant = combatants.find((c) => c.id === activeTokenId);
        if (!activeCombatant) return;

        const store = useCharacterStore.getState();
        const {
            baseInit: newBase,
            image: newImage,
            name: newName
        } = resolveActiveCombatantFields(
            store,
            { name: activeCombatant.name, image: activeCombatant.image },
            tokenImageClearedRef.current
        );

        if (
            newBase !== activeCombatant.baseInit ||
            newImage !== activeCombatant.image ||
            newName !== activeCombatant.name
        ) {
            const newTotal =
                activeCombatant.d6 > 0 ? activeCombatant.d6 + newBase : activeCombatant.total === 0 ? 0 : newBase;
            const next = combatants.map((c) =>
                c.id === activeTokenId
                    ? { ...c, name: newName, baseInit: newBase, total: newTotal, image: newImage }
                    : c
            );
            const sorted = sortCombatants(next);
            setCombatants(sorted);
            try {
                localStorage.setItem('pkr_standalone_init_list', JSON.stringify(sorted));
                isSelfInitDispatchRef.current = true;
                try {
                    window.dispatchEvent(new Event('pkr-standalone-init-update'));
                } finally {
                    isSelfInitDispatchRef.current = false;
                }
            } catch (error) {
                console.error(
                    '[InitiativeEngine] Failed to update active character initiative in localStorage:',
                    error
                );
            }
        }
    }, [
        activeTokenId,
        dexStat,
        alertSkill,
        tokenImageUrl,
        storeIdentity?.nickname,
        storeIdentity?.species,
        storeIdentity?.ability,
        storeIdentity?.abilityActive,
        storeIdentity?.abilityBoostActive,
        storeIdentity?.abilityBoostLevel,
        storeIdentity?.abilityChoiceIndex,
        inventory?.length,
        extraCategories?.length,
        combatants,
        setCombatants
    ]);

    const fetchAvailableCharacters = useCallback(async () => {
        if (isStandaloneMode) {
            try {
                const chars = await storageAdapter.getLocalCharacters();
                const options = chars.map((c) => {
                    const meta = (c.metadata || {}) as Record<string, unknown>;
                    const resolvedName = extractCharacterName(meta, c.name);
                    return {
                        id: c.id,
                        name: resolvedName,
                        image: extractTokenImage(meta),
                        rawMetadata: meta
                    };
                });
                setAvailableChars(options);
            } catch (error) {
                console.error('[InitiativeEngine] Failed to fetch local characters:', error);
            }
        }
    }, []);

    // Primary Network/Local Connection Sync
    useEffect(() => {
        let isMounted = true;

        if (isStandaloneMode) {
            const loadLocalEncounter = async () => {
                try {
                    const savedList = localStorage.getItem('pkr_standalone_init_list');
                    const savedTurn = localStorage.getItem('pkr_standalone_init_turn');
                    const localChars = await storageAdapter.getLocalCharacters();

                    if (savedList) {
                        const parsedList = JSON.parse(savedList);
                        if (Array.isArray(parsedList)) {
                            const store = useCharacterStore.getState();
                            const currentActiveTokenId = store.tokenId;

                            const normalizedList: Combatant[] = parsedList.map((item: Record<string, unknown>) => {
                                const charId = String(item.id || '');
                                const matchingChar = localChars.find((c) => c.id === charId);

                                let baseInitiative = typeof item.baseInit === 'number' ? item.baseInit : 0;
                                let resolvedImage = String(item.image || '');
                                let resolvedName = String(item.name || 'Unknown');

                                if (matchingChar && matchingChar.metadata) {
                                    const meta = matchingChar.metadata as Record<string, unknown>;
                                    baseInitiative = calculateBaseInitFromCharacterData(meta, store);
                                    resolvedImage = extractTokenImage(meta);
                                    resolvedName = extractCharacterName(meta, matchingChar.name || resolvedName);
                                }

                                if (currentActiveTokenId && charId === currentActiveTokenId) {
                                    const activeFields = resolveActiveCombatantFields(
                                        store,
                                        { name: resolvedName, image: resolvedImage },
                                        tokenImageClearedRef.current
                                    );
                                    baseInitiative = activeFields.baseInit;
                                    resolvedImage = activeFields.image;
                                    resolvedName = activeFields.name;
                                }

                                const d6Value = typeof item.d6 === 'number' ? item.d6 : 0;
                                const tiebreakerValue = typeof item.tiebreaker === 'number' ? item.tiebreaker : 0;

                                const totalScore =
                                    d6Value > 0
                                        ? d6Value + baseInitiative
                                        : typeof item.total === 'number'
                                          ? item.total
                                          : 0;

                                return {
                                    id: charId || crypto.randomUUID(),
                                    name: resolvedName,
                                    image: resolvedImage,
                                    d6: d6Value,
                                    baseInit: baseInitiative,
                                    total: totalScore,
                                    tiebreaker: tiebreakerValue,
                                    hidden: item.hidden !== undefined ? Boolean(item.hidden) : undefined,
                                    isNPC: item.isNPC !== undefined ? Boolean(item.isNPC) : undefined
                                };
                            });
                            const sortedList = sortCombatants(normalizedList);
                            if (isMounted) {
                                setCombatants((prev) =>
                                    areCombatantListsEqual(prev, sortedList) ? prev : sortedList
                                );
                            }
                        }
                    }
                    if (savedTurn && isMounted) setActiveTurnId(savedTurn);
                } catch (error) {
                    console.error('[InitiativeEngine] Failed to parse local initiative list:', error);
                }
            };

            const loadLocalChars = async () => {
                try {
                    const chars = await storageAdapter.getLocalCharacters();
                    const options = chars.map((c) => {
                        const meta = (c.metadata || {}) as Record<string, unknown>;
                        const resolvedName = extractCharacterName(meta, c.name);
                        return {
                            id: c.id,
                            name: resolvedName,
                            image: extractTokenImage(meta),
                            rawMetadata: meta
                        };
                    });
                    if (isMounted) setAvailableChars(options);
                } catch (error) {
                    console.error('[InitiativeEngine] Failed to fetch local characters:', error);
                }
            };

            const handleStandaloneInitUpdate = () => {
                if (isSelfInitDispatchRef.current) return;
                loadLocalEncounter();
            };

            const handleLocalDataChange = () => {
                loadLocalChars();
                loadLocalEncounter();
            };

            loadLocalEncounter();
            loadLocalChars();

            const handleStorage = (e: StorageEvent) => {
                if (
                    e.key === null ||
                    e.key === 'pkr_standalone_init_list' ||
                    e.key === 'pkr_standalone_init_turn' ||
                    e.key.startsWith('pkr_char_') ||
                    e.key === 'pkr_folders' ||
                    e.key.includes('pkr_pc_storage')
                ) {
                    handleLocalDataChange();
                }
            };

            window.addEventListener('pkr-standalone-init-update', handleStandaloneInitUpdate);
            window.addEventListener('pkr-character-list-update', loadLocalChars);
            window.addEventListener('pkr-local-data-changed', handleLocalDataChange);
            window.addEventListener('storage', handleStorage);

            return () => {
                isMounted = false;
                window.removeEventListener('pkr-standalone-init-update', handleStandaloneInitUpdate);
                window.removeEventListener('pkr-character-list-update', loadLocalChars);
                window.removeEventListener('pkr-local-data-changed', handleLocalDataChange);
                window.removeEventListener('storage', handleStorage);
            };
        }

        // --- OBR Mode ---
        const unsubs: Array<() => void> = [];
        OBR.onReady(async () => {
            if (!isMounted) return;
            setIsReady(true);

            let currentIsGM = isStandaloneMode;
            try {
                const role = await OBR.player.getRole();
                currentIsGM = role === 'GM';
                if (isMounted) setIsGM(currentIsGM);
            } catch (error) {
                console.warn('[InitiativeEngine] Could not fetch player role:', error);
            }

            const syncBattlefieldMeta = (meta: Record<string, unknown>, gmFlag: boolean) => {
                if (BATTLEFIELD_META_ID in meta) {
                    const rawBattlefield = meta[BATTLEFIELD_META_ID] as BattlefieldData | undefined;
                    if (rawBattlefield && typeof rawBattlefield === 'object') {
                        if (!gmFlag && rawBattlefield.broadcastToPlayers === false) {
                            useCharacterStore.getState().setActiveBattlefield(null);
                        } else {
                            useCharacterStore.getState().setActiveBattlefield(rawBattlefield);
                        }
                    } else {
                        useCharacterStore.getState().setActiveBattlefield(null);
                    }
                }
            };

            const unsubPlayer = OBR.player.onChange((player) => {
                const nextIsGm = player.role === 'GM';
                if (currentIsGM !== nextIsGm) {
                    currentIsGM = nextIsGm;
                    if (isMounted) setIsGM(nextIsGm);
                    OBR.scene.items
                        .getItems()
                        .then(mapItemsToCombatants)
                        .catch(() => {});
                    OBR.scene
                        .getMetadata()
                        .then((m) => syncBattlefieldMeta(m, nextIsGm))
                        .catch(() => {});
                }
            });
            unsubs.push(unsubPlayer);

            try {
                const currentWidth = (await OBR.viewport.getWidth()) ?? 800;
                if (isMounted) setViewportMaxWidth(currentWidth * 0.9);
            } catch (error) {
                console.warn('[InitiativeEngine] Could not fetch viewport width:', error);
            }

            OBR.scene
                .getMetadata()
                .then((meta) => {
                    const turnMeta = meta['pokerole-pmd-extension/initiative-turn'] as string;
                    if (turnMeta && isMounted) setActiveTurnId(turnMeta);
                    syncBattlefieldMeta(meta, currentIsGM);
                })
                .catch((error) => console.error('[InitiativeEngine] Failed to read scene metadata:', error));

            const handleMetadataChange = (meta: Record<string, unknown>) => {
                const turnMeta = meta['pokerole-pmd-extension/initiative-turn'] as string;
                if (turnMeta !== undefined && isMounted) setActiveTurnId(turnMeta);
                syncBattlefieldMeta(meta, currentIsGM);
            };
            const unsubMeta = OBR.scene.onMetadataChange(handleMetadataChange);
            unsubs.push(unsubMeta);

            OBR.room
                .getMetadata()
                .then((meta) => {
                    if (ROOM_META_ID in meta) {
                        const data = meta[ROOM_META_ID] as Record<string, unknown>;
                        useCharacterStore.getState().applyRoomSettings(mapRoomSettings(data));
                    }
                })
                .catch((err) => console.warn('[InitiativeEngine] Failed to read room metadata:', err));

            const unsubRoomMeta = OBR.room.onMetadataChange((meta) => {
                if (ROOM_META_ID in meta) {
                    const data = meta[ROOM_META_ID] as Record<string, unknown>;
                    useCharacterStore.getState().applyRoomSettings(mapRoomSettings(data));
                }
            });
            unsubs.push(unsubRoomMeta);

            const mapItemsToCombatants = (items: Item[]) => {
                const initItems = items.filter(
                    (item) =>
                        item.layer === 'CHARACTER' && item.metadata['pokerole-pmd-extension/initiative'] !== undefined
                );

                const nonInitItems = items.filter((item) => {
                    if (
                        item.layer !== 'CHARACTER' ||
                        item.metadata['pokerole-pmd-extension/initiative'] !== undefined
                    ) {
                        return false;
                    }
                    if (!currentIsGM) {
                        const store = useCharacterStore.getState();
                        const isNpc = extractIsNpc(
                            item.metadata,
                            store.tokenId === item.id && Boolean(store.identity.isNPC)
                        );
                        if (item.visible === false || isNpc) {
                            return false;
                        }
                    }
                    return true;
                });
                if (isMounted) {
                    setAvailableObrChars(
                        nonInitItems.map((i) => ({
                            id: i.id,
                            name: extractCharacterName(i.metadata as Record<string, unknown>, i.name),
                            item: i
                        }))
                    );
                }

                const parsed: Combatant[] = initItems.map((item) => {
                    const meta = item.metadata['pokerole-pmd-extension/initiative'] as
                        | { value?: number; base?: number; tiebreaker?: number; hidden?: boolean }
                        | undefined;
                    const imgItem = item as Image;
                    const val = typeof meta?.value === 'number' ? meta.value : 0;

                    const dynamicBaseInit =
                        typeof meta?.base === 'number'
                            ? meta.base
                            : calculateBaseInitFromCharacterData(item.metadata, useCharacterStore.getState());

                    const integerTotal = Math.floor(val);

                    const tie = typeof meta?.tiebreaker === 'number' ? meta.tiebreaker : 0;
                    const rawD6 = integerTotal > dynamicBaseInit ? integerTotal - dynamicBaseInit : 0;
                    const resolvedName = extractCharacterName(item.metadata as Record<string, unknown>, item.name);
                    const isHidden = meta?.hidden === true || item.visible === false;
                    const store = useCharacterStore.getState();
                    const isNPC = extractIsNpc(
                        item.metadata,
                        store.tokenId === item.id && Boolean(store.identity.isNPC)
                    );

                    return {
                        id: item.id,
                        entityId: extractEntityId(item),
                        name: resolvedName,
                        image: imgItem.image?.url || '',
                        d6: rawD6,
                        baseInit: dynamicBaseInit,
                        total: integerTotal,
                        tiebreaker: tie,
                        hidden: isHidden,
                        isNPC: isNPC
                    };
                });

                const visibleCombatants = currentIsGM ? parsed : parsed.filter((c) => !c.hidden);
                if (isMounted) setCombatants(sortCombatants(visibleCombatants));
            };

            const initializeCombatants = async () => {
                try {
                    const items = await OBR.scene.items.getItems();
                    mapItemsToCombatants(items);
                } catch (error) {
                    console.error('[InitiativeEngine] Failed to initialize combatants:', error);
                }
            };

            initializeCombatants();
            const unsubItems = OBR.scene.items.onChange(mapItemsToCombatants);
            unsubs.push(unsubItems);

            const unsubPingToggle = OBR.broadcast.onMessage('pkr-init-ping-toggle', () => {
                OBR.broadcast.sendMessage('pkr-init-pong', {}, { destination: 'LOCAL' });
            });
            unsubs.push(unsubPingToggle);

            const unsubPingCheck = OBR.broadcast.onMessage('pkr-init-ping-check', () => {
                OBR.broadcast.sendMessage('pkr-init-pong', {}, { destination: 'LOCAL' });
            });
            unsubs.push(unsubPingCheck);

            const unsubSettings = OBR.broadcast.onMessage('pkr-init-settings-update', (event) => {
                const settings = event.data as Record<string, string>;
                if (settings.layout) setLayout(settings.layout as InitiativeLayoutMode);
                if (settings.shape) setShape(settings.shape as InitiativeAvatarShape);
                if (settings.mw !== undefined) setMaxTrackerWidth(parseInt(settings.mw, 10));
                if (settings.mh !== undefined) setMaxTrackerHeight(parseInt(settings.mh, 10));
            });
            unsubs.push(unsubSettings);

            const unsubTheme = OBR.broadcast.onMessage('pkr-theme-update', (event) => {
                setTheme(event.data as string);
            });
            unsubs.push(unsubTheme);

            const unsubPopoverTheme = OBR.broadcast.onMessage('pokerole-pmd-extension/popover-theme-sync', (event) => {
                applyDynamicColors(event.data as { enabled: boolean; primary?: string; secondary?: string });
            });
            unsubs.push(unsubPopoverTheme);
        });

        return () => {
            isMounted = false;
            unsubs.forEach((unsub) => unsub());
        };
    }, [
        applyDynamicColors,
        setCombatants,
        setActiveTurnId,
        setLayout,
        setShape,
        setMaxTrackerWidth,
        setMaxTrackerHeight,
        setViewportMaxWidth,
        setTheme
    ]);

    return {
        isReady,
        isGM,
        availableChars,
        availableObrChars,
        fetchAvailableCharacters
    };
}

