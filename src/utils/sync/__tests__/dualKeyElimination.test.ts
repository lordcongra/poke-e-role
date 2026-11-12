import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Item } from '@owlbear-rodeo/sdk';
import type { PcPokemonSummary } from '@/types/pcStorageTypes';

const { updateItemsMock, mockObr } = vi.hoisted(() => {
    const updateItemsMock = vi.fn();
    const getRoleMock = vi.fn<() => Promise<'PLAYER' | 'GM'>>().mockResolvedValue('GM');

    // Simulate iframe context so storageAdapter.isStandaloneMode evaluates to false
    if (typeof window !== 'undefined') {
        Object.defineProperty(window, 'top', {
            value: {},
            configurable: true
        });
    }

    const mockObr = {
        isAvailable: true,
        isReady: true,
        onReady: vi.fn((cb: () => void) => cb()),
        player: {
            getRole: getRoleMock
        },
        scene: {
            items: {
                updateItems: updateItemsMock
            }
        }
    };

    return { updateItemsMock, mockObr };
});

vi.mock('@owlbear-rodeo/sdk', () => ({ default: mockObr }));
vi.mock('@/hooks/owlbearSync/setupOwlbearTokenSync', () => ({
    extractEntityId: (item: Item): string | undefined => {
        const meta = (item.metadata['pokerole-extension/stats'] || item.metadata['pokerole-pmd-extension/stats']) as
            | Record<string, unknown>
            | undefined;
        return (meta?.entityId as string | undefined) || (item.metadata['entityId'] as string | undefined);
    },
    renderTokenGraphicsForMeta: vi.fn().mockResolvedValue(undefined)
}));

import { storageAdapter, isStandaloneMode } from '@/utils/sync/storageAdapter';
import { hydrateActiveSheet } from '@/utils/sync/unifiedSheetHydration';
import { METADATA_ID } from '@/hooks/owlbearSync/owlbearSyncConstants';
import { useCharacterStore } from '@/store/useCharacterStore';

describe('Dual-key elimination & METADATA_ID exclusivity', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        useCharacterStore.setState((s) => ({
            ...s,
            tokenId: '',
            pcData: {
                ...s.pcData,
                pokemonSummaries: {}
            }
        }));
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('storageAdapter.saveCharacter writes exclusively to METADATA_ID and never creates pokerole-pmd-extension/stats', async () => {
        expect(isStandaloneMode).toBe(false);

        const item = {
            id: 'tok-modern',
            metadata: {}
        } as unknown as Item;

        updateItemsMock.mockImplementation(async (_ids: string[], updater: (items: Item[]) => void) => {
            updater([item]);
        });

        await storageAdapter.saveCharacter('tok-modern', { 'hp-curr': 0, species: 'Eevee' }, 'pokerole-pmd-extension/stats');

        expect(updateItemsMock).toHaveBeenCalledTimes(1);
        expect(item.metadata[METADATA_ID]).toEqual(
            expect.objectContaining({ 'hp-curr': 0, species: 'Eevee' })
        );
        expect(item.metadata['pokerole-pmd-extension/stats']).toBeUndefined();
    });

    it('storageAdapter.saveCharacter migrates legacy token fields into METADATA_ID without mutating legacy key', async () => {
        const legacySnapshot = { species: 'Vulpix', 'str-base': 3, 'hp-curr': 10 };
        const item = {
            id: 'tok-legacy',
            metadata: {
                'pokerole-pmd-extension/stats': { ...legacySnapshot }
            }
        } as unknown as Item;

        updateItemsMock.mockImplementation(async (_ids: string[], updater: (items: Item[]) => void) => {
            updater([item]);
        });

        await storageAdapter.saveCharacter('tok-legacy', { 'hp-curr': 4 }, METADATA_ID);

        expect(item.metadata[METADATA_ID]).toEqual(
            expect.objectContaining({
                species: 'Vulpix',
                'str-base': 3,
                'hp-curr': 4
            })
        );
        expect(item.metadata['pokerole-pmd-extension/stats']).toEqual(legacySnapshot);
    });

    it('hydrateActiveSheet retains dual-key read fallback and writes exclusively to METADATA_ID on saveIfNewer', async () => {
        const pcSummary: PcPokemonSummary = {
            entityId: 'ent-hydrate-1',
            name: 'Riolu',
            species: 'Riolu',
            rank: 'Starter',
            type1: 'Fighting',
            hp: 7,
            maxHp: 10,
            will: 4,
            maxWill: 4,
            isOnMap: true,
            lastModified: 9000,
            fullMetadata: {
                entityId: 'ent-hydrate-1',
                species: 'Riolu',
                'hp-curr': 7,
                'hp-max-display': 10,
                lastModified: 9000
            }
        };
        useCharacterStore.getState().updatePokemonSummary(pcSummary);

        const legacyToken = {
            id: 'tok-hydrate-1',
            name: 'Riolu',
            layer: 'CHARACTER',
            type: 'IMAGE',
            metadata: {
                'pokerole-pmd-extension/stats': {
                    entityId: 'ent-hydrate-1',
                    species: 'Riolu',
                    'hp-curr': 10,
                    lastModified: 1000
                }
            }
        } as unknown as Item;

        updateItemsMock.mockImplementation(async (_ids: string[], updater: (items: Item[]) => void) => {
            updater([legacyToken]);
        });

        const result = await hydrateActiveSheet({
            targetId: 'tok-hydrate-1',
            tokenItem: legacyToken,
            saveIfNewer: true,
            applyTheme: false,
            fetchSpecies: false
        });

        expect(result.source).toBe('pc_summary');
        expect(legacyToken.metadata[METADATA_ID]).toEqual(
            expect.objectContaining({ 'hp-curr': 7, species: 'Riolu' })
        );
        expect((legacyToken.metadata['pokerole-pmd-extension/stats'] as Record<string, unknown>)['hp-curr']).toBe(10);
    });

    it('hydrateActiveSheet uses parseCombatPoolsFromMeta preserving 0 values when live token is newer than PC summary', async () => {
        const pcSummary: PcPokemonSummary = {
            entityId: 'ent-zero-1',
            name: 'Lucario',
            species: 'Lucario',
            rank: 'Ace',
            type1: 'Fighting',
            hp: 12,
            maxHp: 12,
            will: 5,
            maxWill: 5,
            isOnMap: true,
            lastModified: 1000,
            fullMetadata: {
                entityId: 'ent-zero-1',
                species: 'Lucario',
                'hp-curr': 12,
                'hp-max-display': 12,
                lastModified: 1000
            }
        };
        useCharacterStore.getState().updatePokemonSummary(pcSummary);

        const liveToken = {
            id: 'tok-zero-1',
            name: 'Lucario',
            layer: 'CHARACTER',
            type: 'IMAGE',
            metadata: {
                [METADATA_ID]: {
                    entityId: 'ent-zero-1',
                    species: 'Lucario',
                    'hp-curr': 0,
                    'hp-max-display': 12,
                    'will-curr': 0,
                    'will-max-display': 5,
                    lastModified: 8000
                }
            }
        } as unknown as Item;

        const result = await hydrateActiveSheet({
            targetId: 'tok-zero-1',
            tokenItem: liveToken,
            applyTheme: false,
            fetchSpecies: false
        });

        expect(result.source).toBe('token_or_local');
        const updated = useCharacterStore.getState().pcData.pokemonSummaries['ent-zero-1'];
        expect(updated.hp).toBe(0);
        expect(updated.will).toBe(0);
    });
});
