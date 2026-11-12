import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Item } from '@owlbear-rodeo/sdk';
import type { PcPokemonSummary } from '@/types/pcStorageTypes';

const {
    itemsChangeRef,
    itemsGetItemsMock,
    renderTokenGraphicsMock,
    harvestTokensItemArtMock,
    reconcileSceneTokensMock,
    extractLiveAccessoryBundlesMock,
    findMatchingTrainerEntriesMock,
    mockObr
} = vi.hoisted(() => {
    const itemsChangeRef: { cb: ((items: Item[]) => Promise<void> | void) | null } = { cb: null };
    const sceneIsReadyMock = vi.fn<() => Promise<boolean>>().mockResolvedValue(true);
    const itemsGetItemsMock = vi.fn<() => Promise<Item[]>>().mockResolvedValue([]);
    const renderTokenGraphicsMock = vi.fn().mockResolvedValue(undefined);
    const harvestTokensItemArtMock = vi.fn().mockResolvedValue(undefined);
    const reconcileSceneTokensMock = vi.fn().mockResolvedValue(undefined);
    const extractLiveAccessoryBundlesMock = vi.fn().mockReturnValue([]);
    const findMatchingTrainerEntriesMock = vi.fn().mockReturnValue([]);

    const mockObr = {
        isAvailable: true,
        isReady: true,
        scene: {
            isReady: sceneIsReadyMock,
            onReadyChange: vi.fn().mockReturnValue(() => {}),
            items: {
                getItems: itemsGetItemsMock,
                onChange: vi.fn((cb: (items: Item[]) => Promise<void> | void) => {
                    itemsChangeRef.cb = cb;
                    return () => {};
                }),
                deleteItems: vi.fn().mockResolvedValue(undefined)
            }
        }
    };

    return {
        itemsChangeRef,
        itemsGetItemsMock,
        renderTokenGraphicsMock,
        harvestTokensItemArtMock,
        reconcileSceneTokensMock,
        extractLiveAccessoryBundlesMock,
        findMatchingTrainerEntriesMock,
        mockObr
    };
});

vi.mock('@owlbear-rodeo/sdk', () => ({ default: mockObr }));
vi.mock('@/utils/graphics/graphicsManager', () => ({
    buildGraphicsFromMeta: vi.fn().mockReturnValue({}),
    renderTokenGraphics: renderTokenGraphicsMock,
    cleanupOrphanedGraphics: vi.fn().mockResolvedValue(undefined)
}));
vi.mock('@/utils/graphics/itemArtCatalog', () => ({
    harvestTokensItemArt: harvestTokensItemArtMock
}));
vi.mock('@/hooks/owlbearSync/reconcileSceneTokens', () => ({
    reconcileSceneTokens: reconcileSceneTokensMock
}));
vi.mock('@/utils/pc/pcAttachmentOps', () => ({
    extractLiveAccessoryBundles: extractLiveAccessoryBundlesMock,
    hasAttachmentDiff: vi.fn().mockReturnValue(false),
    sanitizeAttachmentBundles: vi.fn().mockReturnValue([])
}));
vi.mock('@/hooks/owlbearSync/owlbearPcSyncUtils', () => ({
    findMatchingTrainerEntries: findMatchingTrainerEntriesMock
}));

import { setupOwlbearTokenSync } from '@/hooks/owlbearSync/setupOwlbearTokenSync';
import { METADATA_ID } from '@/hooks/owlbearSync/owlbearSyncConstants';
import { useCharacterStore } from '@/store/useCharacterStore';

function makeCharacterToken(
    id: string,
    entityId: string,
    pos: { x: number; y: number },
    metaOverrides: Record<string, unknown> = {}
): Item {
    return {
        id,
        name: 'Pikachu',
        layer: 'CHARACTER',
        type: 'IMAGE',
        visible: true,
        locked: false,
        zIndex: 1,
        position: pos,
        rotation: 0,
        scale: { x: 1, y: 1 },
        createdUserId: 'gm-1',
        lastModified: new Date().toISOString(),
        metadata: {
            [METADATA_ID]: {
                entityId,
                species: 'Pikachu',
                mode: 'Trainer',
                'hp-curr': 8,
                'hp-max-display': 10,
                'will-curr': 3,
                'will-max-display': 4,
                'moves-data': '[{"name":"Thunderbolt"}]',
                lastModified: 5000,
                ...metaOverrides
            }
        }
    } as unknown as Item;
}

