import type { CharacterState } from '../store/storeTypes';
import {
    parseCombatTags,
    getAbilityText,
    calculateDefTotal,
    calculateSDefTotal,
    calculateTargetDefensesFromMeta
} from './combatUtils';

export const DEFAULT_COLOR_ACT = '#4890fc';
export const DEFAULT_COLOR_EVA = '#c387fc';
export const DEFAULT_COLOR_CLA = '#dfad43';

export interface GraphicsData {
    showTrackers: boolean;
    hasSpeciesOrTrainer: boolean;
    hpCurr: number;
    hpMax: number;
    temporaryHitPoints: number;
    temporaryHitPointsMax: number;
    willCurr: number;
    willMax: number;
    temporaryWill: number;
    temporaryWillMax: number;
    defTotal: number;
    sdefTotal: number;
    actions: number;
    evadeUsed: boolean;
    clashUsed: boolean;
    showHpBar: boolean;
    gmHpBar: boolean;
    showHpText: boolean;
    gmHpText: boolean;
    showWillBar: boolean;
    gmWillBar: boolean;
    showWillText: boolean;
    gmWillText: boolean;
    showDef: boolean;
    gmDef: boolean;
    showEco: boolean;
    gmEco: boolean;
    colorAct: string;
    colorEva: string;
    colorCla: string;

    trackerScale: number;
    xOffset: number;
    yOffset: number;
    hpOffsetX: number;
    hpOffsetY: number;
    willOffsetX: number;
    willOffsetY: number;
    defOffsetX: number;
    defOffsetY: number;
    actOffsetX: number;
    actOffsetY: number;
    evaOffsetX: number;
    evaOffsetY: number;
    claOffsetX: number;
    claOffsetY: number;
}

export function buildGraphicsFromState(meta: Record<string, unknown>, state: CharacterState): GraphicsData {
    const abilityText = getAbilityText(state.identity.ability, state.roomCustomAbilities);
    const invMods = parseCombatTags(state.inventory, state.extraCategories, undefined, abilityText);

    const defTotal = calculateDefTotal(state, invMods);
    const sdefTotal = calculateSDefTotal(state, invMods);

    return {
        showTrackers: state.identity.showTrackers,
        hasSpeciesOrTrainer: state.identity.species.trim() !== '' || state.identity.mode !== 'Pokémon',
        hpCurr: state.health.hpCurr,
        hpMax: state.health.hpMax,
        temporaryHitPoints: state.health.temporaryHitPoints || 0,
        temporaryHitPointsMax: state.health.temporaryHitPointsMax || 0,
        willCurr: state.will.willCurr,
        willMax: state.will.willMax,
        temporaryWill: state.will.temporaryWill || 0,
        temporaryWillMax: state.will.temporaryWillMax || 0,
        defTotal,
        sdefTotal,
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

        trackerScale: state.identity.trackerScale ?? 100,
        xOffset: state.identity.xOffset || 0,
        yOffset: state.identity.yOffset || 0,
        hpOffsetX: state.identity.hpOffsetX || 0,
        hpOffsetY: state.identity.hpOffsetY || 0,
        willOffsetX: state.identity.willOffsetX || 0,
        willOffsetY: state.identity.willOffsetY || 0,
        defOffsetX: state.identity.defOffsetX || 0,
        defOffsetY: state.identity.defOffsetY || 0,
        actOffsetX: state.identity.actOffsetX || 0,
        actOffsetY: state.identity.actOffsetY || 0,
        evaOffsetX: state.identity.evaOffsetX || 0,
        evaOffsetY: state.identity.evaOffsetY || 0,
        claOffsetX: state.identity.claOffsetX || 0,
        claOffsetY: state.identity.claOffsetY || 0
    };
}

export function buildGraphicsFromMeta(meta: Record<string, unknown>): GraphicsData {
    const { def: defTotal, spd: sdefTotal } = calculateTargetDefensesFromMeta(meta);

    return {
        showTrackers: meta['show-trackers'] !== false && meta['show-trackers'] !== 'false',
        hasSpeciesOrTrainer:
            String(meta['species'] || '').trim() !== '' || String(meta['mode'] || 'Pokémon') !== 'Pokémon',
        hpCurr: Number(meta['hp-curr']) || 0,
        hpMax: Number(meta['hp-max-display']) || 1,
        temporaryHitPoints: Number(meta['temporary-hit-points']) || 0,
        temporaryHitPointsMax: Number(meta['temporary-hit-points-max']) || 0,
        willCurr: Number(meta['will-curr']) || 0,
        willMax: Number(meta['will-max-display']) || 1,
        temporaryWill: Number(meta['temporary-will']) || 0,
        temporaryWillMax: Number(meta['temporary-will-max']) || 0,
        defTotal,
        sdefTotal,
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

        trackerScale: meta['tracker-scale'] !== undefined ? Number(meta['tracker-scale']) : 100,
        xOffset: Number(meta['x-offset']) || 0,
        yOffset: Number(meta['y-offset']) || 0,
        hpOffsetX: Number(meta['hp-offset-x']) || 0,
        hpOffsetY: Number(meta['hp-offset-y']) || 0,
        willOffsetX: Number(meta['will-offset-x']) || 0,
        willOffsetY: Number(meta['will-offset-y']) || 0,
        defOffsetX: Number(meta['def-offset-x']) || 0,
        defOffsetY: Number(meta['def-offset-y']) || 0,
        actOffsetX: Number(meta['act-offset-x']) || 0,
        actOffsetY: Number(meta['act-offset-y']) || 0,
        evaOffsetX: Number(meta['eva-offset-x']) || 0,
        evaOffsetY: Number(meta['eva-offset-y']) || 0,
        claOffsetX: Number(meta['cla-offset-x']) || 0,
        claOffsetY: Number(meta['cla-offset-y']) || 0
    };
}
