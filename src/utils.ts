import type { InventoryItem } from './@types/index';
import { CombatStat, SocialStat, Skill, PokemonType } from './@types/enums';

export const COMBAT_STATS = Object.values(CombatStat) as CombatStat[];
export const SOCIAL_STATS = Object.values(SocialStat) as SocialStat[];
export const ALL_SKILLS = Object.values(Skill) as Skill[];

// --- TYPE MATCHUP MATRIX ---
export const ALL_TYPES = Object.values(PokemonType).filter(t => t !== PokemonType.NONE) as PokemonType[];

export const DEFENSE_MATCHUPS: Record<string, Record<string, number>> = {
    "Normal": { Fighting: 2, Ghost: 0 },
    "Fire": { Water: 2, Ground: 2, Rock: 2, Fire: 0.5, Grass: 0.5, Ice: 0.5, Bug: 0.5, Steel: 0.5, Fairy: 0.5 },
    "Water": { Electric: 2, Grass: 2, Fire: 0.5, Water: 0.5, Ice: 0.5, Steel: 0.5 },
    "Electric": { Ground: 2, Electric: 0.5, Flying: 0.5, Steel: 0.5 },
    "Grass": { Fire: 2, Ice: 2, Poison: 2, Flying: 2, Bug: 2, Water: 0.5, Electric: 0.5, Grass: 0.5, Ground: 0.5 },
    "Ice": { Fire: 2, Fighting: 2, Rock: 2, Steel: 2, Ice: 0.5 },
    "Fighting": { Flying: 2, Psychic: 2, Fairy: 2, Bug: 0.5, Rock: 0.5, Dark: 0.5 },
    "Poison": { Ground: 2, Psychic: 2, Grass: 0.5, Fighting: 0.5, Poison: 0.5, Bug: 0.5, Fairy: 0.5 },
    "Ground": { Water: 2, Grass: 2, Ice: 2, Poison: 0.5, Rock: 0.5, Electric: 0 },
    "Flying": { Electric: 2, Ice: 2, Rock: 2, Grass: 0.5, Fighting: 0.5, Bug: 0.5, Ground: 0 },
    "Psychic": { Bug: 2, Ghost: 2, Dark: 2, Fighting: 0.5, Psychic: 0.5 },
    "Bug": { Fire: 2, Flying: 2, Rock: 2, Grass: 0.5, Fighting: 0.5, Ground: 0.5 },
    "Rock": { Water: 2, Grass: 2, Fighting: 2, Ground: 2, Steel: 2, Normal: 0.5, Fire: 0.5, Poison: 0.5, Flying: 0.5 },
    "Ghost": { Ghost: 2, Dark: 2, Poison: 0.5, Bug: 0.5, Normal: 0, Fighting: 0 },
    "Dragon": { Ice: 2, Dragon: 2, Fairy: 2, Fire: 0.5, Water: 0.5, Electric: 0.5, Grass: 0.5 },
    "Dark": { Fighting: 2, Bug: 2, Fairy: 2, Ghost: 0.5, Dark: 0.5, Psychic: 0 },
    "Steel": { Fire: 2, Fighting: 2, Ground: 2, Normal: 0.5, Grass: 0.5, Ice: 0.5, Flying: 0.5, Psychic: 0.5, Bug: 0.5, Rock: 0.5, Dragon: 0.5, Steel: 0.5, Fairy: 0.5, Poison: 0 },
    "Fairy": { Poison: 2, Steel: 2, Fighting: 0.5, Bug: 0.5, Dark: 0.5, Dragon: 0 }
};

