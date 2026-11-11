import { describe, it, expect } from 'vitest';
import { buildSummaryFromStore, hasSummaryStoreDrift } from '@/components/modals/pcStorage/pcSheetSyncUtils';
import { createTestCharacterState } from '@/test/testStateHelpers';
import type { PcPokemonSummary } from '@/types/pcStorageTypes';

describe('pcSheetSyncUtils', () => {
    it('buildSummaryFromStore keeps top-level maxHp/maxWill synced with store and fullMetadata', () => {
        const store = createTestCharacterState({
            identity: {
                entityId: 'ent-pc-1',
                nickname: '',
                species: 'Gallade',
                rank: 'Ace',
                type1: 'Psychic',
                type2: 'Fighting'
            },
            health: {
                hpCurr: 7,
                hpMax: 7,
                hpBase: 4,
                temporaryHitPoints: 0,
                temporaryHitPointsMax: 0
            },
            will: {
                willCurr: 5,
                willMax: 5,
                willBase: 3,
                temporaryWill: 0,
                temporaryWillMax: 0
            }
        });

        const staleSummary: PcPokemonSummary = {
            entityId: 'ent-pc-1',
            name: 'Gallade',
            species: 'Gallade',
            rank: 'Master',
            type1: 'Psychic',
            type2: 'Fighting',
            hp: 10,
            maxHp: 10,
            will: 8,
            maxWill: 8,
            isOnMap: false,
            fullMetadata: {
                entityId: 'ent-pc-1',
                rank: 'Master',
                'hp-max-display': 10,
                'will-max-display': 8
            },
            lastModified: 100
        };

        expect(hasSummaryStoreDrift(store, staleSummary)).toBe(true);

        const { updatedSummary, nextMeta } = buildSummaryFromStore(store, staleSummary);
        expect(updatedSummary.rank).toBe('Ace');
        expect(updatedSummary.hp).toBe(7);
        expect(updatedSummary.maxHp).toBe(7);
        expect(updatedSummary.will).toBe(5);
        expect(updatedSummary.maxWill).toBe(5);
        expect(nextMeta['hp-max-display']).toBe(7);
        expect(nextMeta['will-max-display']).toBe(5);
        expect(updatedSummary.fullMetadata?.['hp-max-display']).toBe(7);
        expect(updatedSummary.fullMetadata?.['will-max-display']).toBe(5);
        expect(hasSummaryStoreDrift(store, updatedSummary)).toBe(false);
    });

    it('hasSummaryStoreDrift detects stale top-level maxHp/maxWill even when fullMetadata updated', () => {
        const store = createTestCharacterState({
            identity: {
                entityId: 'ent-pc-2',
                nickname: '',
                species: 'Gardevoir',
                rank: 'Ace',
                type1: 'Psychic',
                type2: 'Fairy',
                tokenImageUrl: 'http://example.com/token.png'
            },
            health: {
                hpCurr: 7,
                hpMax: 7,
                hpBase: 4,
                temporaryHitPoints: 0,
                temporaryHitPointsMax: 0
            },
            will: {
                willCurr: 5,
                willMax: 5,
                willBase: 3,
                temporaryWill: 0,
                temporaryWillMax: 0
            }
        });

        const partialSummary: PcPokemonSummary = {
            entityId: 'ent-pc-2',
            name: 'Gardevoir',
            species: 'Gardevoir',
            rank: 'Ace',
            type1: 'Psychic',
            type2: 'Fairy',
            hp: 7,
            maxHp: 10,
            will: 5,
            maxWill: 8,
            tokenImageUrl: 'http://example.com/token.png',
            isOnMap: false,
            fullMetadata: {
                'hp-max-display': 7,
                'will-max-display': 5
            },
            lastModified: 100
        };

        expect(hasSummaryStoreDrift(store, partialSummary)).toBe(true);
    });
});

