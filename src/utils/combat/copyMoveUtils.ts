import type { MoveData, PendingDualScale, CharacterState, ExtraCategory } from '../../store/storeTypes';
import type { MoveApiResponse, MoveLookupEntry } from '../api/apiTypes';

export type CopyMoveKind = 'copycat' | 'mirror-move' | 'me-first' | 'mimic' | 'sketch' | 'generic';

/**
 * Checks if a move is Metronome.
 */
export function isMetronomeMove(move?: { name?: string } | null): boolean {
    if (!move?.name) return false;
    return move.name.trim().toLowerCase() === 'metronome';
}

/**
 * Checks if a move is a copy move (Copycat, Mirror Move, Me First, Mimic, Sketch, or has SameAsCopiedMove).
 */
export function isCopyMove(move?: { name?: string; dmg1?: string; acc1?: string } | null): boolean {
    if (!move) return false;
    const name = (move.name || '').trim().toLowerCase();
    const copyNames = ['copycat', 'mirror move', 'me first', 'mimic', 'sketch'];
    if (copyNames.includes(name)) return true;
    if (typeof move.dmg1 === 'string' && move.dmg1.toLowerCase().includes('sameascopiedmove')) return true;
    if (typeof move.acc1 === 'string' && move.acc1.toLowerCase().includes('sameascopiedmove')) return true;
    return false;
}

/**
 * Identifies the exact kind of copy move.
 */
export function getCopyMoveKind(move?: { name?: string; dmg1?: string } | null): CopyMoveKind {
    if (!move?.name) return 'generic';
    const clean = move.name.trim().toLowerCase();
    if (clean === 'copycat') return 'copycat';
    if (clean === 'mirror move') return 'mirror-move';
    if (clean === 'me first') return 'me-first';
    if (clean === 'mimic') return 'mimic';
    if (clean === 'sketch') return 'sketch';
    if (typeof move.dmg1 === 'string' && move.dmg1.includes('+1')) return 'me-first';
    return 'generic';
}

/**
 * Maps attribute string options like "Strength/Special" or "Strength or Dexterity" to stat keys.
 */
export function mapAttrOptions(val: string): string[] {
    const rawParts = (val || '')
        .split(/[/,]|(?:\s+or\s+)/i)
        .map((v) => v.trim())
        .filter(Boolean);
    const options: string[] = [];
    for (const clean of rawParts.map((v) => v.toLowerCase())) {
        let matched = '';
        if (clean.includes('str')) matched = 'str';
        else if (clean.includes('dex')) matched = 'dex';
        else if (clean.includes('vit')) matched = 'vit';
        else if (clean.includes('spe')) matched = 'spe';
        else if (clean.includes('ins')) matched = 'ins';
        else if (clean.includes('will')) matched = 'will';
        else if (clean.includes('tou')) matched = 'tou';
        else if (clean.includes('coo')) matched = 'coo';
        else if (clean.includes('bea')) matched = 'bea';
        else if (clean.includes('cut')) matched = 'cut';
        else if (clean.includes('cle')) matched = 'cle';
        if (matched && !options.includes(matched)) {
            options.push(matched);
        }
    }
    return options.length > 0 ? options : [''];
}

/**
 * Maps skill string options like "Brawl/Clash" to skill keys.
 */
export function mapSkillOptions(val: string, extraCategories?: ExtraCategory[]): string[] {
    const rawParts = (val || '')
        .split(/[/,]|(?:\s+or\s+)/i)
        .map((v) => v.trim())
        .filter(Boolean);
    const options: string[] = [];
    const standardSkills = [
        'brawl',
        'channel',
        'clash',
        'evasion',
        'alert',
        'athletic',
        'nature',
        'stealth',
        'charm',
        'etiquette',
        'intimidate',
        'perform',
        'crafts',
        'lore',
        'medicine',
        'magic'
    ];

    for (const clean of rawParts.map((v) => v.toLowerCase())) {
        let matched = '';
        for (const s of standardSkills) {
            if (clean.includes(s)) {
                matched = s;
                break;
            }
        }
        if (!matched && extraCategories) {
            for (const cat of extraCategories) {
                for (const sk of cat.skills) {
                    if (clean === sk.id.toLowerCase() || (sk.name && clean === sk.name.toLowerCase())) {
                        matched = sk.id;
                        break;
                    }
                }
                if (matched) break;
            }
        }
        if (matched && !options.includes(matched)) {
            options.push(matched);
        }
    }
    return options.length > 0 ? options : ['none'];
}

export interface ExtractedMoveFields {
    name: string;
    type: string;
    category: string;
    power: number;
    accuracy1: string;
    accuracy2: string;
    damage1: string;
    damage2: string;
    effect: string;
}

export function extractMoveFields(m: MoveApiResponse | MoveLookupEntry): ExtractedMoveFields {
    const api = m as MoveApiResponse;
    const lookup = m as MoveLookupEntry;
    const name = api.Name || lookup.name || '';
    const type = api.Type || lookup.type || 'Normal';
    const category = api.Category || lookup.category || 'Physical';
    const rawPower = api.Power !== undefined ? api.Power : lookup.power;
    const power = typeof rawPower === 'number' ? rawPower : parseInt(String(rawPower || '0'), 10) || 0;
    const accuracy1 = api.Accuracy1 || lookup.accuracy1 || '';
    const accuracy2 = api.Accuracy2 || lookup.accuracy2 || '';
    const damage1 = api.Damage1 || lookup.damage1 || '';
    const damage2 = api.Damage2 || lookup.damage2 || '';
    const effect = api.Effect || api.Description || lookup.effect || lookup.description || '';
    return { name, type, category, power, accuracy1, accuracy2, damage1, damage2, effect };
}

