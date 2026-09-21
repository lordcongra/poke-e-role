export type RollClassificationKind =
    | 'accuracy'
    | 'damage'
    | 'chance'
    | 'evade'
    | 'clash'
    | 'status_action'
    | 'status_passive'
    | 'action_roll'
    | 'other';

export interface ParsedRollMeta {
    rollId: string;
    charName: string;
    moveName: string;
    rollTokenId: string;
    rollKind: RollClassificationKind;
    isEvade: boolean;
    isClash: boolean;
    isDamageRoll: boolean;
    isAccuracyRoll: boolean;
    isActionRoll: boolean;
    isActionConsumingRecovery: boolean;
    shouldAddToRoundTracker: boolean;
    canMarkInRollLog: boolean;
    cleanLabel: string;
}

/**
 * Parses a raw roll log item (from roll-channel broadcast or storage)
 * and classifies it into its Battle Organizer domain (accuracy, damage, chance, evade, clash, status recovery, or action roll).
 */
export function parseRollLogEntry(logData: Record<string, unknown>): ParsedRollMeta | null {
    if (!logData) return null;
    const rollId = String(logData.id || '');
    const label = String(logData.label || logData.title || '');
    const fallbackCharName = String(logData.characterName || logData.player || '');
    const rollTokenId = String(logData.tokenId || '');
    const rawRollType = String(logData.rollType || '')
        .toLowerCase()
        .trim();

    // Check for [Action Roll] prefix or rollType === 'action_roll'
    const isActionRollType = rawRollType === 'action_roll' || /^\[Action Roll\]/i.test(label);

    const clean = label
        .replace(/^\[PRIVATE\]\s*/i, '')
        .replace(/^\[Action Roll\]\s*/i, '')
        .replace(/^(?:📢|🎲|💥|🩹|🍀|🎯|🛡️|❄️)\s*/u, '')
        .trim();

    let charName = fallbackCharName;
    let moveName = '';

    // 1. Check for Chance roll
    const isChanceRoll =
        rawRollType === 'chance' ||
        /^\[Chance Roll\]/i.test(label) ||
        /^\[Take Chances\]/i.test(label) ||
        /\bChance Roll\b/i.test(clean) ||
        /\brerolled \d+ failed dice\b/i.test(clean);

    if (isChanceRoll) {
        return {
            rollId,
            charName,
            moveName: '',
            rollTokenId,
            rollKind: 'chance',
            isEvade: false,
            isClash: false,
            isDamageRoll: false,
            isAccuracyRoll: false,
            isActionRoll: false,
            isActionConsumingRecovery: false,
            shouldAddToRoundTracker: false,
            canMarkInRollLog: false,
            cleanLabel: clean
        };
    }

    // 2. Check for Status Recovery
    const matchStatusRecovery = clean.match(/^(.+?)\s+rolled\s+(.+?)\s+Recovery!/i);
    if (matchStatusRecovery) {
        charName = matchStatusRecovery[1].trim();
        const statusName = matchStatusRecovery[2].trim();
        moveName = `${statusName} Recovery`;

        // Burn (including 1st/2nd/3rd Burn) and Sleep consume an action in combatRoller.ts
        const consumesAction = /Burn/i.test(statusName) || /^Sleep$/i.test(statusName);

        return {
            rollId,
            charName,
            moveName,
            rollTokenId,
            rollKind: consumesAction ? 'status_action' : 'status_passive',
            isEvade: false,
            isClash: false,
            isDamageRoll: false,
            isAccuracyRoll: false,
            isActionRoll: false,
            isActionConsumingRecovery: consumesAction,
            shouldAddToRoundTracker: consumesAction,
            canMarkInRollLog: consumesAction,
            cleanLabel: clean
        };
    }

    // 3. Check for Damage Roll
    const isExplicitDamage = rawRollType === 'damage' || /\((?:Dmg|Damage)\)/i.test(clean);

    if (isExplicitDamage) {
        const matchDmg =
            clean.match(/^(.+?)\s+rolled\s+(.+?)\s*\((?:Damage|Dmg)\)/i) ||
            clean.match(/^(.+?)\s*(?:\(Damage\)|\(Dmg\))/i);
        if (matchDmg) {
            charName = matchDmg[1].trim();
            moveName = (matchDmg[2] || matchDmg[1]).trim();
        }
        return {
            rollId,
            charName,
            moveName: moveName || 'Damage',
            rollTokenId,
            rollKind: 'damage',
            isEvade: false,
            isClash: false,
            isDamageRoll: true,
            isAccuracyRoll: false,
            isActionRoll: false,
            isActionConsumingRecovery: false,
            shouldAddToRoundTracker: false,
            canMarkInRollLog: false,
            cleanLabel: clean
        };
    }

    // 4. Check for Accuracy Roll
    const matchAcc =
        clean.match(/^(.+?)\s+rolled\s+(.+?)\s*\((?:Acc|Attack)\)/i) || clean.match(/^(.+?)\s*(?:\(Acc\)|\(Attack\))/i);
    if (matchAcc) {
        charName = matchAcc[1].trim();
        moveName = (matchAcc[2] || matchAcc[1]).trim();
        return {
            rollId,
            charName,
            moveName,
            rollTokenId,
            rollKind: 'accuracy',
            isEvade: false,
            isClash: false,
            isDamageRoll: false,
            isAccuracyRoll: true,
            isActionRoll: false,
            isActionConsumingRecovery: false,
            shouldAddToRoundTracker: true,
            canMarkInRollLog: true,
            cleanLabel: clean
        };
    }

    // 5. Check for Evade or Clash rolls
    const matchRolledGeneric = clean.match(/^(.+?)\s+(?:rolled|used)\s+(.+?)(?:!|\s*\[|$)/i);
    if (matchRolledGeneric) {
        charName = matchRolledGeneric[1].trim();
        moveName = matchRolledGeneric[2].trim();
    } else {
        moveName = clean.split('[')[0].trim();
    }

    const isEvade = /^(?:evade|evasion)$/i.test(moveName.trim());
    const isClash = /(?:physical clash|special clash|^clash$)/i.test(moveName.trim());

    if (isEvade) {
        return {
            rollId,
            charName,
            moveName: 'Evasion',
            rollTokenId,
            rollKind: 'evade',
            isEvade: true,
            isClash: false,
            isDamageRoll: false,
            isAccuracyRoll: false,
            isActionRoll: false,
            isActionConsumingRecovery: false,
            shouldAddToRoundTracker: true,
            canMarkInRollLog: true,
            cleanLabel: clean
        };
    }

    if (isClash) {
        return {
            rollId,
            charName,
            moveName: moveName || 'Clash',
            rollTokenId,
            rollKind: 'clash',
            isEvade: false,
            isClash: true,
            isDamageRoll: false,
            isAccuracyRoll: false,
            isActionRoll: false,
            isActionConsumingRecovery: false,
            shouldAddToRoundTracker: true,
            canMarkInRollLog: true,
            cleanLabel: clean
        };
    }

    // 6. Check for Action Roll (from Action Rolls menu)
    if (isActionRollType) {
        if (!moveName || moveName.match(/^(?:custom dice|a General)/i)) {
            moveName = 'Action Roll';
        }
        return {
            rollId,
            charName,
            moveName,
            rollTokenId,
            rollKind: 'action_roll',
            isEvade: false,
            isClash: false,
            isDamageRoll: false,
            isAccuracyRoll: false,
            isActionRoll: true,
            isActionConsumingRecovery: false,
            shouldAddToRoundTracker: false,
            canMarkInRollLog: true,
            cleanLabel: clean
        };
    }

    // 7. Other rolls (custom dice, generic rolls, etc.)
    return {
        rollId,
        charName,
        moveName,
        rollTokenId,
        rollKind: 'other',
        isEvade: false,
        isClash: false,
        isDamageRoll: false,
        isAccuracyRoll: false,
        isActionRoll: false,
        isActionConsumingRecovery: false,
        shouldAddToRoundTracker: false,
        canMarkInRollLog: false,
        cleanLabel: clean
    };
}
