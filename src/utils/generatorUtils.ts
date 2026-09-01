import type { TempBuild, TempMove, CharacterState, GeneratorConfig, Rank } from '../store/storeTypes';
import { fetchPokemonData, fetchMoveData, MOVES_URLS, SPECIES_URLS, loadLocalDataset } from './api';
import { getRankPoints, getAgePoints } from '../store/useCharacterStore';
import { CombatStat, SocialStat, Skill } from '../types/enums';
import { assignWildStats, assignMinMaxStats, assignAverageStats } from './generatorLogic';
import { draftInitialMoves, draftSpilloverMoves, sortDraftedMoves } from './moveDraftingLogic';
import { getLimit, getBase, extractAbilities } from './macroHelpers';
import { calculateMaxHp, calculateMaxWill } from './combatMath';

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

function normalizeSingleStatistic(token: string): string {
    const s = token.toLowerCase().trim();
    if (!s || s === 'none') return '';
    if (s.includes('str')) return 'str';
    if (s.includes('dex')) return 'dex';
    if (s.includes('vit')) return 'vit';
    if (s.includes('spe')) return 'spe';
    if (s.includes('ins')) return 'ins';
    if (s.includes('tou')) return 'tou';
    if (s.includes('coo')) return 'coo';
    if (s.includes('bea')) return 'bea';
    if (s.includes('cut')) return 'cut';
    if (s.includes('cle')) return 'cle';
    if (s.includes('will')) return 'will';
    return '';
}

export function parseStatOptions(value: string): string[] {
    if (!value) return [];
    const parts = value
        .split(/[/,]/)
        .map((p) => p.trim())
        .filter(Boolean);
    const results: string[] = [];
    for (const part of parts) {
        const mapped = ATTRIBUTE_MAPPING[part] || part;
        const normalized = normalizeSingleStatistic(mapped);
        if (normalized && !results.includes(normalized)) {
            results.push(normalized);
        }
    }
    return results;
}

function normalizeSingleSkill(token: string): string {
    const s = token.toLowerCase().trim();
    if (!s || s === 'none') return 'none';
    for (const skill of ALL_SKILLS) {
        if (s.includes(skill)) return skill;
    }
    return 'none';
}

export function parseSkillOptions(value: string): string[] {
    if (!value) return [];
    const parts = value
        .split(/[/,]/)
        .map((p) => p.trim())
        .filter(Boolean);
    const results: string[] = [];
    for (const part of parts) {
        const normalized = normalizeSingleSkill(part);
        if (normalized && normalized !== 'none' && !results.includes(normalized)) {
            results.push(normalized);
        }
    }
    return results;
}