describe('setupOwlbearTokenSync drag & debounce optimizations', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.clearAllMocks();
        itemsChangeRef.cb = null;

        const summary: PcPokemonSummary = {
            entityId: 'ent-1',
            name: 'Pikachu',
            species: 'Pikachu',
            rank: 'Starter',
            type1: 'Electric',
            hp: 8,
            maxHp: 10,
            will: 3,
            maxWill: 4,
            isOnMap: true,
            mapTokenId: 'tok-1',
            lastModified: 4000
        };

        useCharacterStore.setState((s) => ({
            ...s,
            tokenId: 'tok-1',
            pcData: {
                ...s.pcData,
                activeCampaignId: 'camp-1',
                campaigns: {
                    'camp-1': {
                        id: 'camp-1',
                        name: 'Campaign',
                        activeTrainerId: '__none__',
                        trainers: {
                            'tr-1': {
                                id: 'tr-1',
                                name: 'Ash',
                                party: [],
                                fullMetadata: {}
                            }
                        },
                        boxes: []
                    }
                },
                pokemonSummaries: { 'ent-1': summary }
            }
        }));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('skips BFS attachment extraction, graphics rebuild, and trainer scan on pure position drags and debounces item art', async () => {
        const initialToken = makeCharacterToken('tok-1', 'ent-1', { x: 0, y: 0 });
        itemsGetItemsMock.mockResolvedValue([initialToken]);

        const sync = await setupOwlbearTokenSync({
            role: 'GM',
            syncSceneSettings: vi.fn().mockResolvedValue(undefined),
            resetSceneSyncState: vi.fn(),
            isMounted: () => true
        });

        expect(itemsChangeRef.cb).toBeTruthy();
        await vi.advanceTimersByTimeAsync(1500);
        vi.clearAllMocks();

        // Pure position drag across 3 rapid mousemove ticks (meta, scale, rotation, visible unchanged)
        const dragTick1 = makeCharacterToken('tok-1', 'ent-1', { x: 10, y: 20 });
        const dragTick2 = makeCharacterToken('tok-1', 'ent-1', { x: 25, y: 40 });
        const dragTick3 = makeCharacterToken('tok-1', 'ent-1', { x: 50, y: 80 });

        await itemsChangeRef.cb!([dragTick1]);
        await itemsChangeRef.cb!([dragTick2]);
        await itemsChangeRef.cb!([dragTick3]);

        expect(renderTokenGraphicsMock).not.toHaveBeenCalled();
        expect(extractLiveAccessoryBundlesMock).not.toHaveBeenCalled();
        expect(findMatchingTrainerEntriesMock).not.toHaveBeenCalled();
        expect(harvestTokensItemArtMock).not.toHaveBeenCalled();

        // After 800ms debounce, both harvestTokensItemArt and reconcileSceneTokens run once with fresh live items
        const freshAfterDrag = [makeCharacterToken('tok-1', 'ent-1', { x: 50, y: 80 })];
        itemsGetItemsMock.mockResolvedValueOnce(freshAfterDrag).mockResolvedValueOnce(freshAfterDrag);

        await vi.advanceTimersByTimeAsync(800);

        expect(itemsGetItemsMock).toHaveBeenCalledTimes(2);
        expect(harvestTokensItemArtMock).toHaveBeenCalledTimes(1);
        expect(harvestTokensItemArtMock).toHaveBeenCalledWith(freshAfterDrag);
        expect(reconcileSceneTokensMock).toHaveBeenCalledTimes(1);
        expect(reconcileSceneTokensMock).toHaveBeenCalledWith(freshAfterDrag, 'GM');

        sync.cleanup();
    });

    it('runs PC summary sync with parseCombatPoolsFromMeta (preserving 0) when metadata changes', async () => {
        const initialToken = makeCharacterToken('tok-1', 'ent-1', { x: 0, y: 0 });
        itemsGetItemsMock.mockResolvedValue([initialToken]);

        const sync = await setupOwlbearTokenSync({
            role: 'GM',
            syncSceneSettings: vi.fn().mockResolvedValue(undefined),
            resetSceneSyncState: vi.fn(),
            isMounted: () => true
        });

        vi.clearAllMocks();

        const damagedToken = makeCharacterToken('tok-1', 'ent-1', { x: 0, y: 0 }, {
            'hp-curr': 0,
            'will-curr': 0,
            lastModified: 6000
        });
        await itemsChangeRef.cb!([damagedToken]);

        expect(renderTokenGraphicsMock).toHaveBeenCalledTimes(1);
        expect(extractLiveAccessoryBundlesMock).toHaveBeenCalledTimes(1);
        expect(findMatchingTrainerEntriesMock).toHaveBeenCalledTimes(1);

        const updatedSummary = useCharacterStore.getState().pcData.pokemonSummaries['ent-1'];
        expect(updatedSummary.hp).toBe(0);
        expect(updatedSummary.will).toBe(0);

        sync.cleanup();
    });
});
