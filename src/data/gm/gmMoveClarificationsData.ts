/**
 * Pokerole GM Screen - Move Clarifications & Special Mechanics
 * Reference compiled from the Pokerole Corebook.
 */

export interface FlingDamageRow {
    itemType: string;
    extraDice: string;
    diceCount: number;
}

export const FLING_DAMAGE_TABLE: FlingDamageRow[] = [
    { itemType: 'Common Berry', extraDice: '+1 Extra Die', diceCount: 1 },
    { itemType: 'Uncommon Berry', extraDice: '+2 Extra Dice', diceCount: 2 },
    { itemType: 'Rare Berry', extraDice: '+3 Extra Dice', diceCount: 3 },
    { itemType: 'Held Item', extraDice: '+4 Extra Dice', diceCount: 4 }
];

export interface EnvironmentPowerRow {
    environment: string;
    energyType: string;
    statusAilment: string;
}

export const ENVIRONMENT_POWER_TABLE: EnvironmentPowerRow[] = [
    { environment: 'Cities / Building', energyType: 'Electric & Steel', statusAilment: 'Paralysis' },
    { environment: 'Plains / Grasslands', energyType: 'Grass', statusAilment: 'Sleep' },
    { environment: 'Forest / Jungle', energyType: 'Bug & Poison', statusAilment: 'Poison' },
    { environment: 'Lake / River / Sea', energyType: 'Water', statusAilment: 'Reduce Strength by 2' },
    { environment: 'Cave / Mountain', energyType: 'Fight & Rock', statusAilment: 'Flinch' },
    { environment: 'Desert / Volcano', energyType: 'Fire & Ground', statusAilment: 'Burn' },
    { environment: 'Ice / Snow', energyType: 'Ice', statusAilment: 'Frozen' },
    { environment: 'Electric Terrain', energyType: 'Electric', statusAilment: 'Paralysis' },
    { environment: 'Grassy Terrain', energyType: 'Grass', statusAilment: 'Sleep' },
    { environment: 'Misty Terrain', energyType: 'Fairy', statusAilment: 'In Love' },
    { environment: 'Psychic Terrain', energyType: 'Psychic', statusAilment: 'Confusion' }
];

export interface BerryFlavorRow {
    flavor: string;
    type: string;
}

export const BERRY_FLAVORS_TABLE: BerryFlavorRow[] = [
    { flavor: 'Bitter', type: 'Dark' },
    { flavor: 'Dry', type: 'Ground' },
    { flavor: 'Effervescent', type: 'Flying' },
    { flavor: 'Fresh', type: 'Grass' },
    { flavor: 'Frozen', type: 'Ice' },
    { flavor: 'Half-eaten', type: 'Bug' },
    { flavor: 'Juicy', type: 'Water' },
    { flavor: 'Numbing', type: 'Psychic' },
    { flavor: 'Oily', type: 'Fight' },
    { flavor: 'Rotten', type: 'Poison' },
    { flavor: 'Salty', type: 'Steel' },
    { flavor: 'Spicy', type: 'Fire' },
    { flavor: 'Sour', type: 'Electric' },
    { flavor: 'Sugary', type: 'Fairy' },
    { flavor: 'Tough', type: 'Rock' },
    { flavor: 'Uneatable', type: 'Dragon' },
    { flavor: 'Withered', type: 'Ghost' }
];

export const ENCORE_CLARIFICATION = {
    title: 'Encore: Action Sequence Lock',
    addedEffect:
        'The Target will repeat the exact same action sequence it had last Round. Target must have had an action sequence. Duration 1 Round. If used on the previous Round, this Move fails.',
    rules: [
        'Exact Repeat: Target repeats the exact same actions, with the exact same targets, just as it performed on the previous Round.',
        'Target Tracking: If the original target is removed from the battlefield, only then may the encored Pokémon choose another target.',
        'Defensive & Clashing Actions: If a failed Evasion was performed last round, the encored Pokémon repeats the failed evasion even if nobody is attacking! If a Clash was performed, it performs a pretend-clash if there is no attack to clash.',
        'Cooldown: Once Encore ends, the user must wait another Round before using it again.',
        'Turn Order: If a target acted before Encore was cast, it only repeats its remaining prior actions until depleted.'
    ]
};

export const FLING_CLARIFICATION = {
    title: 'Fling: Held Item Weaponization',
    rules: [
        'The Pokémon throws its held item as a weapon against the target. Extra dice are added to the Damage Pool based on item rarity.',
        'Item Loss: The Pokémon loses the held item for the rest of the battle.',
        'Recovery: The item may be recovered after the battle ends, or by spending an action during battle to retrieve it from the ground.',
        'Risk of Permanent Loss: Certain Moves or Abilities can make use of discarded items laying on the battlefield, which may cause the item to be permanently lost.'
    ]
};

