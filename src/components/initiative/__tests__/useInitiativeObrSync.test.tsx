import { act, useCallback, useRef, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useCharacterStore } from '@/store/useCharacterStore';
import { createTestCharacterState } from '@/test/testStateHelpers';
import { CombatStat, Skill } from '@/types/enums';
import type { Combatant } from '@/utils/combat/initiativeHelpers';

const mockGetLocalCharacters = vi.fn();

vi.mock('@/utils/sync/storageAdapter', () => ({
    isStandaloneMode: true,
    storageAdapter: {
        getLocalCharacters: (...args: unknown[]) => mockGetLocalCharacters(...args)
    }
}));

import { useInitiativeObrSync } from '../useInitiativeObrSync';

const noopSetLayout = vi.fn();
const noopSetShape = vi.fn();
const noopSetMaxWidth = vi.fn();
const noopSetMaxHeight = vi.fn();
const noopSetViewportMaxWidth = vi.fn();
const noopSetTheme = vi.fn();
const noopApplyDynamicColors = vi.fn();

interface HarnessProps {
    onCombatantsChange: (list: Combatant[]) => void;
}

function SyncHarness({ onCombatantsChange }: HarnessProps) {
    const [combatants, setCombatants] = useState<Combatant[]>([]);
    const [activeTurnId, setActiveTurnId] = useState<string | null>(null);
    const callbackRef = useRef(onCombatantsChange);
    callbackRef.current = onCombatantsChange;

    const trackedSetCombatants = useCallback<React.Dispatch<React.SetStateAction<Combatant[]>>>((updater) => {
        setCombatants((prev) => {
            const next = typeof updater === 'function' ? updater(prev) : updater;
            if (next !== prev) {
                callbackRef.current(next);
            }
            return next;
        });
    }, []);

    useInitiativeObrSync({
        combatants,
        setCombatants: trackedSetCombatants,
        activeTurnId,
        setActiveTurnId,
        setLayout: noopSetLayout,
        setShape: noopSetShape,
        setMaxTrackerWidth: noopSetMaxWidth,
        setMaxTrackerHeight: noopSetMaxHeight,
        setViewportMaxWidth: noopSetViewportMaxWidth,
        setTheme: noopSetTheme,
        applyDynamicColors: noopApplyDynamicColors
    });

    return null;
}

