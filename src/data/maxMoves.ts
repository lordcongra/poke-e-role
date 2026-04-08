export const MAX_MOVES_DATA: Record<string, { name: string; effect: string }> = {
    Dark: { name: 'Max Darkness', effect: 'Reduce by 1 the Sp. Def of those Affected.' },
    Dragon: { name: 'Max Wyrmwind', effect: 'Reduce by 1 the Strength of those Affected.' },
    Electric: { name: 'Max Lightning', effect: 'Activate the Effects of Electric Terrain. Duration 4 Rounds.' },
    Fairy: { name: 'Max Starfall', effect: 'Activate the Effects of Misty Terrain. Duration 4 Rounds.' },
    Bug: { name: 'Max Flutterby', effect: 'Reduce by 1 the Special of those Affected.' },
    Fighting: { name: 'Max Knuckle', effect: 'Increase the Strength of User and Allies in Range by 1.' },
    Fire: {
        name: 'Max Flare',
        effect: 'Activate the Effects of Sunny Weather (Disregard time of day or location) Duration 4 Rounds.'
    },
    Flying: { name: 'Max Airstream', effect: 'Increase the User and Allies Dexterity by 1.' },
    Ghost: { name: 'Max Phantasm', effect: 'Reduce by 1 the Defense of those Affected.' },
    Grass: { name: 'Max Overgrowth', effect: 'Activate the Effects of Grassy Terrain. Duration 4 Rounds.' },
    Ground: { name: 'Max Quake', effect: 'Increase the Sp. Defense of the User and Allies by 1.' },
    Ice: {
        name: 'Max Hailstorm',
        effect: 'Activate the Effects of Hail Weather. (Disregard location) Duration 4 Rounds.'
    },
    Normal: { name: 'Max Strike', effect: 'Reduce by 1 the Dexterity of those Affected.' },
    Poison: { name: 'Max Ooze', effect: 'Increase the Special of User and Allies in Range by 1.' },
    Psychic: { name: 'Max Mindstorm', effect: 'Activate the Effects of Psychic Terrain. Duration 4 Rounds.' },
    Rock: {
        name: 'Max Rockfall',
        effect: 'Activate the Effects of Sandstorm Weather. (Disregard location) Duration 4 Rounds.'
    },
    Steel: { name: 'Max Steelspike', effect: 'Increase the Defense of the User and Allies by 1.' },
    Water: {
        name: 'Max Geyser',
        effect: 'Activate the Effects of Rain Weather. (Disregard location) Duration 4 Rounds.'
    }
};
