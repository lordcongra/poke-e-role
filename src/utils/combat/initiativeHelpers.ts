import { calculateBaseInitiative } from './combatMath';
import { hydrateStateFromMetadata } from '../sync/stateMapper';
import type { CharacterState } from '../../store/storeTypes';

export interface Combatant {
    id: string;
    entityId?: string;
    name: string;
    image: string;
    d6: number;
    baseInit: number;
    total: number;
    tiebreaker: number;
    hidden?: boolean;
    isNPC?: boolean;
}

export interface StoredCharacterData extends Partial<CharacterState> {
    [key: string]: unknown;
    state?: Partial<CharacterState>;
    'pokerole-extension/stats'?: Record<string, unknown>;
}

export function formatInitiativeDisplay(total: number, baseInit: number, tiebreaker: number = 0): string {
    if (total === 0) return '0';
    if (tiebreaker > 0) {
        return `${total}.${baseInit}${tiebreaker}`;
    }
    if (baseInit > 0) {
        return `${total}.${baseInit}`;
    }
    return String(total);
}

export function calculateEncodedInitiative(total: number, baseInit: number, tiebreaker: number = 0): number {
    if (total === 0) return 0;
    const decimalValue = total + baseInit / 100 + tiebreaker / 10000;
    return parseFloat(decimalValue.toFixed(4));
}

export function extractTokenImage(meta: Record<string, unknown> | null | undefined): string {
    if (!meta) return '';
    if (typeof meta['token-image-url'] === 'string' && meta['token-image-url']) return meta['token-image-url'];
    if (typeof meta['tokenImageUrl'] === 'string' && meta['tokenImageUrl']) return meta['tokenImageUrl'];

    // Check OBR Image object directly
    const itemImage = meta['image'] as { url?: string } | undefined;
    if (itemImage && typeof itemImage.url === 'string' && itemImage.url) {
        return itemImage.url;
    }

    const nestedStats = (meta['pokerole-extension/stats'] || meta['pokerole-pmd-extension/stats']) as
        | Record<string, unknown>
        | undefined;
    if (nestedStats) {
        if (typeof nestedStats['token-image-url'] === 'string' && nestedStats['token-image-url']) {
            return nestedStats['token-image-url'];
        }
        if (typeof nestedStats['tokenImageUrl'] === 'string' && nestedStats['tokenImageUrl']) {
            return nestedStats['tokenImageUrl'];
        }
    }

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

export function isDefaultPokeballImage(url: string | null | undefined): boolean {
    if (!url) return false;
    const trimmed = url.trim();
    return trimmed.endsWith('pokeball-token.svg') || trimmed.endsWith('pokeball.svg');
}

/**
 * Resolves the active standalone combatant image consistently with `extractTokenImage(meta)`.
 * Avoids replacing metadata-extracted or empty combatant images with the sheet's default
 * pokeball-token.svg placeholder, while still honoring custom images and explicit deletions.
 */
export function resolveActiveTokenImage(
    storeImage: string | null | undefined,
    fallbackImage: string | null | undefined,
    wasCleared: boolean = false
): string {
    if (wasCleared) return '';
    if (typeof storeImage === 'string' && storeImage && !isDefaultPokeballImage(storeImage)) {
        return storeImage;
    }
    return fallbackImage || '';
}

export function resolveActiveCombatantFields(
    store: CharacterState,
    fallback: { name: string; image: string },
    wasImageCleared: boolean = false
): { baseInit: number; image: string; name: string } {
    const baseInit = calculateBaseInitFromCharacterData(store, store);
    const image = resolveActiveTokenImage(store.identity?.tokenImageUrl, fallback.image, wasImageCleared);
    const name = store.identity?.nickname?.trim() || store.identity?.species?.trim() || fallback.name;
    return { baseInit, image, name };
}

export function areCombatantListsEqual(a: Combatant[], b: Combatant[]): boolean {
    if (a === b) return true;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
        const ca = a[i];
        const cb = b[i];
        if (
            ca.id !== cb.id ||
            ca.entityId !== cb.entityId ||
            ca.name !== cb.name ||
            ca.image !== cb.image ||
            ca.d6 !== cb.d6 ||
            ca.baseInit !== cb.baseInit ||
            ca.total !== cb.total ||
            ca.tiebreaker !== cb.tiebreaker ||
            ca.hidden !== cb.hidden ||
            ca.isNPC !== cb.isNPC
        ) {
            return false;
        }
    }
    return true;
}

