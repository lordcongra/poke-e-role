import { calculateStatTotal, calculateSkillTotal, getAbilityText, parseCombatTags } from './combatMath';
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
    state?: Partial<CharacterState>;
    'pokerole-extension/stats'?: Record<string, unknown>;
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

export function calculateBaseInitFromCharacterData(
    data: Record<string, unknown> | null | undefined,
    globalState: CharacterState
): number {
    if (!data) return 1;

    try {
        const charData = data as StoredCharacterData;

        const statsObj = charData.stats || charData.state?.stats;
        const skillsObj = charData.skills || charData.state?.skills;

        if (statsObj && typeof statsObj === 'object') {
            const dexBase = Number((statsObj as Record<string, any>).dex?.base) || 1;
            const dexRank = Number((statsObj as Record<string, any>).dex?.rank) || 0;
            const dexBuff = Number((statsObj as Record<string, any>).dex?.buff) || 0;
            const dexDebuff = Number((statsObj as Record<string, any>).dex?.debuff) || 0;
            const dexTotal = Math.max(1, dexBase + dexRank + dexBuff - dexDebuff);

            const alertBase = Number((skillsObj as Record<string, any>)?.alert?.base) || 0;
            const alertBuff = Number((skillsObj as Record<string, any>)?.alert?.buff) || 0;
            const alertTotal = Math.max(0, alertBase + alertBuff);

            let itemDexBuff = 0;
            let itemAlertBuff = 0;
            const inv = charData.inventory || charData.state?.inventory;

            if (Array.isArray(inv)) {
                const identityObj = (charData.identity || charData.state?.identity || {}) as Record<string, unknown>;
                const abilityText = getAbilityText(
                    (identityObj.ability as string) || '',
                    (charData.roomCustomAbilities as CharacterState['roomCustomAbilities']) ||
                        globalState.roomCustomAbilities ||
                        []
                );
                const itemBuffs = parseCombatTags(
                    inv,
                    (charData.extraCategories || []) as CharacterState['extraCategories'],
                    undefined,
                    abilityText
                );
                itemDexBuff = itemBuffs.stats['dex'] || 0;
                itemAlertBuff = itemBuffs.skills['alert'] || 0;
            }

            return Math.max(1, dexTotal + itemDexBuff) + Math.max(0, alertTotal + itemAlertBuff);
        }

        let flatMeta: Record<string, unknown> = data;
        if (charData['pokerole-extension/stats'] && typeof charData['pokerole-extension/stats'] === 'object') {
            flatMeta = charData['pokerole-extension/stats'] as Record<string, unknown>;
        }

        const partialState = hydrateStateFromMetadata(flatMeta, globalState);
        const characterState = { ...globalState, ...partialState } as CharacterState;

        const abilityText = getAbilityText(characterState.identity.ability, characterState.roomCustomAbilities);
        const itemBuffs = parseCombatTags(
            characterState.inventory,
            characterState.extraCategories,
            undefined,
            abilityText
        );

        const dex = calculateStatTotal('dex', characterState, itemBuffs);
        const alertSkill = calculateSkillTotal('alert', characterState, itemBuffs);

        return Math.max(1, dex) + Math.max(0, alertSkill);
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

        return (b.tiebreaker || 0) - (a.tiebreaker || 0);
    });
}
