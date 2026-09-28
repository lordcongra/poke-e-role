import type { TagBuilderConfig } from './tagBuilderTypes';
import { KNOWN_ITEMS } from '../../../../data/constants';

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
        if (target === 'High Crit') tag = `[High Crit]`;
        else if (target === 'Stacking High Crit') tag = `[Stacking High Crit]`;
        else if (target === 'Ignore Pain') tag = typeOption ? `[Ignore Pain: ${typeOption}]` : `[Ignore Pain]`;
        else if (target === 'Ignore Low Acc') tag = `[Ignore Low Acc ${Math.abs(numValue)}]`;
        else if (target === 'Recoil') tag = `[Recoil]`;
        else if (target === 'Super Effective') tag = `[Super Effective]`;
        else if (target === 'Powder') tag = `[Powder]`;
        else if (target === 'Gain Temp HP') tag = `[Gain Temp HP ${Math.abs(numValue)}]`;
        else if (target === 'Temp HP on Hit') tag = `[Temp HP +${Math.abs(numValue)} on Hit]`;
        else if (target === 'Temp HP % Dmg') tag = `[Temp HP ${Math.abs(numValue)}% Dmg]`;
        else if (target === 'Acc [X]s Add Dmg Limit [Y]')
            tag = `[Acc ${Math.abs(numValue)}s Add Dmg Dice Limit ${Math.abs(numValue2)}]`;
        else tag = `[${target}]`;
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
        if (target === 'High Critical') tag = `[High Critical]`;
        else if (target === 'Low Accuracy') tag = `[Low Accuracy ${Math.abs(numValue)}]`;
        else if (target === 'Never Miss') tag = `[Never Miss]`;
        else if (target === 'Recoil') tag = `[Recoil]`;
        else if (target === 'Successive Actions') tag = `[Successive Actions]`;
        else if (target === 'Set Damage') tag = `[Set Damage ${Math.abs(numValue)}]`;
        else if (target === 'Powder') tag = `[Powder]`;
        else tag = `[${target}]`;
    }

    if (tag && condition && condition !== 'none') {
        if (condition === 'half hp') {
            tag = tag.replace(']', ' @ Half HP]');
        } else if (condition === 'boost') {
            tag = tag.replace(']', ' @ Boost]');
        } else if (condition === 'stacking_boost') {
            tag = tag.replace(']', ' @ Stacking Boost]');
        } else if (condition === 'custom_stacking_boost') {
            const stacks = Math.max(2, Number(customMaxStacks) || 5);
            tag = tag.replace(']', ` @ Stacking Boost: ${stacks}]`);
        } else {
            const formattedCond = condition
                .split(' ')
                .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                .join(' ');
            tag = tag.replace(']', ` @ ${formattedCond}]`);
        }
    }

    return tag;
}