export function extractIsNpc(meta: Record<string, unknown> | null | undefined, fallbackIsNpc?: boolean): boolean {
    if (fallbackIsNpc) return true;
    if (!meta) return false;

    // Direct metadata checks
    if (meta['is-npc'] === true || meta['is-npc'] === 'true') return true;
    if (meta['isNPC'] === true || meta['isNPC'] === 'true') return true;

    // Nested stats (v2 / v3 extensions)
    const nestedStats = (meta['pokerole-extension/stats'] || meta['pokerole-pmd-extension/stats']) as
        | Record<string, unknown>
        | undefined;
    if (nestedStats) {
        if (nestedStats['is-npc'] === true || nestedStats['is-npc'] === 'true') return true;
        if (nestedStats['isNPC'] === true || nestedStats['isNPC'] === 'true') return true;
    }

    // Nested state.identity (Zustand state shape)
    const stateObj = (meta.state || meta) as Record<string, unknown>;
    if (stateObj) {
        const identity = stateObj.identity as Record<string, unknown> | undefined;
        if (identity && (identity.isNPC === true || identity.isNPC === 'true')) {
            return true;
        }
        if (stateObj['is-npc'] === true || stateObj['is-npc'] === 'true') return true;
        if (stateObj['isNPC'] === true || stateObj['isNPC'] === 'true') return true;
    }

    // Deep JSON string fallback
    try {
        const str = JSON.stringify(meta);
        if (
            str.includes('"is-npc":true') ||
            str.includes('"is-npc":"true"') ||
            str.includes('"isNPC":true') ||
            str.includes('"isNPC":"true"')
        ) {
            return true;
        }
    } catch {}

    return false;
}

export function extractCharacterName(
    meta: Record<string, unknown> | null | undefined,
    fallbackName: string = 'Unknown'
): string {
    if (!meta) return fallbackName;

    const nestedStats = (meta['pokerole-extension/stats'] || meta['pokerole-pmd-extension/stats']) as
        | Record<string, unknown>
        | undefined;
    const stateObj = (meta.state || meta) as Record<string, unknown>;
    const identity = stateObj?.identity as Record<string, unknown> | undefined;

    // 1. Priority: Nickname
    if (typeof meta['nickname'] === 'string' && meta['nickname'].trim()) {
        return meta['nickname'].trim();
    }
    if (nestedStats && typeof nestedStats['nickname'] === 'string' && nestedStats['nickname'].trim()) {
        return nestedStats['nickname'].trim();
    }
    if (identity && typeof identity.nickname === 'string' && identity.nickname.trim()) {
        return identity.nickname.trim();
    }
    if (typeof stateObj['nickname'] === 'string' && stateObj['nickname'].trim()) {
        return stateObj['nickname'].trim();
    }

    // 2. Secondary Priority: Species (Pokémon default display name when no nickname is assigned)
    if (typeof meta['species'] === 'string' && meta['species'].trim()) {
        return meta['species'].trim();
    }
    if (nestedStats && typeof nestedStats['species'] === 'string' && nestedStats['species'].trim()) {
        return nestedStats['species'].trim();
    }
    if (identity && typeof identity.species === 'string' && identity.species.trim()) {
        return identity.species.trim();
    }
    if (typeof stateObj['species'] === 'string' && stateObj['species'].trim()) {
        return stateObj['species'].trim();
    }

    // 3. Tertiary: Generic character name in identity or flat metadata
    if (identity && typeof identity.name === 'string' && identity.name.trim()) {
        return identity.name.trim();
    }
    if (typeof meta['name'] === 'string' && meta['name'].trim()) {
        return meta['name'].trim();
    }
    if (nestedStats && typeof nestedStats['name'] === 'string' && nestedStats['name'].trim()) {
        return nestedStats['name'].trim();
    }

    // 4. Sledgehammer fallback for deeply nested JSON
    try {
        const str = JSON.stringify(meta);
        const matchNick = str.match(/"nickname":"([^"]+)"/);
        if (matchNick && matchNick[1]?.trim()) return matchNick[1].trim();

        const matchSpecies = str.match(/"species":"([^"]+)"/);
        if (matchSpecies && matchSpecies[1]?.trim()) return matchSpecies[1].trim();
    } catch (e) {
        console.warn('[InitiativeHelper] Failed to parse nickname/species fallback from meta JSON:', e);
    }

    // 5. Fallback name (e.g. token / item image name)
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

