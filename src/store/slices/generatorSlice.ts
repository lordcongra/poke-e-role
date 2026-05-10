import type { StateCreator } from 'zustand';
import type { CharacterState, GeneratorSlice, MoveData } from '../storeTypes';
import { CombatStat, SocialStat, Skill } from '../../types/enums';
import { saveToOwlbear } from '../../utils/obr';
import { syncHealthAndWill } from '../../utils/macroHelpers';
import OBR from '@owlbear-rodeo/sdk';

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
        coveragePreference: 'balanced',
        primaryStabCount: 1,
        secondaryStabCount: 1,
        coverageCount: 1,
        randomizeSpecies: false,
        autoSelectBias: false,
        ensureDefenses: false,
        minStats: { str: 0, dex: 0, vit: 0, spe: 0, ins: 0 },
        minSocials: { tou: 0, coo: 0, bea: 0, cut: 0, cle: 0 },
        includePreEvolutions: false,
        evo2Stage1Offset: 1,
        evo3Stage2Offset: 1,
        evo3Stage1Offset: 2,
        allowOverrank: false,
        overrankAmount: 1,
        allowPreEvoOverrank: false,
        useSpilloverRatio: false,
        spilloverAtkRatio: 2,
        spilloverSupRatio: 1,
        spilloverJitter: true
    },

    setGeneratorConfig: (config) => set((state) => ({ generatorConfig: { ...state.generatorConfig, ...config } })),

    applyGeneratedBuild: (build) => {
        if (build.pokemonData && build.species !== get().identity.species) {
            get().applySpeciesData(build.pokemonData, true, true);
        }

        // FORCEFUL OBR RENAME SCRIPT
        setTimeout(() => {
            if (OBR.isAvailable && get().tokenId) {
                OBR.scene.items
                    .updateItems([get().tokenId!], (items) => {
                        for (const item of items) {
                            item.name = build.species;
                            if (item.metadata['com.missing-link-dev.changr/metadata']) {
                                try {
                                    const changrMeta = JSON.parse(
                                        JSON.stringify(item.metadata['com.missing-link-dev.changr/metadata'])
                                    );
                                    if (changrMeta && Array.isArray(changrMeta.imageOptions)) {
                                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                        changrMeta.imageOptions.forEach((opt: any) => {
                                            opt.name = build.species;
                                        });
                                    }
                                    item.metadata['com.missing-link-dev.changr/metadata'] = changrMeta;
                                } catch (e) {
                                    console.warn('Failed to overwrite Changr metadata', e);
                                }
                            }
                        }
                    })
                    .catch((e) => console.warn('Failed to update OBR item name:', e));
            }
        }, 250);

        set((state) => {
            const newStats = { ...state.stats };
            const newSocials = { ...state.socials };
            const newSkills = { ...state.skills };
            const newIdentity = { ...state.identity };
            const newHealth = { ...state.health };
            const newWill = { ...state.will };
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

            syncHealthAndWill(state, newStats, newIdentity, newHealth, newWill, updatesToSave);

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
                identity: newIdentity,
                health: newHealth,
                will: newWill
            };
        });
    }
});
