import type { TempBuild, TempMove, CharacterState, GeneratorConfig } from '../store/storeTypes';
import { fetchPokemonData, fetchMoveData, MOVES_URLS, SPECIES_URLS, loadLocalDataset } from './api';
import { getRankPoints, getAgePoints } from '../store/useCharacterStore';
import { CombatStat, SocialStat, Skill } from '../types/enums';
import { assignWildStats, assignMinMaxStats, assignAverageStats } from './generatorLogic';
import { draftInitialMoves, draftSpilloverMoves, sortDraftedMoves } from './moveDraftingLogic';
import { getLimit, getBase } from './macroHelpers';

const RANK_HIERARCHY = ['Starter', 'Rookie', 'Standard', 'Advanced', 'Expert', 'Ace', 'Master', 'Champion'];
const ALL_SKILLS = Object.values(Skill) as string[];
const COMBAT_STATS = Object.values(CombatStat) as string[];
const SOCIAL_STATS = Object.values(SocialStat) as string[];

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
    const stringValue = value.toLowerCase().trim();
    if (!stringValue || stringValue === 'none') return 'none';
    for (const skill of ALL_SKILLS) {
        if (stringValue.includes(skill)) return skill;
    }
    return 'none';
}

export async function generateBuild(config: GeneratorConfig, state: CharacterState): Promise<TempBuild | null> {
    await loadLocalDataset();

    let speciesName = state.identity.species;

    if (config.randomizeSpecies) {
        const customNames = state.roomCustomPokemon.filter((p) => state.role === 'GM' || !p.gmOnly).map((p) => p.Name);
        const baseNames = Object.keys(SPECIES_URLS);
        const allSpecies = [...new Set([...baseNames, ...customNames])];
        if (allSpecies.length > 0) {
            speciesName = allSpecies[Math.floor(Math.random() * allSpecies.length)];
        }
    }

    if (!speciesName) return null;

    const pokemonData = await fetchPokemonData(speciesName);
    if (!pokemonData) return null;

    const pdRecord = pokemonData as Record<string, unknown>;
    const finalSpeciesName = String(pdRecord.Name || speciesName);

    const type1 = config.randomizeSpecies ? String(pdRecord.Type1 || '') : state.identity.type1;
    const type2 = config.randomizeSpecies ? String(pdRecord.Type2 || '') : state.identity.type2;
    const hasType2 = Boolean(type2 && type2 !== 'None');

    const rank = state.identity.rank;
    const { core: rankCore, social: rankSocial, skills: rankSkill, skillLimit } = getRankPoints(rank);
    const { core: ageCore, social: ageSocial } = getAgePoints(state.identity.age);

    const attributePoints = rankCore + ageCore;
    const socialPoints = rankSocial + ageSocial;
    const maxSkillRank = skillLimit;

    // Bulletproof parsing to ensure NaN NEVER breaks the mathematical loops
    let baseStr = Number(state.stats[CombatStat.STR].base) || 2;
    let baseDex = Number(state.stats[CombatStat.DEX].base) || 2;
    let baseVit = Number(state.stats[CombatStat.VIT].base) || 2;
    let baseSpe = Number(state.stats[CombatStat.SPE].base) || 2;
    let baseIns = Number(state.stats[CombatStat.INS].base) || 1;

    let limitStr = Number(state.stats[CombatStat.STR].limit) || 5;
    let limitDex = Number(state.stats[CombatStat.DEX].limit) || 5;
    let limitVit = Number(state.stats[CombatStat.VIT].limit) || 5;
    let limitSpe = Number(state.stats[CombatStat.SPE].limit) || 5;
    let limitIns = Number(state.stats[CombatStat.INS].limit) || 5;

    if (config.randomizeSpecies) {
        baseStr = Number(getBase(pdRecord, 'Strength', 2)) || 2;
        baseDex = Number(getBase(pdRecord, 'Dexterity', 2)) || 2;
        baseVit = Number(getBase(pdRecord, 'Vitality', 2)) || 2;
        baseSpe = Number(getBase(pdRecord, 'Special', 2)) || 2;
        baseIns = Number(getBase(pdRecord, 'Insight', 1)) || 1;

        limitStr = Number(getLimit(pdRecord, 'Strength')) || 5;
        limitDex = Number(getLimit(pdRecord, 'Dexterity')) || 5;
        limitVit = Number(getLimit(pdRecord, 'Vitality')) || 5;
        limitSpe = Number(getLimit(pdRecord, 'Special')) || 5;
        limitIns = Number(getLimit(pdRecord, 'Insight')) || 5;
    }

    const attributeLimits: Record<string, number> = {
        str: limitStr,
        dex: limitDex,
        vit: limitVit,
        spe: limitSpe,
        ins: limitIns
    };

    let effectiveBias = config.combatBias;

    if (config.randomizeSpecies && config.autoSelectBias) {
        const strScore = limitStr + baseStr;
        const speScore = limitSpe + baseSpe;

        if (strScore > speScore) effectiveBias = 'physical';
        else if (speScore > strScore) effectiveBias = 'special';
        else effectiveBias = 'balanced';
    }

    const fakeState = {
        ...state,
        stats: {
            ...state.stats,
            [CombatStat.STR]: { ...state.stats[CombatStat.STR], base: baseStr, limit: limitStr },
            [CombatStat.DEX]: { ...state.stats[CombatStat.DEX], base: baseDex, limit: limitDex },
            [CombatStat.VIT]: { ...state.stats[CombatStat.VIT], base: baseVit, limit: limitVit },
            [CombatStat.SPE]: { ...state.stats[CombatStat.SPE], base: baseSpe, limit: limitSpe },
            [CombatStat.INS]: { ...state.stats[CombatStat.INS], base: baseIns, limit: limitIns }
        }
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

    const totalTargetMoves = config.targetAtkCount + config.targetSupCount;

    let neededInsightRank = Math.max(0, totalTargetMoves - 3 - baseIns);
    neededInsightRank = Math.min(neededInsightRank, limitIns - baseIns, attributePoints);
    generatedAttributes['ins'] = neededInsightRank;

    const draftedMax = baseIns + generatedAttributes['ins'] + 3;
    const adjustedAttributePoints = attributePoints - neededInsightRank;
    const currentRankIndex = Math.max(0, RANK_HIERARCHY.indexOf(rank));

    const legalMoveNames: string[] = [];
    const overrankMoveNames: string[] = [];

    // Automatically climb back up the Evolution chain fetching data for backward compatibility!
    const preEvos: { data: Record<string, unknown>; isTrueEvo: boolean }[] = [];
    if (config.includePreEvolutions) {
        let currentSpeciesData = pdRecord;
        let guardCounter = 0; // Prevent infinite loops just in case
        while (currentSpeciesData.Evolutions && guardCounter < 5) {
            guardCounter++;
            const fromEvo = (currentSpeciesData.Evolutions as Record<string, unknown>[]).find((e) => e.From);
            if (!fromEvo) break;

            const fromName = String(fromEvo.From);
            const isFormChange = ['Mega', 'Gigantamax', 'Primal'].includes(String(fromEvo.Kind));

            const fromData = await fetchPokemonData(fromName);
            if (!fromData) break;

            preEvos.push({ data: fromData as Record<string, unknown>, isTrueEvo: !isFormChange });
            currentSpeciesData = fromData as Record<string, unknown>;
        }
    }

    const extractMoves = (moveObject: unknown, maxRankIndex: number, targetArray: string[], minRankIndex = -1) => {
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

                const rIdx = RANK_HIERARCHY.indexOf(moveRank.trim());
                if (moveName && moveName.toLowerCase().trim() !== 'splash' && MOVES_URLS[moveName.toLowerCase()]) {
                    // Allow if it falls within the permitted rank bounds OR if we are ignoring ranks entirely (maxRankIndex = 99)
                    if (maxRankIndex === 99 || (rIdx !== -1 && rIdx <= maxRankIndex && rIdx > minRankIndex)) {
                        targetArray.push(moveName);
                    }
                }
            });
        } else if (typeof moveObject === 'object' && moveObject !== null) {
            Object.entries(moveObject).forEach(([moveRank, moveList]) => {
                const rIdx = RANK_HIERARCHY.indexOf(moveRank.trim());
                if (maxRankIndex === 99 || (rIdx !== -1 && rIdx <= maxRankIndex && rIdx > minRankIndex)) {
                    if (Array.isArray(moveList)) {
                        moveList.forEach((move: unknown) => {
                            const moveName =
                                typeof move === 'string'
                                    ? move
                                    : String(
                                          (move as Record<string, unknown>).Name ||
                                              (move as Record<string, unknown>).Move ||
                                              ''
                                      );
                            if (
                                moveName &&
                                moveName.toLowerCase().trim() !== 'splash' &&
                                MOVES_URLS[moveName.toLowerCase()]
                            ) {
                                targetArray.push(moveName);
                            }
                        });
                    }
                }
            });
        }
    };

    extractMoves(pdRecord.Moves, currentRankIndex, legalMoveNames);

    if (config.includePreEvolutions) {
        const trueEvoCount = preEvos.filter((p) => p.isTrueEvo).length;
        let currentTrueDepth = 0;

        preEvos.forEach((pe) => {
            let offset = 0;
            if (pe.isTrueEvo) {
                currentTrueDepth++;
                if (trueEvoCount === 1) {
                    offset = config.evo2Stage1Offset;
                } else if (trueEvoCount >= 2) {
                    if (currentTrueDepth === 1) offset = config.evo3Stage2Offset;
                    else offset = config.evo3Stage1Offset;
                }
            }
            const peMaxRank = Math.max(0, currentRankIndex - offset);
            extractMoves(pe.data.Moves, peMaxRank, legalMoveNames);
        });
    }

    if (legalMoveNames.length < draftedMax) {
        extractMoves(pdRecord.Moves, 99, legalMoveNames); // 99 indicates ignoreRank
    }

    if (config.allowOverrank) {
        const overrankMax = Math.min(currentRankIndex + config.overrankAmount, RANK_HIERARCHY.length - 1);
        if (overrankMax > currentRankIndex) {
            // Strictly fetch moves that belong ONLY to the higher ranks (using minRankIndex)
            extractMoves(pdRecord.Moves, overrankMax, overrankMoveNames, currentRankIndex);

            if (config.allowPreEvoOverrank && config.includePreEvolutions) {
                preEvos.forEach((pe) => {
                    extractMoves(pe.data.Moves, overrankMax, overrankMoveNames, currentRankIndex);
                });
            }
        }
    }

    const parseMoveData = (
        moveName: string,
        data: NonNullable<Awaited<ReturnType<typeof fetchMoveData>>>
    ): TempMove => {
        const rawCategory = String(data.Category || 'Physical').toLowerCase();
        let cat = 'Status';
        if (rawCategory.includes('phys')) cat = 'Phys';
        else if (rawCategory.includes('spec') || rawCategory.includes('var')) cat = 'Spec';

        const rawAcc1 = String(data.Accuracy1 || '');
        const rawAcc2 = String(data.Accuracy2 || '');
        const rawDmg1 = String(data.Damage1 || '');

        const accString = `Accuracy: ${rawAcc1} + ${rawAcc2}`;
        const dmgString = cat === 'Status' ? '' : `Damage: ${rawDmg1}`;

        const rawDesc = String(data.Effect || data.Description || '');
        const retainedTags = rawDesc.match(/\[.*?\]/g)?.join(' ') || '';

        let cleanDesc = rawDesc.replace(/\[.*?\]/g, '').trim();
        cleanDesc = cleanDesc.replace(/\n\nAccuracy:[\s\S]*/i, '').trim();

        const finalDesc =
            `${cleanDesc}\n\n${accString}${dmgString ? '\n' + dmgString : ''}${retainedTags ? '\n\n' + retainedTags : ''}`.trim();

        return {
            id: crypto.randomUUID(),
            name: moveName,
            type: String(data.Type || 'Normal'),
            cat: cat,
            power: Number(data.Power) || 0,
            desc: finalDesc,
            dmgStat: normalizeStatistic(ATTRIBUTE_MAPPING[String(data.Damage1 || '')] || String(data.Damage1 || '')),
            attr: normalizeStatistic(ATTRIBUTE_MAPPING[String(data.Accuracy1 || '')] || String(data.Accuracy1 || '')),
            skill: normalizeSkill(String(data.Accuracy2 || '')),
            rawAcc1: rawAcc1,
            rawAcc2: rawAcc2,
            rawDmg1: rawDmg1,
            marker: ''
        };
    };

    const uniqueMoveNames = [...new Set(legalMoveNames)];
    const fetchedMoves: TempMove[] = [];

    for (const moveName of uniqueMoveNames) {
        const data = await fetchMoveData(moveName);
        if (data) fetchedMoves.push(parseMoveData(moveName, data));
    }

    const fetchedOverrankMoves: TempMove[] = [];
    if (config.allowOverrank && overrankMoveNames.length > 0) {
        const uniqueOverrankNames = [...new Set(overrankMoveNames)].filter((name) => !uniqueMoveNames.includes(name));
        for (const moveName of uniqueOverrankNames) {
            const data = await fetchMoveData(moveName);
            if (data) fetchedOverrankMoves.push(parseMoveData(moveName, data));
        }
    }

    // ✨ Move Drafting Phase 1 (Core Move Pool) ✨
    const initialDraftResult = draftInitialMoves(
        config,
        fetchedMoves,
        fetchedOverrankMoves,
        type1,
        type2,
        hasType2,
        effectiveBias,
        draftedMax
    );

    const draftedMoves = initialDraftResult.draftedMoves;
    const leftoverPool = initialDraftResult.leftoverPool;
    const draftingContext = initialDraftResult.context;

    // STAT ALLOCATION HAPPENS HERE
    if (config.buildType === 'wild') {
        assignWildStats(
            generatedAttributes,
            generatedSocials,
            generatedSkills,
            adjustedAttributePoints,
            socialPoints,
            rankSkill,
            attributeLimits,
            fakeState,
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
            fakeState,
            maxSkillRank,
            { ...config, combatBias: effectiveBias },
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
            fakeState,
            maxSkillRank,
            { ...config, combatBias: effectiveBias },
            customSkillsList,
            draftedMoves
        );
    }

    const finalBaseStats = {
        str: baseStr,
        dex: baseDex,
        vit: baseVit,
        spe: baseSpe,
        ins: baseIns
    };

    // ✨ POST-GENERATION RESOLUTION FOR DUAL-SCALING MOVES ✨
    const getBestAttribute = (
        rawAttr: string,
        genAttr: Record<string, number>,
        genSoc: Record<string, number>,
        bStats: Record<string, number>
    ) => {
        if (!rawAttr || rawAttr.toLowerCase() === 'none') return '';
        const options = rawAttr
            .split('/')
            .map((s) => normalizeStatistic(ATTRIBUTE_MAPPING[s.trim()] || s.trim()))
            .filter(Boolean);
        if (options.length === 0) return 'str';
        if (options.length === 1) return options[0];

        let best = options[0];
        let maxVal = -1;
        for (const opt of options) {
            let val = 0;
            if (COMBAT_STATS.includes(opt)) {
                val = (genAttr[opt] || 0) + (bStats[opt] || 0);
            } else if (SOCIAL_STATS.includes(opt)) {
                val = (genSoc[opt] || 0) + (state.socials[opt as SocialStat]?.base || 0);
            } else if (opt === 'will') {
                val = state.will.willMax;
            }
            if (val > maxVal) {
                maxVal = val;
                best = opt;
            }
        }
        return best;
    };

    const getBestSkill = (rawSkill: string, genSkills: Record<string, number>) => {
        if (!rawSkill || rawSkill.toLowerCase().includes('none')) return 'none';
        const options = rawSkill
            .split('/')
            .map((s) => normalizeSkill(s))
            .filter((s) => s !== 'none');
        if (options.length === 0) return 'none';
        if (options.length === 1) return options[0];

        let best = options[0];
        let maxVal = -1;
        for (const opt of options) {
            let base = 0;
            if (state.skills[opt as Skill]) base = state.skills[opt as Skill].base;
            else {
                for (const cat of state.extraCategories) {
                    const sk = cat.skills.find((s) => s.id === opt);
                    if (sk) {
                        base = sk.base;
                        break;
                    }
                }
            }
            const val = (genSkills[opt] || 0) + base;
            if (val > maxVal) {
                maxVal = val;
                best = opt;
            }
        }
        return best;
    };

    const finalDraftedMax = baseIns + generatedAttributes['ins'] + 3;

    // ✨ Move Drafting Phase 2 (Spillover Expansion) ✨
    draftSpilloverMoves(draftedMoves, leftoverPool, finalDraftedMax, draftingContext);

    draftedMoves.forEach((move) => {
        move.attr = getBestAttribute(move.rawAcc1 || move.attr, generatedAttributes, generatedSocials, finalBaseStats);
        move.skill = getBestSkill(move.rawAcc2 || move.skill, generatedSkills);
        move.dmgStat = getBestAttribute(
            move.rawDmg1 || move.dmgStat,
            generatedAttributes,
            generatedSocials,
            finalBaseStats
        );
    });

    sortDraftedMoves(draftedMoves, type1, hasType2, type2);

    return {
        species: finalSpeciesName,
        attr: generatedAttributes,
        soc: generatedSocials,
        skills: generatedSkills,
        customSkillsList: customSkillsList,
        customSkillMap: customSkillMap,
        moves: draftedMoves,
        maxMoves: finalDraftedMax,
        includePmd: config.includePmd,
        pokemonData: pdRecord,
        baseStats: finalBaseStats
    };
}
