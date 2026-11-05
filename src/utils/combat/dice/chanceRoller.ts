import { rollDicePlus } from '@/utils/combat/diceRoller';
import type { RollSyncData } from '@/hooks/owlbearSync/owlbearSyncConstants';

/**
 * Executes a 1-click Chance Die roll (e.g. 1d6>5 needing 6):
 * - Marks the roll entry as chanceRolled in localStorage roll cache
 * - Dispatches local update events
 * - Rolls dice via rollDicePlus with rollType 'chance'
 */
export async function executeChanceRoll(roll: RollSyncData): Promise<void> {
    if (!roll.chanceDice || roll.chanceDice <= 0) return;
    const charName = roll.characterName || roll.player || 'Someone';
    const effectLabel = roll.chanceEffect ? ` for ${roll.chanceEffect}` : '';
    const label = `[Chance Roll] ${charName} rolled Chance Dice${effectLabel}! (Need 6)`;

    try {
        const storedLog = JSON.parse(localStorage.getItem('pkr_roll_log') || '[]');
        if (Array.isArray(storedLog)) {
            const updatedLog = storedLog.map((r: RollSyncData) =>
                r.id === roll.id ? { ...r, chanceRolled: true } : r
            );
            localStorage.setItem('pkr_roll_log', JSON.stringify(updatedLog));
            window.dispatchEvent(new Event('pkr-roll-log-update'));
            window.dispatchEvent(new Event('storage'));
        }
    } catch (e) {
        console.warn('[executeChanceRoll] Failed to update chanceRolled in roll log:', e);
    }

    await rollDicePlus(`${roll.chanceDice}d6>5`, label, 'chance', roll.chanceEffect || '');
}

