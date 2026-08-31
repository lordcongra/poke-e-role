/**
 * Pokerole GM Screen - Reference Tables, Catching, TP Progression & Balancing Data
 */

export const GM_SCREEN_AUTHOR = 'Willowlark';
export const GM_SCREEN_CREDITS =
    "Pokerole 3.0 GM Screen reference compiled by Willowlark. Adapted and enhanced for Congra's Pokérole Autosheet.";

// 6. TRAINER ACTIONS & COVER
export const TRAINER_ACTIONS_TABLE = [
    { action: 'Giving Commands', trainerArea: 'Free Action', inFray: 'Increases Trainer Action Count by 1' },
    {
        action: 'Switching Pokémon',
        trainerArea: 'Twice per Round Free at anytime, then Action on Pokémon’s Turn',
        inFray: 'Action on your Turn'
    },
    { action: 'Use an Item', trainerArea: 'Action on Pokémon’s Turn', inFray: 'Action on your Turn' },
    { action: 'Enter the Fray', trainerArea: 'End of Round Action or at Start of Battle', inFray: 'End of Round Action' },
    { action: 'Search for Cover', trainerArea: '— (Not in combat zone)', inFray: 'Action on your Turn' },
    { action: 'Move into Found Cover', trainerArea: '— (Not in combat zone)', inFray: 'Action on your Turn' },
    { action: 'Run Away from Battle', trainerArea: 'End of Round Action', inFray: 'End of Round Action' }
];

export const COVER_TABLE = [
    { coverage: '1/4 Coverage', defBonus: '+1 Bonus Def / Sp.Def vs Attacks', addedEffects: 'Yes (Takes added effects)' },
    { coverage: '1/2 Coverage', defBonus: '+2 Bonus Def / Sp.Def vs Attacks', addedEffects: 'Yes (Takes added effects)' },
    { coverage: '3/4 Coverage', defBonus: '+3 Bonus Def / Sp.Def vs Attacks', addedEffects: 'Yes (Takes added effects)' },
    { coverage: 'FULL Coverage', defBonus: 'Cover must be destroyed first', addedEffects: 'No (Protected from added effects)' }
];

export const HEALING_TABLE = [
    { damageType: 'Regular Damage', natural: '1 Damage / 8 Hours', potion: '1 Damage / 1 Unit' },
    { damageType: 'Lethal Damage', natural: '1 Damage / 16 Hours', potion: '1 Damage / 2 Units' }
];

// 7. RANK SUMMARY TABLE
export const RANK_SUMMARY_TABLE = [
    { rank: 'Starter', maxTargets: 1, skillMax: 1, attrPoints: 0, skillPoints: 5, allFoesMax: 1 },
    { rank: 'Rookie', maxTargets: 2, skillMax: 2, attrPoints: 2, skillPoints: 10, allFoesMax: 2 },
    { rank: 'Standard', maxTargets: 3, skillMax: 3, attrPoints: 4, skillPoints: 14, allFoesMax: 3 },
    { rank: 'Advanced', maxTargets: 4, skillMax: 4, attrPoints: 6, skillPoints: 17, allFoesMax: 4 },
    { rank: 'Expert', maxTargets: 5, skillMax: 5, attrPoints: 8, skillPoints: 19, allFoesMax: 5 },
    { rank: 'Ace', maxTargets: 6, skillMax: 5, attrPoints: 10, skillPoints: 20, allFoesMax: 6 },
    { rank: 'Master', maxTargets: 8, skillMax: 5, attrPoints: 10, skillPoints: 22, allFoesMax: 8 },
    { rank: 'Champion', maxTargets: 10, skillMax: 5, attrPoints: 14, skillPoints: 25, allFoesMax: 10 }
];

// 11. CATCHING
export const CATCH_BALLS_TABLE = [
    { item: 'Pokéball', sealPotency: '4 dice', val: 4 },
    { item: 'Greatball', sealPotency: '6 dice', val: 6 },
    { item: 'Ultraball', sealPotency: '8 dice', val: 8 },
    { item: 'Other / Custom Ball', sealPotency: 'Custom Seal Power', val: 0 }
];

export const CATCH_CONDITIONS_TABLE = [
    { condition: 'Pokémon is at half HP or lower', bonus: '+1 Bonus Success', val: 1 },
    { condition: 'Pokémon is at 1 HP', bonus: '+2 Bonus Successes', val: 2 },
    { condition: 'Inflicted with a Status Ailment', bonus: '+1 Bonus Success per Status Ailment', val: 1 }
];

export const CATCH_RANKS_TABLE = [
    { rank: 'Starter', required: '3 Successes', val: 3 },
    { rank: 'Rookie', required: '4 Successes', val: 4 },
    { rank: 'Standard', required: '6 Successes', val: 6 },
    { rank: 'Advanced', required: '8 Successes', val: 8 },
    { rank: 'Expert', required: '9 Successes', val: 9 },
    { rank: 'Ace', required: '10 Successes', val: 10 }
];

