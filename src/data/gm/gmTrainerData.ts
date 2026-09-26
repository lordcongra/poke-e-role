/**
 * Pokerole GM Screen - Trainer Rules & Economy Data
 */

export interface TrainerActionRow {
    action: string;
    trainerArea: string;
    inFray: string;
}

export const TRAINER_ACTIONS_TABLE: TrainerActionRow[] = [
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

export const TRAINER_INITIATIVE_RULES = {
    title: 'Trainer Initiative & Turn Structure',
    badge: 'Turn Timing',
    rules: [
        'In the Fray: The Trainer rolls Initiative (1d6 + Dexterity + Alert) alongside Pokémon and acts on their specific initiative step.',
        'Inside the Trainer Area: The Trainer does NOT roll initiative. Instead, they can take an action during each of their Pokémon’s turns, and also receive a dedicated Trainer turn right before the end of the round.',
        '5 Actions per Round: Just like Pokémon, a Trainer can take up to 5 Actions per Round (bound to the Multiple Action Difficulty chart).'
    ]
};

export const TRAINER_COMMANDING_RULES = {
    title: 'Commanding Pokémon in Battle',
    badge: 'Commands',
    rules: [
        'Commands happen on the Pokémon’s Turn: Verbal or gestural commands are issued during the Pokémon’s turn, NOT on the Trainer’s turn.',
        'No Direct Attacks on Trainer Turn: A Trainer cannot spend a Trainer Action on their own turn to make a Pokémon attack immediately.',
        'Action Cost (RAW): Free Action in the Trainer Area. In the Fray, RAW states commanding costs 1 Trainer Action (adds to multiple action count).',
        'Homebrew Note: Some Storytellers homebrew this to keep commanding as a Free Action even in the fray so trainers in combat aren’t heavily penalized.',
        'Uncommanded Pokémon: If a Trainer cannot or chooses not to command their Pokémon, the Pokémon acts on its own instincts and loyalty.'
    ]
};

export const TRAINER_SWITCHING_RULES = {
    title: 'Switching & Replacing Pokémon (Mid-Round Warning)',
    badge: 'Tactical Warning',
    warning: 'Swapping mid-round causes the incoming Pokémon to forfeit all actions until the new round begins!',
    rules: [
        'Mid-Round Lockout: If you switch out a Pokémon mid-round (or deploy a replacement for a fainted Pokémon mid-round), the incoming Pokémon CANNOT take any actions until the new round begins!',
        'In-Universe Lore: The replacement Pokémon is disoriented and panicked from being suddenly thrust into the heat of active combat; it needs a moment to assess the situation and come to its senses (which happens at the end of the round).',
        'Tactical Vulnerability: Switching mid-round gives the opponent "free" remaining actions where they can attack or set up without the newly deployed Pokémon being able to act or retaliate.',
        'Best Practice: It is almost always ideal to wait until the End of the Round (during the Trainer’s end-of-round turn) to switch Pokémon or deploy replacements.'
    ]
};

export const POKEBALL_THROWING_RULES = {
    title: 'Throwing Pokéballs: In the Fray vs. Trainer Area',
    badge: 'Catching Timing',
    rules: [
        'In the Fray: Throwing a Pokéball is performed on the Trainer’s turn (at their rolled initiative step).',
        'In the Trainer Area: A Pokéball can be thrown during their Pokémon’s turn, or on the Trainer’s dedicated turn right before the end of the round.',
        'Action Economy: Throwing a Pokéball is an Action and counts toward the Trainer’s 5 actions per round.'
    ]
};

export const HUMAN_COMBAT_RULES = {
    title: 'Humans & Trainers in Combat (Defenses & Maneuvers)',
    badge: 'Human Combat',
    rules: [
        'Defenses: Humans calculate both Defense (from Vitality) and Special Defense (from Insight) normally to reduce incoming physical and special damage.',
        'Evasion: Humans CAN Evade attacks by rolling Dexterity + Evasion (Evasion is a universal Maneuver).',
        'Struggle Maneuver (p. 528): Humans can use Struggle as an unarmed physical attack (Pool: Strength + Brawl | Damage: Strength | Type: Normal, Physical).',
        'CANNOT Clash: Clashing strictly requires using a Move. Because humans do not learn Moves and Struggle is classified as a Maneuver, humans CANNOT Clash against incoming attacks!'
    ]
};
