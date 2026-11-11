import { useCallback } from 'react';
import OBR, { type Image } from '@owlbear-rodeo/sdk';
import { isStandaloneMode, storageAdapter } from '../../../utils/sync/storageAdapter';
import { useCharacterStore } from '../../../store/useCharacterStore';
import {
    extractTokenImage,
    extractCharacterName,
    calculateBaseInitFromCharacterData,
    extractIsNpc,
    formatInitiativeDisplay
} from '../../../utils/combat/initiativeHelpers';
import { extractEntityId } from '../../../hooks/owlbearSync/setupOwlbearTokenSync';
import type { BattleOrganizerState, BattleRoundData, CombatantRowData } from '../../../types/battleOrganizerTypes';
import { readBattleOrganizerStateRaw } from '@/utils/sync/roomScopedStorage';
import {
    parseStatusesFromMetadata,
    parseHealthAndWillFromMetadata,
    parseHeldItemsFromMetadata,
    parseTokenPrivacyFlags,
    createDefaultActions,
    compareCombatantsByInitiative
} from './battleOrganizerUtils';

export interface UseBattleOrganizerTokenImportProps {
    state?: BattleOrganizerState;
    updateState: (
        updater: (prev: BattleOrganizerState) => BattleOrganizerState,
        immediate?: boolean,
        skipBroadcast?: boolean
    ) => void;
}

