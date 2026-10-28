import type {
    InventoryItem,
    StatusItem,
    CustomStatus,
    CharacterHealth,
    CharacterWill,
    ActiveCombatBoost
} from '../../store/entityTypes';
import { getItemEffectiveCharges, getBaseItemCharges } from './itemCharges';
import { parseCombatBoostFromItem, hasCombatBoostTags } from './combatBoostParser';

import { type ItemEffectDefinition, BASE_ITEM_EFFECTS, getBaseItemEffect } from './baseItemEffects';

export type { ItemEffectDefinition };
export { BASE_ITEM_EFFECTS, getBaseItemEffect };

export interface ItemUsageResult {
    nextHealth: CharacterHealth;
    nextWill: CharacterWill;
    nextStatuses: StatusItem[];
    hpHealed: number;
    willHealed: number;
    tempHpGained: number;
    tempWillGained: number;
    curedStatusNames: string[];
    inflictedStatusNames: string[];
    permanentStatBoost?: { stat: string; value: number };
    permanentStatBoosts?: Array<{ stat: string; value: number }>;
    statBuff?: { stat: string; value: number };
    statBuffs?: Array<{ stat: string; value: number }>;
    statDebuff?: { stat: string; value: number };
    statDebuffs?: Array<{ stat: string; value: number }>;
    dungeonPassive?: string;
    dungeonPassives?: string[];
    combatBoost?: ActiveCombatBoost;
    summaryText: string;
}

/**
 * Detects whether a status item is a 1st, 2nd, or 3rd degree burn.
 */
export function getTargetBurnDegree(status: StatusItem): 1 | 2 | 3 | null {
    const raw = (status.name === 'Custom...' && status.customName ? status.customName : status.name)
        .trim()
        .toLowerCase();
    if (raw === '3rd degree burn' || raw.includes('3rd degree burn')) return 3;
    if (raw === '2nd degree burn' || raw.includes('2nd degree burn')) return 2;
    if (raw === '1st degree burn' || raw.includes('1st degree burn') || raw === 'burn') return 1;
    return null;
}

/**
 * Handles burn degree upgrading and infliction onto active statuses.
 */
export function applyBurnStacking(
    statuses: StatusItem[],
    inflictLower: string,
    inflictedNames: string[]
): StatusItem[] {
    const burnIdx = statuses.findIndex((s) => getTargetBurnDegree(s) !== null);
    const currentDegree = burnIdx !== -1 ? getTargetBurnDegree(statuses[burnIdx]) : null;

    let targetDegree: 1 | 2 | 3 | null = null;
    if (inflictLower === '1st degree burn' || inflictLower === 'burn') {
        targetDegree = currentDegree === 1 ? 2 : currentDegree === 2 ? 3 : currentDegree === 3 ? null : 1;
    } else if (inflictLower === '2nd degree burn') {
        targetDegree = currentDegree === 1 || currentDegree === 2 ? 3 : currentDegree === 3 ? null : 2;
    } else if (inflictLower === '3rd degree burn') {
        targetDegree = 3;
    }

    if (!targetDegree) return statuses;

    const burnName =
        targetDegree === 1 ? '1st Degree Burn' : targetDegree === 2 ? '2nd Degree Burn' : '3rd Degree Burn';
    if (burnIdx !== -1) {
        if (currentDegree !== targetDegree) {
            statuses[burnIdx] = { ...statuses[burnIdx], name: burnName, customName: '' };
            inflictedNames.push(burnName);
        }
        return statuses;
    }

    const filtered = statuses.filter((s) => s.name !== 'Healthy');
    filtered.push({ id: crypto.randomUUID(), name: burnName, customName: '', rounds: 0 });
    inflictedNames.push(burnName);
    return filtered;
}

/**
 * Checks whether an active status matches a given cure keyword or status name.
 */
