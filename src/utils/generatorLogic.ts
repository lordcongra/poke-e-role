import type { TempMove, CharacterState, GeneratorConfig } from '../store/storeTypes';
import { CombatStat, SocialStat, Skill } from '../types/enums';

const COMBAT_STATS = Object.values(CombatStat) as string[];
const SOCIAL_STATS = Object.values(SocialStat) as string[];
const ALL_SKILLS = Object.values(Skill) as string[];

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
    let remainingAttributePoints = attributePoints;
    let remainingSocialPoints = socialPoints;
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
    let remainingAttributePoints = attributePoints;
    let remainingSocialPoints = socialPoints;
    let remainingSkillPoints = skillPoints;

    const requiredAttributes: Record<string, number> = { str: 0, dex: 0, vit: 0, spe: 0, ins: 0 };
    const requiredSocials: Record<string, number> = { tou: 0, coo: 0, bea: 0, cut: 0, cle: 0 };
    const requiredSkills: Record<string, number> = {};

    draftedMoves.forEach((move) => {
        if (move.attr) {
            if (requiredAttributes[move.attr] !== undefined) requiredAttributes[move.attr] += 2;
            else if (requiredSocials[move.attr] !== undefined) requiredSocials[move.attr] += 2;
        }
        if (move.dmgStat) {
            if (requiredAttributes[move.dmgStat] !== undefined) requiredAttributes[move.dmgStat] += 2;
            else if (requiredSocials[move.dmgStat] !== undefined) requiredSocials[move.dmgStat] += 2;
        }
        if (move.skill) requiredSkills[move.skill] = (requiredSkills[move.skill] || 0) + 2;
    });

    if (config.combatBias === 'tank') {
        requiredAttributes['vit'] += 4;
        requiredAttributes['ins'] += 4;
    } else if (config.combatBias === 'physical') {
        requiredAttributes['str'] += 2;
    } else if (config.combatBias === 'special') {
        requiredAttributes['spe'] += 2;
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

    const totalDexterity = state.stats[CombatStat.DEX].base + generatedAttributes['dex'];
    const totalStrength = state.stats[CombatStat.STR].base + generatedAttributes['str'];
    const totalSpecial = state.stats[CombatStat.SPE].base + generatedAttributes['spe'];
    const utilitySkills = [];

    if (totalDexterity >= Math.max(totalStrength, totalSpecial)) utilitySkills.push('evasion');
    else utilitySkills.push('clash');

    utilitySkills.push('alert', 'athletic', 'stealth');

    for (const skill of utilitySkills) {
        if (!validSkills.includes(skill)) continue;
        while (remainingSkillPoints > 0 && generatedSkills[skill] < Math.min(3, maxSkillRank)) {
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
    let remainingAttributePoints = attributePoints;
    let remainingSocialPoints = socialPoints;
    let remainingSkillPoints = skillPoints;

    const coreAttributes = new Set<string>();
    const coreSocials = new Set<string>();
    const coreSkills = new Set<string>();

    draftedMoves.slice(0, 2).forEach((move) => {
        if (move.attr) {
            if (COMBAT_STATS.includes(move.attr)) coreAttributes.add(move.attr);
            else coreSocials.add(move.attr);
        }
        if (move.dmgStat) {
            if (COMBAT_STATS.includes(move.dmgStat)) coreAttributes.add(move.dmgStat);
            else coreSocials.add(move.dmgStat);
        }
        if (move.skill) coreSkills.add(move.skill);
    });

    if (config.combatBias === 'tank') {
        coreAttributes.add('vit');
        coreAttributes.add('ins');
    }

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
