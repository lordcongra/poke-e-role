import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Item } from '@owlbear-rodeo/sdk';
import type { PcPokemonSummary } from '@/types/pcStorageTypes';
import type { BattlefieldData } from '@/types/battleOrganizerTypes';

const {
    isBackupSceneMock,
    renderTokenGraphicsForMetaMock,
    sceneIsReadyMock,
    sceneGetMetadataMock,
    sceneOnMetadataChangeMock,
    itemsGetItemsMock,
    itemsDeleteItemsMock,
    itemsUpdateItemsMock,
    mockObr
} = vi.hoisted(() => {
    const isBackupSceneMock = vi.fn<() => Promise<boolean>>().mockResolvedValue(false);
    const renderTokenGraphicsForMetaMock = vi.fn().mockResolvedValue(undefined);
    const sceneIsReadyMock = vi.fn<() => Promise<boolean>>().mockResolvedValue(true);
    const sceneGetMetadataMock = vi.fn<() => Promise<Record<string, unknown>>>().mockResolvedValue({});
    const sceneOnMetadataChangeMock = vi.fn();
    const itemsGetItemsMock = vi.fn<() => Promise<Item[]>>().mockResolvedValue([]);
    const itemsDeleteItemsMock = vi.fn().mockResolvedValue(undefined);
    const itemsUpdateItemsMock = vi.fn().mockResolvedValue(undefined);
    const mockObr = {
        isAvailable: true,
        room: {
            getMetadata: vi.fn<() => Promise<Record<string, unknown>>>().mockResolvedValue({}),
            onMetadataChange: vi.fn().mockReturnValue(() => {}),
            setMetadata: vi.fn().mockResolvedValue(undefined)
        },
        scene: {
            isReady: sceneIsReadyMock,
            getMetadata: sceneGetMetadataMock,
            onMetadataChange: sceneOnMetadataChangeMock,
            items: { getItems: itemsGetItemsMock, deleteItems: itemsDeleteItemsMock, addItems: vi.fn().mockResolvedValue(undefined), updateItems: itemsUpdateItemsMock }
        },
        notification: { show: vi.fn() }
    };
    return { isBackupSceneMock, renderTokenGraphicsForMetaMock, sceneIsReadyMock, sceneGetMetadataMock, sceneOnMetadataChangeMock, itemsGetItemsMock, itemsDeleteItemsMock, itemsUpdateItemsMock, mockObr };
});

vi.mock('@owlbear-rodeo/sdk', () => ({ default: mockObr }));
vi.mock('@/utils/pc/pcBackupSceneSync', () => ({
    isBackupScene: isBackupSceneMock,
    syncBackupSceneTokens: vi.fn().mockResolvedValue(undefined)
}));
vi.mock('@/hooks/owlbearSync/setupOwlbearTokenSync', () => ({
    renderTokenGraphicsForMeta: renderTokenGraphicsForMetaMock,
    extractEntityId: (item: Item): string | undefined => {
        const meta = (item.metadata['pokerole-extension/stats'] || item.metadata['pokerole-pmd-extension/stats']) as
            | Record<string, unknown>
            | undefined;
        return (meta?.entityId as string | undefined) || (item.metadata['entityId'] as string | undefined);
    }
}));

import { reconcileSceneTokens } from '@/hooks/owlbearSync/reconcileSceneTokens';
import { setupOwlbearRoomSync } from '@/hooks/owlbearSync/setupOwlbearRoomSync';
import {
    METADATA_ID,
    BATTLEFIELD_META_ID,
    INITIATIVE_ACTIVE_META_KEY
} from '@/hooks/owlbearSync/owlbearSyncConstants';
import { useCharacterStore } from '@/store/useCharacterStore';

