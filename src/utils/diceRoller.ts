import OBR from '@owlbear-rodeo/sdk';
import { useCharacterStore } from '../store/useCharacterStore';
import { isStandaloneMode } from './storageAdapter';

// Defines the structure exactly as saved in Local Storage
export interface StandaloneCombatant {
    id: string;
    name: string;
    image: string;
    d6: number;
    baseInit: number;
    total: number;
    tiebreaker: number;
}

// Helper to push roll entries to local storage for the Standalone Roll Log widget
export function addRollLogEntry(label: string, result: string, icon: string, player: string) {
    const rollLogData = {
        id: crypto.randomUUID(),
        player,
        label,
        result,
        icon: icon || `${import.meta.env.BASE_URL || '/'}pokeball.svg`
    };
    try {
        const stored = JSON.parse(localStorage.getItem('pkr_roll_log') || '[]');
        const existing = Array.isArray(stored) ? stored : [];
        localStorage.setItem('pkr_roll_log', JSON.stringify([rollLogData, ...existing].slice(0, 50)));
        window.dispatchEvent(new Event('pkr-roll-log-update'));
        window.dispatchEvent(new Event('storage'));
    } catch (e) {
        console.error('[DiceRoller] Failed to log roll to localStorage:', e);
    }
}

export async function assignInitiative(tokenId: string, rollTotal: number, baseInit: number) {
    // Note: The combat roll macro already computes D6 + BaseInit before invoking assignInitiative.
    // Therefore `rollTotal` is the exact integer score (e.g. 8).
    const tiebreakerDec = (Math.floor(Math.random() * 99) + 1) / 100;

    if (isStandaloneMode) {
        try {
            const listStr = localStorage.getItem('pkr_standalone_init_list');
            if (!listStr) return;
            const list: StandaloneCombatant[] = JSON.parse(listStr);

            const rawD6 = rollTotal - baseInit;
            const finalInit = rollTotal + tiebreakerDec;

            const updated = list.map((c) =>
                c.id === tokenId
                    ? {
                          ...c,
                          d6: rawD6,
                          baseInit: baseInit,
                          total: finalInit,
                          tiebreaker: tiebreakerDec
                      }
                    : c
            );

            localStorage.setItem('pkr_standalone_init_list', JSON.stringify(updated));
            window.dispatchEvent(new Event('pkr-standalone-init-update'));
        } catch (e) {
            console.error('[DiceRoller] Standalone Init Error:', e);
        }
        return;
    }

    if (!OBR.isAvailable) return;
    try {
        const items = await OBR.scene.items.getItems();
        const existingInits = items.map((i) => {
            const meta = i.metadata['pokerole-pmd-extension/initiative'] as { value?: number };
            return meta?.value || -9999;
        });

        let finalInit = rollTotal + tiebreakerDec;
        let isUnique = !existingInits.includes(finalInit);

        // If the EXACT tiebreaker decimal collides with another token, re-roll the decimal
        while (!isUnique) {
            const newTieBreaker = (Math.floor(Math.random() * 99) + 1) / 100;
            finalInit = rollTotal + newTieBreaker;
            if (!existingInits.includes(finalInit)) isUnique = true;
        }

        await OBR.scene.items.updateItems([tokenId], (itemsToUpdate) => {
            for (const item of itemsToUpdate) {
                item.metadata['pokerole-pmd-extension/initiative'] = { value: finalInit };
            }
        });
    } catch (e) {
        console.error('[DiceRoller] Failed to assign Initiative to token:', e);
    }
}

export async function broadcastInfo(title: string, description: string) {
    const state = useCharacterStore.getState();
    const playerName = state.identity.nickname || state.identity.species || 'Trainer';
    const icon = state.identity.tokenImageUrl || `${import.meta.env.BASE_URL || '/'}pokeball.svg`;

    if (isStandaloneMode || !OBR.isAvailable) {
        addRollLogEntry(`📢 ${title}`, description, icon, playerName);
        return;
    }

    try {
        const playerId = await OBR.player.getId();
        const obrPlayerName = await OBR.player.getName();
        const targetVisibility = state.identity.rolls === 'Private (GM)' ? 'gm_only' : 'everyone';

        const rollLogData = {
            id: crypto.randomUUID(),
            player: obrPlayerName,
            playerId: playerId,
            label: `📢 ${title}`,
            result: description,
            icon,
            targetVisibility
        };

        let existingLog: Record<string, unknown>[] = [];
        try {
            const storedLog = JSON.parse(localStorage.getItem('pkr_roll_log') || '[]');
            existingLog = Array.isArray(storedLog) ? storedLog : [];
        } catch (parseError) {
            console.warn('[DiceRoller] Roll log cache corrupted', parseError);
        }
        localStorage.setItem('pkr_roll_log', JSON.stringify([rollLogData, ...existingLog].slice(0, 50)));

        await OBR.broadcast.sendMessage('pokerole-pmd-extension/roll-log-sync', rollLogData, { destination: 'REMOTE' });
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
            .catch((e) => console.warn('[DiceRoller] Failed to open roll log popover', e));
    } catch (error) {
        console.error('[DiceRoller] Broadcast Info Error:', error);
    }
}

