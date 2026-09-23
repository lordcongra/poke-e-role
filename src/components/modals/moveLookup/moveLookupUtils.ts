import type { MoveLookupEntry } from '../../../utils/apiTypes';

export const BASIC_POWERS = ['1', '2', '3'];
export const HIGH_POWERS = ['4', '5', '6', '7', '8', '10'];

/**
 * Convert PascalCase or camelCase attribute keys into human-readable labels.
 */
export function formatAttributeName(rawKey: string): string {
    const formatted = rawKey.replace(/([a-z])([A-Z])/g, '$1 $2');
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

/**
 * Check if a move matches the active power filter selection.
 */
export function matchesPowerFilter(power: number | string, category: string, selectedPowers: string[]): boolean {
    if (selectedPowers.length === 0) return true;

    const powerStr = String(power).toLowerCase();
    const isStatus = category === 'Status' || powerStr === 'support';
    const isVariable = powerStr.includes('var') || (power === 0 && category !== 'Status');

    if (selectedPowers.includes('support') && isStatus) {
        return true;
    }
    if (selectedPowers.includes('variable') && isVariable) {
        return true;
    }

    if (selectedPowers.includes(powerStr)) {
        return true;
    }

    return false;
}

/**
 * Convert CamelCase or PascalCase stat names (e.g. "SameAsCopiedMove") into spaced words ("Same As Copied Move").
 */
export function formatStatName(raw?: string): string {
    if (!raw) return '';
    const trimmed = raw.trim();
    if (!trimmed) return '';
    return trimmed
        .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
        .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
        .trim();
}

/**
 * Format Accuracy string from Accuracy1 and Accuracy2.
 */
export function formatAccuracy(acc1?: string, acc2?: string): string {
    const parts = [formatStatName(acc1), formatStatName(acc2)].filter(Boolean);
    return parts.length > 0 ? parts.join(' + ') : 'None';
}

/**
 * Format Damage string from Damage1, Damage2, and Power.
 */
export function formatDamage(dmg1?: string, dmg2?: string, power?: number | string): string {
    const parts = [formatStatName(dmg1), formatStatName(dmg2)].filter(Boolean);
    const hasPower = power !== undefined && power !== 0 && String(power).trim() !== '' && String(power).trim() !== '0';
    if (parts.length === 0) return hasPower ? `+${power}` : '-';
    return hasPower ? `${parts.join(' + ')} + ${power}` : parts.join(' + ');
}

/**
 * Generate Discord-ready markdown summary for a move.
 */
export function buildMoveDiscordMarkdown(move: MoveLookupEntry): string {
    const accStr = formatAccuracy(move.accuracy1, move.accuracy2);
    const dmgStr = formatDamage(move.damage1, move.damage2, move.power);

    const activeAttrs = move.attributes
        ? Object.entries(move.attributes)
              .filter(([, val]) => Boolean(val))
              .map(([key, val]) =>
                  typeof val === 'boolean' ? formatAttributeName(key) : `${formatAttributeName(key)}: ${val}`
              )
        : [];
    const attrText = activeAttrs.length > 0 ? `\n> **Attributes:** ${activeAttrs.join(', ')}` : '';

    return `## **${move.name}**
> **Type:** ${move.type} | **Category:** ${move.category} | **Power:** ${move.power}
> **Accuracy:** ${accStr} | **Damage:** ${dmgStr}
> **Target:** ${move.target || 'None'}${attrText}

**Effect:**
${move.effect || 'No effect provided.'}

*${move.description || ''}*`;
}

/**
 * Generate broadcast description for Owlbear Rodeo chat.
 */
export function buildMoveBroadcast(move: MoveLookupEntry): { title: string; desc: string } {
    const accStr = formatAccuracy(move.accuracy1, move.accuracy2);
    const dmgStr = formatDamage(move.damage1, move.damage2, move.power);

    const activeAttrs = move.attributes
        ? Object.entries(move.attributes)
              .filter(([, val]) => Boolean(val))
              .map(([key, val]) =>
                  typeof val === 'boolean' ? formatAttributeName(key) : `${formatAttributeName(key)}: ${val}`
              )
        : [];
    const attrSnippet = activeAttrs.length > 0 ? ` • Attr: ${activeAttrs.join(', ')}` : '';

    return {
        title: `${move.name} (${move.type} / ${move.category})`,
        desc: `Power: ${move.power} | Acc: ${accStr} | Dmg: ${dmgStr} | Target: ${move.target || 'None'}${attrSnippet}\n${move.effect || move.description || ''}`
    };
}