describe('useInitiativeObrSync (standalone loop safety)', () => {
    let container: HTMLDivElement;
    let root: Root;
    const baseStoreSnapshot = useCharacterStore.getState();

    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
    });

    afterEach(async () => {
        await act(async () => {
            root.unmount();
        });
        container.remove();
        useCharacterStore.setState(baseStoreSnapshot);
    });

    const flushAsyncEffects = async () => {
        await act(async () => {
            await Promise.resolve();
            await Promise.resolve();
        });
    };

    const seedStoreForChar = (charId: string, dexBase: number, tokenImageUrl: string, name: string) => {
        const currentStats = useCharacterStore.getState().stats;
        const testState = createTestCharacterState({
            tokenId: charId,
            identity: {
                nickname: name,
                species: name,
                tokenImageUrl
            },
            skills: {
                [Skill.ALERT]: { base: 0, buff: 0, customName: '' }
            }
        });
        testState.stats = {
            ...currentStats,
            [CombatStat.DEX]: { base: dexBase, rank: 0, buff: 0, debuff: 0, limit: 5 }
        };
        useCharacterStore.setState(testState);
    };

    it('does not loop when standalone store tokenImageUrl is default pokeball-token.svg and metadata has empty image', async () => {
        const charId = 'char-1';
        localStorage.setItem(
            'pkr_standalone_init_list',
            JSON.stringify([{ id: charId, name: 'Pikachu', image: '', d6: 0, baseInit: 3, total: 0, tiebreaker: 0 }])
        );
        mockGetLocalCharacters.mockResolvedValue([
            {
                id: charId,
                name: 'Pikachu',
                parentId: null,
                metadata: { nickname: 'Pikachu', 'dex-base': 3 }
            }
        ]);

        seedStoreForChar(charId, 3, '/poke-e-role/pokeball-token.svg', 'Pikachu');

        const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
        const onCombatantsChange = vi.fn();

        await act(async () => {
            root.render(<SyncHarness onCombatantsChange={onCombatantsChange} />);
        });
        await flushAsyncEffects();

        expect(onCombatantsChange).toHaveBeenCalledTimes(1);
        expect(onCombatantsChange.mock.calls[0][0][0].image).toBe('');
        const initUpdateDispatches = dispatchSpy.mock.calls.filter(
            ([evt]) => (evt as Event).type === 'pkr-standalone-init-update'
        );
        expect(initUpdateDispatches).toHaveLength(0);
    });

    it('does not loop when metadata has image.url while store tokenImageUrl is empty', async () => {
        const charId = 'char-2';
        localStorage.setItem(
            'pkr_standalone_init_list',
            JSON.stringify([
                {
                    id: charId,
                    name: 'Eevee',
                    image: 'https://example.com/eevee.png',
                    d6: 2,
                    baseInit: 2,
                    total: 4,
                    tiebreaker: 0
                }
            ])
        );
        mockGetLocalCharacters.mockResolvedValue([
            {
                id: charId,
                name: 'Eevee',
                parentId: null,
                metadata: {
                    nickname: 'Eevee',
                    'dex-base': 2,
                    image: { url: 'https://example.com/eevee.png' }
                }
            }
        ]);

        seedStoreForChar(charId, 2, '', 'Eevee');

        const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
        const onCombatantsChange = vi.fn();

        await act(async () => {
            root.render(<SyncHarness onCombatantsChange={onCombatantsChange} />);
        });
        await flushAsyncEffects();

        expect(onCombatantsChange).toHaveBeenCalledTimes(1);
        expect(onCombatantsChange.mock.calls[0][0][0].image).toBe('https://example.com/eevee.png');
        const initUpdateDispatches = dispatchSpy.mock.calls.filter(
            ([evt]) => (evt as Event).type === 'pkr-standalone-init-update'
        );
        expect(initUpdateDispatches).toHaveLength(0);
    });

    it('updates custom image once without ping-ponging even when local storage metadata is stale', async () => {
        const charId = 'char-3';
        localStorage.setItem(
            'pkr_standalone_init_list',
            JSON.stringify([
                { id: charId, name: 'Bulbasaur', image: '', d6: 0, baseInit: 2, total: 0, tiebreaker: 0 }
            ])
        );
        mockGetLocalCharacters.mockResolvedValue([
            {
                id: charId,
                name: 'Bulbasaur',
                parentId: null,
                metadata: { nickname: 'Bulbasaur', 'dex-base': 2 }
            }
        ]);

        seedStoreForChar(charId, 2, '/poke-e-role/pokeball-token.svg', 'Bulbasaur');

        const onCombatantsChange = vi.fn();
        await act(async () => {
            root.render(<SyncHarness onCombatantsChange={onCombatantsChange} />);
        });
        await flushAsyncEffects();

        expect(onCombatantsChange).toHaveBeenCalledTimes(1);

        // User sets a custom image before debounced save updates mockGetLocalCharacters
        await act(async () => {
            useCharacterStore.getState().setIdentity('tokenImageUrl', 'local-img:custom-99');
        });
        await flushAsyncEffects();

        expect(onCombatantsChange).toHaveBeenCalledTimes(2);
        expect(onCombatantsChange.mock.calls[1][0][0].image).toBe('local-img:custom-99');

        // External pkr-local-data-changed with stale metadata must not revert or loop
        await act(async () => {
            window.dispatchEvent(new Event('pkr-local-data-changed'));
        });
        await flushAsyncEffects();

        expect(onCombatantsChange).toHaveBeenCalledTimes(2);
    });
});
