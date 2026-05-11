import OBR from '@owlbear-rodeo/sdk';
import { useCharacterStore } from '../store/useCharacterStore';
import { getPainPenalty, getStatusPenalties } from './combatMath';

export async function rollDicePlus(notation: string, label: string, rollType = 'roll', payload = '') {
    if (!OBR.isAvailable) {
        console.log(`[Offline Roll] ${notation} for ${label}`);
        return;
    }
    try {
        const state = useCharacterStore.getState();
        const diceEngine = state.identity.diceEngine || 'dice-plus';
        const isGmDemo = state.identity.gmDemoMode && state.role === 'GM' && diceEngine === 'car';

        const playerId = await OBR.player.getId();
        const playerName = await OBR.player.getName();
        const targetVisibility = state.identity.rolls === 'Private (GM)' ? 'gm_only' : 'everyone';

        if (diceEngine === 'car') {
            const cleanNotation = notation.replace(/\s/g, '');
            const isSuccessRoll = cleanNotation.includes('>');

            const match = cleanNotation.match(/(\d+)d6(?:>(\d+))?(?:([+-]\d+))?/);
            const numDice = match ? parseInt(match[1], 10) : 1;
            const successThreshold = match && match[2] ? parseInt(match[2], 10) : 3;
            const flatMod = match && match[3] ? parseInt(match[3].replace(/\s/g, ''), 10) : 0;

            let overrideDice: number[] | null = null;

            // ⚠️ GM INTERCEPTOR PATTERN ⚠️
            if (isGmDemo && numDice > 0) {
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
            }

            const diceData = [];
            const rollStrings = [];
            const asteriskResults = [];
            let rawSuccesses = 0;
            let rawSum = 0;

            for (let i = 0; i < numDice; i++) {
                const result = overrideDice ? overrideDice[i] : Math.floor(Math.random() * 6) + 1;
                diceData.push({ type: 6, result });
                rawSum += result;

                if (result > successThreshold) {
                    rawSuccesses++;
                    rollStrings.push(`${result}✓`);
                    asteriskResults.push(`${result}*`);
                } else {
                    rollStrings.push(`${result}✖`);
                    asteriskResults.push(`${result}`);
                }
            }

            const finalSuccesses = Math.max(0, rawSuccesses + flatMod);
            const finalSum = rawSum + flatMod;
            const modStr = flatMod > 0 ? ` + ${flatMod}` : flatMod < 0 ? ` - ${Math.abs(flatMod)}` : '';

            const cleanLabel = label.replace(/^[🎲💥🩹🍀🎯]\s*/u, '').trim();
            const privacyTag = targetVisibility === 'gm_only' ? '[PRIVATE] ' : '';
            const finalLabel = `${privacyTag}${cleanLabel}`;

            let popupMessage = '';
            if (numDice === 0) {
                popupMessage = `${finalLabel}\nSet Damage → ${finalSuccesses}`;
            } else if (isSuccessRoll) {
                popupMessage = `${finalLabel}\n[${asteriskResults.join(', ')}]${modStr} → ${finalSuccesses} Successes`;
            } else {
                popupMessage = `${finalLabel}\n[${diceData.map((d) => d.result).join(', ')}]${modStr} → ${finalSum}`;
            }

            const icon = state.identity.tokenImageUrl || 'https://lordcongra.github.io/poke-e-role/pokeball.svg';
            const mensaje = `${playerName} | ${finalLabel}`;

            let diceTheme: unknown = undefined;
            try {
                const roomMeta = await OBR.room.getMetadata();
                const allThemes = roomMeta['com.grupos-acciones.dice/roomDiceThemes'] as
                    | Record<string, unknown>
                    | undefined;

                if (allThemes && allThemes.players) {
                    const playersMap = allThemes.players as Record<string, Record<string, unknown>>;
                    const connectionId = OBR.player.getConnectionId ? await OBR.player.getConnectionId() : '';
                    const playerThemeData = playersMap[playerId] || playersMap[connectionId];

                    if (playerThemeData && playerThemeData.diceTheme) {
                        diceTheme = playerThemeData.diceTheme;
                    }
                }
            } catch (e) {
                console.warn('Could not fetch CAR dice theme from metadata:', e);
            }

            const broadcastPayload = { mensaje, icon, diceData, diceTheme };

            if (targetVisibility === 'gm_only') {
                await OBR.broadcast.sendMessage('tirada:mensaje', broadcastPayload, { destination: 'LOCAL' });
            } else {
                await OBR.broadcast.sendMessage('tirada:mensaje', broadcastPayload, { destination: 'ALL' });
            }

            const delayMs = targetVisibility === 'gm_only' ? 250 : 3500;

            setTimeout(async () => {
                const rollLogData = {
                    id: crypto.randomUUID(),
                    player: playerName,
                    playerId: playerId,
                    label: finalLabel,
                    result: popupMessage,
                    icon,
                    targetVisibility
                };

                // Defensive LocalStorage Interaction
                try {
                    const storedLog = JSON.parse(localStorage.getItem('pkr_roll_log') || '[]');
                    const existingLog = Array.isArray(storedLog) ? storedLog : [];
                    localStorage.setItem('pkr_roll_log', JSON.stringify([rollLogData, ...existingLog].slice(0, 50)));
                } catch (error) {
                    console.warn('Failed to update roll log cache safely. Resetting log.', error);
                    try {
                        localStorage.setItem('pkr_roll_log', JSON.stringify([rollLogData]));
                    } catch (e) {
                        console.error('LocalStorage is completely inaccessible.', e);
                    }
                }

                await OBR.broadcast.sendMessage('pokerole-pmd-extension/roll-log-sync', rollLogData, {
                    destination: 'REMOTE'
                });
                await OBR.broadcast.sendMessage('pokerole-pmd-extension/roll-log-update', {}, { destination: 'LOCAL' });

                const baseUrl = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
                await OBR.popover
                    .open({
                        id: 'pkr-roll-log',
                        url: `${baseUrl}/roll-log.html`,
                        height: 380,
                        width: 320,
                        disableClickAway: true,
                        anchorReference: 'POSITION',
                        anchorPosition: { top: 99999, left: 99999 },
                        transformOrigin: { vertical: 'BOTTOM', horizontal: 'RIGHT' }
                    })
                    .catch(() => {});

                if (rollType === 'init') {
                    const tiebreaker = Math.floor(Math.random() * 6) + 1;
                    const finalInit = finalSum + tiebreaker / 10;

                    if (state.tokenId) {
                        await OBR.scene.items.updateItems([state.tokenId], (items) => {
                            for (const item of items) {
                                const existing =
                                    (item.metadata['com.pretty-initiative/metadata'] as Record<string, unknown>) || {};
                                item.metadata['com.pretty-initiative/metadata'] = {
                                    ...existing,
                                    count: finalInit.toString(),
                                    active: existing.active !== undefined ? existing.active : false,
                                    group: existing.group !== undefined ? existing.group : 1
                                };
                            }
                        });
                    }
                } else if (rollType === 'damage' && payload && finalSuccesses > 0) {
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
                            OBR.notification.show(
                                `✅ Result: ${finalSuccesses} Successes! (Gained ${tempGained} Temp HP 🛡️)`
                            );
                        } else {
                            OBR.notification.show(`✅ Result: ${finalSuccesses} Successes! (Current Shield Holds 🛡️)`);
                        }
                    }
                } else if (rollType === 'status' && payload) {
                    const statusId = payload;
                    if (state.tokenId) {
                        await OBR.scene.items.updateItems([state.tokenId], (items) => {
                            for (const item of items) {
                                const meta =
                                    (item.metadata['pokerole-extension/stats'] as Record<string, unknown>) || {};
                                const statusListStr = String(meta['status-list'] || '[]');
                                try {
                                    const statuses = JSON.parse(statusListStr);
                                    let changed = false;
                                    for (const s of statuses) {
                                        if (s.id === statusId) {
                                            s.rounds += finalSuccesses;
                                            changed = true;
                                        }
                                    }
                                    if (changed) meta['status-list'] = JSON.stringify(statuses);
                                } catch (e) {}
                            }
                        });
                    }
                }
            }, delayMs);

            return;
        }

        OBR.notification.show(label);
        const uniqueId = crypto.randomUUID();
        const rollId = payload
            ? `${rollType}|${state.tokenId}|${payload}|${uniqueId}`
            : `${rollType}|${state.tokenId}|${uniqueId}`;

        await OBR.broadcast.sendMessage(
            'dice-plus/roll-request',
            {
                rollId: rollId,
                playerId,
                playerName,
                rollTarget: targetVisibility,
                diceNotation: notation,
                showResults: true,
                timestamp: Date.now(),
                source: 'pokerole-pmd-extension'
            },
            { destination: 'ALL' }
        );
    } catch (error) {
        console.error('Dice Engine Broadcast Error:', error);
    }
}

