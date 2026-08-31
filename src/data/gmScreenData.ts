/**
 * Pokerole 3.0 GM Screen & Cheat Sheet Data
 * Based on the reference compilation by Willowlark
 * Includes all rules, combat flow, statuses, weather, environment hazards,
 * catching, training points, encounter balancing, and type matchups.
 */

export interface GmCheatItem {
    id: string;
    title: string;
    category: 'rules' | 'status' | 'weather' | 'catching' | 'training' | 'balance' | 'types';
    categoryLabel: string;
    badge?: string;
    summary: string;
    keywords: string[];
    discordMarkdown: string;
    broadcastText: string;
    tableData?: {
        headers: string[];
        rows: string[][];
    };
    notes?: string[];
}

export const GM_SCREEN_AUTHOR = 'Willowlark';
export const GM_SCREEN_CREDITS =
    "Pokerole 3.0 GM Screen reference compiled by Willowlark. Adapted and enhanced for Congra's Pokérole Autosheet.";

// 1. SKILLS & ATTRIBUTES
export const SKILLS_DATA = {
    attributes: [
        { name: 'Strength', desc: 'Physical power, lifting, close-combat raw force.' },
        { name: 'Dexterity', desc: 'Agility, hand-eye coordination, speed, reflexes.' },
        { name: 'Vitality', desc: 'Endurance, stamina, physical resilience, health.' },
        { name: 'Special', desc: 'Energy projection, elemental mastery, aura power.' },
        { name: 'Insight', desc: 'Mental sharpness, willpower, tactical awareness.' }
    ],
    fight: [
        { name: 'Brawl', type: 'General', desc: 'Unarmed melee fighting and physical combat.' },
        { name: 'Throw', type: 'Human*', desc: 'Throwing Pokéballs, stones, and items accurately.' },
        { name: 'Weapons', type: 'Human*', desc: 'Wielding melee and ranged handheld weaponry.' },
        { name: 'Evasion', type: 'General', desc: 'Dodging attacks, diving for cover, ducking.' },
        { name: 'Clash', type: 'Pokémon^', desc: 'Contesting opponent attacks with equal power.' },
        { name: 'Channel', type: 'Pokémon^', desc: 'Focusing spiritual and elemental energy.' }
    ],
    survival: [
        { name: 'Alert', desc: 'Perception, spotting danger, initiative rolls.' },
        { name: 'Athletic', desc: 'Running, jumping, climbing, swimming, acrobatics.' },
        { name: 'Nature', desc: 'Wilderness knowledge, tracking, weather, flora/fauna.' },
        { name: 'Stealth', desc: 'Sneaking, hiding, moving silently in shadows.' }
    ],
    social: [
        { name: 'Charm', desc: 'Persuasion, friendliness, winning trust, diplomacy.' },
        { name: 'Empathy', desc: 'Understanding emotions, reading body language.' },
        { name: 'Etiquette', desc: 'Manners, social customs, navigating high society.' },
        { name: 'Intimidate', desc: 'Coercion, frightening foes, projecting dominance.' },
        { name: 'Perform', desc: 'Acting, singing, dancing, entertaining crowds.' }
    ],
    knowledge: [
        { name: 'Crafts', desc: 'Building, repairing items, cooking, mechanics.' },
        { name: 'Lore', desc: 'History, myths, legends, ancient ruins, culture.' },
        { name: 'Medicine', desc: 'First aid, treating wounds/poisons, pharmaceuticals.' },
        { name: 'Science', desc: 'Technology, computers, physics, biology, chemistry.' }
    ],
    socialAttributes: [
        { name: 'Tough', desc: 'Grit, determination, withstanding stress and intimidation.' },
        { name: 'Cool', desc: 'Style, composure, charismatic confidence.' },
        { name: 'Clever', desc: 'Wit, fast thinking, puzzle solving, cunning.' },
        { name: 'Beauty', desc: 'Grace, visual aesthetic, magnetic presence.' },
        { name: 'Cute', desc: 'Innocence, endearing nature, disarming charm.' }
    ]
};

// 2. SUCCESSES & DIFFICULTY
export const DIFFICULTY_TABLE = [
    { action: '1st Action', successes: '1 Success', difficulty: 'Troublesome', desc: 'Standard single action roll.' },
    { action: '2nd Action', successes: '2 Successes', difficulty: 'Challenging', desc: 'Second action taken in the same round.' },
    { action: '3rd Action', successes: '3 Successes', difficulty: 'Hard', desc: 'Third action taken in the same round.' },
    { action: '4th Action', successes: '4 Successes', difficulty: 'Very Hard', desc: 'Fourth action taken in the same round.' },
    { action: '5th Action', successes: '5 Successes', difficulty: 'Almost Impossible', desc: 'Fifth action (maximum possible actions per round).' }
];

// 3. WILL POINTS
export const WILL_SPENDING = [
    {
        name: 'Power Through the Pain',
        cost: '1 Will',
        effect: 'Ignore one Pain Penalty for the rest of the scene.'
    },
    {
        name: 'Take Your Chances',
        cost: '1 Will',
        effect: 'Re-roll one unsuccessful die from all Action Rolls this round.'
    },
    {
        name: 'Pushing Fate',
        cost: '1 Will',
        effect: 'Add +1 automatic success to a single roll. (Does NOT work for Damage or Chance rolls).'
    }
];

export const WILL_RECOVERY = [
    'Rest for a few days in safety',
    'Complete an important story achievement or milestone',
    'Win a challenging battle',
    'Spend quality 2-hour training time with your Pokémon'
];

// 4. COMBAT FLOW STEPS
export const COMBAT_FLOW_STEPS = [
    {
        step: 1,
        title: 'Combat Starts! Initiative',
        items: [
            'Roll Initiative for each combatant: 1d6 + Dexterity + Alert.',
            'Each Pokémon combatant declares which Ability is active.',
            'Storyteller / GM informs combatants about active Weather and Terrain effects.'
        ]
    },
    {
        step: 2,
        title: 'Round Starts! Taking Turns',
        items: [
            'Take turns in initiative order (highest to lowest).',
            'On each Pokémon’s turn: Choose to use a Move / Action, or choose to Pass and do nothing.',
            'If a Pokémon has already taken 5 Actions this round, they must pass.'
        ]
    },
    {
        step: 3,
        title: 'Round Ends!',
        items: [
            'When every Pokémon in the Initiative Order Passes, the Round ends.',
            'At the end of the round, Trainers who are NOT In the Fray may take their Trainer Action.'
        ]
    },
    {
        step: 4,
        title: 'Next Round or Battle Ends',
        items: ['If combatants want to continue battling, reset action counts and start the next round.']
    }
];

// 5. USING A MOVE & REACTIONS
export const MOVE_RESOLUTION_STEPS = [
    {
        step: 1,
        title: 'Accuracy Roll',
        desc: 'Attacker rolls the Move’s Accuracy Dice pool (Attribute + Fight/Skill + Modifiers). Required successes determined by Multiple Action Table (1st = 1, 2nd = 2, etc.). Subtract Pain Penalties from Accuracy Dice pool. If successes < required, the move misses.'
    },
    {
        step: 2,
        title: 'Defender Reactions',
        desc: 'Defender may declare a Reaction:\n• Reaction: Executes BEFORE the attacker rolls damage (e.g. Evade, Clash maneuvers). The Attacker may respond with a Reaction if their Reaction speed is HIGHER.\n• Late Reaction: Executes AFTER the attacker’s move resolves. The Attacker may respond with a Late Reaction (resolve lowest number first). Attacker cannot use a standard Reaction against a Late Reaction.'
    },
    {
        step: 3,
        title: 'Damage Roll & Critical Hits',
        desc: 'Attacker determines Damage Dice pool (Move Power + Strength/Special - Defender’s Defense/Sp.Def). If Accuracy scored 3+ successes HIGHER than required, it is a Critical Hit (+2 extra Damage Dice to the pool)!\n\n💡 Minimum 1 Base Damage: Even if you roll 0 successes on the damage dice pool, a successful hit still deals 1 base damage (unless the foe has Resistance or Immunity).'
    },
    {
        step: 4,
        title: 'Weakness, Resistance & Added Effects',
        desc: '⚡ 1+ Success Requirement: You DO need at least 1 successful dice roll on the damage roll for Added Effects to activate and for Super Effective bonuses to apply!\n\n• Added Effects: Any secondary effect (burn, flinch, stat reduction on target, etc.) ONLY activates if at least 1 success was rolled on the damage dice.\n• Weakness Bonus (+1 / +2): Requires at least 1 success on the damage roll. Each Weakness adds +1 flat damage (+1 for 2x Super Effective, +2 for 4x Extremely Effective).\n• Resistance (-1): Each Resistance subtracts 1 flat damage (reducing 1 base damage down to 0).\n• Immunity: Target takes 0 damage and ignores all effects.'
    },
    {
        step: 5,
        title: 'Deal Damage & Resolve Late Reactions',
        desc: 'Apply final damage to HP/Shields, then execute any declared Late Reactions.'
    }
];

