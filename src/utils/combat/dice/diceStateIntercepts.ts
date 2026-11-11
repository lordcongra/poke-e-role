import { useCharacterStore } from '@/store/useCharacterStore';
import type { StatusItem } from '@/store/storeTypes';
import type { PcPokemonSummary } from '@/types/pcStorageTypes';
import { METADATA_ID } from '@/utils/sync/obr';
import { storageAdapter } from '@/utils/sync/storageAdapter';
import { assignInitiative } from '@/utils/combat/dice/diceInitiativeOps';

export interface PinnedStateInterceptParams {
    rollingTokenId: string | null;
    rollingEntityId: string;
    rollingTempHpMax: number;
    rollingBankedAccDice: Record<string, number>;
    rollingStatuses: StatusItem[];
    rollType: string;
    payload: string;
    isSuccessRoll: boolean;
    finalSuccesses: number;
    rawSuccesses: number;
    finalSum: number;
    diceData: { type: number; result: number }[];
    baseMessage: string;
}

/**
 * Persists delayed roll intercepts to a previously active token when the user
 * switches sheets before the 3D dice animation delay completes.
 */
async function persistOffSheetIntercept(
    rollingTokenId: string,
    rollingEntityId: string,
    updates: Record<string, unknown>
): Promise<void> {
    await storageAdapter.saveCharacter(rollingTokenId, updates, METADATA_ID);

    const store = useCharacterStore.getState();
    const summaries = store.pcData?.pokemonSummaries || {};
    const summaryKey = rollingEntityId || rollingTokenId;
    const existingSummary =
        summaries[summaryKey] ||
        summaries[rollingTokenId] ||
        Object.values(summaries).find(
            (s) =>
                s.entityId === summaryKey ||
                s.mapTokenId === rollingTokenId ||
                s.savedTokenItem?.id === rollingTokenId
        );

    if (!existingSummary) return;

    const now = Math.max(Date.now(), (Number(existingSummary.lastModified) || 0) + 1);
    const updatedSavedTokenItem = existingSummary.savedTokenItem
        ? {
              ...existingSummary.savedTokenItem,
              metadata: {
                  ...(existingSummary.savedTokenItem.metadata || {}),
                  [METADATA_ID]: {
                      ...((existingSummary.savedTokenItem.metadata?.[METADATA_ID] as Record<string, unknown>) || {}),
                      ...updates
                  },
                  'pokerole-pmd-extension/stats': {
                      ...((existingSummary.savedTokenItem.metadata?.['pokerole-pmd-extension/stats'] as Record<
                          string,
                          unknown
                      >) || {}),
                      ...updates
                  }
              }
          }
        : undefined;

    const updatedSummary: PcPokemonSummary = {
        ...existingSummary,
        lastModified: now,
        fullMetadata: {
            ...(existingSummary.fullMetadata || {}),
            ...updates
        },
        ...(updatedSavedTokenItem ? { savedTokenItem: updatedSavedTokenItem } : {})
    };

    store.updatePokemonSummary(updatedSummary);
}

/**
 * Executes roll-triggered state intercepts (initiative, Temp HP shield, banked Acc dice,
 * status recovery) pinned strictly to the token that initiated the roll.
 */
