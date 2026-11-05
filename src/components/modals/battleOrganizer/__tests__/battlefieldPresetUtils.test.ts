import { describe, it, expect } from 'vitest';
import {
    applyForceFieldToSide,
    removeForceFieldFromSide
} from '../battlefieldPresetUtils';
import type { BattlefieldSideData } from '../../../../types/battleOrganizerTypes';

describe('battlefieldPresetUtils: force field management', () => {
    function createMockSide(): BattlefieldSideData {
        return {
            forceFields: [
                { name: '', remainingRounds: 0 },
                { name: '', remainingRounds: 0 }
            ],
            entryHazard: '',
            cover: '',
            other: ''
        };
    }

    it('applies force field to first empty slot', () => {
        const side = createMockSide();
        const updated = applyForceFieldToSide(side, 'Grassy Terrain', 4);
        expect(updated.forceFields[0]).toEqual({ name: 'Grassy Terrain', remainingRounds: 4 });
        expect(updated.forceFields[1]).toEqual({ name: '', remainingRounds: 0 });
    });

    it('removes matching force field from base slot and resets to empty', () => {
        let side = createMockSide();
        side = applyForceFieldToSide(side, 'Grassy Terrain', 4);
        expect(side.forceFields[0].name).toBe('Grassy Terrain');

        const cleaned = removeForceFieldFromSide(side, 'grassy');
        expect(cleaned.forceFields[0]).toEqual({ name: '', remainingRounds: 0 });
        expect(cleaned.forceFields[1]).toEqual({ name: '', remainingRounds: 0 });
    });

    it('removes matching force field from extraForceFields', () => {
        let side = createMockSide();
        side.forceFields = [
            { name: 'Reflect', remainingRounds: 3 },
            { name: 'Light Screen', remainingRounds: 3 }
        ];
        side.extraForceFields = [
            { name: 'Grassy Terrain', remainingRounds: 4 },
            { name: 'Safeguard', remainingRounds: 2 }
        ];

        const cleaned = removeForceFieldFromSide(side, 'grassy');
        expect(cleaned.forceFields[0].name).toBe('Reflect');
        expect(cleaned.forceFields[1].name).toBe('Light Screen');
        expect(cleaned.extraForceFields).toHaveLength(1);
        expect(cleaned.extraForceFields?.[0].name).toBe('Safeguard');
    });
});

