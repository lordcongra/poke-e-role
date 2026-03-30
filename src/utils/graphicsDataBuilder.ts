// src/utils/graphicsDataBuilder.ts
import type { CharacterState, InventoryItem } from '../store/storeTypes';
import { CombatStat } from '../types/enums';
import { parseCombatTags } from './combatUtils';

export const DEFAULT_COLOR_ACT = '#4890fc'; 
export const DEFAULT_COLOR_EVA = '#c387fc'; 
export const DEFAULT_COLOR_CLA = '#dfad43';

export interface GraphicsData {
    showTrackers: boolean;
    hasSpeciesOrTrainer: boolean;
    hpCurr: number; hpMax: number;
    willCurr: number; willMax: number;
    defTotal: number; sdefTotal: number;
    actions: number; evadeUsed: boolean; clashUsed: boolean;
    showHpBar: boolean; gmHpBar: boolean;
    showHpText: boolean; gmHpText: boolean;
    showWillBar: boolean; gmWillBar: boolean;
    showWillText: boolean; gmWillText: boolean;
    showDef: boolean; gmDef: boolean;
    showEco: boolean; gmEco: boolean;
    colorAct: string; colorEva: string; colorCla: string;
    
    xOffset: number; yOffset: number;
    hpOffsetX: number; hpOffsetY: number;
    willOffsetX: number; willOffsetY: number;
    defOffsetX: number; defOffsetY: number;
    actOffsetX: number; actOffsetY: number;
    evaOffsetX: number; evaOffsetY: number;
    claOffsetX: number; claOffsetY: number;
}

export function buildGraphicsFromState(meta: Record<string, unknown>, state: CharacterState): GraphicsData {
    // AUDIT FIX: Passed extraCategories!
    const invMods = parseCombatTags(state.inventory, state.extraCategories);
    const vitTotal = Math.max(1, state.stats[CombatStat.VIT].base + state.stats[CombatStat.VIT].rank + state.stats[CombatStat.VIT].buff - state.stats[CombatStat.VIT].debuff + (invMods.stats.vit || 0));
    const insTotal = Math.max(1, state.stats[CombatStat.INS].base + state.stats[CombatStat.INS].rank + state.stats[CombatStat.INS].buff - state.stats[CombatStat.INS].debuff + (invMods.stats.ins || 0));
    const defTotal = Math.max(1, vitTotal + state.derived.defBuff - state.derived.defDebuff + invMods.def);
    let sdefBase = insTotal;
    if (state.identity.ruleset === 'tabletop') sdefBase = vitTotal; 
    const sdefTotal = Math.max(1, sdefBase + state.derived.sdefBuff - state.derived.sdefDebuff + invMods.spd);

    return {
        showTrackers: state.identity.showTrackers,
        hasSpeciesOrTrainer: state.identity.species.trim() !== '' || state.identity.mode === 'Trainer',
        hpCurr: state.health.hpCurr, hpMax: state.health.hpMax,
        willCurr: state.will.willCurr, willMax: state.will.willMax,
        defTotal, sdefTotal,
        actions: state.trackers.actions,
        evadeUsed: state.trackers.evade,
        clashUsed: state.trackers.clash,
        showHpBar: meta['setting-hp-bar'] !== false && meta['setting-hp-bar'] !== 'false',
        gmHpBar: meta['gm-hp-bar'] === true || meta['gm-hp-bar'] === 'true',
        showHpText: meta['setting-hp-text'] !== false && meta['setting-hp-text'] !== 'false',
        gmHpText: meta['gm-hp-text'] === true || meta['gm-hp-text'] === 'true',
        showWillBar: meta['setting-will-bar'] !== false && meta['setting-will-bar'] !== 'false',
        gmWillBar: meta['gm-will-bar'] === true || meta['gm-will-bar'] === 'true',
        showWillText: meta['setting-will-text'] !== false && meta['setting-will-text'] !== 'false',
        gmWillText: meta['gm-will-text'] === true || meta['gm-will-text'] === 'true',
        showDef: meta['setting-def-badge'] !== false && meta['setting-def-badge'] !== 'false',
        gmDef: meta['gm-def-badge'] === true || meta['gm-def-badge'] === 'true',
        showEco: meta['setting-eco-badge'] !== false && meta['setting-eco-badge'] !== 'false',
        gmEco: meta['gm-eco-badge'] === true || meta['gm-eco-badge'] === 'true',
        colorAct: String(meta['color-act'] || DEFAULT_COLOR_ACT),
        colorEva: String(meta['color-eva'] || DEFAULT_COLOR_EVA),
        colorCla: String(meta['color-cla'] || DEFAULT_COLOR_CLA),
        
        xOffset: state.identity.xOffset || 0,
        yOffset: state.identity.yOffset || 0,
        hpOffsetX: state.identity.hpOffsetX || 0, hpOffsetY: state.identity.hpOffsetY || 0,
        willOffsetX: state.identity.willOffsetX || 0, willOffsetY: state.identity.willOffsetY || 0,
        defOffsetX: state.identity.defOffsetX || 0, defOffsetY: state.identity.defOffsetY || 0,
        actOffsetX: state.identity.actOffsetX || 0, actOffsetY: state.identity.actOffsetY || 0,
        evaOffsetX: state.identity.evaOffsetX || 0, evaOffsetY: state.identity.evaOffsetY || 0,
        claOffsetX: state.identity.claOffsetX || 0, claOffsetY: state.identity.claOffsetY || 0,
    };
}

