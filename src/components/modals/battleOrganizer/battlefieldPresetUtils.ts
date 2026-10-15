/**
 * Pure helpers for Battlefield preset chips & supported calculation indicators
 */

export function isBattlefieldPresetSupported(name: string, category: 'weather' | 'terrain' | 'other'): boolean {
    const clean = name.toLowerCase().trim();
    if (category === 'weather') {
        return (
            clean === 'sunny' ||
            clean === 'rain' ||
            clean === 'snowy' ||
            clean === 'hail' ||
            clean.includes('snow') ||
            clean.includes('hail') ||
            clean.includes('sand') ||
            clean.includes('desolate') ||
            clean.includes('typhoon') ||
            clean === 'strong winds'
        );
    }
    if (category === 'terrain') {
        return (
            clean.includes('electric') ||
            clean.includes('grassy') ||
            clean.includes('misty') ||
            clean.includes('psychic')
        );
    }
    if (category === 'other') {
        return clean.includes('trick room') || clean.includes('gravity');
    }
    return false;
}

export function getBattlefieldPresetTooltip(
    name: string,
    category: 'weather' | 'terrain' | 'other',
    rounds: number
): string {
    const clean = name.toLowerCase().trim();
    const roundText = rounds === -1 ? 'Whole Scene' : `${rounds} rounds`;

    if (category === 'weather') {
        if (clean === 'sunny') {
            return `Sunny (${roundText}) — Supported: +1 Fire Damage pool, -1 Water Move damage`;
        }
        if (clean === 'rain') {
            return `Rain (${roundText}) — Supported: +1 Water Damage pool, -1 Fire Move damage`;
        }
        if (clean.includes('sand')) {
            return `Sandstorm (${roundText}) — Supported: +1 Sp.Def to Rock types, end-of-round damage to non-Rock/Ground/Steel`;
        }
        if (clean.includes('desolate')) {
            return `Desolate Weather (${roundText}) — Supported: +2 Fire dice, -2 Flat Water damage`;
        }
        if (clean.includes('typhoon')) {
            return `Typhoon (${roundText}) — Supported: +2 Water dice, -2 Flat Fire damage`;
        }
        if (clean === 'snowy' || clean.includes('snow')) {
            return `Snowy (${roundText}) — Supported: +1 Ice Damage pool, +1 Defense to Ice types`;
        }
        if (clean === 'hail') {
            return `Hail (${roundText}) — Supported: End-of-round damage to non-Ice types, +1 Chance die`;
        }
        if (clean === 'strong winds') {
            return `Strong Winds (${roundText}) — Supported: Flying-type Pokémon take neutral damage from SE moves`;
        }
    }
    if (category === 'terrain') {
        if (clean.includes('electric')) {
            return `Electric Terrain (${roundText}) — Supported: +1 Electric Damage, grounded Pokémon cannot fall Asleep`;
        }
        if (clean.includes('grassy')) {
            return `Grassy Terrain (${roundText}) — Supported: +1 Grass Damage & end-of-round 1 HP recovery to combatants on the side with Grassy Terrain`;
        }
        if (clean.includes('misty')) {
            return `Misty Terrain (${roundText}) — Supported: -1 Dragon Move damage, prevents Major/Minor Status`;
        }
        if (clean.includes('psychic')) {
            return `Psychic Terrain (${roundText}) — Supported: +1 Psychic Damage, blocks Priority & Reaction Moves`;
        }
    }
    if (category === 'other') {
        if (clean.includes('trick room')) {
            return `Trick Room (${roundText}) — Supported: Turn order reversed (slower combatants act first)`;
        }
        if (clean.includes('gravity')) {
            return `Gravity (${roundText}) — Supported: Grounds airborne combatants, -2 Dice penalty to Evasion`;
        }
    }

    return `Set ${name} (${roundText})`;
}

import type { BattlefieldSideData, BattleOrganizerTimerEffect } from '../../../types/battleOrganizerTypes';

/**
 * Places or refreshes a Force Field on a Battlefield Side.
 * Automatically occupies an empty base slot first, refreshes if already present in base,
 * or adds/refreshes in extraForceFields if base slots are filled.
 */
export function applyForceFieldToSide(
    side: BattlefieldSideData,
    effectName: string,
    rounds: number
): BattlefieldSideData {
    const updated = { ...side };
    const forceFields = [...updated.forceFields] as [BattleOrganizerTimerEffect, BattleOrganizerTimerEffect];
    const emptyIdx = forceFields.findIndex((f) => !f.name.trim() || f.remainingRounds <= 0);
    if (emptyIdx !== -1) {
        forceFields[emptyIdx] = { name: effectName, remainingRounds: rounds };
        updated.forceFields = forceFields;
    } else {
        const inBase = forceFields.some((f) => f.name.toLowerCase().trim() === effectName.toLowerCase().trim());
        if (inBase) {
            updated.forceFields = forceFields.map((f) =>
                f.name.toLowerCase().trim() === effectName.toLowerCase().trim() ? { ...f, remainingRounds: rounds } : f
            ) as [BattleOrganizerTimerEffect, BattleOrganizerTimerEffect];
        } else {
            const extras = [...(updated.extraForceFields || [])];
            const existingIdx = extras.findIndex(
                (f) => f.name.toLowerCase().trim() === effectName.toLowerCase().trim()
            );
            if (existingIdx !== -1) {
                extras[existingIdx] = { name: effectName, remainingRounds: rounds };
            } else {
                extras.push({ name: effectName, remainingRounds: rounds });
            }
            updated.extraForceFields = extras;
        }
    }
    return updated;
}
