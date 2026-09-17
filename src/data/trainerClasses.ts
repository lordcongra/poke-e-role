import type { Rank } from '../store/entityTypes';

export type TrainerProfileType = 'battler' | 'survivalist' | 'socialite' | 'scholar' | 'mystic' | 'balanced';

export interface TrainerClass {
    id: string;
    name: string;
    category: 'Wild' | 'Martial' | 'Urban' | 'Scholar' | 'Social' | 'Villain' | 'Elite';
    typePreferences: string[];
    forceType?: boolean;
    suggestedProfile: TrainerProfileType;
    isSupernatural?: boolean;
    minRank?: Rank;
    maxRank?: Rank;
    description?: string;
}

export const TRAINER_CLASSES: TrainerClass[] = [
    // --- WILD / NATURE ---
    {
        id: 'bird_keeper',
        name: 'Bird Keeper',
        category: 'Wild',
        typePreferences: ['Flying'],
        forceType: true,
        suggestedProfile: 'survivalist',
        description: 'Specializes in aerial and avian Pokémon.'
    },
    {
        id: 'bug_catcher',
        name: 'Bug Catcher',
        category: 'Wild',
        typePreferences: ['Bug'],
        forceType: true,
        suggestedProfile: 'survivalist',
        description: 'Young and enthusiastic bug collectors with nets in hand.'
    },
    {
        id: 'bug_maniac',
        name: 'Bug Maniac',
        category: 'Wild',
        typePreferences: ['Bug'],
        forceType: true,
        suggestedProfile: 'scholar',
        description: 'Obsessive entomologists in bug suits seeking rare specimens.'
    },
    {
        id: 'hiker',
        name: 'Hiker',
        category: 'Wild',
        typePreferences: ['Rock', 'Ground'],
        forceType: false,
        suggestedProfile: 'survivalist',
        description: 'Hearty mountaineers who love robust Rock and Ground types.'
    },
    {
        id: 'fisherman',
        name: 'Fisherman',
        category: 'Wild',
        typePreferences: ['Water'],
        forceType: true,
        suggestedProfile: 'survivalist',
        description: 'Patient anglers skilled with rods, nets, and Water Pokémon.'
    },
    {
        id: 'swimmer',
        name: 'Swimmer',
        category: 'Wild',
        typePreferences: ['Water'],
        forceType: true,
        suggestedProfile: 'battler',
        description: 'Athletic swimmers battling in oceans, lakes, and rivers.'
    },
    {
        id: 'camper',
        name: 'Camper',
        category: 'Wild',
        typePreferences: ['Grass', 'Ground', 'Normal'],
        forceType: false,
        suggestedProfile: 'survivalist',
        description: 'Outdoor enthusiasts equipped for the wilderness.'
    },
    {
        id: 'picnicker',
        name: 'Picnicker',
        category: 'Wild',
        typePreferences: ['Grass', 'Fairy', 'Normal'],
        forceType: false,
        suggestedProfile: 'socialite',
        description: 'Friendly travelers enjoying scenic routes and gentle Pokémon.'
    },
    {
        id: 'aroma_lady',
        name: 'Aroma Lady',
        category: 'Wild',
        typePreferences: ['Grass'],
        forceType: true,
        suggestedProfile: 'socialite',
        description: 'Botanists and herbalists attracted to soothing floral scents.'
    },
    {
        id: 'ranger',
        name: 'Pokémon Ranger',
        category: 'Wild',
        typePreferences: ['Grass', 'Ground', 'Water'],
        forceType: false,
        suggestedProfile: 'survivalist',
        description: 'Keepers of wildlife balance and protectors of natural reserves.'
    },

    // --- MARTIAL / COMBAT ---
    {
        id: 'black_belt',
        name: 'Black Belt',
        category: 'Martial',
        typePreferences: ['Fighting'],
        forceType: true,
        suggestedProfile: 'battler',
        description: 'Disciplined martial artists who train alongside their Fighting Pokémon.'
    },
    {
        id: 'battle_girl',
        name: 'Battle Girl',
        category: 'Martial',
        typePreferences: ['Fighting'],
        forceType: true,
        suggestedProfile: 'battler',
        description: 'Energetic martial artists honing their striking discipline.'
    },
    {
        id: 'crush_kin',
        name: 'Crush Kin',
        category: 'Martial',
        typePreferences: ['Fighting'],
        forceType: true,
        suggestedProfile: 'battler',
        description: 'Hard-hitting combat duos sharing synchronous martial forms.'
    },
    {
        id: 'sailor',
        name: 'Sailor',
        category: 'Martial',
        typePreferences: ['Water', 'Fighting'],
        forceType: false,
        suggestedProfile: 'battler',
        description: 'Seafarers accustomed to rough waters and brawling Pokémon.'
    },
    {
        id: 'dragon_tamer',
        name: 'Dragon Tamer',
        category: 'Martial',
        typePreferences: ['Dragon'],
        forceType: true,
        suggestedProfile: 'battler',
        description: 'Fearless tamers wielding the formidable might of Dragon-types.'
    },
    {
        id: 'firebreather',
        name: 'Firebreather',
        category: 'Martial',
        typePreferences: ['Fire'],
        forceType: true,
        suggestedProfile: 'battler',
        description: 'Performers and fighters specializing in burning flame.'
    },
    {
        id: 'skier',
        name: 'Skier / Boarder',
        category: 'Martial',
        typePreferences: ['Ice'],
        forceType: true,
        suggestedProfile: 'battler',
        description: 'Winter sports athletes thriving on sub-zero mountain slopes.'
    },
    {
        id: 'biker',
        name: 'Biker',
        category: 'Martial',
        typePreferences: ['Poison', 'Fire', 'Fighting'],
        forceType: false,
        suggestedProfile: 'battler',
        description: 'Speed demons ruling highways with toxic, loud Pokémon.'
    },
    {
        id: 'delinquent',
        name: 'Delinquent / Punk',
        category: 'Martial',
        typePreferences: ['Dark', 'Poison', 'Fighting'],
        forceType: false,
        suggestedProfile: 'battler',
        description: 'Rebellious urban street fighters looking for a brawl.'
    },

    // --- URBAN / SPECIALIST ---
    {
        id: 'psychic',
        name: 'Psychic',
        category: 'Urban',
        typePreferences: ['Psychic'],
        forceType: true,
        suggestedProfile: 'mystic',
        isSupernatural: true,
        description: 'Trainers wielding telepathic and telekinetic powers.'
    },
    {
        id: 'channeler',
        name: 'Channeler',
        category: 'Urban',
        typePreferences: ['Ghost'],
        forceType: true,
        suggestedProfile: 'mystic',
        isSupernatural: true,
        description: 'Mediums communicating with spirits and Ghost-type Pokémon.'
    },
    {
        id: 'hex_maniac',
        name: 'Hex Maniac',
        category: 'Urban',
        typePreferences: ['Ghost', 'Dark'],
        forceType: false,
        suggestedProfile: 'mystic',
        isSupernatural: true,
        description: 'Occultists immersed in curses, hexes, and spectral mysteries.'
    },
    {
        id: 'ninja_boy',
        name: 'Ninja Boy / Shinobi',
        category: 'Urban',
        typePreferences: ['Poison', 'Bug', 'Dark'],
        forceType: false,
        suggestedProfile: 'survivalist',
        description: 'Masters of camouflage, stealth tactics, and ambush strikes.'
    },
    {
        id: 'burglar',
        name: 'Burglar',
        category: 'Urban',
        typePreferences: ['Fire', 'Dark', 'Poison'],
        forceType: false,
        suggestedProfile: 'survivalist',
        description: 'Stealthy prowlers utilizing smokescreens and nocturnal allies.'
    },
    {
        id: 'juggler',
        name: 'Juggler / Clown',
        category: 'Urban',
        typePreferences: ['Psychic', 'Normal'],
        forceType: false,
        suggestedProfile: 'socialite',
        description: 'Performers dazzling crowds with spinning balls and hypnotic tricks.'
    },

    // --- SCHOLAR / TECH ---
    {
        id: 'scientist',
        name: 'Scientist',
        category: 'Scholar',
        typePreferences: ['Electric', 'Steel', 'Poison'],
        forceType: false,
        suggestedProfile: 'scholar',
        description: 'Researchers conducting field trials with high-tech and engineered Pokémon.'
    },
    {
        id: 'doctor',
        name: 'Doctor / Nurse',
        category: 'Scholar',
        typePreferences: ['Normal', 'Psychic', 'Fairy'],
        forceType: false,
        suggestedProfile: 'scholar',
        description: 'Medical professionals dedicated to health, recovery, and support.'
    },
    {
        id: 'engineer',
        name: 'Engineer',
        category: 'Scholar',
        typePreferences: ['Electric', 'Steel'],
        forceType: true,
        suggestedProfile: 'scholar',
        description: 'Technicians and mechanics powering grids with industrial Pokémon.'
    },
    {
        id: 'poke_maniac',
        name: 'Poké Maniac',
        category: 'Scholar',
        typePreferences: ['Dragon', 'Rock', 'Normal'],
        forceType: false,
        suggestedProfile: 'scholar',
        description: 'Devoted collectors obsessed with monstrous and legendary species.'
    },
    {
        id: 'ruin_maniac',
        name: 'Ruin Maniac',
        category: 'Scholar',
        typePreferences: ['Rock', 'Ground', 'Steel'],
        forceType: false,
        suggestedProfile: 'scholar',
        description: 'Archaeologists unearthing relics and ancient fossil Pokémon.'
    },

    // --- SOCIAL / SHOW ---
    {
        id: 'beauty',
        name: 'Beauty',
        category: 'Social',
        typePreferences: ['Fairy', 'Water', 'Normal'],
        forceType: false,
        suggestedProfile: 'socialite',
        description: 'Elegant trainers showcasing graceful, photogenic Pokémon.'
    },
    {
        id: 'performer',
        name: 'Idol / Performer',
        category: 'Social',
        typePreferences: ['Fairy', 'Normal', 'Electric'],
        forceType: false,
        suggestedProfile: 'socialite',
        description: 'Stage artists and contest stars captivating massive audiences.'
    },
    {
        id: 'gentleman',
        name: 'Gentleman / Rich Boy',
        category: 'Social',
        typePreferences: ['Normal', 'Steel', 'Psychic'],
        forceType: false,
        suggestedProfile: 'socialite',
        description: 'Aristocratic trainers with well-groomed, refined companions.'
    },
    {
        id: 'lady',
        name: 'Lady / Socialite',
        category: 'Social',
        typePreferences: ['Normal', 'Fairy', 'Grass'],
        forceType: false,
        suggestedProfile: 'socialite',
        description: 'High-society figures parading delicate, pampered Pokémon.'
    },
    {
        id: 'youngster',
        name: 'Youngster',
        category: 'Social',
        typePreferences: ['Normal', 'Bug', 'Flying'],
        forceType: false,
        suggestedProfile: 'balanced',
        description: 'Spirited rookie trainers embarking on their first regional journey.'
    },
    {
        id: 'lass',
        name: 'Lass',
        category: 'Social',
        typePreferences: ['Normal', 'Grass', 'Fairy'],
        forceType: false,
        suggestedProfile: 'socialite',
        description: 'Bright young trainers testing their skills against travelers.'
    },

    // --- VILLAIN / CRIMINAL ---
    {
        id: 'team_rocket_grunt',
        name: 'Team Rocket Grunt',
        category: 'Villain',
        typePreferences: ['Poison', 'Normal', 'Dark'],
        forceType: false,
        suggestedProfile: 'battler',
        description: 'Foot soldiers of the infamous criminal syndicate stealing Pokémon for profit.'
    },
    {
        id: 'team_magma_grunt',
        name: 'Team Magma Grunt',
        category: 'Villain',
        typePreferences: ['Fire', 'Ground'],
        forceType: false,
        suggestedProfile: 'battler',
        description: 'Zealots dedicated to expanding the earth continents.'
    },
    {
        id: 'team_aqua_grunt',
        name: 'Team Aqua Grunt',
        category: 'Villain',
        typePreferences: ['Water', 'Dark'],
        forceType: false,
        suggestedProfile: 'battler',
        description: 'Eco-radicals committed to expanding oceans and seas.'
    },
    {
        id: 'team_galactic_grunt',
        name: 'Team Galactic Grunt',
        category: 'Villain',
        typePreferences: ['Normal', 'Dark', 'Poison'],
        forceType: false,
        suggestedProfile: 'battler',
        description: 'Spaceminded agents seeking to rebuild the universe without spirit.'
    },
    {
        id: 'team_skull_grunt',
        name: 'Team Skull Grunt',
        category: 'Villain',
        typePreferences: ['Poison', 'Bug', 'Dark'],
        forceType: false,
        suggestedProfile: 'battler',
        description: 'Streetwise ruffians causing mischief and crashing island trials.'
    },
    {
        id: 'team_star_grunt',
        name: 'Team Star Grunt',
        category: 'Villain',
        typePreferences: ['Dark', 'Fighting', 'Poison', 'Fire', 'Fairy'],
        forceType: false,
        suggestedProfile: 'battler',
        description: 'Academy outcasts sticking together in motorized boss squads.'
    },
    {
        id: 'villain_admin',
        name: 'Villain Admin',
        category: 'Villain',
        typePreferences: ['Dark', 'Poison', 'Dragon', 'Steel'],
        forceType: false,
        suggestedProfile: 'battler',
        minRank: 'Advanced',
        description: 'High-ranking syndicates commanding squads and wielding lethal rosters.'
    },
    {
        id: 'villain_boss',
        name: 'Villain Boss',
        category: 'Villain',
        typePreferences: ['Dark', 'Ground', 'Dragon', 'Steel'],
        forceType: false,
        suggestedProfile: 'battler',
        minRank: 'Expert',
        description: 'Masterminds orchestrating vast criminal plots across regions.'
    },

    // --- ELITE / UNIVERSAL ---
    {
        id: 'ace_trainer',
        name: 'Ace Trainer',
        category: 'Elite',
        typePreferences: ['Any'],
        forceType: false,
        suggestedProfile: 'battler',
        minRank: 'Standard',
        description: 'Top-tier competitive trainers aiming directly for the Pokémon League.'
    },
    {
        id: 'veteran',
        name: 'Veteran',
        category: 'Elite',
        typePreferences: ['Any'],
        forceType: false,
        suggestedProfile: 'battler',
        minRank: 'Advanced',
        description: 'Battle-hardened masters with decades of tournament combat experience.'
    },
    {
        id: 'gym_leader',
        name: 'Gym Leader',
        category: 'Elite',
        typePreferences: ['Any'],
        forceType: false,
        suggestedProfile: 'battler',
        minRank: 'Advanced',
        description: 'Official League arbiters testing trainers on badge challenges.'
    }
];

// Groundwork for optional trainer names
export const SAMPLE_FIRST_NAMES = [
    'Alex', 'Brenda', 'Calvin', 'Diana', 'Ethan', 'Fiona', 'George', 'Haley',
    'Ian', 'Joey', 'Kendra', 'Liam', 'Maya', 'Nico', 'Olivia', 'Peter',
    'Quinn', 'Ruby', 'Sammy', 'Toby', 'Uma', 'Victor', 'Wendy', 'Xavier',
    'Yasmine', 'Zack', 'Cynthia', 'Steven', 'Lance', 'Sabrina', 'Brock', 'Misty'
];