export function buildGraphicsFromMeta(meta: Record<string, unknown>): GraphicsData {
    let inventory: InventoryItem[] = [];
    try { inventory = meta['inv-data'] ? JSON.parse(String(meta['inv-data'])) : []; } catch(e) {}
    
    // We pass empty categories to the parser if we rely purely on meta here
    const invMods = parseCombatTags(inventory, []); 
    
    const getStatBase = (s: string) => Number(meta[`${s}-base`]) || (s==='ins'?1:2);
    const getStatRank = (s: string) => Number(meta[`${s}-rank`]) || 0;
    const getStatBuff = (s: string) => Number(meta[`${s}-buff`]) || 0;
    const getStatDebuff = (s: string) => Number(meta[`${s}-debuff`]) || 0;

    const vitTotal = Math.max(1, getStatBase('vit') + getStatRank('vit') + getStatBuff('vit') - getStatDebuff('vit') + (invMods.stats.vit || 0));
    const insTotal = Math.max(1, getStatBase('ins') + getStatRank('ins') + getStatBuff('ins') - getStatDebuff('ins') + (invMods.stats.ins || 0));

    const defBuff = Number(meta['defBuff'] ?? meta['def-buff']) || 0;
    const defDebuff = Number(meta['defDebuff'] ?? meta['def-debuff']) || 0;
    const sdefBuff = Number(meta['sdefBuff'] ?? meta['spd-buff']) || 0;
    const sdefDebuff = Number(meta['sdefDebuff'] ?? meta['spd-debuff']) || 0;

    const ruleset = String(meta['ruleset'] || 'vg-vit-hp');
    const defTotal = Math.max(1, vitTotal + defBuff - defDebuff + invMods.def);
    let sdefBase = insTotal;
    if (ruleset === 'tabletop') sdefBase = vitTotal; 
    const sdefTotal = Math.max(1, sdefBase + sdefBuff - sdefDebuff + invMods.spd);

    return {
        showTrackers: meta['show-trackers'] !== false && meta['show-trackers'] !== 'false',
        hasSpeciesOrTrainer: String(meta['species'] || '').trim() !== '' || String(meta['mode'] || 'Pokémon') === 'Trainer',
        hpCurr: Number(meta['hp-curr']) || 0,
        hpMax: Number(meta['hp-max-display']) || 1,
        willCurr: Number(meta['will-curr']) || 0,
        willMax: Number(meta['will-max-display']) || 1,
        defTotal, sdefTotal,
        actions: Number(meta['actions-used']) || 0,
        evadeUsed: meta['evasions-used'] === true || meta['evasions-used'] === 'true',
        clashUsed: meta['clashes-used'] === true || meta['clashes-used'] === 'true',
        showHpBar: meta['setting-hp-bar'] !== false && meta['setting-hp-bar'] !== 'false',
        gmHpBar: meta['gm-hp-bar'] === true || meta['gm-hp-bar'] === 'true',
        showHpText: meta['setting-hp-text'] !== false && meta['setting-hp-text'] !== 'false',
        gmHpText: meta['gm-hp-text'] === true || meta['gm-hp-text'] === 'true',
        showWillBar: meta['setting-will-bar'] !== false && meta['setting-will-bar'] !== 'false',
        gmWillBar: meta['gm-will-bar'] === true || meta['gm-will-bar'] === 'true',
        showWillText: meta['setting-will-text'] !== false && meta['setting-will-text'] !== 'false',
        gmWillText: meta['gm-will-text'] === true || meta['gm-will-text'] === 'true',
        showDef: meta['setting-def-badge'] !== false && meta['setting-def-badge'] !== 'false',
        gmDef: meta['gm-def-badge'] === true || meta['gm-def-badge'] === 'true',
        showEco: meta['setting-eco-badge'] !== false && meta['setting-eco-badge'] !== 'false',
        gmEco: meta['gm-eco-badge'] === true || meta['gm-eco-badge'] === 'true',
        colorAct: String(meta['color-act'] || DEFAULT_COLOR_ACT),
        colorEva: String(meta['color-eva'] || DEFAULT_COLOR_EVA),
        colorCla: String(meta['color-cla'] || DEFAULT_COLOR_CLA),
        
        xOffset: Number(meta['x-offset']) || 0,
        yOffset: Number(meta['y-offset']) || 0,
        hpOffsetX: Number(meta['hp-offset-x']) || 0, hpOffsetY: Number(meta['hp-offset-y']) || 0,
        willOffsetX: Number(meta['will-offset-x']) || 0, willOffsetY: Number(meta['will-offset-y']) || 0,
        defOffsetX: Number(meta['def-offset-x']) || 0, defOffsetY: Number(meta['def-offset-y']) || 0,
        actOffsetX: Number(meta['act-offset-x']) || 0, actOffsetY: Number(meta['act-offset-y']) || 0,
        evaOffsetX: Number(meta['eva-offset-x']) || 0, evaOffsetY: Number(meta['eva-offset-y']) || 0,
        claOffsetX: Number(meta['cla-offset-x']) || 0, claOffsetY: Number(meta['cla-offset-y']) || 0,
    };
}