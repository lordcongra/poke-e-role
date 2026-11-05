import type { TempMove, CharacterState, GeneratorConfig, Rank } from '@/store/storeTypes';
import {
    fetchPokemonData,
    fetchMoveData,
    MOVES_URLS,
    SPECIES_URLS,
    fetchPokemonLookupIndex,
    getCanonicalMoveName
} from '@/utils/api';
import { CombatStat, SocialStat } from '@/types/enums';
import { assignWildStats, assignMinMaxStats, assignAverageStats } from '@/utils/generators/generatorLogic';
import { NATURES } from '@/data/constants';
import {
    calculateScalarLoyaltyHappiness,
    filterPokemonLookupPool,
    type PokemonLookupFilterOptions
} from '@/utils/generators/pokemonFilterUtils';
import { ALL_POKEMON_TYPES } from '@/utils/generators/trainerTeamPoolLogic';
import { getLimit, getBase } from '@/utils/common/macroHelpers';
import {
    RANK_HIERARCHY,
    COMBAT_STATS,
    SOCIAL_STATS,
    parseStatOptions,
    parseSkillOptions
} from './generatorOptionsParser';

function getRandomFallbackSpecies(state: CharacterState): string | null {
    const customNames = state.roomCustomPokemon
        .filter((p) => state.role === 'GM' || !p.gmOnly)
        .map((p) => p.Name);
    const candidates = [...new Set([...Object.keys(SPECIES_URLS), ...customNames])];
    return candidates.length > 0 ? candidates[Math.floor(Math.random() * candidates.length)] : null;
}

/**
 * Resolves candidate species for generator based on biomes, rank, and typing filters.
 */
export async function resolveGeneratorSpecies(config: GeneratorConfig, state: CharacterState): Promise<string | null> {
    let speciesName = config.targetSpecies || state.identity.species;

    const shouldPickRandomSpecies =
        Boolean(config.randomizeSpecies) ||
        (!config.targetSpecies &&
            Boolean(
                (config.selectedBiome && config.selectedBiome !== 'none' && config.selectedBiome !== 'any') ||
                (config.typeSpecialtyMode && config.typeSpecialtyMode !== 'any') ||
                !state.identity.species
            ));

    if (!shouldPickRandomSpecies) return speciesName || null;

    try {
        const lookupIndex = await fetchPokemonLookupIndex();
        let allowedRecommendedRanks: string[] | undefined = undefined;
        if (config.filterRecommendedRank) {
            let targetRank: string = config.targetRank || state.identity.rank || 'Starter';
            if (config.recommendedRankMode === 'exact') targetRank = (config.exactRecommendedRank as string) || targetRank;
            else if (config.recommendedRankMode === 'custom') {
                const customVal = config.customSlotRecommendedRanks?.[config.slotIndex ?? 0];
                if (customVal && customVal !== 'match') targetRank = customVal;
            }
            allowedRecommendedRanks = [targetRank];
        }

        const filterOpts: PokemonLookupFilterOptions = {
            includeMegas: Boolean(config.includeMegas),
            includeLegendaries: Boolean(config.includeLegendaries),
            includeMythicals: Boolean(config.includeMythicals),
            includeUltraBeasts: Boolean(config.includeUltraBeasts),
            includeParadox: Boolean(config.includeParadox),
            allowedLineLengths: config.allowedLineLengths ?? [1, 2, 3],
            allowedStageIndices: config.allowedStageIndices ?? [1, 2, 3],
            allowedGenerations: config.allowedGenerations ?? [1, 2, 3, 4, 5, 6, 7, 8, 9],
            biomeId: config.selectedBiome,
            usedSpecies: config.usedSpecies,
            filterRecommendedRank: Boolean(config.filterRecommendedRank),
            allowedRecommendedRanks
        };

        let resolvedTypes: string[] = [];
        if (config.typeSpecialtyMode === 'monotype') {
            resolvedTypes = [ALL_POKEMON_TYPES[Math.floor(Math.random() * ALL_POKEMON_TYPES.length)]];
        } else if (config.typeSpecialtyMode === 'dual') {
            const t1 = ALL_POKEMON_TYPES[Math.floor(Math.random() * ALL_POKEMON_TYPES.length)];
            const rest = ALL_POKEMON_TYPES.filter((t) => t !== t1);
            resolvedTypes = [t1, rest[Math.floor(Math.random() * rest.length)]];
        } else if (config.typeSpecialtyMode === 'manual') {
            resolvedTypes = config.manualTypes || [];
        }

        let eligible = filterPokemonLookupPool(lookupIndex, resolvedTypes, filterOpts);
        if (eligible.length === 0 && config.usedSpecies && config.usedSpecies.size > 0) {
            eligible = filterPokemonLookupPool(lookupIndex, resolvedTypes, { ...filterOpts, usedSpecies: undefined });
        }
        if (eligible.length === 0 && resolvedTypes.length > 0) {
            resolvedTypes = [];
            eligible = filterPokemonLookupPool(lookupIndex, [], filterOpts);
            if (eligible.length === 0 && config.usedSpecies && config.usedSpecies.size > 0) {
                eligible = filterPokemonLookupPool(lookupIndex, [], { ...filterOpts, usedSpecies: undefined });
            }
        }
        if (eligible.length === 0 && filterOpts.filterRecommendedRank) {
            eligible = filterPokemonLookupPool(lookupIndex, resolvedTypes, { ...filterOpts, filterRecommendedRank: false });
        }
        if (eligible.length === 0 && filterOpts.allowedGenerations && filterOpts.allowedGenerations.length < 9) {
            eligible = filterPokemonLookupPool(lookupIndex, resolvedTypes, { ...filterOpts, filterRecommendedRank: false, allowedGenerations: undefined });
        }

        speciesName = eligible.length > 0
            ? eligible[Math.floor(Math.random() * eligible.length)].name
            : getRandomFallbackSpecies(state) || speciesName;
    } catch (e) {
        console.warn('[GeneratorUtils] Candidate species lookup failed, using fallback pool:', e);
        speciesName = getRandomFallbackSpecies(state) || speciesName;
    }

    if (speciesName && config.usedSpecies) {
        config.usedSpecies.add(speciesName);
        config.usedSpecies.add(speciesName.toLowerCase());
    }

    return speciesName || null;
}

