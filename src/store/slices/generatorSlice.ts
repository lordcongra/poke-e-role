import type { StateCreator } from 'zustand';
import type { CharacterState, GeneratorSlice, MoveData } from '../storeTypes';
import { CombatStat, SocialStat, Skill } from '../../types/enums';
import { saveToOwlbear } from '../../utils/obr';

export const createGeneratorSlice: StateCreator<CharacterState, [], [], GeneratorSlice> = (set, get) => ({
    generatorConfig: {
        buildType: 'minmax',
        combatBias: 'balanced',
        targetAtkCount: 4,
        targetSupCount: 1,
        includePmd: false,
        includeCustom: false,
        overridePrimaryStab: false,
        overrideSecondaryStab: false,
        overrideCoverage: false,
        primaryStabCount: 1,
        secondaryStabCount: 1,
        coverageCount: 1,
        randomizeSpecies: false,
        autoSelectBias: false,
        ensureDefenses: false,
        minStats: { str: 0, dex: 0, vit: 0, spe: 0, ins: 0 },
        minSocials: { tou: 0, coo: 0, bea: 0, cut: 0, cle: 0 }
    },

    setGeneratorConfig: (config) => set((state) => ({ generatorConfig: { ...state.generatorConfig, ...config } })),

    applyGeneratedBuild: (build) => {
        if (build.pokemonData && build.species !== get().identity.species) {
            get().applySpeciesData(build.pokemonData, true, true);
        }

        set((state) => {
            const newStats = { ...state.stats };
            const newSocials = { ...state.socials };
            const newSkills = { ...state.skills };
            const newIdentity = { ...state.identity };
            const updatesToSave: Record<string, unknown> = {};

            if (build.pokemonData && build.species !== state.identity.species) {
                newIdentity.species = build.species;
                updatesToSave['species'] = build.species;
            }

            Object.values(CombatStat).forEach((statistic) => {
                if (build.attr[statistic] !== undefined) {
                    newStats[statistic] = { ...newStats[statistic], rank: build.attr[statistic] };
                    updatesToSave[`${statistic}-rank`] = build.attr[statistic];
                }
            });

            Object.values(SocialStat).forEach((statistic) => {
                if (build.soc[statistic] !== undefined) {
                    newSocials[statistic] = { ...newSocials[statistic], rank: build.soc[statistic] };
                    updatesToSave[`${statistic}-rank`] = build.soc[statistic];
                }
            });

            Object.values(Skill).forEach((skill) => {
                if (build.skills[skill] !== undefined) {
                    newSkills[skill] = { ...newSkills[skill], base: build.skills[skill] };
                    updatesToSave[`${skill}-base`] = build.skills[skill];
                }
            });

            const newExtraCategories = [...state.extraCategories];
            build.customSkillsList.forEach((skillId) => {
                if (build.skills[skillId] !== undefined) {
                    newExtraCategories.forEach((category) => {
                        const targetSkill = category.skills.find((skill) => skill.id === skillId);
                        if (targetSkill) {
                            targetSkill.base = build.skills[skillId];
                            updatesToSave[`${skillId}-base`] = build.skills[skillId];
                        }
                    });
                }
            });

            const newMoves: MoveData[] = build.moves.map((move) => {
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
                    dmg1: move.dmgStat
                };
            });

            updatesToSave['moves-data'] = JSON.stringify(newMoves);
            if (newExtraCategories !== state.extraCategories)
                updatesToSave['extra-skills-data'] = JSON.stringify(newExtraCategories);

            try {
                saveToOwlbear(updatesToSave);
            } catch (error) {
                console.error(error);
            }

            return {
                stats: newStats,
                socials: newSocials,
                skills: newSkills,
                moves: newMoves,
                extraCategories: newExtraCategories,
                identity: newIdentity
            };
        });
    }
});