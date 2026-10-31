import OBR from '@owlbear-rodeo/sdk';
import type { MoveData } from '../../../store/storeTypes';
import type { BattlefieldData } from '../../../types/battleOrganizerTypes';
import { BASE_TYPE_CHART } from '../../../data/typeMatchups';
import { STATS_META_ID } from '../../../utils/graphics/graphicsManager';
import { calculateTargetDefensesFromMeta } from '../../../utils/combat/combatUtils';
import { isStandaloneMode, storageAdapter } from '../../../utils/sync/storageAdapter';
import { extractIsNpc } from '../../../utils/combat/initiativeHelpers';
import { getEffectsByCategory } from '../../../utils/combat/fieldEffectsData';
import { isFlowerGiftActiveForSide } from '../../../utils/combat/combatantSideUtils';

export const RANK_TARGET_LIMITS: Record<string, number> = {
    Starter: 1,
    Rookie: 2,
    Standard: 3,
    Advanced: 4,
    Expert: 5,
    Ace: 6,
    Master: 8,
    Champion: 10
};

export function getMaxTargetsForRank(rank?: string): number {
    if (!rank) return 1;
    const cleanRank = rank.trim();
    const matchedKey = Object.keys(RANK_TARGET_LIMITS).find((k) => k.toLowerCase() === cleanRank.toLowerCase());
    return matchedKey ? RANK_TARGET_LIMITS[matchedKey] : 1;
}

export function detectMoveTargetingType(move: MoveData): 'single' | 'target-all' | 'area' {
    const desc = (move.desc || '').toLowerCase();
    const rawTarget = String((move as unknown as Record<string, unknown>).target || '').toLowerCase();

    // Check Area Move first (hits all combatants including allies)
    if (
        rawTarget === 'area' ||
        /\barea\s+move\b/i.test(desc) ||
        /\barea\s+attack\b/i.test(desc) ||
        /\btarget:\s*area\b/i.test(desc) ||
        /\btarget\s+area\b/i.test(desc)
    ) {
        return 'area';
    }

    // Check Target All in Range / Target All Foes / Target All Allies
    if (
        rawTarget.includes('all foes') ||
        rawTarget.includes('all in range') ||
        /\btarget\s+all\s+in\s+range\b/i.test(desc) ||
        /\btarget\s+all\s+foes\b/i.test(desc) ||
        /\btarget:\s*all\s+foes\b/i.test(desc) ||
        /\btarget\s+all\s+allies\b/i.test(desc) ||
        /\btarget\s+allies\s+in\s+range\b/i.test(desc) ||
        /\btarget\s+all\b/i.test(desc)
    ) {
        return 'target-all';
    }

    return 'single';
}

export function calculateDefaultEffectiveness(moveType: string, targetTypes: string[]): number {
    const cleanMoveType = moveType.trim();
    if (!cleanMoveType || targetTypes.length === 0) return 0;

    let totalMult = 1;
    for (const t of targetTypes) {
        if (!t) continue;
        const defKey = Object.keys(BASE_TYPE_CHART).find((k) => k.toLowerCase() === t.trim().toLowerCase());
        if (defKey) {
            const atkMap = BASE_TYPE_CHART[defKey];
            const atkKey = Object.keys(atkMap).find((k) => k.toLowerCase() === cleanMoveType.toLowerCase());
            if (atkKey !== undefined) {
                totalMult *= atkMap[atkKey];
            }
        }
    }

    if (totalMult >= 4) return 2;
    if (totalMult >= 2) return 1;
    if (totalMult <= 0.25) return -2;
    if (totalMult <= 0.5) return -1;
    return 0;
}

export interface MultiTargetSelection {
    id: string;
    name: string;
    def: number;
    flatReduction?: number;
    effectiveness: number;
    isEvaded: boolean;
    isPlayerSide: boolean;
    types?: string[];
}

