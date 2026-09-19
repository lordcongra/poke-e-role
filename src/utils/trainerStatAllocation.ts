import type { Rank, Badge } from '../store/storeTypes';
import { CombatStat, SocialStat, Skill } from '../types/enums';
import { getRankPoints, getAgePoints } from '../store/useCharacterStore';
import type { TrainerClass, TrainerProfileType } from '../data/trainerClasses';

export const KANTO_BADGE_PRESETS: { name: string; emoji: string }[] = [
    { name: 'Boulder Badge', emoji: '🪨' },
    { name: 'Cascade Badge', emoji: '💧' },
    { name: 'Thunder Badge', emoji: '⚡' },
    { name: 'Rainbow Badge', emoji: '🌈' },
    { name: 'Soul Badge', emoji: '💜' },
    { name: 'Marsh Badge', emoji: '👁️' },
    { name: 'Volcano Badge', emoji: '🔥' },
    { name: 'Earth Badge', emoji: '🌱' }
];

export function determineSuggestedBadges(rank: Rank): Badge[] {
    let count = 0;
    switch (rank) {
        case 'Standard':
            count = 1;
            break;
        case 'Advanced':
            count = 4;
            break;
        case 'Expert':
        case 'Ace':
        case 'Master':
        case 'Champion':
            count = 8;
            break;
        default:
            count = 0;
            break;
    }

    const badges: Badge[] = [];
    for (let i = 0; i < count; i++) {
        const preset = KANTO_BADGE_PRESETS[i % KANTO_BADGE_PRESETS.length];
        badges.push({
            id: crypto.randomUUID(),
            name: preset.name,
            emoji: preset.emoji
        });
    }

    if (rank === 'Champion') {
        badges.push({
            id: crypto.randomUUID(),
            name: 'Champion Trophy',
            emoji: '🏆'
        });
    }

    return badges;
}

export function allocatePrioritizedAttributes(
    points: number,
    priorityList: string[],
    maxAllocPerStat: number = 4,
    isBalanced: boolean = false
): Record<string, number> {
    const ranks: Record<string, number> = {};
    priorityList.forEach((stat) => (ranks[stat] = 0));

    if (points <= 0 || priorityList.length === 0) return ranks;

    if (isBalanced) {
        let rem = points;
        while (rem > 0 && priorityList.some((s) => ranks[s] < maxAllocPerStat)) {
            for (const stat of priorityList) {
                if (rem <= 0) break;
                if (ranks[stat] < maxAllocPerStat) {
                    ranks[stat]++;
                    rem--;
                }
            }
        }
        return ranks;
    }

    let rem = points;
    const p1 = priorityList[0];
    const p2 = priorityList[1];
    const p3 = priorityList[2];
    const lowerPriority = priorityList.slice(3);

    const plannedSteps: Array<{ stat: string; target: number }> = [];

    if (p1) plannedSteps.push({ stat: p1, target: 1 });
    if (p2) plannedSteps.push({ stat: p2, target: 1 });
    if (p1) plannedSteps.push({ stat: p1, target: 2 });
    if (p2) plannedSteps.push({ stat: p2, target: 2 });

    if (p3) plannedSteps.push({ stat: p3, target: 1 });

    if (p1) plannedSteps.push({ stat: p1, target: 3 });
    if (p2) plannedSteps.push({ stat: p2, target: 3 });

    if (p3) plannedSteps.push({ stat: p3, target: 2 });

    if (p1) plannedSteps.push({ stat: p1, target: 4 });
    if (p2) plannedSteps.push({ stat: p2, target: 4 });

    if (p3) {
        plannedSteps.push({ stat: p3, target: 3 });
        plannedSteps.push({ stat: p3, target: 4 });
    }

    for (const step of plannedSteps) {
        if (rem <= 0) break;
        if (ranks[step.stat] < step.target && ranks[step.stat] < maxAllocPerStat) {
            ranks[step.stat]++;
            rem--;
        }
    }

    if (rem > 0) {
        for (const stat of lowerPriority) {
            while (rem > 0 && ranks[stat] < maxAllocPerStat) {
                ranks[stat]++;
                rem--;
            }
        }
    }

    if (rem > 0) {
        for (const stat of priorityList) {
            while (rem > 0 && ranks[stat] < maxAllocPerStat) {
                ranks[stat]++;
                rem--;
            }
        }
    }

    return ranks;
}

