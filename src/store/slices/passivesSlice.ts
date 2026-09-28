import type { StateCreator } from 'zustand';
import type { CharacterState, PassivesSlice, PassiveItem } from '../storeTypes';
import { saveToOwlbear } from '../../utils/sync/obr';
import { parseCombatTags, getAbilityText, calculateMaxHp, calculateMaxWill } from '../../utils/combat/combatUtils';

const syncHealthWillForPassives = (
    state: CharacterState,
    newPassives: PassiveItem[],
    updatesToSave: Record<string, unknown>
) => {
    const abilityText = getAbilityText(state.identity.ability, state.roomCustomAbilities);
    const modifiers = parseCombatTags(state.inventory, state.extraCategories, undefined, abilityText, newPassives);
    const fakeState = { ...state, passives: newPassives };

    const newHealth = { ...state.health };
    const oldHpMax = newHealth.hpMax;
    newHealth.hpMax = calculateMaxHp(fakeState, modifiers);
    if (newHealth.hpMax > oldHpMax) newHealth.hpCurr += newHealth.hpMax - oldHpMax;
    else if (newHealth.hpCurr > newHealth.hpMax) newHealth.hpCurr = newHealth.hpMax;

    const newWill = { ...state.will };
    const oldWillMax = newWill.willMax;
    newWill.willMax = calculateMaxWill(fakeState, modifiers);
    if (newWill.willMax > oldWillMax) newWill.willCurr += newWill.willMax - oldWillMax;
    else if (newWill.willCurr > newWill.willMax) newWill.willCurr = newWill.willMax;

    updatesToSave['hp-curr'] = newHealth.hpCurr;
    updatesToSave['hp-max-display'] = newHealth.hpMax;
    updatesToSave['will-curr'] = newWill.willCurr;
    updatesToSave['will-max-display'] = newWill.willMax;

    return { health: newHealth, will: newWill };
};

