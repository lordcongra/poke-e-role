import { describe, it, expect, beforeEach } from 'vitest';
import { useCharacterStore } from '../useCharacterStore';
import { CombatStat } from '../../types/enums';

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

        it('recalculates health.hpMax when ruleset changes via updateRoomSetting or applyRoomSettings', () => {
            useCharacterStore.setState((state) => ({
                identity: {
                    ...state.identity,
                    rank: 'Starter',
                    ruleset: 'vg-vit-hp'
                },
                health: { ...state.health, hpBase: 4, hpCurr: 6, hpMax: 6 },
                stats: {
                    ...state.stats,
                    [CombatStat.VIT]: { ...state.stats[CombatStat.VIT], base: 2, rank: 0, buff: 0, debuff: 0 },
                    [CombatStat.INS]: { ...state.stats[CombatStat.INS], base: 5, rank: 0, buff: 0, debuff: 0 }
                }
            }));

            useCharacterStore.getState().updateRoomSetting('ruleset', 'vg-high-hp');
            expect(useCharacterStore.getState().health.hpMax).toBe(9);
            expect(useCharacterStore.getState().health.hpCurr).toBe(9);

            useCharacterStore.getState().applyRoomSettings({ ruleset: 'vg-vit-hp' });
            expect(useCharacterStore.getState().health.hpMax).toBe(6);
            expect(useCharacterStore.getState().health.hpCurr).toBe(6);
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

        it('updates top-level PcPokemonSummary.maxHp and maxWill when rank changes', () => {
            useCharacterStore.setState((state) => ({
                tokenId: 'ent-rank-sync',
                identity: {
                    ...state.identity,
                    entityId: 'ent-rank-sync',
                    nickname: 'Lucario',
                    species: 'Lucario',
                    rank: 'Master',
                    ruleset: 'vg-vit-hp'
                },
                health: { ...state.health, hpBase: 4, hpCurr: 10, hpMax: 10 },
                will: { ...state.will, willBase: 3, willCurr: 8, willMax: 8 },
                stats: {
                    ...state.stats,
                    [CombatStat.VIT]: { ...state.stats[CombatStat.VIT], base: 3, rank: 0, buff: 0, debuff: 0 },
                    [CombatStat.INS]: { ...state.stats[CombatStat.INS], base: 2, rank: 0, buff: 0, debuff: 0 }
                },
                pcData: {
                    ...state.pcData,
                    pokemonSummaries: {
                        'ent-rank-sync': {
                            entityId: 'ent-rank-sync',
                            name: 'Lucario',
                            species: 'Lucario',
                            rank: 'Master',
                            type1: 'Fighting',
                            hp: 10,
                            maxHp: 10,
                            will: 8,
                            maxWill: 8,
                            isOnMap: false,
                            fullMetadata: {
                                entityId: 'ent-rank-sync',
                                rank: 'Master',
                                'hp-max-display': 10,
                                'will-max-display': 8
                            },
                            lastModified: 1000
                        }
                    }
                }
            }));

            useCharacterStore.getState().setIdentity('rank', 'Ace');
            const updated = useCharacterStore.getState();
            const summary = updated.pcData.pokemonSummaries['ent-rank-sync'];

            expect(summary.rank).toBe('Ace');
            expect(summary.maxHp).toBe(updated.health.hpMax);
            expect(summary.maxWill).toBe(updated.will.willMax);
            expect(summary.fullMetadata?.['hp-max-display']).toBe(summary.maxHp);
            expect(summary.fullMetadata?.['will-max-display']).toBe(summary.maxWill);
        });

        it('resets rank cleanly to Starter when hydrating a fresh sheet via loadFromOwlbear', () => {
            useCharacterStore.getState().setIdentity('rank', 'Expert');
            expect(useCharacterStore.getState().identity.rank).toBe('Expert');

            useCharacterStore.getState().loadFromOwlbear({ nickname: 'New Sheet', parentId: null });
            expect(useCharacterStore.getState().identity.rank).toBe('Starter');
        });
    });
});

