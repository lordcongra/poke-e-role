import type { StateCreator } from 'zustand';
import type {
    CharacterState,
    PokedexSlice,
    TrainerPokedexData,
    TrainerPokedexEntry
} from '../storeTypes';
import { saveToOwlbear, getIsRemoteSyncActive } from '../../utils/sync/obr';

function savePokedexToOwlbear(nextPokedex: TrainerPokedexData): void {
    if (!getIsRemoteSyncActive()) {
        try {
            saveToOwlbear({ 'pokedex-data': JSON.stringify(nextPokedex) });
        } catch (error) {
            console.error('[PokedexSlice] Failed to save pokedex update to Owlbear.', error);
        }
    }
}

export const createPokedexSlice: StateCreator<
    CharacterState,
    [['zustand/devtools', never]],
    [],
    PokedexSlice
> = (set) => ({
    setPokedexEntry: (name, entry: Partial<TrainerPokedexEntry> | null) =>
        set(
            (state) => {
                const cleanName = name.trim();
                if (!cleanName) return state;
                const lower = cleanName.toLowerCase();
                const nextPokedex: TrainerPokedexData = { ...(state.identity.pokedex ?? {}) };
                const existingKey = Object.keys(nextPokedex).find((k) => k.trim().toLowerCase() === lower);
                const targetKey = cleanName !== lower ? cleanName : existingKey || cleanName;

                if (entry === null) {
                    for (const k of Object.keys(nextPokedex)) {
                        if (k.trim().toLowerCase() === lower) {
                            delete nextPokedex[k];
                        }
                    }
                } else {
                    const current = (existingKey ? nextPokedex[existingKey] : undefined) ?? { seen: false };
                    const merged = { ...current, ...entry };
                    if (merged.caught) {
                        merged.seen = true;
                    }
                    if (!merged.seen && !merged.caught && !merged.shiny) {
                        delete nextPokedex[targetKey];
                    } else {
                        nextPokedex[targetKey] = merged;
                    }
                    for (const k of Object.keys(nextPokedex)) {
                        if (k.trim().toLowerCase() === lower && k !== targetKey) {
                            delete nextPokedex[k];
                        }
                    }
                }
                savePokedexToOwlbear(nextPokedex);
                return {
                    identity: { ...state.identity, pokedex: nextPokedex }
                };
            },
            false,
            'pokedex/setEntry'
        ),

    addPokedexEntry: (name, entry) =>
        set(
            (state) => {
                const cleanName = name.trim();
                if (!cleanName) return state;
                const lower = cleanName.toLowerCase();
                const nextPokedex: TrainerPokedexData = { ...(state.identity.pokedex ?? {}) };
                const existingKey = Object.keys(nextPokedex).find((k) => k.trim().toLowerCase() === lower);
                const targetKey = cleanName !== lower ? cleanName : existingKey || cleanName;
                const current = (existingKey ? nextPokedex[existingKey] : undefined) ?? { caught: false, shiny: false };
                nextPokedex[targetKey] = {
                    caught: false,
                    shiny: false,
                    ...current,
                    seen: true,
                    ...(entry ?? {})
                };
                for (const k of Object.keys(nextPokedex)) {
                    if (k.trim().toLowerCase() === lower && k !== targetKey) {
                        delete nextPokedex[k];
                    }
                }
                savePokedexToOwlbear(nextPokedex);
                return {
                    identity: { ...state.identity, pokedex: nextPokedex }
                };
            },
            false,
            'pokedex/addEntry'
        ),

    removePokedexEntry: (name) =>
        set(
            (state) => {
                const cleanLower = name.trim().toLowerCase();
                const nextPokedex: TrainerPokedexData = { ...(state.identity.pokedex ?? {}) };
                for (const k of Object.keys(nextPokedex)) {
                    if (k.trim().toLowerCase() === cleanLower) {
                        delete nextPokedex[k];
                    }
                }
                savePokedexToOwlbear(nextPokedex);
                return {
                    identity: { ...state.identity, pokedex: nextPokedex }
                };
            },
            false,
            'pokedex/removeEntry'
        ),

    togglePokedexSeen: (name) =>
        set(
            (state) => {
                const cleanName = name.trim();
                if (!cleanName) return state;
                const lower = cleanName.toLowerCase();
                const nextPokedex: TrainerPokedexData = { ...(state.identity.pokedex ?? {}) };
                const existingKey = Object.keys(nextPokedex).find((k) => k.trim().toLowerCase() === lower);
                const targetKey = cleanName !== lower ? cleanName : existingKey || cleanName;
                const current = existingKey ? nextPokedex[existingKey] : nextPokedex[targetKey];
                const nextSeen = !current?.seen;
                if (nextSeen) {
                    nextPokedex[targetKey] = { ...(current ?? {}), seen: true };
                } else {
                    nextPokedex[targetKey] = { ...(current ?? {}), seen: false, caught: false };
                }
                for (const k of Object.keys(nextPokedex)) {
                    if (k.trim().toLowerCase() === lower && k !== targetKey) {
                        delete nextPokedex[k];
                    }
                }
                savePokedexToOwlbear(nextPokedex);
                return {
                    identity: { ...state.identity, pokedex: nextPokedex }
                };
            },
            false,
            'pokedex/toggleSeen'
        ),

    togglePokedexCaught: (name) =>
        set(
            (state) => {
                const cleanName = name.trim();
                if (!cleanName) return state;
                const lower = cleanName.toLowerCase();
                const nextPokedex: TrainerPokedexData = { ...(state.identity.pokedex ?? {}) };
                const existingKey = Object.keys(nextPokedex).find((k) => k.trim().toLowerCase() === lower);
                const targetKey = cleanName !== lower ? cleanName : existingKey || cleanName;
                const current = existingKey ? nextPokedex[existingKey] : nextPokedex[targetKey];
                const nextCaught = !current?.caught;
                if (nextCaught) {
                    nextPokedex[targetKey] = { ...(current ?? {}), seen: true, caught: true };
                } else {
                    nextPokedex[targetKey] = { ...(current ?? { seen: true }), caught: false };
                }
                for (const k of Object.keys(nextPokedex)) {
                    if (k.trim().toLowerCase() === lower && k !== targetKey) {
                        delete nextPokedex[k];
                    }
                }
                savePokedexToOwlbear(nextPokedex);
                return {
                    identity: { ...state.identity, pokedex: nextPokedex }
                };
            },
            false,
            'pokedex/toggleCaught'
        ),

    togglePokedexShiny: (name) =>
        set(
            (state) => {
                const cleanName = name.trim();
                if (!cleanName) return state;
                const lower = cleanName.toLowerCase();
                const nextPokedex: TrainerPokedexData = { ...(state.identity.pokedex ?? {}) };
                const existingKey = Object.keys(nextPokedex).find((k) => k.trim().toLowerCase() === lower);
                const targetKey = cleanName !== lower ? cleanName : existingKey || cleanName;
                const current = existingKey ? nextPokedex[existingKey] : nextPokedex[targetKey];
                const nextShiny = !current?.shiny;
                if (nextShiny) {
                    nextPokedex[targetKey] = { ...(current ?? {}), seen: true, shiny: true };
                } else {
                    nextPokedex[targetKey] = { ...(current ?? {}), shiny: false };
                }
                for (const k of Object.keys(nextPokedex)) {
                    if (k.trim().toLowerCase() === lower && k !== targetKey) {
                        delete nextPokedex[k];
                    }
                }
                savePokedexToOwlbear(nextPokedex);
                return {
                    identity: { ...state.identity, pokedex: nextPokedex }
                };
            },
            false,
            'pokedex/toggleShiny'
        ),

    setPokedexBall: (name, ball) =>
        set(
            (state) => {
                const cleanName = name.trim();
                if (!cleanName) return state;
                const lower = cleanName.toLowerCase();
                const nextPokedex: TrainerPokedexData = { ...(state.identity.pokedex ?? {}) };
                const existingKey = Object.keys(nextPokedex).find((k) => k.trim().toLowerCase() === lower);
                const targetKey = cleanName !== lower ? cleanName : existingKey || cleanName;
                const current = existingKey ? nextPokedex[existingKey] : nextPokedex[targetKey];
                const cleanBall = ball?.trim();

                const updated: TrainerPokedexEntry = {
                    ...(current ?? {}),
                    seen: true,
                    caught: true,
                    ...(cleanBall ? { ball: cleanBall } : {})
                };
                if (!cleanBall) {
                    delete updated.ball;
                }
                nextPokedex[targetKey] = updated;

                for (const k of Object.keys(nextPokedex)) {
                    if (k.trim().toLowerCase() === lower && k !== targetKey) {
                        delete nextPokedex[k];
                    }
                }
                savePokedexToOwlbear(nextPokedex);
                return {
                    identity: { ...state.identity, pokedex: nextPokedex }
                };
            },
            false,
            'pokedex/setBall'
        )
});

