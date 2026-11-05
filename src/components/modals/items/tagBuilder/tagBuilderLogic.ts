import type { TagBuilderConfig } from './tagBuilderTypes';

export function buildTagString(config: TagBuilderConfig): string {
    const { category, target, value, value2, typeOption, condition, customMaxStacks } = config;
    let tag = '';
    const numValue = Number(value) || 0;
    const numValue2 = Number(value2) || 0;
    const sign = numValue >= 0 ? `+${numValue}` : `${numValue}`;

    if (category === 'stat' || category === 'skill') {
        if (!target) return '';
        tag = `[${target} ${sign}]`;
    } else if (category === 'combat') {
        if (!target) return '';
        if (['Init', 'Chance', 'Crit Dmg', 'Combo Dmg', 'First Hit Dmg', 'First Hit Acc'].includes(target)) {
            tag = `[${target} ${sign}]`;
        } else if (target === 'Low Acc Penalty') {
            const actualTarget = 'Low Acc';
            if (typeOption) tag = `[${actualTarget} ${sign}: ${typeOption}]`;
            else tag = `[${actualTarget} ${sign}]`;
        } else if (target === 'Type Gem') {
            const typeStr = typeOption || 'Normal';
            const accVal = numValue !== 0 ? numValue : 1;
            const dmgVal = numValue2 !== 0 ? numValue2 : 2;
            const accSign = accVal >= 0 ? `+${accVal}` : `${accVal}`;
            const dmgSign = dmgVal >= 0 ? `+${dmgVal}` : `${dmgVal}`;
            tag = `[Acc Succ ${accSign}: ${typeStr}] [Dmg Succ ${dmgSign}: ${typeStr}]`;
        } else {
            if (typeOption) tag = `[${target} ${sign}: ${typeOption}]`;
            else tag = `[${target} ${sign}]`;
        }
    } else if (category === 'matchup') {
        if (!target) return '';
        if (target === 'Remove Immunities') tag = `[Remove Immunities]`;
        else if (typeOption) tag = `[${target}: ${typeOption}]`;
        else tag = `[${target}]`;
    } else if (category === 'mechanic') {
        if (!target) return '';
        if (target === 'High Crit' || target === 'High Critical') tag = typeOption ? `[High Critical: ${typeOption}]` : `[High Critical]`;
        else if (target === 'Stacking High Crit') tag = `[Stacking High Crit]`;
        else if (target === 'Never Miss') tag = typeOption ? `[Never Miss: ${typeOption}]` : `[Never Miss]`;
        else if (target === 'Ignore Pain') tag = typeOption ? `[Ignore Pain: ${typeOption}]` : `[Ignore Pain]`;
        else if (target === 'Ignore Low Acc') tag = `[Ignore Low Acc ${Math.abs(numValue)}]`;
        else if (target === 'Recoil') tag = `[Recoil]`;
        else if (target === 'Super Effective') tag = `[Super Effective]`;
        else if (target === 'Powder') tag = `[Powder]`;
        else if (target === 'Gain Temp HP') tag = `[Gain Temp HP ${Math.abs(numValue)}]`;
        else if (target === 'Temp HP on Hit') tag = `[Temp HP +${Math.abs(numValue)} on Hit]`;
        else if (target === 'Temp HP % Dmg') tag = `[Temp HP ${Math.abs(numValue)}% Dmg]`;
        else if (target === 'Encounter Buff') {
            const statName = typeOption || 'Strength';
            tag = `[Buff: ${statName} ${sign}]`;
        } else if (target === 'Encounter Debuff') {
            const statName = typeOption || 'Defense';
            const debuffVal = Math.abs(numValue) || 1;
            tag = `[Debuff: ${statName} -${debuffVal}]`;
        } else if (target === 'Permanent Boost') {
            const statName = typeOption || 'Strength';
            tag = `[Permanent: ${statName} ${sign}]`;
        } else if (target === 'Damage Pool') {
            tag = `[Damage Pool ${Math.abs(numValue) || 1}]`;
        } else if (target === 'Ignores Defense') {
            tag = `[Ignores Defense]`;
        } else tag = `[${target}]`;
    } else if (category === 'turn_based') {
        if (!target) return '';
        if (target === 'Deal Damage End of Round') tag = `[Deal ${Math.abs(numValue)} Damage at End of Round]`;
        else if (target === 'Reduce Will End of Round') tag = `[Reduce Will by ${Math.abs(numValue)} at End of Round]`;
        else if (target === 'Heal Round End') tag = `[Heal ${Math.abs(numValue)} Round End]`;
        else if (target === 'Restore Will Round End') tag = `[Restore ${Math.abs(numValue)} Will Round End]`;
        else if (target === 'Lose Action(s)') tag = `[Lose ${Math.abs(numValue)} Action]`;
        else if (target === 'No Reactions') tag = `[No Reactions]`;
        else if (target === 'Extra Reaction(s)') tag = `[${Math.abs(numValue)} Extra Reactions Per Turn]`;
        else tag = `[${target}]`;
    } else if (category === 'status') {
        if (!target) return '';
        tag = `[Status: ${target}]`;
    } else if (category === 'move_mechanics') {
        if (!target) return '';
        if (target === 'High Critical') tag = typeOption ? `[High Critical: ${typeOption}]` : `[High Critical]`;
        else if (target === 'Low Accuracy') tag = `[Low Accuracy ${Math.abs(numValue)}]`;
        else if (target === 'Never Miss') tag = typeOption ? `[Never Miss: ${typeOption}]` : `[Never Miss]`;
        else if (target === 'Recoil') tag = `[Recoil]`;
        else if (target === 'Set Damage') tag = `[Set Damage ${Math.abs(numValue)}]`;
        else if (target === 'Damage Pool') tag = `[Damage Pool ${Math.abs(numValue) || 1}]`;
        else if (target === 'Ignores Defense') tag = `[Ignores Defense]`;
        else if (target === 'Powder') tag = `[Powder]`;
        else tag = `[${target}]`;
    } else if (category === 'battlefield') {
        if (!target) return '';
        const name = typeOption.trim() || target;
        const durStr = numValue === -1 ? ', scene' : `, ${numValue || 4}`;
        if (target === 'Force Field') {
            tag = `[Force Field: ${name}${durStr}]`;
        } else if (target === 'Entry Hazard') {
            tag = `[Hazard: ${name}]`;
        } else if (target === 'Weather') {
            tag = `[Weather: ${name}${durStr}]`;
        } else if (target === 'Terrain') {
            tag = `[Terrain: ${name}${durStr}]`;
        } else if (target === 'Battlefield (Other)') {
            tag = `[Battlefield: ${name}${durStr}]`;
        } else {
            tag = `[Battlefield: ${name}${durStr}]`;
        }
    } else if (category === 'targeting') {
        if (!target) return '';
        tag = `[Target: ${target}]`;
    } else if (category === 'choice') {
        const choiceText = target === 'Custom Choice' ? (typeOption || '') : (target || typeOption || '');
        if (choiceText.trim()) {
            tag = `[Choice: ${choiceText.trim()}]`;
        }
    }

    if (tag && condition && condition !== 'none') {
        let condStr = '';
        if (condition === 'half hp') {
            condStr = ' @ Half HP';
        } else if (condition === 'boost') {
            condStr = ' @ Boost';
        } else if (condition === 'stacking_boost') {
            condStr = ' @ Stacking Boost';
        } else if (condition === 'custom_stacking_boost') {
            const stacks = Math.max(2, Number(customMaxStacks) || 5);
            condStr = ` @ Stacking Boost: ${stacks}`;
        } else {
            const formattedCond = condition
                .split(' ')
                .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                .join(' ');
            condStr = ` @ ${formattedCond}`;
        }
        tag = tag.replace(/\]/g, `${condStr}]`);
    }

    return tag;
}

// Re-export sub-module functions and types for backward compatibility
export {
    parseTagStringToConfig,
    MOVE_KEYWORDS_MAP,
    MATCHUP_TARGET_MAP,
    COMBAT_TARGET_NAME_MAP,
    STAT_NORM_MAP
} from './logic/tagStringParser';

export { generateExplanation } from './logic/tagExplanationGenerator';

export {
    extractTagsFromText,
    extractItemTags,
    extractMoveTags,
    type ParsedTagPill
} from './logic/tagPillExtractors';

export type { TagBuilderConfig } from './tagBuilderTypes';
