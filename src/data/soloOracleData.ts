export interface OddsDefinition {
    odds: number; // -4 to +4
    label: string;
    description: string;
}

export const ODDS_LEVELS: readonly OddsDefinition[] = [
    { odds: -4, label: 'Impossible', description: 'Virtually cannot happen (-4)' },
    { odds: -3, label: 'Nearly Impossible', description: 'Extremely unlikely (-3)' },
    { odds: -2, label: 'Very Unlikely', description: 'Far-fetched (-2)' },
    { odds: -1, label: 'Unlikely', description: 'Doubtful (-1)' },
    { odds: 0, label: '50/50', description: 'Even odds (0)' },
    { odds: 1, label: 'Likely', description: 'Probable (+1)' },
    { odds: 2, label: 'Very Likely', description: 'Expected (+2)' },
    { odds: 3, label: 'Nearly Certain', description: 'Almost guaranteed (+3)' },
    { odds: 4, label: 'Certain', description: 'Certain (+4)' }
] as const;

/**
 * Fate Chart Matrix (Mythic GME 2e).
 * Each cell holds: [ExceptionalYesMax | null, YesMax, ExceptionalNoMin | null].
 * Index 0 corresponds to Chaos Factor 1, through index 8 for Chaos Factor 9.
 */
export const FATE_CHART: Record<number, readonly (readonly [number | null, number, number | null])[]> = {
    4: [
        [10, 50, 91],
        [13, 65, 94],
        [15, 75, 96],
        [17, 85, 98],
        [18, 90, 99],
        [19, 95, 100],
        [20, 99, null],
        [20, 99, null],
        [20, 99, null]
    ],
    3: [
        [7, 35, 88],
        [10, 50, 91],
        [13, 65, 94],
        [15, 75, 96],
        [17, 85, 98],
        [18, 90, 99],
        [19, 95, 100],
        [20, 99, null],
        [20, 99, null]
    ],
    2: [
        [5, 25, 86],
        [7, 35, 88],
        [10, 50, 91],
        [13, 65, 94],
        [15, 75, 96],
        [17, 85, 98],
        [18, 90, 99],
        [19, 95, 100],
        [20, 99, null]
    ],
    1: [
        [3, 15, 84],
        [5, 25, 86],
        [7, 35, 88],
        [10, 50, 91],
        [13, 65, 94],
        [15, 75, 96],
        [17, 85, 98],
        [18, 90, 99],
        [19, 95, 100]
    ],
    0: [
        [2, 10, 83],
        [3, 15, 84],
        [5, 25, 86],
        [7, 35, 88],
        [10, 50, 91],
        [13, 65, 94],
        [15, 75, 96],
        [17, 85, 98],
        [18, 90, 99]
    ],
    '-1': [
        [1, 5, 82],
        [2, 10, 83],
        [3, 15, 84],
        [5, 25, 86],
        [7, 35, 88],
        [10, 50, 91],
        [13, 65, 94],
        [15, 75, 96],
        [17, 85, 98]
    ],
    '-2': [
        [null, 1, 81],
        [1, 5, 82],
        [2, 10, 83],
        [3, 15, 84],
        [5, 25, 86],
        [7, 35, 88],
        [10, 50, 91],
        [13, 65, 94],
        [15, 75, 96]
    ],
    '-3': [
        [null, 1, 81],
        [null, 1, 81],
        [1, 5, 82],
        [2, 10, 83],
        [3, 15, 84],
        [5, 25, 86],
        [7, 35, 88],
        [10, 50, 91],
        [13, 65, 94]
    ],
    '-4': [
        [null, 1, 81],
        [null, 1, 81],
        [null, 1, 81],
        [1, 5, 82],
        [2, 10, 83],
        [3, 15, 84],
        [5, 25, 86],
        [7, 35, 88],
        [10, 50, 91]
    ]
};

export interface EventFocusEntry {
    min: number;
    max: number;
    name: string;
    description: string;
}