export async function executePinnedStateIntercepts(params: PinnedStateInterceptParams): Promise<string> {
    const {
        rollingTokenId,
        rollingEntityId,
        rollingTempHpMax,
        rollingBankedAccDice,
        rollingStatuses,
        rollType,
        payload,
        isSuccessRoll,
        finalSuccesses,
        rawSuccesses,
        finalSum,
        diceData,
        baseMessage
    } = params;

    let finalMsg = baseMessage;

    if (rollType === 'init' && rollingTokenId) {
        const baseInit = parseInt(payload) || 0;
        const rollValue = isSuccessRoll ? finalSuccesses : finalSum;
        await assignInitiative(rollingTokenId, rollValue, baseInit);
    } else if (rollType === 'damage' && payload && finalSuccesses > 0 && rawSuccesses > 0) {
        const [flatStr, ratioStr] = payload.split('_');
        const flatGained = parseInt(flatStr) || 0;

        let ratio = 0;
        if (ratioStr) {
            if (ratioStr.includes('%')) {
                ratio = parseFloat(ratioStr.replace('%', '')) / 100;
            } else if (ratioStr.includes('/')) {
                const [num, den] = ratioStr.split('/');
                ratio = parseFloat(num) / parseFloat(den);
            } else {
                ratio = parseFloat(ratioStr);
            }
        }

        let tempGained = flatGained;
        if (!isNaN(ratio) && ratio > 0) {
            tempGained += Math.floor(finalSuccesses * ratio);
        }

        if (tempGained > 0) {
            const store = useCharacterStore.getState();
            const isMatchingToken = store.tokenId === rollingTokenId;
            const currentTempMax = isMatchingToken
                ? store.health.temporaryHitPointsMax || 0
                : rollingTempHpMax;

            if (tempGained > currentTempMax) {
                if (isMatchingToken) {
                    store.updateHealth('temporaryHitPointsMax', tempGained);
                    store.updateHealth('temporaryHitPoints', tempGained);
                } else if (rollingTokenId) {
                    await persistOffSheetIntercept(rollingTokenId, rollingEntityId, {
                        'temporary-hit-points-max': tempGained,
                        'temporary-hit-points': tempGained
                    });
                }
                finalMsg += `\nGained ${tempGained} Temp HP`;
            } else {
                finalMsg += `\nCurrent Shield Holds`;
            }
        }
    } else if (rollType === 'acc_face' && rollingTokenId && payload) {
        const [moveId, targetFaceStr, limitStr] = payload.split('_');
        const targetFace = parseInt(targetFaceStr, 10) || 6;
        const limit = parseInt(limitStr, 10) || 6;
        const matches = diceData.filter((d) => d.result === targetFace).length;

        if (matches > 0) {
            const store = useCharacterStore.getState();
            const isMatchingToken = store.tokenId === rollingTokenId;
            const newBank = {
                ...(isMatchingToken ? store.trackers.bankedAccDice : rollingBankedAccDice)
            };

            const currentBank = newBank[moveId] || 0;
            const spaceLeft = Math.max(0, limit - currentBank);
            const actualAdded = Math.min(matches, spaceLeft);

            if (actualAdded > 0) {
                newBank[moveId] = currentBank + actualAdded;
                if (isMatchingToken) {
                    store.updateTracker('bankedAccDice', newBank);
                } else {
                    await persistOffSheetIntercept(rollingTokenId, rollingEntityId, {
                        'banked-acc-dice': JSON.stringify(newBank)
                    });
                }

                const limitMsg = actualAdded < matches ? ` (Max ${limit})` : '';
                finalMsg += `\nBanked +${actualAdded} Damage Dice!${limitMsg}`;
            } else {
                finalMsg += `\nBank is full! (Max ${limit})`;
            }
        }
    } else if (rollType === 'status' && payload && finalSuccesses > 0) {
        const statusId = payload;
        const store = useCharacterStore.getState();
        const isMatchingToken = store.tokenId === rollingTokenId;

        if (isMatchingToken) {
            const targetStatus = store.statuses.find((s) => s.id === statusId);
            if (targetStatus) {
                store.updateStatus(statusId, 'rounds', targetStatus.rounds + finalSuccesses);
            }
        } else if (rollingTokenId) {
            const targetStatus = rollingStatuses.find((s) => s.id === statusId);
            if (targetStatus) {
                const updatedStatuses = rollingStatuses.map((s) =>
                    s.id === statusId ? { ...s, rounds: s.rounds + finalSuccesses } : s
                );
                await persistOffSheetIntercept(rollingTokenId, rollingEntityId, {
                    'status-list': JSON.stringify(updatedStatuses)
                });
            }
        }
        finalMsg += `\nReduced Status by ${finalSuccesses}`;
    }

    return finalMsg;
}

