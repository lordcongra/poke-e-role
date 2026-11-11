import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import OBR from '@owlbear-rodeo/sdk';
import {
    METADATA_ID,
    getIsRemoteSyncActive,
    hasPendingUpdates,
    saveToOwlbear,
    setActiveTokenId,
    setIsRemoteSyncActive
} from '@/utils/sync/obr';
import { storageAdapter } from '@/utils/sync/storageAdapter';
import { EXCLUDED_FROM_TOKEN_SAVE } from '@/store/slices/identityConstants';
import { syncPcStorage } from '@/store/slices/identityUpdaters';
import { hasCharacterSheetChanged } from '@/components/modals/pcStorage/pcSheetSyncUtils';
import { resolveTargetCampaignId } from '@/hooks/owlbearSync/owlbearPcBroadcastOps';
import { useCharacterStore } from '@/store/useCharacterStore';
import { CombatStat } from '@/types/enums';
import { createTestCharacterState } from '@/test/testStateHelpers';
import type { PcStorageData } from '@/types/pcStorageTypes';

describe('Save Pipeline, Reducer Purity & Sync Invariants', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        setIsRemoteSyncActive(false);
        setActiveTokenId(null);
    });

    afterEach(() => {
        setIsRemoteSyncActive(false);
        setActiveTokenId(null);
        vi.restoreAllMocks();
        vi.useRealTimers();
    });

    it('buffers updates during remote sync and flushes when setIsRemoteSyncActive(false) is called', async () => {
        const saveSpy = vi.spyOn(storageAdapter, 'saveCharacter').mockResolvedValue(undefined);
        setActiveTokenId('tok-buffer-1');
        setIsRemoteSyncActive(true);
        expect(getIsRemoteSyncActive()).toBe(true);

        await saveToOwlbear({ 'hp-curr': 8 });
        await saveToOwlbear({ 'will-curr': 3 });

        vi.advanceTimersByTime(300);
        expect(saveSpy).not.toHaveBeenCalled();

        setIsRemoteSyncActive(false);
        expect(getIsRemoteSyncActive()).toBe(false);

        await vi.advanceTimersByTimeAsync(200);
        expect(saveSpy).toHaveBeenCalledTimes(1);
        expect(saveSpy).toHaveBeenCalledWith(
            'tok-buffer-1',
            expect.objectContaining({ 'hp-curr': 8, 'will-curr': 3 }),
            METADATA_ID
        );
    });

    it('flushes buffered remote updates automatically when remoteSyncTimer expires', async () => {
        const saveSpy = vi.spyOn(storageAdapter, 'saveCharacter').mockResolvedValue(undefined);
        setActiveTokenId('tok-buffer-2');
        setIsRemoteSyncActive(true, 100);

        await saveToOwlbear({ 'str-base': 4 });
        expect(saveSpy).not.toHaveBeenCalled();

        await vi.advanceTimersByTimeAsync(100);
        expect(getIsRemoteSyncActive()).toBe(false);

        await vi.advanceTimersByTimeAsync(200);
        expect(saveSpy).toHaveBeenCalledTimes(1);
        expect(saveSpy).toHaveBeenCalledWith(
            'tok-buffer-2',
            expect.objectContaining({ 'str-base': 4 }),
            METADATA_ID
        );
    });

    it('restores failed updates, notifies OBR, and dispatches pkr-save-error on storage failure', async () => {
        const error = new Error('Storage write failed');
        vi.spyOn(storageAdapter, 'saveCharacter').mockRejectedValueOnce(error).mockResolvedValueOnce(undefined);

        const origAvailable = OBR.isAvailable;
        const origShow = OBR.notification.show;
        const showSpy = vi.fn().mockResolvedValue('');
        Object.defineProperty(OBR, 'isAvailable', { value: true, configurable: true, writable: true });
        OBR.notification.show = showSpy;

        const errorEvents: CustomEvent[] = [];
        const onSaveError = (e: Event) => errorEvents.push(e as CustomEvent);
        window.addEventListener('pkr-save-error', onSaveError);

        try {
            setActiveTokenId('tok-fail-1');
            await saveToOwlbear({ 'hp-curr': 5 });

            await vi.advanceTimersByTimeAsync(200);

            expect(hasPendingUpdates()).toBe(true);
            expect(showSpy).toHaveBeenCalledWith('Failed to save character changes. Retrying...', 'WARNING');
            expect(errorEvents).toHaveLength(1);
            expect(errorEvents[0].detail).toEqual({ tokenToSave: 'tok-fail-1', error });

            // Subsequent edit merges with and retries the restored failed updates
            await saveToOwlbear({ 'will-curr': 2 });
            await vi.advanceTimersByTimeAsync(200);
            expect(hasPendingUpdates()).toBe(false);
        } finally {
            window.removeEventListener('pkr-save-error', onSaveError);
            Object.defineProperty(OBR, 'isAvailable', { value: origAvailable, configurable: true, writable: true });
            OBR.notification.show = origShow;
        }
    });

    it('coreSlice updates state cleanly and saves outside the Zustand reducer even when remote sync was active', async () => {
        const saveSpy = vi.spyOn(storageAdapter, 'saveCharacter').mockResolvedValue(undefined);
        setActiveTokenId('tok-core-1');
        setIsRemoteSyncActive(true);

        useCharacterStore.getState().setStat(CombatStat.STR, 'base', 4);
        expect(useCharacterStore.getState().stats[CombatStat.STR].base).toBe(4);

        setIsRemoteSyncActive(false);
        await vi.advanceTimersByTimeAsync(200);

        expect(saveSpy).toHaveBeenCalledWith(
            'tok-core-1',
            expect.objectContaining({ 'str-base': 4 }),
            METADATA_ID
        );
    });

    it('excludes cosmetic UI lock flags from token saves and PC summary sync', () => {
        for (const lockKey of ['coreLocked', 'socialLocked', 'hpLocked', 'willLocked']) {
            expect(EXCLUDED_FROM_TOKEN_SAVE.has(lockKey)).toBe(true);
        }

        const state = createTestCharacterState({
            tokenId: 'tok-lock-1',
            pcData: {
                activeCampaignId: 'camp-1',
                campaigns: {},
                pokemonSummaries: {
                    'tok-lock-1': {
                        entityId: 'tok-lock-1',
                        name: 'Pikachu',
                        species: 'Pikachu',
                        rank: 'Starter',
                        type1: 'Electric',
                        hp: 6,
                        maxHp: 6,
                        will: 4,
                        maxWill: 4,
                        lastModified: 1000
                    }
                },
                version: 1
            }
        });

        const nextPcData = syncPcStorage('coreLocked', false, state, {});
        expect(nextPcData).toBe(state.pcData);
        expect(nextPcData.pokemonSummaries['tok-lock-1'].lastModified).toBe(1000);

        const prevState = useCharacterStore.getState();
        useCharacterStore.getState().setIdentity('coreLocked', !prevState.identity.coreLocked);
        useCharacterStore.getState().setIdentity('socialLocked', !prevState.identity.socialLocked);
        useCharacterStore.getState().setIdentity('hpLocked', !prevState.identity.hpLocked);
        useCharacterStore.getState().setIdentity('willLocked', !prevState.identity.willLocked);
        const afterLocksState = useCharacterStore.getState();

        expect(afterLocksState.health).toBe(prevState.health);
        expect(afterLocksState.will).toBe(prevState.will);
        expect(hasCharacterSheetChanged(afterLocksState, prevState)).toBe(false);

        useCharacterStore.getState().setIdentity('nickname', 'Sparky');
        const afterNicknameState = useCharacterStore.getState();
        expect(hasCharacterSheetChanged(afterNicknameState, afterLocksState)).toBe(true);
    });

    it('resolveTargetCampaignId resolves explicit, room-designated, active, and fallback public campaigns', () => {
        const pcData: PcStorageData = {
            activeCampaignId: 'camp-private',
            campaigns: {
                'camp-private': {
                    id: 'camp-private',
                    name: 'Private',
                    activeTrainerId: '__none__',
                    trainers: {},
                    boxes: [],
                    isPrivate: true
                },
                'camp-room': {
                    id: 'camp-room',
                    name: 'Room Campaign',
                    activeTrainerId: '__none__',
                    trainers: {},
                    boxes: [],
                    isPrivate: false
                },
                'camp-public': {
                    id: 'camp-public',
                    name: 'Public Campaign',
                    activeTrainerId: '__none__',
                    trainers: {},
                    boxes: [],
                    isPrivate: false
                }
            },
            pokemonSummaries: {},
            version: 1
        };

        const baseIdentity = createTestCharacterState().identity;

        expect(resolveTargetCampaignId(pcData, baseIdentity, 'camp-public')).toBe('camp-public');
        expect(
            resolveTargetCampaignId(pcData, { ...baseIdentity, activeRoomCampaignId: 'camp-room' })
        ).toBe('camp-room');
        expect(resolveTargetCampaignId(pcData, { ...baseIdentity, activeRoomCampaignId: undefined })).toBe(
            'camp-room'
        );
    });
});