export function calculateMatchups(typeStr: string, currentInventory: InventoryItem[] = []): Record<string, number> {
    const types = typeStr.split('/').map(t => t.trim());
    const matchups: Record<string, number> = {};

    // 1. Parse Dynamic Inventory Tags FIRST
    let removeImmunities = false;
    const removeSpecificImmunities: string[] = [];
    const extraImmunities: string[] = [];
    const extraResistances: string[] = [];
    const extraWeaknesses: string[] = [];

    currentInventory.filter(i => i.active).forEach(item => {
        const desc = ((item.name || "") + " " + (item.desc || "")).toLowerCase();
        
        if (desc.includes("[remove immunities]")) {
            removeImmunities = true;
        }

        const remImmuneMatches = desc.match(/\[remove immunity:\s*([a-z]+)\]/g);
        if (remImmuneMatches) {
            remImmuneMatches.forEach(m => {
                const type = m.match(/\[remove immunity:\s*([a-z]+)\]/)?.[1];
                const properType = ALL_TYPES.find(t => t.toLowerCase() === type);
                if (properType) removeSpecificImmunities.push(properType);
            });
        }

        const immuneMatches = desc.match(/\[immune:\s*([a-z]+)\]/g);
        if (immuneMatches) {
            immuneMatches.forEach(m => {
                const type = m.match(/\[immune:\s*([a-z]+)\]/)?.[1];
                const properType = ALL_TYPES.find(t => t.toLowerCase() === type);
                if (properType) extraImmunities.push(properType);
            });
        }

        const resistMatches = desc.match(/\[resist:\s*([a-z]+)\]/g);
        if (resistMatches) {
            resistMatches.forEach(m => {
                const type = m.match(/\[resist:\s*([a-z]+)\]/)?.[1];
                const properType = ALL_TYPES.find(t => t.toLowerCase() === type);
                if (properType) extraResistances.push(properType);
            });
        }

        const weakMatches = desc.match(/\[weak:\s*([a-z]+)\]/g);
        if (weakMatches) {
            weakMatches.forEach(m => {
                const type = m.match(/\[weak:\s*([a-z]+)\]/)?.[1];
                const properType = ALL_TYPES.find(t => t.toLowerCase() === type);
                if (properType) extraWeaknesses.push(properType);
            });
        }
    });

    // 2. Calculate Matchups
    ALL_TYPES.forEach(attacker => {
        let multiplier = 1;
        
        // Apply base type chart
        types.forEach(defender => {
            const defData = DEFENSE_MATCHUPS[defender];
            if (defData && defData[attacker] !== undefined) {
                let val = defData[attacker];
                
                // Ring Target overrides the 0 BEFORE it multiplies!
                if (val === 0 && removeImmunities) val = 1;
                
                multiplier *= val;
            }
        });

        // Apply custom tags
        extraImmunities.forEach(immuneType => {
            if (immuneType === attacker) multiplier *= 0;
        });
        extraResistances.forEach(resistType => {
            if (resistType === attacker) multiplier *= 0.5;
        });
        extraWeaknesses.forEach(weakType => {
            if (weakType === attacker) multiplier *= 2;
        });

        matchups[attacker] = multiplier;
    });

    // 3. Ring Target Override (Removes 0x matchups WITHOUT overwriting secondary weaknesses!)
    if (removeImmunities) {
        for (const type in matchups) {
            if (matchups[type] === 0) matchups[type] = 1;
        }
    }
    
    // 4. Specific Immunity Overrides (Iron Ball)
    removeSpecificImmunities.forEach(type => {
        if (matchups[type] === 0) matchups[type] = 1;
    });

    return matchups;
}

// --- UTILS ---
export function getVal(id: string): number {
  const element = document.getElementById(id) as HTMLInputElement;
  return element && !isNaN(parseInt(element.value)) ? parseInt(element.value) : 0;
}

export function setText(id: string, value: number | string) {
  const element = document.getElementById(id);
  if (element) element.innerText = value.toString();
}

export function getDerivedVal(id: string): number {
  const element = document.getElementById(id);
  return element ? parseInt(element.innerText) || 0 : 0;
}

export function generateId(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

export function normalizeStat(val: string): CombatStat | SocialStat | 'will' | '' {
    const s = val.toLowerCase().trim();
    if (s.includes('str')) return CombatStat.STR;
    if (s.includes('dex')) return CombatStat.DEX;
    if (s.includes('vit')) return CombatStat.VIT;
    if (s.includes('spe')) return CombatStat.SPE;
    if (s.includes('ins')) return CombatStat.INS;
    if (s.includes('tou')) return SocialStat.TOU;
    if (s.includes('coo')) return SocialStat.COO;
    if (s.includes('bea')) return SocialStat.BEA;
    if (s.includes('cut')) return SocialStat.CUT;
    if (s.includes('cle')) return SocialStat.CLE;
    if (s.includes('will')) return 'will';
    return '';
}

export function normalizeSkill(val: string): Skill | 'none' | string {
    const s = val.toLowerCase().trim();
    if (!s || s === 'none') return 'none';
    for (const sk of ALL_SKILLS) {
        if (s.includes(sk)) return sk;
    }
    return 'brawl'; // Safe fallback
}

export function debounce<Args extends unknown[]>(func: (...args: Args) => void, wait: number): (...args: Args) => void {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    return (...args: Args) => {
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}