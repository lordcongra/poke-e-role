import OBR from '@owlbear-rodeo/sdk';
import { useCharacterStore } from '@/store/useCharacterStore';
import { isStandaloneMode } from '@/utils/sync/storageAdapter';
import { broadcastRollLog } from '@/utils/combat/rollLogSync';
import { showDicePlusRetirementNotice } from '@/hooks/owlbearSync/owlbearSyncConstants';
import { assignInitiative } from './dice/diceInitiativeOps';
import { dispatchNativeObrRoll } from './dice/diceBroadcastOps';

// Re-export submodules for clean modularity and backwards compatibility
export type { StandaloneCombatant } from './dice/diceInitiativeOps';
export { assignInitiative, INITIATIVE_KEY } from './dice/diceInitiativeOps';
export {
    broadcastInfo,
    broadcastCarDice,
    resolveCarDiceTheme,
    broadcastRollEntry,
    dispatchNativeObrRoll
} from './dice/diceBroadcastOps';
export type { CarDicePayload, RollLogBroadcastOptions, NativeObrRollParams } from './dice/diceBroadcastOps';
export { executeChanceRoll } from './dice/chanceRoller';

// Universal helper to push and broadcast roll entries across the room
export function addRollLogEntry(
    label: string,
    result: string,
    icon: string,
    player: string,
    characterName?: string,
    tokenId?: string,
    rollType?: string,
    isCrit?: boolean,
    explicitTargetVisibility?: string,
    options?: { chanceDice?: number; chanceEffect?: string; chanceRolled?: boolean; isCritFail?: boolean }
) {
    const activeTokenId = tokenId || useCharacterStore.getState().tokenId || undefined;
    const detectedCrit = isCrit !== undefined ? isCrit : /critical hit/i.test(result) || /critical hit/i.test(label);
    const detectedCritFail =
        options?.isCritFail !== undefined
            ? options.isCritFail
            : /critical failure/i.test(result) || /critical failure/i.test(label);
    const state = useCharacterStore.getState();
    const targetVisibility =
        explicitTargetVisibility || (state.identity.rolls === 'Private (GM)' ? 'gm_only' : 'everyone');
    const privacyTag = targetVisibility === 'gm_only' && !label.startsWith('[PRIVATE]') ? '[PRIVATE] ' : '';
    const finalLabel = `${privacyTag}${label}`;

    const rollLogData = {
        id: crypto.randomUUID(),
        player,
        characterName: characterName || player,
        tokenId: activeTokenId,
        label: finalLabel,
        result,
        icon: icon || `${import.meta.env.BASE_URL || '/'}pokeball-token.svg`,
        rollType,
        targetVisibility,
        isCrit: detectedCrit,
        isCritFail: detectedCritFail,
        chanceDice: options?.chanceDice,
        chanceEffect: options?.chanceEffect,
        chanceRolled: options?.chanceRolled
    };

    broadcastRollLog(rollLogData).catch((e) => {
        console.error('[DiceRoller] Failed to broadcast roll from addRollLogEntry:', e);
    });
}