export function generateExplanation(config: TagBuilderConfig, builtTag: string): string {
    if (!builtTag) return 'Select options above to configure your tag.';

    const { category, target, value, value2, typeOption, condition, customMaxStacks } = config;
    let base = '';
    const num = Number(value) || 0;
    const signStr = num >= 0 ? `+${num}` : `${num}`;

    if (category === 'stat') {
        base = `Modifies ${target} by ${signStr}`;
    } else if (category === 'skill') {
        base = `Modifies ${target} skill by ${signStr} dice`;
    } else if (category === 'combat') {
        const reqStr = typeOption ? ` on ${typeOption} moves` : '';
        if (target === 'Dmg') base = `Adds ${signStr} damage dice${reqStr}`;
        else if (target === 'Acc') base = `Adds ${signStr} accuracy dice${reqStr}`;
        else if (target === 'Init') base = `Modifies Initiative by ${signStr}`;
        else if (target === 'Chance') base = `Adds ${signStr} extra Chance dice`;
        else if (target === 'Crit Dmg') base = `Adds ${signStr} damage dice on critical hits`;
        else if (target === 'Combo Dmg') base = `Adds ${signStr} damage dice to combo/successive moves`;
        else if (target === 'First Hit Dmg') base = `Adds ${signStr} damage dice on the first hit each round`;
        else if (target === 'First Hit Acc') base = `Adds ${signStr} accuracy dice on the first hit each round`;
        else if (target === 'Low Acc Penalty') base = `Modifies Low Accuracy penalty by ${signStr} dice`;
    } else if (category === 'matchup') {
        if (target === 'Immune')
            base = typeOption ? `Grants complete immunity to ${typeOption}-type moves` : 'Grants immunity';
        else if (target === 'Resist')
            base = typeOption ? `Grants resistance to ${typeOption}-type moves` : 'Grants resistance';
        else if (target === 'Weak') base = typeOption ? `Adds weakness to ${typeOption}-type moves` : 'Adds weakness';
        else if (target === 'Remove Immunities') base = 'Ignores enemy type immunities when attacking';
    } else if (category === 'mechanic') {
        if (target === 'High Crit')
            base =
                'Lowers critical hit threshold by 1 (Standard rule: High Critical does not stack across items/moves)';
        else if (target === 'Stacking High Crit')
            base =
                'Lowers critical threshold by 1 and explicitly stacks with High Critical moves and items (like Razor Claw). Normal [High Crit] does not stack by default; use this for abilities like Super Luck or homebrew situations where stacking crits are permitted';
        else if (target === 'Ignore Pain')
            base = typeOption ? `Ignores pain penalties while using ${typeOption} moves` : 'Ignores all pain penalties';
        else if (target === 'Ignore Low Acc') base = `Ignores up to ${Math.abs(num)} Low Accuracy penalty dice`;
        else if (target === 'Gain Temp HP') base = `Grants ${Math.abs(num)} Temporary HP`;
        else if (target === 'Temp HP on Hit') base = `Grants +${Math.abs(num)} Temp HP each time a move hits`;
        else if (target === 'Temp HP % Dmg') base = `Converts ${Math.abs(num)}% of damage dealt into Temp HP`;
        else if (target === 'Acc [X]s Add Dmg Limit [Y]')
            base = `Each accuracy die rolling ${value} adds +1 damage die (up to +${value2} dice max)`;
        else base = `Applies ${target} mechanic`;
    } else if (category === 'turn_based') {
        if (target === 'Deal Damage End of Round') base = `Deals ${Math.abs(num)} damage to target at end of round`;
        else if (target === 'Reduce Will End of Round') base = `Reduces Will by ${Math.abs(num)} at end of round`;
        else if (target === 'Heal Round End') base = `Restores ${Math.abs(num)} HP at end of round`;
        else if (target === 'Restore Will Round End') base = `Restores ${Math.abs(num)} Will at end of round`;
        else if (target === 'Lose Action(s)') base = `Target loses ${Math.abs(num)} action(s)`;
        else if (target === 'No Reactions') base = 'Prevents target from declaring reactions';
        else if (target === 'Extra Reaction(s)') base = `Grants +${Math.abs(num)} extra reaction(s) per turn`;
    } else if (category === 'status') {
        base = `Inflicts or tracks ${target} status condition`;
    } else if (category === 'move_mechanics') {
        base = `Move mechanic: ${target}`;
    }

    if (!base) base = `Applies ${builtTag}`;

    // Append condition text
    if (condition === 'half hp') {
        return `${base} (only active when at 50% HP or less).`;
    } else if (condition === 'boost') {
        return `${base} when Trigger / Boost is active.`;
    } else if (condition === 'stacking_boost') {
        const total = num * 3;
        return `${base} per boost stack (stacks up to 3 times / ${total >= 0 ? `+${total}` : total} max).`;
    } else if (condition === 'custom_stacking_boost') {
        const stacks = Math.max(2, Number(customMaxStacks) || 5);
        const total = num * stacks;
        return `${base} per boost stack (stacks up to ${stacks} times / ${total >= 0 ? `+${total}` : total} max).`;
    } else if (condition === 'status') {
        return `${base} while afflicted by any status condition.`;
    } else if (condition && condition !== 'none') {
        return `${base} while afflicted by ${condition}.`;
    }

    return `${base} (always active).`;
}