function makeToken(id: string, entityId: string, lastModified: number, overrides: Partial<Item> = {}): Item {
    return {
        id,
        name: 'Pikachu',
        layer: 'CHARACTER',
        type: 'IMAGE',
        visible: true,
        locked: false,
        zIndex: 1,
        position: { x: 0, y: 0 },
        rotation: 0,
        scale: { x: 1, y: 1 },
        createdUserId: 'gm-1',
        lastModified: new Date(lastModified).toISOString(),
        metadata: {
            [METADATA_ID]: { entityId, species: 'Pikachu', lastModified, 'hp-curr': 5, 'hp-max-display': 5 },
            'pokerole-pmd-extension/stats': { entityId, species: 'Pikachu', lastModified },
            entityId
        },
        ...overrides
    } as Item;
}

function makeSummary(entityId: string, overrides: Partial<PcPokemonSummary> = {}): PcPokemonSummary {
    return {
        entityId,
        name: 'Pikachu',
        species: 'Pikachu',
        rank: 'Starter',
        type1: 'Electric',
        hp: 5,
        maxHp: 5,
        will: 3,
        maxWill: 3,
        isOnMap: true,
        lastModified: 1000,
        ...overrides
    };
}

describe('reconcileSceneTokens & room/scene sync hardening', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        isBackupSceneMock.mockResolvedValue(false);
        sceneIsReadyMock.mockResolvedValue(true);
        useCharacterStore.setState((s) => ({
            ...s,
            pcData: { ...s.pcData, pokemonSummaries: {} }
        }));
    });

    it('deletes !isOnMap token only when sumLastMod > tokenLastMod, and re-links when tokenLastMod >= sumLastMod', async () => {
        const recalledSum = makeSummary('ent-recalled', { isOnMap: false, lastModified: 2000 });
        const relinkSum = makeSummary('ent-relink', { isOnMap: false, lastModified: 1000 });
        useCharacterStore.getState().updatePokemonSummary(recalledSum);
        useCharacterStore.getState().updatePokemonSummary(relinkSum);

        const recalledToken = makeToken('tok-old', 'ent-recalled', 1000);
        const newerToken = makeToken('tok-new', 'ent-relink', 1500);

        await reconcileSceneTokens([recalledToken, newerToken], 'GM');

        expect(itemsDeleteItemsMock).toHaveBeenCalledTimes(1);
        expect(itemsDeleteItemsMock).toHaveBeenCalledWith(['tok-old']);
        const updated = useCharacterStore.getState().pcData.pokemonSummaries['ent-relink'];
        expect(updated.isOnMap).toBe(true);
        expect(updated.mapTokenId).toBe('tok-new');
    });

    it('assigns fresh distinct UUIDs to cloned tokens without deleting them or rendering stale metadata', async () => {
        const sum = makeSummary('ent-dup', { isOnMap: true, mapTokenId: 'tok-primary', lastModified: 1000 });
        useCharacterStore.getState().updatePokemonSummary(sum);

        const primary = makeToken('tok-primary', 'ent-dup', 1000, { name: 'Sparky' });
        const cloneA = makeToken('tok-clone-a', 'ent-dup', 1000, { name: 'Sparky Copy 1' });
        const cloneB = makeToken('tok-clone-b', 'ent-dup', 1000, { name: 'Sparky Copy 2' });
        const sceneItems = [primary, cloneA, cloneB];

        itemsUpdateItemsMock.mockImplementation(async (ids: string[], updater: (items: Item[]) => void) => {
            updater(sceneItems.filter((item) => ids.includes(item.id)));
        });

        await reconcileSceneTokens(sceneItems, 'GM');

        expect(itemsDeleteItemsMock).not.toHaveBeenCalled();
        expect(itemsUpdateItemsMock).toHaveBeenCalledTimes(1);
        expect(renderTokenGraphicsForMetaMock).not.toHaveBeenCalled();

        const primaryId = (primary.metadata[METADATA_ID] as Record<string, unknown>).entityId;
        const cloneAId = (cloneA.metadata[METADATA_ID] as Record<string, unknown>).entityId as string;
        const cloneBId = (cloneB.metadata[METADATA_ID] as Record<string, unknown>).entityId as string;

        expect(primaryId).toBe('ent-dup');
        expect(cloneAId).not.toBe('ent-dup');
        expect(cloneBId).not.toBe('ent-dup');
        expect(cloneAId).not.toBe(cloneBId);
        expect((cloneA.metadata['pokerole-pmd-extension/stats'] as Record<string, unknown>).entityId).toBe(cloneAId);
        expect(cloneA.metadata['entityId']).toBe(cloneAId);
        expect(cloneA.name).toBe('Sparky Copy 1');
    });

    it('runs a trailing reconciliation with fresh items when called re-entrantly while isReconciling', async () => {
        let releaseBackupCheck: (val: boolean) => void = () => {};
        isBackupSceneMock.mockImplementationOnce(
            () =>
                new Promise<boolean>((resolve) => {
                    releaseBackupCheck = resolve;
                })
        );

        const trailingSum = makeSummary('ent-trail', { isOnMap: false, lastModified: 5000 });
        useCharacterStore.getState().updatePokemonSummary(trailingSum);
        const freshToken = makeToken('tok-trail', 'ent-trail', 1000);
        itemsGetItemsMock.mockResolvedValueOnce([freshToken]);

        const firstCall = reconcileSceneTokens([], 'GM');
        const reentrantCall = reconcileSceneTokens([], 'GM');
        await reentrantCall;

        expect(itemsGetItemsMock).not.toHaveBeenCalled();
        releaseBackupCheck(false);
        await firstCall;

        expect(itemsGetItemsMock).toHaveBeenCalledTimes(1);
        expect(itemsDeleteItemsMock).toHaveBeenCalledWith(['tok-trail']);
    });

    it('resets isInitiativeActive and activeBattlefield when keys are removed in syncSceneSettings and onMetadataChange', async () => {
        let sceneMetaListener: ((meta: Record<string, unknown>) => void) | null = null;
        sceneOnMetadataChangeMock.mockImplementation((cb: (meta: Record<string, unknown>) => void) => {
            sceneMetaListener = cb;
            return () => {};
        });

        const emptySide: BattlefieldData['playerSide'] = {
            forceFields: [{ name: 'None', remainingRounds: 0 }, { name: 'None', remainingRounds: 0 }],
            entryHazard: 'None',
            cover: 'None',
            other: 'None'
        };
        const battlefield: BattlefieldData = {
            location: 'Arena',
            weather: { name: 'Clear', remainingRounds: -1 },
            terrain: { name: 'Normal', remainingRounds: -1 },
            other: { name: 'None', remainingRounds: 0 },
            playerSide: emptySide,
            foeSide: emptySide,
            playerTargets: 1,
            foeTargets: 1,
            highlightedSide: 'all'
        };
        sceneGetMetadataMock.mockResolvedValue({
            [INITIATIVE_ACTIVE_META_KEY]: true,
            [BATTLEFIELD_META_ID]: battlefield
        });

        const onTokensNeedRender = vi.fn().mockResolvedValue(undefined);
        const roomSync = await setupOwlbearRoomSync('PLAYER', onTokensNeedRender);

        expect(useCharacterStore.getState().identity.isInitiativeActive).toBe(true);
        expect(useCharacterStore.getState().activeBattlefield).toEqual(battlefield);

        useCharacterStore.setState((s) => ({
            identity: { ...s.identity, roomTrackersRequireInitiative: true }
        }));
        sceneMetaListener!({});

        expect(useCharacterStore.getState().identity.isInitiativeActive).toBe(false);
        expect(useCharacterStore.getState().activeBattlefield).toBeNull();
        expect(onTokensNeedRender).toHaveBeenCalledWith(true);

        useCharacterStore.getState().setActiveBattlefield(battlefield);
        sceneGetMetadataMock.mockResolvedValue({});
        await roomSync.syncSceneSettings();

        expect(useCharacterStore.getState().activeBattlefield).toBeNull();
    });
});
