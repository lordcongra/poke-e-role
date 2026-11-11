import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadPcStorage, sanitizePcData } from '@/utils/pc/pcStorageAdapter';
import type { PcStorageData } from '@/types/pcStorageTypes';

const STORAGE_KEY = 'pkr_pc_storage_v1';

function buildSampleStorageData(): PcStorageData {
    return {
        activeCampaignId: 'camp-main',
        version: 1,
        campaigns: {
            'camp-main': {
                id: 'camp-main',
                name: 'Johto Run',
                activeTrainerId: 'trainer-1',
                trainers: {
                    'trainer-1': {
                        id: 'trainer-1',
                        name: 'Ethan',
                        party: ['mon-1', null, null, null, null, null],
                        boxes: [
                            {
                                id: 'box-1',
                                name: 'Box 1',
                                slots: Array(30).fill(null)
                            }
                        ],
                        fullMetadata: {
                            rank: 'Starter',
                            'vit-base': 1,
                            'hp-curr': 10,
                            'hp-max-display': 10,
                            'hp-base': 8,
                            'will-curr': 5,
                            'will-max-display': 5,
                            'will-base': 4
                        }
                    }
                },
                boxes: [{ id: 'camp-box-1', name: 'Box 1', slots: Array(30).fill(null) }],
                teamParty: Array(6).fill(null)
            }
        },
        pokemonSummaries: {
            'mon-1': {
                entityId: 'a0b92b6c-7399-4dc8-956d-7b29475c9cc1',
                trainerId: 'trainer-1',
                name: 'Porygon',
                species: 'Rotom-Fan',
                rank: 'Starter',
                type1: 'Electric',
                type2: 'Flying',
                hp: 10,
                maxHp: 10,
                will: 5,
                maxWill: 5,
                fullMetadata: {
                    species: 'Rotom-Fan',
                    nickname: 'Porygon',
                    type1: 'Electric',
                    type2: 'Flying',
                    ability: 'Levitate'
                }
            }
        }
    };
}

describe('pcStorageAdapter safety invariants', () => {
    const originalHref = typeof window !== 'undefined' ? window.location.href : 'http://localhost/';

    beforeEach(() => {
        localStorage.clear();
    });

    afterEach(() => {
        localStorage.clear();
        if (typeof window !== 'undefined') {
            window.history.replaceState({}, '', originalHref);
        }
    });

    it('does not wipe PC storage when ?reset-pc or #reset-pc appears in URL', async () => {
        const stored = buildSampleStorageData();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));

        window.history.replaceState({}, '', '/?reset-pc');
        const loadedFromSearch = await loadPcStorage();
        expect(loadedFromSearch.campaigns['camp-main']?.name).toBe('Johto Run');
        expect(loadedFromSearch.pokemonSummaries['mon-1']).toBeDefined();
        expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull();

        window.history.replaceState({}, '', '/#reset-pc');
        const loadedFromHash = await loadPcStorage();
        expect(loadedFromHash.campaigns['camp-main']?.name).toBe('Johto Run');
        expect(loadedFromHash.pokemonSummaries['mon-1']).toBeDefined();
    });

    it('preserves 10 HP / 5 Will on Starter trainers during sanitizePcData', () => {
        const data = buildSampleStorageData();
        const sanitized = sanitizePcData(data);
        const trainerMeta = sanitized.campaigns['camp-main'].trainers['trainer-1'].fullMetadata!;

        expect(trainerMeta['hp-curr']).toBe(10);
        expect(trainerMeta['hp-max-display']).toBe(10);
        expect(trainerMeta['hp-base']).toBe(8);
        expect(trainerMeta['will-curr']).toBe(5);
        expect(trainerMeta['will-max-display']).toBe(5);
        expect(trainerMeta['will-base']).toBe(4);
    });

    it('preserves a Rotom nicknamed Porygon without rewriting species or metadata', () => {
        const data = buildSampleStorageData();
        const sanitized = sanitizePcData(data);
        const summary = sanitized.pokemonSummaries['mon-1'];

        expect(summary.species).toBe('Rotom-Fan');
        expect(summary.name).toBe('Porygon');
        expect(summary.type1).toBe('Electric');
        expect(summary.type2).toBe('Flying');
        expect(summary.fullMetadata?.['species']).toBe('Rotom-Fan');
        expect(summary.fullMetadata?.['ability']).toBe('Levitate');
    });
});