export interface ParsedTagPill {
    tag: string;
    display: string;
    raw: string;
    category?: string;
    isMoveKeyword?: boolean;
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

    // Move mechanics keywords (bracketed or unbracketed)
    const moveKeywordsMap: Record<string, string> = {
        'high critical': 'High Critical',
        'high crit': isMoveContext ? 'High Critical' : 'High Crit',
        'never miss': 'Never Miss',
        recoil: 'Recoil',
        'successive actions': 'Successive Actions',
        'successive action': 'Successive Actions',
        powder: 'Powder',
        'powder move': 'Powder',
        'fist move': 'Fist Move',
        'bite move': 'Bite Move',
        'cutter move': 'Cutter Move',
        'sound move': 'Sound Move',
        'projectile move': 'Projectile Move',
        'wind move': 'Wind Move',
        'basic heal': 'Basic Heal',
        'complete heal': 'Complete Heal',
        'minor heal': 'Minor Heal'
    };

    const lowerClean = clean.toLowerCase();
    if (moveKeywordsMap[lowerClean]) {
        const target = moveKeywordsMap[lowerClean];
        return {
            category: isMoveContext ? 'move_mechanics' : 'mechanic',
            target,
            value: 1,
            condition,
            customMaxStacks
        };
    }

    // Low Accuracy X
    const lowAccMatch = clean.match(/^low acc(?:uracy)?\s*([+-]?\d+)(?::\s*([^@\]]+))?$/i);
    if (lowAccMatch) {
        const val = parseInt(lowAccMatch[1], 10) || 1;
        const typeOpt = lowAccMatch[2]?.trim() || '';
        if (isMoveContext && !typeOpt) {
            return {
                category: 'move_mechanics',
                target: 'Low Accuracy',
                value: Math.abs(val),
                condition,
                customMaxStacks
            };
        }
        return {
            category: 'combat',
            target: 'Low Acc Penalty',
            value: val,
            typeOption: typeOpt,
            reqGroup: typeOpt ? 'type' : 'none',
            condition,
            customMaxStacks
        };
    }

    // Set Damage X
    const setDmgMatch = clean.match(/^set damage\s*(\d+)$/i);
    if (setDmgMatch) {
        return {
            category: 'move_mechanics',
            target: 'Set Damage',
            value: parseInt(setDmgMatch[1], 10) || 1,
            condition,
            customMaxStacks
        };
    }

    // Status: <Name>
    const statusMatch = clean.match(/^status:\s*(.+)$/i);
    if (statusMatch) {
        return {
            category: 'status',
            target: statusMatch[1].trim(),
            value: 1,
            condition,
            customMaxStacks
        };
    }

    // Gain Temp HP X
    const gainTempHpMatch = clean.match(/^gain temp hp\s*(\d+)$/i);
    if (gainTempHpMatch) {
        return {
            category: 'mechanic',
            target: 'Gain Temp HP',
            value: parseInt(gainTempHpMatch[1], 10) || 1,
            condition,
            customMaxStacks
        };
    }

    // Temp HP +X on Hit
    const tempHpOnHitMatch = clean.match(/^temp hp\s*\+?(\d+)\s*on hit$/i);
    if (tempHpOnHitMatch) {
        return {
            category: 'mechanic',
            target: 'Temp HP on Hit',
            value: parseInt(tempHpOnHitMatch[1], 10) || 1,
            condition,
            customMaxStacks
        };
    }

    // Temp HP X% Dmg
    const tempHpPctMatch = clean.match(/^temp hp\s*(\d+)%\s*dmg$/i);
    if (tempHpPctMatch) {
        return {
            category: 'mechanic',
            target: 'Temp HP % Dmg',
            value: parseInt(tempHpPctMatch[1], 10) || 1,
            condition,
            customMaxStacks
        };
    }

    // Acc Xs Add Dmg Limit Y
    const accLimitMatch = clean.match(/^acc\s*(\d+)s\s*add(?:s)?\s*(?:dmg|damage)(?:\s*dice)?(?:\s*limit)?\s*(\d+)$/i);
    if (accLimitMatch) {
        return {
            category: 'mechanic',
            target: 'Acc [X]s Add Dmg Limit [Y]',
            value: parseInt(accLimitMatch[1], 10) || 6,
            value2: parseInt(accLimitMatch[2], 10) || 3,
            condition,
            customMaxStacks
        };
    }

    // Ignore Low Acc X
    const ignoreLowAccMatch = clean.match(/^ignore low acc\s*(\d+)$/i);
    if (ignoreLowAccMatch) {
        return {
            category: 'mechanic',
            target: 'Ignore Low Acc',
            value: parseInt(ignoreLowAccMatch[1], 10) || 1,
            condition,
            customMaxStacks
        };
    }

    // Turn Based effects
    const healRoundMatch = clean.match(/^heal\s*(\d+)\s*round end$/i);
    if (healRoundMatch) {
        return {
            category: 'turn_based',
            target: 'Heal Round End',
            value: parseInt(healRoundMatch[1], 10) || 1,
            condition,
            customMaxStacks
        };
    }

    const restoreWillRoundMatch = clean.match(/^restore\s*(\d+)\s*will round end$/i);
    if (restoreWillRoundMatch) {
        return {
            category: 'turn_based',
            target: 'Restore Will Round End',
            value: parseInt(restoreWillRoundMatch[1], 10) || 1,
            condition,
            customMaxStacks
        };
    }

    const dealDmgRoundMatch = clean.match(/^deal\s*(\d+)\s*damage at end of round$/i);
    if (dealDmgRoundMatch) {
        return {
            category: 'turn_based',
            target: 'Deal Damage End of Round',
            value: parseInt(dealDmgRoundMatch[1], 10) || 1,
            condition,
            customMaxStacks
        };
    }

    const reduceWillRoundMatch = clean.match(/^reduce will by\s*(\d+)\s*at end of round$/i);
    if (reduceWillRoundMatch) {
        return {
            category: 'turn_based',
            target: 'Reduce Will End of Round',
            value: parseInt(reduceWillRoundMatch[1], 10) || 1,
            condition,
            customMaxStacks
        };
    }

    const loseActionMatch = clean.match(/^lose\s*(\d+)\s*actions?$/i);
    if (loseActionMatch) {
        return {
            category: 'turn_based',
            target: 'Lose Action(s)',
            value: parseInt(loseActionMatch[1], 10) || 1,
            condition,
            customMaxStacks
        };
    }

    if (clean.toLowerCase() === 'no reactions') {
        return {
            category: 'turn_based',
            target: 'No Reactions',
            value: 1,
            condition,
            customMaxStacks
        };
    }

    const extraReactionMatch = clean.match(/^(\d+)\s*extra reactions? per turn$/i);
    if (extraReactionMatch) {
        return {
            category: 'turn_based',
            target: 'Extra Reaction(s)',
            value: parseInt(extraReactionMatch[1], 10) || 1,
            condition,
            customMaxStacks
        };
    }

    // Matchup tags: Immune: X, Resist: X, Weak: X, Remove Immunity: X, Remove Immunities
    if (clean.toLowerCase() === 'remove immunities') {
        return {
            category: 'matchup',
            target: 'Remove Immunities',
            value: 1,
            condition,
            customMaxStacks
        };
    }

    const matchupMatch = clean.match(/^(immune|resist|weak|remove immunity):\s*(.+)$/i);
    if (matchupMatch) {
        const rawTarget = matchupMatch[1].toLowerCase();
        const targetMap: Record<string, string> = {
            immune: 'Immune',
            resist: 'Resist',
            weak: 'Weak',
            'remove immunity': 'Remove Immunity'
        };
        return {
            category: 'matchup',
            target: targetMap[rawTarget] || 'Immune',
            typeOption: matchupMatch[2].trim(),
            reqGroup: 'type',
            value: 1,
            condition,
            customMaxStacks
        };
    }

    // Combat targets: Crit Dmg, Combo Dmg, First Hit Dmg, First Hit Acc, Init, Chance, Dmg, Acc
    const combatNamedMatch = clean.match(
        /^(crit dmg|combo dmg|first hit dmg|first hit acc|init|chance)\s*([+-]?\d+)$/i
    );
    if (combatNamedMatch) {
        const targetNameMap: Record<string, string> = {
            'crit dmg': 'Crit Dmg',
            'combo dmg': 'Combo Dmg',
            'first hit dmg': 'First Hit Dmg',
            'first hit acc': 'First Hit Acc',
            init: 'Init',
            chance: 'Chance'
        };
        return {
            category: 'combat',
            target: targetNameMap[combatNamedMatch[1].toLowerCase()] || 'Crit Dmg',
            value: parseInt(combatNamedMatch[2], 10) || 1,
            condition,
            customMaxStacks
        };
    }

    // Dmg / Acc with optional type/requirement
    const dmgAccMatch = clean.match(/^(dmg|acc)\s*([+-]?\d+)(?::\s*([^@\]]+))?$/i);
    if (dmgAccMatch) {
        const target = dmgAccMatch[1].toLowerCase() === 'dmg' ? 'Dmg' : 'Acc';
        const val = parseInt(dmgAccMatch[2], 10) || 1;
        const typeOpt = dmgAccMatch[3]?.trim() || '';
        return {
            category: 'combat',
            target,
            value: val,
            typeOption: typeOpt,
            reqGroup: typeOpt ? 'type' : 'none',
            condition,
            customMaxStacks
        };
    }

    // Stats and Skills: Target +X / -X
    const statSkillMatch = clean.match(/^([A-Za-z\.\s]+?)\s*([+-]\s*\d+)$/);
    if (statSkillMatch) {
        const rawName = statSkillMatch[1].trim();
        const val = parseInt(statSkillMatch[2].replace(/\s+/g, ''), 10) || 1;

        const statNormMap: Record<string, string> = {
            str: 'Str',
            strength: 'Str',
            dex: 'Dex',
            dexterity: 'Dex',
            vit: 'Vit',
            vitality: 'Vit',
            'sp. atk': 'Sp. Atk',
            'sp.atk': 'Sp. Atk',
            spatk: 'Sp. Atk',
            'special attack': 'Sp. Atk',
            'sp. def': 'Sp. Def',
            'sp.def': 'Sp. Def',
            spdef: 'Sp. Def',
            'special defense': 'Sp. Def',
            def: 'Def',
            defense: 'Def',
            spd: 'Spd',
            hp: 'Hp',
            will: 'Will',
            tough: 'Tough',
            cool: 'Cool',
            beauty: 'Beauty',
            cute: 'Cute',
            clever: 'Clever'
        };

        const lowerStat = rawName.toLowerCase();
        if (statNormMap[lowerStat]) {
            return {
                category: 'stat',
                target: statNormMap[lowerStat],
                value: val,
                condition,
                customMaxStacks
            };
        }

        // Otherwise skill
        return {
            category: 'skill',
            target: rawName.charAt(0).toUpperCase() + rawName.slice(1),
            value: val,
            condition,
            customMaxStacks
        };
    }

    return null;
}

