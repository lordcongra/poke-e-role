import type { TempBuild, TempMove, CharacterState, GeneratorConfig } from '../store/storeTypes';
import { fetchPokemonData, fetchMoveData, MOVES_URLS } from './api';
import { getRankPoints, getAgePoints } from '../store/useCharacterStore';
import { CombatStat, SocialStat, Skill } from '../types/enums';
import { assignWildStats, assignMinMaxStats, assignAverageStats } from './generatorLogic';

const RANK_HIERARCHY = ['Starter', 'Rookie', 'Standard', 'Advanced', 'Expert', 'Ace', 'Master', 'Champion'];
const ALL_SKILLS = Object.values(Skill) as string[];

const ATTRIBUTE_MAPPING: Record<string, string> = {
    Strength: 'str',
    Dexterity: 'dex',
    Vitality: 'vit',
    Special: 'spe',
    Insight: 'ins',
    Tough: 'tou',
    Cool: 'coo',
    Beauty: 'bea',
    Cute: 'cut',
    Clever: 'cle',
    Will: 'will'
};

function normalizeStatistic(value: string): string {
    const stringValue = value.toLowerCase();
    if (stringValue.includes('str')) return 'str';
    if (stringValue.includes('dex')) return 'dex';
    if (stringValue.includes('vit')) return 'vit';
    if (stringValue.includes('spe')) return 'spe';
    if (stringValue.includes('ins')) return 'ins';
    if (stringValue.includes('tou')) return 'tou';
    if (stringValue.includes('coo')) return 'coo';
    if (stringValue.includes('bea')) return 'bea';
    if (stringValue.includes('cut')) return 'cut';
    if (stringValue.includes('cle')) return 'cle';
    if (stringValue.includes('will')) return 'will';
    return '';
}

function normalizeSkill(value: string): string {
    const stringValue = value.toLowerCase();
    for (const skill of ALL_SKILLS) {
        if (stringValue.includes(skill)) return skill;
    }
    return 'brawl';
}

