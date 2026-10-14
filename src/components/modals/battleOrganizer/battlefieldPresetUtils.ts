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
            return `Grassy Terrain (${roundText}) — Supported: +1 Grass Damage, end-of-round 1 HP recovery`;
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
