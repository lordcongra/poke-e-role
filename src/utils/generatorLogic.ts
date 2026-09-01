import type { TempMove, CharacterState, GeneratorConfig } from '../store/storeTypes';
import { CombatStat, SocialStat, Skill } from '../types/enums';

const COMBAT_STATS = Object.values(CombatStat) as string[];
const SOCIAL_STATS = Object.values(SocialStat) as string[];
const ALL_SKILLS = Object.values(Skill) as string[];

function preAllocateStats(
    generatedAttributes: Record<string, number>,
    generatedSocials: Record<string, number>,
    config: GeneratorConfig,
    state: CharacterState,
    attributeLimits: Record<string, number>,
    attributePoints: number,
    remainingPoints: { attr: number; soc: number }
) {
    const minStats = config.minStats || {};
    const minSocials = config.minSocials || {};

    // 1. Process User-Defined Minimum Combat Stats
    for (const attr of COMBAT_STATS) {
        const minDesired = minStats[attr] || 0;
        while (
            remainingPoints.attr > 0 &&
            generatedAttributes[attr] < minDesired &&
            generatedAttributes[attr] + state.stats[attr as CombatStat].base < attributeLimits[attr]
        ) {
            generatedAttributes[attr]++;
            remainingPoints.attr--;
        }
    }

    // 2. Process User-Defined Minimum Social Stats
    for (const soc of SOCIAL_STATS) {
        const minDesired = minSocials[soc] || 0;
        while (
            remainingPoints.soc > 0 &&
            generatedSocials[soc] < minDesired &&
            generatedSocials[soc] + state.socials[soc as SocialStat].base < 5
        ) {
            generatedSocials[soc]++;
            remainingPoints.soc--;
        }
    }

    // 3. Process Smart Defense Quotas
    if (config.ensureDefenses) {
        const defenseQuota = Math.floor(attributePoints / 4); // 4->1, 8->2, 10->2, 14->3
        ['vit', 'ins'].forEach((attr) => {
            while (
                remainingPoints.attr > 0 &&
                generatedAttributes[attr] < defenseQuota &&
                generatedAttributes[attr] + state.stats[attr as CombatStat].base < attributeLimits[attr]
            ) {
                generatedAttributes[attr]++;
                remainingPoints.attr--;
            }
        });
    }
}

export function assignWildStats(
    generatedAttributes: Record<string, number>,
    generatedSocials: Record<string, number>,
    generatedSkills: Record<string, number>,
    attributePoints: number,
    socialPoints: number,
    skillPoints: number,
    attributeLimits: Record<string, number>,
    state: CharacterState,
    maxSkillRank: number,
    config: GeneratorConfig,
    customSkillsList: string[]
) {
    const points = { attr: attributePoints, soc: socialPoints };
    preAllocateStats(generatedAttributes, generatedSocials, config, state, attributeLimits, attributePoints, points);

    let remainingAttributePoints = points.attr;
    let remainingSocialPoints = points.soc;
    let remainingSkillPoints = skillPoints;

    const attributesToAssign = [...COMBAT_STATS];
    while (remainingAttributePoints > 0 && attributesToAssign.length > 0) {
        const randomAttribute = attributesToAssign[Math.floor(Math.random() * attributesToAssign.length)];
        const currentRank = generatedAttributes[randomAttribute];
        const base = state.stats[randomAttribute as CombatStat].base;
        if (currentRank + base < attributeLimits[randomAttribute]) {
            generatedAttributes[randomAttribute]++;
            remainingAttributePoints--;
        } else {
            attributesToAssign.splice(attributesToAssign.indexOf(randomAttribute), 1);
        }
    }

    const socialsToAssign = [...SOCIAL_STATS];
    while (remainingSocialPoints > 0 && socialsToAssign.length > 0) {
        const randomSocial = socialsToAssign[Math.floor(Math.random() * socialsToAssign.length)];
        const currentRank = generatedSocials[randomSocial];
        const base = state.socials[randomSocial as SocialStat].base;
        if (currentRank + base < 5) {
            generatedSocials[randomSocial]++;
            remainingSocialPoints--;
        } else {
            socialsToAssign.splice(socialsToAssign.indexOf(randomSocial), 1);
        }
    }

    const pmdSkillsList = ['crafts', 'lore', 'medicine', 'magic'];
    let skillsToAssign: string[] = config.includePmd
        ? [...ALL_SKILLS]
        : ALL_SKILLS.filter((skill) => !pmdSkillsList.includes(skill));
    if (config.includeCustom) skillsToAssign = [...skillsToAssign, ...customSkillsList];

    while (remainingSkillPoints > 0 && skillsToAssign.length > 0) {
        const randomSkill = skillsToAssign[Math.floor(Math.random() * skillsToAssign.length)];
        if (generatedSkills[randomSkill] < maxSkillRank) {
            generatedSkills[randomSkill]++;
            remainingSkillPoints--;
        } else {
            skillsToAssign.splice(skillsToAssign.indexOf(randomSkill), 1);
        }
    }
}