export async function rollDicePlus(
    notation: string,
    label: string,
    rollType = 'roll',
    payload = '',
    options?: { chanceDice?: number; chanceEffect?: string; chanceRolled?: boolean }
) {
    const state = useCharacterStore.getState();
    const rawEngine = (state.identity.diceEngine as unknown as string) || 'car';
    if (rawEngine === 'dice-plus') {
        showDicePlusRetirementNotice(
            '[ ⚠️ ] Dice+ has been retired. Switched to Custom Action Rolls! If you do not have it installed, get it here: https://custom-action-rolls.narcolepticdracu.com/manifest.json'
        );
        state.updateRoomSetting('diceEngine', 'car');
    }
    const diceEngine: 'car' | 'log-only' = rawEngine === 'log-only' ? 'log-only' : 'car';
    const isGmDemo = Boolean(state.identity.gmDemoMode && state.role === 'GM');
    const targetVisibility = state.identity.rolls === 'Private (GM)' ? 'gm_only' : 'everyone';
    const playerName = state.identity.nickname || state.identity.species || 'Trainer';
    const icon = state.identity.tokenImageUrl || `${import.meta.env.BASE_URL || '/'}pokeball-token.svg`;

    try {
        const cleanNotation = notation.replace(/\s/g, '');
        const isSuccessRoll = cleanNotation.includes('>');

        const match = cleanNotation.match(/^(\d+)d6(?:>(\d+))?(?:([+-]\d+))?$/);
        if (!match) {
            console.warn('[DiceRoller] Invalid dice notation rejected:', notation);
            return;
        }
        const numDice = parseInt(match[1], 10);
        const successThreshold = match[2] ? parseInt(match[2], 10) : 3;
        const flatMod = match[3] ? parseInt(match[3].replace(/\s/g, ''), 10) : 0;

        if (!Number.isInteger(numDice) || numDice < 0 || numDice > 200) {
            console.warn('[DiceRoller] Out-of-bounds dice count rejected:', notation);
            return;
        }
        if (!Number.isInteger(successThreshold) || successThreshold < 1 || successThreshold > 6) {
            console.warn('[DiceRoller] Out-of-bounds success threshold rejected:', notation);
            return;
        }

        // Parse SE Flat Mod injection to safely strip it if base dice roll completely fails
        let seFlatMod = 0;
        if (rollType === 'damage' && payload) {
            const parts = payload.split('_');
            if (parts.length >= 3) {
                seFlatMod = parseInt(parts[2], 10) || 0;
            }
        }

        let overrideDice: number[] | null = null;

        if (isGmDemo && numDice > 0 && !isStandaloneMode) {
            overrideDice = await new Promise<number[] | null>((resolve) => {
                useCharacterStore.getState().setPendingDemoRoll({
                    notation: cleanNotation,
                    numDice,
                    successThreshold,
                    flatMod,
                    resolve
                });
            });
            useCharacterStore.getState().setPendingDemoRoll(null);
            if (!overrideDice) return;
            if (!Array.isArray(overrideDice) || overrideDice.length !== numDice) {
                console.warn('[DiceRoller] Invalid overrideDice length rejected:', overrideDice);
                return;
            }
        }

        const diceData: { type: number; result: number }[] = [];
        const rollStrings: string[] = [];
        const asteriskResults: string[] = [];

        let rawSuccesses = 0;
        let rawSum = 0;

        for (let i = 0; i < numDice; i++) {
            const result = overrideDice
                ? Math.min(6, Math.max(1, Math.round(Number.isFinite(overrideDice[i]) ? overrideDice[i] : 1)))
                : Math.floor(Math.random() * 6) + 1;
            diceData.push({ type: 6, result });
            rawSum += result;

            if (result > successThreshold) {
                rawSuccesses++;
                rollStrings.push(`${result}✓`);
                asteriskResults.push(`${result}✓`);
            } else {
                rollStrings.push(`${result}✖`);
                asteriskResults.push(`${result}✖`);
            }
        }

        let actualFlatMod = flatMod;
        let seNegated = false;

        // Apply Pokerole rule: Flat Super Effective bonuses do not apply if base attack completely missed (0 Successes)
        if (rollType === 'damage' && rawSuccesses === 0 && seFlatMod > 0 && numDice > 0) {
            actualFlatMod -= seFlatMod;
            seNegated = true;
        }

        const finalSuccesses = Math.max(0, rawSuccesses + actualFlatMod);
        const finalSum = rawSum + actualFlatMod;
        const modStr = actualFlatMod > 0 ? `+${actualFlatMod}` : actualFlatMod < 0 ? `-${Math.abs(actualFlatMod)}` : '';

        // Detect critical hit:
        const critMatch = label.match(/Crit on (\d+)\+/i);
        const isAccCrit = Boolean(critMatch && finalSuccesses >= parseInt(critMatch[1], 10) && finalSuccesses > 0);
        const isDmgCrit = rollType === 'damage' && (/CRITICAL HIT/i.test(label) || /Critical Hit/i.test(label));
        const isCrit = isAccCrit || isDmgCrit;

        // Detect critical failure:
        const neededSuccMatch = label.match(/Need (\d+) Succ/i);
        const neededSucc = neededSuccMatch ? parseInt(neededSuccMatch[1], 10) : null;
        const isCritFail = Boolean(neededSucc !== null && neededSucc >= 3 && finalSuccesses <= neededSucc - 3);

        // Safely wipe emojis strictly from the start in case they were appended
        const cleanLabel = label.replace(/^(?:🎲|💥|🩹|🍀|🎯|🛡️|❄️|🛡|❄)\s*/u, '').trim();
        const privacyTag = targetVisibility === 'gm_only' ? '[PRIVATE] ' : '';
        const finalLabel = `${privacyTag}${cleanLabel}`;

        let popupMessage = '';
        if (numDice === 0) {
            if (rollType === 'damage') {
                popupMessage = `Direct Damage Override -> ${finalSuccesses} Total Damage`;
            } else {
                popupMessage = `Set Value -> ${finalSuccesses}`;
            }
        } else if (isSuccessRoll) {
            if (rollType === 'damage' && actualFlatMod !== 0) {
                const sign = actualFlatMod > 0 ? '+' : '-';
                popupMessage = `[${asteriskResults.join(', ')}] -> ${rawSuccesses} Succ ${sign} ${Math.abs(actualFlatMod)} Extra Dmg = ${finalSuccesses} Total Damage`;
            } else if (rollType === 'damage') {
                if (rawSuccesses === 0) {
                    popupMessage = `[${asteriskResults.join(', ')}] -> 0 Dice Successes (Deals 1 Base Damage)`;
                } else {
                    popupMessage = `[${asteriskResults.join(', ')}] -> ${finalSuccesses} Total Damage`;
                }
            } else if (rollType === 'chance') {
                if (finalSuccesses > 0) {
                    popupMessage = `[${asteriskResults.join(', ')}] -> ${finalSuccesses} Success${finalSuccesses === 1 ? '' : 'es'}! Effect Inflicted!`;
                } else {
                    popupMessage = `[${asteriskResults.join(', ')}] -> 0 Successes (No Effect)`;
                }
            } else {
                popupMessage = `[${asteriskResults.join(', ')}]${modStr} -> ${finalSuccesses} Successes`;
            }
        } else {
            popupMessage = `[${diceData.map((d) => d.result).join(', ')}]${modStr} -> ${finalSum}`;
        }

        if (rollType === 'damage' && numDice > 0 && rawSuccesses === 0) {
            if (seNegated) {
                popupMessage += `\n( 0 base successes: Super Effective bonus negated )`;
            }
            popupMessage += `\n0 Successes: Still deals 1 Base Damage (unless target has Resistance / Protect). Added effects & Chance Dice do not trigger.`;
        }

        if (isCrit) {
            popupMessage += "\nIt's a critical hit!";
        }
        if (isCritFail) {
            popupMessage += '\nIt is a critical failure!';
        }

        const executeStateIntercepts = async (messageAppendix: string = '') => {
            let finalMsg = popupMessage + messageAppendix;

            if (rollType === 'init' && state.tokenId) {
                const baseInit = parseInt(payload) || 0;
                const rollValue = isSuccessRoll ? finalSuccesses : finalSum;
                await assignInitiative(state.tokenId, rollValue, baseInit);
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
                    const currentTempMax = store.health.temporaryHitPointsMax || 0;

                    if (tempGained > currentTempMax) {
                        store.updateHealth('temporaryHitPointsMax', tempGained);
                        store.updateHealth('temporaryHitPoints', tempGained);
                        finalMsg += `\nGained ${tempGained} Temp HP`;
                    } else {
                        finalMsg += `\nCurrent Shield Holds`;
                    }
                }
            } else if (rollType === 'acc_face' && state.tokenId && payload) {
                const [moveId, targetFaceStr, limitStr] = payload.split('_');
                const targetFace = parseInt(targetFaceStr, 10) || 6;
                const limit = parseInt(limitStr, 10) || 6;
                const matches = diceData.filter((d) => d.result === targetFace).length;

                if (matches > 0) {
                    const store = useCharacterStore.getState();
                    const newBank = { ...store.trackers.bankedAccDice };

                    const currentBank = newBank[moveId] || 0;
                    const spaceLeft = Math.max(0, limit - currentBank);
                    const actualAdded = Math.min(matches, spaceLeft);

                    if (actualAdded > 0) {
                        newBank[moveId] = currentBank + actualAdded;
                        store.updateTracker('bankedAccDice', newBank);

                        const limitMsg = actualAdded < matches ? ` (Max ${limit})` : '';
                        finalMsg += `\nBanked +${actualAdded} Damage Dice!${limitMsg}`;
                    } else {
                        finalMsg += `\nBank is full! (Max ${limit})`;
                    }
                }
            } else if (rollType === 'status' && payload && finalSuccesses > 0) {
                const statusId = payload;
                const store = useCharacterStore.getState();
                const targetStatus = store.statuses.find((s) => s.id === statusId);
                if (targetStatus) {
                    store.updateStatus(statusId, 'rounds', targetStatus.rounds + finalSuccesses);
                }
                finalMsg += `\nReduced Status by ${finalSuccesses}`;
            }
            return finalMsg;
        };

        // --- STANDALONE MODE (no OBR connection) ---
        if (isStandaloneMode || !OBR.isAvailable) {
            const compiledMessage = await executeStateIntercepts('');
            addRollLogEntry(
                finalLabel,
                compiledMessage,
                icon,
                playerName,
                playerName,
                state.tokenId || undefined,
                rollType,
                isCrit,
                targetVisibility,
                { ...options, isCritFail }
            );
            return;
        }

        // --- NATIVE OBR ROLL ---
        const playerId = await OBR.player.getId();
        const obrPlayerName = await OBR.player.getName();

        await dispatchNativeObrRoll({
            diceEngine,
            obrPlayerName,
            playerName,
            playerId,
            tokenId: state.tokenId || undefined,
            finalLabel,
            icon,
            rollType,
            targetVisibility,
            isCrit,
            isCritFail,
            diceData,
            options,
            executeStateIntercepts: () => executeStateIntercepts('')
        });
    } catch (error) {
        console.error('[DiceRoller] Broadcast Error:', error);
    }
}

// Export alias for cleaner naming while maintaining backward compatibility with all callers
export const rollDice = rollDicePlus;