export async function rollGeneric(
    actionName: string,
    dicePool: number,
    attribute: string,
    incrementEvade = false,
    incrementClash = false,
    incrementAction = false
) {
    const state = useCharacterStore.getState();
    const nickname = state.identity.nickname || state.identity.species || 'Someone';
    const abilityString = (state.identity.ability || '').toLowerCase();

    const statuses = getStatusPenalties(state);
    const hasComatose = abilityString.includes('comatose');

    if (statuses.isAsleep && !hasComatose) {
        if (OBR.isAvailable) OBR.notification.show('⚠️ You are Asleep and cannot perform actions!', 'WARNING');
        return;
    }

    if (incrementAction) {
        useCharacterStore.getState().incrementAction();
    }
    if (incrementEvade) useCharacterStore.getState().updateTracker('evade', true);
    if (incrementClash) useCharacterStore.getState().updateTracker('clash', true);

    let finalDicePool = dicePool;
    if (attribute.toLowerCase() === 'dex') finalDicePool += statuses.paralysisDexterityPenalty;

    const pain = getPainPenalty(attribute, state);
    const genericSuccessModifier = state.trackers.globalSucc + statuses.confusionPenalty + pain;
    const mathModifier =
        genericSuccessModifier !== 0
            ? genericSuccessModifier > 0
                ? `+${genericSuccessModifier}`
                : `${genericSuccessModifier}`
            : '';

    const chancesUsed = state.trackers.chances;
    const tags: string[] = [];

    if (pain < 0) tags.push(`Pain Penalty ${Math.abs(pain)}`);
    if (genericSuccessModifier !== 0)
        tags.push(`Net Mod ${genericSuccessModifier > 0 ? '+' : ''}${genericSuccessModifier} Succ`);
    if (chancesUsed > 0) tags.push(`Chances: Max ${chancesUsed} Rerolls`);
    if (statuses.paralysisDexterityPenalty < 0 && attribute.toLowerCase() === 'dex') tags.push(`Paralysis: -2 Dice`);

    if (statuses.isAsleep) {
        if (hasComatose) tags.push(`ASLEEP (Comatose)`);
        else tags.push(`ASLEEP`);
    }

    if (statuses.isFrozen) {
        tags.push(`❄️ FROZEN: Attacking Ice Block (5HP/2DEF). Fire/Super-Effective breaks instantly.`);
    }

    const finalTags = tags.length > 0 ? ` [ ${tags.join(' | ')} ]` : '';

    await rollDicePlus(
        `${Math.max(1, finalDicePool)}d6>3${mathModifier}`,
        `🎲 ${nickname} rolled ${actionName}!${finalTags}`
    );
}
