export const DEFAULT_TYPES = [
    'Normal',
    'Fire',
    'Water',
    'Grass',
    'Electric',
    'Ice',
    'Fighting',
    'Poison',
    'Ground',
    'Flying',
    'Psychic',
    'Bug',
    'Rock',
    'Ghost',
    'Dragon',
    'Steel',
    'Dark',
    'Fairy'
];

/**
 * Updates tag string to reflect Damage Pool and Ignores Defense tags.
 */
export function updateDamageModeTags(
    tags: string = '',
    damageMode: 'scaling' | 'flat-dice' | 'set-damage' | undefined,
    power: number,
    ignoreDefense: boolean
): string {
    let updated = tags;

    // Handle [Damage Pool X]
    if (damageMode === 'flat-dice') {
        const poolTag = `[Damage Pool ${power}]`;
        if (/\[Damage Pool\s*\d+\]/i.test(updated)) {
            updated = updated.replace(/\[Damage Pool\s*\d+\]/i, poolTag);
        } else {
            updated = `${updated} ${poolTag}`.trim();
        }
    } else {
        updated = updated.replace(/\[Damage Pool\s*\d+\]/gi, '').trim();
    }

    // Handle [Ignores Defense]
    if (ignoreDefense) {
        if (!/\[Ignores?\s*Def(?:ense)?\]/i.test(updated)) {
            updated = `${updated} [Ignores Defense]`.trim();
        }
    } else {
        updated = updated.replace(/\[Ignores?\s*Def(?:ense)?\]/gi, '').trim();
    }

    return updated.replace(/\s+/g, ' ').trim();
}
