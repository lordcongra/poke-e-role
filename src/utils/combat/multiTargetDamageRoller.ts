import OBR from '@owlbear-rodeo/sdk';
import type { CharacterState, MoveData } from '../../store/storeTypes';
import { useCharacterStore } from '../../store/useCharacterStore';
import { isStandaloneMode } from '../sync/storageAdapter';
import { parseCombatTags } from '../tagParser/index';
import { getAbilityText, getWeatherDamageBonus, getPainPenalty } from './combatUtils';
import { buildDefenseTierGroups, type MultiTargetSelection } from '../../components/modals/combat/targetingModalUtils';
import { addRollLogEntry } from './diceRoller';
import { broadcastRollLog } from './rollLogSync';
import { showDicePlusRetirementNotice } from '../../hooks/owlbearSync/owlbearSyncConstants';

async function emitRollLogEntry(params: {
    title: string;
    message: string;
    icon: string;
    nickname: string;
    tokenId?: string;
    targetVisibility: 'everyone' | 'gm_only';
    isCritical: boolean;
    playerId: string;
    obrPlayerName: string;
}): Promise<void> {
    if (isStandaloneMode || !OBR.isAvailable) {
        addRollLogEntry(
            params.title,
            params.message,
            params.icon,
            params.nickname,
            params.nickname,
            params.tokenId,
            'damage',
            params.isCritical,
            params.targetVisibility
        );
        return;
    }

    const rollLogData = {
        id: crypto.randomUUID(),
        player: params.obrPlayerName,
        characterName: params.nickname,
        tokenId: params.tokenId,
        playerId: params.playerId,
        label: params.title,
        result: params.message,
        icon: params.icon,
        rollType: 'damage',
        targetVisibility: params.targetVisibility,
        isCrit: params.isCritical
    };
    await broadcastRollLog(rollLogData);
}

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
    const itemBuffs = parseCombatTags(state.inventory, state.extraCategories, move, abilityText, state.passives);
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

    const allDmgSourceTexts = [
        ...(itemBuffs.dmgPassiveNames || []),
        ...(itemBuffs.dmgItemNames || []),
        ...(itemBuffs.dmgAbilityNames || [])
    ].join(' ');
    const hasSourcedTempHp = /temp\s*hp/i.test(allDmgSourceTexts);

    if (itemBuffs.gainTempHp > 0 && !hasSourcedTempHp) tags.push(`Gains ${itemBuffs.gainTempHp} Temp HP`);
    if (itemBuffs.tempHpOnHit > 0 && !hasSourcedTempHp) tags.push(`Gains ${itemBuffs.tempHpOnHit} Temp HP on Hit`);
    if (itemBuffs.tempHpDmgRatio && !hasSourcedTempHp) tags.push(`Gains ${itemBuffs.tempHpDmgRatio} Dmg as Temp HP`);

    const moveDescription = (move.desc || '').toLowerCase();
    if (moveDescription.includes('powder') || moveDescription.includes('spore')) {
        tags.push('POWDER: Grass-types are immune');
    }

    const pureDmgItems = Array.from(
        new Set(itemBuffs.dmgItemNames.filter((name) => !itemBuffs.dmgPassiveNames?.includes(name)))
    );
    for (const item of pureDmgItems) {
        const tagStr = `Item: ${item}`;
        if (!tags.includes(tagStr)) {
            tags.push(tagStr);
        }
    }
    if (itemBuffs.dmgPassiveNames && itemBuffs.dmgPassiveNames.length > 0) {
        const uniquePassives = Array.from(new Set(itemBuffs.dmgPassiveNames));
        for (const passive of uniquePassives) {
            const tagStr = `Passive: ${passive}`;
            if (!tags.includes(tagStr)) {
                tags.push(tagStr);
            }
        }
    }
    if (itemBuffs.dmgAbilityNames && itemBuffs.dmgAbilityNames.length > 0) {
        const uniqueAbilities = Array.from(new Set(itemBuffs.dmgAbilityNames));
        for (const ability of uniqueAbilities) {
            const tagStr = `Ability: ${ability}`;
            if (!tags.includes(tagStr)) {
                tags.push(tagStr);
            }
        }
    }

    // 1. Filter active targets
    const activeTargets = selections.filter((s) => !s.isEvaded);

    let playerId = '';
    let obrPlayerName = nickname;
    if (!isStandaloneMode && OBR.isAvailable) {
        try {
            playerId = await OBR.player.getId();
            obrPlayerName = await OBR.player.getName();
        } catch {
            playerId = '';
            obrPlayerName = nickname;
        }
    }

    // If all targets are evaded/clashed: log clean informational entry and return early
    if (activeTargets.length === 0) {
        await emitRollLogEntry({
            title: `${privacyTag}[Multi-Target] All targets Clashed or Evaded (0 damage)`,
            message: `All selected targets successfully clashed or evaded ${move.name || 'the move'}. No damage dealt.`,
            icon,
            nickname,
            tokenId: state.tokenId || undefined,
            targetVisibility,
            isCritical: false,
            playerId,
            obrPlayerName
        });
        return;
    }

    // 2. Flat True-Damage Override
    if (override.active && override.type === 'flat') {
        for (const target of activeTargets) {
            const effMod = target.effectiveness;
            const finalDamage = Math.max(0, override.value + effMod);
            const effStr = effMod > 0 ? ` (+${effMod} SE)` : effMod < 0 ? ` (${effMod} NVE)` : '';

            const targetTags = [...tags];
            if (effMod > 0) {
                targetTags.push(`SUPER EFFECTIVE (+${effMod} Succ)`);
            } else if (effMod < 0) {
                targetTags.push(`NOT VERY EFFECTIVE (${effMod} Succ)`);
            }
            const finalTags = targetTags.length > 0 ? ` [ ${targetTags.join(' | ')} ]` : '';
            const title = `${privacyTag}${nickname} rolled ${move.name || 'Damage'} vs ${target.name}${finalTags}`;

            const message = `Direct Damage Override: ${override.value} Flat Dmg${effStr} = ${finalDamage} Total Damage`;

            await emitRollLogEntry({
                title,
                message,
                icon,
                nickname,
                tokenId: state.tokenId || undefined,
                targetVisibility,
                isCritical: false,
                playerId,
                obrPlayerName
            });
        }
        return;
    }

    // 3. Sequenced Defense Tiers
    const ignoresDef = override.active && override.type === 'dice-ignore';
    const targetsForTiers = ignoresDef ? activeTargets.map((t) => ({ ...t, def: 0 })) : activeTargets;
    const tiers = buildDefenseTierGroups(targetsForTiers, effectiveBaseDamage);

    const maxDice = tiers.length > 0 ? tiers[tiers.length - 1].dicePool : 0;
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

    // Load dice theme for Custom Action Rolls
    let diceTheme: Record<string, unknown> | undefined = undefined;
    if (diceEngine === 'car' && !isStandaloneMode && OBR.isAvailable) {
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
    }

    const accumulatedDice: number[] = [];
    const critPrefix = isCritical ? 'CRITICAL HIT! | ' : '';

    // Roll and broadcast 3D dice tier by tier
    for (let tierIndex = 0; tierIndex < tiers.length; tierIndex++) {
        const tier = tiers[tierIndex];
        const countToRoll = tierIndex === 0 ? tier.dicePool : tier.incrementalDice;

        if (countToRoll > 0) {
            let tierRollResults: number[] = [];
            if (overrideDice) {
                tierRollResults = overrideDice.slice(accumulatedDice.length, accumulatedDice.length + countToRoll);
            } else {
                for (let i = 0; i < countToRoll; i++) {
                    tierRollResults.push(Math.floor(Math.random() * 6) + 1);
                }
            }
            accumulatedDice.push(...tierRollResults);

            if (diceEngine === 'car' && !isStandaloneMode && OBR.isAvailable) {
                const diceData = tierRollResults.map((result) => ({ type: 6, result }));
                const tierSuffix =
                    tiers.length > 1
                        ? tierIndex === 0
                            ? ` (Tier 1 vs DEF ${tier.effectiveDef})`
                            : ` (+${tier.incrementalDice}d6 Remainder vs DEF ${tier.effectiveDef})`
                        : '';
                const mensaje = `${obrPlayerName} | ${critPrefix}${privacyTag}${nickname} rolled ${move.name || 'Damage'}${tierSuffix}`;
                const broadcastPayload = { mensaje, icon, diceData, diceTheme };

                if (targetVisibility === 'gm_only') {
                    await OBR.broadcast.sendMessage('tirada:mensaje', broadcastPayload, { destination: 'LOCAL' });
                } else {
                    await OBR.broadcast.sendMessage('tirada:mensaje', broadcastPayload, { destination: 'ALL' });
                }

                if (tierIndex < tiers.length - 1) {
                    await new Promise((r) => setTimeout(r, 600));
                }
            }
        }
    }

    // Allow 3D dice animation to settle before emitting roll logs
    if (diceEngine === 'car' && !isStandaloneMode && OBR.isAvailable) {
        const delayMs = targetVisibility === 'gm_only' ? 250 : 3500;
        await new Promise((r) => setTimeout(r, delayMs));
    }

    // 4. Generate & emit individual roll log per targeted Pokémon
    for (let tierIndex = 0; tierIndex < tiers.length; tierIndex++) {
        const tier = tiers[tierIndex];
        const tierDiceSlice = accumulatedDice.slice(0, tier.dicePool);

        const diceBreakdownLines: string[] = [];
        let effectiveSucc = 0;

        if (tierIndex === 0 || tier.incrementalDice === 0) {
            const rawSucc = tierDiceSlice.filter((d) => d > 3).length;
            effectiveSucc = rawSucc;
            const tierDiceResults = tierDiceSlice.map((d) => `${d}${d > 3 ? '✓' : '✖'}`).join(', ');
            diceBreakdownLines.push(`Dice Pool (${tier.dicePool}d6): [ ${tierDiceResults} ] (${rawSucc} Succ)`);
        } else {
            const baseDiceSlice = accumulatedDice.slice(0, tier.dicePool - tier.incrementalDice);
            const baseSucc = baseDiceSlice.filter((d) => d > 3).length;
            const baseDiceResults = baseDiceSlice.map((d) => `${d}${d > 3 ? '✓' : '✖'}`).join(', ');

            const remainderDiceSlice = accumulatedDice.slice(tier.dicePool - tier.incrementalDice, tier.dicePool);
            const remainderSucc = remainderDiceSlice.filter((d) => d > 3).length;
            const remainderDiceResults = remainderDiceSlice.map((d) => `${d}${d > 3 ? '✓' : '✖'}`).join(', ');

            const totalSucc = baseSucc + remainderSucc;
            effectiveSucc = totalSucc;

            diceBreakdownLines.push(`Base Dice Pool: [ ${baseDiceResults} ] (${baseSucc} Succ)`);
            diceBreakdownLines.push(
                `+ Remainder vs DEF ${tier.effectiveDef} (+${tier.incrementalDice}d6): [ ${remainderDiceResults} ] (${remainderSucc} Succ)`
            );
            diceBreakdownLines.push(`Total (${tier.dicePool}d6): ${totalSucc} Successes`);
        }

        for (const target of tier.targets) {
            let effMod = target.effectiveness;
            let seNegated = false;
            if (effectiveSucc === 0 && effMod > 0) {
                effMod = 0;
                seNegated = true;
            }

            const baseDmg = (effectiveSucc > 0 ? effectiveSucc : 1) + attackerFlatMod;
            const finalDamage = Math.max(0, baseDmg + effMod);
            const effStr =
                effMod > 0 ? ` (+${effMod} SE)` : effMod < 0 ? ` (${effMod} NVE)` : seNegated ? ' [SE Negated]' : '';
            const dmgLine = `${baseDmg} Dmg${effStr} = ${finalDamage} Total Damage`;

            const footnotes: string[] = [];
            if (seNegated) {
                footnotes.push('• 0 base successes: Super Effective bonus negated.');
            }
            if (effectiveSucc === 0) {
                footnotes.push(
                    '• 0 Successes: Still deals 1 Base Damage (unless target has Resistance / Protect). Added effects do not trigger.'
                );
            }
            if (isCritical) {
                footnotes.push("• It's a critical hit!");
            }

            const targetTags = [...tags];
            if (effMod > 0) {
                targetTags.push(`SUPER EFFECTIVE (+${effMod} Succ)`);
            } else if (effMod < 0) {
                targetTags.push(`NOT VERY EFFECTIVE (${effMod} Succ)`);
            }
            const finalTags = targetTags.length > 0 ? ` [ ${targetTags.join(' | ')} ]` : '';
            const title = `${privacyTag}${nickname} rolled ${move.name || 'Damage'} vs ${target.name}${finalTags}`;

            const messageParts = [diceBreakdownLines.join('\n'), dmgLine];
            if (footnotes.length > 0) {
                messageParts.push(footnotes.join('\n'));
            }
            const messageContent = messageParts.join('\n\n');

            await emitRollLogEntry({
                title,
                message: messageContent,
                icon,
                nickname,
                tokenId: state.tokenId || undefined,
                targetVisibility,
                isCritical,
                playerId,
                obrPlayerName
            });
        }
    }
}
