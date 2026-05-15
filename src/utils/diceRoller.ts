import OBR from '@owlbear-rodeo/sdk';
import { useCharacterStore } from '../store/useCharacterStore';

// New Helper Function to safely append and sort an Initiative Score to the Token!
export async function assignInitiative(tokenId: string, rollTotal: number, baseInit: number) {
    if (!OBR.isAvailable) return;
    try {
        const items = await OBR.scene.items.getItems();
        const existingInits = items.map((i) => {
            const meta = i.metadata['pokerole-pmd-extension/initiative'] as { value?: number };
            return meta?.value || -9999;
        });

        let finalInit = 0;
        let isUnique = false;

        // Math explanation: rollTotal is whole numbers. Base Init is a decimal (.XX). Random tie-breaker is tiny decimal (.XXXX)
        while (!isUnique) {
            const tieBreaker = Math.floor(Math.random() * 99);
            finalInit = rollTotal + baseInit / 100 + tieBreaker / 10000;
            if (!existingInits.includes(finalInit)) {
                isUnique = true;
            }
        }

        await OBR.scene.items.updateItems([tokenId], (itemsToUpdate) => {
            for (const item of itemsToUpdate) {
                // Set our new Tracker logic exclusively
                item.metadata['pokerole-pmd-extension/initiative'] = { value: finalInit };
            }
        });
    } catch (e) {
        console.error('Failed to assign Initiative to token:', e);
    }
}

export async function rollDicePlus(notation: string, label: string, rollType = 'roll', payload = '') {
    if (!OBR.isAvailable) {
        console.log(`[Offline Roll] ${notation} for ${label}`);
        return;
    }
    try {
        const state = useCharacterStore.getState();
        const diceEngine = state.identity.diceEngine || 'car';
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

            const diceData: { type: number; result: number }[] = [];
            const rollStrings: string[] = [];
            const asteriskResults: string[] = [];

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
                // --- STATE RESOLUTION INTERCEPTS ---
                if (rollType === 'init' && state.tokenId) {
                    const baseInit = parseInt(payload) || 0;
                    const rollValue = isSuccessRoll ? finalSuccesses : finalSum;
                    await assignInitiative(state.tokenId, rollValue, baseInit);
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
                            popupMessage += `\n🛡️ Gained ${tempGained} Temp HP`;
                        } else {
                            popupMessage += `\n🛡️ Current Shield Holds`;
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
                            popupMessage += `\n💥 Banked +${actualAdded} Damage Dice!${limitMsg}`;
                        } else {
                            popupMessage += `\n💥 Bank is full! (Max ${limit})`;
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
                    if (finalSuccesses > 0) {
                        popupMessage += `\n🩹 Reduced Status by ${finalSuccesses}`;
                    }
                }

                // --- ROLL LOG BROADCAST ---
                const rollLogData = {
                    id: crypto.randomUUID(),
                    player: playerName,
                    playerId: playerId,
                    label: finalLabel,
                    result: popupMessage,
                    icon,
                    targetVisibility
                };

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
