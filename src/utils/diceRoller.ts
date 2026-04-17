import OBR from '@owlbear-rodeo/sdk';
import type { CharacterState, SkillCheck } from '../store/storeTypes';
import { CombatStat, SocialStat, Skill } from '../types/enums';
import { useCharacterStore } from '../store/useCharacterStore';
import { parseCombatTags, getPainPenalty, getStatusPenalties, getAbilityText } from './combatMath';

export async function rollDicePlus(notation: string, label: string, rollType = 'roll', payload = '') {
    if (!OBR.isAvailable) {
        console.log(`[Offline Roll] ${notation} for ${label}`);
        return;
    }
    try {
        const state = useCharacterStore.getState();
        const diceEngine = state.identity.diceEngine || 'dice-plus';
        const playerId = await OBR.player.getId();
        const playerName = await OBR.player.getName();

        if (diceEngine === 'car') {
            // FORMATTING FOR CUSTOM ACTION ROLLS:
            const cleanNotation = notation.replace(/\s/g, '');
            const isSuccessRoll = cleanNotation.includes('>3');
            
            const match = cleanNotation.match(/(\d+)d6(?:>3)?(?:([+-]\d+))?/);
            const numDice = match ? parseInt(match[1], 10) : 1;
            const flatMod = match && match[2] ? parseInt(match[2].replace(/\s/g, ''), 10) : 0;

            const diceData = [];
            const rollStrings = [];
            let rawSuccesses = 0;
            let rawSum = 0;

            // Generate the random dice results locally
            for (let i = 0; i < numDice; i++) {
                const result = Math.floor(Math.random() * 6) + 1;
                diceData.push({ type: 6, result });
                rawSum += result;
                
                if (result > 3) {
                    rawSuccesses++;
                    rollStrings.push(`${result}✓`);
                } else {
                    rollStrings.push(`${result}✖`);
                }
            }

            const rawFailures = numDice - rawSuccesses;
            const finalSuccesses = Math.max(0, rawSuccesses + flatMod);
            const finalSum = rawSum + flatMod;
            const modStr = flatMod > 0 ? ` + ${flatMod}` : flatMod < 0 ? ` - ${Math.abs(flatMod)}` : '';
            
            const cleanLabel = label.replace(/^[🎲💥🩹🍀🎯]\s*/u, '').trim();

            let mensaje = '';
            if (numDice === 0) {
                mensaje = `${playerName} | ${cleanLabel}: Set Damage → ${finalSuccesses} ✓`;
            } else if (isSuccessRoll) {
                mensaje = `${playerName} | ${cleanLabel}: [${rollStrings.join(', ')}] > 3${modStr} → ${finalSuccesses} ✓ ${rawFailures} ✖`;
            } else {
                const sumStrings = diceData.map(d => d.result).join(' + ');
                mensaje = `${playerName} | ${cleanLabel}: [${sumStrings}]${modStr} → ${finalSum}`;
            }

            const icon = state.identity.tokenImageUrl || 'https://lordcongra.github.io/poke-e-role/pokeball.svg';

            await OBR.broadcast.sendMessage(
                'tirada:mensaje',
                {
                    mensaje,
                    icon,
                    diceData
                },
                { destination: 'ALL' }
            );

            // ⚠️ SHEET AUTOMATION ⚠️
            if (rollType === 'init') {
                const tiebreaker = Math.floor(Math.random() * 6) + 1;
                const finalInit = finalSum + tiebreaker / 10;
                
                if (state.tokenId) {
                    await OBR.scene.items.updateItems([state.tokenId], (items) => {
                        for (const item of items) {
                            const existing =
                                (item.metadata['com.pretty-initiative/metadata'] as Record<
                                    string,
                                    unknown
                                >) || {};
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
                        OBR.notification.show(`✅ Result: ${finalSuccesses} Successes! (Gained ${tempGained} Temp HP 🛡️)`);
                    } else {
                        OBR.notification.show(`✅ Result: ${finalSuccesses} Successes! (Current Shield Holds 🛡️)`);
                    }
                }
            } else if (rollType === 'status' && payload) {
                const statusId = payload;
                if (state.tokenId) {
                    await OBR.scene.items.updateItems([state.tokenId], (items) => {
                        for (const item of items) {
                            const meta = (item.metadata['pokerole-extension/stats'] as Record<string, unknown>) || {};
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

            return; 
        }

        // FORMATTING FOR DICE+:
        OBR.notification.show(label);

        const uniqueId = crypto.randomUUID();

        const rollId = payload
            ? `${rollType}|${state.tokenId}|${payload}|${uniqueId}`
            : `${rollType}|${state.tokenId}|${uniqueId}`;

        const targetVisibility = state.identity.rolls === 'Private (GM)' ? 'gm_only' : 'everyone';

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

export async function rollSkillCheck(check: SkillCheck, state: CharacterState) {
    const nickname = state.identity.nickname || state.identity.species || 'Someone';
    const abilityString = state.identity.ability || '';
    const statuses = getStatusPenalties(state);
    const hasComatose = abilityString.toLowerCase().includes('comatose');

    if (statuses.isAsleep && !hasComatose) {
        if (OBR.isAvailable) OBR.notification.show('⚠️ You are Asleep and cannot perform actions!', 'WARNING');
        return;
    }

    const abilityText = getAbilityText(state.identity.ability, state.roomCustomAbilities);
    const itemBuffs = parseCombatTags(state.inventory, state.extraCategories, undefined, abilityText);

    let attributeTotal = 0;
    if (check.attr === 'will') {
        attributeTotal = state.will.willMax;
    } else if (state.stats[check.attr as CombatStat]) {
        const statistic = state.stats[check.attr as CombatStat];
        attributeTotal = Math.max(
            1,
            statistic.base + statistic.rank + statistic.buff - statistic.debuff + (itemBuffs.stats[check.attr] || 0)
        );
    } else if (state.socials[check.attr as SocialStat]) {
        const statistic = state.socials[check.attr as SocialStat];
        attributeTotal = Math.max(
            1,
            statistic.base + statistic.rank + statistic.buff - statistic.debuff + (itemBuffs.stats[check.attr] || 0)
        );
    }

    let skillTotal = 0;
    if (check.skill && check.skill !== 'none') {
        if (state.skills[check.skill as Skill]) {
            const skillData = state.skills[check.skill as Skill];
            skillTotal = skillData.base + skillData.buff + (itemBuffs.skills[check.skill] || 0);
        } else {
            for (const category of state.extraCategories) {
                const customSkill = category.skills.find((s) => s.id === check.skill);
                if (customSkill) {
                    skillTotal = customSkill.base + customSkill.buff + (itemBuffs.skills[check.skill] || 0);
                    break;
                }
            }
        }
    }

    let dicePool = attributeTotal + skillTotal;
    if (check.attr === 'dex') dicePool += statuses.paralysisDexterityPenalty;

    const pain = getPainPenalty(check.attr, state);
    const tags: string[] = [];
    if (pain < 0) tags.push(`Pain Penalty ${Math.abs(pain)}`);

    const genericSuccessModifier = state.trackers.globalSucc + statuses.confusionPenalty + pain;
    const mathModifier =
        genericSuccessModifier !== 0
            ? genericSuccessModifier > 0
                ? `+${genericSuccessModifier}`
                : `${genericSuccessModifier}`
            : '';
    if (genericSuccessModifier !== 0)
        tags.push(`Net Mod ${genericSuccessModifier > 0 ? '+' : ''}${genericSuccessModifier} Succ`);

    const chancesUsed = state.trackers.chances;

    if (chancesUsed > 0) tags.push(`Chances: Max ${chancesUsed} Rerolls`);
    if (statuses.paralysisDexterityPenalty < 0 && check.attr === 'dex') tags.push(`Paralysis: -2 Dice`);

    if (statuses.isAsleep) {
        if (hasComatose) tags.push(`ASLEEP (Comatose)`);
        else tags.push(`ASLEEP`);
    }
    if (statuses.isFrozen) {
        tags.push(`❄️ FROZEN: Attacking Ice Block (5HP/2DEF). Fire/Super-Effective breaks instantly.`);
    }

    const finalTags = tags.length > 0 ? ` [ ${tags.join(' | ')} ]` : '';
    const rollName = (check.name || '').trim() || 'Skill Check';

    await rollDicePlus(`${Math.max(1, dicePool)}d6>3${mathModifier}`, `🎲 ${nickname} rolled ${rollName}!${finalTags}`);
}