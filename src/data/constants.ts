import type { Rank } from '../store/storeTypes';

export const RANKS: Rank[] = ['Starter', 'Rookie', 'Standard', 'Advanced', 'Expert', 'Ace', 'Master', 'Champion'];

export const POKEMON_TYPES = [
    '',
    'Normal',
    'Fire',
    'Water',
    'Electric',
    'Grass',
    'Ice',
    'Fighting',
    'Poison',
    'Ground',
    'Flying',
    'Psychic',
    'Bug',
    'Rock',
    'Ghost',
    'Dragon',
    'Dark',
    'Steel',
    'Fairy'
];

export const TYPE_COLORS: Record<string, string> = {
    Normal: '#A8A878',
    Fire: '#F08030',
    Water: '#6890F0',
    Electric: '#F8D030',
    Grass: '#78C850',
    Ice: '#98D8D8',
    Fighting: '#C03028',
    Poison: '#A040A0',
    Ground: '#E0C068',
    Flying: '#A890F0',
    Psychic: '#F85888',
    Bug: '#A8B820',
    Rock: '#B8A038',
    Ghost: '#705898',
    Dragon: '#7038F8',
    Dark: '#705848',
    Steel: '#B8B8D0',
    Fairy: '#EE99AC'
};

export const NATURES = [
    '',
    'Hardy',
    'Lonely',
    'Brave',
    'Adamant',
    'Naughty',
    'Bold',
    'Docile',
    'Relaxed',
    'Impish',
    'Lax',
    'Timid',
    'Hasty',
    'Serious',
    'Jolly',
    'Naive',
    'Modest',
    'Mild',
    'Quiet',
    'Bashful',
    'Rash',
    'Calm',
    'Gentle',
    'Sassy',
    'Careful',
    'Quirky'
];

export const AGES = ['--', 'Child', 'Teen', 'Adult', 'Senior'];

export interface KnownItem {
    name: string;
    tags?: string;
}

export const KNOWN_ITEMS: KnownItem[] = [
    { name: 'Air Balloon', tags: '[Immune: Ground]' },
    { name: 'Amulet Coin' },
    { name: 'Black Belt', tags: '[Dmg +1: Fighting]' },
    { name: 'Black Glasses', tags: '[Dmg +1: Dark]' },
    { name: 'Bright Powder' },
    { name: 'Charcoal', tags: '[Dmg +1: Fire]' },
    { name: 'Choice Band' },
    { name: 'Choice Scarf', tags: '[Init +3]' },
    { name: 'Choice Specs' },
    { name: 'Clear Amulet' },
    { name: 'Destiny Knot' },
    { name: 'Dragon Fang', tags: '[Dmg +1: Dragon]' },
    { name: 'Eject Button' },
    { name: 'Eviolite', tags: '[Def +1] [Spd +1]' },
    { name: 'Expert Belt', tags: '[Dmg +1: Super Effective]' },
    { name: 'Fairy Wings', tags: '[Dmg +1: Fairy]' },
    { name: 'Flame Orb', tags: '[Status: 1st Degree Burn]' },
    { name: 'Focus Sash' },
    { name: 'Hard Stone', tags: '[Dmg +1: Rock]' },
    { name: 'Heavy-Duty Boots' },
    { name: 'Iron Ball', tags: '[Dex -1] [Remove Immunity: Ground]' },
    { name: "King's Rock" },
    { name: 'Leek', tags: '[High Crit]' },
    { name: 'Leftovers' },
    { name: 'Life Orb', tags: '[Dmg +2] [Recoil]' },
    { name: 'Light Ball', tags: '[Str +1] [Spe +1]' },
    { name: 'Loaded Dice', tags: '[Chance +2]' },
    { name: 'Lucky Punch', tags: '[High Crit] [Str +2]' },
    { name: 'Magnet', tags: '[Dmg +1: Electric]' },
    { name: 'Metal Coat', tags: '[Dmg +1: Steel]' },
    { name: 'Metronome', tags: '[Combo Dmg +1]' },
    { name: 'Miracle Seed', tags: '[Dmg +1: Grass]' },
    { name: 'Muscle Band', tags: '[Dmg +1: Physical]' },
    { name: 'Mystic Water', tags: '[Dmg +1: Water]' },
    { name: 'Never-Melt Ice', tags: '[Dmg +1: Ice]' },
    { name: 'Poison Barb', tags: '[Dmg +1: Poison]' },
    { name: 'Power Herb' },
    { name: 'Power Increasers' },
    { name: 'Protective Pads' },
    { name: 'Quick Claw', tags: '[Init +2]' },
    { name: 'Razor Claw', tags: '[High Crit]' },
    { name: 'Razor Fang' },
    { name: 'Red Card' },
    { name: 'Ring Target', tags: '[Remove Immunities]' },
    { name: 'Rocky Helmet' },
    { name: 'Safety Goggles' },
    { name: 'Sharp Beak', tags: '[Dmg +1: Flying]' },
    { name: 'Silk Scarf', tags: '[Dmg +1: Normal]' },
    { name: 'Silver Powder', tags: '[Dmg +1: Bug]' },
    { name: 'Soft Sand', tags: '[Dmg +1: Ground]' },
    { name: 'Spell Tag', tags: '[Dmg +1: Ghost]' },
    { name: 'Sticky Barb' },
    { name: 'Thick Club', tags: '[Str +2]' },
    { name: 'Throat Spray' },
    { name: 'Toxic Orb', tags: '[Status: Poison]' },
    { name: 'Twisted Spoon', tags: '[Dmg +1: Psychic]' },
    { name: 'Umbrella' },
    { name: 'Weakness Policy' },
    { name: 'White Herb' },
    { name: 'Wide Lens', tags: '[Acc +2]' },
    { name: 'Wise Glasses', tags: '[Dmg +1: Special]' },
    { name: 'Zoom Lens', tags: '[Acc +2]' }
];

