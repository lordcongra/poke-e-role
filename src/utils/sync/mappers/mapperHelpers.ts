import type { ExtraCategory } from '@/store/storeTypes';
import { Skill } from '@/types/enums';

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