export interface SynthesizedMoveResult {
    move: MoveData;
    hasDualScale: boolean;
    pendingDualScale?: PendingDualScale;
}

/**
 * Synthesizes an ephemeral MoveData for copy moves (Copycat, Mirror Move, Me First, etc.).
 */
export function synthesizeCopyMove(
    copyMove: MoveData,
    targetMove: MoveApiResponse | MoveLookupEntry,
    characterState: CharacterState,
    chosenScaling?: {
        acc1?: string;
        acc2?: string;
        dmg1?: string;
        category?: 'Physical' | 'Special' | 'Status';
    }
): SynthesizedMoveResult {
    const kind = getCopyMoveKind(copyMove);
    const fields = extractMoveFields(targetMove);

    let targetCategory: 'Physical' | 'Special' | 'Status' = 'Physical';
    if (fields.category.toLowerCase().includes('spec')) targetCategory = 'Special';
    else if (fields.category.toLowerCase().includes('stat') || fields.category.toLowerCase().includes('supp')) {
        targetCategory = 'Status';
    }

    const rawDamageCombined = [fields.damage1, fields.damage2]
        .filter((d) => d && d !== 'None' && String(d).trim() !== '')
        .join('/');

    const acc1Opts = mapAttrOptions(fields.accuracy1);
    const acc2Opts = mapSkillOptions(fields.accuracy2, characterState.extraCategories);
    const dmg1Opts = mapAttrOptions(rawDamageCombined);

    let hasDualScale = false;
    let pendingDualScale: PendingDualScale | undefined;

    let finalAcc1 = 'str';
    let finalAcc2 = 'none';
    let finalDmg1 = targetCategory === 'Special' ? 'spe' : 'str';
    let finalPower = fields.power;
    const finalCategory: 'Physical' | 'Special' | 'Status' = chosenScaling?.category || targetCategory;

    switch (kind) {
        case 'copycat': {
            finalAcc1 = chosenScaling?.acc1 || acc1Opts[0] || 'str';
            finalAcc2 = chosenScaling?.acc2 || acc2Opts[0] || 'none';
            finalDmg1 = chosenScaling?.dmg1 || dmg1Opts[0] || (finalCategory === 'Special' ? 'spe' : 'str');
            finalPower = fields.power;

            if (acc1Opts.length > 1 || acc2Opts.length > 1 || dmg1Opts.length > 1) {
                hasDualScale = true;
                pendingDualScale = {
                    moveId: copyMove.id,
                    moveName: fields.name ? `Copycat (${fields.name})` : copyMove.name,
                    acc1Options: acc1Opts.length > 1 ? acc1Opts : undefined,
                    acc2Options: acc2Opts.length > 1 ? acc2Opts : undefined,
                    dmg1Options: dmg1Opts.length > 1 ? dmg1Opts : undefined
                };
            }
            break;
        }
        case 'mirror-move': {
            // Mirror Move uses user's Insight + Perform for Accuracy; copies target move's damage and type.
            finalAcc1 = 'ins';
            finalAcc2 = 'perform';
            finalDmg1 = chosenScaling?.dmg1 || dmg1Opts[0] || (finalCategory === 'Special' ? 'spe' : 'str');
            finalPower = fields.power;
            break;
        }
        case 'me-first': {
            // Me First uses user's Insight + Athletic for Accuracy; copies target move's damage and adds +1 bonus die.
            finalAcc1 = 'ins';
            finalAcc2 = 'athletic';
            finalDmg1 = chosenScaling?.dmg1 || dmg1Opts[0] || (finalCategory === 'Special' ? 'spe' : 'str');
            finalPower = fields.power + 1;
            break;
        }
        case 'mimic':
        case 'sketch':
        default: {
            finalAcc1 = 'cle';
            finalAcc2 = 'perform';
            finalDmg1 = chosenScaling?.dmg1 || dmg1Opts[0] || (finalCategory === 'Special' ? 'spe' : 'str');
            finalPower = fields.power;
            break;
        }
    }

    const synthesized: MoveData = {
        id: copyMove.id,
        name: `${copyMove.name} (${fields.name})`,
        type: fields.type,
        category: finalCategory,
        acc1: finalAcc1,
        acc2: finalAcc2,
        dmg1: finalDmg1,
        power: finalPower,
        desc: `[${copyMove.name}: Copied ${fields.name}]\n${fields.effect}`,
        active: true,
        marker: copyMove.marker || ''
    };

    return {
        move: synthesized,
        hasDualScale,
        pendingDualScale
    };
}

/**
 * Synthesizes an ephemeral MoveData for Metronome.
 */
export function synthesizeMetronomeMove(
    metronomeMove: MoveData,
    targetMove: MoveLookupEntry | MoveApiResponse,
    category: 'Physical' | 'Special',
    power: number
): MoveData {
    const fields = extractMoveFields(targetMove);
    const rawDamageCandidate = [fields.damage1, fields.damage2]
        .filter((d) => d && d !== 'None' && String(d).trim() !== '')
        .join('/');
    const dmg1Opts = mapAttrOptions(rawDamageCandidate);

    const defaultDmg1 = category === 'Special' ? 'spe' : 'str';
    const finalDmg1 = dmg1Opts[0] && dmg1Opts[0] !== '' ? dmg1Opts[0] : defaultDmg1;

    return {
        id: metronomeMove.id,
        name: `Metronome (${fields.name})`,
        type: fields.type,
        category,
        acc1: 'ins',
        acc2: 'perform',
        dmg1: finalDmg1,
        power,
        desc: `[Metronome: Manifested as ${fields.name} (${fields.type}, Power ${power})]\n${fields.effect}`,
        active: true,
        marker: metronomeMove.marker || ''
    };
}