/**
 * Resolves base stats and attribute limits from species data and fallback state.
 */
export function resolveBaseStatsAndLimits(
    pdRecord: Record<string, unknown>,
    state: CharacterState
): { finalBaseStats: Record<string, number>; attributeLimits: Record<string, number> } {
    const finalBaseStats: Record<string, number> = {
        str: Number(getBase(pdRecord, 'Strength', 2)) || Number(state.stats[CombatStat.STR]?.base) || 2,
        dex: Number(getBase(pdRecord, 'Dexterity', 2)) || Number(state.stats[CombatStat.DEX]?.base) || 2,
        vit: Number(getBase(pdRecord, 'Vitality', 2)) || Number(state.stats[CombatStat.VIT]?.base) || 2,
        spe: Number(getBase(pdRecord, 'Special', 2)) || Number(state.stats[CombatStat.SPE]?.base) || 2,
        ins: Number(getBase(pdRecord, 'Insight', 1)) || Number(state.stats[CombatStat.INS]?.base) || 1
    };
    const attributeLimits: Record<string, number> = {
        str: Number(getLimit(pdRecord, 'Strength')) || Number(state.stats[CombatStat.STR]?.limit) || 5,
        dex: Number(getLimit(pdRecord, 'Dexterity')) || Number(state.stats[CombatStat.DEX]?.limit) || 5,
        vit: Number(getLimit(pdRecord, 'Vitality')) || Number(state.stats[CombatStat.VIT]?.limit) || 5,
        spe: Number(getLimit(pdRecord, 'Special')) || Number(state.stats[CombatStat.SPE]?.limit) || 5,
        ins: Number(getLimit(pdRecord, 'Insight')) || Number(state.stats[CombatStat.INS]?.limit) || 5
    };
    return { finalBaseStats, attributeLimits };
}

/**
 * Creates temporary CharacterState with default social stats and base stat limits.
 */
export function createGeneratorFakeState(
    state: CharacterState,
    baseStats: Record<string, number>,
    limits: Record<string, number>
): CharacterState {
    const socials = Object.values(SocialStat).reduce((acc, s) => {
        acc[s] = { base: 1, rank: 0, buff: 0, debuff: 0, limit: 5 };
        return acc;
    }, {} as CharacterState['socials']);

    const stats = { ...state.stats };
    for (const s of Object.values(CombatStat)) {
        stats[s] = { ...state.stats[s], base: baseStats[s], limit: limits[s] };
    }

    return { ...state, socials, stats };
}

/**
 * Extracts evolution chain backwards and movesets for legal and overrank categories.
 */