export function determineDefensiveStyle(
    state: CharacterState,
    generatedAttributes: Record<string, number>,
    remainingSkillPoints: number,
    maxSkillRank: number,
    config: GeneratorConfig
): 'evasion' | 'clash' | 'balanced' {
    const preference = config.defensePreference || 'auto';
    if (preference === 'evasion' || preference === 'clash' || preference === 'balanced') {
        return preference;
    }

    // Auto (Smart Detect with weighted viability evaluation)
    const totalDex = (state.stats[CombatStat.DEX]?.base || 0) + (generatedAttributes['dex'] || 0);
    const totalStr = (state.stats[CombatStat.STR]?.base || 0) + (generatedAttributes['str'] || 0);
    const totalSpe = (state.stats[CombatStat.SPE]?.base || 0) + (generatedAttributes['spe'] || 0);
    const maxAtkStat = Math.max(totalStr, totalSpe);

    const maxSkillAdd = Math.min(remainingSkillPoints, maxSkillRank);
    const potentialEvade = totalDex + maxSkillAdd;
    const potentialClash = maxAtkStat + maxSkillAdd;

    // 1. Slow / bulky Pokémon with poor agility (potential Evade pool < 4, or Clash far exceeds Evade by >= 3 with low Dex)
    if (potentialEvade < 4 || (potentialClash >= potentialEvade + 3 && totalDex <= 2)) {
        // ~85% Clash, 15% Evasion for rare agile variation
        return Math.random() < 0.85 ? 'clash' : 'evasion';
    }

    // 2. Special Attackers & Agile Pokémon: Special attackers and high-dex species rely heavily on Evasion
    const isSpecialAttacker = config.combatBias === 'special';
    const isNaturallyAgile = totalDex >= 3;
    if ((isSpecialAttacker && potentialEvade >= 4) || (isNaturallyAgile && potentialEvade >= 5)) {
        // ~85% Evasion, 15% Clash
        return Math.random() < 0.85 ? 'evasion' : 'clash';
    }

    // 3. Competitive / Close Range: If Evade is within 1 die of Clash, favor Evade (superior damage mitigation)
    if (potentialEvade >= potentialClash - 1) {
        return Math.random() < 0.80 ? 'evasion' : 'clash';
    }

    // 4. Default weighted roll between Evade and Clash
    const evadeWeight = Math.max(1, potentialEvade + 1);
    const clashWeight = Math.max(1, potentialClash);
    const roll = Math.random() * (evadeWeight + clashWeight);
    return roll < evadeWeight ? 'evasion' : 'clash';
}

