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
            tag = `[Acc ${Math.abs(numValue)}s Add Dmg Limit ${Math.abs(numValue2)}]`;
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
        if (target === 'Dmg') base = `Adds ${signStr} damage${reqStr}`;
        else if (target === 'Acc') base = `Adds ${signStr} accuracy dice${reqStr}`;
        else if (target === 'Init') base = `Modifies Initiative by ${signStr}`;
        else if (target === 'Chance') base = `Adds ${signStr} extra Chance dice`;
        else if (target === 'Crit Dmg') base = `Adds ${signStr} damage on critical hits`;
        else if (target === 'Combo Dmg') base = `Adds ${signStr} damage to combo/successive moves`;
        else if (target === 'First Hit Dmg') base = `Adds ${signStr} damage on the first hit each round`;
        else if (target === 'First Hit Acc') base = `Adds ${signStr} accuracy on the first hit each round`;
        else if (target === 'Low Acc Penalty') base = `Modifies Low Accuracy penalty by ${signStr}`;
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
            base = `Each accuracy roll of ${value} adds 1 damage (up to +${value2} max)`;
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