export async function extractEvolutionChainAndMoves(
    pdRecord: Record<string, unknown>,
    config: GeneratorConfig,
    state: CharacterState,
    currentRankIndex: number,
    draftedMax: number
): Promise<{ legalMoveNames: string[]; overrankMoveNames: string[] }> {
    const legalMoveNames: string[] = [];
    const overrankMoveNames: string[] = [];

    const preEvos: { data: Record<string, unknown>; isTrueEvo: boolean }[] = [];
    if (config.includePreEvolutions) {
        let currentSpeciesData = pdRecord;
        let guardCounter = 0;
        while (currentSpeciesData.Evolutions && guardCounter < 5) {
            guardCounter++;
            const fromEvo = (currentSpeciesData.Evolutions as Record<string, unknown>[]).find((e) => e.From);
            if (!fromEvo) break;
            const fromData = await fetchPokemonData(String(fromEvo.From));
            if (!fromData) break;
            preEvos.push({
                data: fromData as Record<string, unknown>,
                isTrueEvo: !['Mega', 'Gigantamax', 'Primal'].includes(String(fromEvo.Kind))
            });
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
            const canonicalName = getCanonicalMoveName(moveName);
            const normalizedRank = moveRank.trim().charAt(0).toUpperCase() + moveRank.trim().slice(1).toLowerCase();
            const rIdx = RANK_HIERARCHY.indexOf(normalizedRank);

            const cleanName = canonicalName.toLowerCase().trim();
            const isCustomMove = state.roomCustomMoves.some((m) => m.name.toLowerCase() === cleanName);
            const moveExists = MOVES_URLS[cleanName] || isCustomMove;

            if (canonicalName && cleanName !== 'splash' && moveExists) {
                const isWithinRank = rIdx !== -1 && rIdx <= maxRankIndex && rIdx > minRankIndex;
                const isOther = rIdx === -1;
                if (maxRankIndex === 99 || isWithinRank || (includeOther && isOther)) {
                    targetArray.push(canonicalName);
                }
            }
        };

        const items = Array.isArray(moveObject)
            ? moveObject.map((m) =>
                  typeof m === 'object' && m
                      ? {
                            name: String((m as Record<string, unknown>).Name || (m as Record<string, unknown>).Move || ''),
                            rank: String((m as Record<string, unknown>).Learned || (m as Record<string, unknown>).Learn || (m as Record<string, unknown>).Level || (m as Record<string, unknown>).Rank || 'Other')
                        }
                      : { name: String(m), rank: 'Other' }
              )
            : typeof moveObject === 'object' && moveObject
              ? Object.entries(moveObject).flatMap(([rank, list]) =>
                    Array.isArray(list)
                        ? list.map((m) => ({
                              name: typeof m === 'string' ? m : String((m as Record<string, unknown>).Name || (m as Record<string, unknown>).Move || ''),
                              rank
                          }))
                        : []
                )
              : [];
        items.forEach(({ name, rank }) => processMove(name, rank));
    };

    extractMoves(pdRecord.Moves, currentRankIndex, legalMoveNames);

    if (config.includePreEvolutions) {
        const trueEvoCount = preEvos.filter((p) => p.isTrueEvo).length;
        let currentTrueDepth = 0;
        preEvos.forEach((pe) => {
            let offset = 0;
            if (pe.isTrueEvo) {
                currentTrueDepth++;
                if (trueEvoCount === 1) offset = config.evo2Stage1Offset;
                else if (trueEvoCount >= 2) offset = currentTrueDepth === 1 ? config.evo3Stage2Offset : config.evo3Stage1Offset;
            }
            const peMaxRank = Math.max(0, currentRankIndex - offset);
            extractMoves(pe.data.Moves, peMaxRank, legalMoveNames);
        });
    }

    if (legalMoveNames.length < draftedMax) {
        extractMoves(pdRecord.Moves, currentRankIndex, legalMoveNames, -1, true);
    }

    if (config.allowOverrank) {
        const overrankMax = Math.min(currentRankIndex + config.overrankAmount, RANK_HIERARCHY.length - 1);
        if (overrankMax > currentRankIndex) {
            extractMoves(pdRecord.Moves, overrankMax, overrankMoveNames, currentRankIndex);
            if (config.allowPreEvoOverrank && config.includePreEvolutions) {
                preEvos.forEach((pe) => extractMoves(pe.data.Moves, overrankMax, overrankMoveNames, currentRankIndex));
            }
        }
    }

    return { legalMoveNames, overrankMoveNames };
}

/**
 * Parses raw move data into TempMove with candidate scaling stats.
 */
