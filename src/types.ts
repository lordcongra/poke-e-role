export interface Move { id: string; name: string; attr: string; skill: string; type: string; cat: string; dmg: string; power: number; dmgStat: string; desc?: string; }
export interface InventoryItem { id: string; qty: number; name: string; desc: string; }
export interface ExtraSkill { id: string; name: string; base: number; buff: number; }
export interface ExtraCategory { id: string; name: string; skills: ExtraSkill[]; }