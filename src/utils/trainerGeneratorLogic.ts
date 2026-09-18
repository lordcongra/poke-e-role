import type { CharacterState, Rank, Badge } from '../store/storeTypes';
import { CombatStat, SocialStat, Skill } from '../types/enums';
import { getRankPoints, getAgePoints } from '../store/useCharacterStore';
import { TRAINER_CLASSES, type TrainerClass, type TrainerProfileType } from '../data/trainerClasses';
import { NATURES } from '../data/constants';
import { getTrainerClassesForBiome } from '../data/biomeData';
import { generateBuild, buildTokenMetadataFromBuild } from './generatorUtils';
import type { GeneratorConfig, TempBuild } from '../store/storeTypes';

export interface TrainerGeneratorConfig {
    trainerName?: string;
    conceptId: string; // 'none' | 'random' | TrainerClass.id
    rank: Rank | 'random';
    age: 'Child' | 'Teen' | 'Adult' | 'Senior' | 'random';
    gender: 'Male' | 'Female' | 'Non-Binary' | 'random';
    nature: string | 'random';
    isSpecialTrainer: boolean;
    autoSpecialForMystic: boolean;
    profile: TrainerProfileType | 'auto';
    assignBadges: boolean;

    // Team Options
    generateTeam: boolean;
    teamSize: number; // 0 - 6
    typeSpecialtyMode: 'concept' | 'monotype' | 'dual' | 'variety' | 'manual';
    manualTypes: string[];
    teamRankMode: 'match_trainer' | 'random' | 'custom';
    customPokemonRanks?: Rank[];
    capPokemonRank: boolean;
    allowDuplicates?: boolean;
    buildType?: 'minmax' | 'average' | 'wild';
    allowedLineLengths: number[]; // e.g. [1, 2, 3]
    allowedStageIndices: number[]; // e.g. [1, 2, 3]
    includeLegendaries: boolean;
    includeMythicals: boolean;
    includeMegas: boolean;
    scaleLoyaltyHappiness: boolean;
    biomeId?: string; // Fallback / legacy
    trainerBiomeId?: string; // Biome for trainer origin & concepts
    teamBiomeId?: string; // Biome for Pokémon team ecosystem
}

export const ALL_POKEMON_TYPES = [
    'Normal',
    'Fire',
    'Water',
    'Grass',
    'Electric',
    'Ice',
    'Fighting',
    'Poison',
    'Ground',
    'Flying',
    'Psychic',
    'Bug',
    'Rock',
    'Ghost',
    'Dragon',
    'Steel',
    'Dark',
    'Fairy'
];

import {
    MYTHICAL_POKEMON_NAMES,
    type PokedexLookupItem,
    type PokemonLookupFilterOptions,
    calculateScalarLoyaltyHappiness,
    filterPokemonLookupPool
} from './pokemonFilterUtils';

export {
    MYTHICAL_POKEMON_NAMES,
    type PokedexLookupItem,
    type PokemonLookupFilterOptions,
    calculateScalarLoyaltyHappiness,
    filterPokemonLookupPool
};

const KANTO_BADGE_PRESETS: { name: string; emoji: string }[] = [
    { name: 'Boulder Badge', emoji: '🪨' },
    { name: 'Cascade Badge', emoji: '💧' },
    { name: 'Thunder Badge', emoji: '⚡' },
    { name: 'Rainbow Badge', emoji: '🌈' },
    { name: 'Soul Badge', emoji: '💜' },
    { name: 'Marsh Badge', emoji: '👁️' },
    { name: 'Volcano Badge', emoji: '🔥' },
    { name: 'Earth Badge', emoji: '🌱' }
];

export const RANK_ORDER: Rank[] = ['Starter', 'Rookie', 'Standard', 'Advanced', 'Expert', 'Ace', 'Master', 'Champion'];

export interface GeneratedTrainerResult {
    trainerName: string;
    resolvedRank: Rank;
    concept: TrainerClass | null;
    trainerMetadata: Record<string, unknown>;
    teamMembers: Array<{
        species: string;
        build: TempBuild;
        metadata: Record<string, unknown>;
    }>;
}

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

