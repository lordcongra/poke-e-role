import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import OBR from '@owlbear-rodeo/sdk';
import type { Item, Image } from '@owlbear-rodeo/sdk';
import { isStandaloneMode, storageAdapter } from '../../utils/storageAdapter';
import { useCharacterStore } from '../../store/useCharacterStore';
import { addRollLogEntry } from '../../utils/diceRoller';
import {
    calculateBaseInitFromCharacterData,
    sortCombatants,
    extractTokenImage,
    calculateEncodedInitiative
} from '../../utils/initiativeHelpers';
import type { Combatant } from '../../utils/initiativeHelpers';
import type { StandaloneCharOption, ObrCharOption } from './AddCombatantModal';

export function useInitiativeEngine() {
    const storeIdentity = useCharacterStore((state) => state.identity);
    const globalState = useCharacterStore();

    const activeTokenId = globalState.tokenId;
    const dexStat = globalState.stats?.dex;
    const alertSkill = globalState.skills?.alert;
    const inventory = globalState.inventory;
    const ability = globalState.identity?.ability;
    const extraCategories = globalState.extraCategories;
    const tokenImageUrl = globalState.identity?.tokenImageUrl;

    const [combatants, setCombatants] = useState<Combatant[]>([]);
    const [layout, setLayout] = useState<'vertical' | 'horizontal'>('vertical');
    const [theme, setTheme] = useState('light');
    const [shape, setShape] = useState<'circle' | 'square' | 'none'>('circle');
    const [isReady, setIsReady] = useState(false);
    const [isGM, setIsGM] = useState(false);

    const [activeTurnId, setActiveTurnId] = useState<string | null>(null);

    const [maxTrackerWidth, setMaxTrackerWidth] = useState(0);
    const [maxTrackerHeight, setMaxTrackerHeight] = useState(0);
    const [viewportMaxWidth, setViewportMaxWidth] = useState(800);

    const [availableChars, setAvailableChars] = useState<StandaloneCharOption[]>([]);
    const [availableObrChars, setAvailableObrChars] = useState<ObrCharOption[]>([]);

    // Lock to prevent rapid-fire clicking from breaking the smooth scroll animation
    const scrollLock = useRef(false);

    const fetchAvailableCharacters = useCallback(async () => {
        if (isStandaloneMode) {
            try {
                const chars = await storageAdapter.getLocalCharacters();
                const options = chars.map((c) => {
                    const meta = (c.metadata || {}) as Record<string, unknown>;
                    return {
                        id: c.id,
                        name: c.name,
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

    // 1. Reactive Sync for the Active Character's base stats changing
    useEffect(() => {
        if (!isStandaloneMode || !activeTokenId || combatants.length === 0) return;

        setCombatants((prev) => {
            let changed = false;
            const next = prev.map((c) => {
                if (c.id === activeTokenId) {
                    const newBase = calculateBaseInitFromCharacterData(
                        globalState as unknown as Record<string, unknown>,
                        globalState
                    );
                    const newImage = tokenImageUrl || '';

                    if (newBase !== c.baseInit || newImage !== c.image) {
                        changed = true;
                        const newTotal = c.d6 > 0 ? c.d6 + newBase : newBase;
                        return { ...c, baseInit: newBase, total: newTotal, image: newImage };
                    }
                }
                return c;
            });

            if (changed) {
                const sorted = sortCombatants(next);
                try {
                    localStorage.setItem('pkr_standalone_init_list', JSON.stringify(sorted));
                    window.dispatchEvent(new Event('pkr-standalone-init-update'));
                } catch (error) {
                    console.error(
                        '[InitiativeEngine] Failed to update active character initiative in localStorage:',
                        error
                    );
                }
                return sorted;
            }
            return prev;
        });
    }, [
        isStandaloneMode,
        activeTokenId,
        dexStat,
        alertSkill,
        inventory,
        ability,
        extraCategories,
        tokenImageUrl,
        globalState
    ]);

    // 2. Settings Sync (from Zustand or URL Params)
    useEffect(() => {
        if (isStandaloneMode) {
            setLayout(storeIdentity.initiativeTrackerLayout || 'vertical');
            setShape(storeIdentity.initiativeTrackerAvatarShape || 'circle');
            setMaxTrackerWidth(storeIdentity.initiativeTrackerMaxWidth || 0);
            setMaxTrackerHeight(storeIdentity.initiativeTrackerMaxHeight || 0);
        } else {
            const params = new URLSearchParams(window.location.search);
            const paramLayout = params.get('layout');
            setLayout(paramLayout === 'horizontal' ? 'horizontal' : 'vertical');
            setTheme(params.get('theme') || 'light');
            const paramShape = params.get('shape');
            setShape(paramShape === 'square' || paramShape === 'none' ? paramShape : 'circle');
            setMaxTrackerWidth(parseInt(params.get('mw') || '0', 10));
            setMaxTrackerHeight(parseInt(params.get('mh') || '0', 10));
        }
    }, [storeIdentity, isStandaloneMode]);

    const applyDynamicColors = useCallback(
        (data?: { enabled: boolean; primary?: string; secondary?: string }) => {
            if (isStandaloneMode) return;
            if (data?.enabled && data?.primary) {
                document.body.style.setProperty('--dynamic-type-color', data.primary);
                document.documentElement.style.setProperty('--dynamic-type-color', data.primary);
                if (data.secondary) {
                    document.body.style.setProperty('--dynamic-secondary-color', data.secondary);
                    document.documentElement.style.setProperty('--dynamic-secondary-color', data.secondary);
                } else {
                    document.body.style.removeProperty('--dynamic-secondary-color');
                    document.documentElement.style.removeProperty('--dynamic-secondary-color');
                }
            } else {
                document.body.style.removeProperty('--dynamic-type-color');
                document.documentElement.style.removeProperty('--dynamic-type-color');
                document.body.style.removeProperty('--dynamic-secondary-color');
                document.documentElement.style.removeProperty('--dynamic-secondary-color');
            }
        },
        [isStandaloneMode]
    );

    // 3. Theme Injection & Dynamic Popover Color Sync
    useEffect(() => {
        if (isStandaloneMode) return;

        try {
            const raw = localStorage.getItem('pkr_active_theme_colors');
            if (raw) applyDynamicColors(JSON.parse(raw));
        } catch (e) {
            console.warn('[InitiativeEngine] Failed to parse active theme colors from localStorage:', e);
        }

        const handleStorage = (e: StorageEvent) => {
            if (e.key === 'pkr_active_theme_colors') {
                try {
                    applyDynamicColors(JSON.parse(e.newValue || '{}'));
                } catch (err) {
                    console.warn('[InitiativeEngine] Failed to parse dynamic colors on storage update:', err);
                }
            }
        };
        window.addEventListener('storage', handleStorage);
        return () => window.removeEventListener('storage', handleStorage);
    }, [isStandaloneMode, applyDynamicColors]);

    useEffect(() => {
        if (isStandaloneMode) return;

        if (theme === 'dark') {
            document.body.classList.add('dark-mode');
            document.body.setAttribute('data-theme', 'dark');
            document.documentElement.setAttribute('data-theme', 'dark');
        } else {
            document.body.classList.remove('dark-mode');
            document.body.setAttribute('data-theme', 'light');
            document.documentElement.setAttribute('data-theme', 'light');
        }
    }, [theme, isStandaloneMode]);

    // 4. Primary Network/Local Connection Sync
    useEffect(() => {
        let isMounted = true;

        if (isStandaloneMode) {
            setIsReady(true);

            const loadLocalEncounter = async () => {
                try {
                    const savedList = localStorage.getItem('pkr_standalone_init_list');
                    const savedTurn = localStorage.getItem('pkr_standalone_init_turn');
                    const localChars = await storageAdapter.getLocalCharacters();

                    if (savedList) {
                        const parsedList = JSON.parse(savedList);
                        if (Array.isArray(parsedList)) {
                            const normalizedList: Combatant[] = parsedList.map((item: Record<string, unknown>) => {
                                const charId = String(item.id || '');
                                const matchingChar = localChars.find((c) => c.id === charId);

                                let baseInitiative = typeof item.baseInit === 'number' ? item.baseInit : 0;
                                let resolvedImage = String(item.image || '');

                                if (matchingChar && matchingChar.metadata) {
                                    const meta = matchingChar.metadata as Record<string, unknown>;
                                    baseInitiative = calculateBaseInitFromCharacterData(meta, globalState);
                                    resolvedImage = extractTokenImage(meta);
                                }

                                const d6Value = typeof item.d6 === 'number' ? item.d6 : 0;
                                const tiebreakerValue = typeof item.tiebreaker === 'number' ? item.tiebreaker : 0;

                                const totalScore =
                                    d6Value > 0
                                        ? d6Value + baseInitiative
                                        : typeof item.total === 'number'
                                          ? item.total
                                          : baseInitiative;

                                return {
                                    id: charId || crypto.randomUUID(),
                                    name: String(item.name || 'Unknown'),
                                    image: resolvedImage,
                                    d6: d6Value,
                                    baseInit: baseInitiative,
                                    total: totalScore,
                                    tiebreaker: tiebreakerValue
                                };
                            });
                            setCombatants(sortCombatants(normalizedList));
                        }
                    }
                    if (savedTurn) setActiveTurnId(savedTurn);
                } catch (error) {
                    console.error('[InitiativeEngine] Failed to parse local initiative list:', error);
                }
            };

            const handleLocalDataChange = () => {
                fetchAvailableCharacters();
                loadLocalEncounter();
            };

            loadLocalEncounter();
            fetchAvailableCharacters();

            window.addEventListener('pkr-standalone-init-update', loadLocalEncounter);
            window.addEventListener('pkr-character-list-update', fetchAvailableCharacters);
            window.addEventListener('pkr-local-data-changed', handleLocalDataChange);
            window.addEventListener('storage', handleLocalDataChange);

            return () => {
                isMounted = false;
                window.removeEventListener('pkr-standalone-init-update', loadLocalEncounter);
                window.removeEventListener('pkr-character-list-update', fetchAvailableCharacters);
                window.removeEventListener('pkr-local-data-changed', handleLocalDataChange);
                window.removeEventListener('storage', handleLocalDataChange);
            };
        }

        // --- OBR Mode ---
        OBR.onReady(async () => {
            if (!isMounted) return;
            setIsReady(true);

            OBR.player.getRole().then((role) => {
                if (isMounted) setIsGM(role === 'GM');
            });

            try {
                const currentWidth = (await OBR.viewport.getWidth()) ?? 800;
                setViewportMaxWidth(currentWidth * 0.9);
            } catch (error) {
                console.warn('[InitiativeEngine] Could not fetch viewport width:', error);
            }

            OBR.scene
                .getMetadata()
                .then((meta) => {
                    const turnMeta = meta['pokerole-pmd-extension/initiative-turn'] as string;
                    if (turnMeta) setActiveTurnId(turnMeta);
                })
                .catch((error) => console.error('[InitiativeEngine] Failed to read scene metadata:', error));

            const handleMetadataChange = (meta: Record<string, unknown>) => {
                const turnMeta = meta['pokerole-pmd-extension/initiative-turn'] as string;
                if (turnMeta !== undefined) setActiveTurnId(turnMeta);
            };
            const unsubMeta = OBR.scene.onMetadataChange(handleMetadataChange);

            const mapItemsToCombatants = (items: Item[]) => {
                const initItems = items.filter(
                    (item) =>
                        item.layer === 'CHARACTER' && item.metadata['pokerole-pmd-extension/initiative'] !== undefined
                );

                const nonInitItems = items.filter(
                    (item) =>
                        item.layer === 'CHARACTER' && item.metadata['pokerole-pmd-extension/initiative'] === undefined
                );
                setAvailableObrChars(nonInitItems.map((i) => ({ id: i.id, name: i.name, item: i })));

                const parsed: Combatant[] = initItems.map((item) => {
                    const meta = item.metadata['pokerole-pmd-extension/initiative'] as
                        | { value?: number; base?: number; tiebreaker?: number }
                        | undefined;
                    const imgItem = item as Image;
                    const val = typeof meta?.value === 'number' ? meta.value : 0;

                    const dynamicBaseInit =
                        typeof meta?.base === 'number'
                            ? meta.base
                            : calculateBaseInitFromCharacterData(item.metadata, globalState);

                    let integerTotal = Math.floor(val);
                    // If legacy token value was 0 or just a decimal fraction (e.g. 0.111), fallback to base
                    if (integerTotal < dynamicBaseInit && integerTotal === 0) {
                        integerTotal = dynamicBaseInit;
                    }

                    const tie = typeof meta?.tiebreaker === 'number' ? meta.tiebreaker : 0;
                    const rawD6 = integerTotal > dynamicBaseInit ? integerTotal - dynamicBaseInit : 0;

                    return {
                        id: item.id,
                        name: item.name,
                        image: imgItem.image?.url || '',
                        d6: rawD6,
                        baseInit: dynamicBaseInit,
                        total: integerTotal,
                        tiebreaker: tie
                    };
                });
                setCombatants(sortCombatants(parsed));
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

            const unsubPingToggle = OBR.broadcast.onMessage('pkr-init-ping-toggle', () => {
                OBR.broadcast.sendMessage('pkr-init-pong', {}, { destination: 'LOCAL' });
            });
            const unsubPingCheck = OBR.broadcast.onMessage('pkr-init-ping-check', () => {
                OBR.broadcast.sendMessage('pkr-init-pong', {}, { destination: 'LOCAL' });
            });

            const unsubSettings = OBR.broadcast.onMessage('pkr-init-settings-update', (event) => {
                const settings = event.data as Record<string, string>;
                if (settings.layout) setLayout(settings.layout as 'vertical' | 'horizontal');
                if (settings.shape) setShape(settings.shape as 'circle' | 'square' | 'none');
                if (settings.mw !== undefined) setMaxTrackerWidth(parseInt(settings.mw, 10));
                if (settings.mh !== undefined) setMaxTrackerHeight(parseInt(settings.mh, 10));
            });

            const unsubTheme = OBR.broadcast.onMessage('pkr-theme-update', (event) => {
                setTheme(event.data as string);
            });

            const unsubPopoverTheme = OBR.broadcast.onMessage('pokerole-pmd-extension/popover-theme-sync', (event) => {
                applyDynamicColors(event.data as { enabled: boolean; primary?: string; secondary?: string });
            });

            return () => {
                unsubItems();
                unsubMeta();
                unsubPingToggle();
                unsubPingCheck();
                unsubSettings();
                unsubTheme();
                unsubPopoverTheme();
            };
        });

        return () => {
            isMounted = false;
        };
    }, [isStandaloneMode, fetchAvailableCharacters, globalState, applyDynamicColors]);

    // --- Actions ---

    const updateInit = async (id: string, d6Value: number, baseInitiative: number, forceTiebreaker: number = 0) => {
        const total = d6Value + baseInitiative;

        if (isStandaloneMode) {
            const updated = combatants.map((c) =>
                c.id === id ? { ...c, d6: d6Value, baseInit: baseInitiative, total, tiebreaker: forceTiebreaker } : c
            );
            const sorted = sortCombatants(updated);
            setCombatants(sorted);
            try {
                localStorage.setItem('pkr_standalone_init_list', JSON.stringify(sorted));
                window.dispatchEvent(new Event('pkr-standalone-init-update'));
            } catch (error) {
                console.error('[InitiativeEngine] Failed to save initiative list to localStorage:', error);
            }
            return;
        }

        if (!OBR.isAvailable) return;
        const encodedValue = calculateEncodedInitiative(total, baseInitiative, forceTiebreaker);
        await OBR.scene.items
            .updateItems([id], (items) => {
                for (const item of items) {
                    item.metadata['pokerole-pmd-extension/initiative'] = {
                        value: encodedValue,
                        base: baseInitiative,
                        tiebreaker: forceTiebreaker
                    };
                }
            })
            .catch((error) => console.error('[InitiativeEngine] Failed to update OBR items:', error));
    };

    const handleRollAll = async () => {
        try {
            let logSummary = 'All Combatants Rolled Initiative:\n\n';

            if (isStandaloneMode) {
                const localChars = await storageAdapter.getLocalCharacters();

                // 1. Roll base 1d6 + baseScore for all combatants
                const rolledCombatants = combatants.map((c) => {
                    const charObj = localChars.find((lc) => lc.id === c.id);
                    const baseScore = charObj?.metadata
                        ? calculateBaseInitFromCharacterData(charObj.metadata as Record<string, unknown>, globalState)
                        : c.baseInit;

                    const rolledD6 = Math.floor(Math.random() * 6) + 1;
                    const total = rolledD6 + baseScore;

                    return { ...c, d6: rolledD6, baseInit: baseScore, total, tiebreaker: 0 };
                });

                // 2. Multi-participant stalemate resolution pass (Tier 3)
                const stalemateGroups: Record<string, typeof rolledCombatants> = {};
                rolledCombatants.forEach((c) => {
                    const key = `${c.total}_${c.baseInit}`;
                    if (!stalemateGroups[key]) stalemateGroups[key] = [];
                    stalemateGroups[key].push(c);
                });

                const finalCombatants = rolledCombatants.map((c) => {
                    const key = `${c.total}_${c.baseInit}`;
                    const group = stalemateGroups[key];
                    let tiebreaker = 0;

                    if (group && group.length > 1) {
                        const existingTies = group.map((member) => member.tiebreaker).filter((t) => t > 0);
                        let roll = Math.floor(Math.random() * 6) + 1;
                        while (existingTies.includes(roll)) {
                            roll = Math.floor(Math.random() * 6) + 1;
                        }
                        c.tiebreaker = roll;
                        tiebreaker = roll;
                    }

                    const tiebreakerNote = tiebreaker > 0 ? ` (🎲 Tiebreaker: [${tiebreaker}])` : '';
                    logSummary += `${c.name}: [${c.d6}] + Base ${c.baseInit} = ${c.total}${tiebreakerNote}\n`;

                    return { ...c, tiebreaker };
                });

                const sorted = sortCombatants(finalCombatants);
                setCombatants(sorted);
                localStorage.setItem('pkr_standalone_init_list', JSON.stringify(sorted));
                window.dispatchEvent(new Event('pkr-standalone-init-update'));

                addRollLogEntry(
                    'Roll All Initiative',
                    logSummary,
                    `${import.meta.env.BASE_URL || '/'}pokeball.svg`,
                    'Initiative Engine'
                );
                return;
            }

            // --- OBR Mode ---
            if (!OBR.isAvailable) return;

            const items = await OBR.scene.items.getItems();
            const initItems = items.filter(
                (item) => item.layer === 'CHARACTER' && item.metadata['pokerole-pmd-extension/initiative'] !== undefined
            );

            if (initItems.length === 0) return;

            const rolledObrCombatants = initItems.map((item) => {
                const baseScore = calculateBaseInitFromCharacterData(item.metadata, globalState);
                const rolledD6 = Math.floor(Math.random() * 6) + 1;
                const total = rolledD6 + baseScore;
                return {
                    id: item.id,
                    name: item.name,
                    d6: rolledD6,
                    baseInit: baseScore,
                    total,
                    tiebreaker: 0
                };
            });

            // Detect stalemates among OBR combatants
            const stalemateGroups: Record<string, typeof rolledObrCombatants> = {};
            rolledObrCombatants.forEach((c) => {
                const key = `${c.total}_${c.baseInit}`;
                if (!stalemateGroups[key]) stalemateGroups[key] = [];
                stalemateGroups[key].push(c);
            });

            const updatesMap: Record<string, { value: number; base: number; tiebreaker: number }> = {};

            rolledObrCombatants.forEach((c) => {
                const key = `${c.total}_${c.baseInit}`;
                const group = stalemateGroups[key];
                let tiebreaker = 0;

                if (group && group.length > 1) {
                    const existingTies = group.map((member) => member.tiebreaker).filter((t) => t > 0);
                    let roll = Math.floor(Math.random() * 6) + 1;
                    while (existingTies.includes(roll)) {
                        roll = Math.floor(Math.random() * 6) + 1;
                    }
                    c.tiebreaker = roll;
                    tiebreaker = roll;
                }

                const encodedValue = calculateEncodedInitiative(c.total, c.baseInit, tiebreaker);
                updatesMap[c.id] = {
                    value: encodedValue,
                    base: c.baseInit,
                    tiebreaker
                };

                const tiebreakerNote = tiebreaker > 0 ? ` (🎲 Tiebreaker: [${tiebreaker}])` : '';
                logSummary += `${c.name}: [${c.d6}] + Base ${c.baseInit} = ${c.total}${tiebreakerNote}\n`;
            });

            await OBR.scene.items.updateItems(
                initItems.map((i) => i.id),
                (itemsToUpdate) => {
                    for (const item of itemsToUpdate) {
                        const updateData = updatesMap[item.id];
                        if (updateData) {
                            item.metadata['pokerole-pmd-extension/initiative'] = updateData;
                        }
                    }
                }
            );

            addRollLogEntry(
                'Roll All Initiative',
                logSummary,
                `${import.meta.env.BASE_URL || '/'}pokeball.svg`,
                'Initiative Engine'
            );
        } catch (error) {
            console.error('[InitiativeEngine] Failed to roll all initiative:', error);
        }
    };

    const removeInit = async (id: string) => {
        if (isStandaloneMode) {
            const updated = combatants.filter((c) => c.id !== id);
            setCombatants(updated);
            try {
                localStorage.setItem('pkr_standalone_init_list', JSON.stringify(updated));
                window.dispatchEvent(new Event('pkr-standalone-init-update'));
            } catch (error) {
                console.error('[InitiativeEngine] Failed to save updated initiative list after removal:', error);
            }

            if (activeTurnId === id) {
                setActiveTurnId(null);
                try {
                    localStorage.removeItem('pkr_standalone_init_turn');
                } catch (error) {
                    console.error('[InitiativeEngine] Failed to remove active turn from localStorage:', error);
                }
            }
            return;
        }

        if (!OBR.isAvailable) return;
        await OBR.scene.items
            .updateItems([id], (items) => {
                for (const item of items) {
                    delete item.metadata['pokerole-pmd-extension/initiative'];
                    delete item.metadata['com.pretty-initiative/metadata'];
                }
            })
            .catch((error) => console.error('[InitiativeEngine] Failed to remove OBR initiative metadata:', error));
    };

    const nextTurn = () => {
        if (combatants.length === 0 || scrollLock.current) return;

        scrollLock.current = true;
        setTimeout(() => {
            scrollLock.current = false;
        }, 400);

        if (isStandaloneMode) {
            setActiveTurnId((currentId) => {
                let nextIndex = 0;
                if (currentId) {
                    const currentIndex = combatants.findIndex((c) => c.id === currentId);
                    if (currentIndex !== -1) {
                        nextIndex = (currentIndex + 1) % combatants.length;
                    }
                }
                const nextId = combatants[nextIndex].id;
                try {
                    localStorage.setItem('pkr_standalone_init_turn', nextId);
                } catch (error) {
                    console.error('[InitiativeEngine] Failed to advance turn in localStorage:', error);
                }
                return nextId;
            });
        } else if (OBR.isAvailable) {
            let nextIndex = 0;
            if (activeTurnId) {
                const currentIndex = combatants.findIndex((c) => c.id === activeTurnId);
                if (currentIndex !== -1) {
                    nextIndex = (currentIndex + 1) % combatants.length;
                }
            }
            const nextId = combatants[nextIndex].id;
            OBR.scene
                .setMetadata({ 'pokerole-pmd-extension/initiative-turn': nextId })
                .catch((error) => console.warn('[InitiativeEngine] Failed to advance scene turn:', error));
        }
    };

    const prevTurn = () => {
        if (combatants.length === 0 || scrollLock.current) return;

        scrollLock.current = true;
        setTimeout(() => {
            scrollLock.current = false;
        }, 400);

        if (isStandaloneMode) {
            setActiveTurnId((currentId) => {
                let prevIndex = combatants.length - 1;
                if (currentId) {
                    const currentIndex = combatants.findIndex((c) => c.id === currentId);
                    if (currentIndex !== -1) {
                        prevIndex = (currentIndex - 1 + combatants.length) % combatants.length;
                    }
                }
                const prevId = combatants[prevIndex].id;
                try {
                    localStorage.setItem('pkr_standalone_init_turn', prevId);
                } catch (error) {
                    console.error('[InitiativeEngine] Failed to reverse turn in localStorage:', error);
                }
                return prevId;
            });
        } else if (OBR.isAvailable) {
            let prevIndex = combatants.length - 1;
            if (activeTurnId) {
                const currentIndex = combatants.findIndex((c) => c.id === activeTurnId);
                if (currentIndex !== -1) {
                    prevIndex = (currentIndex - 1 + combatants.length) % combatants.length;
                }
            }
            const prevId = combatants[prevIndex].id;
            OBR.scene
                .setMetadata({ 'pokerole-pmd-extension/initiative-turn': prevId })
                .catch((error) => console.warn('[InitiativeEngine] Failed to reverse scene turn:', error));
        }
    };

    const handleAddStandaloneCombatant = (char: StandaloneCharOption) => {
        if (combatants.find((c) => c.id === char.id)) return;

        const baseInit = calculateBaseInitFromCharacterData(char.rawMetadata, globalState);
        const newList = sortCombatants([
            ...combatants,
            {
                id: char.id,
                name: char.name,
                image: char.image,
                d6: 0,
                baseInit: baseInit,
                total: baseInit,
                tiebreaker: 0
            }
        ]);

        setCombatants(newList);
        try {
            localStorage.setItem('pkr_standalone_init_list', JSON.stringify(newList));
            window.dispatchEvent(new Event('pkr-standalone-init-update'));
        } catch (error) {
            console.error('[InitiativeEngine] Failed to add standalone combatant to localStorage:', error);
        }
    };

    const handleAddObrCombatant = async (item: Item) => {
        if (!OBR.isAvailable) return;
        try {
            const dynamicBaseInit = calculateBaseInitFromCharacterData(item.metadata, globalState);
            const encodedValue = calculateEncodedInitiative(dynamicBaseInit, dynamicBaseInit, 0);
            await OBR.scene.items.updateItems([item.id], (items) => {
                for (const i of items) {
                    i.metadata['pokerole-pmd-extension/initiative'] = {
                        value: encodedValue,
                        base: dynamicBaseInit,
                        tiebreaker: 0
                    };
                }
            });
        } catch (error) {
            console.error('[InitiativeEngine] Failed to add token to OBR initiative:', error);
        }
    };

    const handleDrop = async (event: React.DragEvent) => {
        event.preventDefault();
        const itemId = event.dataTransfer.getData('itemId');
        const itemType = event.dataTransfer.getData('itemType');

        if (itemId && itemType === 'character') {
            try {
                const chars = await storageAdapter.getLocalCharacters();
                const target = chars.find((c) => c.id === itemId);
                if (target) {
                    handleAddStandaloneCombatant({
                        id: target.id,
                        name: target.name,
                        image: extractTokenImage(target.metadata as Record<string, unknown>),
                        rawMetadata: target.metadata as Record<string, unknown>
                    });
                }
            } catch (error) {
                console.error('[InitiativeEngine] Failed to handle drop character event:', error);
            }
        }
    };

    // --- Dynamic Transformers ---

    // 1. Process duplicate names and append stable #1, #2 based on internal ID order
    const displayCombatants = useMemo(() => {
        const nameGroups: Record<string, string[]> = {};

        combatants.forEach((c) => {
            if (!nameGroups[c.name]) nameGroups[c.name] = [];
            nameGroups[c.name].push(c.id);
        });

        Object.values(nameGroups).forEach((ids) => ids.sort());

        return combatants.map((c) => {
            const ids = nameGroups[c.name];
            if (ids && ids.length > 1) {
                const number = ids.indexOf(c.id) + 1;
                return { ...c, name: `${c.name} #${number}` };
            }
            return c;
        });
    }, [combatants]);

    // 2. Filter available Standalone characters to remove ones already in the list
    const filteredStandaloneChars = useMemo(() => {
        return availableChars.filter((char) => !combatants.some((c) => c.id === char.id));
    }, [availableChars, combatants]);

    return {
        combatants: displayCombatants,
        activeTurnId,
        isReady,
        isGM,
        layout,
        shape,
        maxTrackerWidth,
        maxTrackerHeight,
        viewportMaxWidth,
        availableChars: filteredStandaloneChars,
        availableObrChars,
        fetchAvailableCharacters,
        updateInit,
        removeInit,
        nextTurn,
        prevTurn,
        handleRollAll,
        handleAddStandaloneCombatant,
        handleAddObrCombatant,
        handleDrop
    };
}
