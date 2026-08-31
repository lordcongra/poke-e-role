/**
 * Pokerole GM Screen - Combat & Rules Data
 */

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