export function parseMoveData(
    moveName: string,
    data: NonNullable<Awaited<ReturnType<typeof fetchMoveData>>>
): TempMove {
    const rawCategory = String(data.Category || 'Physical').toLowerCase();
    let cat = 'Status';
    let candidateCategories: string[] | undefined = undefined;
    if (rawCategory === 'physical' || rawCategory.includes('phys')) cat = 'Phys';
    else if (rawCategory === 'special' || rawCategory.includes('spec')) cat = 'Spec';
    else if (rawCategory === 'status' || rawCategory.includes('stat') || rawCategory.includes('sup')) cat = 'Status';
    else {
        cat = 'Phys';
        candidateCategories = ['Physical', 'Special', 'Status'];
    }

    const rawAcc1 = String(data.Accuracy1 || '');
    const rawAcc2 = String(data.Accuracy2 || '');
    const rawDmg1 = String(data.Damage1 || '');
    const rawDmg2 = String(data.Damage2 || '');
    const accString = `Accuracy: ${rawAcc1}${rawAcc2 && rawAcc2.toLowerCase() !== 'none' ? ` + ${rawAcc2}` : ''}`;

    const isAttr = rawDmg2 && rawDmg2 !== 'None' && parseStatOptions(rawDmg2).length > 0;
    const dmgText = rawDmg1 && rawDmg2 && rawDmg2 !== 'None'
        ? (isAttr ? `${rawDmg1} / ${rawDmg2}` : `${rawDmg1} + ${rawDmg2}`)
        : (!rawDmg1 && rawDmg2 && rawDmg2 !== 'None' ? rawDmg2 : rawDmg1);
    const dmgString = cat === 'Status' ? '' : `Damage: ${dmgText}`;

    const rawDesc = String(data.Effect || data.Description || '');
    const retainedTags = rawDesc.match(/\[.*?\]/g)?.join(' ') || '';
    const cleanDesc = rawDesc.replace(/\[.*?\]/g, '').trim().replace(/\n\nAccuracy:[\s\S]*/i, '').trim();

    const finalDesc =
        `${cleanDesc}\n\n${accString}${dmgString ? '\n' + dmgString : ''}${retainedTags ? '\n\n' + retainedTags : ''}`.trim();
    const rawDmgCombined = [rawDmg1, rawDmg2].filter((d) => d && d !== 'None' && d.trim() !== '').join('/');

    return {
        id: crypto.randomUUID(),
        name: moveName,
        type: String(data.Type || 'Normal'),
        cat,
        power: Number(data.Power) || 0,
        desc: finalDesc,
        dmgStat: parseStatOptions(rawDmgCombined)[0] || '',
        attr: parseStatOptions(rawAcc1)[0] || '',
        skill: parseSkillOptions(rawAcc2)[0] || 'none',
        candidateAttrs: parseStatOptions(rawAcc1),
        candidateDmgStats: parseStatOptions(rawDmgCombined),
        candidateSkills: parseSkillOptions(rawAcc2),
        candidateCategories,
        rawAcc1,
        rawAcc2,
        rawDmg1,
        rawDmg2,
        marker: ''
    };
}

/**
 * Fetches and parses move datasets for unique legal and overrank move lists.
 */
export async function fetchAndParseMoves(
    legalMoveNames: string[],
    overrankMoveNames: string[],
    allowOverrank: boolean
): Promise<{ fetchedMoves: TempMove[]; fetchedOverrankMoves: TempMove[] }> {
    const fetchList = async (names: string[]): Promise<TempMove[]> => {
        const results: TempMove[] = [];
        for (const name of names) {
            const data = await fetchMoveData(name);
            if (data) results.push(parseMoveData(name, data));
        }
        return results;
    };

    const uniqueMoveNames = [...new Set(legalMoveNames)];
    const fetchedMoves = await fetchList(uniqueMoveNames);

    const uniqueOverrankNames = allowOverrank && overrankMoveNames.length > 0
        ? [...new Set(overrankMoveNames)].filter((name) => !uniqueMoveNames.includes(name))
        : [];
    const fetchedOverrankMoves = await fetchList(uniqueOverrankNames);

    return { fetchedMoves, fetchedOverrankMoves };
}

/**
 * Delegates stat allocation to wild, minmax, or average algorithms.
 */