export async function rollDicePlus(notation: string, label: string, rollType = 'roll', payload = '') {
    const state = useCharacterStore.getState();
    const diceEngine = state.identity.diceEngine || 'car';
    const isGmDemo = state.identity.gmDemoMode && state.role === 'GM' && diceEngine === 'car';
    const targetVisibility = state.identity.rolls === 'Private (GM)' ? 'gm_only' : 'everyone';
    const playerName = state.identity.nickname || state.identity.species || 'Trainer';
    const icon = state.identity.tokenImageUrl || `${import.meta.env.BASE_URL || '/'}pokeball.svg`;

    if (diceEngine === 'car') {
        const cleanNotation = notation.replace(/\s/g, '');
        const isSuccessRoll = cleanNotation.includes('>');

        const match = cleanNotation.match(/(\d+)d6(?:>(\d+))?(?:([+-]\d+))?/);
        const numDice = match ? parseInt(match[1], 10) : 1;
        const successThreshold = match && match[2] ? parseInt(match[2], 10) : 3;
        const flatMod = match && match[3] ? parseInt(match[3].replace(/\s/g, ''), 10) : 0;

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

        // Safely wipe emojis strictly from the start in case they were appended
        const cleanLabel = label.replace(/^[🎲💥🩹🍀🎯🛡️❄️]\s*/u, '').trim();
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
                popupMessage = `[${asteriskResults.join(', ')}] -> ${finalSuccesses} Total Damage`;
            } else {
                popupMessage = `[${asteriskResults.join(', ')}]${modStr} -> ${finalSuccesses} Successes`;
            }
        } else {
            popupMessage = `[${diceData.map((d) => d.result).join(', ')}]${modStr} -> ${finalSum}`;
        }

        if (seNegated) {
            popupMessage += `\n( 0 base successes: Super Effective bonus negated )`;
        }

        const executeStateIntercepts = async (messageAppendix: string) => {
            let finalMsg = popupMessage + messageAppendix;

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
                        finalMsg += `\n🛡️ Gained ${tempGained} Temp HP`;
                    } else {
                        finalMsg += `\n🛡️ Current Shield Holds`;
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
                        finalMsg += `\n💥 Banked +${actualAdded} Damage Dice!${limitMsg}`;
                    } else {
                        finalMsg += `\n💥 Bank is full! (Max ${limit})`;
                    }
                }
            }
            return finalMsg;
        };

        // --- STANDALONE OVERRIDE: Log directly to Roll Log widget ---
        if (isStandaloneMode || !OBR.isAvailable) {
            const compiledMessage = await executeStateIntercepts('');
            addRollLogEntry(finalLabel, compiledMessage, icon, playerName);
            return;
        }

        // --- NATIVE OBR ROLL ---
        const playerId = await OBR.player.getId();
        const obrPlayerName = await OBR.player.getName();
        const mensaje = `${obrPlayerName} | ${finalLabel}`;

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
            console.warn('[DiceRoller] Failed to load dice theme', e);
        }

        const broadcastPayload = { mensaje, icon, diceData, diceTheme };
        if (targetVisibility === 'gm_only') {
            await OBR.broadcast.sendMessage('tirada:mensaje', broadcastPayload, { destination: 'LOCAL' });
        } else {
            await OBR.broadcast.sendMessage('tirada:mensaje', broadcastPayload, { destination: 'ALL' });
        }

        const delayMs = targetVisibility === 'gm_only' ? 250 : 3500;
        setTimeout(async () => {
            const finalCompiledMsg = await executeStateIntercepts('');

            const rollLogData = {
                id: crypto.randomUUID(),
                player: obrPlayerName,
                playerId: playerId,
                label: finalLabel,
                result: finalCompiledMsg,
                icon,
                targetVisibility
            };

            try {
                let existingLog: Record<string, unknown>[] = [];
                try {
                    const storedLog = JSON.parse(localStorage.getItem('pkr_roll_log') || '[]');
                    existingLog = Array.isArray(storedLog) ? storedLog : [];
                } catch (parseError) {
                    console.warn('[DiceRoller] Roll log cache corrupted', parseError);
                }
                localStorage.setItem('pkr_roll_log', JSON.stringify([rollLogData, ...existingLog].slice(0, 50)));
            } catch (error) {
                try {
                    localStorage.removeItem('pkr_roll_log');
                    localStorage.setItem('pkr_roll_log', JSON.stringify([rollLogData]));
                } catch (e) {
                    console.error('[DiceRoller] Local storage totally failed', e);
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
                .catch((e) => console.warn('[DiceRoller] Roll log popover failed', e));
        }, delayMs);
    }
}
