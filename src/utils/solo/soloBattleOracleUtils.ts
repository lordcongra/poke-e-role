import type { MoveData } from '@/store/storeTypes';
import { parseMoves } from '@/utils/sync/mappers/parseCharacterFeatures';
import type { FateResultType } from '@/utils/solo/oracleUtils';

export type TacticsMode = 'equal' | 'aggressive' | 'tactical' | 'wild' | 'custom';

export type WildBehavior = 'Roar / Hesitate' | 'Intimidate' | 'Direct Attack' | 'Desperate Strike';

export interface MoveProbability {
    move: MoveData;
    weight: number;
    percentage: number;
}

export interface CustomWeights {
    damaging: number;
    support: number;
}

export interface WildInstinctResult {
    d6Roll: number;
    behavior: WildBehavior;
    description: string;
    selectedMove: MoveData | null;
    directive: string;
}

export interface BattleTargetInfo {
    id: string;
    name: string;
    hpCurr: number;
    hpMax: number;
    willCurr: number;
    willMax: number;
    insight: number;
    moves: MoveData[];
}

/**
 * Normalizes and extracts candidate moves from a move pool, respecting the
 * 3 + Insight limit and active move toggles.
 */
export function extractCandidateMoves(moves: MoveData[], insight: number = 1): MoveData[] {
    if (!Array.isArray(moves)) return [];

    const validMoves = moves.filter((m) => m && typeof m.name === 'string' && m.name.trim().length > 0);
    const activeMoves = validMoves.filter((m) => m.active === true);
    const pool = activeMoves.length > 0 ? activeMoves : validMoves;

    const maxInsight = Math.max(0, Number.isFinite(insight) ? Math.floor(insight) : 1);
    const maxMoves = Math.max(1, 3 + maxInsight);

    return pool.slice(0, maxMoves);
}

/**
 * Determines whether a move is classified as a Damaging move (Physical or Special).
 */
export function isDamagingMove(move: MoveData): boolean {
    const cat = move.category?.toLowerCase() || '';
    return cat.startsWith('phys') || cat.startsWith('spec');
}

/**
 * Determines whether a move is classified as a Support move (Status).
 */
export function isSupportMove(move: MoveData): boolean {
    return !isDamagingMove(move);
}

/**
 * Calculates live weights and percentage probabilities for each candidate move
 * based on the selected tactics mode and custom weights.
 */
export function calculateMoveProbabilities(
    moves: MoveData[],
    mode: TacticsMode,
    customWeights: CustomWeights = { damaging: 1, support: 1 }
): MoveProbability[] {
    if (!moves || moves.length === 0) return [];

    let getWeightForMove: (move: MoveData) => number;

    switch (mode) {
        case 'equal':
            getWeightForMove = () => 1;
            break;
        case 'aggressive':
            getWeightForMove = (m) => (isDamagingMove(m) ? 3 : 1);
            break;
        case 'tactical':
            getWeightForMove = (m) => (isSupportMove(m) ? 3 : 1);
            break;
        case 'wild':
            // In Wild Instinct, 4 out of 6 d6 outcomes favor attack, 2 out of 6 favor roar/intimidate
            getWeightForMove = (m) => (isDamagingMove(m) ? 2 : 1);
            break;
        case 'custom': {
            const dmgWeight = Math.max(0, customWeights.damaging);
            const supWeight = Math.max(0, customWeights.support);
            getWeightForMove = (m) => (isDamagingMove(m) ? dmgWeight : supWeight);
            break;
        }
        default:
            getWeightForMove = () => 1;
    }

    const items = moves.map((move) => ({
        move,
        weight: Math.max(0, getWeightForMove(move))
    }));

    const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);

    return items.map((item) => {
        let percentage = 0;
        if (totalWeight > 0) {
            percentage = Math.round((item.weight / totalWeight) * 1000) / 10;
        } else {
            percentage = Math.round((100 / items.length) * 10) / 10;
        }
        return {
            move: item.move,
            weight: item.weight,
            percentage
        };
    });
}

/**
 * Selects a move according to weighted probabilities.
 */
