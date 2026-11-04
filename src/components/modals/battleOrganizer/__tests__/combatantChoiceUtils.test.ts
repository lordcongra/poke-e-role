import { describe, it, expect } from 'vitest';
import type { CombatantRowData } from '../../../../types/battleOrganizerTypes';
import {
    getCombatantAbilityChoice,
    cycleCombatantAbilityChoice,
    createDefaultCombatant
} from '../battleOrganizerUtils';
import {
    DEFAULT_BO_SETTINGS,
    getBattleOrganizerSettings,
    saveBattleOrganizerSettings
} from '../battleOrganizerSettingsHelper';

function createMockCombatant(overrides: Partial<CombatantRowData> = {}): CombatantRowData {
    return {
        ...createDefaultCombatant('pory-1', 'Porygon-Z', false),
        status: 'Healthy',
        hpCurr: 10,
        hpMax: 10,
        ...overrides
    };
}

describe('combatantChoiceUtils & settings', () => {
    describe('getCombatantAbilityChoice', () => {
        it('returns hasChoice: false when ability has no choice tags', () => {
            const combatant = createMockCombatant({ ability: 'Overgrow' });
            const result = getCombatantAbilityChoice(combatant);
            expect(result.hasChoice).toBe(false);
            expect(result.choiceOptions).toEqual([]);
            expect(result.activeChoice).toBe('');
        });

        it('detects choice tags from known ability Download', () => {
            const combatant = createMockCombatant({ ability: 'Download' });
            const result = getCombatantAbilityChoice(combatant);
            expect(result.hasChoice).toBe(true);
            expect(result.choiceOptions.length).toBeGreaterThanOrEqual(2);
            expect(result.activeChoice).toBe(result.choiceOptions[0]);
        });

        it('detects custom abilityTags with [Choice: optA | optB]', () => {
            const combatant = createMockCombatant({
                ability: 'Custom Choice Ability',
                abilityTags: '[Choice: Alpha Mode | Beta Mode | Gamma Mode]',
                abilityChoiceIndex: 1
            });
            const result = getCombatantAbilityChoice(combatant);
            expect(result.hasChoice).toBe(true);
            expect(result.choiceOptions).toEqual(['Alpha Mode', 'Beta Mode', 'Gamma Mode']);
            expect(result.activeChoice).toBe('Beta Mode');
            expect(result.nextChoiceIndex).toBe(2);
        });
    });

    describe('cycleCombatantAbilityChoice', () => {
        it('cycles choice index through options and wraps around', () => {
            let combatant = createMockCombatant({
                ability: 'Custom',
                abilityTags: '[Choice: A | B | C]',
                abilityChoiceIndex: 0
            });

            combatant = cycleCombatantAbilityChoice(combatant);
            expect(combatant.abilityChoiceIndex).toBe(1);

            combatant = cycleCombatantAbilityChoice(combatant);
            expect(combatant.abilityChoiceIndex).toBe(2);

            combatant = cycleCombatantAbilityChoice(combatant);
            expect(combatant.abilityChoiceIndex).toBe(0);
        });

        it('returns unchanged combatant when no choice tag exists', () => {
            const combatant = createMockCombatant({ ability: 'Swift Swim' });
            const updated = cycleCombatantAbilityChoice(combatant);
            expect(updated).toBe(combatant);
        });
    });

    describe('Battle Organizer showCombatantChips setting', () => {
        it('defaults showCombatantChips to true', () => {
            expect(DEFAULT_BO_SETTINGS.showCombatantChips).toBe(true);
        });

        it('persists and retrieves showCombatantChips setting', () => {
            saveBattleOrganizerSettings({ showCombatantChips: false });
            expect(getBattleOrganizerSettings().showCombatantChips).toBe(false);

            saveBattleOrganizerSettings({ showCombatantChips: true });
            expect(getBattleOrganizerSettings().showCombatantChips).toBe(true);
        });
    });
});

