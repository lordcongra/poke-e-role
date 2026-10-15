import type { BattlefieldData, BattleOrganizerTimerEffect } from '../../types/battleOrganizerTypes';

export interface ActiveFieldEffectItem extends BattleOrganizerTimerEffect {
    category: 'weather' | 'terrain' | 'other' | 'forceField';
    id: string;
    subLabel?: string;
    prefix?: string;
    isExtra?: boolean;
    extraIndex?: number;
    side?: 'player' | 'foe';
    forceFieldIndex?: 0 | 1;
}

export function getEffectsByCategory(
    battlefield: BattlefieldData | null | undefined,
    category: 'weather' | 'terrain' | 'other'
): BattleOrganizerTimerEffect[] {
    if (!battlefield) return [];
    const results: BattleOrganizerTimerEffect[] = [];
    const isActive = (eff?: BattleOrganizerTimerEffect | null) =>
        Boolean(eff?.name?.trim() && ((eff.remainingRounds ?? 0) > 0 || eff.remainingRounds === -1));

    const primary = battlefield[category];
    if (isActive(primary)) results.push(primary);

    const extras =
        category === 'weather'
            ? battlefield.extraWeathers
            : category === 'terrain'
              ? battlefield.extraTerrains
              : battlefield.extraOther;

    if (extras && Array.isArray(extras)) {
        for (const item of extras) {
            if (isActive(item)) results.push(item);
        }
    }

    return results;
}

export function getAllActiveFieldEffects(battlefield: BattlefieldData | null | undefined): ActiveFieldEffectItem[] {
    if (!battlefield) return [];
    const results: ActiveFieldEffectItem[] = [];
    const isActive = (eff?: BattleOrganizerTimerEffect | null) =>
        Boolean(eff?.name?.trim() && ((eff.remainingRounds ?? 0) > 0 || eff.remainingRounds === -1));

    const isGrassy = (eff?: BattleOrganizerTimerEffect | null) =>
        Boolean(eff && isActive(eff) && eff.name.toLowerCase().includes('grassy'));

    const sideHasGrassyTerrain = Boolean(
        battlefield.playerSide?.forceFields?.some(isGrassy) ||
        battlefield.playerSide?.extraForceFields?.some(isGrassy) ||
        battlefield.foeSide?.forceFields?.some(isGrassy) ||
        battlefield.foeSide?.extraForceFields?.some(isGrassy)
    );

    // Weather Primary & Extras
    if (isActive(battlefield.weather)) {
        results.push({
            ...battlefield.weather,
            category: 'weather',
            id: 'weather-primary',
            prefix: 'Weather',
            isExtra: false
        });
    }
    battlefield.extraWeathers?.forEach((w, idx) => {
        if (isActive(w)) {
            results.push({
                ...w,
                category: 'weather',
                id: `weather-extra-${idx}`,
                prefix: 'Weather',
                isExtra: true,
                extraIndex: idx
            });
        }
    });

    // Terrain Primary & Extras (suppressed for Grassy Terrain if any side has it active)
    const isTerrainGrassy = (t?: BattleOrganizerTimerEffect | null) =>
        Boolean(t?.name && t.name.toLowerCase().includes('grassy'));

    if (isActive(battlefield.terrain)) {
        if (!sideHasGrassyTerrain || !isTerrainGrassy(battlefield.terrain)) {
            results.push({
                ...battlefield.terrain,
                category: 'terrain',
                id: 'terrain-primary',
                prefix: 'Terrain',
                isExtra: false
            });
        }
    }
    battlefield.extraTerrains?.forEach((t, idx) => {
        if (isActive(t)) {
            if (!sideHasGrassyTerrain || !isTerrainGrassy(t)) {
                results.push({
                    ...t,
                    category: 'terrain',
                    id: `terrain-extra-${idx}`,
                    prefix: 'Terrain',
                    isExtra: true,
                    extraIndex: idx
                });
            }
        }
    });

    // Other Primary & Extras
    if (isActive(battlefield.other)) {
        results.push({
            ...battlefield.other,
            category: 'other',
            id: 'other-primary',
            prefix: 'Global',
            isExtra: false
        });
    }
    battlefield.extraOther?.forEach((o, idx) => {
        if (isActive(o)) {
            results.push({
                ...o,
                category: 'other',
                id: `other-extra-${idx}`,
                prefix: 'Global',
                isExtra: true,
                extraIndex: idx
            });
        }
    });

    // Force Fields (Player & Foe) - base slots
    battlefield.playerSide?.forceFields?.forEach((ff, idx) => {
        if (isActive(ff)) {
            results.push({
                ...ff,
                category: 'forceField',
                id: `player-ff-${idx}`,
                subLabel: 'Ally',
                prefix: 'Ally Field',
                side: 'player',
                forceFieldIndex: idx as 0 | 1
            });
        }
    });

    // Player Extra Force Fields
    battlefield.playerSide?.extraForceFields?.forEach((eff, idx) => {
        if (isActive(eff)) {
            results.push({
                ...eff,
                category: 'forceField',
                id: `player-extra-ff-${idx}`,
                subLabel: 'Ally',
                prefix: 'Ally Field',
                side: 'player',
                isExtra: true,
                extraIndex: idx
            });
        }
    });

    // Foe Force Fields - base slots
    battlefield.foeSide?.forceFields?.forEach((ff, idx) => {
        if (isActive(ff)) {
            results.push({
                ...ff,
                category: 'forceField',
                id: `foe-ff-${idx}`,
                subLabel: 'Foe',
                prefix: 'Foe Field',
                side: 'foe',
                forceFieldIndex: idx as 0 | 1
            });
        }
    });

    // Foe Extra Force Fields
    battlefield.foeSide?.extraForceFields?.forEach((eff, idx) => {
        if (isActive(eff)) {
            results.push({
                ...eff,
                category: 'forceField',
                id: `foe-extra-ff-${idx}`,
                subLabel: 'Foe',
                prefix: 'Foe Field',
                side: 'foe',
                isExtra: true,
                extraIndex: idx
            });
        }
    });

    return results;
}