export function selectMoveByTactics(
    moves: MoveData[],
    mode: TacticsMode,
    customWeights: CustomWeights = { damaging: 1, support: 1 },
    randomFn: () => number = Math.random
): MoveData | null {
    if (!moves || moves.length === 0) return null;
    if (moves.length === 1) return moves[0];

    const probabilities = calculateMoveProbabilities(moves, mode, customWeights);
    const totalWeight = probabilities.reduce((acc, p) => acc + p.weight, 0);

    if (totalWeight <= 0) {
        const fallbackIdx = Math.floor(randomFn() * moves.length);
        return moves[fallbackIdx] || null;
    }

    const roll = randomFn() * totalWeight;
    let accumulated = 0;

    for (const prob of probabilities) {
        accumulated += prob.weight;
        if (roll <= accumulated) {
            return prob.move;
        }
    }

    return probabilities[probabilities.length - 1].move;
}

/**
 * Evaluates the d6 Wild Instinct behavior table:
 * 1: Roar / Hesitate
 * 2: Intimidate
 * 3-4: Direct Attack
 * 5-6: Desperate Strike
 */
export function rollWildInstinct(
    moves: MoveData[],
    pokemonName: string = 'Active Pokémon',
    forcedD6?: number,
    randomFn: () => number = Math.random
): WildInstinctResult {
    const d6Roll = forcedD6 && forcedD6 >= 1 && forcedD6 <= 6 ? forcedD6 : Math.floor(randomFn() * 6) + 1;
    const cleanName = pokemonName.trim() || 'Active Pokémon';

    const damagingMoves = moves.filter(isDamagingMove);
    const supportMoves = moves.filter(isSupportMove);

    let behavior: WildBehavior;
    let description: string;
    let selectedMove: MoveData | null = null;
    let directive: string;

    if (d6Roll === 1) {
        behavior = 'Roar / Hesitate';
        description = 'The wild Pokémon growls warily, hesitates, or sizes up the situation.';
        if (supportMoves.length > 0) {
            selectedMove = supportMoves[Math.floor(randomFn() * supportMoves.length)];
            directive = formatMoveDirective(cleanName, selectedMove.name);
        } else {
            directive = `Hesitate on ${cleanName}'s turn (or hold action)!`;
        }
    } else if (d6Roll === 2) {
        behavior = 'Intimidate';
        description = 'The wild Pokémon bristles and displays force or intimidation.';
        if (supportMoves.length > 0) {
            selectedMove = supportMoves[Math.floor(randomFn() * supportMoves.length)];
            directive = formatMoveDirective(cleanName, selectedMove.name);
        } else if (damagingMoves.length > 0) {
            selectedMove = damagingMoves[Math.floor(randomFn() * damagingMoves.length)];
            directive = formatMoveDirective(cleanName, selectedMove.name);
        } else {
            directive = `Display Intimidation / Posture on ${cleanName}'s sheet!`;
        }
    } else if (d6Roll >= 3 && d6Roll <= 4) {
        behavior = 'Direct Attack';
        description = 'The wild Pokémon lunges in with an instinctive attack!';
        if (damagingMoves.length > 0) {
            selectedMove = damagingMoves[Math.floor(randomFn() * damagingMoves.length)];
        } else if (moves.length > 0) {
            selectedMove = moves[Math.floor(randomFn() * moves.length)];
        }
        directive = selectedMove
            ? formatMoveDirective(cleanName, selectedMove.name)
            : `No moves available on ${cleanName}'s sheet!`;
    } else {
        behavior = 'Desperate Strike';
        description = 'The wild Pokémon strikes with reckless ferocity and all-out power!';
        if (damagingMoves.length > 0) {
            // Sort by power descending to pick the strongest damaging attack
            const sorted = [...damagingMoves].sort((a, b) => (b.power || 0) - (a.power || 0));
            selectedMove = sorted[0];
        } else if (moves.length > 0) {
            selectedMove = moves[0];
        }
        directive = selectedMove
            ? formatMoveDirective(cleanName, selectedMove.name)
            : `No moves available on ${cleanName}'s sheet!`;
    }

    return {
        d6Roll,
        behavior,
        description,
        selectedMove,
        directive
    };
}

/**
 * Strictly filters candidate moves to Physical and Special damaging moves for Clashes.
 */
