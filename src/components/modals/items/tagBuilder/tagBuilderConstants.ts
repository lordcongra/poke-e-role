import type { ReactNode } from 'react';
import { CombatStat, SocialStat, Skill } from '../../../../types/enums';
import type { ExtraCategory } from '../../../../store/storeTypes';
import type { RequirementGroup, PresetConfig } from './tagBuilderTypes';

export const CATEGORIES = ['Physical', 'Special'];
export const MISC = ['Super Effective'];

export const MODIFIERS = [
    'Charge Move',
    'Copy Move',
    'Force Field',
    'Basic Heal',
    'Complete Heal',
    'Minor Heal',
    'High Critical',
    'Low Accuracy',
    'Bite Move',
    'Cutter Move',
    'Fist Move',
    'Projectile Move',
    'Wind Move',
    'Never Miss',
    'Must Recharge',
    'Ongoing Damage',
    'Out of Range',
    'Powder Move',
    'Rampage',
    'Ranged Move',
    'Reaction',
    'Late Reaction',
    'Recoil',
    'Set Damage',
    'Sound Move',
    'Shield Move',
    'Successive Actions',
    'Double Action',
    'Triple Action',
    'Switcher Move',
    'Unique Move'
];

export interface CategoryTabItem {
    id: string;
    label: string;
    icon: ReactNode;
}

const formatEnum = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);

export const getTargetOptions = (category: string, extraCategories: ExtraCategory[]): string[] => {
    if (category === 'stat') {
        return [
            ...Object.values(CombatStat).map(formatEnum),
            ...Object.values(SocialStat).map(formatEnum),
            'Def',
            'Spd'
        ];
    }
    if (category === 'skill') {
        const customSkillNames = extraCategories.flatMap((c) => c.skills.map((s) => s.name || 'Unnamed'));
        return [...Object.values(Skill).map(formatEnum), ...customSkillNames];
    }
    if (category === 'combat') {
        return [
            'Dmg',
            'Acc',
            'Init',
            'Chance',
            'Crit Dmg',
            'Combo Dmg',
            'First Hit Dmg',
            'First Hit Acc',
            'Low Acc Penalty'
        ];
    }
    if (category === 'matchup') return ['Immune', 'Resist', 'Weak', 'Remove Immunities'];
    if (category === 'mechanic') {
        return [
            'High Crit',
            'Stacking High Crit',
            'Ignore Low Acc',
            'Ignore Pain',
            'Recoil',
            'Super Effective',
            'Powder',
            'Gain Temp HP',
            'Temp HP on Hit',
            'Temp HP % Dmg',
            'Acc [X]s Add Dmg Limit [Y]'
        ];
    }
    if (category === 'turn_based') {
        return [
            'Deal Damage End of Round',
            'Reduce Will End of Round',
            'Heal Round End',
            'Restore Will Round End',
            'Lose Action(s)',
            'No Reactions',
            'Extra Reaction(s)'
        ];
    }
    if (category === 'status') {
        return [
            '1st Degree Burn',
            '2nd Degree Burn',
            '3rd Degree Burn',
            'Poison',
            'Badly Poisoned',
            'Paralysis',
            'Sleep',
            'Frozen Solid',
            'Confusion',
            'In Love',
            'Disable',
            'Flinch'
        ];
    }
    if (category === 'move_mechanics') {
        return [
            'High Critical',
            'Low Accuracy',
            'Never Miss',
            'Recoil',
            'Successive Actions',
            'Set Damage',
            'Powder',
            'Fist Move',
            'Bite Move',
            'Cutter Move',
            'Sound Move',
            'Projectile Move',
            'Wind Move',
            'Basic Heal',
            'Complete Heal',
            'Minor Heal'
        ];
    }
    return [];
};

export const showTypeSelect = (category: string, target: string): boolean => {
    return (
        (category === 'combat' &&
            !['Init', 'Chance', 'Crit Dmg', 'Combo Dmg', 'First Hit Dmg', 'First Hit Acc'].includes(target)) ||
        (category === 'matchup' && target !== 'Remove Immunities') ||
        (category === 'mechanic' && target === 'Ignore Pain')
    );
};

export const showValueInput = (category: string, target: string): boolean => {
    return (
        category === 'stat' ||
        category === 'skill' ||
        category === 'combat' ||
        (category === 'mechanic' &&
            [
                'Ignore Low Acc',
                'Gain Temp HP',
                'Temp HP on Hit',
                'Temp HP % Dmg',
                'Acc [X]s Add Dmg Limit [Y]'
            ].includes(target)) ||
        (category === 'turn_based' && target !== 'No Reactions') ||
        (category === 'move_mechanics' && ['Low Accuracy', 'Set Damage'].includes(target))
    );
};

export const PRESETS: Record<string, PresetConfig> = {
    stat: {
        category: 'stat',
        target: 'Str',
        value: 1,
        condition: 'none',
        reqGroup: 'none',
        typeOption: ''
    },
    stacking_boost: {
        category: 'stat',
        target: 'Dex',
        value: 1,
        condition: 'stacking_boost',
        reqGroup: 'none',
        typeOption: ''
    },
    type_dmg: {
        category: 'combat',
        target: 'Dmg',
        value: 1,
        reqGroup: 'type',
        typeOption: 'Fire',
        condition: 'none'
    },
    immunity: {
        category: 'matchup',
        target: 'Immune',
        value: 1,
        reqGroup: 'type',
        typeOption: 'Fire',
        condition: 'none'
    },
    pinch: {
        category: 'combat',
        target: 'Dmg',
        value: 2,
        condition: 'half hp',
        reqGroup: 'none',
        typeOption: ''
    },
    high_crit: {
        category: 'mechanic',
        target: 'High Crit',
        value: 1,
        condition: 'none',
        reqGroup: 'none',
        typeOption: ''
    }
};

export const getDefaultTargetForCategory = (
    catId: string
): { target: string; reqGroup: RequirementGroup; typeOption: string } => {
    if (catId === 'matchup') {
        return { target: 'Immune', reqGroup: 'type', typeOption: 'Fire' };
    }
    if (catId === 'stat') {
        return { target: 'Str', reqGroup: 'none', typeOption: '' };
    }
    if (catId === 'combat') {
        return { target: 'Dmg', reqGroup: 'none', typeOption: '' };
    }
    if (catId === 'skill') {
        return { target: 'Brawl', reqGroup: 'none', typeOption: '' };
    }
    if (catId === 'mechanic') {
        return { target: 'High Crit', reqGroup: 'none', typeOption: '' };
    }
    if (catId === 'turn_based') {
        return { target: 'Heal Round End', reqGroup: 'none', typeOption: '' };
    }
    if (catId === 'status') {
        return { target: '1st Degree Burn', reqGroup: 'none', typeOption: '' };
    }
    if (catId === 'move_mechanics') {
        return { target: 'High Critical', reqGroup: 'none', typeOption: '' };
    }
    return { target: '', reqGroup: 'none', typeOption: '' };
};