export function statusMatchesCure(status: StatusItem, cure: string, customStatuses: CustomStatus[] = []): boolean {
    const sName = (status.name || '').trim().toLowerCase();
    const sCustom = (status.customName || '').trim().toLowerCase();
    const c = cure.trim().toLowerCase();

    if (sName === 'healthy') return false;

    if (c === 'all status' || c === 'all' || c === 'all statuses') {
        return sName !== 'fainted' && sCustom !== 'fainted';
    }

    if (c === 'burn') {
        return sName.includes('burn') || sCustom.includes('burn');
    }

    if (c === 'poison') {
        return sName.includes('poison') || sCustom.includes('poison');
    }

    if (c === 'paralysis' || c === 'paralyze') {
        return sName.includes('paraly') || sCustom.includes('paraly');
    }

    if (c === 'sleep') {
        return sName.includes('sleep') || sCustom.includes('sleep');
    }

    if (c === 'frozen solid' || c === 'freeze' || c === 'frozen') {
        return (
            sName.includes('frozen') ||
            sName.includes('freeze') ||
            sCustom.includes('frozen') ||
            sCustom.includes('freeze')
        );
    }

    if (c === 'fainted') {
        return sName === 'fainted' || sCustom === 'fainted';
    }

    // Direct name match for standard or custom status
    if (sName === c || sCustom === c) {
        return true;
    }

    // Check customStatuses registry
    const matchingCustom = customStatuses.find((cs) => cs.name.trim().toLowerCase() === c);
    if (matchingCustom) {
        const customNameLower = matchingCustom.name.trim().toLowerCase();
        if (sName === customNameLower || sCustom === customNameLower) {
            return true;
        }
    }

    return false;
}

/**
 * Checks whether an item's configured healHp reflects the legacy bug where
 * total bottle capacity was saved into healHp instead of the 1 HP per-charge heal.
 */
export function isLegacyBottleCapacity(item: { name?: string; healHp?: number; maxCharges?: number }): boolean {
    if (!item.name || typeof item.healHp !== 'number') return false;
    const baseEffect = getBaseItemEffect(item.name);
    const baseCharges = getBaseItemCharges(item.name);
    return Boolean(
        baseCharges !== undefined &&
        baseCharges > 1 &&
        baseEffect?.healHp === 1 &&
        (item.healHp === baseCharges || item.healHp === item.maxCharges)
    );
}

export const CORE_STATS = ['Strength', 'Dexterity', 'Vitality', 'Special', 'Insight'];
export const SOCIAL_STATS = ['Tough', 'Cool', 'Beauty', 'Cute', 'Clever'];

export function expandStatBoost(stat: string, value: number): Array<{ stat: string; value: number }> {
    const s = stat.trim();
    const sLower = s.toLowerCase();
    if (sLower === 'allcore' || sLower === 'all core' || sLower === 'all core attributes') {
        return CORE_STATS.map((name) => ({ stat: name, value }));
    }
    if (sLower === 'allsocial' || sLower === 'all social' || sLower === 'all social attributes') {
        return SOCIAL_STATS.map((name) => ({ stat: name, value }));
    }
    if (sLower === 'allattributes' || sLower === 'all attributes') {
        return [...CORE_STATS, ...SOCIAL_STATS].map((name) => ({ stat: name, value }));
    }
    return [{ stat: s, value }];
}

/**
 * Pure function that calculates HP healing, Will restoration, and status cures
 * for an item usage event.
 */
