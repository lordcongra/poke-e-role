import type { MoveData, CharacterState } from '@/store/storeTypes';

export interface HurtModifierResult {
    diceModifier: number;
    tag: string;
}

const BRACKET_TAG_REGEX =
    /\[\s*Hurt\s+(Penalty|Bonus)(?::\s*(\d+)\s*(?:per\s*HP|\/HP))?(?:\s*\(max\s*(\d+)\))?\s*\]/i;

const NATURAL_PENALTY_REGEX =
    /(?:\*|\b)(?:Reduce|Remove)\s+(\d+)\s+Dic?e\s+from\s+the\s+Damage\s+Pool[\s\S]*?for\s+every\s+missing\s+(?:point\s+of\s+)?HP(?:[\s\S]*?Up\s+to\s+(\d+))?/i;

const NATURAL_BONUS_REGEX =
    /(?:\*|\b)Add\s+(\d+)\s+Extra\s+Dic?e\s+to\s+the\s+Damage\s+Pool[\s\S]*?for\s+every\s+missing\s+(?:point\s+of\s+)?HP(?:[\s\S]*?Up\s+to\s+(\d+))?/i;

/**
 * Generalized Missing HP Modifier Engine.
 * Evaluates whether a move has missing-HP scaling (penalty or bonus) via:
 * 1. Tier 1: Bracket tags like [Hurt Penalty], [Hurt Bonus], [Hurt Penalty: X per HP (max Y)]
 * 2. Tier 2: Natural language text like "*Reduce 1 Dice from the Damage Pool for every missing HP... Up to 5"
 * 3. Tier 3: Attributes like move.attributes?.HurtPenalty or HurtBonus
 *
 * Returns diceModifier and descriptive tag (e.g. "Eruption (-3 Dice: 3 Missing HP)").
 */
export function parseMissingHpHurtModifier(
    move: MoveData,
    state: CharacterState
): HurtModifierResult {
    if (!move || !state?.health) {
        return { diceModifier: 0, tag: '' };
    }

    let type: 'penalty' | 'bonus' | null = null;
    let dicePerHp = 1;
    let maxDice = 5;

    const textSources = [move.desc, move.effect, move.description].filter(Boolean).join('\n');

    // Tier 1: Bracket tags
    const bracketMatch = BRACKET_TAG_REGEX.exec(textSources);
    if (bracketMatch) {
        type = bracketMatch[1].toLowerCase() === 'bonus' ? 'bonus' : 'penalty';
        if (bracketMatch[2]) {
            dicePerHp = Math.max(1, parseInt(bracketMatch[2], 10) || 1);
        }
        if (bracketMatch[3]) {
            maxDice = Math.max(1, parseInt(bracketMatch[3], 10) || 5);
        }
    } else {
        // Tier 2: Natural language
        const penaltyMatch = NATURAL_PENALTY_REGEX.exec(textSources);
        const bonusMatch = NATURAL_BONUS_REGEX.exec(textSources);

        if (penaltyMatch) {
            type = 'penalty';
            dicePerHp = Math.max(1, parseInt(penaltyMatch[1], 10) || 1);
            if (penaltyMatch[2]) {
                maxDice = Math.max(1, parseInt(penaltyMatch[2], 10) || 5);
            }
        } else if (bonusMatch) {
            type = 'bonus';
            dicePerHp = Math.max(1, parseInt(bonusMatch[1], 10) || 1);
            if (bonusMatch[2]) {
                maxDice = Math.max(1, parseInt(bonusMatch[2], 10) || 5);
            }
        } else if (move.attributes?.HurtPenalty) {
            // Tier 3: Attributes
            type = 'penalty';
            dicePerHp = 1;
            maxDice = 5;
        } else if (move.attributes?.HurtBonus) {
            type = 'bonus';
            dicePerHp = 1;
            maxDice = 5;
        }
    }

    if (!type) {
        return { diceModifier: 0, tag: '' };
    }

    const hpCurr = Number(state.health.hpCurr ?? (state.health as { currentHitPoints?: number }).currentHitPoints) || 0;
    const hpMax = Math.max(1, Number(state.health.hpMax ?? (state.health as { maxHitPoints?: number }).maxHitPoints) || 1);
    const missingHp = Math.max(0, hpMax - hpCurr);

    if (missingHp === 0) {
        return { diceModifier: 0, tag: '' };
    }

    const effectiveDice = Math.min(maxDice, missingHp * dicePerHp);
    const diceModifier = type === 'penalty' ? -effectiveDice : effectiveDice;

    if (diceModifier === 0) {
        return { diceModifier: 0, tag: '' };
    }

    const sign = diceModifier > 0 ? '+' : '';
    const tag = `${move.name || 'Move'} (${sign}${diceModifier} Dice: ${missingHp} Missing HP)`;

    return { diceModifier, tag };
}