export const EVENT_FOCUS_TABLE: readonly EventFocusEntry[] = [
    { min: 1, max: 8, name: 'Remote Event', description: 'Something significant happens away from the player characters.' },
    { min: 9, max: 28, name: 'NPC Action', description: 'An established NPC takes independent action or advances their agenda.' },
    { min: 29, max: 35, name: 'Introduce New NPC', description: 'A brand new character or wild Pokémon enters the story.' },
    { min: 36, max: 45, name: 'Move Toward Thread', description: 'Progress, clues, or breakthroughs develop regarding an active goal.' },
    { min: 46, max: 52, name: 'Move Away From Thread', description: 'A setback, obstacle, or diversion delays an active goal.' },
    { min: 53, max: 55, name: 'Close Thread', description: 'A subplot, mystery, or goal resolves or abruptly terminates.' },
    { min: 56, max: 67, name: 'PC Negative', description: 'A misfortune, resource loss, injury, or hazard directly impacts the player.' },
    { min: 68, max: 75, name: 'PC Positive', description: 'Good fortune, insight, boon, or tactical advantage favors the player.' },
    { min: 76, max: 83, name: 'Ambiguous Event', description: 'A strange or neutral occurrence unfolds whose true meaning is unclear.' },
    { min: 84, max: 92, name: 'NPC Negative', description: 'Harm, misfortune, or failure befalls an NPC ally or rival.' },
    { min: 93, max: 100, name: 'NPC Positive', description: 'Empowerment, triumph, or fortune benefits an NPC ally or rival.' }
] as const;

export const ACTION_WORDS: readonly string[] = [
    'Abandon', 'Ambush', 'Analyze', 'Attack', 'Attract', 'Avenge', 'Avoid', 'Befriend',
    'Betray', 'Block', 'Bribe', 'Capture', 'Challenge', 'Charm', 'Chase', 'Claim',
    'Climb', 'Command', 'Conceal', 'Control', 'Create', 'Damage', 'Deceive', 'Defend',
    'Delay', 'Demand', 'Destroy', 'Discover', 'Disrupt', 'Distract', 'Divide', 'Drop',
    'Duplicate', 'Endure', 'Escape', 'Examine', 'Exchange', 'Expose', 'Fail', 'Flee',
    'Follow', 'Force', 'Fortify', 'Guard', 'Guide', 'Harass', 'Harm', 'Heal',
    'Hide', 'Hunt', 'Ignore', 'Imitate', 'Imprison', 'Inform', 'Inspect', 'Intimidate',
    'Investigate', 'Judge', 'Lead', 'Liberate', 'Loot', 'Lose', 'Lure', 'Manipulate',
    'Mend', 'Mimic', 'Mistrust', 'Move', 'Negotiate', 'Observe', 'Obstruct', 'Oppose',
    'Overcome', 'Pacify', 'Patrol', 'Protect', 'Pursue', 'Rebuild', 'Release', 'Rescue',
    'Resist', 'Restore', 'Retreat', 'Reveal', 'Reward', 'Ruin', 'Sabotage', 'Sacrifice',
    'Search', 'Secure', 'Seize', 'Separate', 'Sneak', 'Start', 'Steal', 'Stop',
    'Surrender', 'Surround', 'Track', 'Transform', 'Trap', 'Travel', 'Trust', 'Uncover'
] as const;

export const THEME_WORDS: readonly string[] = [
    'Abundance', 'Adversity', 'Alliance', 'Ambition', 'Ancient', 'Anger', 'Animal', 'Artifice',
    'Barrier', 'Battle', 'Beast', 'Beginning', 'Belief', 'Betrayal', 'Blood', 'Bond',
    'Burden', 'Calm', 'Chaos', 'Cold', 'Community', 'Conflict', 'Consequence', 'Courage',
    'Creature', 'Curiosity', 'Danger', 'Darkness', 'Death', 'Deception', 'Defeat', 'Desire',
    'Destiny', 'Discovery', 'Disease', 'Dispute', 'Doubt', 'Duty', 'Earth', 'Echo',
    'Energy', 'Enigma', 'Environment', 'Escape', 'Extinction', 'Failure', 'Family', 'Fear',
    'Fire', 'Friendship', 'Future', 'Greed', 'Growth', 'Guide', 'Harmony', 'Hate',
    'Hazard', 'Healing', 'History', 'Honor', 'Hope', 'Hunter', 'Illusion', 'Innocence',
    'Instinct', 'Isolation', 'Journey', 'Justice', 'Knowledge', 'Legacy', 'Liberty', 'Light',
    'Loss', 'Loyalty', 'Magic', 'Message', 'Mystery', 'Nature', 'New', 'Night',
    'Obstacle', 'Old', 'Omen', 'Pain', 'Passion', 'Path', 'Peace', 'Peril',
    'Power', 'Prison', 'Promise', 'Protection', 'Rivalry', 'Ruin', 'Secret', 'Shadow',
    'Shelter', 'Signal', 'Silence', 'Sky', 'Solitude', 'Spirit', 'Storm', 'Strength',
    'Success', 'Survival', 'Technology', 'Tension', 'Territory', 'Time', 'Treachery', 'Treasure',
    'Trial', 'Trophy', 'Truth', 'Victory', 'Warning', 'Water', 'Weapon', 'Wilderness'
] as const;

