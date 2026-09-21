import { useCallback } from 'react';
import OBR, { type Image } from '@owlbear-rodeo/sdk';
import { isStandaloneMode, storageAdapter } from '../../../utils/storageAdapter';
import { useCharacterStore } from '../../../store/useCharacterStore';
import {
    extractTokenImage,
    extractCharacterName,
    calculateBaseInitFromCharacterData
} from '../../../utils/initiativeHelpers';
import type { BattleOrganizerState, BattleRoundData, CombatantRowData } from '../../../types/battleOrganizerTypes';
import {
    parseStatusesFromMetadata,
    parseHealthAndWillFromMetadata,
    parseHeldItemsFromMetadata,
    createDefaultActions
} from './battleOrganizerUtils';

export interface UseBattleOrganizerTokenImportProps {
    updateState: (
        updater: (prev: BattleOrganizerState) => BattleOrganizerState,
        immediate?: boolean,
        skipBroadcast?: boolean
    ) => void;
}

export function useBattleOrganizerTokenImport({ updateState }: UseBattleOrganizerTokenImportProps) {
    const pullFromInitiative = useCallback(
        async (options?: { resetTrackers?: boolean }) => {
            const shouldReset = options?.resetTrackers !== false;

            try {
                const combatantRows: CombatantRowData[] = [];

                if (isStandaloneMode) {
                    const localChars = await storageAdapter.getLocalCharacters();
                    const savedInitList = localStorage.getItem('pkr_standalone_init_list');
                    const parsedInit = savedInitList ? JSON.parse(savedInitList) : [];

                    if (Array.isArray(parsedInit) && parsedInit.length > 0) {
                        parsedInit.forEach((initItem: Record<string, unknown>, idx: number) => {
                            const charId = String(initItem.id || '');
                            const matchingChar = localChars.find((c) => c.id === charId);
                            const meta = (matchingChar?.metadata || {}) as Record<string, unknown>;

                            const heldItemText = parseHeldItemsFromMetadata(meta);

                            // Parse statuses & health/will
                            const { statusText, isFainted } = parseStatusesFromMetadata(meta);
                            const { hpCurr, hpMax, willCurr, willMax, tempHp, tempWill, activeTransformation } =
                                parseHealthAndWillFromMetadata(meta);

                            const actionsUsed = shouldReset ? 0 : Number(meta['actions-used'] || 0);
                            const evadeUsed = shouldReset
                                ? false
                                : meta['evasions-used'] === true || meta['evasions-used'] === 'true';
                            const clashUsed = shouldReset
                                ? false
                                : meta['clashes-used'] === true || meta['clashes-used'] === 'true';

                            const actions = createDefaultActions();
                            for (let i = 0; i < Math.min(5, actionsUsed); i++) {
                                actions[i] = { text: actions[i].text, status: 'none' };
                            }

                            const globalStore = useCharacterStore.getState();
                            const baseInitVal = calculateBaseInitFromCharacterData(
                                matchingChar?.metadata || initItem,
                                globalStore
                            );
                            let initScore = String(baseInitVal);
                            if (
                                typeof initItem.total === 'number' &&
                                typeof initItem.d6 === 'number' &&
                                initItem.d6 > 0
                            ) {
                                initScore = String(initItem.total);
                            } else if (typeof initItem.total === 'number' && initItem.total > 0) {
                                initScore = String(initItem.total);
                            }

                            const displayName = extractCharacterName(
                                (matchingChar?.metadata || initItem) as Record<string, unknown>,
                                String(matchingChar?.name || initItem.name || `Combatant ${idx + 1}`)
                            );

                            const isNPC = meta['is-npc'] === true || meta['is-npc'] === 'true';

                            combatantRows.push({
                                id: crypto.randomUUID(),
                                tokenId: charId,
                                initiative: initScore,
                                baseInit: baseInitVal,
                                name: displayName,
                                image: matchingChar?.metadata?.tokenImageUrl
                                    ? String(matchingChar.metadata.tokenImageUrl)
                                    : '',
                                heldItem: heldItemText,
                                status: statusText,
                                isFainted,
                                actions,
                                evadeUsed,
                                clashUsed,
                                isPlayerSide: true,
                                hpCurr,
                                hpMax,
                                willCurr,
                                willMax,
                                tempHp,
                                tempWill,
                                activeTransformation,
                                isNPC
                            });
                        });
                    }
                } else if (OBR.isAvailable) {
                    const isReady = await OBR.scene.isReady();
                    if (!isReady) return;

                    const allItems = await OBR.scene.items.getItems((item) => item.layer === 'CHARACTER');
                    const initItems = allItems.filter((item) => item.metadata['pokerole-pmd-extension/initiative']);

                    const sortedItems = [...initItems].sort((a, b) => {
                        const metaA = a.metadata['pokerole-pmd-extension/initiative'] as { value?: number } | undefined;
                        const metaB = b.metadata['pokerole-pmd-extension/initiative'] as { value?: number } | undefined;
                        return (metaB?.value || 0) - (metaA?.value || 0);
                    });

                    sortedItems.forEach((item) => {
                        const imgItem = item as Image;
                        const meta = item.metadata;
                        const statsMeta = (meta['pokerole-extension/stats'] || meta) as Record<string, unknown>;

                        const heldItemText = parseHeldItemsFromMetadata(statsMeta);

                        // Parse statuses & health/will
                        const { statusText, isFainted } = parseStatusesFromMetadata(statsMeta);
                        const { hpCurr, hpMax, willCurr, willMax, tempHp, tempWill, activeTransformation } =
                            parseHealthAndWillFromMetadata(statsMeta);

                        const actionsUsed = shouldReset ? 0 : Number(statsMeta['actions-used'] || 0);
                        const evadeUsed = shouldReset
                            ? false
                            : statsMeta['evasions-used'] === true || statsMeta['evasions-used'] === 'true';
                        const clashUsed = shouldReset
                            ? false
                            : statsMeta['clashes-used'] === true || statsMeta['clashes-used'] === 'true';

                        const actions = createDefaultActions();
                        for (let i = 0; i < Math.min(5, actionsUsed); i++) {
                            actions[i] = { text: actions[i].text, status: 'none' };
                        }

                        const initMeta = meta['pokerole-pmd-extension/initiative'] as
                            | { value?: number; base?: number; tiebreaker?: number }
                            | undefined;
                        const initVal = initMeta?.value ?? 0;
                        const baseInit =
                            initMeta?.base !== undefined
                                ? initMeta.base
                                : calculateBaseInitFromCharacterData(meta, useCharacterStore.getState());

                        const charName = extractCharacterName(statsMeta, item.name);
                        const tokenImage = imgItem.image?.url || extractTokenImage(statsMeta) || '';

                        const isNPC =
                            statsMeta['is-npc'] === true ||
                            statsMeta['is-npc'] === 'true' ||
                            meta['is-npc'] === true ||
                            meta['is-npc'] === 'true';

                        combatantRows.push({
                            id: crypto.randomUUID(),
                            tokenId: item.id,
                            initiative: String(initVal),
                            baseInit,
                            name: charName,
                            image: tokenImage,
                            heldItem: heldItemText,
                            status: statusText,
                            isFainted,
                            actions,
                            evadeUsed,
                            clashUsed,
                            isPlayerSide: !isNPC,
                            hpCurr,
                            hpMax,
                            willCurr,
                            willMax,
                            tempHp,
                            tempWill,
                            activeTransformation,
                            isNPC
                        });
                    });
                }

                if (combatantRows.length > 0) {
                    updateState((prev) => {
                        const currentRound = prev.rounds[prev.activeRoundIndex];
                        if (!currentRound) return prev;

                        const updatedRound: BattleRoundData = {
                            ...currentRound,
                            combatants: combatantRows
                        };

                        return {
                            ...prev,
                            rounds: prev.rounds.map((r, idx) => (idx === prev.activeRoundIndex ? updatedRound : r))
                        };
                    });

                    // Reset tokens & character sheets if requested
                    if (shouldReset) {
                        if (OBR.isAvailable && !isStandaloneMode) {
                            await OBR.scene.items.updateItems(
                                (item) => item.layer === 'CHARACTER',
                                (items) => {
                                    items.forEach((item) => {
                                        const matched = combatantRows.find((c) => c.tokenId === item.id);
                                        if (matched) {
                                            if (!item.metadata['pokerole-extension/stats']) {
                                                item.metadata['pokerole-extension/stats'] = {};
                                            }
                                            const stats = item.metadata['pokerole-extension/stats'] as Record<
                                                string,
                                                unknown
                                            >;
                                            stats['actions-used'] = 0;
                                            stats['evasions-used'] = false;
                                            stats['clashes-used'] = false;

                                            item.metadata['actions-used'] = 0;
                                            item.metadata['evasions-used'] = false;
                                            item.metadata['clashes-used'] = false;
                                        }
                                    });
                                }
                            );
                        } else {
                            for (const combatant of combatantRows) {
                                if (combatant.tokenId) {
                                    try {
                                        await storageAdapter.saveCharacter(
                                            combatant.tokenId,
                                            {
                                                'actions-used': 0,
                                                'evasions-used': false,
                                                'clashes-used': false
                                            },
                                            'pokerole-extension/stats'
                                        );
                                    } catch (e) {
                                        console.warn('[useBattleOrganizer] Failed to reset token trackers on pull:', e);
                                    }
                                }
                            }
                        }

                        const globalStore = useCharacterStore.getState();
                        if (globalStore.tokenId) {
                            const isMatched = combatantRows.some((c) => c.tokenId === globalStore.tokenId);
                            if (isMatched) {
                                globalStore.updateTracker('actions', 0);
                                globalStore.updateTracker('evade', false);
                                globalStore.updateTracker('clash', false);
                            }
                        }
                    }

                    if (OBR.isAvailable) {
                        const resetMsg = shouldReset ? ' and reset actions/reactions' : '';
                        OBR.notification.show(
                            `Pulled ${combatantRows.length} combatants from Initiative${resetMsg}!`,
                            'SUCCESS'
                        );
                    }
                } else {
                    if (OBR.isAvailable) {
                        OBR.notification.show('No active initiative combatants found.', 'WARNING');
                    }
                }
            } catch (e) {
                console.error('[BattleOrganizer] Error pulling from initiative:', e);
            }
        },
        [updateState]
    );

    return {
        pullFromInitiative
    };
}
