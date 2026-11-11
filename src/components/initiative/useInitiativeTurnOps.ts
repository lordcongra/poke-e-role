import { useEffect, useCallback, useRef } from 'react';
import OBR from '@owlbear-rodeo/sdk';
import type { Item } from '@owlbear-rodeo/sdk';
import { isStandaloneMode, storageAdapter } from '@/utils/sync/storageAdapter';
import { useCharacterStore } from '@/store/useCharacterStore';
import { addRollLogEntry } from '@/utils/combat/diceRoller';
import {
    calculateBaseInitFromCharacterData,
    sortCombatants,
    extractTokenImage,
    extractCharacterName,
    calculateEncodedInitiative,
    resolveInitiativeRolls,
    extractIsNpc,
    type Combatant
} from '@/utils/combat/initiativeHelpers';
import type { StandaloneCharOption } from './AddCombatantModal';

export interface UseInitiativeTurnOpsProps {
    combatants: Combatant[];
    setCombatants: React.Dispatch<React.SetStateAction<Combatant[]>>;
    activeTurnId: string | null;
    setActiveTurnId: React.Dispatch<React.SetStateAction<string | null>>;
}

export function useInitiativeTurnOps({
    combatants,
    setCombatants,
    activeTurnId,
    setActiveTurnId
}: UseInitiativeTurnOpsProps) {
    // Lock to prevent rapid-fire clicking from breaking the smooth scroll animation
    const scrollLock = useRef(false);
    const combatantsRef = useRef(combatants);

    useEffect(() => {
        combatantsRef.current = combatants;
    }, [combatants]);

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
                    const existing =
                        (item.metadata['pokerole-pmd-extension/initiative'] as Record<string, unknown> | undefined) ||
                        {};
                    item.metadata['pokerole-pmd-extension/initiative'] = {
                        ...existing,
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
            if (isStandaloneMode) {
                const localChars = await storageAdapter.getLocalCharacters();

                const participants = combatants.map((c) => {
                    const charObj = localChars.find((lc) => lc.id === c.id);
                    const baseScore = charObj?.metadata
                        ? calculateBaseInitFromCharacterData(
                              charObj.metadata as Record<string, unknown>,
                              useCharacterStore.getState()
                          )
                        : c.baseInit;
                    return {
                        id: c.id,
                        name: c.name,
                        image: c.image,
                        baseInit: baseScore
                    };
                });

                const { rolledCombatants, logSummary } = resolveInitiativeRolls(participants);

                const sorted = sortCombatants(rolledCombatants);
                setCombatants(sorted);
                localStorage.setItem('pkr_standalone_init_list', JSON.stringify(sorted));
                window.dispatchEvent(new Event('pkr-standalone-init-update'));

                addRollLogEntry(
                    'Roll All Initiative',
                    logSummary,
                    `${import.meta.env.BASE_URL || '/'}pokeball-token.svg`,
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

            const participants = initItems.map((item) => ({
                id: item.id,
                name: item.name,
                baseInit: calculateBaseInitFromCharacterData(item.metadata, useCharacterStore.getState())
            }));

            const { rolledCombatants, logSummary } = resolveInitiativeRolls(participants);

            const updatesMap: Record<string, { value: number; base: number; tiebreaker: number }> = {};
            rolledCombatants.forEach((c) => {
                const encodedValue = calculateEncodedInitiative(c.total, c.baseInit, c.tiebreaker);
                updatesMap[c.id] = {
                    value: encodedValue,
                    base: c.baseInit,
                    tiebreaker: c.tiebreaker
                };
            });

            await OBR.scene.items.updateItems(
                initItems.map((i) => i.id),
                (itemsToUpdate) => {
                    for (const item of itemsToUpdate) {
                        const updateData = updatesMap[item.id];
                        if (updateData) {
                            const existing =
                                (item.metadata['pokerole-pmd-extension/initiative'] as
                                    | Record<string, unknown>
                                    | undefined) || {};
                            item.metadata['pokerole-pmd-extension/initiative'] = {
                                ...existing,
                                ...updateData
                            };
                        }
                    }
                }
            );

            addRollLogEntry(
                'Roll All Initiative',
                logSummary,
                `${import.meta.env.BASE_URL || '/'}pokeball-token.svg`,
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

    const handleAddStandaloneCombatant = useCallback(
        (char: StandaloneCharOption) => {
            const prevCombatants = combatantsRef.current;
            if (prevCombatants.find((c) => c.id === char.id)) return;

            const store = useCharacterStore.getState();
            const baseInit = calculateBaseInitFromCharacterData(char.rawMetadata, store);
            const resolvedName = extractCharacterName(char.rawMetadata, char.name);
            const isNpc = extractIsNpc(char.rawMetadata, store.tokenId === char.id && Boolean(store.identity.isNPC));
            const shouldHide = isNpc && store.identity.defaultNpcInitiativeHidden !== false;
            const newList = sortCombatants([
                ...prevCombatants,
                {
                    id: char.id,
                    name: resolvedName,
                    image: char.image,
                    d6: 0,
                    baseInit: baseInit,
                    total: 0,
                    tiebreaker: 0,
                    hidden: shouldHide,
                    isNPC: isNpc
                }
            ]);

            combatantsRef.current = newList;
            setCombatants(newList);
            try {
                localStorage.setItem('pkr_standalone_init_list', JSON.stringify(newList));
                window.dispatchEvent(new Event('pkr-standalone-init-update'));
            } catch (error) {
                console.error('[InitiativeEngine] Failed to add standalone combatant to localStorage:', error);
            }
        },
        [setCombatants]
    );

    const handleAddObrCombatant = async (item: Item) => {
        if (!OBR.isAvailable) return;
        try {
            const store = useCharacterStore.getState();
            const dynamicBaseInit = calculateBaseInitFromCharacterData(item.metadata, store);

            await OBR.scene.items.updateItems([item.id], (items) => {
                for (const i of items) {
                    const isTargetNpc = extractIsNpc(
                        i.metadata,
                        store.tokenId === i.id && Boolean(store.identity.isNPC)
                    );
                    const shouldHide =
                        (isTargetNpc && store.identity.defaultNpcInitiativeHidden !== false) || i.visible === false;
                    const existing =
                        (i.metadata['pokerole-pmd-extension/initiative'] as Record<string, unknown> | undefined) || {};
                    i.metadata['pokerole-pmd-extension/initiative'] = {
                        ...existing,
                        value: 0,
                        base: dynamicBaseInit,
                        tiebreaker: 0,
                        hidden: shouldHide
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
                    const meta = (target.metadata || {}) as Record<string, unknown>;
                    handleAddStandaloneCombatant({
                        id: target.id,
                        name: extractCharacterName(meta, target.name),
                        image: extractTokenImage(meta),
                        rawMetadata: meta
                    });
                }
            } catch (error) {
                console.error('[InitiativeEngine] Failed to handle drop character event:', error);
            }
        }
    };

    useEffect(() => {
        const handleCustomAddCharacter = async (e: Event) => {
            const detail = (e as CustomEvent<{ id: string }>).detail;
            if (detail?.id) {
                try {
                    const chars = await storageAdapter.getLocalCharacters();
                    const target = chars.find((c) => c.id === detail.id);
                    if (target) {
                        const meta = (target.metadata || {}) as Record<string, unknown>;
                        handleAddStandaloneCombatant({
                            id: target.id,
                            name: extractCharacterName(meta, target.name),
                            image: extractTokenImage(meta),
                            rawMetadata: meta
                        });
                    }
                } catch (error) {
                    console.error('[InitiativeEngine] Failed to add dropped combatant:', error);
                }
            }
        };

        window.addEventListener('pkr-init-add-character', handleCustomAddCharacter);
        return () => {
            window.removeEventListener('pkr-init-add-character', handleCustomAddCharacter);
        };
    }, [handleAddStandaloneCombatant]);

    const toggleVisibility = async (id: string) => {
        if (isStandaloneMode) {
            const updated = combatants.map((c) => (c.id === id ? { ...c, hidden: !c.hidden } : c));
            setCombatants(updated);
            try {
                localStorage.setItem('pkr_standalone_init_list', JSON.stringify(updated));
                window.dispatchEvent(new Event('pkr-standalone-init-update'));
            } catch (error) {
                console.error('[InitiativeEngine] Failed to save visibility to localStorage:', error);
            }
            return;
        }

        if (!OBR.isAvailable) return;
        await OBR.scene.items
            .updateItems([id], (items) => {
                for (const item of items) {
                    const existing =
                        (item.metadata['pokerole-pmd-extension/initiative'] as Record<string, unknown> | undefined) ||
                        {};
                    const currentHidden = existing.hidden === true || item.visible === false;
                    item.metadata['pokerole-pmd-extension/initiative'] = {
                        ...existing,
                        hidden: !currentHidden
                    };
                }
            })
            .catch((error) => console.error('[InitiativeEngine] Failed to toggle combatant visibility:', error));
    };

    return {
        updateInit,
        removeInit,
        toggleVisibility,
        nextTurn,
        prevTurn,
        handleRollAll,
        handleAddStandaloneCombatant,
        handleAddObrCombatant,
        handleDrop
    };
}

