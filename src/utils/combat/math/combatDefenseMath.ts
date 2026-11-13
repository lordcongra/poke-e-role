import type { InventoryItem, PassiveItem } from '@/store/storeTypes';
import { useCharacterStore } from '@/store/useCharacterStore';
import { parseCombatTags } from '@/utils/tagParser/index';

export interface TargetDefensesResult {
    def: number;
    spd: number;
}

export const isMasterOrChampionRank = (rank: string): boolean => ['Master', 'Champion'].includes(rank);

export const getRankBonusStats = (rank: string) => {
    if (isMasterOrChampionRank(rank)) {
        return { hp: 3, will: 3, init: 3, def: 3, sdef: 3, skillDice: 2 };
    }
    return { hp: 0, will: 0, init: 0, def: 0, sdef: 0, skillDice: 0 };
};

/**
 * Calculates a target token's Defense (def) and Special Defense (spd)
 * directly from Owlbear Rodeo token metadata or nested character state.
 */
export function calculateTargetDefensesFromMeta(meta: Record<string, unknown>): TargetDefensesResult {
    const stateObj = (meta.state || meta) as Record<string, unknown>;
    const statsObj = (meta.stats || stateObj?.stats) as Record<string, Record<string, number>> | undefined;

    let inventory: InventoryItem[] = [];
    try {
        if (Array.isArray(meta.inventory)) {
            inventory = meta.inventory as InventoryItem[];
        } else if (Array.isArray(stateObj?.inventory)) {
            inventory = stateObj.inventory as InventoryItem[];
        } else if (meta['inv-data']) {
            inventory = JSON.parse(String(meta['inv-data']));
        }
    } catch (e) {
        console.warn('[CombatDefenseMath] Failed to parse inventory for target defenses:', e);
    }

    let passives: PassiveItem[] = [];
    try {
        if (Array.isArray(meta.passives)) {
            passives = meta.passives as PassiveItem[];
        } else if (Array.isArray(stateObj?.passives)) {
            passives = stateObj.passives as PassiveItem[];
        } else if (meta['passives-data']) {
            passives = JSON.parse(String(meta['passives-data']));
        }
    } catch (e) {
        console.warn('[CombatDefenseMath] Failed to parse passives for target defenses:', e);
    }

    const invMods = parseCombatTags(inventory, [], undefined, '', passives);

    let vitTotal = 2;
    let insTotal = 1;

    if (statsObj && typeof statsObj === 'object') {
        vitTotal = Math.max(
            1,
            (Number(statsObj.vit?.base) || 2) +
                (Number(statsObj.vit?.rank) || 0) +
                (Number(statsObj.vit?.buff) || 0) -
                (Number(statsObj.vit?.debuff) || 0) +
                (invMods.stats.vit || 0)
        );
        insTotal = Math.max(
            1,
            (Number(statsObj.ins?.base) || 1) +
                (Number(statsObj.ins?.rank) || 0) +
                (Number(statsObj.ins?.buff) || 0) -
                (Number(statsObj.ins?.debuff) || 0) +
                (invMods.stats.ins || 0)
        );
    } else {
        const getStatBase = (s: string) => Number(meta[`${s}-base`]) || (s === 'ins' ? 1 : 2);
        const getStatRank = (s: string) => Number(meta[`${s}-rank`]) || 0;
        const getStatBuff = (s: string) => Number(meta[`${s}-buff`]) || 0;
        const getStatDebuff = (s: string) => Number(meta[`${s}-debuff`]) || 0;

        vitTotal = Math.max(
            1,
            getStatBase('vit') +
                getStatRank('vit') +
                getStatBuff('vit') -
                getStatDebuff('vit') +
                (invMods.stats.vit || 0)
        );
        insTotal = Math.max(
            1,
            getStatBase('ins') +
                getStatRank('ins') +
                getStatBuff('ins') -
                getStatDebuff('ins') +
                (invMods.stats.ins || 0)
        );
    }

    const defBuff =
        Number(
            meta['def-buff'] ?? meta['defBuff'] ?? (stateObj?.derived as Record<string, number> | undefined)?.defBuff
        ) || 0;
    const defDebuff =
        Number(
            meta['def-debuff'] ??
                meta['defDebuff'] ??
                (stateObj?.derived as Record<string, number> | undefined)?.defDebuff
        ) || 0;
    const sdefBuff =
        Number(
            meta['spd-buff'] ?? meta['sdefBuff'] ?? (stateObj?.derived as Record<string, number> | undefined)?.sdefBuff
        ) || 0;
    const sdefDebuff =
        Number(
            meta['spd-debuff'] ??
                meta['sdefDebuff'] ??
                (stateObj?.derived as Record<string, number> | undefined)?.sdefDebuff
        ) || 0;

    const identityObj = (stateObj?.identity || meta.identity || {}) as Record<string, unknown>;
    const ruleset = useCharacterStore.getState().identity.ruleset || 'vg-vit-hp';
    const charRank = String(meta['rank'] || identityObj.rank || '');
    const rankDefBonus = getRankBonusStats(charRank).def;

    const def = Math.max(1, vitTotal + defBuff - defDebuff + invMods.def + rankDefBonus);
    let sdefBase = insTotal;
    if (ruleset === 'tabletop') sdefBase = vitTotal;
    const spd = Math.max(1, sdefBase + sdefBuff - sdefDebuff + invMods.spd + rankDefBonus);

    return { def, spd };
}