export interface MultiTargetRowData {
    id: string;
    name: string;
    selected: boolean;
    def: number;
    flatReduction?: number;
    effectiveness: number;
    isEvaded: boolean;
    isPlayerSide: boolean;
    types: string[];
}

export function initializeMultiTargetRows(
    targets: TargetOption[],
    moveType: string,
    isPhysicalMove: boolean,
    activeBattlefield: BattlefieldData | null | undefined,
    activeTransformation: string | undefined,
    mode: 'single' | 'target-all' | 'area',
    maxTargets: number
): MultiTargetRowData[] {
    const rows: MultiTargetRowData[] = targets.map((t) => {
        const { targetDef, flatReduction } = calculateTargetDefAndFactors(t, isPhysicalMove, activeBattlefield);
        const isTera = activeTransformation === 'Terastallize' && t.isTera;
        return {
            id: t.id,
            name: t.name,
            selected: false,
            def: targetDef,
            flatReduction: flatReduction || 0,
            effectiveness: isTera ? 1 : calculateDefaultEffectiveness(moveType, t.types),
            isEvaded: false,
            isPlayerSide: t.isPlayerSide,
            types: t.types
        };
    });

    if (mode === 'area') {
        rows.slice(0, maxTargets).forEach((r) => (r.selected = true));
    } else if (mode === 'target-all') {
        const foes = rows.filter((r) => !r.isPlayerSide);
        (foes.length > 0 ? foes : rows).slice(0, maxTargets).forEach((r) => (r.selected = true));
    }

    return rows;
}

export interface DefenseTierGroup {
    effectiveDef: number;
    dicePool: number;
    incrementalDice: number;
    targets: MultiTargetSelection[];
}

export function buildDefenseTierGroups(selections: MultiTargetSelection[], baseDamage: number): DefenseTierGroup[] {
    const activeTargets = selections.filter((s) => !s.isEvaded);
    if (activeTargets.length === 0) return [];

    const groupsMap = new Map<number, MultiTargetSelection[]>();
    for (const target of activeTargets) {
        const def = target.def;
        if (!groupsMap.has(def)) {
            groupsMap.set(def, []);
        }
        groupsMap.get(def)!.push(target);
    }

    // Sort defenses descending (highest defense first = smallest pool first)
    const sortedDefs = Array.from(groupsMap.keys()).sort((a, b) => b - a);

    const result: DefenseTierGroup[] = [];
    let previousPool = 0;

    for (const def of sortedDefs) {
        const targets = groupsMap.get(def)!;
        const dicePool = Math.max(1, baseDamage - def);
        const incrementalDice = Math.max(0, dicePool - previousPool);
        previousPool = Math.max(previousPool, dicePool);

        result.push({
            effectiveDef: def,
            dicePool,
            incrementalDice,
            targets
        });
    }

    return result;
}

export interface TargetOption {
    id: string;
    name: string;
    def: number;
    isTera: boolean;
    isPlayerSide: boolean;
    types: string[];
    ability?: string;
    abilityActive?: boolean;
}

export function extractTargetTypesAndTera(
    meta: Record<string, unknown>,
    extraMeta?: Record<string, unknown>
): { isTera: boolean; types: string[] } {
    const stateObj = (meta.state || meta) as Record<string, unknown>;
    const identityObj = (stateObj?.identity || meta.identity || {}) as Record<string, unknown>;
    const isTera =
        meta['active-transformation'] === 'Terastallize' || identityObj.activeTransformation === 'Terastallize';
    const t1 = String(identityObj.type1 || meta.type1 || meta.Type1 || extraMeta?.type1 || extraMeta?.Type1 || '');
    const t2 = String(identityObj.type2 || meta.type2 || meta.Type2 || extraMeta?.type2 || extraMeta?.Type2 || '');
    const teraAffinity = isTera ? String(identityObj.terastallizeAffinity || meta['terastallize-affinity'] || '') : '';
    const rawTypes = isTera && teraAffinity ? [teraAffinity] : [t1, t2];
    return { isTera, types: rawTypes.filter(Boolean).map((t) => t.trim().toLowerCase()) };
}