export function applyItemUsageEffects(
    item: InventoryItem,
    currentHealth: CharacterHealth,
    currentWill: CharacterWill,
    currentStatuses: StatusItem[],
    customStatuses: CustomStatus[] = [],
    options?: { chosenStat?: string }
): ItemUsageResult {
    const baseEffect = getBaseItemEffect(item.name || '');
    const healHpAmount = isLegacyBottleCapacity(item) ? 1 : (item.healHp ?? baseEffect?.healHp ?? 0);
    const healWillAmount = item.healWill ?? baseEffect?.healWill ?? 0;
    const curesList = item.cures ?? baseEffect?.cures ?? [];
    const tempHpGain = item.gainTempHp ?? baseEffect?.gainTempHp ?? 0;
    const tempWillGain = item.gainTempWill ?? baseEffect?.gainTempWill ?? 0;
    const inflictsList = item.inflictsStatus ?? baseEffect?.inflictsStatus ?? [];
    const combatBoost = parseCombatBoostFromItem(item);

    // --- RESOLVE MULTIPLE BUFFS / DEBUFFS / PERMANENT BOOSTS / PASSIVES ---
    const resolvedBuffs: Array<{ stat: string; value: number }> = [];
    if (Array.isArray(item.statBuffs) && item.statBuffs.length > 0) {
        resolvedBuffs.push(...item.statBuffs);
    } else if (item.statBuff) {
        resolvedBuffs.push(item.statBuff);
    } else if (baseEffect?.statBuff) {
        resolvedBuffs.push(baseEffect.statBuff);
    }

    const resolvedDebuffs: Array<{ stat: string; value: number }> = [];
    if (Array.isArray(item.statDebuffs) && item.statDebuffs.length > 0) {
        resolvedDebuffs.push(...item.statDebuffs);
    } else if (item.statDebuff) {
        resolvedDebuffs.push(item.statDebuff);
    } else if (baseEffect?.statDebuff) {
        resolvedDebuffs.push(baseEffect.statDebuff);
    }

    const resolvedPermBoosts: Array<{ stat: string; value: number }> = [];
    const rawPermList =
        Array.isArray(item.permanentStatBoosts) && item.permanentStatBoosts.length > 0
            ? item.permanentStatBoosts
            : item.permanentStatBoost
              ? [item.permanentStatBoost]
              : baseEffect?.permanentStatBoost
                ? [baseEffect.permanentStatBoost]
                : [];

    for (const b of rawPermList) {
        const isPlayerChoice =
            b.stat === 'PlayerChoice' ||
            b.stat.startsWith('PlayerChoice:') ||
            b.stat.toLowerCase().startsWith('playerchoice') ||
            b.stat.toLowerCase() === 'player choice';
        const resolvedStat = isPlayerChoice ? options?.chosenStat || 'Strength' : b.stat;
        resolvedPermBoosts.push(...expandStatBoost(resolvedStat, b.value));
    }

    const resolvedPassives: string[] = [];
    if (Array.isArray(item.dungeonPassives) && item.dungeonPassives.length > 0) {
        resolvedPassives.push(...item.dungeonPassives);
    } else if (item.dungeonPassive) {
        resolvedPassives.push(item.dungeonPassive);
    } else if (baseEffect?.dungeonPassive) {
        resolvedPassives.push(baseEffect.dungeonPassive);
    }

    // Extract bracketed tags: [Buff: <stat> +X], [Debuff: <stat> -X], [Permanent: <stat> +X], [Grant Passive: <text>]
    const fullText = `${item.tags || ''} ${item.desc || ''} ${(item as unknown as { description?: string }).description || ''}`;

    const buffMatches = fullText.matchAll(/\[Buff:\s*([^+\d\]]+?)\s*\+?(\d+)\]/gi);
    for (const m of buffMatches) {
        const stat = m[1].trim();
        const value = parseInt(m[2], 10);
        if (stat && !isNaN(value)) {
            if (!resolvedBuffs.some((b) => b.stat.toLowerCase() === stat.toLowerCase() && b.value === value)) {
                resolvedBuffs.push({ stat, value });
            }
        }
    }

    const debuffMatches = fullText.matchAll(/\[Debuff:\s*([^-\d\]]+?)\s*-?(\d+)\]/gi);
    for (const m of debuffMatches) {
        const stat = m[1].trim();
        const value = parseInt(m[2], 10);
        if (stat && !isNaN(value)) {
            if (!resolvedDebuffs.some((d) => d.stat.toLowerCase() === stat.toLowerCase() && d.value === value)) {
                resolvedDebuffs.push({ stat, value });
            }
        }
    }

    const permMatches = fullText.matchAll(/\[Permanent:\s*([^+\d\]]+?)\s*\+?(\d+)\]/gi);
    for (const m of permMatches) {
        let stat = m[1].trim();
        const value = parseInt(m[2], 10);
        if (stat && !isNaN(value)) {
            const isPlayerChoice =
                stat === 'PlayerChoice' ||
                stat.startsWith('PlayerChoice:') ||
                stat.toLowerCase().startsWith('playerchoice') ||
                stat.toLowerCase() === 'player choice';
            if (isPlayerChoice) {
                stat = options?.chosenStat || 'Strength';
            }
            const expanded = expandStatBoost(stat, value);
            for (const itemBoost of expanded) {
                if (
                    !resolvedPermBoosts.some(
                        (p) => p.stat.toLowerCase() === itemBoost.stat.toLowerCase() && p.value === itemBoost.value
                    )
                ) {
                    resolvedPermBoosts.push(itemBoost);
                }
            }
        }
    }

    const grantMatches = fullText.matchAll(/\[Grant Passive:\s*([^\]]+)\]/gi);
    for (const m of grantMatches) {
        const text = m[1].trim();
        if (text && !resolvedPassives.some((p) => p.toLowerCase() === text.toLowerCase())) {
            resolvedPassives.push(text);
        }
    }

    const statBuff = resolvedBuffs[0];
    const statDebuff = resolvedDebuffs[0];
    const permanentStatBoost = resolvedPermBoosts[0];
    const dungeonPassive = resolvedPassives[0];

    // --- HP HEALING ---
    const currentHp = currentHealth.hpCurr ?? currentHealth.currentHitPoints ?? 0;
    const maxHp = currentHealth.hpMax ?? currentHealth.maxHitPoints ?? 0;

    let targetHp = currentHp;
    if (healHpAmount >= 99) {
        targetHp = maxHp;
    } else if (healHpAmount > 0) {
        targetHp = Math.min(maxHp, currentHp + healHpAmount);
    }
    const hpHealed = Math.max(0, targetHp - currentHp);

    // --- TEMP HP ---
    let tempHpGained = 0;
    let nextTempHp = currentHealth.temporaryHitPoints ?? 0;
    let nextTempHpMax = currentHealth.temporaryHitPointsMax ?? nextTempHp;
    if (tempHpGain > 0) {
        tempHpGained = tempHpGain;
        nextTempHp += tempHpGain;
        nextTempHpMax = Math.max(nextTempHpMax, nextTempHp);
    }

    const nextHealth: CharacterHealth = {
        ...currentHealth,
        hpCurr: targetHp,
        hpMax: maxHp,
        currentHitPoints: targetHp,
        maxHitPoints: maxHp,
        temporaryHitPoints: nextTempHp,
        temporaryHitPointsMax: nextTempHpMax
    };

    // --- WILL RESTORATION ---
    const currentWillVal = currentWill.willCurr ?? 0;
    const maxWill = currentWill.willMax ?? 0;

    let targetWill = currentWillVal;
    if (healWillAmount >= 99) {
        targetWill = maxWill;
    } else if (healWillAmount > 0) {
        targetWill = Math.min(maxWill, currentWillVal + healWillAmount);
    }
    const willHealed = Math.max(0, targetWill - currentWillVal);

    // --- TEMP WILL ---
    let tempWillGained = 0;
    let nextTempWill = currentWill.temporaryWill ?? 0;
    let nextTempWillMax = currentWill.temporaryWillMax ?? nextTempWill;
    if (tempWillGain > 0) {
        tempWillGained = tempWillGain;
        nextTempWill += tempWillGain;
        nextTempWillMax = Math.max(nextTempWillMax, nextTempWill);
    }

    const nextWill: CharacterWill = {
        ...currentWill,
        willCurr: targetWill,
        willMax: maxWill,
        temporaryWill: nextTempWill,
        temporaryWillMax: nextTempWillMax
    };

    // --- STATUS CURING ---
    const curedStatusNames: string[] = [];
    let nextStatuses: StatusItem[] = [];

    for (const status of currentStatuses) {
        const isCured = curesList.some((cure) => statusMatchesCure(status, cure, customStatuses));
        if (isCured) {
            const displayName = status.name === 'Custom...' && status.customName ? status.customName : status.name;
            curedStatusNames.push(displayName);
        } else {
            nextStatuses.push(status);
        }
    }

    // --- STATUS INFLICTION ---
    const inflictedStatusNames: string[] = [];
    if (inflictsList.length > 0) {
        for (const inflict of inflictsList) {
            const clean = inflict.trim();
            if (!clean) continue;
            const lower = clean.toLowerCase();

            // Burn Stacking Logic
            if (
                lower === '1st degree burn' ||
                lower === 'burn' ||
                lower === '2nd degree burn' ||
                lower === '3rd degree burn'
            ) {
                nextStatuses = applyBurnStacking(nextStatuses, lower, inflictedStatusNames);
            } else {
                // Non-burn statuses continue standard deduplicated infliction
                const alreadyHas = nextStatuses.some(
                    (s) =>
                        s.name.toLowerCase() === clean.toLowerCase() ||
                        (s.customName && s.customName.toLowerCase() === clean.toLowerCase())
                );
                if (!alreadyHas) {
                    nextStatuses = nextStatuses.filter((s) => s.name !== 'Healthy');
                    nextStatuses.push({
                        id: crypto.randomUUID(),
                        name: clean,
                        customName: '',
                        rounds: 0
                    });
                    inflictedStatusNames.push(clean);
                }
            }
        }
    }

    // If all statuses are removed and none inflicted, automatically insert 'Healthy'
    if (nextStatuses.length === 0) {
        nextStatuses.push({
            id: crypto.randomUUID(),
            name: 'Healthy',
            customName: '',
            rounds: 0
        });
    } else if (nextStatuses.length > 1) {
        const nonHealthy = nextStatuses.filter((s) => s.name !== 'Healthy');
        if (nonHealthy.length > 0) {
            nextStatuses = nonHealthy;
        }
    }

    // --- SUMMARY TEXT ---
    const summaryParts: string[] = [];
    if (hpHealed > 0) {
        summaryParts.push(`Healed ${hpHealed} HP`);
    }
    if (willHealed > 0) {
        summaryParts.push(`Restored ${willHealed} Will`);
    }
    if (tempHpGained > 0) {
        summaryParts.push(`Gained ${tempHpGained} Temp HP`);
    }
    if (tempWillGained > 0) {
        summaryParts.push(`Gained ${tempWillGained} Temp Will`);
    }
    if (curedStatusNames.length > 0) {
        summaryParts.push(`Cured ${curedStatusNames.join(', ')}`);
    }
    if (inflictedStatusNames.length > 0) {
        summaryParts.push(`Inflicted ${inflictedStatusNames.join(', ')}`);
    }
    for (const b of resolvedBuffs) {
        summaryParts.push(`+${b.value} ${b.stat}`);
    }
    for (const d of resolvedDebuffs) {
        summaryParts.push(`-${d.value} ${d.stat}`);
    }
    for (const p of resolvedPermBoosts) {
        summaryParts.push(`+${p.value} ${p.stat} (Permanent)`);
    }
    for (const g of resolvedPassives) {
        summaryParts.push(`Granted passive: ${g}`);
    }
    if (combatBoost) {
        const typeLabel = combatBoost.type ? ` (${combatBoost.type})` : '';
        const bonusParts: string[] = [];
        if (combatBoost.accSucc > 0) bonusParts.push(`+${combatBoost.accSucc} Acc`);
        if (combatBoost.dmgSucc > 0) bonusParts.push(`+${combatBoost.dmgSucc} Dmg`);
        summaryParts.push(`Armed combat boost${typeLabel}: ${bonusParts.join(', ')}`);
    }

    const summaryText = summaryParts.length > 0 ? summaryParts.join('. ') + '.' : 'No effect.';

    return {
        nextHealth,
        nextWill,
        nextStatuses,
        hpHealed,
        willHealed,
        tempHpGained,
        tempWillGained,
        curedStatusNames,
        inflictedStatusNames,
        permanentStatBoost,
        permanentStatBoosts: resolvedPermBoosts,
        statBuff,
        statBuffs: resolvedBuffs,
        statDebuff,
        statDebuffs: resolvedDebuffs,
        dungeonPassive,
        dungeonPassives: resolvedPassives,
        combatBoost,
        summaryText
    };
}

