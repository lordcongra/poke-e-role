import OBR from '@owlbear-rodeo/sdk';
import type { CharacterState, MoveData } from '../../store/storeTypes';
import { useCharacterStore } from '../../store/useCharacterStore';
import { isStandaloneMode } from '../sync/storageAdapter';
import { parseCombatTags } from '../tagParser/index';
import { getAbilityText, getWeatherDamageBonus, getPainPenalty } from './combatUtils';
import type { MultiTargetSelection } from '../../components/modals/combat/targetingModalUtils';
import { addRollLogEntry } from './diceRoller';
import { broadcastRollLog } from './rollLogSync';
import { showDicePlusRetirementNotice } from '../../hooks/owlbearSync/owlbearSyncConstants';

export async function executeMultiTargetDamageRoll(
    move: MoveData,
    state: CharacterState,
    baseDamage: number,
    isCritical: boolean,
    selections: MultiTargetSelection[],
    override: { active: boolean; type: 'dice' | 'flat' | 'dice-ignore'; value: number },
    fieldFactors?: string[]
): Promise<void> {
    const nickname = state.identity.nickname || state.identity.species || 'Someone';
    const abilityText = getAbilityText(state.identity.ability, state.roomCustomAbilities);
    const itemBuffs = parseCombatTags(state.inventory, state.extraCategories, move, abilityText);
    const icon = state.identity.tokenImageUrl || `${import.meta.env?.BASE_URL || '/'}pokeball-token.svg`;
    const targetVisibility = state.identity.rolls === 'Private (GM)' ? 'gm_only' : 'everyone';
    const privacyTag = targetVisibility === 'gm_only' ? '[PRIVATE] ' : '';

    const rawEngine = (state.identity.diceEngine as unknown as string) || 'car';
    if (rawEngine === 'dice-plus') {
        showDicePlusRetirementNotice(
            '[ ⚠️ ] Dice+ has been retired. Switched to Custom Action Rolls! If you do not have it installed, get it here: https://custom-action-rolls.narcolepticdracu.com/manifest.json'
        );
        state.updateRoomSetting('diceEngine', 'car');
    }
    const diceEngine: 'car' | 'log-only' = rawEngine === 'log-only' ? 'log-only' : 'car';
    const isGmDemo = Boolean(state.identity.gmDemoMode && state.role === 'GM');

    const tags: string[] = [];

    if (fieldFactors && fieldFactors.length > 0) {
        const normalizedFactors = fieldFactors.map((f) => f.replace('-1 Dmg', '-1 Damage'));
        tags.push(`Factors: ${normalizedFactors.join(', ')}`);
    }

    let effectiveBaseDamage = baseDamage;
    let attackerFlatMod = state.trackers.globalSucc;

    // Apply Overrides
    if (override.active) {
        if (override.type === 'flat') {
            effectiveBaseDamage = 0;
            tags.push(`Manual Override: ${override.value} True Damage`);
        } else if (override.type === 'dice') {
            effectiveBaseDamage = override.value;
            tags.push(`Manual Override: ${override.value} Base Dice`);
        } else if (override.type === 'dice-ignore') {
            effectiveBaseDamage = override.value;
            tags.push(`Manual Override: ${override.value} Dice (Ignores Def)`);
        }
    }

    // Critical Hit Bonus
    if (isCritical) {
        const critDiceBonus = 2 + (itemBuffs.critDmg || 0);
        if (!override.active || override.type !== 'flat') {
            effectiveBaseDamage += critDiceBonus;
        }
        if (itemBuffs.critDmg > 0) {
            tags.push(`Critical Hit (+${critDiceBonus} Dice)`);
        } else {
            tags.push('CRITICAL HIT');
        }
    }

    // Banked Excess Accuracy Dice
    const bankedDice = state.trackers.bankedAccDice[move.id] || 0;
    if (bankedDice > 0 && (!override.active || override.type !== 'flat')) {
        effectiveBaseDamage += bankedDice;
        tags.push(`Banked Excess Acc (+${bankedDice} Dmg)`);
        const newBank = { ...state.trackers.bankedAccDice };
        delete newBank[move.id];
        useCharacterStore.getState().updateTracker('bankedAccDice', newBank);
    }

    // Weather Effects
    if (!override.active || override.type !== 'flat') {
        const isHalfHp = state.health.hpCurr <= Math.floor(state.health.hpMax / 2);
        const weatherInfo = getWeatherDamageBonus(
            move.type,
            state.activeBattlefield,
            isHalfHp,
            state.identity.isNPC,
            state
        );
        if (weatherInfo.diceBonus > 0) {
            effectiveBaseDamage += weatherInfo.diceBonus;
        }
        if (weatherInfo.flatPenalty > 0) {
            attackerFlatMod -= weatherInfo.flatPenalty;
        }
        if (weatherInfo.tag) {
            tags.push(weatherInfo.tag);
        }
    }

    // Pain Penalties
    const rawPain = getPainPenalty(move.dmg1, state);
    const pain = getPainPenalty(move.dmg1, state, itemBuffs, move);
    if (pain < 0) {
        attackerFlatMod += pain;
        tags.push(`Pain Penalty ${Math.abs(pain)}: ${pain} Succ`);
    } else if (rawPain < 0 && itemBuffs.ignorePain) {
        tags.push('Ignored Pain Penalty');
    }

    if (state.trackers.globalSucc !== 0) {
        tags.push(`Tracker Mod: ${state.trackers.globalSucc > 0 ? '+' : ''}${state.trackers.globalSucc} Succ`);
    }

    if (itemBuffs.firstHitDmg !== 0 && state.trackers.firstHitDmg) {
        const sign = itemBuffs.firstHitDmg > 0 ? '+' : '';
        tags.push(`First Hit (${sign}${itemBuffs.firstHitDmg} Dice)`);
        useCharacterStore.getState().updateTracker('firstHitDmg', false);
    }

    const activeTargets = selections.filter((s) => !s.isEvaded);
    const isFlatOverride = override.active && override.type === 'flat';
    const ignoresDef = override.active && override.type === 'dice-ignore';

    // Calculate individual target pools (with invariant: minimum 1 die if not flat override)
    const targetPools = new Map<string, number>();
    for (const t of activeTargets) {
        const effDef = ignoresDef ? 0 : t.def;
        const pool = isFlatOverride ? 0 : Math.max(1, effectiveBaseDamage - effDef);
        targetPools.set(t.id, pool);
    }

    // Maximum dice pool required across all targets
    const maxDice =
        activeTargets.length > 0 && !isFlatOverride
            ? Math.max(...activeTargets.map((t) => targetPools.get(t.id) ?? 1))
            : 0;

    let overrideDice: number[] | null = null;
    if (isGmDemo && maxDice > 0 && !isStandaloneMode) {
        overrideDice = await new Promise<number[] | null>((resolve) => {
            useCharacterStore.getState().setPendingDemoRoll({
                notation: `${maxDice}d6>3`,
                numDice: maxDice,
                successThreshold: 3,
                flatMod: 0,
                resolve
            });
        });
        useCharacterStore.getState().setPendingDemoRoll(null);
        if (!overrideDice) return;
    }

    const diceResults: number[] = [];
    const diceData: { type: number; result: number }[] = [];
    const diceResultStrings: string[] = [];

    for (let i = 0; i < maxDice; i++) {
        const result = overrideDice ? overrideDice[i] : Math.floor(Math.random() * 6) + 1;
        diceResults.push(result);
        diceData.push({ type: 6, result });
        diceResultStrings.push(`${result}${result > 3 ? '✓' : '✖'}`);
    }

    const targetLines: string[] = [];
    let anyZeroSucc = false;
    let anySeNegated = false;

    for (const target of selections) {
        if (target.isEvaded) {
            targetLines.push(`• ${target.name}: Evaded/Clashed`);
            continue;
        }

        if (isFlatOverride) {
            const effMod = target.effectiveness;
            const totalDmg = Math.max(0, override.value + effMod);
            const effStr = effMod > 0 ? ` (+${effMod} SE)` : effMod < 0 ? ` (${effMod} NVE)` : '';
            targetLines.push(
                `• ${target.name} (Direct Override): ${override.value} Flat Dmg${effStr} = ${totalDmg} Total Damage`
            );
            continue;
        }

        const effDef = ignoresDef ? 0 : target.def;
        const tPool = targetPools.get(target.id) ?? Math.max(1, effectiveBaseDamage - effDef);
        const tSlice = diceResults.slice(0, tPool);
        const rawSucc = tSlice.filter((d) => d > 3).length;

        let effMod = target.effectiveness;
        let seNegated = false;
        if (rawSucc === 0 && effMod > 0) {
            effMod = 0;
            seNegated = true;
            anySeNegated = true;
        }
        if (rawSucc === 0) {
            anyZeroSucc = true;
        }

        const poolWord = tPool === 1 ? 'die' : 'dice';
        const defLabel = ignoresDef ? 'DEF 0 [Ignored]' : `DEF ${effDef}`;

        if (rawSucc > 0) {
            const baseDmg = rawSucc + attackerFlatMod;
            const totalDmg = Math.max(0, baseDmg + effMod);
            const effStr = effMod > 0 ? ` (+${effMod} SE)` : effMod < 0 ? ` (${effMod} NVE)` : '';
            targetLines.push(
                `• ${target.name} (${defLabel}, ${tPool} ${poolWord} -> ${rawSucc} Succ): ${baseDmg} Dmg${effStr} = ${totalDmg} Total Damage`
            );
        } else {
            // 0 successes rule: deals 1 base damage (unless resistant/immune/protect)
            const baseDmg = 1 + attackerFlatMod;
            const totalDmg = Math.max(0, baseDmg + effMod);
            const negatedStr = seNegated ? ' [SE Negated]' : '';
            const effStr = effMod < 0 ? ` (${effMod} NVE)` : '';
            targetLines.push(
                `• ${target.name} (${defLabel}, ${tPool} ${poolWord} -> 0 Succ): Deals 1 Base Dmg${negatedStr}${effStr} = ${totalDmg} Total Damage`
            );
        }
    }

    const headerDice =
        maxDice > 0 ? `Rolled Dice Pool (${maxDice}d6): [ ${diceResultStrings.join(', ')} ]\n\n` : '';
    const breakdownText = targetLines.join('\n');
    const footnotes: string[] = [];
    if (anySeNegated) {
        footnotes.push('• 0 base successes: Super Effective bonus negated.');
    }
    if (anyZeroSucc) {
        footnotes.push(
            '• 0 Successes: Still deals 1 Base Damage (unless target has Resistance / Protect). Added effects do not trigger.'
        );
    }
    if (isCritical) {
        footnotes.push("• It's a critical hit!");
    }
    footnotes.push('• Damage is informational only — please apply damage manually to target sheets.');

    const finalCompiledMsg = `${headerDice}${breakdownText}\n\n${footnotes.join('\n')}`;
    const finalTags = tags.length > 0 ? ` [ ${tags.join(' | ')} ]` : '';
    const cleanLabel = `${nickname} rolled ${move.name || 'Damage'} (Multi-Target)!${finalTags}`;
    const finalLabel = `${privacyTag}${cleanLabel}`;

    // --- STANDALONE MODE (no OBR connection) ---
    if (isStandaloneMode || !OBR.isAvailable) {
        addRollLogEntry(
            finalLabel,
            finalCompiledMsg,
            icon,
            nickname,
            nickname,
            state.tokenId || undefined,
            'damage',
            isCritical,
            targetVisibility
        );
        return;
    }

    // --- NATIVE OBR ROLL ---
    try {
        const playerId = await OBR.player.getId();
        const obrPlayerName = await OBR.player.getName();

        // PERFORMANCE MODE (Pure Roll Log without 3D Dice)
        if (diceEngine === 'log-only') {
            const rollLogData = {
                id: crypto.randomUUID(),
                player: obrPlayerName,
                characterName: nickname,
                tokenId: state.tokenId || undefined,
                playerId: playerId,
                label: finalLabel,
                result: finalCompiledMsg,
                icon,
                rollType: 'damage',
                targetVisibility,
                isCrit: isCritical
            };
            await broadcastRollLog(rollLogData);
            return;
        }

        // --- NATIVE OBR 3D DICE ROLL (Custom Action Rolls) ---
        const critPrefix = isCritical ? 'CRITICAL HIT! | ' : '';
        const mensaje = `${obrPlayerName} | ${critPrefix}${finalLabel}`;

        let diceTheme: Record<string, unknown> | undefined = undefined;
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
                    diceTheme = playerThemeData.diceTheme as Record<string, unknown>;
                }
            }
        } catch (e) {
            console.warn('[MultiTargetDamageRoller] Failed to load dice theme', e);
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
                player: obrPlayerName,
                characterName: nickname,
                tokenId: state.tokenId || undefined,
                playerId: playerId,
                label: finalLabel,
                result: finalCompiledMsg,
                icon,
                rollType: 'damage',
                targetVisibility,
                isCrit: isCritical
            };

            await broadcastRollLog(rollLogData);
        }, delayMs);
    } catch (error) {
        console.error('[MultiTargetDamageRoller] Failed to broadcast roll:', error);
    }
}
