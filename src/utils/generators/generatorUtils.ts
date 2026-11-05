import type { TempBuild, CharacterState, GeneratorConfig, Rank } from '@/store/storeTypes';
import { fetchPokemonData, loadLocalDataset } from '@/utils/api';
import { getRankPoints } from '@/store/useCharacterStore';
import { draftInitialMoves, draftSpilloverMoves, sortDraftedMoves } from '@/utils/generators/moveDraftingLogic';
import { ALL_SKILLS, RANK_HIERARCHY } from './pipeline/generatorOptionsParser';
import {
    resolveGeneratorSpecies,
    resolveBaseStatsAndLimits,
    createGeneratorFakeState,
    extractEvolutionChainAndMoves,
    fetchAndParseMoves,
    allocateBuildStats,
    resolveDualScalingMoves,
    resolveBuildIdentity
} from './pipeline/generatorBuildLogic';

export {
    parseStatOptions,
    parseSkillOptions,
    normalizeSingleStatistic,
    normalizeSingleSkill
} from './pipeline/generatorOptionsParser';
export * from './pipeline/generatorMetadataBuilder';
export * from './pipeline/generatorBuildLogic';

export async function generateBuild(config: GeneratorConfig, state: CharacterState): Promise<TempBuild | null> {
    await loadLocalDataset();

    const speciesName = await resolveGeneratorSpecies(config, state);
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
    const { core: attributePoints, social: socialPoints, skills: rankSkill, skillLimit: maxSkillRank } = getRankPoints(rank);

    const { finalBaseStats, attributeLimits } = resolveBaseStatsAndLimits(pdRecord, state);

    let effectiveBias = config.combatBias;
    if (config.autoSelectBias || config.combatBias === 'auto') {
        const strScore = attributeLimits.str + finalBaseStats.str;
        const speScore = attributeLimits.spe + finalBaseStats.spe;
        effectiveBias = strScore > speScore ? 'physical' : speScore > strScore ? 'special' : 'balanced';
    }

    const fakeState = createGeneratorFakeState(state, finalBaseStats, attributeLimits);

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
    let neededInsightRank = Math.max(0, totalTargetMoves - 3 - finalBaseStats.ins);
    neededInsightRank = Math.min(neededInsightRank, attributeLimits.ins - finalBaseStats.ins, attributePoints);
    generatedAttributes['ins'] = neededInsightRank;

    const draftedMax = finalBaseStats.ins + generatedAttributes['ins'] + 3;
    const adjustedAttributePoints = attributePoints - neededInsightRank;
    const currentRankIndex = Math.max(0, RANK_HIERARCHY.indexOf(rank));

    // Move extraction & fetching
    const { legalMoveNames, overrankMoveNames } = await extractEvolutionChainAndMoves(
        pdRecord,
        config,
        state,
        currentRankIndex,
        draftedMax
    );

    const { fetchedMoves, fetchedOverrankMoves } = await fetchAndParseMoves(
        legalMoveNames,
        overrankMoveNames,
        Boolean(config.allowOverrank)
    );

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

    // ✨ Stat Allocation ✨
    allocateBuildStats(
        config.buildType,
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
        customSkillsList,
        draftedMoves,
        effectiveBias
    );

    const finalDraftedMax = finalBaseStats.ins + generatedAttributes['ins'] + 3;

    // ✨ Move Drafting Phase 2 (Spillover Expansion) ✨
    draftSpilloverMoves(draftedMoves, leftoverPool, finalDraftedMax, draftingContext);

    // ✨ Dual Scaling & Move Attributes Resolution ✨
    resolveDualScalingMoves(
        draftedMoves,
        generatedAttributes,
        generatedSocials,
        generatedSkills,
        finalBaseStats,
        finalBaseStats.ins,
        pdRecord
    );

    sortDraftedMoves(draftedMoves, type1, hasType2, type2);

    // ✨ Identity Resolution ✨
    const { generatedGender, generatedNature, generatedLoyalty, generatedHappiness } = resolveBuildIdentity(
        config,
        rank
    );

    return {
        species: finalSpeciesName,
        rank: rank as Rank,
        gender: generatedGender,
        nature: generatedNature,
        loyalty: generatedLoyalty,
        happiness: generatedHappiness,
        attr: generatedAttributes,
        soc: generatedSocials,
        skills: generatedSkills,
        customSkillsList,
        customSkillMap,
        moves: draftedMoves,
        maxMoves: finalDraftedMax,
        includePmd: config.includePmd,
        pokemonData: pdRecord,
        baseStats: finalBaseStats
    };
}
