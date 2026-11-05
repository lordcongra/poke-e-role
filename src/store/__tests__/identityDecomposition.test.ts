import { describe, it, expect, beforeEach } from 'vitest';
import { useCharacterStore } from '../useCharacterStore';

describe('identity decomposition slices', () => {
    beforeEach(() => {
        // Reset relevant identity state
        useCharacterStore.setState({
            identity: {
                ...useCharacterStore.getState().identity,
                nickname: 'Pikachu',
                species: 'Pikachu',
                pokedex: {},
                roomDefaultScale: 100,
                isInitiativeActive: false,
                sceneDefaultScale: null,
                sceneDefaultOffsetX: null,
                sceneDefaultOffsetY: null
            }
        });
    });

    describe('PokedexSlice', () => {
        it('adds, toggles, sets ball, and removes pokedex entries', () => {
            const store = useCharacterStore.getState();

            // addPokedexEntry
            store.addPokedexEntry('Bulbasaur', { seen: true, caught: false });
            let pokedex = useCharacterStore.getState().identity.pokedex;
            expect(pokedex['Bulbasaur']).toBeDefined();
            expect(pokedex['Bulbasaur'].seen).toBe(true);
            expect(pokedex['Bulbasaur'].caught).toBe(false);

            // togglePokedexCaught
            store.togglePokedexCaught('Bulbasaur');
            pokedex = useCharacterStore.getState().identity.pokedex;
            expect(pokedex['Bulbasaur'].caught).toBe(true);

            // setPokedexBall
            store.setPokedexBall('Bulbasaur', 'Ultra Ball');
            pokedex = useCharacterStore.getState().identity.pokedex;
            expect(pokedex['Bulbasaur'].ball).toBe('Ultra Ball');

            // togglePokedexShiny
            store.togglePokedexShiny('Bulbasaur');
            pokedex = useCharacterStore.getState().identity.pokedex;
            expect(pokedex['Bulbasaur'].shiny).toBe(true);

            // removePokedexEntry
            store.removePokedexEntry('Bulbasaur');
            pokedex = useCharacterStore.getState().identity.pokedex;
            expect(pokedex['Bulbasaur']).toBeUndefined();
        });
    });

    describe('RoomSettingsSlice', () => {
        it('applies and updates room settings and initiative state', () => {
            const store = useCharacterStore.getState();

            // updateRoomSetting
            store.updateRoomSetting('ruleset', 'classic');
            expect(useCharacterStore.getState().identity.ruleset).toBe('classic');

            // applyRoomSettings
            store.applyRoomSettings({ ruleset: 'vg-vit-hp', gmDemoMode: true });
            expect(useCharacterStore.getState().identity.ruleset).toBe('vg-vit-hp');
            expect(useCharacterStore.getState().identity.gmDemoMode).toBe(true);

            // setIsInitiativeActive
            store.setIsInitiativeActive(true);
            expect(useCharacterStore.getState().identity.isInitiativeActive).toBe(true);

            // setSceneScale
            store.setSceneScale(150);
            expect(useCharacterStore.getState().identity.sceneDefaultScale).toBe(150);

            // setSceneOffsets
            store.setSceneOffsets(20, -10);
            expect(useCharacterStore.getState().identity.sceneDefaultOffsetX).toBe(20);
            expect(useCharacterStore.getState().identity.sceneDefaultOffsetY).toBe(-10);
        });
    });

    describe('Core IdentitySlice', () => {
        it('updates identity fields and executes helper updaters', () => {
            const store = useCharacterStore.getState();

            // setIdentity
            store.setIdentity('nickname', 'Sparky');
            expect(useCharacterStore.getState().identity.nickname).toBe('Sparky');

            // setPrintConfig
            store.setPrintConfig({ compactMode: true });
            expect(useCharacterStore.getState().identity.printConfig.compactMode).toBe(true);

            // setTokenData
            store.setTokenData('token-123', 'PLAYER');
            expect(useCharacterStore.getState().tokenId).toBe('token-123');
        });
    });
});

