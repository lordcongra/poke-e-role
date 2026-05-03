import type { StateCreator } from 'zustand';
import type { CharacterState, GeneratorSlice, MoveData } from '../storeTypes';
import { CombatStat, SocialStat, Skill } from '../../types/enums';
import { saveToOwlbear } from '../../utils/obr';

export const createGeneratorSlice: StateCreator<CharacterState, [], [], GeneratorSlice> = (set) => ({
    generatorConfig: {
        buildType: 'wild',
        combatBias: 'balanced',
        targetAtkCount: 2,
        targetSupCount: 2,
        includePmd: false,
        includeCustom: false,
        overrideStab: false,
        primaryStabCount: 1,
        secondaryStabCount: 1,
        coverageCount: 1
    },

    setGeneratorConfig: (config) => set((state) => ({ generatorConfig: { ...state.generatorConfig, ...config } })),

    applyGeneratedBuild: (build) =>
        set((state) => {
            const newStats = { ...state.stats };
            const newSocials = { ...state.socials };
            const newSkills = { ...state.skills };
            const updatesToSave: Record<string, unknown> = {};

            Object.values(CombatStat).forEach((statistic) => {
                if (build.attr[statistic] !== undefined) {
                    newStats[statistic].rank = build.attr[statistic];
                    updatesToSave[`${statistic}-rank`] = build.attr[statistic];
                }
            });

            Object.values(SocialStat).forEach((statistic) => {
                if (build.soc[statistic] !== undefined) {
                    newSocials[statistic].rank = build.soc[statistic];
                    updatesToSave[`${statistic}-rank`] = build.soc[statistic];
                }
            });

            Object.values(Skill).forEach((skill) => {
                if (build.skills[skill] !== undefined) {
                    newSkills[skill].base = build.skills[skill];
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
                extraCategories: newExtraCategories
            };
        })
});