export async function generateBuild(config: GeneratorConfig, state: CharacterState): Promise<TempBuild | null> {
    await loadLocalDataset();

    let speciesName = config.targetSpecies || state.identity.species;

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

    const type1 =
        config.randomizeSpecies || !state.identity.type1 ? String(pdRecord.Type1 || '') : state.identity.type1;
    const type2 =
        config.randomizeSpecies || !state.identity.type2 ? String(pdRecord.Type2 || '') : state.identity.type2;
    const hasType2 = Boolean(type2 && type2 !== 'None');

    const rank = config.targetRank || state.identity.rank || 'Starter';
    const { core: rankCore, social: rankSocial, skills: rankSkill, skillLimit } = getRankPoints(rank);

    // Pokémon do not receive Age attribute or social bonus points (Age is strictly a Trainer mechanic in Pokerole)
    const isTrainer = state.identity.mode === 'Trainer';
    const { core: ageCore, social: ageSocial } =
        isTrainer && state.identity.age ? getAgePoints(state.identity.age) : { core: 0, social: 0 };

    const attributePoints = rankCore + ageCore;
    const socialPoints = rankSocial + ageSocial;
    const maxSkillRank = skillLimit;

    // Bulletproof parsing: derive base stats & limits directly from pdRecord with fallback to state
    const baseStr = Number(getBase(pdRecord, 'Strength', 2)) || Number(state.stats[CombatStat.STR]?.base) || 2;
    const baseDex = Number(getBase(pdRecord, 'Dexterity', 2)) || Number(state.stats[CombatStat.DEX]?.base) || 2;
    const baseVit = Number(getBase(pdRecord, 'Vitality', 2)) || Number(state.stats[CombatStat.VIT]?.base) || 2;
    const baseSpe = Number(getBase(pdRecord, 'Special', 2)) || Number(state.stats[CombatStat.SPE]?.base) || 2;
    const baseIns = Number(getBase(pdRecord, 'Insight', 1)) || Number(state.stats[CombatStat.INS]?.base) || 1;

    const limitStr = Number(getLimit(pdRecord, 'Strength')) || Number(state.stats[CombatStat.STR]?.limit) || 5;
    const limitDex = Number(getLimit(pdRecord, 'Dexterity')) || Number(state.stats[CombatStat.DEX]?.limit) || 5;
    const limitVit = Number(getLimit(pdRecord, 'Vitality')) || Number(state.stats[CombatStat.VIT]?.limit) || 5;
    const limitSpe = Number(getLimit(pdRecord, 'Special')) || Number(state.stats[CombatStat.SPE]?.limit) || 5;
    const limitIns = Number(getLimit(pdRecord, 'Insight')) || Number(state.stats[CombatStat.INS]?.limit) || 5;

    const attributeLimits: Record<string, number> = {
        str: limitStr,
        dex: limitDex,
        vit: limitVit,
        spe: limitSpe,
        ins: limitIns
    };

    let effectiveBias = config.combatBias;

    if (config.autoSelectBias) {
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

    const extractMoves = (
        moveObject: unknown,
        maxRankIndex: number,
        targetArray: string[],
        minRankIndex = -1,
        includeOther = false
    ) => {
        const processMove = (moveName: string, moveRank: string) => {
            const normalizedRank = moveRank.trim().charAt(0).toUpperCase() + moveRank.trim().slice(1).toLowerCase();
            const rIdx = RANK_HIERARCHY.indexOf(normalizedRank);

            const cleanName = moveName.toLowerCase().trim();
            const isCustomMove = state.roomCustomMoves.some((m) => m.name.toLowerCase() === cleanName);
            const moveExists = MOVES_URLS[cleanName] || isCustomMove;

            if (moveName && cleanName !== 'splash' && moveExists) {
                const isWithinRank = rIdx !== -1 && rIdx <= maxRankIndex && rIdx > minRankIndex;
                const isOther = rIdx === -1;

                if (maxRankIndex === 99 || isWithinRank || (includeOther && isOther)) {
                    targetArray.push(moveName);
                }
            }
        };

        if (Array.isArray(moveObject)) {
            moveObject.forEach((move) => {
                const moveRecord = typeof move === 'object' && move !== null ? (move as Record<string, unknown>) : {};
                const moveName = typeof move === 'string' ? move : String(moveRecord.Name || moveRecord.Move || '');
                const moveRank =
                    typeof move === 'object'
                        ? String(
                              moveRecord.Learned || moveRecord.Learn || moveRecord.Level || moveRecord.Rank || 'Other'
                          )
                        : 'Other';
                processMove(moveName, moveRank);
            });
        } else if (typeof moveObject === 'object' && moveObject !== null) {
            Object.entries(moveObject).forEach(([moveRank, moveList]) => {
                if (Array.isArray(moveList)) {
                    moveList.forEach((move) => {
                        const moveName =
                            typeof move === 'string'
                                ? move
                                : String(
                                      (move as Record<string, unknown>).Name ||
                                          (move as Record<string, unknown>).Move ||
                                          ''
                                  );
                        processMove(moveName, moveRank);
                    });
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
        // Only pull "Other" (TM/Egg) moves to fill gaps, NOT higher rank moves!
        extractMoves(pdRecord.Moves, currentRankIndex, legalMoveNames, -1, true);
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

        const candidateDmgStats = parseStatOptions(rawDmg1);
        const candidateAttrs = parseStatOptions(rawAcc1);
        const candidateSkills = parseSkillOptions(rawAcc2);

        return {
            id: crypto.randomUUID(),
            name: moveName,
            type: String(data.Type || 'Normal'),
            cat: cat,
            power: Number(data.Power) || 0,
            desc: finalDesc,
            dmgStat: candidateDmgStats[0] || '',
            attr: candidateAttrs[0] || '',
            skill: candidateSkills[0] || 'none',
            candidateAttrs,
            candidateDmgStats,
            candidateSkills,
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
        const options = parseStatOptions(rawAttr);
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
        const options = parseSkillOptions(rawSkill);
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
        rank: rank as Rank,
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

export function buildTokenMetadataFromBuild(
    build: TempBuild,
    nickname: string,
    imageUrl: string
): Record<string, unknown> {
    const pd = (build.pokemonData || {}) as Record<string, unknown>;
    const rank = build.rank || 'Starter';

    const baseVit = Number(getBase(pd, 'Vitality', 2)) || 2;
    const baseIns = Number(getBase(pd, 'Insight', 1)) || 1;

    const hpBase = Number(pd.BaseHP) || 4;
    const willBase = Number(pd.BaseWill) || 3;

    const fakeState = {
        identity: { rank: rank, ruleset: 'vg-vit-hp', ability: '' },
        health: { hpBase: hpBase },
        will: { willBase: willBase },
        stats: {
            [CombatStat.STR]: { base: 2, rank: build.attr['str'] || 0, buff: 0, debuff: 0, limit: 5 },
            [CombatStat.DEX]: { base: 2, rank: build.attr['dex'] || 0, buff: 0, debuff: 0, limit: 5 },
            [CombatStat.VIT]: { base: baseVit, rank: build.attr['vit'] || 0, buff: 0, debuff: 0, limit: 5 },
            [CombatStat.SPE]: { base: 2, rank: build.attr['spe'] || 0, buff: 0, debuff: 0, limit: 5 },
            [CombatStat.INS]: { base: baseIns, rank: build.attr['ins'] || 0, buff: 0, debuff: 0, limit: 5 }
        },
        socials: {},
        inventory: [],
        extraCategories: [],
        roomCustomAbilities: []
    } as unknown as CharacterState;

    const hpMax = calculateMaxHp(fakeState);
    const willMax = calculateMaxWill(fakeState);

    const abilities = extractAbilities(pd);
    const abilityName = String(pd.Ability1 || pd.ability1 || (abilities.length > 0 ? abilities[0] : '') || '');

    const metadata: Record<string, unknown> = {
        nickname: nickname.trim(),
        species: build.species,
        rank: rank,
        type1: String(pd.Type1 || pd.type1 || 'Normal'),
        type2: String(pd.Type2 || pd.type2 || 'None'),
        ability: abilityName,
        'ability-list': abilities.join(','),
        nature: '-- Select --',
        gender: 'Genderless',
        age: 'Adult',
        mode: 'Pokémon',
        'show-trackers': true,
        ruleset: 'vg-vit-hp',
        'token-image-url': imageUrl,
        'v2-migrated': true,
        'hp-base': hpBase,
        'hp-curr': hpMax,
        'hp-max-display': hpMax,
        'will-base': willBase,
        'will-curr': willMax,
        'will-max-display': willMax,
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
        'dex-id': String(pd.Number || pd.DexID || pd.dexId || ''),
        'dex-category': String(pd.Category || pd.Species || ''),
        height: String(pd.Height || ''),
        weight: String(pd.Weight || ''),
        'dex-description': String(pd.Description || pd.dexDescription || '')
    };

    const STAT_MAP: Record<CombatStat, string> = {
        [CombatStat.STR]: 'Strength',
        [CombatStat.DEX]: 'Dexterity',
        [CombatStat.VIT]: 'Vitality',
        [CombatStat.SPE]: 'Special',
        [CombatStat.INS]: 'Insight'
    };

    Object.values(CombatStat).forEach((stat) => {
        const fallback = stat === 'ins' ? 1 : 2;
        const statName = STAT_MAP[stat] || stat;
        const resolvedBase = build.baseStats?.[stat] ?? (Number(getBase(pd, statName, fallback)) || fallback);
        metadata[`${stat}-base`] = resolvedBase;
        metadata[`${stat}-rank`] = build.attr[stat] || 0;
        metadata[`${stat}-buff`] = 0;
        metadata[`${stat}-debuff`] = 0;
        metadata[`${stat}-limit`] = Number(getLimit(pd, statName)) || 5;
    });

    Object.values(SocialStat).forEach((stat) => {
        metadata[`${stat}-base`] = 1;
        metadata[`${stat}-rank`] = build.soc[stat] || 0;
        metadata[`${stat}-buff`] = 0;
        metadata[`${stat}-debuff`] = 0;
        metadata[`${stat}-limit`] = 5;
    });

    Object.values(Skill).forEach((skill) => {
        metadata[`${skill}-base`] = build.skills[skill] || 0;
        metadata[`${skill}-buff`] = 0;
    });

    const movesData = build.moves.map((move) => {
        const categoryString = String(move.cat);
        const properCategory = categoryString.startsWith('Phys')
            ? 'Physical'
            : categoryString.startsWith('Spec')
              ? 'Special'
              : 'Status';

        return {
            ...move,
            id: crypto.randomUUID(),
            active: false,
            category: properCategory as 'Physical' | 'Special' | 'Status',
            accBonus: 0,
            acc1: move.attr,
            acc2: move.skill,
            dmg1: move.dmgStat,
            marker: move.marker || ''
        };
    });

    metadata['moves-data'] = JSON.stringify(movesData);
    metadata['extra-skills-data'] = '[]';

    return metadata;
}
