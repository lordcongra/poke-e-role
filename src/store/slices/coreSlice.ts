import type { StateCreator } from 'zustand';
import type { CharacterState, CoreSlice } from '../storeTypes';
import { CombatStat, SocialStat, Skill } from '../../types/enums';
import { saveToOwlbear } from '../../utils/obr';
import { parseCombatTags, getAbilityText } from '../../utils/combatMath';

export const createCoreSlice: StateCreator<CharacterState, [], [], CoreSlice> = (set) => ({
    health: { hpCurr: 5, hpMax: 5, hpBase: 4, temporaryHitPoints: 0, temporaryHitPointsMax: 0 },
    will: { willCurr: 4, willMax: 4, willBase: 3 },
    derived: { defBuff: 0, defDebuff: 0, sdefBuff: 0, sdefDebuff: 0, happy: 0, loyal: 0 },
    extras: { core: 0, social: 0, skill: 0 },

    stats: {
        [CombatStat.STR]: { base: 2, rank: 0, buff: 0, debuff: 0, limit: 5 },
        [CombatStat.DEX]: { base: 2, rank: 0, buff: 0, debuff: 0, limit: 5 },
        [CombatStat.VIT]: { base: 2, rank: 0, buff: 0, debuff: 0, limit: 5 },
        [CombatStat.SPE]: { base: 2, rank: 0, buff: 0, debuff: 0, limit: 5 },
        [CombatStat.INS]: { base: 1, rank: 0, buff: 0, debuff: 0, limit: 5 }
    },
    socials: {
        [SocialStat.TOU]: { base: 1, rank: 0, buff: 0, debuff: 0, limit: 5 },
        [SocialStat.COO]: { base: 1, rank: 0, buff: 0, debuff: 0, limit: 5 },
        [SocialStat.BEA]: { base: 1, rank: 0, buff: 0, debuff: 0, limit: 5 },
        [SocialStat.CUT]: { base: 1, rank: 0, buff: 0, debuff: 0, limit: 5 },
        [SocialStat.CLE]: { base: 1, rank: 0, buff: 0, debuff: 0, limit: 5 }
    },
    skills: Object.values(Skill).reduce(
        (acc, skill) => {
            acc[skill] = { base: 0, buff: 0, customName: '' };
            return acc;
        },
        {} as Record<Skill, { base: number; buff: number; customName: string }>
    ),

    setDerived: (field, value) =>
        set((state) => {
            const newDerived = { ...state.derived, [field]: value };

            let obrKey = field as string;
            if (field === 'defBuff') obrKey = 'def-buff';
            else if (field === 'defDebuff') obrKey = 'def-debuff';
            else if (field === 'sdefBuff') obrKey = 'spd-buff';
            else if (field === 'sdefDebuff') obrKey = 'spd-debuff';
            else if (field === 'happy') obrKey = 'happiness-curr';
            else if (field === 'loyal') obrKey = 'loyalty-curr';

            try {
                saveToOwlbear({ [obrKey]: value });
            } catch (e) {}
            return { derived: newDerived };
        }),

    updateHealth: (field, value) =>
        set((state) => {
            const newHealth = { ...state.health, [field]: value };

            if (field === 'hpBase') {
                const abilityText = getAbilityText(state.identity.ability, state.roomCustomAbilities);
                const invMods = parseCombatTags(state.inventory, state.extraCategories, undefined, abilityText);

                const vitTotal = Math.max(
                    1,
                    state.stats[CombatStat.VIT].base +
                        state.stats[CombatStat.VIT].rank +
                        state.stats[CombatStat.VIT].buff -
                        state.stats[CombatStat.VIT].debuff +
                        (invMods.stats.vit || 0)
                );
                const insTotal = Math.max(
                    1,
                    state.stats[CombatStat.INS].base +
                        state.stats[CombatStat.INS].rank +
                        state.stats[CombatStat.INS].buff -
                        state.stats[CombatStat.INS].debuff +
                        (invMods.stats.ins || 0)
                );
                let hpStat = vitTotal;
                if (state.identity.ruleset === 'vg-high-hp') hpStat = Math.max(vitTotal, insTotal);

                const oldMax = state.health.hpMax;
                newHealth.hpMax = value + hpStat;

                if (newHealth.hpMax > oldMax) {
                    newHealth.hpCurr += newHealth.hpMax - oldMax;
                } else if (newHealth.hpCurr > newHealth.hpMax) {
                    newHealth.hpCurr = newHealth.hpMax;
                }
            }

            try {
                saveToOwlbear({
                    'hp-curr': newHealth.hpCurr,
                    'hp-max-display': newHealth.hpMax,
                    'temporary-hit-points': newHealth.temporaryHitPoints,
                    'temporary-hit-points-max': newHealth.temporaryHitPointsMax,
                    ...(field === 'hpBase' ? { 'hp-base': value } : {})
                });
            } catch (e) {}

            return { health: newHealth };
        }),

    updateWill: (field, value) =>
        set((state) => {
            const newWill = { ...state.will, [field]: value };

            if (field === 'willBase') {
                const abilityText = getAbilityText(state.identity.ability, state.roomCustomAbilities);
                const invMods = parseCombatTags(state.inventory, state.extraCategories, undefined, abilityText);

                const insTotal = Math.max(
                    1,
                    state.stats[CombatStat.INS].base +
                        state.stats[CombatStat.INS].rank +
                        state.stats[CombatStat.INS].buff -
                        state.stats[CombatStat.INS].debuff +
                        (invMods.stats.ins || 0)
                );
                const oldMax = state.will.willMax;
                newWill.willMax = value + insTotal;

                if (newWill.willMax > oldMax) {
                    newWill.willCurr += newWill.willMax - oldMax;
                } else if (newWill.willCurr > newWill.willMax) {
                    newWill.willCurr = newWill.willMax;
                }
            }

            try {
                saveToOwlbear({
                    'will-curr': newWill.willCurr,
                    'will-max-display': newWill.willMax,
                    ...(field === 'willBase' ? { 'will-base': value } : {})
                });
            } catch (e) {}

            return { will: newWill };
        }),

    setExtra: (category, value) =>
        set((state) => {
            const newExtras = { ...state.extras, [category]: value };
            try {
                saveToOwlbear({ [`extra-${category}`]: value });
            } catch (e) {}
            return { extras: newExtras };
        }),

    setStat: (stat, field, value) =>
        set((state) => {
            const newStats = { ...state.stats, [stat]: { ...state.stats[stat], [field]: value } };
            const updatesToSave: Record<string, unknown> = { [`${stat}-${field}`]: value };

            const newHealth = { ...state.health };
            const newWill = { ...state.will };

            if (stat === CombatStat.VIT || stat === CombatStat.INS) {
                const abilityText = getAbilityText(state.identity.ability, state.roomCustomAbilities);
                const invMods = parseCombatTags(state.inventory, state.extraCategories, undefined, abilityText);

                const vitTotal = Math.max(
                    1,
                    newStats[CombatStat.VIT].base +
                        newStats[CombatStat.VIT].rank +
                        newStats[CombatStat.VIT].buff -
                        newStats[CombatStat.VIT].debuff +
                        (invMods.stats.vit || 0)
                );
                const insTotal = Math.max(
                    1,
                    newStats[CombatStat.INS].base +
                        newStats[CombatStat.INS].rank +
                        newStats[CombatStat.INS].buff -
                        newStats[CombatStat.INS].debuff +
                        (invMods.stats.ins || 0)
                );

                let hpStat = vitTotal;
                if (state.identity.ruleset === 'vg-high-hp') hpStat = Math.max(vitTotal, insTotal);

                const oldHpMax = newHealth.hpMax;
                newHealth.hpMax = newHealth.hpBase + hpStat;
                if (newHealth.hpMax > oldHpMax) newHealth.hpCurr += newHealth.hpMax - oldHpMax;
                else if (newHealth.hpCurr > newHealth.hpMax) newHealth.hpCurr = newHealth.hpMax;

                const oldWillMax = newWill.willMax;
                newWill.willMax = newWill.willBase + insTotal;
                if (newWill.willMax > oldWillMax) newWill.willCurr += newWill.willMax - oldWillMax;
                else if (newWill.willCurr > newWill.willMax) newWill.willCurr = newWill.willMax;

                updatesToSave['hp-curr'] = newHealth.hpCurr;
                updatesToSave['hp-max-display'] = newHealth.hpMax;
                updatesToSave['will-curr'] = newWill.willCurr;
                updatesToSave['will-max-display'] = newWill.willMax;
            }

            try {
                saveToOwlbear(updatesToSave);
            } catch (e) {}
            return { stats: newStats, health: newHealth, will: newWill };
        }),

    setSocialStat: (stat, field, value) =>
        set((state) => {
            const newSocials = { ...state.socials, [stat]: { ...state.socials[stat], [field]: value } };
            try {
                saveToOwlbear({ [`${stat}-${field}`]: value });
            } catch (e) {}
            return { socials: newSocials };
        }),

    setSkill: (skill, field, value) =>
        set((state) => {
            const newSkills = { ...state.skills, [skill]: { ...state.skills[skill], [field]: value } };
            try {
                if (field === 'customName') saveToOwlbear({ [`label-${skill}`]: value });
                else saveToOwlbear({ [`${skill}-${field}`]: value });
            } catch (e) {}
            return { skills: newSkills };
        })
});