export function allocateBuildStats(
    buildType: string | undefined,
    generatedAttributes: Record<string, number>,
    generatedSocials: Record<string, number>,
    generatedSkills: Record<string, number>,
    adjustedAttributePoints: number,
    socialPoints: number,
    rankSkill: number,
    attributeLimits: Record<string, number>,
    fakeState: CharacterState,
    maxSkillRank: number,
    config: GeneratorConfig,
    customSkillsList: string[],
    draftedMoves: TempMove[],
    effectiveBias: string | undefined
): void {
    const args = [generatedAttributes, generatedSocials, generatedSkills, adjustedAttributePoints, socialPoints, rankSkill, attributeLimits, fakeState, maxSkillRank] as const;
    const resolvedBias = effectiveBias || config.combatBias || 'auto';
    if (buildType === 'wild') {
        assignWildStats(...args, config, customSkillsList);
    } else if (buildType === 'minmax') {
        assignMinMaxStats(...args, { ...config, combatBias: resolvedBias }, customSkillsList, draftedMoves);
    } else if (buildType === 'average') {
        assignAverageStats(...args, { ...config, combatBias: resolvedBias }, customSkillsList, draftedMoves);
    }
}

/**
 * Resolves best scaling attribute and skill for drafted moves based on final generated stats.
 */
export function resolveDualScalingMoves(
    draftedMoves: TempMove[],
    generatedAttributes: Record<string, number>,
    generatedSocials: Record<string, number>,
    generatedSkills: Record<string, number>,
    finalBaseStats: Record<string, number>,
    baseIns: number,
    pdRecord: Record<string, unknown>
): void {
    const getBestAttribute = (rawAttr: string): string => {
        if (!rawAttr || rawAttr.toLowerCase() === 'none') return '';
        const options = parseStatOptions(rawAttr);
        if (options.length <= 1) return options[0] || 'str';

        let best = options[0];
        let maxVal = -1;
        for (const opt of options) {
            const val = COMBAT_STATS.includes(opt)
                ? (generatedAttributes[opt] || 0) + (finalBaseStats[opt] || 0)
                : SOCIAL_STATS.includes(opt)
                  ? (generatedSocials[opt] || 0) + 1
                  : opt === 'will'
                    ? baseIns + (generatedAttributes['ins'] || 0) + (Number(pdRecord.BaseWill) || 3)
                    : 0;
            if (val > maxVal) {
                maxVal = val;
                best = opt;
            }
        }
        return best;
    };

    const getBestSkill = (rawSkill: string): string => {
        if (!rawSkill || rawSkill.toLowerCase().includes('none')) return 'none';
        const options = parseSkillOptions(rawSkill);
        if (options.length <= 1) return options[0] || 'none';

        let best = options[0];
        let maxVal = -1;
        for (const opt of options) {
            const val = generatedSkills[opt] || 0;
            if (val > maxVal) {
                maxVal = val;
                best = opt;
            }
        }
        return best;
    };

    draftedMoves.forEach((move) => {
        move.attr = getBestAttribute(move.rawAcc1 || move.attr);
        move.skill = getBestSkill(move.rawAcc2 || move.skill);
        move.dmgStat = getBestAttribute(move.rawDmg1 || move.dmgStat);
        const hasCandidates =
            (move.candidateAttrs && move.candidateAttrs.length > 1) ||
            (move.candidateSkills && move.candidateSkills.length > 1) ||
            (move.candidateDmgStats && move.candidateDmgStats.length > 1) ||
            (move.candidateCategories && move.candidateCategories.length > 1);
        if (hasCandidates) {
            move.dualScaleSelected = true;
        }
    });
}

/**
 * Resolves optional character identity attributes (gender, nature, loyalty, happiness).
 */
export function resolveBuildIdentity(
    config: GeneratorConfig,
    rank: string
): {
    generatedGender?: string;
    generatedNature?: string;
    generatedLoyalty?: number;
    generatedHappiness?: number;
} {
    const generatedGender = config.randomizeGender ? (Math.random() < 0.5 ? 'Male' : 'Female') : undefined;
    const generatedNature = config.randomizeNature
        ? NATURES.filter(Boolean)[Math.floor(Math.random() * NATURES.filter(Boolean).length)]
        : undefined;

    let generatedLoyalty: number | undefined;
    let generatedHappiness: number | undefined;
    if (config.scaleLoyaltyHappiness !== false) {
        const res = calculateScalarLoyaltyHappiness(rank as Rank, config.slotIndex ?? 0);
        generatedLoyalty = res.loyalty;
        generatedHappiness = res.happiness;
    }

    return {
        generatedGender,
        generatedNature,
        generatedLoyalty,
        generatedHappiness
    };
}
