export const COMBAT_STATS = ['str', 'dex', 'vit', 'spe', 'ins'];
export const SOCIAL_STATS = ['tou', 'coo', 'bea', 'cut', 'cle'];
export const ALL_SKILLS = ['brawl', 'channel', 'clash', 'evasion', 'alert', 'athletic', 'nature', 'stealth', 'charm', 'etiquette', 'intimidate', 'perform', 'crafts', 'lore', 'medicine', 'magic'];

// --- TYPE MATCHUP MATRIX ---
export const ALL_TYPES = ["Normal", "Fire", "Water", "Electric", "Grass", "Ice", "Fighting", "Poison", "Ground", "Flying", "Psychic", "Bug", "Rock", "Ghost", "Dragon", "Dark", "Steel", "Fairy"];

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

export function calculateMatchups(typeStr: string): Record<string, number> {
    const types = typeStr.split('/').map(t => t.trim());
    const matchups: Record<string, number> = {};

    ALL_TYPES.forEach(attacker => {
        let multiplier = 1;
        types.forEach(defender => {
            const defData = DEFENSE_MATCHUPS[defender];
            if (defData && defData[attacker] !== undefined) {
                multiplier *= defData[attacker];
            }
        });
        matchups[attacker] = multiplier;
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