import type { TagBuilderConfig } from '../tagBuilderTypes';

const BATTLEFIELD_CONDITIONS = new Set([
    'rain',
    'sun',
    'sandstorm',
    'snow',
    'electric terrain',
    'grassy terrain',
    'misty terrain',
    'psychic terrain',
    'trick room',
    'gravity'
]);

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
        else if (target === 'Acc Succ')
            base = `Adds ${signStr} flat success${Math.abs(num) === 1 ? '' : 'es'} to Accuracy${reqStr}`;
        else if (target === 'Dmg Succ')
            base = `Adds ${signStr} flat success${Math.abs(num) === 1 ? '' : 'es'} to Damage${reqStr}`;
        else if (target === 'Type Gem') {
            const typeStr = typeOption || 'specified type';
            const val1 = num !== 0 ? num : 1;
            const val2 = Number(value2) !== 0 ? Number(value2) : 2;
            const s1 = val1 >= 0 ? `+${val1}` : `${val1}`;
            const s2 = val2 >= 0 ? `+${val2}` : `${val2}`;
            base = `Type Gem: Adds ${s1} flat success to Accuracy and ${s2} flat successes to Damage on ${typeStr} moves`;
        } else if (target === 'Init') base = `Modifies Initiative by ${signStr}`;
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
        if (target === 'High Crit' || target === 'High Critical')
            base = typeOption
                ? `Lowers critical hit threshold by 1 for ${typeOption} moves (Standard rule: High Critical does not stack across items/moves)`
                : 'Lowers critical hit threshold by 1 (Standard rule: High Critical does not stack across items/moves)';
        else if (target === 'Stacking High Crit')
            base =
                'Lowers critical threshold by 1 and explicitly stacks with High Critical moves and items (like Razor Claw). Normal [High Crit] does not stack by default; use this for abilities like Super Luck or homebrew situations where stacking crits are permitted';
        else if (target === 'Never Miss')
            base = typeOption
                ? `Attacks using ${typeOption} moves cannot miss and cannot be evaded`
                : 'Attacks cannot miss and cannot be evaded';
        else if (target === 'Ignore Pain')
            base = typeOption ? `Ignores pain penalties while using ${typeOption} moves` : 'Ignores all pain penalties';
        else if (target === 'Ignore Low Acc') base = `Ignores up to ${Math.abs(num)} Low Accuracy penalty dice`;
        else if (target === 'Gain Temp HP') base = `Grants ${Math.abs(num)} Temporary HP`;
        else if (target === 'Temp HP on Hit') base = `Grants +${Math.abs(num)} Temp HP each time a move hits`;
        else if (target === 'Temp HP % Dmg') base = `Converts ${Math.abs(num)}% of damage dealt into Temp HP`;
        else if (target === 'Acc [X]s Add Dmg Limit [Y]')
            base = `Each accuracy die rolling ${value} adds +1 damage die (up to +${value2} dice max)`;
        else if (target === 'Encounter Buff')
            base = `Encounter Buff: increases ${typeOption || 'specified stat'} by ${signStr} during combat encounters`;
        else if (target === 'Encounter Debuff')
            base = `Encounter Debuff: reduces ${typeOption || 'specified stat'} by -${Math.abs(num) || 1} during combat encounters`;
        else if (target === 'Permanent Boost')
            base = `Permanent Stat Boost: permanently increases ${typeOption || 'specified stat'} by ${signStr}`;
        else if (target === 'Damage Pool')
            base = `Sets a flat damage dice pool of ${Math.abs(num) || 1} dice (does not scale with stats)`;
        else if (target === 'Ignores Defense')
            base = `Attack ignores the target's Defense and Special Defense reductions`;
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
        if (target === 'Damage Pool')
            base = `Sets a flat damage dice pool of ${Math.abs(num) || 1} dice (does not scale with stats)`;
        else if (target === 'Ignores Defense')
            base = `Attack ignores the target's Defense and Special Defense reductions`;
        else base = `Move mechanic: ${target}`;
    } else if (category === 'battlefield') {
        const name = typeOption.trim() || target;
        const durText = num === -1 ? 'for the whole scene' : `for ${num || 4} round${(num || 4) === 1 ? '' : 's'}`;
        if (target === 'Force Field') {
            base = `Deploys "${name}" Force Field on the user's side ${durText} to protect and buff allies`;
        } else if (target === 'Entry Hazard') {
            base = `Sets "${name}" Entry Hazard on the opposing side (active for the whole scene until cleared)`;
        } else if (target === 'Weather') {
            base = `Changes battlefield weather to "${name}" ${durText}`;
        } else if (target === 'Terrain') {
            base = `Deploys "${name}" Terrain on the battlefield ${durText}`;
        } else if (target === 'Battlefield (Other)') {
            base = `Activates "${name}" battlefield effect ${durText}`;
        } else {
            base = `Activates battlefield effect "${name}" ${durText}`;
        }
    } else if (category === 'targeting') {
        base = `Targets ${target} within range`;
    } else if (category === 'choice') {
        const choiceText = target === 'Custom Choice' ? (typeOption || '') : (target || typeOption || '');
        base = `Allows selecting between: ${choiceText}`;
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
        const lower = condition.toLowerCase();
        if (BATTLEFIELD_CONDITIONS.has(lower) || lower.includes('terrain') || lower.includes('weather')) {
            return `${base} while ${condition} is active on the battlefield.`;
        }
        return `${base} while afflicted by ${condition}.`;
    }

    return `${base} (always active).`;
}

