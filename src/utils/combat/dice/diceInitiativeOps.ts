import OBR from '@owlbear-rodeo/sdk';
import { useCharacterStore } from '@/store/useCharacterStore';
import { isStandaloneMode } from '@/utils/sync/storageAdapter';
import { EXTENSION_ID } from '@/hooks/owlbearSync/owlbearSyncConstants';
import { calculateBaseInitiative } from '@/utils/combat/combatMath';
import {
    calculateEncodedInitiative,
    calculateBaseInitFromCharacterData,
    sortCombatants,
    extractIsNpc
} from '@/utils/combat/initiativeHelpers';
import { addRollLogEntry } from '@/utils/combat/diceRoller';

export const INITIATIVE_KEY = `${EXTENSION_ID}/initiative`;

// Defines the structure exactly as saved in Local Storage
export interface StandaloneCombatant {
    id: string;
    name: string;
    image: string;
    d6: number;
    baseInit: number;
    total: number;
    tiebreaker: number;
    hidden?: boolean;
    isNPC?: boolean;
}

export async function assignInitiative(tokenId: string, rollTotal: number, baseInit: number): Promise<number> {
    const state = useCharacterStore.getState();
    const effectiveBaseInit = baseInit !== undefined && !isNaN(baseInit) ? baseInit : calculateBaseInitiative(state);
    const rawD6 = Math.max(1, rollTotal - effectiveBaseInit);

    if (isStandaloneMode) {
        try {
            const listString = localStorage.getItem('pkr_standalone_init_list');
            if (!listString) return 0;
            const parsedList: StandaloneCombatant[] = JSON.parse(listString);
            if (!Array.isArray(parsedList)) return 0;

            // Check for true stalemates (identical Total AND identical Base Initiative)
            let assignedTiebreaker = 0;
            const stalemateOpponents = parsedList.filter(
                (combatant) =>
                    combatant.id !== tokenId &&
                    combatant.total === rollTotal &&
                    combatant.baseInit === effectiveBaseInit
            );

            const isStandaloneNpc = Boolean(state.identity.isNPC);
            const shouldHideStandalone = isStandaloneNpc && state.identity.defaultNpcInitiativeHidden !== false;

            if (stalemateOpponents.length > 0) {
                assignedTiebreaker = Math.floor(Math.random() * 6) + 1;
                const updatedList = parsedList.map((combatant) => {
                    if (combatant.id === tokenId) {
                        return {
                            ...combatant,
                            d6: rawD6,
                            baseInit: effectiveBaseInit,
                            total: rollTotal,
                            tiebreaker: assignedTiebreaker,
                            hidden: combatant.hidden !== undefined ? combatant.hidden : shouldHideStandalone,
                            isNPC: combatant.isNPC !== undefined ? combatant.isNPC : isStandaloneNpc
                        };
                    }
                    if (stalemateOpponents.some((opponent) => opponent.id === combatant.id)) {
                        let opponentTiebreaker = combatant.tiebreaker;
                        if (!opponentTiebreaker || opponentTiebreaker === 0) {
                            opponentTiebreaker = Math.floor(Math.random() * 6) + 1;
                        }
                        while (opponentTiebreaker === assignedTiebreaker) {
                            opponentTiebreaker = Math.floor(Math.random() * 6) + 1;
                        }
                        return {
                            ...combatant,
                            tiebreaker: opponentTiebreaker
                        };
                    }
                    return combatant;
                });

                const sorted = sortCombatants(updatedList);
                localStorage.setItem('pkr_standalone_init_list', JSON.stringify(sorted));
                window.dispatchEvent(new Event('pkr-standalone-init-update'));

                const rollerName = state.identity.nickname || state.identity.species || 'Combatant';
                addRollLogEntry(
                    'Initiative Stalemate Re-roll',
                    `Stalemate detected on Total ${rollTotal} (Base ${effectiveBaseInit})!\n${rollerName} rolled 1d6 tiebreaker: [${assignedTiebreaker}]`,
                    state.identity.tokenImageUrl || '',
                    rollerName
                );
                return assignedTiebreaker;
            }

            const updated = parsedList.map((combatant) =>
                combatant.id === tokenId
                    ? {
                          ...combatant,
                          d6: rawD6,
                          baseInit: effectiveBaseInit,
                          total: rollTotal,
                          tiebreaker: 0,
                          hidden: combatant.hidden !== undefined ? combatant.hidden : shouldHideStandalone,
                          isNPC: combatant.isNPC !== undefined ? combatant.isNPC : isStandaloneNpc
                      }
                    : combatant
            );

            const sorted = sortCombatants(updated);
            localStorage.setItem('pkr_standalone_init_list', JSON.stringify(sorted));
            window.dispatchEvent(new Event('pkr-standalone-init-update'));
            return 0;
        } catch (error) {
            console.error('[DiceRoller] Standalone Init Error:', error);
            return 0;
        }
    }

    if (!OBR.isAvailable) return 0;
    try {
        const items = await OBR.scene.items.getItems();
        const characterItems = items.filter((item) => item.layer === 'CHARACTER');

        let assignedTiebreaker = 0;
        const stalemateTokens = characterItems.filter((item) => {
            if (item.id === tokenId) return false;
            const initMeta = item.metadata[INITIATIVE_KEY] as
                | { value?: number; base?: number; tiebreaker?: number }
                | undefined;
            if (!initMeta || typeof initMeta.value !== 'number') return false;

            const existingTotal = Math.floor(initMeta.value);
            const existingBase =
                typeof initMeta.base === 'number'
                    ? initMeta.base
                    : calculateBaseInitFromCharacterData(item.metadata, state);

            return existingTotal === rollTotal && existingBase === effectiveBaseInit;
        });

        if (stalemateTokens.length > 0) {
            assignedTiebreaker = Math.floor(Math.random() * 6) + 1;

            // Also ensure stalemate opponents have unique non-zero tiebreakers
            const opponentUpdates: { id: string; tiebreaker: number; value: number; base: number }[] = [];
            for (const opponent of stalemateTokens) {
                const opponentMeta = opponent.metadata[INITIATIVE_KEY] as
                    | { value?: number; base?: number; tiebreaker?: number }
                    | undefined;
                let opponentTiebreaker = opponentMeta?.tiebreaker || 0;
                if (opponentTiebreaker === 0 || opponentTiebreaker === assignedTiebreaker) {
                    opponentTiebreaker = Math.floor(Math.random() * 6) + 1;
                    while (opponentTiebreaker === assignedTiebreaker) {
                        opponentTiebreaker = Math.floor(Math.random() * 6) + 1;
                    }
                }
                const opponentBase =
                    typeof opponentMeta?.base === 'number'
                        ? opponentMeta.base
                        : calculateBaseInitFromCharacterData(opponent.metadata, state);
                const opponentValue = calculateEncodedInitiative(rollTotal, opponentBase, opponentTiebreaker);
                opponentUpdates.push({
                    id: opponent.id,
                    tiebreaker: opponentTiebreaker,
                    value: opponentValue,
                    base: opponentBase
                });
            }

            if (opponentUpdates.length > 0) {
                const opponentIds = opponentUpdates.map((u) => u.id);
                await OBR.scene.items.updateItems(opponentIds, (itemsToUpdate) => {
                    for (const item of itemsToUpdate) {
                        const match = opponentUpdates.find((u) => u.id === item.id);
                        if (match) {
                            const existingOpponent =
                                (item.metadata[INITIATIVE_KEY] as Record<string, unknown> | undefined) || {};
                            item.metadata[INITIATIVE_KEY] = {
                                ...existingOpponent,
                                value: match.value,
                                base: match.base,
                                tiebreaker: match.tiebreaker
                            };
                        }
                    }
                });
            }

            const rollerName = state.identity.nickname || state.identity.species || 'Combatant';
            addRollLogEntry(
                'Initiative Stalemate Re-roll',
                `Stalemate detected on Total ${rollTotal} (Base ${effectiveBaseInit})!\n${rollerName} rolled 1d6 tiebreaker: [${assignedTiebreaker}]`,
                state.identity.tokenImageUrl || '',
                rollerName
            );
        }

        const encodedValue = calculateEncodedInitiative(rollTotal, effectiveBaseInit, assignedTiebreaker);

        const targetItem = characterItems.find((item) => item.id === tokenId);
        const isTargetNPC = extractIsNpc(
            targetItem?.metadata,
            state.tokenId === tokenId && Boolean(state.identity.isNPC)
        );

        const shouldHide =
            (isTargetNPC && state.identity.defaultNpcInitiativeHidden !== false) || targetItem?.visible === false;

        await OBR.scene.items.updateItems([tokenId], (itemsToUpdate) => {
            for (const item of itemsToUpdate) {
                const existing = item.metadata[INITIATIVE_KEY] as Record<string, unknown> | undefined;
                item.metadata[INITIATIVE_KEY] = {
                    ...(existing || {}),
                    value: encodedValue,
                    base: effectiveBaseInit,
                    tiebreaker: assignedTiebreaker,
                    hidden: existing && existing.hidden !== undefined ? Boolean(existing.hidden) : shouldHide
                };
            }
        });
        return assignedTiebreaker;
    } catch (error) {
        console.error('[DiceRoller] Failed to assign Initiative to token:', error);
        return 0;
    }
}