export interface HoldingBackOption {
    id: string;
    title: string;
    desc: string;
}

export const HOLDING_BACK_OPTIONS: HoldingBackOption[] = [
    {
        id: 'half-damage',
        title: 'Deal Half Damage',
        desc: 'You make your damage roll normally but only inflict half of the damage rounded down to those affected by your Move.'
    },
    {
        id: 'forfeit-added-effects',
        title: 'Forfeit Added Effects on the Target',
        desc: 'Your Move hits but you don’t want it to have lasting effects on those affected, so any Added effect that would apply to the target is forfeited. Added Effects that affect the User still apply.'
    },
    {
        id: 'forfeit-critical-hit',
        title: 'Forfeit Critical Hit Bonus Dice',
        desc: 'Your Accuracy roll may have been impeccable, but you do not add the extra damage dice (+2 dice) on your roll. Even so, the Move still counts as a Critical Hit landed, but we are not gonna be fainting shinies here!'
    }
];

export interface ReactionRuleExample {
    id: string;
    title: string;
    scenario: string;
    orderSteps: string[];
    explanation: string;
}

export const REACTION_RULES_EXAMPLES: ReactionRuleExample[] = [
    {
        id: 'reaction-vs-reaction',
        title: 'Reaction vs. Reaction (Higher Number Resolves First)',
        scenario: 'Togekiss uses Air Slash on its turn. Cyndaquil reacts with Quick Attack (⬆️1). Togekiss responds with Extreme Speed (⬆️2).',
        orderSteps: [
            '1. Extreme Speed (⬆️2) [Togekiss]',
            '2. Quick Attack (⬆️1) [Cyndaquil]',
            '3. Air Slash (Main Action) [Togekiss]'
        ],
        explanation: 'Extreme Speed (⬆️2) resolves first. Quick Attack (⬆️1) resolves second. Togekiss’s initial Air Slash resolves last. Note: Once Extreme Speed (⬆️2) is used, Cyndaquil cannot respond with a lower Reaction (like Reaction 1).'
    },
    {
        id: 'late-reaction-vs-late-reaction',
        title: 'Late Reaction vs. Late Reaction (Lower Number Resolves First)',
        scenario: 'Charizard uses Slash on its turn. Blastoise sets a trap with Avalanche (⬇️4). Charizard answers with Dragon Tail (⬇️6).',
        orderSteps: [
            '1. Slash (Main Action) [Charizard]',
            '2. Avalanche (⬇️4) [Blastoise]',
            '3. Dragon Tail (⬇️6) [Charizard]'
        ],
        explanation: 'Charizard’s Slash hits first. Then Blastoise’s Avalanche (⬇️4) triggers. Finally, Charizard’s Dragon Tail (⬇️6) knocks Blastoise back.'
    },
    {
        id: 'reaction-vs-late-reaction',
        title: 'Reaction vs. Late Reaction (Reaction ➔ Main Action ➔ Late Reaction)',
        scenario: 'Blastoise uses Water Gun on its turn. Charizard reacts with Quick Attack (⬆️1). Blastoise answers with Avalanche (⬇️4).',
        orderSteps: [
            '1. Quick Attack (⬆️1) [Charizard]',
            '2. Water Gun (Main Action) [Blastoise]',
            '3. Avalanche (⬇️4) [Blastoise]'
        ],
        explanation: 'Quick Attack (⬆️1) resolves before the main action. Then Water Gun resolves. Finally, Avalanche (⬇️4) triggers after the main hit resolves. (Note: You cannot use a regular Reaction ⬆️ against a Late Reaction ⬇️).'
    }
];

export const REACTION_CORE_RULES = [
    {
        title: 'Action Economy Cost',
        desc: 'Rolling any Reaction or Late Reaction consumes 1 of your character’s Actions for the Round, bound to the Multiple Action Difficulty chart.'
    },
    {
        title: '1 Reaction Per Turn Limit',
        desc: 'You can only use ONE reaction per turn (including during an opponent’s turn or on your own turn when answering an incoming reaction).'
    },
    {
        title: 'Preemption & Lockout',
        desc: 'If a higher reaction number is declared (e.g. ⬆️2 Extreme Speed), you cannot respond to it with a lower reaction number (e.g. ⬆️1 Quick Attack).'
    },
    {
        title: 'Cannot React to a Late Reaction',
        desc: 'Standard Reactions (⬆️) CANNOT be used against a Late Reaction (⬇️). Late Reactions can only be answered by another Late Reaction (⬇️).'
    },
    {
        title: 'Can Late React to a Reaction',
        desc: 'You CAN use a Late Reaction (⬇️) to answer an opponent’s standard Reaction (⬆️).'
    },
    {
        title: 'No Reaction Without a Reason',
        desc: 'You cannot react unless you are being directly targeted by an incoming action or answering a reaction. (Exception: Support moves like Wide Guard or maneuvers like Cover an Ally can protect teammates).'
    }
];

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

// 8. STATUS EFFECTS & CATEGORIES
export interface StatusCategoryInfo {
    category: 'Aggravating' | 'Fixed' | 'Volatile';
    title: string;
    color: string;
    badgeColor: string;
    desc: string;
    examples: string;
}

export const STATUS_CATEGORIES_DATA: StatusCategoryInfo[] = [
    {
        category: 'Aggravating',
        title: 'Aggravating',
        color: '#D32F2F',
        badgeColor: 'color-mix(in srgb, #D32F2F 15%, transparent)',
        desc: 'The condition will worsen, dealing more damage overtime if left untreated.',
        examples: '3rd Degree Burn, Badly Poisoned'
    },
    {
        category: 'Fixed',
        title: 'Fixed',
        color: '#E65100',
        badgeColor: 'color-mix(in srgb, #E65100 15%, transparent)',
        desc: 'The condition remains as is; it does not worsen over time, but it does not heal on its own.',
        examples: '1st & 2nd Degree Burn, Poison, Paralysis'
    },
    {
        category: 'Volatile',
        title: 'Volatile',
        color: '#00897B',
        badgeColor: 'color-mix(in srgb, #00897B 15%, transparent)',
        desc: 'The condition is temporary and can heal on its own after a few minutes or by switching out the affected subject.',
        examples: 'Confused, Disabled, Paralysis (Partial), Flinched, Frozen, In Love, Sleep'
    }
];

export const STATUS_RULES_INFO = {
    overview:
        'Status Ailments & Conditions impair the normal state of Pokémon and trainers. They range from painful physical burns to mental distractions like confusion.',
    stacking:
        'Status Ailments & Conditions can stack into each other! A Pokémon can be asleep, poisoned, and confused simultaneously. Inflicting Burn or Poison more than once bumps it to the next degree.',
    curing:
        'Only a Full Heal, Full Restore, or Lum Berry can cure more than one condition at once. Otherwise, conditions must be treated one by one or allowed to heal naturally.',
    league:
        'Official Pokémon League matches may restrict stacking conditions (such as the Sleep/Status Clause).',
    lethal:
        'Severe conditions (2nd/3rd Degree Burn, Badly Poisoned) deal Lethal Damage under the Optional Lethal Damage rule.'
};

export interface StatusEffectData {
    id: string;
    name: string;
    badge: string;
    categoryType: 'Aggravating' | 'Fixed' | 'Volatile';
    color: string;
    textColor: string;
    effect: string;
    resist: string;
    duration: string;
}