function allocatePrioritizedAttributes(
    points: number,
    priorityList: string[],
    maxAllocPerStat: number = 4,
    isBalanced: boolean = false
): Record<string, number> {
    const ranks: Record<string, number> = {};
    priorityList.forEach((stat) => (ranks[stat] = 0));

    if (points <= 0 || priorityList.length === 0) return ranks;

    if (isBalanced) {
        // Even round-robin distribution for Balanced profile
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

    // Sequence: Top 2 prioritized (up to +2 each), splash p3 (+1), advance top 2 (up to +3 each),
    // advance splash p3 (+2), cap top 2 (up to +4 each), advance splash p3 (up to +4), then spillover to lower.
    const plannedSteps: Array<{ stat: string; target: number }> = [];

    // Phase 1: Establish top 2 (up to +2 each)
    if (p1) plannedSteps.push({ stat: p1, target: 1 });
    if (p2) plannedSteps.push({ stat: p2, target: 1 });
    if (p1) plannedSteps.push({ stat: p1, target: 2 });
    if (p2) plannedSteps.push({ stat: p2, target: 2 });

    // Phase 2: Introduce splash to 3rd priority
    if (p3) plannedSteps.push({ stat: p3, target: 1 });

    // Phase 3: Push top 2 to high tier (+3 each)
    if (p1) plannedSteps.push({ stat: p1, target: 3 });
    if (p2) plannedSteps.push({ stat: p2, target: 3 });

    // Phase 4: Strengthen splash (+2)
    if (p3) plannedSteps.push({ stat: p3, target: 2 });

    // Phase 5: Cap top 2 at maximum (+4 each)
    if (p1) plannedSteps.push({ stat: p1, target: 4 });
    if (p2) plannedSteps.push({ stat: p2, target: 4 });

    // Phase 6: Max out 3rd priority (+3, +4)
    if (p3) {
        plannedSteps.push({ stat: p3, target: 3 });
        plannedSteps.push({ stat: p3, target: 4 });
    }

    // Execute planned steps
    for (const step of plannedSteps) {
        if (rem <= 0) break;
        if (ranks[step.stat] < step.target && ranks[step.stat] < maxAllocPerStat) {
            ranks[step.stat]++;
            rem--;
        }
    }

    // Phase 7: Overflow remaining points into 4th, 5th, etc.
    if (rem > 0) {
        for (const stat of lowerPriority) {
            while (rem > 0 && ranks[stat] < maxAllocPerStat) {
                ranks[stat]++;
                rem--;
            }
        }
    }

    // Safety fallback: any remaining into any stat
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

function allocatePrioritizedSkills(
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
    const others = skillPriority.slice(5);

    // 1. Give 1 point to top 4 skills to establish basic competency
    if (p1 && rem > 0) {
        skillRanks[p1]++;
        rem--;
    }
    if (p2 && rem > 0) {
        skillRanks[p2]++;
        rem--;
    }
    if (p3 && rem > 0) {
        skillRanks[p3]++;
        rem--;
    }
    if (p4 && rem > 0) {
        skillRanks[p4]++;
        rem--;
    }

    // 2. Advance Top 2 skills towards skillLimit
    while (rem > 0 && (skillRanks[p1] < skillLimit || (p2 && skillRanks[p2] < skillLimit))) {
        if (rem > 0 && skillRanks[p1] < skillLimit) {
            skillRanks[p1]++;
            rem--;
        }
        if (rem > 0 && p2 && skillRanks[p2] < skillLimit) {
            skillRanks[p2]++;
            rem--;
        }
    }

    // 3. Advance secondary skills (p3, p4, p5)
    const secondaries = [p3, p4, p5].filter(Boolean) as Skill[];
    while (rem > 0 && secondaries.some((s) => skillRanks[s] < skillLimit)) {
        for (const s of secondaries) {
            if (rem <= 0) break;
            if (skillRanks[s] < skillLimit) {
                skillRanks[s]++;
                rem--;
            }
        }
    }

    // 4. Fill remaining priority skills
    if (rem > 0) {
        for (const s of others) {
            while (rem > 0 && skillRanks[s] < skillLimit) {
                skillRanks[s]++;
                rem--;
            }
        }
    }

    // 5. Overflow into any skill if needed
    if (rem > 0) {
        for (const s of Object.values(Skill)) {
            while (rem > 0 && skillRanks[s] < skillLimit) {
                skillRanks[s]++;
                rem--;
            }
        }
    }

    return skillRanks;
}

export function allocateTrainerStats(
    rank: Rank,
    age: string,
    profile: TrainerProfileType,
    isSpecial: boolean
): {
    attr: Record<string, number>;
    soc: Record<string, number>;
    skills: Record<string, number>;
} {
    const rankPts = getRankPoints(rank);
    const agePts = getAgePoints(age);

    const remCore = rankPts.core + agePts.core;
    const remSoc = rankPts.social + agePts.social;
    const remSkill = rankPts.skills;
    const skillLimit = rankPts.skillLimit;

    // Profile Weightings (For trainers: CHANNEL = Throw, CLASH = Weapon [or Channel if Special Trainer], CHARM = Empathy, MAGIC = Science)
    let attrPriority: string[] = isSpecial ? ['str', 'dex', 'vit', 'ins', 'spe'] : ['str', 'dex', 'vit', 'ins'];
    let socPriority: string[] = ['tou', 'coo', 'cle', 'bea', 'cut'];
    let skillPriority: Skill[] = [Skill.BRAWL, Skill.CLASH, Skill.CHANNEL, Skill.ATHLETIC, Skill.ALERT, Skill.EVASION];

    switch (profile) {
        case 'survivalist':
            // Survivalists: Dex > Str > Vit > Ins (spe last if special)
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
            // Mystics/Special Trainers: Spe & Ins top 2, Dex & Vit splash, Str strictly last
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

    // Allocate Core Attributes (Base is 1, max allocation is 4 so total is 5)
    const rawAttr = allocatePrioritizedAttributes(remCore, attrPriority, 4, isBalanced);
    const attrRanks: Record<string, number> = { str: 0, dex: 0, vit: 0, ins: 0, spe: 0, ...rawAttr };

    // Allocate Social Attributes (Base is 1, max allocation is 4 so total is 5)
    const rawSoc = allocatePrioritizedAttributes(remSoc, socPriority, 4, isBalanced);
    const socRanks: Record<string, number> = { tou: 0, coo: 0, bea: 0, cut: 0, cle: 0, ...rawSoc };

    // Allocate Skills (Max rank per skill = skillLimit)
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
    assignBadges: boolean
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
        rank: rank,
        type1: '',
        type2: '',
        ability: '',
        'ability-list': '',
        nature: nature,
        gender: gender,
        age: age,
        mode: modeString,
        'dex-category': concept ? concept.name : 'Trainer',
        'show-trackers': true,
        ruleset: 'vg-vit-hp',
        'v2-migrated': true,
        'hp-base': 4,
        'hp-curr': maxHp,
        'hp-max-display': maxHp,
        'will-base': maxWill,
        'will-curr': maxWill,
        'will-max-display': maxWill,
        'def-buff': 0,
        'def-debuff': 0,
        'spd-buff': 0,
        'spd-debuff': 0,
        'actions-curr': 0,
        'evade-used': false,
        'clash-used': false,
        'chances-curr': 0,
        'fate-curr': 0,
        'global-acc': 0,
        'global-dmg': 0,
        'global-succ': 0,

        // Skill Labels mapped for Trainer Mode
        [`label-${Skill.CHANNEL}`]: 'Throw',
        [`label-${Skill.CLASH}`]: isSpecialTrainer ? 'Channel' : 'Weapon',
        [`label-${Skill.CHARM}`]: 'Empathy',
        [`label-${Skill.MAGIC}`]: 'Science',

        // Badges
        'badges-data': JSON.stringify(badges)
    };

    // Stats
    const statsList: CombatStat[] = [CombatStat.STR, CombatStat.DEX, CombatStat.VIT, CombatStat.INS];
    statsList.forEach((stat) => {
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

export function getEligibleTeamPool(
    config: TrainerGeneratorConfig,
    lookupList: PokedexLookupItem[],
    concept: TrainerClass | null
): PokedexLookupItem[] {
    // Resolve Target Types
    let teamTypes: string[] = [];
    if (config.typeSpecialtyMode === 'concept' && concept) {
        teamTypes = concept.typePreferences;
    } else if (config.typeSpecialtyMode === 'monotype') {
        teamTypes = [ALL_POKEMON_TYPES[Math.floor(Math.random() * ALL_POKEMON_TYPES.length)]];
    } else if (config.typeSpecialtyMode === 'dual') {
        const t1 = ALL_POKEMON_TYPES[Math.floor(Math.random() * ALL_POKEMON_TYPES.length)];
        const rest = ALL_POKEMON_TYPES.filter((t) => t !== t1);
        const t2 = rest[Math.floor(Math.random() * rest.length)];
        teamTypes = [t1, t2];
    } else if (config.typeSpecialtyMode === 'manual' && config.manualTypes.length > 0) {
        teamTypes = config.manualTypes;
    } else {
        teamTypes = ['Any'];
    }

    const teamBiome =
        config.teamBiomeId !== undefined
            ? config.teamBiomeId === 'none'
                ? undefined
                : config.teamBiomeId
            : config.biomeId;

    const filterOpts: PokemonLookupFilterOptions = {
        ...config,
        biomeId: teamBiome
    };

    let eligiblePool = filterPokemonLookupPool(lookupList, teamTypes, filterOpts);
    if (eligiblePool.length === 0) {
        // Fallback 1: relax stage filters if pool is empty
        eligiblePool = filterPokemonLookupPool(lookupList, teamTypes, {
            ...filterOpts,
            allowedLineLengths: [1, 2, 3],
            allowedStageIndices: [1, 2, 3]
        });
    }
    // Fallback 2: If biome restricted out the concept's specialty types (e.g. Swimmer with Water in a Desert biome),
    // relax the biome constraint FIRST so the trainer still gets their concept types (Bug for Bug Catcher, Water for Swimmer)
    if (eligiblePool.length === 0 && teamTypes.length > 0 && !teamTypes.includes('Any')) {
        eligiblePool = filterPokemonLookupPool(lookupList, teamTypes, {
            ...config,
            biomeId: undefined,
            allowedLineLengths: [1, 2, 3],
            allowedStageIndices: [1, 2, 3]
        });
    }
    if (eligiblePool.length === 0) {
        // Ultimate fallback to full lookup
        eligiblePool = lookupList.filter((m) => !m.legendary);
    }
    return eligiblePool;
}

export async function generateFullTrainerTeam(
    config: TrainerGeneratorConfig,
    state: CharacterState,
    lookupList: PokedexLookupItem[]
): Promise<GeneratedTrainerResult> {
    // 1. Resolve Trainer Identity
    let concept: TrainerClass | null = null;
    const trainerBiome = config.trainerBiomeId || config.biomeId;
    if (config.conceptId === 'biome_match') {
        if (trainerBiome && trainerBiome !== 'none' && trainerBiome !== 'any') {
            const eligible = getTrainerClassesForBiome(trainerBiome);
            if (eligible.length > 0) {
                concept = eligible[Math.floor(Math.random() * eligible.length)];
            }
        }
        if (!concept) {
            concept = TRAINER_CLASSES[Math.floor(Math.random() * TRAINER_CLASSES.length)];
        }
    } else if (config.conceptId === 'random') {
        concept = TRAINER_CLASSES[Math.floor(Math.random() * TRAINER_CLASSES.length)];
    } else if (config.conceptId && config.conceptId !== 'none') {
        concept = TRAINER_CLASSES.find((c) => c.id === config.conceptId) || null;
    }

    const resolvedRank: Rank =
        config.rank === 'random'
            ? concept?.minRank || RANK_ORDER[Math.floor(Math.random() * RANK_ORDER.length)]
            : config.rank;

    const resolvedAge =
        config.age === 'random' ? (['Teen', 'Adult', 'Senior'] as const)[Math.floor(Math.random() * 3)] : config.age;

    const resolvedGender =
        config.gender === 'random'
            ? (['Male', 'Female', 'Non-Binary'] as const)[Math.floor(Math.random() * 3)]
            : config.gender;

    const validNatures = NATURES.filter((n) => n && n.trim() !== '');
    const resolvedNature =
        config.nature === 'random' || !config.nature
            ? validNatures[Math.floor(Math.random() * validNatures.length)]
            : config.nature;

    let isSpecial = config.isSpecialTrainer;
    if (config.autoSpecialForMystic && concept?.isSupernatural) {
        isSpecial = true;
    }

    const resolvedProfile: TrainerProfileType =
        config.profile === 'auto' ? concept?.suggestedProfile || 'battler' : config.profile;

    const defaultName = concept ? concept.name : 'Trainer';
    const finalTrainerName = config.trainerName?.trim() || defaultName;

    // 2. Build Trainer Metadata
    const trainerMetadata = buildTrainerTokenMetadata(
        finalTrainerName,
        concept,
        resolvedRank,
        resolvedAge,
        resolvedGender,
        resolvedNature,
        isSpecial,
        resolvedProfile,
        config.assignBadges
    );

    // 3. Resolve Pokémon Team
    const teamMembers: Array<{
        species: string;
        build: TempBuild;
        metadata: Record<string, unknown>;
    }> = [];

    if (config.generateTeam && config.teamSize > 0) {
        const eligiblePool = getEligibleTeamPool(config, lookupList, concept);
        const usedSpecies = new Set<string>();

        for (let i = 0; i < config.teamSize; i++) {
            const member = await pickAndGenerateTeamMember(i, config, resolvedRank, state, eligiblePool, usedSpecies);
            if (member) {
                usedSpecies.add(member.species.toLowerCase());
                teamMembers.push(member);
            }
        }
    }

    return {
        trainerName: finalTrainerName,
        resolvedRank,
        concept,
        trainerMetadata,
        teamMembers
    };
}

export async function pickAndGenerateTeamMember(
    slotIndex: number,
    config: TrainerGeneratorConfig,
    resolvedRank: Rank,
    state: CharacterState,
    lookupList: PokedexLookupItem[],
    usedSpecies: Set<string> = new Set()
): Promise<{ species: string; build: TempBuild; metadata: Record<string, unknown> } | null> {
    let candidatePool = lookupList;
    if (!config.allowDuplicates) {
        const uniqueAvailable = lookupList.filter((m) => !usedSpecies.has(m.name.toLowerCase()));
        if (uniqueAvailable.length > 0) {
            candidatePool = uniqueAvailable;
        }
    }

    if (candidatePool.length === 0) {
        candidatePool = lookupList;
    }

    const chosenMon = candidatePool[Math.floor(Math.random() * candidatePool.length)];
    if (!chosenMon) return null;

    // Determine Rank
    const trainerRankIdx = RANK_ORDER.indexOf(resolvedRank);
    let pokeRank: Rank = resolvedRank;
    if (config.teamRankMode === 'custom' && config.customPokemonRanks && config.customPokemonRanks[slotIndex]) {
        pokeRank = config.customPokemonRanks[slotIndex];
    } else if (config.teamRankMode === 'random') {
        const maxAvailableIdx = config.capPokemonRank ? Math.max(0, trainerRankIdx) : RANK_ORDER.length - 1;
        const randomIdx = Math.floor(Math.random() * (maxAvailableIdx + 1));
        pokeRank = RANK_ORDER[randomIdx];
    }

    return generateSingleTeamMember(slotIndex, chosenMon, pokeRank, config, state);
}

export async function generateSingleTeamMember(
    slotIndex: number,
    chosenMon: PokedexLookupItem,
    pokeRank: Rank,
    config: TrainerGeneratorConfig,
    state: CharacterState
): Promise<{ species: string; build: TempBuild; metadata: Record<string, unknown> } | null> {
    const pokeGenConfig: GeneratorConfig = {
        targetSpecies: chosenMon.name,
        targetRank: pokeRank,
        randomizeSpecies: false,
        randomizeGender: true,
        randomizeNature: true,
        buildType: config.buildType || 'minmax',
        combatBias: 'balanced',
        defensePreference: 'auto',
        targetAtkCount: 2,
        targetSupCount: 1,
        includePmd: false,
        includeCustom: false,
        overridePrimaryStab: false,
        overrideSecondaryStab: false,
        overrideCoverage: false,
        coveragePreference: 'balanced',
        primaryStabCount: 1,
        secondaryStabCount: 1,
        coverageCount: 1,
        autoSelectBias: true,
        ensureDefenses: true,
        minStats: {},
        minSocials: {},
        includePreEvolutions: true,
        evo2Stage1Offset: 1,
        evo3Stage2Offset: 1,
        evo3Stage1Offset: 2,
        allowOverrank: false,
        overrankAmount: 0,
        allowPreEvoOverrank: false,
        useSpilloverRatio: true,
        spilloverAtkRatio: 0.5,
        spilloverSupRatio: 0.5,
        spilloverJitter: true
    };

    const pokemonState: CharacterState = {
        ...state,
        identity: {
            ...state.identity,
            mode: 'Pokémon',
            age: ''
        }
    };

    const pokeBuild = await generateBuild(pokeGenConfig, pokemonState);
    if (!pokeBuild) return null;

    const pokeMeta = buildTokenMetadataFromBuild(
        pokeBuild,
        chosenMon.name,
        `${import.meta.env.BASE_URL || '/'}pokeball.svg`
    );
    pokeMeta['age'] = '';

    if (config.scaleLoyaltyHappiness) {
        const { loyalty, happiness } = calculateScalarLoyaltyHappiness(pokeRank, slotIndex);
        pokeMeta['loyalty-curr'] = loyalty;
        pokeMeta['happiness-curr'] = happiness;
    }

    return {
        species: chosenMon.name,
        build: pokeBuild,
        metadata: pokeMeta
    };
}
