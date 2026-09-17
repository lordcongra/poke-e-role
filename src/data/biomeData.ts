import { TRAINER_CLASSES, type TrainerClass } from './trainerClasses';

export interface BiomeDefinition {
    id: string;
    tag: string;
    name: string;
    types: string[];
    description: string;
    associatedClasses: string[];
}

export const BIOMES: BiomeDefinition[] = [
    {
        id: 'city',
        tag: 'CITY',
        name: 'Cities',
        types: ['Normal', 'Electric', 'Poison', 'Steel', 'Psychic', 'Dark'],
        description: 'Urban sprawl, alleys, rooftops, and parks with city-dwelling and technology-attuned Pokémon.',
        associatedClasses: [
            'police_officer',
            'scientist',
            'delinquent',
            'biker',
            'burglar',
            'juggler',
            'artist',
            'musician',
            'gentleman',
            'lady',
            'schoolkid',
            'doctor',
            'chef',
            'performer',
            'ace_trainer',
            'veteran'
        ]
    },
    {
        id: 'forest',
        tag: 'FOREST',
        name: 'Temperate Deciduous Forests',
        types: ['Grass', 'Bug', 'Normal', 'Flying', 'Poison'],
        description: 'Lush deciduous woods rich with foliage, canopy birds, insects, and woodland creatures.',
        associatedClasses: [
            'bug_catcher',
            'camper',
            'picnicker',
            'ranger',
            'bird_keeper',
            'aroma_lady',
            'backpacker',
            'youngster',
            'lass'
        ]
    },
    {
        id: 'badland',
        tag: 'BADLAND',
        name: 'Badlands, Scrublands, and Wastelands',
        types: ['Ground', 'Rock', 'Dark', 'Fire', 'Poison', 'Steel'],
        description: 'Dry, rugged terrain with eroded rocks, thorny shrubs, and harsh predatory wildlife.',
        associatedClasses: [
            'biker',
            'delinquent',
            'ruin_maniac',
            'hiker',
            'backpacker',
            'laborer',
            'black_belt',
            'team_magma_grunt',
            'team_skull_grunt'
        ]
    },
    {
        id: 'industrial',
        tag: 'INDUSTRIAL',
        name: 'Electromagnetically Active Areas',
        types: ['Electric', 'Steel', 'Poison', 'Fire'],
        description: 'Power plants, substations, and scrap heaps buzzing with artificial currents and machinery.',
        associatedClasses: [
            'engineer',
            'scientist',
            'laborer',
            'biker',
            'delinquent',
            'team_star_grunt',
            'team_rocket_grunt'
        ]
    },
    {
        id: 'woodland',
        tag: 'WOODLAND',
        name: 'Woodlands',
        types: ['Grass', 'Bug', 'Normal', 'Fairy', 'Ghost'],
        description: 'Quiet copses and mossy clearings where fae spirits and small woodland critters play.',
        associatedClasses: [
            'camper',
            'picnicker',
            'aroma_lady',
            'ranger',
            'bug_catcher',
            'psychic',
            'medium',
            'youngster',
            'lass'
        ]
    },
    {
        id: 'jungle',
        tag: 'JUNGLE',
        name: 'Tropical Jungles',
        types: ['Grass', 'Bug', 'Poison', 'Fighting', 'Electric', 'Flying'],
        description: 'Dense rainforests overflowing with vibrant biodiversity, giant vines, and fierce competition.',
        associatedClasses: [
            'ranger',
            'bug_catcher',
            'black_belt',
            'battle_girl',
            'backpacker',
            'ninja_boy',
            'crush_kin',
            'team_skull_grunt'
        ]
    },
    {
        id: 'cave',
        tag: 'CAVE',
        name: 'Caves',
        types: ['Rock', 'Ground', 'Fighting', 'Dark', 'Ghost', 'Poison', 'Dragon'],
        description: 'Deep subterranean caverns, rocky tunnels, and stalactite chambers harboring sturdy Pokémon.',
        associatedClasses: [
            'hiker',
            'ruin_maniac',
            'black_belt',
            'battle_girl',
            'laborer',
            'hex_maniac',
            'medium',
            'ninja_boy'
        ]
    },
    {
        id: 'field',
        tag: 'FIELD',
        name: 'Fields and Meadows',
        types: ['Normal', 'Grass', 'Fairy', 'Flying', 'Bug', 'Electric'],
        description: 'Open rolling fields of wildflowers and gentle breezes favored by peaceful Pokémon.',
        associatedClasses: [
            'camper',
            'picnicker',
            'aroma_lady',
            'youngster',
            'lass',
            'pokefan',
            'beauty',
            'bird_keeper'
        ]
    },
    {
        id: 'swamp',
        tag: 'SWAMP',
        name: 'Swamps, Bogs, and Marshes',
        types: ['Poison', 'Water', 'Ground', 'Bug', 'Ghost', 'Dark'],
        description: 'Murky wetlands with muddy waters, peat moss, and toxic or spectral inhabitants.',
        associatedClasses: [
            'fisherman',
            'channeler',
            'hex_maniac',
            'ninja_boy',
            'ranger',
            'medium',
            'delinquent'
        ]
    },
    {
        id: 'grassland',
        tag: 'GRASSLAND',
        name: 'Grasslands, Savannas, Plains, and Prairies',
        types: ['Normal', 'Grass', 'Ground', 'Fire', 'Electric', 'Flying'],
        description: 'Expansive grassy plains where herds graze and swift predators patrol the horizon.',
        associatedClasses: [
            'rancher',
            'camper',
            'picnicker',
            'ranger',
            'backpacker',
            'bird_keeper',
            'ace_trainer'
        ]
    },
    {
        id: 'mountain',
        tag: 'MOUNTAIN',
        name: 'Mountains',
        types: ['Rock', 'Flying', 'Fighting', 'Dragon', 'Steel', 'Ice'],
        description: 'Towering cliff faces, high-altitude ridges, and treacherous rocky climbs.',
        associatedClasses: [
            'hiker',
            'bird_keeper',
            'black_belt',
            'battle_girl',
            'skier',
            'dragon_tamer',
            'backpacker',
            'veteran'
        ]
    },
    {
        id: 'ruin',
        tag: 'RUIN',
        name: 'Ruins and Cemeteries',
        types: ['Ghost', 'Psychic', 'Dark', 'Ground', 'Rock', 'Fairy'],
        description: 'Ancient temples, forgotten monuments, and burial grounds steeped in history and folklore.',
        associatedClasses: [
            'ruin_maniac',
            'channeler',
            'hex_maniac',
            'medium',
            'psychic',
            'poke_maniac',
            'dragon_tamer'
        ]
    },
    {
        id: 'tundra',
        tag: 'TUNDRA',
        name: 'Tundras and Boreal Forests',
        types: ['Ice', 'Normal', 'Dark', 'Grass', 'Steel'],
        description: 'Vast, windswept permafrost and needle-leaf taiga enduring extreme subzero climates.',
        associatedClasses: [
            'skier',
            'backpacker',
            'ranger',
            'hiker',
            'veteran',
            'black_belt'
        ]
    },
    {
        id: 'riverside',
        tag: 'RIVERSIDE',
        name: 'Lakesides and Riversides',
        types: ['Water', 'Grass', 'Flying', 'Ground', 'Bug'],
        description: 'Reedy banks, sandy river bends, and gentle shorelines connecting land and water.',
        associatedClasses: [
            'fisherman',
            'swimmer',
            'camper',
            'picnicker',
            'ranger',
            'youngster',
            'lass'
        ]
    },
    {
        id: 'glacier',
        tag: 'GLACIER',
        name: 'Glaciers, Mountain Peaks, and Icy Caves',
        types: ['Ice', 'Water', 'Rock', 'Steel', 'Flying'],
        description: 'Frozen ice shelves, sheer frozen summits, and glacial caverns with resilient aquatic fauna.',
        associatedClasses: [
            'skier',
            'hiker',
            'swimmer',
            'backpacker',
            'dragon_tamer',
            'veteran'
        ]
    },
    {
        id: 'volcano',
        tag: 'VOLCANO',
        name: 'Volcanoes',
        types: ['Fire', 'Rock', 'Ground', 'Steel', 'Dragon'],
        description: 'Active calderas, lava flows, and ash-covered slopes inhabited by fireborn creatures.',
        associatedClasses: [
            'firebreather',
            'ruin_maniac',
            'hiker',
            'black_belt',
            'team_magma_grunt',
            'dragon_tamer',
            'laborer'
        ]
    },
    {
        id: 'lake',
        tag: 'LAKE',
        name: 'Lakes',
        types: ['Water', 'Flying', 'Dragon', 'Grass'],
        description: 'Deep, calm freshwater bodies home to ancient leviathans and waterfowl.',
        associatedClasses: [
            'fisherman',
            'swimmer',
            'sailor',
            'bird_keeper',
            'ranger',
            'picnicker'
        ]
    },
    {
        id: 'beach',
        tag: 'BEACH',
        name: 'Beaches',
        types: ['Water', 'Ground', 'Rock', 'Flying', 'Fairy'],
        description: 'Sun-drenched sands and rolling surf where coastal creatures sunbathe.',
        associatedClasses: [
            'swimmer',
            'sailor',
            'fisherman',
            'beauty',
            'youngster',
            'lass',
            'performer',
            'picnicker'
        ]
    },
    {
        id: 'pond',
        tag: 'POND',
        name: 'Ponds',
        types: ['Water', 'Bug', 'Grass', 'Poison'],
        description: 'Small, still pools filled with lily pads, tadpoles, and skittering water striders.',
        associatedClasses: [
            'bug_catcher',
            'fisherman',
            'youngster',
            'lass',
            'picnicker',
            'camper'
        ]
    },
    {
        id: 'river',
        tag: 'RIVER',
        name: 'Streams and Rivers',
        types: ['Water', 'Ground', 'Flying', 'Bug'],
        description: 'Fast-flowing freshwater currents running through valleys and rapids.',
        associatedClasses: [
            'fisherman',
            'swimmer',
            'sailor',
            'ranger',
            'camper',
            'bird_keeper'
        ]
    },
    {
        id: 'abyss',
        tag: 'ABYSS',
        name: 'Oceanic Abysses',
        types: ['Water', 'Dark', 'Ghost', 'Psychic', 'Poison'],
        description: 'The pitch-black oceanic trenches under immense pressure, hosting bioluminescent oddities.',
        associatedClasses: [
            'swimmer',
            'sailor',
            'channeler',
            'medium',
            'scientist',
            'hex_maniac',
            'team_aqua_grunt'
        ]
    },
    {
        id: 'polar_sea',
        tag: 'POLAR SEA',
        name: 'Polar Seas',
        types: ['Water', 'Ice', 'Dark', 'Steel'],
        description: 'Frigid waters adrift with icebergs and ice floes, hunted by blubber-padded swimmers.',
        associatedClasses: [
            'sailor',
            'swimmer',
            'skier',
            'fisherman',
            'veteran'
        ]
    },
    {
        id: 'reef',
        tag: 'REEF',
        name: 'Tropical Seas and Coral Reefs',
        types: ['Water', 'Rock', 'Fairy', 'Psychic', 'Electric'],
        description: 'Spectacular, sunlit coral structures alive with radiant, colorful marine life.',
        associatedClasses: [
            'swimmer',
            'sailor',
            'fisherman',
            'beauty',
            'performer',
            'artist',
            'team_aqua_grunt'
        ]
    },
    {
        id: 'ocean',
        tag: 'OCEAN',
        name: 'Open Ocean and the Continental Shelf',
        types: ['Water', 'Flying', 'Dragon', 'Dark'],
        description: 'Boundless blue expanse with oceanic currents and soaring pelagic fliers.',
        associatedClasses: [
            'sailor',
            'swimmer',
            'fisherman',
            'team_aqua_grunt',
            'bird_keeper',
            'veteran'
        ]
    },
    {
        id: 'desert',
        tag: 'DESERT',
        name: 'Deserts',
        types: ['Ground', 'Rock', 'Fire', 'Dark', 'Dragon', 'Bug', 'Grass'],
        description: 'Arid dunes and sandstone canyons where burrowers, desert dragons, and hardy cacti thrive.',
        associatedClasses: [
            'ruin_maniac',
            'hiker',
            'backpacker',
            'firebreather',
            'dragon_tamer',
            'delinquent',
            'biker',
            'team_magma_grunt'
        ]
    }
];

export const BIOME_MAP: Record<string, BiomeDefinition> = BIOMES.reduce(
    (acc, biome) => {
        acc[biome.id] = biome;
        acc[biome.tag] = biome;
        return acc;
    },
    {} as Record<string, BiomeDefinition>
);

export function getTrainerClassesForBiome(biomeId: string): TrainerClass[] {
    const biome = BIOME_MAP[biomeId];
    if (!biome || !biome.associatedClasses) return [];
    return TRAINER_CLASSES.filter((tc) => biome.associatedClasses.includes(tc.id));
}

export const BIOME_TOOLTIP_NOTE =
    'Biomes filter Pokémon by elemental type pools rather than individual species habitats, so some unexpected species with matching types may occasionally appear.';