export function assignMinMaxStats(
    generatedAttributes: Record<string, number>,
    generatedSocials: Record<string, number>,
    generatedSkills: Record<string, number>,
    attributePoints: number,
    socialPoints: number,
    skillPoints: number,
    attributeLimits: Record<string, number>,
    state: CharacterState,
    maxSkillRank: number,
    config: GeneratorConfig,
    customSkillsList: string[],
    draftedMoves: TempMove[]
) {
    const points = { attr: attributePoints, soc: socialPoints };
    preAllocateStats(generatedAttributes, generatedSocials, config, state, attributeLimits, attributePoints, points);

    let remainingAttributePoints = points.attr;
    let remainingSocialPoints = points.soc;
    let remainingSkillPoints = skillPoints;

    const requiredAttributes: Record<string, number> = { str: 0, dex: 0, vit: 0, spe: 0, ins: 0 };
    const requiredSocials: Record<string, number> = { tou: 0, coo: 0, bea: 0, cut: 0, cle: 0 };
    const requiredSkills: Record<string, number> = {};

    draftedMoves.forEach((move) => {
        const attrs =
            move.candidateAttrs && move.candidateAttrs.length > 0
                ? move.candidateAttrs
                : move.attr
                  ? [move.attr]
                  : [];
        attrs.forEach((attr) => {
            if (requiredAttributes[attr] !== undefined) requiredAttributes[attr] += 2;
            else if (requiredSocials[attr] !== undefined) requiredSocials[attr] += 2;
        });

        const dmgStats =
            move.candidateDmgStats && move.candidateDmgStats.length > 0
                ? move.candidateDmgStats
                : move.dmgStat
                  ? [move.dmgStat]
                  : [];
        dmgStats.forEach((dmgStat) => {
            if (requiredAttributes[dmgStat] !== undefined) requiredAttributes[dmgStat] += 2;
            else if (requiredSocials[dmgStat] !== undefined) requiredSocials[dmgStat] += 2;
        });

        const skills =
            move.candidateSkills && move.candidateSkills.length > 0
                ? move.candidateSkills
                : move.skill && move.skill !== 'none'
                  ? [move.skill]
                  : [];
        skills.forEach((skill) => {
            if (skill && skill !== 'none') {
                requiredSkills[skill] = (requiredSkills[skill] || 0) + 2;
            }
        });
    });

    // Overwhelming Combat Bias to ensure Primary Damage stat is aggressively capped first
    if (config.combatBias === 'tank') {
        requiredAttributes['vit'] += 20;
        requiredAttributes['ins'] += 20;
    } else if (config.combatBias === 'physical') {
        requiredAttributes['str'] += 20;
    } else if (config.combatBias === 'special') {
        requiredAttributes['spe'] += 20;
    }

    let availableAttributes = Object.keys(requiredAttributes).filter((attr) => requiredAttributes[attr] > 0);
    while (remainingAttributePoints > 0 && availableAttributes.length > 0) {
        const maxWeight = Math.max(...availableAttributes.map((attr) => requiredAttributes[attr]));
        const topTierAttributes = availableAttributes.filter((attr) => requiredAttributes[attr] === maxWeight);
        let assignedInLoop = false;
        for (const attr of topTierAttributes) {
            if (remainingAttributePoints <= 0) break;
            const base = state.stats[attr as CombatStat].base;
            if (generatedAttributes[attr] + base < attributeLimits[attr]) {
                generatedAttributes[attr]++;
                remainingAttributePoints--;
                assignedInLoop = true;
            }
        }
        if (!assignedInLoop)
            availableAttributes = availableAttributes.filter((attr) => !topTierAttributes.includes(attr));
    }

    const dumpList =
        config.combatBias === 'special' ? ['spe', 'dex', 'vit', 'ins', 'str'] : ['str', 'dex', 'vit', 'ins', 'spe'];
    for (const attr of dumpList) {
        while (remainingAttributePoints > 0) {
            const base = state.stats[attr as CombatStat].base;
            if (generatedAttributes[attr] + base < attributeLimits[attr]) {
                generatedAttributes[attr]++;
                remainingAttributePoints--;
            } else break;
        }
    }

    let availableSocials = Object.keys(requiredSocials).filter((soc) => requiredSocials[soc] > 0);
    while (remainingSocialPoints > 0 && availableSocials.length > 0) {
        const maxWeight = Math.max(...availableSocials.map((soc) => requiredSocials[soc]));
        const topTierSocials = availableSocials.filter((soc) => requiredSocials[soc] === maxWeight);
        let assignedInLoop = false;
        for (const soc of topTierSocials) {
            if (remainingSocialPoints <= 0) break;
            const base = state.socials[soc as SocialStat].base;
            if (generatedSocials[soc] + base < 5) {
                generatedSocials[soc]++;
                remainingSocialPoints--;
                assignedInLoop = true;
            }
        }
        if (!assignedInLoop) availableSocials = availableSocials.filter((soc) => !topTierSocials.includes(soc));
    }

    const dumpSocials = [...SOCIAL_STATS];
    while (remainingSocialPoints > 0 && dumpSocials.length > 0) {
        const randomSocial = dumpSocials[Math.floor(Math.random() * dumpSocials.length)];
        const base = state.socials[randomSocial as SocialStat].base;
        if (generatedSocials[randomSocial] + base < 5) {
            generatedSocials[randomSocial]++;
            remainingSocialPoints--;
        } else dumpSocials.splice(dumpSocials.indexOf(randomSocial), 1);
    }

    const pmdSkillsList = ['crafts', 'lore', 'medicine', 'magic'];
    const validSkills: string[] = [...ALL_SKILLS, ...(config.includeCustom ? customSkillsList : [])].filter(
        (skill) => config.includePmd || !pmdSkillsList.includes(skill)
    );

    // Stage 1: Fund the skills demanded by the Move Pool
    let availableSkills = Object.keys(requiredSkills).filter((skill) => validSkills.includes(skill));
    while (remainingSkillPoints > 0 && availableSkills.length > 0) {
        const maxWeight = Math.max(...availableSkills.map((skill) => requiredSkills[skill]));
        const topTierSkills = availableSkills.filter((skill) => requiredSkills[skill] === maxWeight);
        let assignedInLoop = false;
        for (const skill of topTierSkills) {
            if (remainingSkillPoints <= 0) break;
            if (generatedSkills[skill] < maxSkillRank) {
                generatedSkills[skill]++;
                remainingSkillPoints--;
                assignedInLoop = true;
            }
        }
        if (!assignedInLoop) availableSkills = availableSkills.filter((skill) => !topTierSkills.includes(skill));
    }

    // Stage 2: Smart Defensive Dumps based on leftover points and defense preference
    const defensiveStyle = determineDefensiveStyle(
        state,
        generatedAttributes,
        remainingSkillPoints,
        maxSkillRank,
        config
    );

    if (defensiveStyle === 'balanced') {
        const targetPerDef = Math.min(maxSkillRank, Math.max(1, Math.floor(remainingSkillPoints / 2)));
        if (validSkills.includes('evasion')) {
            while (remainingSkillPoints > 0 && generatedSkills['evasion'] < targetPerDef) {
                generatedSkills['evasion']++;
                remainingSkillPoints--;
            }
        }
        if (validSkills.includes('clash')) {
            while (remainingSkillPoints > 0 && generatedSkills['clash'] < targetPerDef) {
                generatedSkills['clash']++;
                remainingSkillPoints--;
            }
        }
        if (validSkills.includes('evasion')) {
            while (remainingSkillPoints > 0 && generatedSkills['evasion'] < maxSkillRank) {
                generatedSkills['evasion']++;
                remainingSkillPoints--;
            }
        }
        if (validSkills.includes('clash')) {
            while (remainingSkillPoints > 0 && generatedSkills['clash'] < maxSkillRank) {
                generatedSkills['clash']++;
                remainingSkillPoints--;
            }
        }
        if (validSkills.includes('alert')) {
            while (remainingSkillPoints > 0 && generatedSkills['alert'] < maxSkillRank) {
                generatedSkills['alert']++;
                remainingSkillPoints--;
            }
        }
    } else {
        const primaryDefense = defensiveStyle;
        const secondaryDefense = primaryDefense === 'evasion' ? 'clash' : 'evasion';

        // Fund Primary Defense to Max First
        if (validSkills.includes(primaryDefense)) {
            while (remainingSkillPoints > 0 && generatedSkills[primaryDefense] < maxSkillRank) {
                generatedSkills[primaryDefense]++;
                remainingSkillPoints--;
            }
        }

        // If we have plenty of points left, solidly fund the secondary defense.
        // Otherwise, sprinkle the sparse points into Alert.
        if (remainingSkillPoints >= maxSkillRank) {
            if (validSkills.includes(secondaryDefense)) {
                while (remainingSkillPoints > 0 && generatedSkills[secondaryDefense] < maxSkillRank) {
                    generatedSkills[secondaryDefense]++;
                    remainingSkillPoints--;
                }
            }
            if (validSkills.includes('alert')) {
                while (remainingSkillPoints > 0 && generatedSkills['alert'] < maxSkillRank) {
                    generatedSkills['alert']++;
                    remainingSkillPoints--;
                }
            }
        } else {
            if (validSkills.includes('alert')) {
                while (remainingSkillPoints > 0 && generatedSkills['alert'] < maxSkillRank) {
                    generatedSkills['alert']++;
                    remainingSkillPoints--;
                }
            }
            if (validSkills.includes(secondaryDefense)) {
                while (remainingSkillPoints > 0 && generatedSkills[secondaryDefense] < maxSkillRank) {
                    generatedSkills[secondaryDefense]++;
                    remainingSkillPoints--;
                }
            }
        }
    }

    // Stage 3: Tier 2 Utility and Random Spillovers
    const tier2Utility = ['athletic', 'stealth'];
    for (const skill of tier2Utility) {
        if (!validSkills.includes(skill)) continue;
        while (remainingSkillPoints > 0 && generatedSkills[skill] < Math.min(3, maxSkillRank)) {
            generatedSkills[skill]++;
            remainingSkillPoints--;
        }
    }

    for (const skill of tier2Utility) {
        if (!validSkills.includes(skill)) continue;
        while (remainingSkillPoints > 0 && generatedSkills[skill] < maxSkillRank) {
            generatedSkills[skill]++;
            remainingSkillPoints--;
        }
    }

    while (remainingSkillPoints > 0 && validSkills.length > 0) {
        const randomSkill = validSkills[Math.floor(Math.random() * validSkills.length)];
        if (generatedSkills[randomSkill] < maxSkillRank) {
            generatedSkills[randomSkill]++;
            remainingSkillPoints--;
        } else validSkills.splice(validSkills.indexOf(randomSkill), 1);
    }
}

