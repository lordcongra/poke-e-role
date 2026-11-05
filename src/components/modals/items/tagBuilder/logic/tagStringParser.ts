import type { TagBuilderConfig, RequirementGroup } from '../tagBuilderTypes';
import {
    MOVE_KEYWORDS_MAP,
    MATCHUP_TARGET_MAP,
    COMBAT_TARGET_NAME_MAP,
    STAT_NORM_MAP
} from './tagParserConstants';

export {
    MOVE_KEYWORDS_MAP,
    MATCHUP_TARGET_MAP,
    COMBAT_TARGET_NAME_MAP,
    STAT_NORM_MAP
};

function parseBattlefieldDuration(durRaw?: string): number {
    if (!durRaw) return 4;
    const lower = durRaw.trim().toLowerCase();
    if (lower === 'scene' || lower === '-1') return -1;
    return parseInt(lower, 10) || 4;
}

function buildConfigResult(
    category: string,
    target: string,
    value: number,
    condition: string,
    customMaxStacks: number,
    extra?: {
        value2?: number;
        typeOption?: string;
        reqGroup?: RequirementGroup;
    }
): Partial<TagBuilderConfig> {
    return {
        category,
        target,
        value,
        condition,
        customMaxStacks,
        ...extra
    };
}

export function parseTagStringToConfig(tagStr: string, isMoveContext = false): Partial<TagBuilderConfig> | null {
    if (!tagStr) return null;
    let clean = tagStr.trim();
    if (clean.startsWith('[') && clean.endsWith(']')) {
        clean = clean.slice(1, -1).trim();
    }

    let condition = 'none';
    let customMaxStacks = 5;

    // Check for @ Condition
    const atMatch = clean.match(/\s+@\s+([A-Za-z0-9_\s:]+)$/);
    if (atMatch) {
        clean = clean.replace(atMatch[0], '').trim();
        const rawCond = atMatch[1].trim();
        const lowerCond = rawCond.toLowerCase();
        if (lowerCond === 'half hp') {
            condition = 'half hp';
        } else if (lowerCond === 'boost') {
            condition = 'boost';
        } else if (lowerCond === 'stacking boost' || lowerCond === 'stacking_boost') {
            condition = 'stacking_boost';
        } else if (lowerCond.startsWith('stacking boost:') || lowerCond.startsWith('stacking_boost:')) {
            condition = 'custom_stacking_boost';
            const num = parseInt(lowerCond.split(':')[1], 10);
            if (!isNaN(num)) customMaxStacks = num;
        } else {
            condition = lowerCond;
        }
    }

    // Choice Tag: [Choice: A | B | C]
    const choiceMatch = clean.match(/^choice:\s*(.+)$/i);
    if (choiceMatch) {
        return buildConfigResult('choice', 'Custom Choice', 1, condition, customMaxStacks, {
            typeOption: choiceMatch[1].trim()
        });
    }

    // Targeting Tag: [Target: All Foes], [Target: Single Ally], etc.
    const targetMatch = clean.match(/^target:\s*(.+)$/i);
    if (targetMatch) {
        return buildConfigResult('targeting', targetMatch[1].trim(), 1, condition, customMaxStacks, {
            typeOption: ''
        });
    }

    // Battlefield: Force Field
    const ffMatch = clean.match(/^force field:\s*([^,\]]+)(?:,\s*(-?\d+|scene))?$/i);
    if (ffMatch) {
        return buildConfigResult('battlefield', 'Force Field', parseBattlefieldDuration(ffMatch[2]), condition, customMaxStacks, {
            typeOption: ffMatch[1].trim()
        });
    }

    // Battlefield: Hazard / Entry Hazard
    const hzMatch = clean.match(/^(?:hazard|entry hazard):\s*([^,\]]+)$/i);
    if (hzMatch) {
        return buildConfigResult('battlefield', 'Entry Hazard', -1, condition, customMaxStacks, {
            typeOption: hzMatch[1].trim()
        });
    }

    // Battlefield: Weather
    const wMatch = clean.match(/^weather:\s*([^,\]]+)(?:,\s*(-?\d+|scene))?$/i);
    if (wMatch) {
        return buildConfigResult('battlefield', 'Weather', parseBattlefieldDuration(wMatch[2]), condition, customMaxStacks, {
            typeOption: wMatch[1].trim()
        });
    }

    // Battlefield: Terrain
    const tMatch = clean.match(/^terrain:\s*([^,\]]+)(?:,\s*(-?\d+|scene))?$/i);
    if (tMatch) {
        return buildConfigResult('battlefield', 'Terrain', parseBattlefieldDuration(tMatch[2]), condition, customMaxStacks, {
            typeOption: tMatch[1].trim()
        });
    }

    // Battlefield: Battlefield (Other) / Field
    const bfMatch = clean.match(/^(?:battlefield|field):\s*([^,\]]+)(?:,\s*(-?\d+|scene))?$/i);
    if (bfMatch) {
        return buildConfigResult('battlefield', 'Battlefield (Other)', parseBattlefieldDuration(bfMatch[2]), condition, customMaxStacks, {
            typeOption: bfMatch[1].trim()
        });
    }

    // Move mechanics keywords (bracketed or unbracketed)
    const critOrNeverMissMatch = clean.match(/^(high crit(?:ical)?|never miss)(?::\s*([^@\]]+))?$/i);
    if (critOrNeverMissMatch) {
        const isCrit = /^high crit/i.test(critOrNeverMissMatch[1]);
        const target = isCrit ? 'High Critical' : 'Never Miss';
        const typeOpt = critOrNeverMissMatch[2]?.trim() || '';
        let reqGroup: RequirementGroup = 'none';
        if (typeOpt) {
            const optLower = typeOpt.toLowerCase();
            if (optLower === 'physical' || optLower === 'special') reqGroup = 'category';
            else if (optLower === 'super effective') reqGroup = 'misc';
            else if (optLower.endsWith('move')) reqGroup = 'modifier';
            else reqGroup = 'type';
        }
        return buildConfigResult(
            isMoveContext && !typeOpt ? 'move_mechanics' : 'mechanic',
            target,
            1,
            condition,
            customMaxStacks,
            { typeOption: typeOpt, reqGroup }
        );
    }

    const lowerClean = clean.toLowerCase();
    if (MOVE_KEYWORDS_MAP[lowerClean]) {
        return buildConfigResult(
            isMoveContext ? 'move_mechanics' : 'mechanic',
            MOVE_KEYWORDS_MAP[lowerClean],
            1,
            condition,
            customMaxStacks
        );
    }

    // Low Accuracy X
    const lowAccMatch = clean.match(/^low acc(?:uracy)?\s*([+-]?\d+)(?::\s*([^@\]]+))?$/i);
    if (lowAccMatch) {
        const val = parseInt(lowAccMatch[1], 10) || 1;
        const typeOpt = lowAccMatch[2]?.trim() || '';
        if (isMoveContext && !typeOpt) {
            return buildConfigResult('move_mechanics', 'Low Accuracy', Math.abs(val), condition, customMaxStacks);
        }
        return buildConfigResult('combat', 'Low Acc Penalty', val, condition, customMaxStacks, {
            typeOption: typeOpt,
            reqGroup: typeOpt ? 'type' : 'none'
        });
    }

    // Set Damage X
    const setDmgMatch = clean.match(/^set damage\s*(\d+)$/i);
    if (setDmgMatch) {
        return buildConfigResult('move_mechanics', 'Set Damage', parseInt(setDmgMatch[1], 10) || 1, condition, customMaxStacks);
    }

    // Damage Pool X
    const dmgPoolMatch = clean.match(/^damage\s*pool\s*(\d+)$/i);
    if (dmgPoolMatch) {
        return buildConfigResult(
            isMoveContext ? 'move_mechanics' : 'mechanic',
            'Damage Pool',
            parseInt(dmgPoolMatch[1], 10) || 1,
            condition,
            customMaxStacks
        );
    }

    // Ignores Defense
    if (/^ignores?\s*def(?:ense)?$/i.test(clean)) {
        return buildConfigResult(isMoveContext ? 'move_mechanics' : 'mechanic', 'Ignores Defense', 1, condition, customMaxStacks);
    }

    // Buff: <stat> +X
    const buffMatch = clean.match(/^buff:\s*([^+\d\]]+?)\s*\+?(\d+)$/i);
    if (buffMatch) {
        return buildConfigResult('mechanic', 'Encounter Buff', parseInt(buffMatch[2], 10) || 1, condition, customMaxStacks, {
            typeOption: buffMatch[1].trim(),
            reqGroup: 'none'
        });
    }

    // Debuff: <stat> -X
    const debuffMatch = clean.match(/^debuff:\s*([^-\d\]]+?)\s*-?(\d+)$/i);
    if (debuffMatch) {
        return buildConfigResult('mechanic', 'Encounter Debuff', parseInt(debuffMatch[2], 10) || 1, condition, customMaxStacks, {
            typeOption: debuffMatch[1].trim(),
            reqGroup: 'none'
        });
    }

    // Permanent: <stat> +X
    const permMatch = clean.match(/^permanent:\s*([^+\d\]]+?)\s*\+?(\d+)$/i);
    if (permMatch) {
        return buildConfigResult('mechanic', 'Permanent Boost', parseInt(permMatch[2], 10) || 1, condition, customMaxStacks, {
            typeOption: permMatch[1].trim(),
            reqGroup: 'none'
        });
    }

    // Status: <Name>
    const statusMatch = clean.match(/^status:\s*(.+)$/i);
    if (statusMatch) {
        return buildConfigResult('status', statusMatch[1].trim(), 1, condition, customMaxStacks);
    }

    // Gain Temp HP X
    const gainTempHpMatch = clean.match(/^gain temp hp\s*(\d+)$/i);
    if (gainTempHpMatch) {
        return buildConfigResult('mechanic', 'Gain Temp HP', parseInt(gainTempHpMatch[1], 10) || 1, condition, customMaxStacks);
    }

    // Temp HP +X on Hit
    const tempHpOnHitMatch = clean.match(/^temp hp\s*\+?(\d+)\s*on hit$/i);
    if (tempHpOnHitMatch) {
        return buildConfigResult('mechanic', 'Temp HP on Hit', parseInt(tempHpOnHitMatch[1], 10) || 1, condition, customMaxStacks);
    }

    // Temp HP X% Dmg
    const tempHpPctMatch = clean.match(/^temp hp\s*(\d+)%\s*dmg$/i);
    if (tempHpPctMatch) {
        return buildConfigResult('mechanic', 'Temp HP % Dmg', parseInt(tempHpPctMatch[1], 10) || 1, condition, customMaxStacks);
    }

    // Acc Xs Add Dmg Limit Y
    const accLimitMatch = clean.match(/^acc\s*(\d+)s\s*add(?:s)?\s*(?:dmg|damage)(?:\s*dice)?(?:\s*limit)?\s*(\d+)$/i);
    if (accLimitMatch) {
        return buildConfigResult('mechanic', 'Acc [X]s Add Dmg Limit [Y]', parseInt(accLimitMatch[1], 10) || 6, condition, customMaxStacks, {
            value2: parseInt(accLimitMatch[2], 10) || 3
        });
    }

    // Ignore Low Acc X
    const ignoreLowAccMatch = clean.match(/^ignore low acc\s*(\d+)$/i);
    if (ignoreLowAccMatch) {
        return buildConfigResult('mechanic', 'Ignore Low Acc', parseInt(ignoreLowAccMatch[1], 10) || 1, condition, customMaxStacks);
    }

    // Turn Based effects
    const healRoundMatch = clean.match(/^heal\s*(\d+)\s*round end$/i);
    if (healRoundMatch) {
        return buildConfigResult('turn_based', 'Heal Round End', parseInt(healRoundMatch[1], 10) || 1, condition, customMaxStacks);
    }

    const restoreWillRoundMatch = clean.match(/^restore\s*(\d+)\s*will round end$/i);
    if (restoreWillRoundMatch) {
        return buildConfigResult('turn_based', 'Restore Will Round End', parseInt(restoreWillRoundMatch[1], 10) || 1, condition, customMaxStacks);
    }

    const dealDmgRoundMatch = clean.match(/^deal\s*(\d+)\s*damage at end of round$/i);
    if (dealDmgRoundMatch) {
        return buildConfigResult('turn_based', 'Deal Damage End of Round', parseInt(dealDmgRoundMatch[1], 10) || 1, condition, customMaxStacks);
    }

    const reduceWillRoundMatch = clean.match(/^reduce will by\s*(\d+)\s*at end of round$/i);
    if (reduceWillRoundMatch) {
        return buildConfigResult('turn_based', 'Reduce Will End of Round', parseInt(reduceWillRoundMatch[1], 10) || 1, condition, customMaxStacks);
    }

    const loseActionMatch = clean.match(/^lose\s*(\d+)\s*actions?$/i);
    if (loseActionMatch) {
        return buildConfigResult('turn_based', 'Lose Action(s)', parseInt(loseActionMatch[1], 10) || 1, condition, customMaxStacks);
    }

    if (clean.toLowerCase() === 'no reactions') {
        return buildConfigResult('turn_based', 'No Reactions', 1, condition, customMaxStacks);
    }

    const extraReactionMatch = clean.match(/^(\d+)\s*extra reactions? per turn$/i);
    if (extraReactionMatch) {
        return buildConfigResult('turn_based', 'Extra Reaction(s)', parseInt(extraReactionMatch[1], 10) || 1, condition, customMaxStacks);
    }

    // Matchup tags: Immune: X, Resist: X, Weak: X, Remove Immunity: X, Remove Immunities
    if (clean.toLowerCase() === 'remove immunities') {
        return buildConfigResult('matchup', 'Remove Immunities', 1, condition, customMaxStacks);
    }

    const matchupMatch = clean.match(/^(immune|resist|weak|remove immunity):\s*(.+)$/i);
    if (matchupMatch) {
        const rawTarget = matchupMatch[1].toLowerCase();
        return buildConfigResult('matchup', MATCHUP_TARGET_MAP[rawTarget] || 'Immune', 1, condition, customMaxStacks, {
            typeOption: matchupMatch[2].trim(),
            reqGroup: 'type'
        });
    }

    // Combat targets: Crit Dmg, Combo Dmg, First Hit Dmg, First Hit Acc, Init, Chance, Dmg, Acc
    const combatNamedMatch = clean.match(
        /^(crit dmg|combo dmg|first hit dmg|first hit acc|init|chance)\s*([+-]?\d+)$/i
    );
    if (combatNamedMatch) {
        return buildConfigResult(
            'combat',
            COMBAT_TARGET_NAME_MAP[combatNamedMatch[1].toLowerCase()] || 'Crit Dmg',
            parseInt(combatNamedMatch[2], 10) || 1,
            condition,
            customMaxStacks
        );
    }

    // Type Gem composite: [Acc Succ +1: Type] [Dmg Succ +2: Type]
    const typeGemMatch = clean.match(
        /^acc\s+succ(?:ess(?:es)?)?\s*([+-]?\d+)(?::\s*([^@\]]+))?(?:\s*@\s*[^\]]+)?\]\s*\[\s*dmg\s+succ(?:ess(?:es)?)?\s*([+-]?\d+)(?::\s*([^@\]]+))?/i
    );
    if (typeGemMatch) {
        return buildConfigResult('combat', 'Type Gem', parseInt(typeGemMatch[1], 10) || 1, condition, customMaxStacks, {
            value2: parseInt(typeGemMatch[3], 10) || 2,
            typeOption: typeGemMatch[2]?.trim() || typeGemMatch[4]?.trim() || 'Normal',
            reqGroup: 'type'
        });
    }

    // Acc Succ / Dmg Succ with optional type/requirement
    const succMatch = clean.match(
        /^(acc\s+succ(?:ess(?:es)?)?|dmg\s+succ(?:ess(?:es)?)?)\s*([+-]?\d+)(?::\s*([^@\]]+))?$/i
    );
    if (succMatch) {
        const isAcc = succMatch[1].toLowerCase().startsWith('acc');
        const typeOpt = succMatch[3]?.trim() || '';
        return buildConfigResult('combat', isAcc ? 'Acc Succ' : 'Dmg Succ', parseInt(succMatch[2], 10) || 1, condition, customMaxStacks, {
            typeOption: typeOpt,
            reqGroup: typeOpt ? 'type' : 'none'
        });
    }

    // Dmg / Acc with optional type/requirement
    const dmgAccMatch = clean.match(/^(dmg|acc)\s*([+-]?\d+)(?::\s*([^@\]]+))?$/i);
    if (dmgAccMatch) {
        const typeOpt = dmgAccMatch[3]?.trim() || '';
        return buildConfigResult(
            'combat',
            dmgAccMatch[1].toLowerCase() === 'dmg' ? 'Dmg' : 'Acc',
            parseInt(dmgAccMatch[2], 10) || 1,
            condition,
            customMaxStacks,
            {
                typeOption: typeOpt,
                reqGroup: typeOpt ? 'type' : 'none'
            }
        );
    }

    // Stats and Skills: Target +X / -X
    const statSkillMatch = clean.match(/^([A-Za-z\.\s]+?)\s*([+-]\s*\d+)$/);
    if (statSkillMatch) {
        const rawName = statSkillMatch[1].trim();
        const val = parseInt(statSkillMatch[2].replace(/\s+/g, ''), 10) || 1;
        const lowerStat = rawName.toLowerCase();
        if (STAT_NORM_MAP[lowerStat]) {
            return buildConfigResult('stat', STAT_NORM_MAP[lowerStat], val, condition, customMaxStacks);
        }
        return buildConfigResult('skill', rawName.charAt(0).toUpperCase() + rawName.slice(1), val, condition, customMaxStacks);
    }

    return null;
}