/**
 * Checks whether an item defines or inherits any direct usage effect.
 */
export function hasItemUsageEffect(item: {
    name?: string;
    healHp?: number;
    healWill?: number;
    cures?: string[];
    permanentStatBoost?: unknown;
    permanentStatBoosts?: unknown[];
    statBuff?: unknown;
    statBuffs?: unknown[];
    statDebuff?: unknown;
    statDebuffs?: unknown[];
    gainTempHp?: number;
    gainTempWill?: number;
    dungeonPassive?: string;
    dungeonPassives?: string[];
    inflictsStatus?: string[];
    tags?: string;
    desc?: string;
    description?: string;
}): boolean {
    if (
        (item.healHp ?? 0) > 0 ||
        (item.healWill ?? 0) > 0 ||
        (item.cures && item.cures.length > 0) ||
        Boolean(item.permanentStatBoost) ||
        (Array.isArray(item.permanentStatBoosts) && item.permanentStatBoosts.length > 0) ||
        Boolean(item.statBuff) ||
        (Array.isArray(item.statBuffs) && item.statBuffs.length > 0) ||
        Boolean(item.statDebuff) ||
        (Array.isArray(item.statDebuffs) && item.statDebuffs.length > 0) ||
        (item.gainTempHp ?? 0) > 0 ||
        (item.gainTempWill ?? 0) > 0 ||
        Boolean(item.dungeonPassive) ||
        (Array.isArray(item.dungeonPassives) && item.dungeonPassives.length > 0) ||
        (item.inflictsStatus && item.inflictsStatus.length > 0)
    ) {
        return true;
    }
    const combined = `${item.tags || ''} ${item.desc || ''} ${item.description || ''}`;
    if (
        hasCombatBoostTags(combined) ||
        /\[Buff:\s*[^\]]+\]/i.test(combined) ||
        /\[Debuff:\s*[^\]]+\]/i.test(combined) ||
        /\[Permanent:\s*[^\]]+\]/i.test(combined) ||
        /\[Grant Passive:\s*[^\]]+\]/i.test(combined)
    ) {
        return true;
    }
    if (item.name && getBaseItemEffect(item.name) !== undefined) {
        return true;
    }
    return false;
}

/**
 * Checks whether an item can be consumed/used via the quick use action
 * (has charges or has a defined usage effect, but not a built-in attack action).
 */
export function isItemUsable(item: InventoryItem, hasAttackAction?: boolean): boolean {
    if (hasAttackAction || Boolean(item.attackAction)) {
        return false;
    }
    const effective = getItemEffectiveCharges(item);
    if (effective.hasCharges) {
        return true;
    }
    return hasItemUsageEffect(item);
}