export function assignAverageStats(
    generatedAttributes: Record<string, number>,
    generatedSocials: Record<string, number>,
    generatedSkills: Record<string, number>,
    attributePoints: number,
    socialPoints: number,
    skillPoints: number,
    attributeLimits: Record<string, number>,
    state: CharacterState,
    maxSkillRank: number,
    config: GeneratorConfig,
    customSkillsList: string[],
    draftedMoves: TempMove[]
) {
    const points = { attr: attributePoints, soc: socialPoints };
    preAllocateStats(generatedAttributes, generatedSocials, config, state, attributeLimits, attributePoints, points);

    let remainingAttributePoints = points.attr;
    let remainingSocialPoints = points.soc;
    let remainingSkillPoints = skillPoints;

    const coreAttributes = new Set<string>();
    const coreSocials = new Set<string>();
    const coreSkills = new Set<string>();

    draftedMoves.forEach((move) => {
        const attrs =
            move.candidateAttrs && move.candidateAttrs.length > 0
                ? move.candidateAttrs
                : move.attr
                  ? [move.attr]
                  : [];
        attrs.forEach((a) => {
            if (COMBAT_STATS.includes(a)) coreAttributes.add(a);
            else if (SOCIAL_STATS.includes(a)) coreSocials.add(a);
        });

        const dmgStats =
            move.candidateDmgStats && move.candidateDmgStats.length > 0
                ? move.candidateDmgStats
                : move.dmgStat
                  ? [move.dmgStat]
                  : [];
        dmgStats.forEach((d) => {
            if (COMBAT_STATS.includes(d)) coreAttributes.add(d);
            else if (SOCIAL_STATS.includes(d)) coreSocials.add(d);
        });

        const skills =
            move.candidateSkills && move.candidateSkills.length > 0
                ? move.candidateSkills
                : move.skill && move.skill !== 'none'
                  ? [move.skill]
                  : [];
        skills.forEach((s) => {
            if (s && s !== 'none') coreSkills.add(s);
        });
    });

    if (config.combatBias === 'tank') {
        coreAttributes.add('vit');
        coreAttributes.add('ins');
    }

    const defensiveStyle = determineDefensiveStyle(
        state,
        generatedAttributes,
        remainingSkillPoints,
        maxSkillRank,
        config
    );
    if (defensiveStyle === 'balanced') {
        coreSkills.add('evasion');
        coreSkills.add('clash');
    } else {
        coreSkills.add(defensiveStyle);
    }
    coreSkills.add('alert');

    for (const attr of coreAttributes) {
        const targetRank = Math.max(1, Math.ceil((attributeLimits[attr] - state.stats[attr as CombatStat].base) / 2));
        while (remainingAttributePoints > 0 && generatedAttributes[attr] < targetRank) {
            generatedAttributes[attr]++;
            remainingAttributePoints--;
        }
    }
    for (const soc of coreSocials) {
        const targetRank = Math.max(1, Math.ceil((5 - state.socials[soc as SocialStat].base) / 2));
        while (remainingSocialPoints > 0 && generatedSocials[soc] < targetRank) {
            generatedSocials[soc]++;
            remainingSocialPoints--;
        }
    }
    const targetSkillBoost = Math.max(1, Math.ceil(maxSkillRank / 2));
    for (const skill of coreSkills) {
        while (remainingSkillPoints > 0 && generatedSkills[skill] < targetSkillBoost) {
            generatedSkills[skill]++;
            remainingSkillPoints--;
        }
    }

    const remainingAttributesToAssign = [...COMBAT_STATS];
    while (remainingAttributePoints > 0 && remainingAttributesToAssign.length > 0) {
        const randomAttribute =
            remainingAttributesToAssign[Math.floor(Math.random() * remainingAttributesToAssign.length)];
        if (
            generatedAttributes[randomAttribute] + state.stats[randomAttribute as CombatStat].base <
            attributeLimits[randomAttribute]
        ) {
            generatedAttributes[randomAttribute]++;
            remainingAttributePoints--;
        } else remainingAttributesToAssign.splice(remainingAttributesToAssign.indexOf(randomAttribute), 1);
    }

    const remainingSocialsToAssign = [...SOCIAL_STATS];
    while (remainingSocialPoints > 0 && remainingSocialsToAssign.length > 0) {
        const randomSocial = remainingSocialsToAssign[Math.floor(Math.random() * remainingSocialsToAssign.length)];
        if (generatedSocials[randomSocial] + state.socials[randomSocial as SocialStat].base < 5) {
            generatedSocials[randomSocial]++;
            remainingSocialPoints--;
        } else remainingSocialsToAssign.splice(remainingSocialsToAssign.indexOf(randomSocial), 1);
    }

    const pmdSkillsList = ['crafts', 'lore', 'medicine', 'magic'];
    const validSkills: string[] = [...ALL_SKILLS, ...(config.includeCustom ? customSkillsList : [])].filter(
        (skill) => config.includePmd || !pmdSkillsList.includes(skill)
    );

    while (remainingSkillPoints > 0 && validSkills.length > 0) {
        const randomSkill = validSkills[Math.floor(Math.random() * validSkills.length)];
        if (generatedSkills[randomSkill] < maxSkillRank) {
            generatedSkills[randomSkill]++;
            remainingSkillPoints--;
        } else validSkills.splice(validSkills.indexOf(randomSkill), 1);
    }
}