export const POKEMON_DISPOSITIONS: readonly string[] = [
    'Playful and mischievous, seeking interaction or food',
    'Fiercely territorial, warning intruders to back off',
    'Starving and desperately foraging for food',
    'Protective parent guarding hidden eggs or young offspring',
    'Injured, sick, or poisoned, wary of any movement',
    'Intensely curious, observing the party from a safe distance',
    'Skittish and timid, ready to flee at the slightest sudden noise',
    'Aggressive alpha asserting dominance over local wildlife',
    'Deeply asleep, dormant, or hibernating under heavy foliage',
    'Proud and competitive, eager to test its battle strength',
    'Cautious and alert, sniffing the air for predator scents',
    'Distressed after being separated from its pack or flock',
    'Hunting prey with stealth, calculating ambush angles',
    'Affectionate and trusting, accustomed to friendly travelers',
    'Confused or disoriented by strange magnetic fields or weather',
    'Territorial Alpha demanding respect or tribute berries',
    'Mourning a lost companion or abandoned nest',
    'Trapped or entangled in thick briars, vines, or discarded netting',
    'Hypnotized or entranced by an eerie light or sound in the distance',
    'Bored and looking for excitement, mimicking the trainer\'s gestures'
] as const;

export const ENCOUNTER_TWISTS: readonly string[] = [
    'A larger pack or evolved protector lurks silently in the canopy',
    'The weather suddenly shifts violently (rain, sandstorm, thick fog)',
    'Unusual size, distinct marking, or rare alternate coloration (Shiny / Totem)',
    'The Pokémon is entangled in an old poacher snare or hunting trap',
    'Clutching a rare evolutionary stone, ancient shard, or held berry in its claws',
    'A rival trainer or researcher is stalking the exact same Pokémon',
    'Radiating an unstable elemental aura (Shadow, Terastal, or Primal spark)',
    'Fleeing in terror from an unseen apex predator approaching fast',
    'Mimicking the cry and behavior of a completely different Pokémon species',
    'Directly guarding the concealed entrance to an ancient buried ruin',
    'Illness or madness caused by environmental contamination in the area',
    'Nesting over a clutch of rare, glowing, or vibrating Pokémon eggs',
    'Midst of a fierce territorial duel with another wild Pokémon',
    'An abandoned domestic Pokémon still wearing torn, weathered trainer gear',
    'Disrupted and enraged by high-frequency electromagnetic interference',
    'Possessed or followed by spectral Ghost-type wisps',
    'Escaped from an evil syndicate transport wagon with an identification tag',
    'Testing the trainer\'s courage with mock charges before engaging',
    'Attempting to guide or lure the party away from a natural disaster',
    'Unusually intelligent, using crafted tools or the environment strategically'
] as const;

