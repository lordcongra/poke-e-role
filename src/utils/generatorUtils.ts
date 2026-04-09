import type { TempBuild, TempMove, CharacterState, GeneratorConfig } from '../store/storeTypes';
import { fetchPokemonData, fetchMoveData, MOVES_URLS } from './api';
import { getRankPoints, getAgePoints } from '../store/useCharacterStore';
import { CombatStat, Skill } from '../types/enums';
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

    const myTypes = [state.identity.type1, state.identity.type2].filter((type) => type && type !== 'None');

    const baseInsight = state.stats[CombatStat.INS].base;
    const totalTargetMoves = config.targetAtkCount + config.targetSupCount;

    let neededInsightRank = Math.max(0, totalTargetMoves - 3 - baseInsight);
    neededInsightRank = Math.min(neededInsightRank, attributeLimits['ins'] - baseInsight, attributePoints);
    generatedAttributes['ins'] = neededInsightRank;

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
    if (legalMoveNames.length === 0) extractMoves(pd.Moves, true);

    const uniqueMoveNames = [...new Set(legalMoveNames)];
    const fetchedMoves: TempMove[] = [];

    for (const moveName of uniqueMoveNames) {
        const data = await fetchMoveData(moveName);
        if (data) {
            const rawCategory = String(data.Category || 'Physical').toLowerCase();
            let cat = 'Status';
            if (rawCategory.includes('phys')) cat = 'Phys';
            else if (rawCategory.includes('spec') || rawCategory.includes('var')) cat = 'Spec';

            fetchedMoves.push({
                id: crypto.randomUUID(),
                name: moveName,
                type: String(data.Type || 'Normal'),
                cat: cat,
                power: Number(data.Power) || 0,
                desc: String(data.Effect || data.Description || ''),
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
    let supportPool = fetchedMoves.filter((move) => move.cat === 'Status');
    let attackPool = fetchedMoves.filter((move) => move.cat === 'Phys' || move.cat === 'Spec');

    if (config.buildType === 'wild') {
        const availableMoves = [...fetchedMoves].sort(() => 0.5 - Math.random());
        const actualMaxMoves = baseInsight + generatedAttributes['ins'] + 3;
        for (let i = 0; i < actualMaxMoves && availableMoves.length > 0; i++) {
            const move = availableMoves.shift();
            if (move) draftedMoves.push(move);
        }
    } else {
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

        if (config.combatBias === 'tank') supportPool.sort((a, b) => getDefensiveScore(b) - getDefensiveScore(a));
        else supportPool.sort(() => 0.5 - Math.random());

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
            return b.power - a.power;
        });

        const coveredTypes = new Set<string>();
        let remainingAttackSlots = config.targetAtkCount + (config.targetSupCount - draftedMoves.length);

        for (const move of attackPool) {
            if (remainingAttackSlots <= 0) break;
            if (!coveredTypes.has(move.type) || myTypes.includes(move.type)) {
                draftedMoves.push(move);
                coveredTypes.add(move.type);
                remainingAttackSlots--;
            }
        }

        const leftoverPool = fetchedMoves.filter((move) => !draftedMoves.includes(move));
        if (config.buildType === 'minmax') leftoverPool.sort((a, b) => b.power - a.power);
        else leftoverPool.sort(() => 0.5 - Math.random());

        const draftedMax = baseInsight + generatedAttributes['ins'] + 3;
        while (draftedMoves.length < draftedMax && leftoverPool.length > 0) {
            const move = leftoverPool.shift();
            if (move) draftedMoves.push(move);
        }
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

    return {
        species: speciesName,
        attr: generatedAttributes,
        soc: generatedSocials,
        skills: generatedSkills,
        customSkillsList: customSkillsList,
        customSkillMap: customSkillMap,
        moves: draftedMoves,
        maxMoves: baseInsight + generatedAttributes['ins'] + 3,
        includePmd: config.includePmd
    };
}