// 12. TRAINING POINTS (TP)
export const BATTLE_TP_TABLE = [
    { circumstance: 'Your Pokémon is higher Rank than the most powerful foe', tp: '0 TP' },
    { circumstance: 'Your Pokémon is same Rank as the most powerful foe', tp: '1 TP' },
    { circumstance: 'Your Pokémon is 1 Rank below the most powerful foe', tp: '2 TP' },
    { circumstance: 'Your Pokémon is 2 Ranks below the most powerful foe', tp: '3 TP' },
    { circumstance: 'You won the Battle', tp: '+2 TP' },
    { circumstance: 'You lost the Battle', tp: '+1 TP' },
    { circumstance: 'You won, but this Pokémon fainted or switched out', tp: '+1 TP' },
    { circumstance: 'There were more opponents than your team (Outnumbered)', tp: '+2 TP' }
];

export const TRAINING_SESSION_RULES = [
    'Takes 2 hours and you can train a Pokémon once per day.',
    'Decide how your Pokémon trains and what Action Roll represents it.',
    'Storyteller / GM assigns a Difficulty for the Pokémon’s training.',
    'The Pokémon rolls the Action Roll, and can re-roll the first failure. Two failures ends the session.',
    'The Trainer rolls the same Action Roll, and gets bonus successes equal to the Difficulty assigned to the Pokémon.',
    'The Pokémon earns Training Points (TP) equal to the Trainer’s roll result.',
    'The Pokémon and Trainer recover 2 Will Points. (When training multiple Pokémon, the Trainer only recovers 2 points total).'
];

export const RANK_UP_TP_TABLE = [
    { rank: 'Starter', tpNextRank: '5 TP', retraining: '1 TP' },
    { rank: 'Rookie', tpNextRank: '15 TP', retraining: '10 TP' },
    { rank: 'Standard', tpNextRank: '25 TP', retraining: '20 TP' },
    { rank: 'Advanced', tpNextRank: '30 TP', retraining: '25 TP' },
    { rank: 'Expert', tpNextRank: '35 TP', retraining: '30 TP' },
    { rank: 'Ace', tpNextRank: '40 TP', retraining: '35 TP' },
    { rank: 'Master', tpNextRank: '50 TP', retraining: '40 TP' },
    { rank: 'Champion', tpNextRank: '—', retraining: '45 TP' }
];

export const EVOLUTION_TP_TABLE = [
    { speed: 'Fast Evolution', tp: '10 TP' },
    { speed: 'Medium Evolution', tp: '30 TP' },
    { speed: 'Slow Evolution', tp: '50 TP' }
];

export const LEARN_MOVES_TP_TABLE = [
    { stage: 'First Stage', currentRank: '2 TP', priorRank: '1 TP', preEvo: '—', tm: '5 TP', overrank: '5 per Rank' },
    { stage: 'Second Stage', currentRank: '4 TP', priorRank: '2 TP', preEvo: '5 TP', tm: '5 TP', overrank: '15 per Rank' },
    { stage: 'Final Stage', currentRank: '6 TP', priorRank: '3 TP', preEvo: '10 TP', tm: '5 TP', overrank: '20 per Rank' }
];

// 13. ENCOUNTER BALANCING
export const ENCOUNTER_BALANCE_TABLE = [
    {
        effectiveness: 'Extremely Effective (2 Extra Damage)',
        lower: 'Effortless',
        same: 'Too Easy',
        oneHigher: 'Easy',
        twoHigher: 'Normal'
    },
    {
        effectiveness: 'Super Effective (1 Extra Damage)',
        lower: 'Too Easy',
        same: 'Easy',
        oneHigher: 'Normal',
        twoHigher: 'Challenging'
    },
    {
        effectiveness: 'Neutral (No damage modifier)',
        lower: 'Easy',
        same: 'Normal',
        oneHigher: 'Challenging',
        twoHigher: 'Hard'
    },
    {
        effectiveness: 'Not-Very Effective (1 Damage Reduced)',
        lower: 'Normal',
        same: 'Challenging',
        oneHigher: 'Hard',
        twoHigher: 'Very Hard'
    },
    {
        effectiveness: 'Barely Effective (2 Damage Reduced)',
        lower: 'Challenging',
        same: 'Hard',
        oneHigher: 'Very Hard',
        twoHigher: 'Extreme'
    },
    {
        effectiveness: 'Immune (No Damage taken)',
        lower: 'Hard',
        same: 'Very Hard',
        oneHigher: 'Extreme',
        twoHigher: 'Punishing'
    }
];

// Helper to generate Discord Markdown tables
export function formatDiscordTable(headers: string[], rows: string[][]): string {
    const colWidths = headers.map((header, colIdx) => {
        let max = header.length;
        for (const row of rows) {
            if (row[colIdx] && row[colIdx].length > max) {
                max = row[colIdx].length;
            }
        }
        return Math.max(max, 4);
    });

    const headerLine = headers.map((h, i) => h.padEnd(colWidths[i])).join(' | ');
    const sepLine = colWidths.map((w) => '-'.repeat(w)).join('-|-');
    const rowLines = rows.map((r) => r.map((cell, i) => (cell || '').padEnd(colWidths[i])).join(' | '));

    return '```text\n' + [headerLine, sepLine, ...rowLines].join('\n') + '\n```';
}
