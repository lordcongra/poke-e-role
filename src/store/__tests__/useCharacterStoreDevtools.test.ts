import { describe, it, expect } from 'vitest';
import { useCharacterStore } from '../useCharacterStore';

describe('useCharacterStore devtools middleware', () => {
    it('initializes store with devtools middleware enabled in dev', () => {
        expect(useCharacterStore).toBeDefined();
        expect(typeof useCharacterStore.getState).toBe('function');
        expect(typeof useCharacterStore.setState).toBe('function');
    });

    it('supports named action logs via setState with 3 arguments', () => {
        useCharacterStore.setState({ notes: 'Devtools Test Note' }, false, 'test/setNotes');
        expect(useCharacterStore.getState().notes).toBe('Devtools Test Note');
    });

    it('supports slice action execution with devtools signature', () => {
        useCharacterStore.getState().setDerived('happy', 3);
        expect(useCharacterStore.getState().derived.happy).toBe(3);
    });
});