export function allocatePrioritizedSkills(
    points: number,
    skillPriority: Skill[],
    skillLimit: number,
    isBalanced: boolean = false
): Record<string, number> {
    const skillRanks: Record<string, number> = {};
    Object.values(Skill).forEach((s) => (skillRanks[s] = 0));

    if (points <= 0 || skillPriority.length === 0) return skillRanks;

    if (isBalanced) {
        let rem = points;
        while (rem > 0 && skillPriority.some((s) => skillRanks[s] < skillLimit)) {
            for (const skill of skillPriority) {
                if (rem <= 0) break;
                if (skillRanks[skill] < skillLimit) {
                    skillRanks[skill]++;
                    rem--;
                }
            }
        }
        return skillRanks;
    }

    let rem = points;
    const p1 = skillPriority[0];
    const p2 = skillPriority[1];
    const p3 = skillPriority[2];
    const p4 = skillPriority[3];
    const p5 = skillPriority[4];
    const rest = skillPriority.slice(5);

    const plannedSteps: Array<{ skill: Skill; target: number }> = [];

    if (p1) plannedSteps.push({ skill: p1, target: 1 });
    if (p2) plannedSteps.push({ skill: p2, target: 1 });
    if (p3) plannedSteps.push({ skill: p3, target: 1 });
    if (p1) plannedSteps.push({ skill: p1, target: 2 });
    if (p2) plannedSteps.push({ skill: p2, target: 2 });

    if (p4) plannedSteps.push({ skill: p4, target: 1 });
    if (p5) plannedSteps.push({ skill: p5, target: 1 });
    if (p3) plannedSteps.push({ skill: p3, target: 2 });

    if (p1) plannedSteps.push({ skill: p1, target: 3 });
    if (p2) plannedSteps.push({ skill: p2, target: 3 });
    if (p4) plannedSteps.push({ skill: p4, target: 2 });

    if (p1) plannedSteps.push({ skill: p1, target: 4 });
    if (p2) plannedSteps.push({ skill: p2, target: 4 });
    if (p3) plannedSteps.push({ skill: p3, target: 3 });
    if (p3) plannedSteps.push({ skill: p3, target: 4 });

    if (p1) plannedSteps.push({ skill: p1, target: 5 });
    if (p2) plannedSteps.push({ skill: p2, target: 5 });
    if (p3) plannedSteps.push({ skill: p3, target: 5 });

    for (const step of plannedSteps) {
        if (rem <= 0) break;
        if (step.target <= skillLimit && skillRanks[step.skill] < step.target) {
            skillRanks[step.skill]++;
            rem--;
        }
    }

    if (rem > 0) {
        for (const skill of rest) {
            while (rem > 0 && skillRanks[skill] < Math.min(2, skillLimit)) {
                skillRanks[skill]++;
                rem--;
            }
        }
    }

    if (rem > 0) {
        for (const skill of skillPriority) {
            while (rem > 0 && skillRanks[skill] < skillLimit) {
                skillRanks[skill]++;
                rem--;
            }
        }
    }

    return skillRanks;
}

export function allocateTrainerStats(
    rank: Rank,
    age: string,
    profile: TrainerProfileType = 'battler',
    isSpecial: boolean = false
): {
    attr: Record<string, number>;
    soc: Record<string, number>;
    skills: Record<string, number>;
} {
    const rankPts = getRankPoints(rank);
    const agePts = getAgePoints(age);

    const baseCore = 4;
    const baseSoc = 4;
    const baseSkill = 9;

    const remCore = baseCore + rankPts.core + agePts.core;
    const remSoc = baseSoc + rankPts.social + agePts.social;
    const remSkill = baseSkill + rankPts.skills;
    const skillLimit = rankPts.skillLimit;

    let attrPriority: string[] = isSpecial ? ['str', 'dex', 'vit', 'ins', 'spe'] : ['str', 'dex', 'vit', 'ins'];
    let socPriority: string[] = ['tou', 'coo', 'cle', 'bea', 'cut'];
    let skillPriority: Skill[] = [Skill.BRAWL, Skill.CLASH, Skill.CHANNEL, Skill.ATHLETIC, Skill.ALERT, Skill.EVASION];

    switch (profile) {
        case 'survivalist':
            attrPriority = isSpecial ? ['dex', 'str', 'vit', 'ins', 'spe'] : ['dex', 'str', 'vit', 'ins'];
            socPriority = ['tou', 'cle', 'coo', 'cut', 'bea'];
            skillPriority = [Skill.NATURE, Skill.ALERT, Skill.ATHLETIC, Skill.STEALTH, Skill.EVASION, Skill.CHANNEL];
            break;
        case 'socialite':
            attrPriority = isSpecial ? ['ins', 'dex', 'vit', 'spe', 'str'] : ['ins', 'dex', 'vit', 'str'];
            socPriority = ['coo', 'bea', 'cut', 'cle', 'tou'];
            skillPriority = [Skill.CHARM, Skill.ETIQUETTE, Skill.PERFORM, Skill.INTIMIDATE, Skill.ALERT, Skill.EVASION];
            break;
        case 'scholar':
            attrPriority = isSpecial ? ['ins', 'spe', 'vit', 'dex', 'str'] : ['ins', 'vit', 'dex', 'str'];
            socPriority = ['cle', 'coo', 'tou', 'bea', 'cut'];
            skillPriority = [Skill.MAGIC, Skill.MEDICINE, Skill.LORE, Skill.CRAFTS, Skill.ALERT];
            break;
        case 'mystic':
            attrPriority = isSpecial
                ? Math.random() < 0.5
                    ? ['spe', 'ins', 'dex', 'vit', 'str']
                    : ['ins', 'spe', 'dex', 'vit', 'str']
                : ['ins', 'dex', 'vit', 'str'];
            socPriority = ['cle', 'coo', 'tou', 'cut', 'bea'];
            skillPriority = isSpecial
                ? [Skill.CLASH, Skill.ALERT, Skill.LORE, Skill.EVASION, Skill.CHANNEL]
                : [Skill.ALERT, Skill.LORE, Skill.EVASION, Skill.CHANNEL];
            break;
        case 'balanced':
            attrPriority = isSpecial ? ['str', 'dex', 'vit', 'ins', 'spe'] : ['str', 'dex', 'vit', 'ins'];
            socPriority = ['tou', 'coo', 'bea', 'cut', 'cle'];
            skillPriority = Object.values(Skill);
            break;
        case 'battler':
        default:
            attrPriority = isSpecial ? ['str', 'dex', 'vit', 'ins', 'spe'] : ['str', 'dex', 'vit', 'ins'];
            socPriority = ['tou', 'coo', 'cle', 'bea', 'cut'];
            skillPriority = [Skill.BRAWL, Skill.CLASH, Skill.CHANNEL, Skill.ATHLETIC, Skill.ALERT, Skill.EVASION];
            break;
    }

    const isBalanced = profile === 'balanced';

    const rawAttr = allocatePrioritizedAttributes(remCore, attrPriority, 4, isBalanced);
    const attrRanks: Record<string, number> = { str: 0, dex: 0, vit: 0, ins: 0, spe: 0, ...rawAttr };

    const rawSoc = allocatePrioritizedAttributes(remSoc, socPriority, 4, isBalanced);
    const socRanks: Record<string, number> = { tou: 0, coo: 0, bea: 0, cut: 0, cle: 0, ...rawSoc };

    const skillRanks = allocatePrioritizedSkills(remSkill, skillPriority, skillLimit, isBalanced);

    return { attr: attrRanks, soc: socRanks, skills: skillRanks };
}

