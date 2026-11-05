import { describe, it, expect, beforeEach } from 'vitest';
import { useCharacterStore } from '../useCharacterStore';

describe('homebrew decomposition slices', () => {
    beforeEach(() => {
        useCharacterStore.setState({
            roomCustomTypes: [],
            roomCustomAbilities: [],
            roomCustomMoves: [],
            roomCustomPokemon: [],
            roomCustomItems: [],
            roomCustomForms: [],
            roomCustomStatuses: [],
            roomCustomFieldEffects: [],
            needsBackup: false,
            isHomebrewInitialized: true
        });
    });

    const createTestType = (name: string, color: string) => ({
        name,
        color,
        weaknesses: [],
        resistances: [],
        immunities: [],
        seAgainst: [],
        nveAgainst: [],
        noEffectAgainst: []
    });

    describe('Custom Types CRUD', () => {
        it('handles adding, updating, duplicating, and removing custom types', () => {
            const store = useCharacterStore.getState();

            store.addCustomType(createTestType('Cosmic', '#4B0082'));
            expect(useCharacterStore.getState().roomCustomTypes).toHaveLength(1);
            expect(useCharacterStore.getState().roomCustomTypes[0].name).toBe('Cosmic');

            // Duplicate prevention
            store.addCustomType(createTestType('cosmic', '#000000'));
            expect(useCharacterStore.getState().roomCustomTypes).toHaveLength(1);

            // Duplicate with copy naming
            store.duplicateCustomType('Cosmic');
            expect(useCharacterStore.getState().roomCustomTypes).toHaveLength(2);
            expect(useCharacterStore.getState().roomCustomTypes[1].name).toBe('Cosmic (Copy)');

            // Update
            store.updateCustomType('Cosmic', createTestType('Astral', '#6A0DAD'));
            expect(useCharacterStore.getState().roomCustomTypes[0].name).toBe('Astral');

            // Remove
            store.removeCustomType('Astral');
            expect(useCharacterStore.getState().roomCustomTypes).toHaveLength(1);
            expect(useCharacterStore.getState().roomCustomTypes[0].name).toBe('Cosmic (Copy)');
        });
    });

    describe('Custom Abilities & Identity Tags Sync', () => {
        it('handles ability operations and updates active identity abilityTags', () => {
            useCharacterStore.setState({
                identity: {
                    ...useCharacterStore.getState().identity,
                    ability: 'Solar Surge',
                    abilityTags: ''
                }
            });

            const store = useCharacterStore.getState();
            store.addCustomAbility();
            const created = useCharacterStore.getState().roomCustomAbilities[0];
            expect(created).toBeDefined();

            store.updateCustomAbility(created.id, 'name', 'Solar Surge');
            store.updateCustomAbility(created.id, 'description', 'Summons radiant sun.');
            store.updateCustomAbility(created.id, 'effect', 'Boosts fire damage.');

            expect(useCharacterStore.getState().identity.abilityTags).toContain('Boosts fire damage.');

            store.duplicateCustomAbility(created.id);
            expect(useCharacterStore.getState().roomCustomAbilities).toHaveLength(2);
            expect(useCharacterStore.getState().roomCustomAbilities[1].name).toBe('Solar Surge (Copy)');

            store.removeCustomAbility(created.id);
            expect(useCharacterStore.getState().roomCustomAbilities).toHaveLength(1);
        });
    });

    describe('Custom Moves & Items CRUD', () => {
        it('handles custom move lifecycle', () => {
            const store = useCharacterStore.getState();
            store.addCustomMove();
            expect(useCharacterStore.getState().roomCustomMoves).toHaveLength(1);

            const move = useCharacterStore.getState().roomCustomMoves[0];
            store.updateCustomMove(move.id, 'name', 'Meteor Smash');
            store.updateCustomMove(move.id, 'power', 4);
            expect(useCharacterStore.getState().roomCustomMoves[0].name).toBe('Meteor Smash');
            expect(useCharacterStore.getState().roomCustomMoves[0].power).toBe(4);

            store.duplicateCustomMove(move.id);
            expect(useCharacterStore.getState().roomCustomMoves).toHaveLength(2);
            expect(useCharacterStore.getState().roomCustomMoves[1].name).toBe('Meteor Smash (Copy)');

            store.removeCustomMove(move.id);
            expect(useCharacterStore.getState().roomCustomMoves).toHaveLength(1);
        });

        it('handles custom item lifecycle', () => {
            const store = useCharacterStore.getState();
            store.addCustomItem();
            expect(useCharacterStore.getState().roomCustomItems).toHaveLength(1);

            const item = useCharacterStore.getState().roomCustomItems[0];
            store.updateCustomItem(item.id, 'name', 'Star Wand');
            expect(useCharacterStore.getState().roomCustomItems[0].name).toBe('Star Wand');

            store.duplicateCustomItem(item.id);
            expect(useCharacterStore.getState().roomCustomItems).toHaveLength(2);
            expect(useCharacterStore.getState().roomCustomItems[1].name).toBe('Star Wand (Copy)');

            store.removeCustomItem(item.id);
            expect(useCharacterStore.getState().roomCustomItems).toHaveLength(1);
        });
    });

    describe('Custom Pokemon, Forms, Statuses, and Field Effects', () => {
        it('handles pokemon lifecycle and copy increments', () => {
            const store = useCharacterStore.getState();
            store.addCustomPokemon({ Name: 'Cosmog' });
            expect(useCharacterStore.getState().roomCustomPokemon[0].Name).toBe('Cosmog');

            const pkm = useCharacterStore.getState().roomCustomPokemon[0];
            store.duplicateCustomPokemon(pkm.id);
            expect(useCharacterStore.getState().roomCustomPokemon).toHaveLength(2);
            expect(useCharacterStore.getState().roomCustomPokemon[1].Name).toBe('Cosmog (Copy)');

            store.removeCustomPokemon(pkm.id);
            expect(useCharacterStore.getState().roomCustomPokemon).toHaveLength(1);
        });

        it('handles custom forms with template defaults', () => {
            const store = useCharacterStore.getState();
            store.addCustomForm('mega');
            expect(useCharacterStore.getState().roomCustomForms[0].name).toBe('New Mega Evolution');
            expect(useCharacterStore.getState().roomCustomForms[0].swapSkills).toBe(true);
            expect(useCharacterStore.getState().roomCustomForms[0].activationCostWill).toBe(1);

            const form = useCharacterStore.getState().roomCustomForms[0];
            store.duplicateCustomForm(form.id);
            expect(useCharacterStore.getState().roomCustomForms).toHaveLength(2);
            expect(useCharacterStore.getState().roomCustomForms[1].name).toBe('New Mega Evolution (Copy)');

            store.removeCustomForm(form.id);
            expect(useCharacterStore.getState().roomCustomForms).toHaveLength(1);
        });

        it('handles statuses and field effects', () => {
            const store = useCharacterStore.getState();
            store.addCustomStatus();
            expect(useCharacterStore.getState().roomCustomStatuses).toHaveLength(1);
            const status = useCharacterStore.getState().roomCustomStatuses[0];
            store.updateCustomStatus(status.id, 'name', 'Cursed');
            store.duplicateCustomStatus(status.id);
            expect(useCharacterStore.getState().roomCustomStatuses).toHaveLength(2);
            expect(useCharacterStore.getState().roomCustomStatuses[1].name).toBe('Cursed (Copy)');
            store.removeCustomStatus(status.id);
            expect(useCharacterStore.getState().roomCustomStatuses).toHaveLength(1);

            store.addCustomFieldEffect({ name: 'Solar Field' });
            expect(useCharacterStore.getState().roomCustomFieldEffects).toHaveLength(1);
            const effect = useCharacterStore.getState().roomCustomFieldEffects[0];
            store.duplicateCustomFieldEffect(effect.id);
            expect(useCharacterStore.getState().roomCustomFieldEffects).toHaveLength(2);
            expect(useCharacterStore.getState().roomCustomFieldEffects[1].name).toBe('Solar Field (Copy)');
            store.removeCustomFieldEffect(effect.id);
            expect(useCharacterStore.getState().roomCustomFieldEffects).toHaveLength(1);
        });
    });

    describe('Sync, Overwrite, and Merge Operations', () => {
        it('correctly handles payload sync and backup tracking', () => {
            const store = useCharacterStore.getState();
            store.addCustomType(createTestType('Cyber', '#00FFFF'));
            expect(useCharacterStore.getState().needsBackup).toBe(true);

            store.markHomebrewBackedUp();
            expect(useCharacterStore.getState().needsBackup).toBe(false);

            const payload = store.getHomebrewPayload();
            expect(payload.customTypes).toHaveLength(1);
            expect(payload.customTypes[0].name).toBe('Cyber');

            store.applyHomebrewSync({
                ...payload,
                customTypes: [createTestType('Light', '#FFFFE0')],
                needsBackup: false
            });
            expect(useCharacterStore.getState().roomCustomTypes[0].name).toBe('Light');
        });

        it('merges incoming data cleanly without duplicating by name', () => {
            const store = useCharacterStore.getState();
            store.addCustomType(createTestType('Sound', '#CCCCCC'));

            store.mergeCustomTypeData([
                createTestType('Sound', '#999999'),
                createTestType('Wood', '#8B4513')
            ]);

            const types = useCharacterStore.getState().roomCustomTypes;
            expect(types).toHaveLength(2);
            expect(types.find((t) => t.name === 'Sound')?.color).toBe('#999999');
            expect(types.find((t) => t.name === 'Wood')).toBeDefined();
        });
    });
});