export function getClashCandidateMoves(moves: MoveData[]): MoveData[] {
    return moves.filter((m) => isDamagingMove(m) && typeof m.name === 'string' && m.name.trim().length > 0);
}

/**
 * Selects a damaging move suitable for a Clash reaction.
 */
export function selectClashMove(moves: MoveData[], randomFn: () => number = Math.random): MoveData | null {
    const candidates = getClashCandidateMoves(moves);
    if (candidates.length === 0) return null;
    const idx = Math.floor(randomFn() * candidates.length);
    return candidates[idx];
}

/**
 * Formatters for crisp, punchy sheet-directed instructions.
 */
export function formatMoveDirective(pokemonName: string, moveName: string): string {
    const pName = pokemonName?.trim() || 'Active Pokémon';
    const mName = moveName?.trim() || 'Unknown Move';
    return `Roll ${mName} on ${pName}'s sheet!`;
}

export function formatClashDirective(pokemonName: string, moveName: string): string {
    const pName = pokemonName?.trim() || 'Active Pokémon';
    const mName = moveName?.trim() || 'Unknown Move';
    return `Roll Clash (using ${mName}) on ${pName}'s sheet!`;
}

export function formatEvadeDirective(pokemonName: string): string {
    const pName = pokemonName?.trim() || 'Active Pokémon';
    return `Roll Evade on ${pName}'s sheet!`;
}

export function formatFateReactionDirective(
    pokemonName: string,
    result: FateResultType
): { directive: string; note: string } {
    const pName = pokemonName?.trim() || 'Active Pokémon';
    switch (result) {
        case 'Exceptional Yes':
            return {
                directive: `Exceptional Yes! ${pName} reacts swiftly!`,
                note: `${pName} reacts with exceptional speed or tactical advantage.`
            };
        case 'Yes':
            return {
                directive: `Yes, ${pName} reacts!`,
                note: `${pName} reacts in time.`
            };
        case 'Exceptional No':
            return {
                directive: `Exceptional No! ${pName} does not react!`,
                note: `${pName} is completely caught flat-footed or a severe complication ensues.`
            };
        case 'No':
        default:
            return {
                directive: `No, ${pName} does not react!`,
                note: `${pName} fails to react in time and takes the hit directly.`
            };
    }
}

/**
 * Extracts combat target info and moves from an Owlbear Rodeo token item.
 */
export function extractTokenTargetInfo(
    item: {
        id: string;
        name?: string;
        text?: { plainText?: string };
        metadata?: Record<string, unknown>;
    },
    metaId: string = 'pokerole-extension/stats'
): BattleTargetInfo {
    const meta = (item.metadata?.[metaId] || item.metadata || {}) as Record<string, unknown>;
    const name =
        (typeof meta['character-name'] === 'string' && meta['character-name'].trim()) ||
        (typeof meta['name'] === 'string' && meta['name'].trim()) ||
        item.text?.plainText?.trim() ||
        item.name?.trim() ||
        'Token';

    const hpCurr = Number(meta['hp-curr'] ?? meta['hpCurr'] ?? 5);
    const hpMax = Number(meta['hp-max'] ?? meta['hpMax'] ?? 5);
    const willCurr = Number(meta['will-curr'] ?? meta['willCurr'] ?? 4);
    const willMax = Number(meta['will-max'] ?? meta['willMax'] ?? 4);

    const statsObj = meta.stats as Record<string, Record<string, number>> | undefined;
    let insight = 1;
    if (statsObj && statsObj.ins) {
        insight =
            (Number(statsObj.ins.base) || 1) +
            (Number(statsObj.ins.rank) || 0) +
            (Number(statsObj.ins.buff) || 0) -
            (Number(statsObj.ins.debuff) || 0);
    } else {
        insight =
            (Number(meta['ins-base']) || 1) +
            (Number(meta['ins-rank']) || 0) +
            (Number(meta['ins-buff']) || 0) -
            (Number(meta['ins-debuff']) || 0);
    }
    insight = Math.max(1, insight);

    const moves = parseMoves(meta, []);

    return {
        id: item.id,
        name,
        hpCurr,
        hpMax,
        willCurr,
        willMax,
        insight,
        moves
    };
}