export function buildTrainerTokenMetadata(
    trainerName: string,
    concept: TrainerClass | null,
    rank: Rank,
    age: string,
    gender: string,
    nature: string,
    isSpecialTrainer: boolean,
    profile: TrainerProfileType,
    assignBadges: boolean,
    originBiomeId?: string
): Record<string, unknown> {
    const { attr, soc, skills } = allocateTrainerStats(rank, age, profile, isSpecialTrainer);

    const vitTotal = 1 + attr['vit'];
    const insTotal = 1 + attr['ins'];
    const maxHp = 4 + vitTotal;
    const maxWill = insTotal + 2;

    const badges = assignBadges ? determineSuggestedBadges(rank) : [];
    const modeString = isSpecialTrainer ? 'Trainer (Special)' : 'Trainer';

    const metadata: Record<string, unknown> = {
        nickname: trainerName.trim(),
        species: concept ? concept.name : '',
        rank,
        age,
        gender,
        nature,
        mode: modeString,
        'token-image-url': `${import.meta.env.BASE_URL || '/'}trainer.svg`,
        'v2-migrated': true,
        'origin-biome': originBiomeId || 'none',

        // HP & Resources
        'hp-max': maxHp,
        'hp-curr': maxHp,
        'will-max': maxWill,
        'will-curr': maxWill,

        // Badges
        badges
    };

    // Combat Stats
    const coreStats = [CombatStat.STR, CombatStat.DEX, CombatStat.VIT, CombatStat.INS];
    coreStats.forEach((stat) => {
        metadata[`${stat}-base`] = 1;
        metadata[`${stat}-rank`] = attr[stat] || 0;
        metadata[`${stat}-buff`] = 0;
        metadata[`${stat}-debuff`] = 0;
        metadata[`${stat}-limit`] = 5;
    });

    if (isSpecialTrainer) {
        metadata[`${CombatStat.SPE}-base`] = 1;
        metadata[`${CombatStat.SPE}-rank`] = attr['spe'] || 0;
        metadata[`${CombatStat.SPE}-buff`] = 0;
        metadata[`${CombatStat.SPE}-debuff`] = 0;
        metadata[`${CombatStat.SPE}-limit`] = 5;
    } else {
        metadata[`${CombatStat.SPE}-base`] = 0;
        metadata[`${CombatStat.SPE}-rank`] = 0;
        metadata[`${CombatStat.SPE}-buff`] = 0;
        metadata[`${CombatStat.SPE}-debuff`] = 0;
        metadata[`${CombatStat.SPE}-limit`] = 0;
    }

    // Socials
    Object.values(SocialStat).forEach((stat) => {
        metadata[`${stat}-base`] = 1;
        metadata[`${stat}-rank`] = soc[stat] || 0;
        metadata[`${stat}-buff`] = 0;
        metadata[`${stat}-debuff`] = 0;
        metadata[`${stat}-limit`] = 5;
    });

    // Skills
    Object.values(Skill).forEach((skill) => {
        metadata[`${skill}-base`] = skills[skill] || 0;
        metadata[`${skill}-buff`] = 0;
    });
    metadata['skills-ranks'] = { ...skills };

    return metadata;
}