export async function loadAvailableTargets(isPhysicalMove: boolean): Promise<TargetOption[]> {
    const availableTargets: TargetOption[] = [];

    // --- PATH 1: STANDALONE MODE ---
    if (isStandaloneMode) {
        try {
            const savedList = localStorage.getItem('pkr_standalone_init_list');
            if (savedList) {
                const initList = JSON.parse(savedList) as Record<string, unknown>[];
                if (Array.isArray(initList)) {
                    const localChars = await storageAdapter.getLocalCharacters();

                    initList.forEach((c) => {
                        const charId = String(c.id || '');
                        const matchingChar = localChars.find((lc) => lc.id === charId);

                        let name = String(c.name || 'Unknown');
                        let isTera = false;
                        let targetDef = 1;
                        let isPlayerSide = true;
                        let types: string[] = [];

                        if (typeof c.isPlayerSide === 'boolean') {
                            isPlayerSide = c.isPlayerSide;
                        } else if (matchingChar && matchingChar.metadata) {
                            const meta = matchingChar.metadata as Record<string, unknown>;
                            isPlayerSide = !extractIsNpc(meta);
                        }

                        let ability: string | undefined = undefined;
                        let abilityActive: boolean | undefined = undefined;

                        if (matchingChar && matchingChar.metadata) {
                            const meta = matchingChar.metadata as Record<string, unknown>;
                            const stateObj = (meta.state || meta) as Record<string, unknown>;
                            const identityObj = (stateObj?.identity || meta.identity || {}) as Record<string, unknown>;
                            ability = String(identityObj.ability || meta.ability || '');
                            abilityActive = meta['ability-active'] !== undefined ? Boolean(meta['ability-active']) : identityObj.abilityActive !== false;
                            name = String(meta.nickname || meta.species || c.name || 'Unknown');
                            const extracted = extractTargetTypesAndTera(meta);
                            isTera = extracted.isTera;
                            types = extracted.types;

                            const { def, spd } = calculateTargetDefensesFromMeta(meta);
                            targetDef = isPhysicalMove ? def : spd;
                        }

                        availableTargets.push({
                            id: charId,
                            name,
                            def: targetDef,
                            isTera,
                            isPlayerSide,
                            types,
                            ability,
                            abilityActive
                        });
                    });
                }
            }
        } catch (error) {
            console.error('[TargetingModal] Error loading standalone targets:', error);
        }
    }
    // --- PATH 2: OWLBEAR RODEO MODE ---
    else if (OBR.isAvailable) {
        try {
            const items = await OBR.scene.items.getItems();
            items.forEach((item) => {
                if (item.metadata['pokerole-pmd-extension/initiative'] !== undefined) {
                    const meta = (item.metadata[STATS_META_ID] || item.metadata) as Record<string, unknown>;
                    const name = String(meta.nickname || meta.species || item.name);
                    const { isTera, types } = extractTargetTypesAndTera(meta, item.metadata as Record<string, unknown>);

                    const { def, spd } = calculateTargetDefensesFromMeta(meta);
                    const targetDef = isPhysicalMove ? def : spd;
                    const isPlayerSide = !extractIsNpc(item.metadata);
                    const stateObj = (meta.state || meta) as Record<string, unknown>;
                    const identityObj = (stateObj?.identity || meta.identity || {}) as Record<string, unknown>;
                    const ability = String(identityObj.ability || meta.ability || item.metadata.ability || '');
                    const abilityActive = meta['ability-active'] !== undefined 
                        ? Boolean(meta['ability-active']) 
                        : item.metadata['ability-active'] !== undefined 
                            ? Boolean(item.metadata['ability-active']) 
                            : identityObj.abilityActive !== false;

                    availableTargets.push({
                        id: item.id,
                        name,
                        def: targetDef,
                        isTera,
                        isPlayerSide,
                        types,
                        ability,
                        abilityActive
                    });
                }
            });
        } catch (error) {
            console.error('[TargetingModal] Error loading OBR targets:', error);
        }
    }

    const nameGroups: Record<string, string[]> = {};
    availableTargets.forEach((t) => {
        if (!nameGroups[t.name]) nameGroups[t.name] = [];
        nameGroups[t.name].push(t.id);
    });
    Object.values(nameGroups).forEach((ids) => ids.sort());

    return availableTargets.map((t) => {
        const ids = nameGroups[t.name];
        if (ids && ids.length > 1) {
            const num = ids.indexOf(t.id) + 1;
            return { ...t, name: `${t.name} #${num}` };
        }
        return t;
    });
}