export interface InitiativeParticipant {
    id: string;
    name: string;
    baseInit: number;
    image?: string;
}

export interface ResolvedInitiativeResult {
    rolledCombatants: Combatant[];
    logSummary: string;
}

function buildShuffledD6Pool(excluded: Set<number>): number[] {
    const pool = [1, 2, 3, 4, 5, 6].filter((n) => !excluded.has(n));
    for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool;
}

/**
 * Resolves unique positive tiebreakers for a newly rolling combatant and existing
 * stalemate opponents. Preserves existing unique non-zero opponent tiebreakers,
 * repairs zero or duplicate opponent tiebreakers without collisions, and uses
 * deterministic integer fallbacks (7, 8, ...) if >6 combatants stalemate.
 */
export function resolveStalemateTiebreakers(
    _rollerId: string,
    existingOpponents: { id: string; tiebreaker?: number }[]
): {
    assignedTiebreaker: number;
    opponentTiebreakers: Record<string, number>;
} {
    const used = new Set<number>();
    const opponentTiebreakers: Record<string, number> = {};
    const needsAssignment: string[] = [];

    for (const opp of existingOpponents) {
        const existing = opp.tiebreaker;
        if (typeof existing === 'number' && Number.isFinite(existing) && existing > 0 && !used.has(existing)) {
            used.add(existing);
            opponentTiebreakers[opp.id] = existing;
        } else {
            needsAssignment.push(opp.id);
        }
    }

    const availablePool = buildShuffledD6Pool(used);
    let nextFallback = 7;
    const drawUnique = (): number => {
        if (availablePool.length > 0) {
            const drawn = availablePool.pop()!;
            used.add(drawn);
            return drawn;
        }
        while (used.has(nextFallback)) {
            nextFallback += 1;
        }
        used.add(nextFallback);
        return nextFallback;
    };

    const assignedTiebreaker = drawUnique();
    for (const oppId of needsAssignment) {
        opponentTiebreakers[oppId] = drawUnique();
    }

    return { assignedTiebreaker, opponentTiebreakers };
}

export function resolveInitiativeRolls(participants: InitiativeParticipant[]): ResolvedInitiativeResult {
    let logSummary = 'All Combatants Rolled Initiative:\n\n';

    const preliminaryCombatants: Combatant[] = participants.map((p) => {
        const rolledD6 = Math.floor(Math.random() * 6) + 1;
        const total = rolledD6 + p.baseInit;
        return {
            id: p.id,
            name: p.name,
            image: p.image || '',
            d6: rolledD6,
            baseInit: p.baseInit,
            total,
            tiebreaker: 0
        };
    });

    const stalemateGroups: Record<string, Combatant[]> = {};
    preliminaryCombatants.forEach((c) => {
        const key = `${c.total}_${c.baseInit}`;
        if (!stalemateGroups[key]) stalemateGroups[key] = [];
        stalemateGroups[key].push(c);
    });

    for (const group of Object.values(stalemateGroups)) {
        if (group.length <= 1) continue;
        const pool = buildShuffledD6Pool(new Set<number>());
        group.forEach((member, idx) => {
            member.tiebreaker = idx < pool.length ? pool[idx] : idx + 1;
        });
    }

    const finalCombatants: Combatant[] = preliminaryCombatants.map((c) => {
        const tiebreakerNote = c.tiebreaker > 0 ? ` (Tiebreaker: [${c.tiebreaker}])` : '';
        logSummary += `${c.name}: [${c.d6}] + Base ${c.baseInit} = ${c.total}${tiebreakerNote}\n`;
        return { ...c };
    });

    return {
        rolledCombatants: finalCombatants,
        logSummary
    };
}
