export const COMBAT_STATS = ['str', 'dex', 'vit', 'spe', 'ins'];
export const SOCIAL_STATS = ['tou', 'coo', 'bea', 'cut', 'cle'];
export const ALL_SKILLS = ['brawl', 'channel', 'clash', 'evasion', 'alert', 'athletic', 'nature', 'stealth', 'charm', 'etiquette', 'intimidate', 'perform', 'crafts', 'lore', 'medicine', 'magic'];

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
    // Fallback if the browser blocks crypto inside the Owlbear iframe
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
}