export const HIDDEN_POWER_CLARIFICATION = {
    title: 'Hidden Power: Unown Exception',
    rule: 'This Move works as normal on most Pokémon except #201 Unown. Because Unown’s entire Move pool consists solely of Hidden Power, Unown is uniquely able to repeat Hidden Power several times in the same Round without penalty.'
};

export const NATURE_SECRET_POWER_CLARIFICATION = {
    title: 'Nature Power & Secret Power: Environmental Alignment',
    rules: [
        'Nature Power: Changes its Type to match the environment or Active Terrain.',
        'Secret Power: Remains Normal-type, but inflicts a Status Ailment/Condition determined by the environment or Active Terrain (e.g. Water environment reduces Strength by 2).',
        'Multiple Energy Sources: If several environmental sources exist at once (e.g. battle in a building on a snowy mountain with Psychic Terrain active), the Trainer/Pokémon is free to choose which energy to align the Move to.'
    ]
};

export const NATURAL_GIFT_CLARIFICATION = {
    title: 'Natural Gift: Berry Flavor Typing',
    rule: 'Not all berries have healing properties, but they all have a flavor. Natural Gift changes its Move Type according to the flavor of the berry the Pokémon just ate or is holding. Berries can be prepared in different ways (fried, salted, dried, withered) to change flavor.'
};

export const SNATCH_CLARIFICATION = {
    title: 'Snatch: Stealing Effects & Buffs',
    rules: [
        'Buffs & Debuffs: User gains all buffs and debuffs on the target; target has its Attributes and Traits reset.',
        'Shield Moves: If the target is under the effects of or using a Shield Move, remove effects from target and apply them to user.',
        'Healing Moves: If target was using or targeted by a Healing Move, apply healing to the user instead.',
        'Substitute Decoys: If target has a decoy active, remove it and give it to user (gets user defenses; decoy HP unchanged).',
        'Battlefield Effects: If target side has Force Field, Entry Hazard, Terrain, Tailwind, etc., transfer to user’s side (duration unchanged).',
        'Restrictions: User CANNOT Snatch from Z-Moves, Max Moves, or when target used Snatch previously on the same Round.'
    ]
};

export const SUBSTITUTE_DECOY_CLARIFICATION = {
    title: 'Substitute Decoys (Substitute & Shed Tail)',
    rules: [
        'Casting Cost & HP: Casting a decoy deals 2 Damage to the user, giving the Decoy a total of 2 HP.',
        'Defenses: Decoy has the exact same Defense and Special Defense the user had at the moment of casting (taking buffs & debuffs into account).',
        'Target Shielding: As long as the decoy stands, the user cannot be targeted nor take damage/effects from Moves (they target the decoy instead).',
        'Move Restriction: Decoys can ONLY be affected by damage from Physical & Special Moves. Added effects do NOT apply to the decoy or user.',
        'Support Moves: Support Moves do not affect the decoy and do not affect the user.',
        'Status & Environment: Ongoing status ailments (e.g. Poison) and environmental hazards (e.g. Sandstorm 1 dmg) still damage the user directly at round end; the decoy remains unaffected.',
        'No Healing: Decoys cannot have their HP restored or defenses increased.',
        'Tactical Synergy: Decoys CAN be given Cover to last longer, and the user may be protected by Shield Moves to reduce damage to the decoy.',
        'Bypass: Certain Moves (like Infiltrator/sound moves) bypass the decoy to strike the user directly.'
    ]
};

export const NARRATIVE_MOVES_GUIDE = {
    title: 'Narrative Approaches to Moves (Creative Play)',
    summary:
        'You don’t always have to stick strictly to battle mechanics! Out of battle (and creatively in battle), Pokémon moves can solve story challenges.',
    examples: [
        'Odor Sleuth: Track and locate a hidden NPC or scent trail.',
        'Keen Eye: Send a Flying Pokémon up to scout terrain or spot distant enemies.',
        'Reflect / Light Screen: Form an invisible floating bridge or barricade across a chasm.',
        'Electric Moves: Power up a dormant machine or fry an electronic lock.',
        'Vine Whip: Anchor a sinking raft or tether an ally across a rushing river.',
        'Shadow Sneak + Miracle Eye: Shadow Sneak through shadows into a locked robot, then use Miracle Eye + Teleport to bring allies inside!'
    ]
};