export function extractTagsFromText(text: string): ParsedTagPill[] {
    if (!text) return [];
    const matches = text.match(/\[[^\]]+\]/g) || [];
    return matches.map((m) => {
        const inner = m.slice(1, -1).trim();
        return {
            tag: m,
            display: inner,
            raw: m,
            isMoveKeyword: false
        };
    });
}

/**
 * Extracts all tags for an item from its tags field, any legacy tags in its description,
 * or canonical tags from KNOWN_ITEMS if neither is present.
 */
export function extractItemTags(
    item: { name?: string; desc?: string; tags?: string } | null | undefined
): ParsedTagPill[] {
    if (!item) return [];
    const knownItem = KNOWN_ITEMS.find((k) => k.name.toLowerCase() === (item.name || '').trim().toLowerCase());
    const canonicalTags = knownItem?.tags || '';
    const legacyTags = (item.desc || '').match(/\[[^\]]+\]/g)?.join(' ') || '';
    const combined = `${item.tags || ''} ${legacyTags}`.trim() || canonicalTags;
    const pills = extractTagsFromText(combined);
    const seen = new Set<string>();
    return pills.filter((p) => {
        if (seen.has(p.tag)) return false;
        seen.add(p.tag);
        return true;
    });
}

export function extractMoveTags(desc: string): ParsedTagPill[] {
    if (!desc) return [];
    const pills: ParsedTagPill[] = [];

    // 1. Extract bracketed tags
    const bracketMatches = [...desc.matchAll(/\[([^\]]+)\]/g)];
    for (const bm of bracketMatches) {
        pills.push({
            tag: bm[0],
            display: bm[1].trim(),
            raw: bm[0],
            isMoveKeyword: false
        });
    }

    // Text with brackets stripped to avoid double-matching inner keywords
    const textWithoutBrackets = desc.replace(/\[[^\]]+\]/g, ' ');

    // 2. Unbracketed move keywords
    const keywordRegexes: {
        pattern: RegExp;
        normalize: (match: RegExpMatchArray) => { tag: string; display: string };
    }[] = [
        {
            pattern: /\b(?:low accuracy|low acc)\s*(\d+)\b/gi,
            normalize: (m) => ({
                tag: `Low Accuracy ${m[1]}`,
                display: `Low Accuracy ${m[1]}`
            })
        },
        {
            pattern: /\b(?:high critical|high crit)\b/gi,
            normalize: () => ({
                tag: 'High Critical',
                display: 'High Critical'
            })
        },
        {
            pattern: /\bnever miss\b/gi,
            normalize: () => ({
                tag: 'Never Miss',
                display: 'Never Miss'
            })
        },
        {
            pattern: /\brecoil\b/gi,
            normalize: () => ({
                tag: 'Recoil',
                display: 'Recoil'
            })
        },
        {
            pattern: /\bsuccessive actions?\b/gi,
            normalize: () => ({
                tag: 'Successive Actions',
                display: 'Successive Actions'
            })
        },
        {
            pattern: /\bset damage\s*(\d+)\b/gi,
            normalize: (m) => ({
                tag: `Set Damage ${m[1]}`,
                display: `Set Damage ${m[1]}`
            })
        },
        {
            pattern: /\bpowder(?:\s+move)?\b/gi,
            normalize: () => ({
                tag: 'Powder',
                display: 'Powder'
            })
        }
    ];

    for (const kr of keywordRegexes) {
        const matches = [...textWithoutBrackets.matchAll(kr.pattern)];
        for (const m of matches) {
            const norm = kr.normalize(m);
            // Avoid duplicate if already in pills
            if (!pills.some((p) => p.display.toLowerCase() === norm.display.toLowerCase())) {
                pills.push({
                    tag: norm.tag,
                    display: norm.display,
                    raw: m[0],
                    isMoveKeyword: true
                });
            }
        }
    }

    return pills;
}
