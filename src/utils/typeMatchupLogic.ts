import { BASE_TYPE_CHART, BASE_TYPES } from '../data/typeMatchups';
import type { CustomType } from '../store/storeTypes';

export function getMatchupGroups(
    type1: string,
    type2: string,
    visibleCustomTypes: CustomType[],
    stringsToParse: string[]
): Record<number, string[]> {
    const ALL_TYPES = [...BASE_TYPES, ...visibleCustomTypes.map((t) => t.name)];

    // 1. Build the base matrix
    const matrix: Record<string, Record<string, number>> = {};
    ALL_TYPES.forEach((def) => {
        matrix[def] = {};
        ALL_TYPES.forEach((atk) => {
            matrix[def][atk] = 1;
        });
    });

    Object.entries(BASE_TYPE_CHART).forEach(([def, atkMap]) => {
        if (!matrix[def]) return;
        Object.entries(atkMap).forEach(([atk, mult]) => {
            matrix[def][atk] = mult;
        });
    });

    // 2. Overlay Custom Types and Custom Matchups
    visibleCustomTypes.forEach((ct) => {
        if (!matrix[ct.name]) return;
        (ct.weaknesses || []).forEach((atk) => {
            if (matrix[ct.name]) matrix[ct.name][atk] = 2;
        });
        (ct.resistances || []).forEach((atk) => {
            if (matrix[ct.name]) matrix[ct.name][atk] = 0.5;
        });
        (ct.immunities || []).forEach((atk) => {
            if (matrix[ct.name]) matrix[ct.name][atk] = 0;
        });
        (ct.seAgainst || []).forEach((def) => {
            if (matrix[def]) matrix[def][ct.name] = 2;
        });
        (ct.nveAgainst || []).forEach((def) => {
            if (matrix[def]) matrix[def][ct.name] = 0.5;
        });
        (ct.noEffectAgainst || []).forEach((def) => {
            if (matrix[def]) matrix[def][ct.name] = 0;
        });
    });

    let removeImmunities = false;
    const removeSpecificImmunities: string[] = [];
    const extraImmunities: string[] = [];
    const extraResistances: string[] = [];
    const extraWeaknesses: string[] = [];

    // 3. Parse explicit tag modifiers
    stringsToParse.forEach((desc) => {
        if (desc.includes('[remove immunities]')) removeImmunities = true;

        const remImmuneMatches = desc.match(/\[remove immunity:\s*([a-z]+)\]/g);
        if (remImmuneMatches) {
            remImmuneMatches.forEach((m) => {
                const typeMatch = m.match(/\[remove immunity:\s*([a-z]+)\]/);
                if (typeMatch) {
                    const type = typeMatch[1];
                    const properType = ALL_TYPES.find((t) => t.toLowerCase() === type);
                    if (properType) removeSpecificImmunities.push(properType);
                }
            });
        }

        const immuneMatches = desc.match(/\[immune:\s*([a-z]+)\]/g);
        if (immuneMatches) {
            immuneMatches.forEach((m) => {
                const typeMatch = m.match(/\[immune:\s*([a-z]+)\]/);
                if (typeMatch) {
                    const type = typeMatch[1];
                    const properType = ALL_TYPES.find((t) => t.toLowerCase() === type);
                    if (properType) extraImmunities.push(properType);
                }
            });
        }

        const resistMatches = desc.match(/\[resist:\s*([a-z]+)\]/g);
        if (resistMatches) {
            resistMatches.forEach((m) => {
                const typeMatch = m.match(/\[resist:\s*([a-z]+)\]/);
                if (typeMatch) {
                    const type = typeMatch[1];
                    const properType = ALL_TYPES.find((t) => t.toLowerCase() === type);
                    if (properType) extraResistances.push(properType);
                }
            });
        }

        const weakMatches = desc.match(/\[weak:\s*([a-z]+)\]/g);
        if (weakMatches) {
            weakMatches.forEach((m) => {
                const typeMatch = m.match(/\[weak:\s*([a-z]+)\]/);
                if (typeMatch) {
                    const type = typeMatch[1];
                    const properType = ALL_TYPES.find((t) => t.toLowerCase() === type);
                    if (properType) extraWeaknesses.push(properType);
                }
            });
        }
    });

    // 4. Calculate Final Multipliers
    const multipliers: Record<string, number> = {};
    ALL_TYPES.forEach((attackerType) => {
        let mult1 = matrix[type1]?.[attackerType] ?? 1;
        let mult2 = matrix[type2]?.[attackerType] ?? 1;

        if (removeImmunities || removeSpecificImmunities.includes(attackerType)) {
            if (mult1 === 0) mult1 = 1;
            if (mult2 === 0) mult2 = 1;
        }

        let finalMult = mult1 * mult2;

        if (extraImmunities.includes(attackerType)) finalMult *= 0;
        if (extraResistances.includes(attackerType)) finalMult *= 0.5;
        if (extraWeaknesses.includes(attackerType)) finalMult *= 2;

        if (finalMult !== 1) multipliers[attackerType] = finalMult;
    });

    // 5. Group by Multiplier Value
    const groups: Record<number, string[]> = { 4: [], 2: [], 0.5: [], 0.25: [], 0: [] };
    Object.entries(multipliers).forEach(([type, mult]) => {
        if (groups[mult]) groups[mult].push(type);
    });

    return groups;
}