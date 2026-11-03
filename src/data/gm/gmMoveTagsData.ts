/**
 * Pokerole GM Screen - Move Tags & Special Mechanics Dataset
 * Complete reference for all official corebook move tags.
 */

export interface MoveTagEntry {
    id: string;
    name: string;
    category: 'action-economy' | 'combat-damage' | 'defensive-field' | 'archetypes' | 'durations';
    categoryLabel: string;
    badgeIcon: string;
    badgeColor?: string;
    summary: string;
    rules: string[];
}

export const MOVE_TAGS_DATA: MoveTagEntry[] = [
    {
        id: 'must-recharge',
        name: 'Must Recharge',
        category: 'action-economy',
        categoryLabel: 'Action Economy & Timing',
        badgeIcon: 'BatteryCharging',
        badgeColor: '#f59e0b',
        summary: 'Powerful moves requiring the Pokémon to spend actions in the next round gathering energy.',
        rules: [
            'After successfully hitting with this Move, the User must spend their first Action of the next Round to recharge.',
            'Stacks per Hit: If a Pokémon lands two Recharge Moves in a single round, its first two Actions in the next round must be spent recharging (3 hits = first 3 actions).',
            'Persists Through Recall: The need to recharge remains even if the Pokémon is recalled to its Pokéball.',
            'Miss / Clash Nullification: If the Move fails its Accuracy roll, is Evaded, or is Clashed (or used to Clash), the user does NOT need to recharge.',
            'Defensive Action Lockout: If an enemy attacks during a mandatory recharge action, attempting to Evade or Clash consumes the reaction and the action slot on the sheet, but the Evade or Clash does NOT take effect because the action was spent recharging. The reaction for that turn is consumed as well.'
        ]
    },
    {
        id: 'rampage',
        name: 'Rampage',
        category: 'action-economy',
        categoryLabel: 'Action Economy & Timing',
        badgeIcon: 'Flame',
        badgeColor: '#ef4444',
        summary: 'Primal fury ignited upon a successful Accuracy roll, locking the user into a 3-use flurry.',
        rules: [
            'Able to be used up to 3 consecutive times per Round upon landing a successful Accuracy roll.',
            'Lockout: While on a Rampage, the Move can only be used on the user’s turn or as a Clash.',
            'Clashing Counts: Clashing while on a Rampage is permitted, but doing so counts as one of the 3 possible uses of the Move.',
            'Clashing Before Activation: Clashing with a Rampage move before the Rampage is active does not activate the Rampage effect.',
            'Termination: While Rampage is active, the User cannot Evade or perform any other Move, or else the Rampage immediately ends.',
            'Inevitable Confusion: After the Rampage ends (whether stopped voluntarily after 1 use or after 3 uses), the user immediately gains the Confused status condition.'
        ]
    },
    {
        id: 'charged-moves',
        name: 'Charge Move',
        category: 'action-economy',
        categoryLabel: 'Action Economy & Timing',
        badgeIcon: 'RefreshCw',
        badgeColor: '#3b82f6',
        summary: 'Devastating moves requiring two full turns and two actions: one to gather energy, and one to unleash the strike.',
        rules: [
            'Requires 2 turns and 2 actions. Turn 1: Roll Accuracy; if successful, the move begins charging (consumes action). Turn 2: Unleash the move and roll Damage normally (consumes action).',
            'Opponents can only Clash/Evade when the move is unleashed, NOT while charging.',
            'The user may Evade while charging.',
            'Clashing while charging locks the user to clashing with the charged move and wastes the preparation turn.'
        ]
    },
    {
        id: 'successive-actions',
        name: 'Successive Actions',
        category: 'action-economy',
        categoryLabel: 'Action Economy & Timing',
        badgeIcon: 'Zap',
        badgeColor: '#eab308',
        summary: 'Rapid multi-strike moves repeating the same action in a single turn against a single target.',
        rules: [
            'Double Action (2x), Triple Action (3x), or Successive Actions (up to 5x) repeating the same Move in a single turn.',
            'One-at-a-Time Voluntary Progression: You do not need to declare upfront how many actions you will take. You can choose to use the move once and end your turn, or attack once, choose to attack again, and repeat one action at a time up to the move limit (2 for Double, 3 for Triple, or up to 5 for Successive).',
            'ALL actions must target the same opponent.',
            'Individual Attack Resolution: Each attack is rolled and resolved individually—Damage is rolled per-attack (attacks are not released all at once). Standard Multiple Action difficulty rules apply to consecutive actions.'
        ]
    },
    {
        id: 'switcher-moves',
        name: 'Switcher Move',
        category: 'action-economy',
        categoryLabel: 'Action Economy & Timing',
        badgeIcon: 'ArrowLeftRight',
        badgeColor: '#14b8a6',
        summary: 'Moves that swap combatants in or out during damage resolution, transferring initiative and action slots.',
        rules: [
            'Switcher for User (green): User switches out with another Pokémon from their party after dealing damage.',
            'Switcher for Foe (orange): Forces the target to switch out.',
            'Inheritance: The incoming Pokémon inherits the switched Pokémon’s remaining actions and Initiative score for that round.',
            'Limit: Switcher effects are limited to once per round per Trainer.',
            'Clash Interactions: Clashing with a Switcher Move does not trigger its effect; clashing against a Switcher Move prevents its activation.'
        ]
    },
    {
        id: 'never-miss',
        name: 'Never Miss',
        category: 'combat-damage',
        categoryLabel: 'Combat & Damage',
        badgeIcon: 'Star',
        badgeColor: '#eab308',
        summary: 'Attacks that track their target infallibly, bypassing evasive maneuvers.',
        rules: [
            'Moves with this tag cannot be Evaded.',
            'They may still be Clashed by the target.',
            'The user must still roll enough successes to meet standard action difficulty.'
        ]
    },
    {
        id: 'ongoing-damage',
        name: 'Ongoing Damage',
        category: 'combat-damage',
        categoryLabel: 'Combat & Damage',
        badgeIcon: 'Flame',
        badgeColor: '#f97316',
        summary: 'Persistent damage effects that continue eating away at target HP at the end of each round.',
        rules: [
            'At the end of each Round, roll 2 Dice of Typeless Damage against the Target.',
            'Multiple sources of Ongoing Damage do not stack; only one source can be active at a time (earliest applied takes priority).',
            'Duration is noted on the individual move entry (typically 3 rounds or until ended by specific actions).'
        ]
    },
    {
        id: 'ranged-moves',
        name: 'Ranged Move',
        category: 'combat-damage',
        categoryLabel: 'Combat & Damage',
        badgeIcon: 'Ruler',
        badgeColor: '#06b6d4',
        summary: 'Physical strikes delivered from a distance that do not make physical contact.',
        rules: [
            'Physical moves that deal damage from a distance without physical contact.',
            'Avoids contact-triggered abilities and effects like Static, Rough Skin, Flame Body, or Poison Point.',
            'Special moves are always considered Ranged by default.'
        ]
    },
    {
        id: 'heals-hp-recovery',
        name: 'Heal',
        category: 'combat-damage',
        categoryLabel: 'Combat & Damage',
        badgeIcon: 'Heart',
        badgeColor: '#ec4899',
        summary: 'Restorative abilities requiring Will Points to patch up wounds during combat.',
        rules: [
            'Basic Heal: Restores 3 HP (regular + lethal).',
            'Complete Heal: Restores 5 HP (regular + lethal).',
            'Minor Heal: Restores specified small HP amount.',
            'Will Point Cost: Spending 1 Will Point is required on a successful Accuracy roll to activate the healing effect. If Accuracy fails, no Will Point is spent.',
            'Battle Cap: In-battle healing is restricted to a maximum of 3 HP per Round (unless overridden by Complete Heal).'
        ]
    },
    {
        id: 'high-critical',
        name: 'High Critical',
        category: 'combat-damage',
        categoryLabel: 'Combat & Damage',
        badgeIcon: 'AlertCircle',
        badgeColor: '#f43f5e',
        summary: 'Attacks honed to exploit vital weak points with reduced critical hit thresholds.',
        rules: [
            'Reduces the extra successes needed to land a Critical Hit from 3 down to 2.',
            'Stacks with the Super Luck Ability (further reducing extra successes needed to 1).',
            'On a Critical Hit, add +2 Damage Dice to the damage roll.'
        ]
    },
    {
        id: 'low-accuracy',
        name: 'Low Accuracy',
        category: 'combat-damage',
        categoryLabel: 'Combat & Damage',
        badgeIcon: 'AlertCircle',
        badgeColor: '#ef4444',
        summary: 'Difficult or unwieldy moves that suffer a flat penalty to their Accuracy roll.',
        rules: [
            'A flat number of successes (e.g. Low Accuracy 1, Low Accuracy 2) is subtracted directly from the Move’s Accuracy roll.',
            'Stacks with Multiple Action Penalties and Pain Penalties.',
            'If subtracted successes reduce total successes below the required difficulty, the move misses.'
        ]
    },
    {
        id: 'recoil',
        name: 'Recoil',
        category: 'combat-damage',
        categoryLabel: 'Combat & Damage',
        badgeIcon: 'Flame',
        badgeColor: '#ea580c',
        summary: 'Self-damaging impact moves that rebound damage back onto the user.',
        rules: [
            'Roll damage normally against the foe; then roll again each success scored as direct damage to the user, completely ignoring defenses.',
            'Abilities like Rock Head or Magic Guard protect the user and negate recoil damage entirely.'
        ]
    },
    {
        id: 'set-damage',
        name: 'Set Damage',
        category: 'combat-damage',
        categoryLabel: 'Combat & Damage',
        badgeIcon: 'Target',
        badgeColor: '#dc2626',
        summary: 'Attacks inflicting an exact, fixed amount of direct damage.',
        rules: [
            'Inflicts an exact fixed amount of damage directly to the target, completely ignoring defenses and external modifiers.',
            'Cannot Be Clashed: Set damage moves cannot be Clashed.'
        ]
    },
    {
        id: 'out-of-range',
        name: 'Out of Range',
        category: 'defensive-field',
        categoryLabel: 'Defensive & Field',
        badgeIcon: 'Ghost',
        badgeColor: '#8b5cf6',
        summary: 'Relocating beyond the conventional battlefield (sky, underground, underwater) to evade standard attacks.',
        rules: [
            'The Pokémon moves too far from the battlefield (high in the air, deep underground, underwater) and cannot be targeted by Moves or Maneuvers.',
            'Exception: Specific moves explicitly able to reach them (e.g. Gust/Thunder vs. Fly, Earthquake vs. Dig) can still target the Pokémon.'
        ]
    },
    {
        id: 'vulnerable',
        name: 'Vulnerable',
        category: 'defensive-field',
        categoryLabel: 'Defensive & Field',
        badgeIcon: 'ShieldAlert',
        badgeColor: '#ef4444',
        summary: 'High-risk exposed state where defenses, cover, and reactions are completely neutralized.',
        rules: [
            'The user is at high risk of harm: can be targeted by certain moves even while Out of Range.',
            'The user cannot take Reactions or benefit from Force Fields or Cover.',
            'The user takes +2 Extra Damage if hit while Vulnerable.'
        ]
    },
    {
        id: 'sound-moves',
        name: 'Sound Move',
        category: 'defensive-field',
        categoryLabel: 'Defensive & Field',
        badgeIcon: 'Music',
        badgeColor: '#ec4899',
        summary: 'Acoustic attacks that resonate through barriers, bypassing conventional protection.',
        rules: [
            'Moves traveling through acoustic sound waves.',
            'Sound Moves completely bypass Substitute Decoys, Force Fields, and Cover!',
            'Can be blocked by sound-dampening abilities like Soundproof.'
        ]
    },
    {
        id: 'shield-moves',
        name: 'Shield Move',
        category: 'defensive-field',
        categoryLabel: 'Defensive & Field',
        badgeIcon: 'ShieldCheck',
        badgeColor: '#10b981',
        summary: 'Protective maneuvers that receive attacks head-on, reducing incoming damage to zero.',
        rules: [
            'Protective moves that receive attacks head-on, reducing incoming damage to zero. Most can be used as Reactions.',
            'Consecutive Penalty: Only 1 Shield Move may be used per round without penalty. Using a Shield Move across subsequent consecutive rounds adds an escalating Low Accuracy 2 penalty (Round 2: Low Accuracy 2; Round 3: Low Accuracy 4; Round 4: Low Accuracy 6, etc.).',
            'Penalty Reset: To reset the penalty, the Pokémon must go an entire Round without using a Shield Move.'
        ]
    },
    {
        id: 'force-field',
        name: 'Force Field',
        category: 'defensive-field',
        categoryLabel: 'Defensive & Field',
        badgeIcon: 'Shield',
        badgeColor: '#6366f1',
        summary: 'Protective team-wide barriers that reduce incoming damage.',
        rules: [
            'Reduces Physical, Special, or all incoming damage for everyone on the user\'s side of the field.',
            'Same Category Stacking Prohibition: Force Fields of the same category (e.g. two physical barriers) do not stack; only the strongest applies.',
            'Can be removed or cleared by moves like Defog or Brick Break.'
        ]
    },
    {
        id: 'entry-hazard',
        name: 'Entry Hazard',
        category: 'defensive-field',
        categoryLabel: 'Defensive & Field',
        badgeIcon: 'ShieldAlert',
        badgeColor: '#f97316',
        summary: 'Traps laid across the opposing side of the battlefield targeting incoming foes.',
        rules: [
            'Traps placed on the foe\'s side that trigger the moment an enemy enters the battlefield (or switches in).',
            'Inflicts damage, status ailments, or stat debuffs depending on the specific hazard.',
            'Can be cleared by field-clearing moves like Rapid Spin or Defog.'
        ]
    },
    {
        id: 'blocking',
        name: 'Blocking',
        category: 'defensive-field',
        categoryLabel: 'Defensive & Field',
        badgeIcon: 'Ban',
        badgeColor: '#64748b',
        summary: 'Tactical lockdown maneuvers preventing targets from retreating or swapping out.',
        rules: [
            'Prevents the target from fleeing the battlefield, switching out, being recalled to their Pokéball, or activating Switcher moves.',
            'Trapping moves and hazard barriers with the Blocking property maintain this lockdown for their entire active duration.'
        ]
    },
    {
        id: 'powder-moves',
        name: 'Powder Move',
        category: 'defensive-field',
        categoryLabel: 'Defensive & Field',
        badgeIcon: 'Sparkles',
        badgeColor: '#10b981',
        summary: 'Moves utilizing dust, spores, or fine powder that affect non-Grass targets.',
        rules: [
            'Moves utilizing natural dust, spores, or fine powder.',
            'Grass-Type Immunity: Grass-type Pokémon possess natural immunity to Powder moves, taking zero damage and ignoring all added effects.',
            'Safety Goggles and similar equipment also confer full immunity to Powder moves.'
        ]
    },
    {
        id: 'ability-archetypes',
        name: 'Move Archetypes',
        category: 'archetypes',
        categoryLabel: 'Move Archetypes',
        badgeIcon: 'Sparkles',
        badgeColor: '#a855f7',
        summary: 'Move groupings that interact directly with specific species abilities.',
        rules: [
            'Bite Moves: Benefit from the Strong Jaw Ability.',
            'Cutter Moves: Slashing and cutting moves that benefit from the Sharpness Ability.',
            'Fist Moves: Punching moves that benefit from the Iron Fist Ability.',
            'Projectile Moves: Blasting and shot objects stopped completely by the Bulletproof Ability.',
            'Wind Moves: Wind currents that power up Pokémon with the Wind Power Ability.'
        ]
    },
    {
        id: 'copy-move',
        name: 'Copy Move',
        category: 'archetypes',
        categoryLabel: 'Move Archetypes',
        badgeIcon: 'Sparkles',
        badgeColor: '#8b5cf6',
        summary: 'Mimicry techniques that replicate another combatant’s move.',
        rules: [
            'Copies the Category, Power, and Added Effects of another move using the user\'s own Accuracy roll.',
            'Re-copy Prohibition: Unique Moves cannot be copied, and a copied move cannot be copied again.',
            'Usually Support moves (cannot Clash unless the copied move is Physical or Special).'
        ]
    },
    {
        id: 'unique-move',
        name: 'Unique Move',
        category: 'archetypes',
        categoryLabel: 'Move Archetypes',
        badgeIcon: 'Sparkles',
        badgeColor: '#a855f7',
        summary: 'Signature powers exclusive to specific Pokémon species.',
        rules: [
            'Signature moves exclusive to specific species that cannot be learned by other Pokémon.',
            'Cannot be copied, switched, stolen, ignored, or overridden by other moves or abilities.',
            'Maintains its unique attributes and effects regardless of battlefield replication or suppression effects.'
        ]
    },
    {
        id: 'durations',
        name: 'Durations',
        category: 'durations',
        categoryLabel: 'Durations',
        badgeIcon: 'Clock',
        badgeColor: '#6b7280',
        summary: 'How long active effects, field conditions, and buffs linger on the battlefield.',
        rules: [
            'Round Duration: Lasts for the specified number of Rounds; ticks down at the end of the Round. Does not restart counter if cast again until the effect has ended.',
            'Whole Scene Duration: Lasts for the entire scene or until the Pokémon leaves the battle. Re-application does not stack; only the most recent applies. Stat buffs/debuffs are Whole Scene duration.',
            'Permanent Duration: Irreversible effects that cannot be undone.'
        ]
    }
];

export function formatMoveTagBroadcast(tag: MoveTagEntry): string {
    const rulesText = tag.rules.map((r) => `• ${r}`).join('\n');
    return `**[Move Tag] ${tag.name}** (${tag.categoryLabel})\n${tag.summary}\n\n**Rules:**\n${rulesText}`;
}