export const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
    Healthy: { bg: '#A5D6A7', text: '#000' },
    '1st Degree Burn': { bg: '#FFCC80', text: '#000' },
    '2nd Degree Burn': { bg: '#FF8A65', text: '#000' },
    '3rd Degree Burn': { bg: '#D32F2F', text: '#FFF' },
    Poison: { bg: '#CE93D8', text: '#000' },
    'Badly Poisoned': { bg: '#8E24AA', text: '#FFF' },
    Paralysis: { bg: '#FFF59D', text: '#000' },
    'Frozen Solid': { bg: '#81D4FA', text: '#000' },
    Sleep: { bg: '#9FA8DA', text: '#000' },
    'In Love': { bg: '#F48FB1', text: '#000' },
    Confusion: { bg: '#80CBC4', text: '#000' },
    Disable: { bg: '#E0E0E0', text: '#000' },
    Flinch: { bg: '#B0BEC5', text: '#000' }
};

export const STATUS_RULES: Record<string, string> = {
    Healthy: 'No status effect.',
    '1st Degree Burn':
        'Deal 1 point of damage at the end of each Round. Fire-type Pokémon are immune. Recovery: Dexterity + Athletic (4 successes).',
    '2nd Degree Burn':
        'Deal 2 points of lethal damage** at the end of each Round. Fire-type Pokémon are immune. Recovery: Dexterity + Athletic (6 successes).',
    '3rd Degree Burn':
        'Deal 3 points of lethal damage** at the end of each Round. Increase Damage by 2 each Round that passes. Fire-type Pokémon are immune. Recovery: Dexterity + Athletic (8 successes).',
    Poison: 'Deal 2 points of damage at the end of each Round. Poison and Steel-type Pokémon are immune.',
    'Badly Poisoned':
        'Deal 2 points of lethal damage** at the end of the Round. Increase Damage by 2 each Round that passes. Poison and Steel-type Pokémon are immune.',
    Paralysis:
        'The subject loses 2 points in Dexterity. Electric-type Pokémon are immune. The subject cannot treat this on their own.',
    'Frozen Solid':
        'The subject cannot perform any action as is inside a block of ice. The block has 5 HP with a Def & Sp. Def Score of 2. Ice-type Pokémon are immune.',
    Sleep: 'The subject falls into a deep slumber and cannot perform any action until they wake up. Roll Insight at the start of their turn; wake up after adding up 5 successes. Doing this counts as an action.',
    'In Love':
        'Hold Back against the beloved foe and allies. Roll Loyalty/Insight and score at least 3 successes to attack the beloved foe and allies at full power.',
    Confusion:
        'Removes successes from action rolls based on Rank (Starter to Standard: 1, Advanced to Ace: 2, Master or higher: 3). If action fails, subject is dealt 1 damage. Roll Insight (2 successes) to act normally.',
    Disable: 'Cannot perform a disabled Move. Only one Move can be disabled per subject at a time.',
    Flinch: 'Spends the Action of their next turn without having any effect and cannot use Reactions until their next turn has passed. Only one Flinch can be inflicted per subject each Round.'
};

export const STATUS_OPTIONS = [
    'Healthy',
    '1st Degree Burn',
    '2nd Degree Burn',
    '3rd Degree Burn',
    'Poison',
    'Badly Poisoned',
    'Confusion',
    'Disable',
    'Flinch',
    'Frozen Solid',
    'In Love',
    'Paralysis',
    'Sleep',
    'Custom...'
];
