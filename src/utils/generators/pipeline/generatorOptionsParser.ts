import { CombatStat, SocialStat, Skill } from '@/types/enums';

export const RANK_HIERARCHY = ['Starter', 'Rookie', 'Standard', 'Advanced', 'Expert', 'Ace', 'Master', 'Champion'];
export const ALL_SKILLS = Object.values(Skill) as string[];
export const COMBAT_STATS = Object.values(CombatStat) as string[];
export const SOCIAL_STATS = Object.values(SocialStat) as string[];

export const ATTRIBUTE_MAPPING: Record<string, string> = {
    Strength: 'str',
    Dexterity: 'dex',
    Vitality: 'vit',
    Special: 'spe',
    Insight: 'ins',
    Tough: 'tou',
    Cool: 'coo',
    Beauty: 'bea',
    Cute: 'cut',
    Clever: 'cle',
    Will: 'will'
};

export function normalizeSingleStatistic(token: string): string {
    const s = token.toLowerCase().trim();
    if (!s || s === 'none') return '';
    if (s.includes('str')) return 'str';
    if (s.includes('dex')) return 'dex';
    if (s.includes('vit')) return 'vit';
    if (s.includes('spe')) return 'spe';
    if (s.includes('ins')) return 'ins';
    if (s.includes('tou')) return 'tou';
    if (s.includes('coo')) return 'coo';
    if (s.includes('bea')) return 'bea';
    if (s.includes('cut')) return 'cut';
    if (s.includes('cle')) return 'cle';
    if (s.includes('will')) return 'will';
    return '';
}

export function parseStatOptions(value: string): string[] {
    if (!value) return [];
    const parts = value
        .split(/[/,]|(?:\s+or\s+)/i)
        .map((p) => p.trim())
        .filter(Boolean);
    const results: string[] = [];
    for (const part of parts) {
        const mapped = ATTRIBUTE_MAPPING[part] || part;
        const normalized = normalizeSingleStatistic(mapped);
        if (normalized && !results.includes(normalized)) {
            results.push(normalized);
        }
    }
    return results;
}

export function normalizeSingleSkill(token: string): string {
    const s = token.toLowerCase().trim();
    if (!s || s === 'none') return 'none';
    for (const skill of ALL_SKILLS) {
        if (s.includes(skill)) return skill;
    }
    return 'none';
}

export function parseSkillOptions(value: string): string[] {
    if (!value) return [];
    const parts = value
        .split(/[/,]|(?:\s+or\s+)/i)
        .map((p) => p.trim())
        .filter(Boolean);
    const results: string[] = [];
    for (const part of parts) {
        const normalized = normalizeSingleSkill(part);
        if (normalized && normalized !== 'none' && !results.includes(normalized)) {
            results.push(normalized);
        }
    }
    return results;
}

