import type { ExtraCategory } from '@/store/storeTypes';
import { Skill } from '@/types/enums';

/**
 * Parses an unknown metadata value as a finite number.
 * Rejects null, booleans, empty/whitespace strings, NaN, and ±Infinity while preserving 0.
 */
export function parseOptionalFiniteNumber(value: unknown): number | undefined {
    if (typeof value === 'number') {
        return Number.isFinite(value) ? value : undefined;
    }
    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (!trimmed) return undefined;
        const parsed = Number(trimmed);
        return Number.isFinite(parsed) ? parsed : undefined;
    }
    return undefined;
}

/**
 * Parses an unknown metadata value as a finite number with an explicit fallback.
 */
export function parseFiniteNumber(value: unknown, fallback: number): number {
    return parseOptionalFiniteNumber(value) ?? fallback;
}

export const mapAttr = (val: string): string => {
    const rawParts = (val || '')
        .split(/[/,]|(?:\s+or\s+)/i)
        .map((p) => p.toLowerCase().trim())
        .filter(Boolean);
    for (const v of rawParts) {
        if (v.includes('str')) return 'str';
        if (v.includes('dex')) return 'dex';
        if (v.includes('vit')) return 'vit';
        if (v.includes('spe')) return 'spe';
        if (v.includes('ins')) return 'ins';
        if (v.includes('will')) return 'will';
        if (v.includes('tou')) return 'tou';
        if (v.includes('coo')) return 'coo';
        if (v.includes('bea')) return 'bea';
        if (v.includes('cut')) return 'cut';
        if (v.includes('cle')) return 'cle';
        if (v === 'none' || v.includes('sameas') || v === '-') return 'none';
    }
    return '';
};

export const mapSkill = (val: string, parsedExtraCats: ExtraCategory[]): string => {
    const rawParts = (val || '')
        .split(/[/,]|(?:\s+or\s+)/i)
        .map((p) => p.toLowerCase().trim())
        .filter(Boolean);
    const officialSkills = Object.values(Skill).map((s) => s.toLowerCase());

    for (const v of rawParts) {
        for (const s of officialSkills) {
            if (v.includes(s)) return s;
        }

        for (const cat of parsedExtraCats) {
            for (const sk of cat.skills) {
                if (v === sk.id.toLowerCase() || (sk.name && v === sk.name.toLowerCase())) return sk.id;
            }
        }
    }
    return 'none';
};

