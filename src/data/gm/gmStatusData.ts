/**
 * Pokerole GM Screen - Status Effects, Categories, Weather & Environmental Hazards Data
 */

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

// 10. ENVIRONMENTAL CONDITIONS / HAZARDS
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