export const STATUS_EFFECTS_DATA: StatusEffectData[] = [
    {
        id: 'status-burn-1',
        name: '1st Degree Burn',
        badge: 'Regular',
        categoryType: 'Fixed',
        color: '#FFCC80',
        textColor: '#000000',
        effect: '1 Damage at end of each round. Fire-type Pokémon are immune.',
        resist: 'Dexterity + Athletic (Action): 4 Cumulative Successes to cure.',
        duration: 'Until Cured or Fainting'
    },
    {
        id: 'status-burn-2',
        name: '2nd Degree Burn',
        badge: 'Lethal',
        categoryType: 'Fixed',
        color: '#FF8A65',
        textColor: '#000000',
        effect: '2 Lethal Damage at end of each round. Fire-type Pokémon are immune.',
        resist: 'Dexterity + Athletic (Action): 6 Cumulative Successes to cure.',
        duration: 'Until Cured, Fainting, or Death'
    },
    {
        id: 'status-burn-3',
        name: '3rd Degree Burn',
        badge: 'Lethal Escalating',
        categoryType: 'Aggravating',
        color: '#D32F2F',
        textColor: '#FFFFFF',
        effect: '3 Lethal Damage at end of round. Increases by +1 each round. Fire-type Pokémon are immune.',
        resist: 'Dexterity + Athletic (Action): 8 Cumulative Successes to cure.',
        duration: 'Until Cured, Fainting, or Death'
    },
    {
        id: 'status-confused',
        name: 'Confused',
        badge: 'Mental',
        categoryType: 'Volatile',
        color: '#80CBC4',
        textColor: '#000000',
        effect: 'If an action fails, suffer 1 damage. Action Roll Penalty: Standard Rank & Lower (-1 Success), Advanced to Ace (-2 Successes), Master+ (-3 Successes for the round).',
        resist: 'Insight roll at round start (2+ successes ignores this effect for the round).',
        duration: 'End of Scene or Switched Out'
    },
    {
        id: 'status-disabled',
        name: 'Disabled',
        badge: 'Move Lock',
        categoryType: 'Volatile',
        color: '#E0E0E0',
        textColor: '#000000',
        effect: 'Cannot use the Disabled Move. Max 1 Disabled Move per Pokémon at a time.',
        resist: 'N/A',
        duration: '5 Minutes out of Combat'
    },
    {
        id: 'status-paralysis',
        name: 'Paralysis',
        badge: 'Impairment',
        categoryType: 'Fixed',
        color: '#FFF59D',
        textColor: '#000000',
        effect: '-2 Dexterity, moves at 1/2 speed. Electric-type Pokémon are immune.',
        resist: 'N/A (Requires treatment/healing item).',
        duration: '12 Hours or Cured'
    },
    {
        id: 'status-flinched',
        name: 'Flinched',
        badge: 'Interruption',
        categoryType: 'Volatile',
        color: '#B0BEC5',
        textColor: '#000000',
        effect: 'Next turn takes NO Action. Cannot use Reactions until end of next turn. Can only be flinched once per round.',
        resist: 'N/A',
        duration: '1 Action'
    },
    {
        id: 'status-poison',
        name: 'Poison',
        badge: 'Regular Toxic',
        categoryType: 'Fixed',
        color: '#CE93D8',
        textColor: '#000000',
        effect: '2 Damage at end of each round. Poison and Steel types are immune.',
        resist: 'Subject remains completely immobile: Damage applies per hour instead.',
        duration: 'Until Fainting or 8 Hours'
    },
    {
        id: 'status-frozen',
        name: 'Frozen',
        badge: 'Immobilized & Full Cover',
        categoryType: 'Volatile',
        color: '#81D4FA',
        textColor: '#000000',
        effect: 'No Actions. Ice types immune. Trapped in an Ice Block (HP 5, Def 2) which acts as Full Cover. Must be broken out before the Pokémon can be damaged again (GM fiat on whether excess damage transfers over).',
        resist: 'Allies/Attacks target Ice Block (HP 5, Def 2). Super Effective moves (Fire/Fight/Rock/Steel) shatter it instantly.',
        duration: 'Until Ice Melts, Shatters, or Pokémon Faints'
    },
    {
        id: 'status-badly-poisoned',
        name: 'Badly Poisoned',
        badge: 'Lethal Escalating',
        categoryType: 'Aggravating',
        color: '#8E24AA',
        textColor: '#FFFFFF',
        effect: '2 Lethal Damage at end of round. Increases by +2 each round. Poison & Steel immune.',
        resist: 'Subject remains completely immobile: Damage applies per hour instead.',
        duration: 'Until Fainting or Death'
    },
    {
        id: 'status-in-love',
        name: 'In Love',
        badge: 'Mental',
        categoryType: 'Volatile',
        color: '#F48FB1',
        textColor: '#000000',
        effect: 'Holds Back against beloved foe & allies (deals 1/2 damage, or up to Storyteller: forfeits crits & added effects to earn favor—poisoning your crush is a red flag!).',
        resist: 'Loyalty or Insight roll when attacking (3+ successes attacks at full power without holding back).',
        duration: '24 Hours'
    },
    {
        id: 'status-sleep',
        name: 'Sleep',
        badge: 'Immobilized',
        categoryType: 'Volatile',
        color: '#9FA8DA',
        textColor: '#000000',
        effect: 'Cannot take actions while asleep.',
        resist: 'Insight roll per action: 5 Cumulative Successes to wake up.',
        duration: 'Few Hours or until Woken Up'
    }
];

// 9. WEATHER CONDITIONS
export const WEATHER_CONDITIONS_DATA = [
    {
        id: 'weather-sunny',
        name: 'Sunny',
        badge: 'Fire / Water',
        color: '#F08030',
        effects: [
            '+1 to Fire Move Power',
            '-1 Damage from Water Moves',
            'Pokémon cannot be Frozen'
        ]
    },
    {
        id: 'weather-rain',
        name: 'Rain',
        badge: 'Water / Fire',
        color: '#6890F0',
        effects: [
            '+1 to Water Move Power',
            '-1 Damage from Fire Moves',
            'No one can gain 2nd Degree or 3rd Degree Burn conditions'
        ]
    },
    {
        id: 'weather-sandstorm',
        name: 'Sandstorm',
        badge: 'Rock / Ground / Steel',
        color: '#E0C068',
        effects: [
            '1 Typeless Damage to Non-Rock, Non-Ground, and Non-Steel types at end of Round. Full Body Cover prevents this damage.',
            '+1 Special Defense to Rock types',
            'Moves that Complete Heal in Sunny Weather only restore 1 HP'
        ]
    },
    {
        id: 'weather-snowy',
        name: 'Snowy',
        badge: 'Ice',
        color: '#98D8D8',
        effects: [
            '+1 to Ice Move Power',
            '+1 Defense to Ice types',
            '+1 Chance die to inflict Frozen condition',
            'Frozen Pokémon’s ice blocks have 7 Hit Points and 3 Defense'
        ]
    },
    {
        id: 'weather-hail',
        name: 'Hail',
        badge: 'Ice Hazard',
        color: '#70A0C0',
        effects: [
            '1 Damage to Non-Ice types at end of round. Full Body Cover prevents this damage.',
            '+1 Chance die to inflict Frozen condition',
            'Moves that Complete Heal in Sunny Weather only restore 1 HP'
        ]
    },
    {
        id: 'weather-desolate',
        name: 'Desolate Weather',
        badge: 'Extreme Sun',
        color: '#D32F2F',
        effects: [
            '+2 to Fire Move Power',
            'Water Type Moves CANNOT be used',
            'Non-Fire types with 4 or less Vitality must roll Vitality (2 successes) at start of each round or suffer 2 Fire Damage',
            'Pokémon cannot be Frozen',
            'Non-Typhoon / Non-Strong Winds weather effects fail'
        ]
    },
    {
        id: 'weather-typhoon',
        name: 'Typhoon',
        badge: 'Extreme Rain',
        color: '#1976D2',
        effects: [
            '+2 to Water Move Power',
            'Fire Type Moves CANNOT be used',
            'Pokémon cannot be Burned',
            'Non-Water types with 4 or less Vitality must roll Vitality (2 successes) at start of each round or suffer 2 Water Damage',
            'Non-Desolate / Non-Strong Winds weather effects fail'
        ]
    },
    {
        id: 'weather-strong-winds',
        name: 'Strong Winds',
        badge: 'Extreme Wind',
        color: '#00897B',
        effects: [
            '+2 to Flying Type Move Damage (Flying types do not get super effective bonuses)',
            'Electric, Ice, and Rock type moves are Neutral against Flying types',
            'Non-Flying types without the Levitate ability with 4 or less Dexterity must roll Dexterity (2 successes) at start of each round or suffer 2 Typeless Damage',
            'Non-Desolate / Non-Strong Winds weather effects fail'
        ]
    }
];