export function calculateTargetDefAndFactors(
    target: TargetOption,
    isPhysicalMove: boolean,
    activeBattlefield?: BattlefieldData | null
): { targetDef: number; flatReduction: number; factors: string[]; forceNeutralFlying: boolean } {
    let targetDef = target.def;
    let flatReduction = 0;
    const factors: string[] = [];
    let forceNeutralFlying = false;

    if (activeBattlefield) {
        const activeWeathers = getEffectsByCategory(activeBattlefield, 'weather');
        const isSandstorm = activeWeathers.some((w) => (w.name || '').trim().toLowerCase().includes('sand'));
        const isSnowy = activeWeathers.some((w) => {
            const c = (w.name || '').trim().toLowerCase();
            return (c.includes('snow') || c === 'snowy') && !c.includes('hail');
        });
        const isStrongWinds = activeWeathers.some((w) => {
            const c = (w.name || '').trim().toLowerCase();
            return c.includes('strong winds') || c.includes('delta stream');
        });

        if (isSandstorm && target.types.includes('rock') && !isPhysicalMove) {
            targetDef += 1;
            factors.push('Sandstorm (+1 Sp.Def)');
        }
        if (isSnowy && target.types.includes('ice') && isPhysicalMove) {
            targetDef += 1;
            factors.push('Snowy (+1 Def)');
        }
        if (isStrongWinds && target.types.includes('flying')) {
            forceNeutralFlying = true;
            factors.push('Strong Winds (Neutral SE damage to Flying)');
        }

        if (!isPhysicalMove) {
            const defenderSide = target.isPlayerSide ? 'player' : 'foe';
            if (isFlowerGiftActiveForSide(defenderSide, activeBattlefield)) {
                targetDef += 2;
                factors.push('Flower Gift (+2 Sp.Def)');
            }
        }

        const targetSide = target.isPlayerSide ? activeBattlefield.playerSide : activeBattlefield.foeSide;

        if (targetSide) {
            const allForceFields = [...(targetSide.forceFields || []), ...(targetSide.extraForceFields || [])];
            const activeFields = allForceFields.filter(
                (ff) => ff?.name?.trim() && (ff.remainingRounds > 0 || ff.remainingRounds === -1)
            );

            const hasReflect = activeFields.some((ff) => ff.name.toLowerCase().includes('reflect'));
            const hasLightScreen = activeFields.some((ff) => ff.name.toLowerCase().includes('light screen'));
            const hasAuroraVeil = activeFields.some((ff) => ff.name.toLowerCase().includes('aurora veil'));

            if (hasReflect && isPhysicalMove) {
                flatReduction += 1;
                factors.push('Reflect (-1 Damage)');
            }
            if (hasLightScreen && !isPhysicalMove) {
                flatReduction += 1;
                factors.push('Light Screen (-1 Damage)');
            }
            if (hasAuroraVeil) {
                flatReduction += 1;
                factors.push('Aurora Veil (-1 Damage)');
            }
        }
    }

    return { targetDef, flatReduction, factors, forceNeutralFlying };
}

export const initializeMultiTargets = initializeMultiTargetRows;
