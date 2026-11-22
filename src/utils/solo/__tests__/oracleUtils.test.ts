import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
    getFateThresholds,
    rollFateCheck,
    rollEventFocus,
    rollActionWord,
    rollThemeWord,
    rollActionThemeCombo,
    rollPokemonPrompt,
    getStoredSoloOracleState,
    saveStoredSoloOracleState,
    SOLO_STORAGE_KEY,
    DEFAULT_SOLO_STATE
} from '../oracleUtils';
import { ACTION_WORDS, THEME_WORDS } from '@/data/soloOracleData';

describe('oracleUtils', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.restoreAllMocks();
    });

    describe('getFateThresholds', () => {
        it('calculates 50/50 odds at Chaos 5 correctly', () => {
            const { target, exceptionalYesThreshold, exceptionalNoThreshold } = getFateThresholds(0, 5);
            expect(target).toBe(50);
            expect(exceptionalYesThreshold).toBe(10);
            expect(exceptionalNoThreshold).toBe(91);
        });

        it('calculates Impossible (-4) at Chaos 1 correctly', () => {
            const { target, exceptionalYesThreshold, exceptionalNoThreshold } = getFateThresholds(-4, 1);
            expect(target).toBe(1);
            expect(exceptionalYesThreshold).toBeNull();
            expect(exceptionalNoThreshold).toBe(81);
        });

        it('calculates Certain (+4) at Chaos 9 correctly', () => {
            const { target, exceptionalYesThreshold, exceptionalNoThreshold } = getFateThresholds(4, 9);
            expect(target).toBe(99);
            expect(exceptionalYesThreshold).toBe(20);
            expect(exceptionalNoThreshold).toBeNull();
        });

        it('clamps out-of-range odds and chaos factors safely', () => {
            const under = getFateThresholds(-10, -5);
            expect(under.target).toBe(1); // -4 at Chaos 1

            const over = getFateThresholds(10, 15);
            expect(over.target).toBe(99); // +4 at Chaos 9
        });
    });

    describe('rollFateCheck', () => {
        it('returns Exceptional Yes when roll is below or equal to exceptionalYesThreshold', () => {
            // At 50/50, Chaos 5: target is 50, ey is 10, en is 91
            const result = rollFateCheck(0, 5, 8);
            expect(result.result).toBe('Exceptional Yes');
            expect(result.roll).toBe(8);
            expect(result.target).toBe(50);
            expect(result.isRandomEvent).toBe(false);
        });

        it('returns Yes when roll is above exceptionalYesThreshold but <= target', () => {
            const result = rollFateCheck(0, 5, 35);
            expect(result.result).toBe('Yes');
            expect(result.roll).toBe(35);
            expect(result.target).toBe(50);
        });

        it('returns No when roll is > target and < exceptionalNoThreshold', () => {
            const result = rollFateCheck(0, 5, 75);
            expect(result.result).toBe('No');
            expect(result.roll).toBe(75);
            expect(result.target).toBe(50);
        });

        it('returns Exceptional No when roll >= exceptionalNoThreshold', () => {
            const result = rollFateCheck(0, 5, 95);
            expect(result.result).toBe('Exceptional No');
            expect(result.roll).toBe(95);
        });

        it('triggers Random Event on matching doubles <= chaosFactor', () => {
            // Chaos 5: rolls 11, 22, 33, 44, 55 trigger Random Event
            const res22 = rollFateCheck(0, 5, 22);
            expect(res22.isRandomEvent).toBe(true);

            const res55 = rollFateCheck(0, 5, 55);
            expect(res55.isRandomEvent).toBe(true);

            // 66 has digit 6, which is > Chaos 5: no Random Event
            const res66 = rollFateCheck(0, 5, 66);
            expect(res66.isRandomEvent).toBe(false);

            // Non-double: no Random Event
            const res45 = rollFateCheck(0, 5, 45);
            expect(res45.isRandomEvent).toBe(false);
        });
    });

    describe('rollEventFocus', () => {
        it('correctly maps rolls across the Event Focus table brackets', () => {
            expect(rollEventFocus(5).entry.name).toBe('Remote Event');
            expect(rollEventFocus(15).entry.name).toBe('NPC Action');
            expect(rollEventFocus(30).entry.name).toBe('Introduce New NPC');
            expect(rollEventFocus(40).entry.name).toBe('Move Toward Thread');
            expect(rollEventFocus(50).entry.name).toBe('Move Away From Thread');
            expect(rollEventFocus(54).entry.name).toBe('Close Thread');
            expect(rollEventFocus(60).entry.name).toBe('PC Negative');
            expect(rollEventFocus(70).entry.name).toBe('PC Positive');
            expect(rollEventFocus(80).entry.name).toBe('Ambiguous Event');
            expect(rollEventFocus(88).entry.name).toBe('NPC Negative');
            expect(rollEventFocus(95).entry.name).toBe('NPC Positive');
        });
    });

    describe('Action and Theme rolls', () => {
        it('rolls valid action words and combo text', () => {
            const action = rollActionWord(1);
            expect(action.word).toBe(ACTION_WORDS[0]);

            const theme = rollThemeWord(1);
            expect(theme.word).toBe(THEME_WORDS[0]);

            const combo = rollActionThemeCombo(1, 2);
            expect(combo.actionWord).toBe(ACTION_WORDS[0]);
            expect(combo.themeWord).toBe(THEME_WORDS[1]);
            expect(combo.text).toBe(`${ACTION_WORDS[0]} + ${THEME_WORDS[1]}`);
        });
    });

    describe('rollPokemonPrompt', () => {
        it('retrieves correct entries for each prompt category', () => {
            const disp = rollPokemonPrompt('disposition', 1);
            expect(disp.category).toBe('disposition');
            expect(typeof disp.text).toBe('string');
            expect(disp.text.length).toBeGreaterThan(0);

            const twist = rollPokemonPrompt('twist', 1);
            expect(twist.category).toBe('twist');
            expect(typeof twist.text).toBe('string');

            const hazard = rollPokemonPrompt('hazard', 1);
            expect(hazard.category).toBe('hazard');

            const rumor = rollPokemonPrompt('rumor', 1);
            expect(rumor.category).toBe('rumor');

            const ruin = rollPokemonPrompt('ruin', 1);
            expect(ruin.category).toBe('ruin');
        });
    });

    describe('State Persistence', () => {
        it('returns default state when localStorage is empty or corrupt', () => {
            expect(getStoredSoloOracleState()).toEqual(DEFAULT_SOLO_STATE);

            localStorage.setItem(SOLO_STORAGE_KEY, 'corrupt-json{');
            expect(getStoredSoloOracleState()).toEqual(DEFAULT_SOLO_STATE);
        });

        it('saves and reads custom state', () => {
            const customState = {
                chaosFactor: 7,
                threads: ['Solve the Viridian Forest fire mystery', 'Find the missing Squirtle'],
                characters: ['Officer Jenny', 'Wild Arcanine'],
                lastFateCheck: null
            };

            saveStoredSoloOracleState(customState);
            const read = getStoredSoloOracleState();
            expect(read.chaosFactor).toBe(7);
            expect(read.threads).toHaveLength(2);
            expect(read.characters).toHaveLength(2);
        });
    });
});