// 10. ENVIRONMENTAL CONDITIONS / HAZARDS (Typo corrected: Cemetery)
export const ENVIRONMENTAL_HAZARDS_DATA = [
    { id: 'env-fog', name: 'Fog', effect: '-1 success from Accuracy Rolls.' },
    { id: 'env-muddy', name: 'Muddy', effect: 'All Pokémon on the ground are Blocked and have -1 Dexterity.' },
    { id: 'env-underwater', name: 'Underwater', effect: 'End of Round: non-Water types roll Vitality to avoid fainting (2 successes required each round underwater).' },
    { id: 'env-on-fire', name: 'On Fire!', effect: 'End of round: roll 3 Chance dice to inflict 2nd Degree Burn to everyone present.' },
    { id: 'env-electric-poles', name: 'Electric Poles', effect: '+1 Damage to Electric type moves.' },
    { id: 'env-lovely-flowers', name: 'Lovely Flowers', effect: '-2 Damage from all Moves. Pokémon cannot Evade.' },
    { id: 'env-sewers', name: 'Sewers', effect: 'End of round: roll 3 Chance dice to inflict Poisoned to everyone present.' },
    { id: 'env-deep-jungle', name: 'Deep in the Jungle', effect: '+2 to rolls involving Nature and Stealth.' },
    { id: 'env-high-poles', name: 'High Poles', effect: 'Non-Flying types roll Dexterity + Athletic (need 2 successes or suffer 2 Typeless Damage).' },
    { id: 'env-sprinklers', name: 'Sprinklers', effect: 'All Pokémon have their type changed to Water.' },
    { id: 'env-cemetery', name: 'Pkmn Cemetery', effect: '+2 to rolls involving Intimidate. Non-Ghost types gain the ability "Run Away".' },
    { id: 'env-minefield', name: 'Minefield', effect: 'Pokémon entering the battlefield suffer 1 Typeless Damage.' },
    { id: 'env-healing-pits', name: 'Healing Pits', effect: 'Battlefield has one or more areas that heal 1 Hit Point when touched, then are depleted.' },
    { id: 'env-torn-world', name: 'Torn World', effect: 'All moves have their target changed at random.' },
    { id: 'env-final-destination', name: 'Final Destination', effect: 'No Items allowed. No Evasion or Clash maneuvers.' }
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

// Full Searchable List of GM Cheat Items
export const GM_CHEAT_ITEMS: GmCheatItem[] = [
    {
        id: 'skills-and-attributes',
        title: 'Skills & Attributes Overview',
        category: 'rules',
        categoryLabel: 'Combat & Rules',
        badge: 'Core Reference',
        summary: 'All 5 Core Attributes, Fight, Survival, Social, Knowledge skills, and Social Attributes.',
        keywords: [
            'skills',
            'attributes',
            'strength',
            'dexterity',
            'vitality',
            'special',
            'insight',
            'brawl',
            'throw',
            'weapons',
            'evasion',
            'clash',
            'channel',
            'alert',
            'athletic',
            'nature',
            'stealth',
            'charm',
            'empathy',
            'etiquette',
            'intimidate',
            'perform',
            'crafts',
            'lore',
            'medicine',
            'science',
            'tough',
            'cool',
            'clever',
            'beauty',
            'cute'
        ],
        broadcastText:
            'Attributes: Strength, Dexterity, Vitality, Special, Insight\nFight: Brawl, Throw*, Weapons*, Evasion, Clash^, Channel^\nSurvival: Alert, Athletic, Nature, Stealth\nSocial: Charm, Empathy, Etiquette, Intimidate, Perform\nKnowledge: Crafts, Lore, Medicine, Science\nSocial Attributes: Tough, Cool, Clever, Beauty, Cute (*Human, ^Pokemon)',
        discordMarkdown: `## 📜 **Pokerole 3.0: Skills & Attributes**
> *Reference list of Core Attributes, Combat Skills, and Non-Combat Competencies.*

**Core Attributes:**
• **Strength:** Physical power, lifting, melee force
• **Dexterity:** Agility, reflexes, speed, precision
• **Vitality:** Stamina, HP, physical resilience
• **Special:** Elemental mastery, aura, energy output
• **Insight:** Mental acuity, perception, tactical wit

**Fight Skills:**
• **Brawl:** Unarmed melee combat
• **Throw (Human*):** Throwing Pokéballs & projectiles
• **Weapons (Human*):** Wielding weapons
• **Evasion:** Dodging, ducking, diving for cover
• **Clash (Pokémon^):** Contesting enemy attacks
• **Channel (Pokémon^):** Projecting special energy

**Survival Skills:** \`Alert\`, \`Athletic\`, \`Nature\`, \`Stealth\`
**Social Skills:** \`Charm\`, \`Empathy\`, \`Etiquette\`, \`Intimidate\`, \`Perform\`
**Knowledge Skills:** \`Crafts\`, \`Lore\`, \`Medicine\`, \`Science\`
**Social Attributes:** \`Tough\`, \`Cool\`, \`Clever\`, \`Beauty\`, \`Cute\``
    },
    {
        id: 'successes-required',
        title: 'Action Difficulty & Successes Required',
        category: 'rules',
        categoryLabel: 'Combat & Rules',
        badge: 'Dice Table',
        summary: 'Target successes required for consecutive actions in a single round (1st to 5th action).',
        keywords: [
            'successes',
            'difficulty',
            'actions',
            'multiple actions',
            'action economy',
            'troublesome',
            'challenging',
            'hard',
            'very hard',
            'almost impossible'
        ],
        broadcastText:
            'Action Difficulty:\n• 1st Action: 1 Success (Troublesome)\n• 2nd Action: 2 Successes (Challenging)\n• 3rd Action: 3 Successes (Hard)\n• 4th Action: 4 Successes (Very Hard)\n• 5th Action: 5 Successes (Almost Impossible)',
        discordMarkdown: `## 🎲 **Action Difficulty / Multiple Actions**
> *Required successes increase for each additional action taken in the same round (Max 5 actions).*

${formatDiscordTable(
    ['Action This Round', 'Required Successes', 'Difficulty Level'],
    DIFFICULTY_TABLE.map((d) => [d.action, d.successes, d.difficulty])
)}`
    },
    {
        id: 'will-points',
        title: 'Will Points (Spending & Recovery)',
        category: 'rules',
        categoryLabel: 'Combat & Rules',
        badge: 'Core Mechanic',
        summary: 'Power Through Pain, Take Your Chances, Pushing Fate, and recovery conditions.',
        keywords: [
            'will',
            'will points',
            'power through the pain',
            'take your chances',
            'pushing fate',
            'faint',
            'reroll',
            're-roll',
            'will recovery'
        ],
        broadcastText:
            'Will Points Spending:\n• Power Through Pain: Ignore 1 Pain Penalty for scene\n• Take Your Chances: Reroll 1 failure from all Action Rolls this round\n• Pushing Fate: +1 Success to a single roll (not dmg/chance)\n⚠️ Cannot use Take Your Chances & Pushing Fate in same round! Spending all Will causes fainting at scene end.',
        discordMarkdown: `## 🌟 **Will Points: Spending & Recovery**
**Spending Will:**
• **Power Through the Pain:** Spend **1 Will** to ignore one Pain Penalty for the rest of the scene.
• **Take Your Chances:** Spend **1 Will** to re-roll one unsuccessful die from all Action Rolls this round.
• **Pushing Fate:** Spend **1 Will** to add one automatic success to a single roll *(Does not work for Damage or Chance rolls)*.

> ⚠️ **Important Rules:**
> • In a single round, you may only use *Take Your Chances* OR *Pushing Fate*—you cannot use both in the same round!
> • Spending all your Will Points in a scene causes that character to **faint** at the end of the scene!

**Recovering Will:**
• Rest for a few days in safety
• Complete an important story achievement
• Win a battle
• Train with your Pokémon (2-hour training session)`
    },
    {
        id: 'combat-flow',
        title: 'Combat Flow & Round Structure',
        category: 'rules',
        categoryLabel: 'Combat & Rules',
        badge: 'Round Sequence',
        summary: 'Step-by-step combat order: Initiative, Action Turns, Round End, and Trainer Actions.',
        keywords: [
            'combat flow',
            'round',
            'initiative',
            'pass',
            'turns',
            'trainer area',
            'in the fray',
            'weather',
            'terrain',
            'ability'
        ],
        broadcastText:
            'Combat Flow:\n1. Combat Starts: Roll Initiative (1d6+Dex+Alert), declare Abilities & Weather/Terrain.\n2. Round Starts: Take turns in init order (Action or Pass). Max 5 actions.\n3. Round Ends: When all pass. Trainers not in the fray may take an action.\n4. Repeat for next round.',
        discordMarkdown: `## ⚔️ **Pokerole Combat Flow**
1. **Combat Starts!** Roll Initiative for each combatant: \`1d6 + Dexterity + Alert\`
   • Each Pokémon declares which Ability is active.
   • Storyteller announces active Weather and Terrain effects.
2. **Round Starts!** Take turns in initiative order. On each Pokémon's turn:
   • Use a Move or another action.
   • Choose to Pass and do nothing (Mandatory pass if 5 actions already taken this round).
3. **Round Ends!** When every Pokémon in Initiative order Passes, the round ends.
   • Trainers who are *not In the Fray* may now take an action.
4. **Next Round:** If combat continues, reset action counts and start the next round.`
    },
    {
        id: 'using-a-move',
        title: 'Using a Move & Damage Resolution',
        category: 'rules',
        categoryLabel: 'Combat & Rules',
        badge: 'Attack Flow',
        summary: 'Accuracy rolls, Reactions, Late Reactions, Damage, 0-success minimum damage, Critical Hits (+2 dice), Added Effects activation, and Type Modifiers.',
        keywords: [
            'move',
            'accuracy',
            'reaction',
            'late reaction',
            'damage',
            'critical hit',
            'weakness',
            'resistance',
            'lethal damage',
            'evade',
            'clash',
            'minimum damage',
            '0 successes',
            'added effects',
            'super effective'
        ],
        broadcastText:
            'Attack Resolution:\n1. Accuracy: Roll Move Acc (Check Action Difficulty). Subtract Pain Penalties.\n2. Reactions: Defender may declare Reaction (Evade/Clash) or Late Reaction.\n3. Damage: Roll (Power + Str/Sp - Def/Sp.Def). Crit: 3+ extra Acc successes = +2 Damage Dice! (0 successes still deals 1 base damage unless Resisted).\n4. Modifiers & Effects: Weakness (+1 for 2x, +2 for 4x) & Added Effects ONLY apply if >=1 damage success is rolled! Resistance: -1 dmg.\n5. Apply Damage & resolve Late Reactions.',
        discordMarkdown: `## 💥 **Using a Move & Combat Resolution**
1. **Accuracy Roll:** Attacker rolls Move Accuracy (Attribute + Fight/Skill). Target successes based on Action Difficulty. Subtract Pain Penalties. If successes < required, move misses.
2. **Defender Reactions:**
   • **Reaction:** Executes *before* damage rolls (Evade, Clash). Attacker can react if their Reaction speed is *higher*.
   • **Late Reaction:** Executes *after* damage resolves. Attacker can Late React (lowest number first). Standard Reactions cannot be used against Late Reactions.
3. **Damage Roll:** Damage Dice = Move Power + Str/Special - Defender's Def/Sp.Def.
   • **Critical Hit:** If Accuracy scored **3+ successes higher** than required, add **+2 dice** to the damage pool!
   • **Minimum 1 Damage (0 Successes):** Even if you roll **0 successes** on the damage roll, a successful attack still inflicts **1 base damage** (unless the target has **Resistance** or **Immunity** to the move's type).
4. **Weakness, Resistance & Added Effects:**
   • **Added Effects:** Require **at least 1 success** on the damage dice to activate and apply to the target.
   • **Weakness Bonus:** Requires **at least 1 success** on the damage dice to activate. Adds **+1 flat damage** for Super Effective (2x) or **+2 flat damage** for Extremely Effective (4x).
   • **Resistance:** Each Resistance subtracts **-1 flat damage** (reducing 1 base damage down to 0).
   • **Immunity:** The target takes 0 damage and ignores all effects.
5. **Resolve:** Apply damage, then resolve any declared Late Reactions.`
    },
    {
        id: 'holding-back-attack',
        title: 'Holding Back an Attack',
        category: 'rules',
        categoryLabel: 'Combat & Rules',
        badge: 'Tactical Option',
        summary: 'Command your Pokémon to contain their strength: deal half damage, forfeit target added effects, or forfeit critical hit bonus dice.',
        keywords: [
            'holding back',
            'hold back',
            'restrain',
            'half damage',
            'forfeit added effects',
            'forfeit crit',
            'critical hit',
            'shinies',
            'catching',
            'mercy',
            'in love'
        ],
        broadcastText:
            'Holding Back an Attack:\nCommand your Pokémon to hold back ("Hold Back!", "Restrain yourself!", "Don’t use full force!") and choose one or more:\n• Deal Half Damage: Inflict half damage rounded down.\n• Forfeit Added Effects on Target: Target ignores added effects (User self-effects still apply).\n• Forfeit Critical Bonus Dice: Skip the +2 bonus damage dice (still counts as a Crit landed).\n\n(Storyteller Note: When "In Love", Pokémon try to earn their beloved’s favor. At Storyteller discretion, this can mean Half Damage or applying all Holding Back options—landing crits or poisoning your crush is a massive red flag!)',
        discordMarkdown: `## ✋ **Holding Back an Attack**
> *Sometimes it will be more convenient to contain the full force of your Pokémon attacks (e.g. avoiding fainting wild shinies or sparring).*
> 
> Give the command to *"Hold Back"*, *"Restrain yourself!"*, *"Don’t use full force!"* or similar to choose **one or a combination** of the following options:

• **Deal Half Damage:** You make your damage roll normally but only inflict **half of the damage rounded down** to those affected by your Move.
• **Forfeit Added Effects on the Target:** Your Move hits but you don’t want it to have lasting effects on those affected, so any **Added effect that would apply to the target is forfeited**. Added Effects that affect the User still apply.
• **Forfeit Critical Hit Bonus Dice:** Your Accuracy roll may have been impeccable, but you **do not add the extra damage dice (+2 dice)** on your roll. Even so, the Move still counts as a Critical Hit landed, but we are not gonna be fainting shinies here!

> 💕 **In Love Status Condition (Storyteller Discretion):**
> When a Pokémon is **In Love**, they are trying to earn their beloved's favor. At the Storyteller's discretion, this can mean dealing **Half Damage**, or applying **all Holding Back options** (forfeiting poison/added effects and critical hits)—because landing a critical hit or poisoning your crush is definitely not going to win you any dates (huge red flag!).
> *Can attack at full power by succeeding on a Loyalty or Insight roll (3+ successes).*`
    },
    {
        id: 'reactions-late-reactions',
        title: 'Reactions & Late Reactions',
        category: 'rules',
        categoryLabel: 'Combat & Rules',
        badge: 'Priority & Timing',
        summary: 'Reactions (⬆️) resolve BEFORE incoming actions (highest speed first). Late Reactions (⬇️) resolve AFTER incoming actions (lowest speed first).',
        keywords: [
            'reactions',
            'reaction',
            'late reactions',
            'late reaction',
            'priority',
            'speed',
            'order',
            'resolution',
            'quick attack',
            'extreme speed',
            'avalanche',
            'dragon tail',
            'timing',
            'interrupt'
        ],
        broadcastText:
            'Reactions & Late Reactions:\n• Reactions (⬆️): Instant movements used when it’s not your turn. Resolve BEFORE the incoming action hits. Higher numbers resolve FIRST (e.g. Extreme Speed ⬆️2 resolves before Quick Attack ⬆️1).\n• Late Reactions (⬇️): Retaliations/traps that resolve AFTER the incoming action hits. Higher numbers resolve LATER (Lower numbers resolve first: Main Action ➔ Avalanche ⬇️4 ➔ Dragon Tail ⬇️6).\n• Interactivity: You CANNOT react (⬆️) to a Late Reaction (⬇️), but you CAN Late React (⬇️) to a Reaction (⬆️).\n• Action Cost: Rolling any Reaction or Late Reaction consumes 1 Action for the Round (bound to Multi-Action chart). Max 1 reaction per turn.\n• Trigger Rule: Cannot use a reaction without an incoming trigger/target (support moves like Wide Guard / Cover an Ally can protect allies).',
        discordMarkdown: `## ⚡ **Reactions & Late Reactions**
> *Reactions are fast, tactical maneuvers and moves used when it is not your turn yet.*

### ⬆️ **Reactions (Fast - Resolve Before Main Action)**
• **Timing:** Resolve **BEFORE** the incoming main action hits.
• **Speed Order:** **Higher numbers resolve FIRST** *(e.g. Reaction 2 Extreme Speed resolves before Reaction 1 Quick Attack, which resolves before the base Air Slash)*.
• **Preemption:** You **cannot** answer a higher reaction number with a lower reaction number.

### ⬇️ **Late Reactions (Delayed - Resolve After Main Action)**
• **Timing:** Resolve **AFTER** the incoming main action hits *(like enduring a blow to trigger an Avalanche)*.
• **Speed Order (Reverse):** **Higher numbers resolve LATER** *(e.g. Main Slash ➔ Late Reaction 4 Avalanche ➔ Late Reaction 6 Dragon Tail)*.
• **Interaction Rule:** You **CANNOT** use a standard Reaction (⬆️) against a Late Reaction (⬇️). Late Reactions can only be answered by another Late Reaction.
• **Late Reacting to a Reaction:** You **CAN** use a Late Reaction against a Reaction *(e.g. ⬆️1 Quick Attack ➔ Main Action ➔ ⬇️4 Avalanche)*.

---
### ⚠️ **Key Rules & Limitations**
1. **Action Cost:** Every Reaction or Late Reaction consumes **1 Action** from your pool for the Round (bound to the Multiple Action difficulty chart).
2. **1 Reaction per Turn:** You can use at most **one reaction per turn** (including enemy turns or your own turn when answering a reaction).
3. **No Reaction Without a Reason:** You cannot react without an incoming trigger/target attacking you *(e.g. in multi-battles, you cannot Quick Attack an enemy attacking an ally)*.
4. **Support Moves Exception:** Defensive support moves *(e.g. Wide Guard)* and intercept maneuvers *(e.g. Cover an Ally)* CAN be used to defend teammates.`
    },
    {
        id: 'pain-penalties',
        title: 'Pain Penalties',
        category: 'rules',
        categoryLabel: 'Combat & Rules',
        badge: 'Injury Penalty',
        summary: 'Thresholds for pain penalties (-1 success at <= half HP, -1 at 1 HP) and Will point negation.',
        keywords: [
            'pain penalties',
            'pain',
            'half hp',
            '1 hp',
            'penalty',
            'power through the pain',
            'will'
        ],
        broadcastText:
            'Pain Penalties:\n• <= Half HP: 1st Pain Penalty (-1 success to all rolls)\n• 1 HP: 2nd Pain Penalty (-1 additional success to all rolls)\n• Negate for scene by paying 1 Will Point (Power Through the Pain).',
        discordMarkdown: `## 🩸 **Pain Penalties**
• **1st Pain Penalty:** Triggered when reaching **<= Half Total HP**. Subtracts **1 success** from all Action Rolls.
• **2nd Pain Penalty:** Triggered when reaching **1 HP**. Subtracts an additional **1 success** (Total -2).
• *Can be negated for the rest of the scene by paying 1 Will Point (Power Through the Pain).*`
    },
    {
        id: 'lethal-damage',
        title: 'Lethal Damage (Optional Rule)',
        category: 'rules',
        categoryLabel: 'Combat & Rules',
        badge: 'Optional Rule',
        summary: 'Permanent death risk, bleeding out/unattended worsening (+1/hour), medical stabilization, and 2x potion costs.',
        keywords: [
            'lethal damage',
            'lethal',
            'death',
            'unconscious',
            'unattended',
            'stabilize',
            'potions',
            'league banned',
            'injuries'
        ],
        broadcastText:
            'Lethal Damage (Optional Rule):\n• Damage to unconscious characters becomes Lethal Damage. Some moves can also deal Lethal Damage directly.\n• Lethal Damage equal to Total HP = at risk of dying (1 more damage = Death!).\n• Left unattended: Suffers +1 Lethal Damage every hour until death or stabilized.\n• Healing: Requires 2 Potion Units per 1 Lethal Damage. Stabilized rest heals 1 Lethal Damage / 16 Hours.\n• Banned from official Pokémon League matches.',
        discordMarkdown: `## 💀 **Lethal Damage (Optional Rule)**
> *Used for darker tones or higher stakes to introduce the possibility of permanent death.*

• **Trigger:** If you or a Pokémon fall unconscious and keep receiving damage, that damage becomes **Lethal Damage**. Some Pokémon can also learn moves that deal Lethal Damage directly when used with lethal intent.
• **Risk of Dying & Death:** If you suffer Lethal Damage equal to your **Total HP**, you are at risk of dying. **1 more Damage and the character dies!**
• **Unattended Worsening:** If a character suffers 1+ lethal damage and is left unattended, they suffer **another lethal damage every hour** until their body can no longer hold on.
• **Healing & Medicine:** Requires **twice as much time and resources** to heal:
  - **Potions:** Requires **2 Potion Units** to heal 1 point of Lethal Damage (instead of 1 unit).
  - **Natural Recovery:** With medical care or wound stabilization, heals **1 Lethal Damage / 16 Hours** (instead of 8 hours).
• **Setting Note:** Banned from official Pokémon League matches; used by ruthless trainers or dangerous wild Pokémon.`
    },
    {
        id: 'trainer-actions',
        title: 'Trainer Actions (Area vs In the Fray)',
        category: 'rules',
        categoryLabel: 'Combat & Rules',
        badge: 'Action Economy',
        summary: 'Action economy for Giving Commands, Switching, Item usage, Entering the Fray, and Escaping.',
        keywords: [
            'trainer actions',
            'trainer area',
            'in the fray',
            'giving commands',
            'switching',
            'use item',
            'enter fray',
            'run away'
        ],
        broadcastText:
            'Trainer Actions:\n• Commands: Free (Area) / +1 Action Count (Fray)\n• Switch: 2x Free anytime, then Action on PKMN turn (Area) / Action on Turn (Fray)\n• Item: PKMN Turn (Area) / Your Turn (Fray)\n• Enter Fray: End of Round or Start of Battle (Area) / End of Round (Fray)\n• Search/Move into Cover: Action on Turn (Fray)\n• Run Away: End of Round Action',
        discordMarkdown: `## 🧢 **Trainer Actions (By Position)**
${formatDiscordTable(
    ['Action', 'In a Trainer Area', 'In the Fray'],
    TRAINER_ACTIONS_TABLE.map((t) => [t.action, t.trainerArea, t.inFray])
)}`
    },
    {
        id: 'cover-mechanics',
        title: 'Cover Mechanics & Defense Bonuses',
        category: 'rules',
        categoryLabel: 'Combat & Rules',
        badge: 'Tactical Defense',
        summary: 'Body coverage defense bonuses (1/4 to FULL) and protection against added attack effects.',
        keywords: [
            'cover',
            'body coverage',
            'defense bonus',
            'full cover',
            'cover table',
            'tactical'
        ],
        broadcastText:
            'Cover Bonuses:\n• 1/4 Coverage: +1 Def/Sp.Def vs Attacks (Takes added effects)\n• 1/2 Coverage: +2 Def/Sp.Def vs Attacks (Takes added effects)\n• 3/4 Coverage: +3 Def/Sp.Def vs Attacks (Takes added effects)\n• FULL Coverage: Cover must be destroyed first (Immune to added effects)',
        discordMarkdown: `## 🛡️ **Cover Mechanics & Defense Bonuses**
${formatDiscordTable(
    ['Body Coverage', 'Bonus Def / Sp.Def vs Attacks', 'Takes Added Effects'],
    COVER_TABLE.map((c) => [c.coverage, c.defBonus, c.addedEffects])
)}`
    },
    {
        id: 'healing-rates',
        title: 'Healing Rates (Natural & Potions)',
        category: 'rules',
        categoryLabel: 'Combat & Rules',
        badge: 'Recovery',
        summary: 'Natural recovery time vs Potion unit requirements for Regular and Lethal damage.',
        keywords: ['healing', 'rest', 'potions', 'regular damage', 'lethal damage', 'recovery time', 'hours'],
        broadcastText:
            'Healing Rates:\n• Regular Damage: 1 HP / 8 Hours resting | 1 HP / 1 Potion Unit\n• Lethal Damage: 1 HP / 16 Hours resting | 1 HP / 2 Potion Units',
        discordMarkdown: `## 💊 **Healing & Damage Recovery Rates**
${formatDiscordTable(
    ['Damage Type', 'Natural Healing (Rest)', 'Potion Units'],
    HEALING_TABLE.map((h) => [h.damageType, h.natural, h.potion])
)}`
    },
    {
        id: 'status-effects-all',
        title: 'Status Effects & Conditions Guide',
        category: 'status',
        categoryLabel: 'Status Effects',
        badge: 'All Statuses',
        summary: 'Comprehensive guide to Aggravating, Fixed, and Volatile status categories, stacking rules, cure items, and all individual status conditions.',
        keywords: [
            'status',
            'status effects',
            'status conditions',
            'ailments',
            'aggravating',
            'fixed',
            'volatile',
            'stacking',
            'full heal',
            'lum berry',
            'burn',
            '1st degree burn',
            '2nd degree burn',
            '3rd degree burn',
            'confused',
            'confusion',
            'disabled',
            'disable',
            'paralysis',
            'flinch',
            'flinched',
            'poison',
            'badly poisoned',
            'toxic',
            'frozen',
            'freeze',
            'in love',
            'sleep'
        ],
        broadcastText:
            'Status Categories & Rules:\n• Aggravating: Worsens over time if untreated (3rd Burn, Badly Poisoned).\n• Fixed: Constant effect; needs items/care to heal (1st/2nd Burn, Poison, Paralysis).\n• Volatile: Temporary; heals after time/switching out (Confused, Disabled, Flinch, Frozen, In Love, Sleep).\n• Stacking: Statuses stack! Inflicting burn/poison again bumps to next degree. Only Full Heal/Restore & Lum Berry cure multiple conditions at once.',
        discordMarkdown: `## 🧪 **Pokerole Status Ailments & Conditions**
> *Status conditions impair Pokémon and humans. They fall into three primary categories:*

### 📊 **Status Categories**
• **Aggravating:** The condition will worsen, dealing more damage over time if left untreated *(3rd Degree Burn, Badly Poisoned)*.
• **Fixed:** The condition remains as is; it does not worsen over time, but it does not heal on its own *(1st & 2nd Degree Burn, Poison, Paralysis)*.
• **Volatile:** The condition is temporary and can heal on its own after a few minutes or by switching out *(Confused, Sleep, Flinched, Disabled, In Love, Frozen)*.

> ⚠️ **Status Stacking & Curing:**
> • Statuses **can stack** (e.g. Asleep + Poisoned + Confused at once). Re-inflicting Burn or Poison bumps it to the next degree!
> • **Only Full Heal, Full Restore, and Lum Berry** cure more than one condition at a time.
> • Official League matches may enforce single-condition or sleep clauses.

---
### 📋 **Individual Status Reference**
${STATUS_EFFECTS_DATA.map(
    (s) => `#### **${s.name}** [${s.badge} | ${s.categoryType}]
• **Effect:** ${s.effect}
• **Resist / Cure:** ${s.resist}
• **Duration:** ${s.duration}`
).join('\n\n')}`
    },
    {
        id: 'weather-conditions-all',
        title: 'Weather Conditions Reference',
        category: 'weather',
        categoryLabel: 'Weather & Environment',
        badge: 'Weather',
        summary: 'Sunny, Rain, Sandstorm, Snowy, Hail, Desolate Weather, Typhoon, Strong Winds.',
        keywords: [
            'weather',
            'sunny',
            'rain',
            'sandstorm',
            'snowy',
            'snow',
            'hail',
            'desolate weather',
            'typhoon',
            'strong winds',
            'harsh sunlight',
            'heavy rain',
            'weather effects'
        ],
        broadcastText:
            'Weather:\n• Sunny: +1 Fire Pwr, -1 Water Dmg, No Freeze\n• Rain: +1 Water Pwr, -1 Fire Dmg, No 2nd/3rd Burn\n• Sandstorm: 1 Typeless dmg to non Rock/Grd/Stl, +1 SpD Rock\n• Snowy: +1 Ice Pwr, +1 Def Ice, +1 Freeze chance\n• Hail: 1 dmg to non-Ice, +1 Freeze chance\n• Desolate: +2 Fire Pwr, Water banned, Vit check or 2 fire dmg\n• Typhoon: +2 Water Pwr, Fire banned, Vit check or 2 water dmg\n• Strong Winds: +2 Flying Dmg, Neutral weaknesses, Dex check or 2 typeless dmg',
        discordMarkdown: `## ☀️ **Battlefield Weather Conditions**
${WEATHER_CONDITIONS_DATA.map(
    (w) => `### **${w.name}** [${w.badge}]
${w.effects.map((e) => `• ${e}`).join('\n')}`
).join('\n\n')}`
    },
    {
        id: 'environmental-hazards-all',
        title: 'Environmental Hazards & Battlefield Conditions',
        category: 'weather',
        categoryLabel: 'Weather & Environment',
        badge: 'Hazards',
        summary: 'Fog, Muddy, Underwater, On Fire, Electric Poles, Lovely Flowers, Sewers, Jungle, High Poles, Sprinklers, Cemetery, Minefield, Healing Pits, Torn World, Final Destination.',
        keywords: [
            'environment',
            'hazards',
            'fog',
            'muddy',
            'underwater',
            'on fire',
            'electric poles',
            'flowers',
            'sewers',
            'jungle',
            'high poles',
            'sprinklers',
            'pkmn cemetery',
            'cemetery',
            'semantary',
            'minefield',
            'healing pits',
            'torn world',
            'final destination'
        ],
        broadcastText:
            'Hazards: Fog (-1 Acc), Muddy (Blocked, -1 Dex), Underwater (Vit roll or faint), On Fire (3 Chance dice 2nd Burn), Electric Poles (+1 Elec dmg), Flowers (-2 Dmg, no evade), Sewers (3 Chance dice Poison), Jungle (+2 Nature/Stealth), High Poles (Dex+Athletic or 2 dmg), Sprinklers (Water type), PKMN Cemetery (+2 Intimidate, Run Away), Minefield (1 entry dmg), Healing Pits (+1 HP), Torn World (random target), Final Destination (No items/evasion/clash).',
        discordMarkdown: `## 🌋 **Environmental Hazards & Conditions**
${formatDiscordTable(
    ['Condition', 'Battlefield Effect'],
    ENVIRONMENTAL_HAZARDS_DATA.map((h) => [h.name, h.effect])
)}`
    },
    {
        id: 'catching-mechanics',
        title: 'Catching Pokémon Rules & Calculator',
        category: 'catching',
        categoryLabel: 'Catching & Training',
        badge: 'Catching',
        summary: 'Seal Potency dice, HP bonuses, Status bonuses, and Target Success requirements by Rank.',
        keywords: [
            'catching',
            'pokeball',
            'greatball',
            'ultraball',
            'seal potency',
            'capture',
            'wild pokemon',
            'catch roll',
            'status bonus'
        ],
        broadcastText:
            'Catching Formula: Seal Potency Dice + Bonus Successes vs Required Successes.\nBalls: Poké (4d), Great (6d), Ultra (8d), Custom (Up to 9d)\nBonuses: Half HP (+1), 1 HP (+2), Status Ailment (+1 per status)\nRequired: Starter (3), Rookie (4), Standard (6), Advanced (8), Expert (9), Ace (10)',
        discordMarkdown: `## 🔴 **Catching Pokémon Rules**
> **Formula:** \`Seal Potency Dice Roll + Bonus Successes\` >= \`Required Successes\`

**Pokéballs (Seal Potency):**
${formatDiscordTable(
    ['Item', 'Seal Potency'],
    CATCH_BALLS_TABLE.map((b) => [b.item, b.sealPotency])
)}

**Wild Pokémon Condition Bonuses:**
${formatDiscordTable(
    ['Condition', 'Bonus'],
    CATCH_CONDITIONS_TABLE.map((c) => [c.condition, c.bonus])
)}

**Wild Pokémon Target Successes:**
${formatDiscordTable(
    ['Wild Rank', 'Required Successes'],
    CATCH_RANKS_TABLE.map((r) => [r.rank, r.required])
)}`
    },
    {
        id: 'training-points-guide',
        title: 'Training Points (TP), Sessions & Spending',
        category: 'training',
        categoryLabel: 'Catching & Training',
        badge: 'Progression',
        summary: 'Battle TP calculation, 2-hour daily training sessions, Rank Up costs, Evolution, and Move learning.',
        keywords: [
            'tp',
            'training points',
            'training session',
            'rank up',
            'retraining',
            'evolution',
            'learn moves',
            'evolution speed',
            'overrank'
        ],
        broadcastText:
            'TP Rewards:\n• Battle TP: Rank diff (0-3 TP) + Win (+2) + Outnumbered (+2) + Fainted (+1)\n• Training: 2 hr/day. Trainer rolls difficulty roll -> PKMN gets TP = Trainer successes!\n• Rank Up TP: Starter->Rookie (5), Rookie->Std (15), Std->Adv (25), Adv->Exp (30), Exp->Ace (35), Ace->Master (40), Master->Champ (50)\n• Evolve: Fast (10), Medium (30), Slow (50)',
        discordMarkdown: `## 📈 **Training Points (TP) & Progression**
**Battle TP Rewards:**
${formatDiscordTable(
    ['After a Battle...', 'TP Earned'],
    BATTLE_TP_TABLE.map((b) => [b.circumstance, b.tp])
)}

**Daily Training Session (2 Hours):**
${TRAINING_SESSION_RULES.map((r) => `• ${r}`).join('\n')}

**Rank Up & Retraining Costs:**
${formatDiscordTable(
    ['Rank', 'TP to Next Rank', 'Retraining'],
    RANK_UP_TP_TABLE.map((r) => [r.rank, r.tpNextRank, r.retraining])
)}

**Evolution Costs:**
${formatDiscordTable(
    ['Evolution Speed', 'TP to Evolve'],
    EVOLUTION_TP_TABLE.map((e) => [e.speed, e.tp])
)}

**Learning Moves Costs:**
${formatDiscordTable(
    ['Stage', 'Current Rank Move', 'Prior Rank Move', 'Pre-Evo Move', 'TM', 'Overrank Move'],
    LEARN_MOVES_TP_TABLE.map((l) => [l.stage, l.currentRank, l.priorRank, l.preEvo, l.tm, l.overrank])
)}`
    },
    {
        id: 'rank-summary-table',
        title: 'Rank Summary & Attribute/Skill Caps',
        category: 'balance',
        categoryLabel: 'Ranks & Balance',
        badge: 'Balance Matrix',
        summary: 'Max Targets, Skill Maximums, Attribute Points, Skill Points, and All Foes Target Max by Rank.',
        keywords: [
            'rank summary',
            'skill max',
            'attribute points',
            'skill points',
            'max targets',
            'all foes',
            'starter',
            'rookie',
            'standard',
            'advanced',
            'expert',
            'ace',
            'master',
            'champion'
        ],
        broadcastText:
            'Rank Summary:\nStarter (1 tgt, max skill 1, 0 attr, 5 sk)\nRookie (2 tgt, max skill 2, 2 attr, 10 sk)\nStandard (3 tgt, max skill 3, 4 attr, 14 sk)\nAdvanced (4 tgt, max skill 4, 6 attr, 17 sk)\nExpert (5 tgt, max skill 5, 8 attr, 19 sk)\nAce (6 tgt, max skill 5, 10 attr, 20 sk)\nMaster (8 tgt, max skill 5, 10 attr, 22 sk)\nChampion (10 tgt, max skill 5, 14 attr, 25 sk)',
        discordMarkdown: `## 🏆 **Pokerole Rank Summary Table**
${formatDiscordTable(
    ['Rank', 'Max Targets', 'Skill Max', 'Attribute Pts', 'Skill Pts', 'All Foes Max'],
    RANK_SUMMARY_TABLE.map((r) => [
        r.rank,
        String(r.maxTargets),
        String(r.skillMax),
        String(r.attrPoints),
        String(r.skillPoints),
        String(r.allFoesMax)
    ])
)}`
    },
    {
        id: 'encounter-balancing-chart',
        title: 'Encounter Balancing Difficulty Matrix',
        category: 'balance',
        categoryLabel: 'Ranks & Balance',
        badge: 'GM Tool',
        summary: 'Encounter difficulty assessment based on damage effectiveness and target rank differential.',
        keywords: [
            'encounter balancing',
            'encounter difficulty',
            'balance',
            'effortless',
            'too easy',
            'easy',
            'normal',
            'challenging',
            'hard',
            'very hard',
            'extreme',
            'super effective',
            'not very effective'
        ],
        broadcastText:
            'Encounter Balance (Foe Damage vs Rank Differential):\n• Extremely Effective (+2 dmg): Lower (Effortless), Same (Too Easy), +1 Rank (Easy), +2 Ranks (Normal)\n• Super Effective (+1 dmg): Lower (Too Easy), Same (Easy), +1 Rank (Normal), +2 Ranks (Challenging)\n• Neutral: Lower (Easy), Same (Normal), +1 Rank (Challenging), +2 Ranks (Hard)\n• Not-Very Effective (-1 dmg): Lower (Normal), Same (Challenging), +1 Rank (Hard), +2 Ranks (Very Hard)\n• Barely Effective (-2 dmg): Lower (Challenging), Same (Hard), +1 Rank (Very Hard), +2 Ranks (Extreme)\n• Immune: Lower (Hard), Same (Very Hard), +1 Rank (Extreme), +2 Ranks (Punishing)',
        discordMarkdown: `## ⚖️ **Encounter Balancing Difficulty Matrix**
> *Estimate encounter challenge rating based on move effectiveness and foe rank differential.*

${formatDiscordTable(
    ['Foe Receives Damage', 'Lower Rank', 'Same Rank', 'One Rank Higher', 'Two + Ranks Higher'],
    ENCOUNTER_BALANCE_TABLE.map((e) => [e.effectiveness, e.lower, e.same, e.oneHigher, e.twoHigher])
)}`
    },
    {
        id: 'type-matchup-chart',
        title: 'Type Matchup & Effectiveness Chart',
        category: 'types',
        categoryLabel: 'Type Matchups',
        badge: 'Type Chart',
        summary: 'All 18 Pokémon type weaknesses, resistances, and immunities with interactive filter.',
        keywords: [
            'types',
            'type matchups',
            'weakness',
            'resistance',
            'immunity',
            'super effective',
            'normal',
            'fire',
            'water',
            'electric',
            'grass',
            'ice',
            'fighting',
            'poison',
            'ground',
            'flying',
            'psychic',
            'bug',
            'rock',
            'ghost',
            'dragon',
            'dark',
            'steel',
            'fairy',
            'stellar'
        ],
        broadcastText:
            'Type Matchups: Check resistances and weaknesses for all 18 Pokémon types.',
        discordMarkdown: `## 🛡️ **Type Matchup & Resistance Reference**
• **Normal:** Weak to Fighting. Immune to Ghost.
• **Fire:** Resists Fire, Grass, Ice, Bug, Steel, Fairy. Weak to Water, Ground, Rock.
• **Water:** Resists Fire, Water, Ice, Steel. Weak to Electric, Grass.
• **Electric:** Resists Electric, Flying, Steel. Weak to Ground.
• **Grass:** Resists Water, Electric, Grass, Ground. Weak to Fire, Ice, Poison, Flying, Bug.
• **Ice:** Resists Ice. Weak to Fire, Fighting, Rock, Steel.
• **Fighting:** Resists Bug, Rock, Dark. Weak to Flying, Psychic, Fairy.
• **Poison:** Resists Grass, Fighting, Poison, Bug, Fairy. Weak to Ground, Psychic.
• **Ground:** Resists Poison, Rock. Immune to Electric. Weak to Water, Grass, Ice.
• **Flying:** Resists Grass, Fighting, Bug. Immune to Ground. Weak to Electric, Ice, Rock.
• **Psychic:** Resists Fighting, Psychic. Weak to Bug, Ghost, Dark.
• **Bug:** Resists Grass, Fighting, Ground. Weak to Fire, Flying, Rock.
• **Rock:** Resists Normal, Fire, Poison, Flying. Weak to Water, Grass, Fighting, Ground, Steel.
• **Ghost:** Resists Poison, Bug. Immune to Normal, Fighting. Weak to Ghost, Dark.
• **Dragon:** Resists Fire, Water, Electric, Grass. Weak to Ice, Dragon, Fairy.
• **Dark:** Resists Ghost, Dark. Immune to Psychic. Weak to Fighting, Bug, Fairy.
• **Steel:** Resists Normal, Grass, Ice, Flying, Psychic, Bug, Rock, Dragon, Steel, Fairy. Immune to Poison. Weak to Fire, Fighting, Ground.
• **Fairy:** Resists Fighting, Bug, Dark. Immune to Dragon. Weak to Poison, Steel.`
    }
];