export async function generateBuild(config: GeneratorConfig, state: CharacterState): Promise<TempBuild | null> {
    const speciesName = state.identity.species;
    if (!speciesName) return null;

    const pokemonData = await fetchPokemonData(speciesName);
    if (!pokemonData) return null;

    const rank = state.identity.rank;
    const { core: rankCore, social: rankSocial, skills: rankSkill, skillLimit } = getRankPoints(rank);
    const { core: ageCore, social: ageSocial } = getAgePoints(state.identity.age);

    const attributePoints = rankCore + ageCore;
    const socialPoints = rankSocial + ageSocial;
    const maxSkillRank = skillLimit;

    const attributeLimits: Record<string, number> = {
        str: state.stats[CombatStat.STR].limit,
        dex: state.stats[CombatStat.DEX].limit,
        vit: state.stats[CombatStat.VIT].limit,
        spe: state.stats[CombatStat.SPE].limit,
        ins: state.stats[CombatStat.INS].limit
    };

    const generatedAttributes: Record<string, number> = { str: 0, dex: 0, vit: 0, spe: 0, ins: 0 };
    const generatedSocials: Record<string, number> = { tou: 0, coo: 0, bea: 0, cut: 0, cle: 0 };
    const generatedSkills: Record<string, number> = {};

    const customSkillsList: string[] = [];
    const customSkillMap: Record<string, string> = {};

    state.extraCategories.forEach((category) => {
        category.skills.forEach((skill) => {
            customSkillsList.push(skill.id);
            customSkillMap[skill.id] = skill.name;
        });
    });

    ALL_SKILLS.forEach((skill) => (generatedSkills[skill] = 0));
    customSkillsList.forEach((skill) => (generatedSkills[skill] = 0));

    const type1 = state.identity.type1;
    const type2 = state.identity.type2;
    const hasType2 = type2 && type2 !== 'None';
    const myTypes = [type1, type2].filter((type) => type && type !== 'None');

    const baseInsight = state.stats[CombatStat.INS].base;
    const totalTargetMoves = config.targetAtkCount + config.targetSupCount;

    let neededInsightRank = Math.max(0, totalTargetMoves - 3 - baseInsight);
    neededInsightRank = Math.min(neededInsightRank, attributeLimits['ins'] - baseInsight, attributePoints);
    generatedAttributes['ins'] = neededInsightRank;

    const draftedMax = baseInsight + generatedAttributes['ins'] + 3;
    const adjustedAttributePoints = attributePoints - neededInsightRank;
    const currentRankIndex = Math.max(0, RANK_HIERARCHY.indexOf(rank));

    const isMoveAllowed = (moveRankRaw: string) => {
        const rankIndex = RANK_HIERARCHY.indexOf(moveRankRaw.trim());
        return rankIndex !== -1 && rankIndex <= currentRankIndex;
    };

    const legalMoveNames: string[] = [];
    const pd = pokemonData as Record<string, unknown>;

    const extractMoves = (moveObject: unknown, ignoreRank = false) => {
        if (Array.isArray(moveObject)) {
            moveObject.forEach((move: unknown) => {
                const moveRecord = move as Record<string, unknown>;
                const moveName = typeof move === 'string' ? move : String(moveRecord.Name || moveRecord.Move || '');
                const moveRank =
                    typeof move === 'object'
                        ? String(
                              moveRecord.Learned || moveRecord.Learn || moveRecord.Level || moveRecord.Rank || 'Other'
                          )
                        : 'Other';

                if (moveName && MOVES_URLS[moveName.toLowerCase()] && (ignoreRank || isMoveAllowed(moveRank))) {
                    legalMoveNames.push(moveName);
                }
            });
        } else if (typeof moveObject === 'object' && moveObject !== null) {
            Object.entries(moveObject).forEach(([moveRank, moveList]) => {
                if ((ignoreRank || isMoveAllowed(moveRank)) && Array.isArray(moveList)) {
                    moveList.forEach((move: unknown) => {
                        const moveName =
                            typeof move === 'string'
                                ? move
                                : String(
                                      (move as Record<string, unknown>).Name ||
                                          (move as Record<string, unknown>).Move ||
                                          ''
                                  );
                        if (moveName && MOVES_URLS[moveName.toLowerCase()]) legalMoveNames.push(moveName);
                    });
                }
            });
        }
    };

    extractMoves(pd.Moves, false);
    if (legalMoveNames.length < draftedMax) extractMoves(pd.Moves, true);

    const uniqueMoveNames = [...new Set(legalMoveNames)];
    const fetchedMoves: TempMove[] = [];

    for (const moveName of uniqueMoveNames) {
        const data = await fetchMoveData(moveName);
        if (data) {
            const rawCategory = String(data.Category || 'Physical').toLowerCase();
            let cat = 'Status';
            if (rawCategory.includes('phys')) cat = 'Phys';
            else if (rawCategory.includes('spec') || rawCategory.includes('var')) cat = 'Spec';

            const rawAcc1 = String(data.Accuracy1 || 'STR');
            const rawAcc2 = String(data.Accuracy2 || 'None');
            const rawDmg1 = String(data.Damage1 || 'None');

            const accString =
                rawAcc2.toLowerCase() === 'none' ? `Accuracy: ${rawAcc1}` : `Accuracy: ${rawAcc1} + ${rawAcc2}`;
            const dmgString = cat === 'Status' ? '' : `Damage: ${rawDmg1}`;

            const rawDesc = String(data.Effect || data.Description || '');
            const retainedTags = rawDesc.match(/\[.*?\]/g)?.join(' ') || '';

            let cleanDesc = rawDesc.replace(/\[.*?\]/g, '').trim();
            cleanDesc = cleanDesc.replace(/\n\nAccuracy:[\s\S]*/i, '').trim();

            const finalDesc =
                `${cleanDesc}\n\n${accString}${dmgString ? '\n' + dmgString : ''}${retainedTags ? '\n\n' + retainedTags : ''}`.trim();

            fetchedMoves.push({
                id: crypto.randomUUID(),
                name: moveName,
                type: String(data.Type || 'Normal'),
                cat: cat,
                power: Number(data.Power) || 0,
                desc: finalDesc,
                dmgStat: normalizeStatistic(
                    ATTRIBUTE_MAPPING[String(data.Damage1 || '')] || String(data.Damage1 || '')
                ),
                attr:
                    normalizeStatistic(
                        ATTRIBUTE_MAPPING[String(data.Accuracy1 || '')] || String(data.Accuracy1 || '')
                    ) || 'str',
                skill: normalizeSkill(String(data.Accuracy2 || ''))
            });
        }
    }

    const draftedMoves: TempMove[] = [];
    let leftoverPool: TempMove[] = [];

    const typeCounts = new Map<string, number>();

    let primaryDrafted = 0;
    let secondaryDrafted = 0;
    let coverageDrafted = 0;

    const getTotalCoverage = () =>
        Array.from(typeCounts.entries())
            .filter(([t]) => t !== type1 && t !== type2)
            .reduce((sum, [, count]) => sum + count, 0);

    if (config.buildType === 'wild') {
        leftoverPool = [...fetchedMoves].sort(() => 0.5 - Math.random());
    } else {
        let supportPool = fetchedMoves.filter((move) => move.cat === 'Status');
        let attackPool = fetchedMoves.filter((move) => move.cat === 'Phys' || move.cat === 'Spec');

        if (config.combatBias === 'physical') attackPool = attackPool.filter((move) => move.cat === 'Phys');
        if (config.combatBias === 'special') attackPool = attackPool.filter((move) => move.cat === 'Spec');

        const getDefensiveScore = (move: TempMove) => {
            let score = 0;
            const text = (move.name + ' ' + move.desc).toLowerCase();
            const keywords = [
                'protect',
                'shield',
                'guard',
                'block',
                'barrier',
                'defense',
                'sp. def',
                'heal',
                'recover',
                'roost',
                'synthesis',
                'light screen',
                'reflect'
            ];
            for (const keyword of keywords) {
                if (text.includes(keyword)) score += 1;
            }
            return score;
        };

        supportPool.sort((a, b) => {
            let aScore = config.combatBias === 'tank' ? getDefensiveScore(a) * 10 : Math.random() * 5;
            let bScore = config.combatBias === 'tank' ? getDefensiveScore(b) * 10 : Math.random() * 5;

            // Add a little bit of fuzz to tank scoring so it isn't completely rigid on rerolls
            if (config.combatBias === 'tank') {
                aScore += Math.random() * 4;
                bScore += Math.random() * 4;
            }

            const needsType = (move: TempMove) => {
                const isPrimary = move.type === type1;
                const isSecondary = hasType2 && move.type === type2;
                const currentCount = typeCounts.get(move.type) || 0;

                if (isPrimary && config.overridePrimaryStab && currentCount < config.primaryStabCount) return 100;
                if (isSecondary && config.overrideSecondaryStab && currentCount < config.secondaryStabCount) return 100;
                if (!isPrimary && !isSecondary && config.overrideCoverage && getTotalCoverage() < config.coverageCount)
                    return 100;
                return 0;
            };

            return bScore + needsType(b) - (aScore + needsType(a));
        });

        for (let i = 0; i < config.targetSupCount && supportPool.length > 0; i++) {
            const move = supportPool.shift();
            if (move) draftedMoves.push(move);
        }

        attackPool.sort((a, b) => {
            let aBias = 0;
            let bBias = 0;
            if (config.combatBias === 'physical') {
                aBias = a.cat === 'Phys' ? 1 : 0;
                bBias = b.cat === 'Phys' ? 1 : 0;
            } else if (config.combatBias === 'special') {
                aBias = a.cat === 'Spec' ? 1 : 0;
                bBias = b.cat === 'Spec' ? 1 : 0;
            }

            if (aBias !== bBias) return bBias - aBias;

            const aStab = myTypes.includes(a.type) ? 1 : 0;
            const bStab = myTypes.includes(b.type) ? 1 : 0;

            if (aStab !== bStab) return bStab - aStab;

            // Fuzz power ties slightly so STABs aren't 100% rigid on every reroll
            const aFuzz = a.power + Math.random() * 2;
            const bFuzz = b.power + Math.random() * 2;
            return bFuzz - aFuzz;
        });

        let remainingAttackSlots = config.targetAtkCount + (config.targetSupCount - draftedMoves.length);
        const maxStabAllowedTotal = Math.max(1, config.targetAtkCount - 1);

        for (const move of attackPool) {
            if (remainingAttackSlots <= 0) break;

            const currentCount = typeCounts.get(move.type) || 0;

            const isPrimary = type1 && move.type === type1;
            const isSecondary = hasType2 && move.type === type2;
            const isStab = isPrimary || isSecondary;

            let totalStabDrafted = Array.from(typeCounts.entries())
                .filter(([t]) => t === type1 || t === type2)
                .reduce((sum, [, count]) => sum + count, 0);

            let canDraft = false;

            if (isPrimary) {
                if (config.overridePrimaryStab) {
                    if (currentCount < config.primaryStabCount) canDraft = true;
                } else {
                    if (currentCount < 2 && totalStabDrafted < maxStabAllowedTotal) canDraft = true;
                }
            } else if (isSecondary) {
                if (config.overrideSecondaryStab) {
                    if (currentCount < config.secondaryStabCount) canDraft = true;
                } else {
                    if (currentCount < 2 && totalStabDrafted < maxStabAllowedTotal) canDraft = true;
                }
            } else {
                if (config.overrideCoverage) {
                    if (getTotalCoverage() < config.coverageCount && currentCount < 1) canDraft = true;
                } else {
                    if (currentCount < 1) canDraft = true;
                }
            }

            if (canDraft) {
                draftedMoves.push(move);
                typeCounts.set(move.type, currentCount + 1);

                if (isPrimary) primaryDrafted++;
                else if (isSecondary) secondaryDrafted++;
                else coverageDrafted++;

                if (
                    isStab &&
                    !(isPrimary && config.overridePrimaryStab) &&
                    !(isSecondary && config.overrideSecondaryStab)
                ) {
                    totalStabDrafted++;
                }

                remainingAttackSlots--;
            }
        }

        leftoverPool = fetchedMoves.filter((move) => !draftedMoves.includes(move));
    }

    if (config.buildType === 'wild') {
        assignWildStats(
            generatedAttributes,
            generatedSocials,
            generatedSkills,
            adjustedAttributePoints,
            socialPoints,
            rankSkill,
            attributeLimits,
            state,
            maxSkillRank,
            config,
            customSkillsList
        );
    } else if (config.buildType === 'minmax') {
        assignMinMaxStats(
            generatedAttributes,
            generatedSocials,
            generatedSkills,
            adjustedAttributePoints,
            socialPoints,
            rankSkill,
            attributeLimits,
            state,
            maxSkillRank,
            config,
            customSkillsList,
            draftedMoves
        );
    } else if (config.buildType === 'average') {
        assignAverageStats(
            generatedAttributes,
            generatedSocials,
            generatedSkills,
            adjustedAttributePoints,
            socialPoints,
            rankSkill,
            attributeLimits,
            state,
            maxSkillRank,
            config,
            customSkillsList,
            draftedMoves
        );
    }

    const finalDraftedMax = baseInsight + generatedAttributes['ins'] + 3;

    if (config.buildType !== 'wild') {
        const getStatValue = (statName: string) => {
            if (!statName) return 0;
            if (Object.values(CombatStat).includes(statName as CombatStat)) {
                return state.stats[statName as CombatStat].base + (generatedAttributes[statName] || 0);
            }
            if (Object.values(SocialStat).includes(statName as SocialStat)) {
                return state.socials[statName as SocialStat].base + (generatedSocials[statName] || 0);
            }
            if (statName === 'will') return state.will.willMax + (generatedAttributes['ins'] || 0);
            return 0;
        };

        const getSkillValue = (skillName: string) => {
            if (!skillName || skillName === 'none') return 0;
            let val = generatedSkills[skillName] || 0;
            if (Object.values(Skill).includes(skillName as Skill)) {
                val += state.skills[skillName as Skill].base;
            } else {
                for (const cat of state.extraCategories) {
                    const found = cat.skills.find((s) => s.id === skillName);
                    if (found) val += found.base;
                }
            }
            return val;
        };

        while (draftedMoves.length < finalDraftedMax && leftoverPool.length > 0) {
            leftoverPool.sort((a, b) => {
                const aScore =
                    getStatValue(a.attr) +
                    getSkillValue(a.skill) +
                    (a.cat === 'Status' ? 0 : getStatValue(a.dmgStat) + a.power);
                const bScore =
                    getStatValue(b.attr) +
                    getSkillValue(b.skill) +
                    (b.cat === 'Status' ? 0 : getStatValue(b.dmgStat) + b.power);

                const getDynamicBonus = (move: TempMove) => {
                    if (move.cat === 'Status') return 0;

                    const isPrimary = move.type === type1;
                    const isSecondary = hasType2 && move.type === type2;
                    const isStab = isPrimary || isSecondary;
                    const count = typeCounts.get(move.type) || 0;

                    let bonus = 0;
                    if (isPrimary && config.overridePrimaryStab && primaryDrafted < config.primaryStabCount)
                        bonus += 100;
                    else if (
                        isSecondary &&
                        config.overrideSecondaryStab &&
                        secondaryDrafted < config.secondaryStabCount
                    )
                        bonus += 100;
                    else if (!isStab && config.overrideCoverage && coverageDrafted < config.coverageCount && count < 1)
                        bonus += 100;
                    else {
                        if (isStab) bonus += 2;
                        bonus -= count * 5;
                    }
                    return bonus;
                };

                const getVariance = (move: TempMove) => {
                    if (move.cat === 'Status') return Math.random() * 5;
                    const isStab = myTypes.includes(move.type);
                    // 2 points of fuzz for STAB, 8 points for coverage
                    return isStab ? Math.random() * 2 : Math.random() * 8;
                };

                return bScore + getDynamicBonus(b) + getVariance(b) - (aScore + getDynamicBonus(a) + getVariance(a));
            });

            const move = leftoverPool.shift();
            if (move) {
                draftedMoves.push(move);
                if (move.cat !== 'Status') {
                    typeCounts.set(move.type, (typeCounts.get(move.type) || 0) + 1);
                    const isPrimary = type1 && move.type === type1;
                    const isSecondary = hasType2 && move.type === type2;
                    if (isPrimary) primaryDrafted++;
                    else if (isSecondary) secondaryDrafted++;
                    else coverageDrafted++;
                }
            }
        }
    } else {
        while (draftedMoves.length < finalDraftedMax && leftoverPool.length > 0) {
            const move = leftoverPool.shift();
            if (move) draftedMoves.push(move);
        }
    }

    draftedMoves.sort((a, b) => {
        const getTypePriority = (type: string) => {
            if (type === type1) return 1;
            if (hasType2 && type === type2) return 2;
            return 3;
        };

        const priorityA = getTypePriority(a.type);
        const priorityB = getTypePriority(b.type);

        if (priorityA !== priorityB) return priorityA - priorityB;

        if (a.type !== b.type) return a.type.localeCompare(b.type);

        if (a.cat === 'Status' && b.cat !== 'Status') return 1;
        if (a.cat !== 'Status' && b.cat === 'Status') return -1;

        return b.power - a.power;
    });

    return {
        species: speciesName,
        attr: generatedAttributes,
        soc: generatedSocials,
        skills: generatedSkills,
        customSkillsList: customSkillsList,
        customSkillMap: customSkillMap,
        moves: draftedMoves,
        maxMoves: finalDraftedMax,
        includePmd: config.includePmd
    };
}