export const WILDERNESS_HAZARDS: readonly string[] = [
    'Spore blossom field: airborne powders induce Sleep, Paralysis, or Poison',
    'Flash flood / sinkhole: sudden mudslide obliterates the trail ahead',
    'Extreme temperature shift: blisteringly scorched clearing or sudden frost',
    'Unstable cliffside: loose shale causes rockfalls or a 30-foot drop',
    'Poisonous briar thicket: razor thorns tear through gear and clothes',
    'Static lightning grove: charged air attracts electric discharges to metal gear',
    'Quicksand or swamp mire: deceptive moss concealing deep sinking mud',
    'Disorienting mirage fog: thick illusory mists loop paths back on themselves',
    'Toxic volcanic vents: sulfuric gas puffs impose suffocating penalties',
    'Wild brush fire or ignited canopy: roaring flames cut off retreat routes',
    'Subterranean ice cavern collapse: fragile crust gives way beneath boots',
    'Torrential downpour: torrential currents swell river crossings past fordability',
    'Aggressive bug swarm: territorial colony swarms out to defend their hive',
    'Wild Pokémon stampede: a herd of heavy beasts charges through blindly',
    'Magnetic mineral vein: compasses spin wildly and electronic Pokédex glitched',
    'Parched wasteland: all local streams dried up; exhaustion threatens party',
    'Rotted vine ravine bridge: perilous natural crossing snapping under weight',
    'Predator attractant pollen: sweet scent clings to party, drawing aggressive wild Pokémon',
    'Freezing razor hail: heavy ice shards damage exposed flesh and tear tents',
    'Tremor fissure: localized earthquake tears open a jagged chasm in the earth'
] as const;

export const SETTLEMENT_RUMORS: readonly string[] = [
    'Sightings of a legendary silhouette soaring above the northern peaks at dawn',
    'The local Gym Leader disappeared into the mountains on an urgent secret expedition',
    'Ghost Pokémon haunt the decommissioned industrial plant after midnight',
    'Shady smugglers seen unloading sealed crates of exotic Pokémon eggs at the docks',
    'A mysterious fungal blight causes local Grass-type crops and Pokémon to wither',
    'A minor tremor unsealed an uncharted subterranean chamber beneath the old well',
    'Black-market evolutionary stones circulating in town turn Pokémon uncontrollably aggressive',
    'The Pokémon Ranger outpost in the western forest abruptly stopped radio transmissions',
    'The town\'s fresh water reservoir drained overnight into a mysterious underground sinkhole',
    'An eccentric antique collector is paying fortunes for ancient ruin relics with no questions asked',
    'The annual town festival is threatened as wild Pokémon gather at the perimeter fence',
    'Late-night radio bands intercept static broadcasts repeating rhythmic Unown cries',
    'A respected researcher is accused of falsifying discovery logs regarding a new evolution',
    'Highway bandits ambushed a medical delivery wagon, stealing rare potions and revives',
    'Wild Pokémon in the surrounding woods are displaying unnervingly coordinated tactics',
    'The local shrine elder warns that a centuries-old guardian spirit has been provoked',
    'A mirage settlement appears in the desert sandstorms, vanishing as travelers approach',
    'The sacred geothermal hot springs abruptly turned freezing cold overnight',
    'A train car decoupled and vanished into a disused railway tunnel long thought collapsed',
    'Travelers report seeing their own duplicates wandering the edge of the woods'
] as const;

export const RUIN_ANOMALIES: readonly string[] = [
    'Anti-gravity stones floating suspended in air, vibrating with psychic frequency',
    'A weathered stone mural depicting the exact current members of the player\'s party',
    'Spatial distortion loop: traversing down the corridor brings you back to the entry',
    'Petrified Pokémon statues frozen in dynamic, terrified battle poses',
    'Ancient elemental conduits glowing with dormant molten magma or crackling sparks',
    'Concealed pressure plates connected to heavy stone pendulum scythes and darts',
    'Unown glyphs carved into the walls that whisper unintelligible echoes in the mind',
    'A temporal stasis bubble holding an ancient relic in pristine, brand-new condition',
    'An acoustic anomaly amplifying every quiet footstep into a deafening bass thud',
    'A sanctum where Pokémon elemental types and move affinities invert or fluctuate',
    'A vertical shaft with inverted gravity pulling intruders upward toward the ceiling',
    'A glowing crystal sarcophagus radiating intense heat without any visible fire',
    'Immense claw gouges on solid granite walls left by a prehistoric titan',
    'Bas-relief carvings depicting an ancient clash between mythical entities and humans',
    'An impossible underground garden blooming with luminous flowers without sunlight',
    'A monolithic obelisk that hums and reacts violently to held Poké Balls or Keystones',
    'Living shadows on the wall that continue moving after the party stops walking',
    'Ancient script etched into the floor that pulses with light when stepped upon',
    'Polished obsidian mirrors that reflect the party\'s potential future evolutions',
    'A sealed adamantine vault door with seven elemental key slots awaiting activation'
] as const;