export const createPassivesSlice: StateCreator<CharacterState, [], [], PassivesSlice> = (set) => ({
    passives: [],

    addPassive: () =>
        set((state) => {
            const newPassives: PassiveItem[] = [
                ...state.passives,
                { id: crypto.randomUUID(), name: '', desc: '', active: true, showInConditions: false }
            ];
            const updatesToSave: Record<string, unknown> = { 'passives-data': JSON.stringify(newPassives) };
            const { health, will } = syncHealthWillForPassives(state, newPassives, updatesToSave);
            try {
                saveToOwlbear(updatesToSave);
            } catch (error) {
                console.error('[PassivesSlice] Failed to save added passive to Owlbear:', error);
            }
            return { passives: newPassives, health, will };
        }),

    addSpecificPassive: (item) =>
        set((state) => {
            const newPassives: PassiveItem[] = [
                ...state.passives,
                {
                    id: crypto.randomUUID(),
                    name: item.name || '',
                    desc: item.desc || '',
                    active: item.active !== false,
                    showInConditions: item.showInConditions || false
                }
            ];
            const updatesToSave: Record<string, unknown> = { 'passives-data': JSON.stringify(newPassives) };
            const { health, will } = syncHealthWillForPassives(state, newPassives, updatesToSave);
            try {
                saveToOwlbear(updatesToSave);
            } catch (error) {
                console.error('[PassivesSlice] Failed to save specific passive to Owlbear:', error);
            }
            return { passives: newPassives, health, will };
        }),

    updatePassive: (id, field, value) =>
        set((state) => {
            let statusChanged = false;
            let newStatuses = [...state.statuses];
            let grantedTempHp = 0;

            const newPassives = state.passives.map((passive) => {
                if (passive.id === id) {
                    const updated = { ...passive, [field]: value };

                    if (field === 'active') {
                        const descriptionText = (passive.desc || '').toLowerCase();

                        if (value === true) {
                            const tempHpMatch = descriptionText.match(/\[\s*gain temp hp\s*(\d+)\s*\]/i);
                            if (tempHpMatch) {
                                grantedTempHp = Math.max(grantedTempHp, parseInt(tempHpMatch[1], 10));
                            }
                        }

                        const statusMatches = Array.from(descriptionText.matchAll(/\[status:\s*([a-zA-Z0-9\s]+)\]/gi));

                        if (statusMatches.length > 0) {
                            if (value === true) {
                                statusMatches.forEach((match) => {
                                    const statusName = match[1].trim();
                                    const properNames = [
                                        '1st Degree Burn',
                                        '2nd Degree Burn',
                                        '3rd Degree Burn',
                                        'Poison',
                                        'Badly Poisoned',
                                        'Paralysis',
                                        'Sleep',
                                        'Frozen Solid',
                                        'Confusion',
                                        'In Love',
                                        'Flinch'
                                    ];

                                    const properName =
                                        properNames.find((s) => s.toLowerCase() === statusName.toLowerCase()) ||
                                        statusName;

                                    const exists = newStatuses.some(
                                        (s) =>
                                            s.name.toLowerCase() === properName.toLowerCase() ||
                                            s.customName.toLowerCase() === properName.toLowerCase()
                                    );

                                    if (!exists) {
                                        if (newStatuses.length === 1 && newStatuses[0].name === 'Healthy')
                                            newStatuses = [];
                                        newStatuses.push({
                                            id: crypto.randomUUID(),
                                            name: properName,
                                            customName: '',
                                            rounds: 0
                                        });
                                        statusChanged = true;
                                    }
                                });
                            } else {
                                statusMatches.forEach((match) => {
                                    const statusName = match[1].trim().toLowerCase();
                                    const idx = newStatuses.findIndex(
                                        (s) =>
                                            (s.name === 'Custom...'
                                                ? s.customName.toLowerCase()
                                                : s.name.toLowerCase()) === statusName
                                    );
                                    if (idx !== -1) {
                                        newStatuses.splice(idx, 1);
                                        statusChanged = true;
                                    }
                                });
                                if (newStatuses.length === 0) {
                                    newStatuses.push({
                                        id: crypto.randomUUID(),
                                        name: 'Healthy',
                                        customName: '',
                                        rounds: 0
                                    });
                                    statusChanged = true;
                                }
                            }
                        }
                    }
                    return updated as PassiveItem;
                }
                return passive;
            });

            const updatesToSave: Record<string, unknown> = {};
            const { health, will } = syncHealthWillForPassives(state, newPassives, updatesToSave);

            if (grantedTempHp > health.temporaryHitPointsMax) {
                health.temporaryHitPoints = grantedTempHp;
                health.temporaryHitPointsMax = grantedTempHp;
                updatesToSave['temporary-hit-points'] = grantedTempHp;
                updatesToSave['temporary-hit-points-max'] = grantedTempHp;
            }

            updatesToSave['passives-data'] = JSON.stringify(newPassives);
            if (statusChanged) updatesToSave['status-list'] = JSON.stringify(newStatuses);

            try {
                saveToOwlbear(updatesToSave);
            } catch (error) {
                console.error('[PassivesSlice] Failed to save updated passive to Owlbear:', error);
            }
            return { passives: newPassives, health, will, ...(statusChanged ? { statuses: newStatuses } : {}) };
        }),

    removePassive: (id) =>
        set((state) => {
            const newPassives = state.passives.filter((p) => p.id !== id);
            const updatesToSave: Record<string, unknown> = { 'passives-data': JSON.stringify(newPassives) };
            const { health, will } = syncHealthWillForPassives(state, newPassives, updatesToSave);
            try {
                saveToOwlbear(updatesToSave);
            } catch (error) {
                console.error('[PassivesSlice] Failed to save removed passive to Owlbear:', error);
            }
            return { passives: newPassives, health, will };
        }),

    moveUpPassive: (id) =>
        set((state) => {
            const index = state.passives.findIndex((p) => p.id === id);
            if (index <= 0) return state;
            const newPassives = [...state.passives];
            [newPassives[index - 1], newPassives[index]] = [newPassives[index], newPassives[index - 1]];
            try {
                saveToOwlbear({ 'passives-data': JSON.stringify(newPassives) });
            } catch (error) {
                console.error('[PassivesSlice] Failed to save moved passive to Owlbear:', error);
            }
            return { passives: newPassives };
        }),

    moveDownPassive: (id) =>
        set((state) => {
            const index = state.passives.findIndex((p) => p.id === id);
            if (index < 0 || index >= state.passives.length - 1) return state;
            const newPassives = [...state.passives];
            [newPassives[index + 1], newPassives[index]] = [newPassives[index], newPassives[index + 1]];
            try {
                saveToOwlbear({ 'passives-data': JSON.stringify(newPassives) });
            } catch (error) {
                console.error('[PassivesSlice] Failed to save moved passive to Owlbear:', error);
            }
            return { passives: newPassives };
        })
});