export function useBattleOrganizerTokenImport({ state, updateState }: UseBattleOrganizerTokenImportProps) {
    const pullFromInitiative = useCallback(
        async (options?: { resetTrackers?: boolean; mergeOnly?: boolean }) => {
            const shouldReset = options?.resetTrackers !== false;
            const isMergeOnly = options?.mergeOnly === true;

            try {
                let existingRoundCombatants: CombatantRowData[] = [];
                if (state?.rounds && typeof state.activeRoundIndex === 'number') {
                    existingRoundCombatants = state.rounds[state.activeRoundIndex]?.combatants || [];
                }
                if (existingRoundCombatants.length === 0) {
                    try {
                        const raw = readBattleOrganizerStateRaw();
                        if (raw) {
                            const parsed = JSON.parse(raw) as BattleOrganizerState;
                            existingRoundCombatants = parsed.rounds?.[parsed.activeRoundIndex ?? 0]?.combatants || [];
                        }
                    } catch {
                        // ignore
                    }
                }

                const combatantRows: CombatantRowData[] = [];
                const role = useCharacterStore.getState().role;
                const gmOnlyPullEnemies = useCharacterStore.getState().identity.gmOnlyPullEnemies ?? true;
                const shouldFilterEnemies = role !== 'GM' && gmOnlyPullEnemies;

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
                            const calculatedBase = calculateBaseInitFromCharacterData(
                                matchingChar?.metadata || initItem,
                                globalStore
                            );
                            const effectiveBase =
                                typeof initItem.baseInit === 'number' && initItem.baseInit > 0
                                    ? initItem.baseInit
                                    : calculatedBase;
                            const integerTotal = typeof initItem.total === 'number' ? initItem.total : 0;
                            const tiebreaker = typeof initItem.tiebreaker === 'number' ? initItem.tiebreaker : 0;
                            const initScore = formatInitiativeDisplay(integerTotal, effectiveBase, tiebreaker);

                            const displayName = extractCharacterName(
                                (matchingChar?.metadata || initItem) as Record<string, unknown>,
                                String(matchingChar?.name || initItem.name || `Combatant ${idx + 1}`)
                            );

                            const isNPC = extractIsNpc(matchingChar?.metadata || initItem);
                            const isHidden = initItem.hidden === true || initItem.visible === false;
                            if (shouldFilterEnemies && (isNPC || isHidden)) {
                                return;
                            }

                            const { gmHpBar, gmHpText, gmWillBar, gmWillText } = parseTokenPrivacyFlags(meta);

                            const stateObj = (meta.state || meta) as Record<string, unknown>;
                            const identityObj = (stateObj?.identity || meta.identity || {}) as Record<string, unknown>;
                            const ability = String(identityObj.ability || meta.ability || '');
                            const abilityActive =
                                meta['ability-active'] !== undefined
                                    ? Boolean(meta['ability-active'])
                                    : identityObj.abilityActive !== false;
                            const species = String(identityObj.species || meta.species || '');
                            const rank = String(identityObj.rank || meta.rank || 'Starter');

                            const entityId = (matchingChar?.metadata?.entityId as string) || charId;
                            const existing = existingRoundCombatants.find(
                                (c) =>
                                    (c.tokenId && c.tokenId === charId) ||
                                    (c.entityId && c.entityId === entityId) ||
                                    c.name.toLowerCase().trim() === displayName.toLowerCase().trim()
                            );
                            const isPlayerSide =
                                existing?.isPlayerSide !== undefined
                                    ? existing.isPlayerSide
                                    : meta['is-player-side'] !== undefined
                                      ? Boolean(meta['is-player-side'])
                                      : !isNPC;

                            const rawTargetMeta = matchingChar?.metadata?.['ability-target-ids'] ?? meta['ability-target-ids'];
                            const abilityTargetIds = shouldReset
                                ? []
                                : existing?.abilityTargetIds !== undefined
                                  ? existing.abilityTargetIds
                                  : rawTargetMeta !== undefined
                                    ? String(rawTargetMeta).trim()
                                        ? String(rawTargetMeta).split(',').map((s) => s.trim()).filter(Boolean)
                                        : []
                                    : [];

                            combatantRows.push({
                                id: crypto.randomUUID(),
                                tokenId: charId,
                                entityId,
                                initiative: initScore,
                                baseInit: effectiveBase,
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
                                isPlayerSide,
                                hpCurr,
                                hpMax,
                                willCurr,
                                willMax,
                                tempHp,
                                tempWill,
                                activeTransformation,
                                ability,
                                abilityActive,
                                abilityTargetIds,
                                rank,
                                species,
                                isNPC,
                                hidden: isHidden,
                                gmHpBar,
                                gmHpText,
                                gmWillBar,
                                gmWillText
                            });
                        });
                    }
                } else if (OBR.isAvailable) {
                    const isReady = await OBR.scene.isReady();
                    if (!isReady) return;

                    const allItems = await OBR.scene.items.getItems((item) => item.layer === 'CHARACTER');
                    let initItems = allItems.filter((item) => item.metadata['pokerole-pmd-extension/initiative']);

                    if (shouldFilterEnemies) {
                        initItems = initItems.filter((item) => {
                            const meta = item.metadata;
                            const isNPC = extractIsNpc(item.metadata);
                            const initMeta = meta['pokerole-pmd-extension/initiative'] as
                                | { hidden?: boolean }
                                | undefined;
                            const isHidden = initMeta?.hidden === true || item.visible === false;
                            return !isNPC && !isHidden;
                        });
                    }

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
                            | { value?: number; base?: number; tiebreaker?: number; hidden?: boolean }
                            | undefined;
                        const initVal = typeof initMeta?.value === 'number' ? initMeta.value : 0;
                        const baseInit =
                            typeof initMeta?.base === 'number'
                                ? initMeta.base
                                : calculateBaseInitFromCharacterData(meta, useCharacterStore.getState());
                        const integerTotal = Math.floor(initVal);
                        const tiebreaker = typeof initMeta?.tiebreaker === 'number' ? initMeta.tiebreaker : 0;
                        const initScore = formatInitiativeDisplay(integerTotal, baseInit, tiebreaker);

                        const charName = extractCharacterName(statsMeta, item.name);
                        const tokenImage = imgItem.image?.url || extractTokenImage(statsMeta) || '';

                        const isNPC = extractIsNpc(item.metadata);
                        const isHidden = initMeta?.hidden === true || item.visible === false;

                        const { gmHpBar, gmHpText, gmWillBar, gmWillText } = parseTokenPrivacyFlags(statsMeta, meta);

                        const stateObj = (statsMeta.state || statsMeta) as Record<string, unknown>;
                        const identityObj = (stateObj?.identity || statsMeta.identity || {}) as Record<string, unknown>;
                        const ability = String(identityObj.ability || statsMeta.ability || meta.ability || '');
                        const abilityActive =
                            statsMeta['ability-active'] !== undefined
                                ? Boolean(statsMeta['ability-active'])
                                : meta['ability-active'] !== undefined
                                  ? Boolean(meta['ability-active'])
                                  : identityObj.abilityActive !== false;
                        const species = String(identityObj.species || statsMeta.species || meta.species || '');
                        const rank = String(identityObj.rank || statsMeta.rank || meta.rank || 'Starter');

                        const itemEntityId = extractEntityId(item);
                        const existing = existingRoundCombatants.find(
                            (c) =>
                                (c.tokenId && c.tokenId === item.id) ||
                                (c.entityId && c.entityId === itemEntityId) ||
                                c.name.toLowerCase().trim() === charName.toLowerCase().trim()
                        );
                        const isPlayerSide =
                            existing?.isPlayerSide !== undefined
                                ? existing.isPlayerSide
                                : meta['is-player-side'] !== undefined
                                  ? Boolean(meta['is-player-side'])
                                  : statsMeta['is-player-side'] !== undefined
                                    ? Boolean(statsMeta['is-player-side'])
                                    : !isNPC;

                        const rawTargetMeta = statsMeta['ability-target-ids'] ?? meta['ability-target-ids'];
                        const abilityTargetIds = shouldReset
                            ? []
                            : existing?.abilityTargetIds !== undefined
                              ? existing.abilityTargetIds
                              : rawTargetMeta !== undefined
                                ? String(rawTargetMeta).trim()
                                    ? String(rawTargetMeta).split(',').map((s) => s.trim()).filter(Boolean)
                                    : []
                                : [];

                        combatantRows.push({
                            id: crypto.randomUUID(),
                            tokenId: item.id,
                            entityId: itemEntityId,
                            initiative: initScore,
                            baseInit,
                            name: charName,
                            image: tokenImage,
                            heldItem: heldItemText,
                            status: statusText,
                            isFainted,
                            actions,
                            evadeUsed,
                            clashUsed,
                            isPlayerSide,
                            hpCurr,
                            hpMax,
                            willCurr,
                            willMax,
                            tempHp,
                            tempWill,
                            activeTransformation,
                            ability,
                            abilityActive,
                            abilityTargetIds,
                            rank,
                            species,
                            isNPC,
                            hidden: isHidden,
                            gmHpBar,
                            gmHpText,
                            gmWillBar,
                            gmWillText
                        });
                    });
                }

                if (combatantRows.length > 0) {
                    combatantRows.sort(compareCombatantsByInitiative);

                    let newlyAddedCount = 0;
                    let targetCombatantsToReset: CombatantRowData[] = combatantRows;

                    updateState((prev) => {
                        const currentRound = prev.rounds[prev.activeRoundIndex];
                        if (!currentRound) return prev;

                        if (isMergeOnly) {
                            const existingTokenIds = new Set(
                                currentRound.combatants.map((c) => c.tokenId).filter(Boolean)
                            );
                            const existingEntityIds = new Set(
                                currentRound.combatants.map((c) => c.entityId).filter(Boolean)
                            );
                            const existingNames = new Set(
                                currentRound.combatants.map((c) => c.name.toLowerCase().trim()).filter(Boolean)
                            );

                            const newCombatants = combatantRows.filter((row) => {
                                if (row.tokenId && existingTokenIds.has(row.tokenId)) return false;
                                if (row.entityId && existingEntityIds.has(row.entityId)) return false;
                                if (existingNames.has(row.name.toLowerCase().trim())) return false;
                                return true;
                            });

                            if (newCombatants.length === 0) {
                                targetCombatantsToReset = [];
                                newlyAddedCount = 0;
                                return prev;
                            }

                            targetCombatantsToReset = newCombatants;
                            newlyAddedCount = newCombatants.length;
                            const mergedCombatants = [...currentRound.combatants, ...newCombatants].sort(
                                compareCombatantsByInitiative
                            );

                            const updatedRound: BattleRoundData = {
                                ...currentRound,
                                combatants: mergedCombatants
                            };

                            const playerTargets = mergedCombatants.filter((c) => c.isPlayerSide && !c.isFainted).length;
                            const foeTargets = mergedCombatants.filter((c) => !c.isPlayerSide && !c.isFainted).length;

                            return {
                                ...prev,
                                rounds: prev.rounds.map((r, idx) => (idx === prev.activeRoundIndex ? updatedRound : r)),
                                battlefield: {
                                    ...prev.battlefield,
                                    playerTargets,
                                    foeTargets
                                }
                            };
                        }

                        const currentRoundCombatants = currentRound.combatants;
                        const matchedExistingIds = new Set<string>();

                        const preservedCombatantRows = combatantRows.map((row) => {
                            const existing = currentRoundCombatants.find((c) => {
                                if (row.tokenId && c.tokenId && c.tokenId === row.tokenId) return true;
                                if (row.entityId && c.entityId && c.entityId === row.entityId) return true;
                                if (row.id && c.id && c.id === row.id) return true;
                                const hasSpecificRowId = Boolean(row.tokenId || row.entityId);
                                const hasSpecificCId = Boolean(c.tokenId || c.entityId);
                                if (!hasSpecificRowId && !hasSpecificCId && !c.isInPc) {
                                    return c.name.toLowerCase().trim() === row.name.toLowerCase().trim();
                                }
                                return false;
                            });

                            if (existing) {
                                matchedExistingIds.add(existing.id);
                                return {
                                    ...row,
                                    isPlayerSide: existing.isPlayerSide !== undefined ? existing.isPlayerSide : row.isPlayerSide,
                                    abilityTargetIds: shouldReset
                                        ? []
                                        : existing.abilityTargetIds !== undefined
                                          ? existing.abilityTargetIds
                                          : (row.abilityTargetIds ?? [])
                                };
                            }
                            return row;
                        });

                        // Preserve any combatants from currentRoundCombatants where c.isInPc === true
                        // (or orphaned combatants not in combatantRows), appending them to the preserved list
                        const unmappedCombatants = currentRoundCombatants
                            .filter((c) => !matchedExistingIds.has(c.id))
                            .map((c) => ({
                                ...c,
                                abilityTargetIds: shouldReset ? [] : (c.abilityTargetIds ?? [])
                            }));

                        preservedCombatantRows.push(...unmappedCombatants);

                        targetCombatantsToReset = preservedCombatantRows;
                        const updatedRound: BattleRoundData = {
                            ...currentRound,
                            combatants: preservedCombatantRows
                        };

                        const playerTargets = preservedCombatantRows.filter((c) => c.isPlayerSide && !c.isFainted).length;
                        const foeTargets = preservedCombatantRows.filter((c) => !c.isPlayerSide && !c.isFainted).length;

                        return {
                            ...prev,
                            rounds: prev.rounds.map((r, idx) => (idx === prev.activeRoundIndex ? updatedRound : r)),
                            battlefield: {
                                ...prev.battlefield,
                                playerTargets,
                                foeTargets
                            }
                        };
                    });

                    if (isMergeOnly && newlyAddedCount === 0) {
                        if (OBR.isAvailable) {
                            OBR.notification.show(
                                'All active initiative combatants are already in this round.',
                                'INFO'
                            );
                        }
                        return;
                    }

                    // Reset tokens & character sheets if requested
                    if (shouldReset && targetCombatantsToReset.length > 0) {
                        if (OBR.isAvailable && !isStandaloneMode) {
                            await OBR.scene.items.updateItems(
                                (item) => item.layer === 'CHARACTER',
                                (items) => {
                                    items.forEach((item) => {
                                        const matched = targetCombatantsToReset.find((c) => c.tokenId === item.id);
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
                                            stats['ability-boost-active'] = false;
                                            stats['ability-boost-level'] = 0;
                                            stats['ability-target-ids'] = '';

                                            if (!item.metadata['pokerole-pmd-extension/stats']) {
                                                item.metadata['pokerole-pmd-extension/stats'] = {};
                                            }
                                            const pmdStats = item.metadata['pokerole-pmd-extension/stats'] as Record<
                                                string,
                                                unknown
                                            >;
                                            pmdStats['actions-used'] = 0;
                                            pmdStats['evasions-used'] = false;
                                            pmdStats['clashes-used'] = false;
                                            pmdStats['ability-boost-active'] = false;
                                            pmdStats['ability-boost-level'] = 0;
                                            pmdStats['ability-target-ids'] = '';

                                            item.metadata['actions-used'] = 0;
                                            item.metadata['evasions-used'] = false;
                                            item.metadata['clashes-used'] = false;
                                            item.metadata['ability-boost-active'] = false;
                                            item.metadata['ability-boost-level'] = 0;
                                            item.metadata['ability-target-ids'] = '';
                                        }
                                    });
                                }
                            );
                        } else {
                            for (const combatant of targetCombatantsToReset) {
                                if (combatant.tokenId) {
                                    try {
                                        await storageAdapter.saveCharacter(
                                            combatant.tokenId,
                                            {
                                                'actions-used': 0,
                                                'evasions-used': false,
                                                'clashes-used': false,
                                                'ability-boost-active': false,
                                                'ability-boost-level': 0,
                                                'ability-target-ids': ''
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
                            const isMatched = targetCombatantsToReset.some(
                                (c) => c.tokenId === globalStore.tokenId || (c.entityId && c.entityId === globalStore.tokenId)
                            );
                            if (isMatched) {
                                globalStore.updateTracker('actions', 0);
                                globalStore.updateTracker('evade', false);
                                globalStore.updateTracker('clash', false);
                                globalStore.setIdentity('abilityBoostActive' as any, false);
                                globalStore.setIdentity('abilityBoostLevel' as any, 0);
                                globalStore.setIdentity('abilityTargetIds' as any, []);
                            }
                        }
                    }

                    if (OBR.isAvailable) {
                        const resetMsg = shouldReset ? ' and reset actions/reactions' : '';
                        if (isMergeOnly) {
                            OBR.notification.show(
                                `Added ${newlyAddedCount} new combatant(s) to this round${resetMsg}!`,
                                'SUCCESS'
                            );
                        } else {
                            OBR.notification.show(
                                `Pulled ${combatantRows.length} combatants from Initiative${resetMsg}!`,
                                'SUCCESS'
                            );
                        }
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
