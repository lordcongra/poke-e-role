import { calculateBaseInitiative } from './combatMath';
import { hydrateStateFromMetadata } from './stateMapper';
import type { CharacterState } from '../store/storeTypes';

export interface Combatant {
    id: string;
    name: string;
    image: string;
    d6: number;
    baseInit: number;
    total: number;
    tiebreaker: number;
}

export interface StoredCharacterData extends Partial<CharacterState> {
    [key: string]: unknown;
    state?: Partial<CharacterState>;
    'pokerole-extension/stats'?: Record<string, unknown>;
}

export function formatInitiativeDisplay(total: number, baseInit: number, tiebreaker: number = 0): string {
    if (total === 0 && baseInit === 0) return '0';
    if (tiebreaker > 0) {
        return `${total}.${baseInit}${tiebreaker}`;
    }
    if (baseInit > 0) {
        return `${total}.${baseInit}`;
    }
    return String(total);
}

export function calculateEncodedInitiative(total: number, baseInit: number, tiebreaker: number = 0): number {
    if (total === 0 && baseInit === 0) return 0;
    const decimalValue = total + baseInit / 100 + tiebreaker / 10000;
    return parseFloat(decimalValue.toFixed(4));
}

export function extractTokenImage(meta: Record<string, unknown> | null | undefined): string {
    if (!meta) return '';
    if (typeof meta['token-image-url'] === 'string' && meta['token-image-url']) return meta['token-image-url'];
    if (typeof meta['tokenImageUrl'] === 'string' && meta['tokenImageUrl']) return meta['tokenImageUrl'];

    const stateObj = (meta.state || meta) as Record<string, unknown>;
    if (stateObj) {
        const identity = stateObj.identity as Record<string, unknown> | undefined;
        if (identity && typeof identity.tokenImageUrl === 'string' && identity.tokenImageUrl) {
            return identity.tokenImageUrl;
        }
        if (typeof stateObj['token-image-url'] === 'string' && stateObj['token-image-url']) {
            return stateObj['token-image-url'];
        }
    }

    // Sledgehammer fallback: scan the raw JSON string just in case it is deeply nested
    try {
        const str = JSON.stringify(meta);
        const match1 = str.match(/"tokenImageUrl":"([^"]+)"/);
        if (match1 && match1[1]) return match1[1];
        const match2 = str.match(/"token-image-url":"([^"]+)"/);
        if (match2 && match2[1]) return match2[1];
    } catch (e) {
        console.warn('[InitiativeHelper] Regex image extraction fallback failed:', e);
    }

    return '';
}

export function extractCharacterName(
    meta: Record<string, unknown> | null | undefined,
    fallbackName: string = 'Unknown'
): string {
    if (!meta) return fallbackName;

    // 1. Direct nickname in flat metadata
    if (typeof meta['nickname'] === 'string' && meta['nickname'].trim()) {
        return meta['nickname'].trim();
    }

    // 2. Nickname in nested 'pokerole-pmd-extension/stats' or 'state'
    const nestedStats = meta['pokerole-pmd-extension/stats'] as Record<string, unknown> | undefined;
    if (nestedStats && typeof nestedStats['nickname'] === 'string' && nestedStats['nickname'].trim()) {
        return nestedStats['nickname'].trim();
    }

    const stateObj = (meta.state || meta) as Record<string, unknown>;
    if (stateObj) {
        const identity = stateObj.identity as Record<string, unknown> | undefined;
        if (identity && typeof identity.nickname === 'string' && identity.nickname.trim()) {
            return identity.nickname.trim();
        }
        if (typeof stateObj['nickname'] === 'string' && stateObj['nickname'].trim()) {
            return stateObj['nickname'].trim();
        }
        if (identity && typeof identity.name === 'string' && identity.name.trim()) {
            return identity.name.trim();
        }
    }

    // 3. Flat 'name' in metadata
    if (typeof meta['name'] === 'string' && meta['name'].trim()) {
        return meta['name'].trim();
    }

    // 4. Sledgehammer fallback for deeply nested JSON
    try {
        const str = JSON.stringify(meta);
        const matchNick = str.match(/"nickname":"([^"]+)"/);
        if (matchNick && matchNick[1]?.trim()) return matchNick[1].trim();
    } catch {}

    // 5. Fallback name (e.g. token / item name)
    return fallbackName;
}

export function calculateBaseInitFromCharacterData(
    data: CharacterState | StoredCharacterData | Record<string, unknown> | null | undefined,
    globalState: CharacterState
): number {
    if (!data) return 1;

    try {
        const charData = data as StoredCharacterData;

        // If charData contains a structured Zustand state or nested stats/skills, merge directly
        const statsObj = charData.stats || charData.state?.stats;
        if (statsObj && typeof statsObj === 'object') {
            const nestedState = (charData.state || charData) as Partial<CharacterState>;
            const characterState: CharacterState = {
                ...globalState,
                ...nestedState,
                stats: { ...globalState.stats, ...nestedState.stats },
                skills: { ...globalState.skills, ...nestedState.skills },
                inventory: nestedState.inventory || globalState.inventory,
                identity: { ...globalState.identity, ...nestedState.identity },
                extraCategories: nestedState.extraCategories || globalState.extraCategories
            };
            return calculateBaseInitiative(characterState);
        }

        let flatMeta: Record<string, unknown> = (data || {}) as Record<string, unknown>;
        if (charData['pokerole-extension/stats'] && typeof charData['pokerole-extension/stats'] === 'object') {
            flatMeta = charData['pokerole-extension/stats'] as Record<string, unknown>;
        }

        const partialState = hydrateStateFromMetadata(flatMeta, globalState);
        const characterState = { ...globalState, ...partialState } as CharacterState;

        return calculateBaseInitiative(characterState);
    } catch (e) {
        console.error('[InitiativeHelper] Error calculating base initiative:', e);
        return 1;
    }
}

export function sortCombatants(list: Combatant[]): Combatant[] {
    return [...list].sort((a, b) => {
        const aTotal = typeof a.total === 'number' ? a.total : 0;
        const bTotal = typeof b.total === 'number' ? b.total : 0;
        if (bTotal !== aTotal) return bTotal - aTotal;

        const aBase = typeof a.baseInit === 'number' ? a.baseInit : 0;
        const bBase = typeof b.baseInit === 'number' ? b.baseInit : 0;
        if (bBase !== aBase) return bBase - aBase;

        const aTie = typeof a.tiebreaker === 'number' ? a.tiebreaker : 0;
        const bTie = typeof b.tiebreaker === 'number' ? b.tiebreaker : 0;
        return bTie - aTie;
    });
}
