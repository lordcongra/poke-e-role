import type { KnownAbility } from './abilityTypes';

export const KNOWN_ABILITIES: Record<string, KnownAbility> = {
    // --- Passives: Attributes & Defenses ---
    'Huge Power': {
        name: 'Huge Power',
        tags: '[Str +1]',
        autoActive: true,
        summary: 'Increases Strength attribute based on Rank (+1 for Starter-Advanced, +2 for Expert+).',
        benefitDisplay: '+1 STR'
    },
    'Pure Power': {
        name: 'Pure Power',
        tags: '[Str +1]',
        autoActive: true,
        summary: 'Increases Strength attribute based on Rank (+1 for Starter-Advanced, +2 for Expert+).',
        benefitDisplay: '+1 STR'
    },
    'Intrepid Sword': {
        name: 'Intrepid Sword',
        tags: '[Str +2]',
        autoActive: true,
        summary: 'Boosts Strength when entering battle.',
        benefitDisplay: '+2 STR'
    },
    'Dauntless Shield': {
        name: 'Dauntless Shield',
        tags: '[Def +2]',
        autoActive: true,
        summary: 'Boosts Defense when entering battle.',
        benefitDisplay: '+2 DEF'
    },
    'Flower Gift': {
        name: 'Flower Gift',
        tags: '[Str +2 @ Sun] [SpD +2 @ Sun]',
        autoActive: true,
        summary: 'While Sunny Weather is active, increases Strength and Sp. Defense by 2 for the user and allies in range.',
        benefitDisplay: '+2 STR & +2 Sp.Def (Sun)'
    },
    Rivalry: {
        name: 'Rivalry',
        tags: '[Choice: Str +1 (Same Gender) | Str -1 (Opposite Gender)]',
        autoActive: true,
        summary: 'Increases Strength if the opponent is of the same gender, but decreases Strength if the opponent is of the opposite gender.',
        benefitDisplay: 'Rivalry (Choice)'
    },
    Download: {
        name: 'Download',
        tags: '[Choice: Str +1 (Lower Def) | Spe +1 (Lower SpD)]',
        autoActive: true,
        summary: 'Raises Strength if target has lower Defense than Sp. Defense, or Special if target has lower Sp. Defense.',
        benefitDisplay: 'Download (Choice)'
    },
    'Iron Barbs': {
        name: 'Iron Barbs',
        tags: '[Choice: 1 Neutral Dmg | 2 Typeless Dmg]',
        autoActive: true,
        summary: 'Inflicts damage to the attacker on contact.',
        benefitDisplay: 'Iron Barbs (Choice)'
    },
    'Rough Skin': {
        name: 'Rough Skin',
        tags: '[Choice: 1 Neutral Dmg | 2 Typeless Dmg]',
        autoActive: true,
        summary: 'Inflicts damage to the attacker on contact.',
        benefitDisplay: 'Rough Skin (Choice)'
    },
    Stakeout: {
        name: 'Stakeout',
        tags: '[First Hit Dmg +1]',
        autoActive: true,
        summary: 'Deals doubled damage to a target that has just switched into battle.',
        benefitDisplay: '+1 First Hit Dmg'
    },
    Commander: {
        name: 'Commander',
        tags: '[Target: Single Ally]',
        autoActive: true,
        summary: 'When entering battle alongside an allied Dondozo, commands from inside its mouth. Increases Dondozo\'s Strength, Dexterity, Special, Defense, and Sp. Defense by +2.',
        benefitDisplay: '+2 Combat Stats to Dondozo'
    },
    Costar: {
        name: 'Costar',
        tags: '[Target: Single Ally]',
        autoActive: true,
        summary: 'When entering battle, copies an ally\'s stat changes.',
        benefitDisplay: 'Costar (Copy Ally)'
    },
    Hospitality: {
        name: 'Hospitality',
        tags: '[Target: Single Ally]',
        autoActive: true,
        summary: 'When entering battle, restores a small portion of the targeted ally\'s HP.',
        benefitDisplay: 'Hospitality (Restore Ally)'
    },
    Frisk: {
        name: 'Frisk',
        tags: '[Target: Single Foe]',
        autoActive: true,
        summary: 'Checks the opposing combatant\'s held item upon entering battle.',
        benefitDisplay: 'Frisk (Identify Item)'
    },
    Analytic: {
        name: 'Analytic',
        tags: '[Target: Single Foe]',
        autoActive: true,
        summary: 'Boosts damage by 1 die if the user attacks after the target has already acted in the round.',
        benefitDisplay: '+1 Dmg Die if Moving Slower'
    },
    Unaware: {
        name: 'Unaware',
        tags: '[Target: Single Foe]',
        autoActive: true,
        summary: 'Ignores the opponent\'s stat buffs when taking damage or attacking.',
        benefitDisplay: 'Unaware (Ignore Buffs)'
    },
    'Tablets of Ruin': {
        name: 'Tablets of Ruin',
        tags: '[Target: All on Field]',
        autoActive: true,
        summary: 'Reduces the Strength of everyone on the field by 2, except this Pokémon. Immune to all Ruin abilities.',
        benefitDisplay: '-2 Field Str (Ruin)'
    },
    'Sword of Ruin': {
        name: 'Sword of Ruin',
        tags: '[Target: All on Field]',
        autoActive: true,
        summary: 'Reduces the Defense of everyone on the field by 2, except this Pokémon. Immune to all Ruin abilities.',
        benefitDisplay: '-2 Field Def (Ruin)'
    },
    'Vessel of Ruin': {
        name: 'Vessel of Ruin',
        tags: '[Target: All on Field]',
        autoActive: true,
        summary: 'Reduces the Special of everyone on the field by 2, except this Pokémon. Immune to all Ruin abilities.',
        benefitDisplay: '-2 Field Spe (Ruin)'
    },
    'Beads of Ruin': {
        name: 'Beads of Ruin',
        tags: '[Target: All on Field]',
        autoActive: true,
        summary: 'Reduces the Sp. Defense of everyone on the field by 2, except this Pokémon. Immune to all Ruin abilities.',
        benefitDisplay: '-2 Field SpD (Ruin)'
    },
    'Aura Break': {
        name: 'Aura Break',
        tags: '[Target: All on Field]',
        autoActive: true,
        summary: 'Reverses the effects of Dark Aura and Fairy Aura, lowering their power instead.',
        benefitDisplay: 'Aura Break (Field)'
    },

    // --- Passives: Roll Modifiers & Criticals ---
    'Compound Eyes': {
        name: 'Compound Eyes',
        tags: '[Acc +2: Low Accuracy]',
        autoActive: true,
        summary: 'Increases accuracy of moves that have Low Accuracy by 2 dice.',
        benefitDisplay: '+2 Acc (Low Acc Moves)'
    },
    'No Guard': {
        name: 'No Guard',
        tags: '[Ignore Low Acc 99]',
        autoActive: false,
        summary: 'Ignores Low Accuracy on all moves when active (declares no evasion, shield, or clash).',
        benefitDisplay: 'Ignore Low Acc (No Guard)'
    },
    'Serene Grace': {
        name: 'Serene Grace',
        tags: '[Chance +2]',
        autoActive: true,
        summary: 'Adds 2 extra chance dice to all moves with chance effects.',
        benefitDisplay: '+2 Chance Dice'
    },
    'Super Luck': {
        name: 'Super Luck',
        tags: '[Stacking High Crit]',
        autoActive: true,
        summary: 'Increases critical hit threshold. Stacks with moves that have High Critical and held items like Razor Claw.',
        benefitDisplay: 'Stacking High Crit'
    },
    Sniper: {
        name: 'Sniper',
        tags: '[Crit Dmg +1]',
        autoActive: true,
        summary: 'Adds an extra damage die when landing a critical hit (3 bonus dice instead of 2).',
        benefitDisplay: '+1 Crit Dmg Die'
    },
    Hustle: {
        name: 'Hustle',
        tags: '[Low Acc +1: Physical] [Dmg +2: Physical]',
        autoActive: true,
        summary: 'Inflicts Low Accuracy 1 on physical moves, but increases physical damage by 2.',
        benefitDisplay: 'Low Acc 1, +2 Phys Dmg'
    },
    'Keen Eye': {
        name: 'Keen Eye',
        tags: '[Ignore Low Acc 99]',
        autoActive: true,
        summary: 'Cannot have accuracy reduced.',
        benefitDisplay: 'Ignore Acc Drops'
    },

    // --- Pinch / Half-HP Triggers ---
    Blaze: {
        name: 'Blaze',
        tags: '[Dmg +2: Fire @ Half HP] [Ignore Pain: Fire @ Half HP]',
        autoActive: true,
        summary: 'Increases Fire-type move damage and ignores pain penalties when at half HP or less.',
        benefitDisplay: '+2 Fire Dmg & Ignore Pain @ <=50% HP'
    },
    Overgrow: {
        name: 'Overgrow',
        tags: '[Dmg +2: Grass @ Half HP] [Ignore Pain: Grass @ Half HP]',
        autoActive: true,
        summary: 'Increases Grass-type move damage and ignores pain penalties when at half HP or less.',
        benefitDisplay: '+2 Grass Dmg & Ignore Pain @ <=50% HP'
    },
    Torrent: {
        name: 'Torrent',
        tags: '[Dmg +2: Water @ Half HP] [Ignore Pain: Water @ Half HP]',
        autoActive: true,
        summary: 'Increases Water-type move damage and ignores pain penalties when at half HP or less.',
        benefitDisplay: '+2 Water Dmg & Ignore Pain @ <=50% HP'
    },
    Swarm: {
        name: 'Swarm',
        tags: '[Dmg +2: Bug @ Half HP] [Ignore Pain: Bug @ Half HP]',
        autoActive: true,
        summary: 'Increases Bug-type move damage and ignores pain penalties when at half HP or less.',
        benefitDisplay: '+2 Bug Dmg & Ignore Pain @ <=50% HP'
    },
    Berserk: {
        name: 'Berserk',
        tags: '[Spe +2 @ Half HP]',
        autoActive: true,
        summary: 'Increases Special attribute when at half HP or less.',
        benefitDisplay: '+2 SPE @ <=50% HP'
    },
    'Anger Shell': {
        name: 'Anger Shell',
        tags: '[Str +1 @ Half HP] [Spe +1 @ Half HP] [Dex +1 @ Half HP] [Def -1 @ Half HP] [Spd -1 @ Half HP]',
        autoActive: true,
        summary: 'Shifts defenses to offensive stats at half HP or less.',
        benefitDisplay: '+1 Offense / -1 Defense @ <=50% HP'
    },

    // --- Move Category Modifiers ---
    'Iron Fist': {
        name: 'Iron Fist',
        tags: '[Dmg +1: Fist Move]',
        autoActive: true,
        summary: 'Increases damage of punching moves.',
        benefitDisplay: '+1 Fist Dmg'
    },
    'Strong Jaw': {
        name: 'Strong Jaw',
        tags: '[Dmg +1: Bite Move]',
        autoActive: true,
        summary: 'Increases damage of biting moves.',
        benefitDisplay: '+1 Bite Dmg'
    },
    Sharpness: {
        name: 'Sharpness',
        tags: '[Dmg +1: Cutter Move]',
        autoActive: true,
        summary: 'Increases damage of slicing and cutter moves.',
        benefitDisplay: '+1 Cutter Dmg'
    },
    'Mega Launcher': {
        name: 'Mega Launcher',
        tags: '[Dmg +2: Projectile Move]',
        autoActive: true,
        summary: 'Increases damage of projectile, aura, and pulse moves by 2 dice.',
        benefitDisplay: '+2 Projectile Dmg'
    },
    'Punk Rock': {
        name: 'Punk Rock',
        tags: '[Dmg +1: Sound Move] [Resist: Sound]',
        autoActive: true,
        summary: 'Increases sound move damage and resists sound moves.',
        benefitDisplay: '+1 Sound Dmg / Resist Sound'
    },
    Reckless: {
        name: 'Reckless',
        tags: '[Dmg +2: Recoil]',
        autoActive: true,
        summary: 'Increases damage of moves that cause recoil by 2 dice.',
        benefitDisplay: '+2 Recoil Dmg'
    },
    'Rock Head': {
        name: 'Rock Head',
        tags: '[Ignore Pain: Recoil]',
        autoActive: true,
        summary: 'Takes no recoil damage from its own recoil moves.',
        benefitDisplay: 'Ignore Recoil'
    },
    'Wind Rider': {
        name: 'Wind Rider',
        tags: '[Dmg +1: Wind Move]',
        autoActive: true,
        summary: 'Increases damage of wind moves.',
        benefitDisplay: '+1 Wind Dmg'
    },

    // --- Type Damage Boosts & Effectiveness ---
    'Water Bubble': {
        name: 'Water Bubble',
        tags: '[Dmg +2: Water] [Resist: Fire]',
        autoActive: true,
        summary: 'Increases Water damage by 2 dice and reduces Fire damage taken.',
        benefitDisplay: '+2 Water Dmg / Resist Fire'
    },
    Steelworker: {
        name: 'Steelworker',
        tags: '[Dmg +1: Steel]',
        autoActive: true,
        summary: 'Increases damage of Steel-type moves.',
        benefitDisplay: '+1 Steel Dmg'
    },
    'Rocky Payload': {
        name: 'Rocky Payload',
        tags: '[Dmg +1: Rock]',
        autoActive: true,
        summary: 'Increases damage of Rock-type moves.',
        benefitDisplay: '+1 Rock Dmg'
    },
    'Dragon Maw': {
        name: 'Dragon Maw',
        tags: '[Dmg +2: Dragon]',
        autoActive: true,
        summary: 'Increases damage of Dragon-type moves by 2 dice.',
        benefitDisplay: '+2 Dragon Dmg'
    },
    Transistor: {
        name: 'Transistor',
        tags: '[Dmg +2: Electric]',
        autoActive: true,
        summary: 'Increases damage of Electric-type moves by 2 dice.',
        benefitDisplay: '+2 Electric Dmg'
    },
    'Dark Aura': {
        name: 'Dark Aura',
        tags: '[Dmg +2: Dark] [Target: All on Field]',
        autoActive: true,
        summary: 'Increases damage of Dark-type moves by 2 dice for all on field.',
        benefitDisplay: '+2 Dark Dmg (Field)'
    },
    'Fairy Aura': {
        name: 'Fairy Aura',
        tags: '[Dmg +2: Fairy] [Target: All on Field]',
        autoActive: true,
        summary: 'Increases damage of Fairy-type moves by 2 dice for all on field.',
        benefitDisplay: '+2 Fairy Dmg (Field)'
    },
    Aerilate: {
        name: 'Aerilate',
        tags: '[Dmg +1: Flying]',
        autoActive: true,
        summary: 'Increases damage of Flying-type moves by 1 die.',
        benefitDisplay: '+1 Flying Dmg'
    },
    Pixilate: {
        name: 'Pixilate',
        tags: '[Dmg +1: Fairy]',
        autoActive: true,
        summary: 'Increases damage of Fairy-type moves by 1 die.',
        benefitDisplay: '+1 Fairy Dmg'
    },
    Refrigerate: {
        name: 'Refrigerate',
        tags: '[Dmg +1: Ice]',
        autoActive: true,
        summary: 'Increases damage of Ice-type moves by 1 die.',
        benefitDisplay: '+1 Ice Dmg'
    },
    Galvanize: {
        name: 'Galvanize',
        tags: '[Dmg +1: Electric]',
        autoActive: true,
        summary: 'Increases damage of Electric-type moves by 1 die.',
        benefitDisplay: '+1 Electric Dmg'
    },
    'Steely Spirit': {
        name: 'Steely Spirit',
        tags: '[Dmg +1: Steel]',
        autoActive: true,
        summary: 'Increases damage of Steel moves for self and allies.',
        benefitDisplay: '+1 Steel Dmg'
    },
    Neuroforce: {
        name: 'Neuroforce',
        tags: '[Dmg +1: Super Effective]',
        autoActive: true,
        summary: 'Adds extra damage on super effective moves.',
        benefitDisplay: '+1 Super Effective Dmg'
    },
    Adaptability: {
        name: 'Adaptability',
        tags: '[Dmg +1: STAB]',
        autoActive: true,
        summary: 'Adds extra damage to all Same Type Attack Bonus moves.',
        benefitDisplay: '+1 STAB Dmg'
    },

    // --- Type Immunities & Resistances ---
    Levitate: {
        name: 'Levitate',
        tags: '[Immune: Ground]',
        autoActive: true,
        summary: 'Full immunity to Ground-type attacks and arena hazards.',
        benefitDisplay: 'Immune: Ground'
    },
    'Thick Fat': {
        name: 'Thick Fat',
        tags: '[Resist: Fire] [Resist: Ice]',
        autoActive: true,
        summary: 'Resists Fire and Ice-type attacks.',
        benefitDisplay: 'Resist: Fire & Ice'
    },

    // --- Situational: Weather & Terrain (Toggleable / Auto-Evaluated) ---
    'Swift Swim': {
        name: 'Swift Swim',
        tags: '[Dex +2 @ Rain]',
        autoActive: true,
        summary: 'Doubles agility in Rain weather.',
        benefitDisplay: '+2 DEX (Rain)'
    },
    Chlorophyll: {
        name: 'Chlorophyll',
        tags: '[Dex +2 @ Sun]',
        autoActive: true,
        summary: 'Doubles agility in Sunny weather.',
        benefitDisplay: '+2 DEX (Sun)'
    },
    'Sand Rush': {
        name: 'Sand Rush',
        tags: '[Dex +1 @ Sandstorm]',
        autoActive: true,
        summary: 'Increases agility in Sandstorm weather by 1.',
        benefitDisplay: '+1 DEX (Sand)'
    },
    'Slush Rush': {
        name: 'Slush Rush',
        tags: '[Dex +1 @ Snow]',
        autoActive: true,
        summary: 'Increases agility in Snow or Hail weather by 1.',
        benefitDisplay: '+1 DEX (Snow)'
    },
    'Rain Dish': {
        name: 'Rain Dish',
        tags: '[Heal 1 Round End @ Rain]',
        autoActive: true,
        summary: 'Gradually heals HP at the end of each round while it is raining.',
        benefitDisplay: 'Heal 1 Round End (Rain)'
    },
    'Ice Body': {
        name: 'Ice Body',
        tags: '[Heal 1 Round End @ Snow]',
        autoActive: true,
        summary: 'Gradually heals HP at the end of each round in snow or hail.',
        benefitDisplay: 'Heal 1 Round End (Snow/Hail)'
    },
    'Dry Skin': {
        name: 'Dry Skin',
        tags: '[Heal 1 Round End @ Rain] [Deal 1 Damage at End of Round @ Sun] [Weakness: Fire]',
        autoActive: true,
        summary: 'Restores HP in rain, but suffers damage in sun and takes increased Fire damage.',
        benefitDisplay: 'Heal Rain / 1 Dmg Sun / Fire Weak'
    },
    'Surge Surfer': {
        name: 'Surge Surfer',
        tags: '[Dex +2 @ Electric Terrain]',
        autoActive: true,
        summary: 'Doubles agility on Electric Terrain.',
        benefitDisplay: '+2 DEX (Terrain)'
    },
    'Solar Power': {
        name: 'Solar Power',
        tags: '[Spe +2 @ Sun] [Deal 1 Damage at End of Round @ Sun]',
        autoActive: true,
        summary: 'Increases Special by 2 in Sun but suffers damage each round.',
        benefitDisplay: '+2 SPE / 1 Dmg Round End'
    },
    'Sand Force': {
        name: 'Sand Force',
        tags: '[Dmg +1: Rock @ Sandstorm] [Dmg +1: Ground @ Sandstorm] [Dmg +1: Steel @ Sandstorm]',
        autoActive: true,
        summary: 'Increases Rock, Ground, and Steel damage in Sandstorm.',
        benefitDisplay: '+1 Rock/Ground/Steel Dmg (Sand)'
    },
    'Grass Pelt': {
        name: 'Grass Pelt',
        tags: '[Def +2 @ Grassy Terrain]',
        autoActive: true,
        summary: 'Boosts Defense on Grassy Terrain.',
        benefitDisplay: '+2 DEF (Grassy Terrain)'
    },
    'Hadron Engine': {
        name: 'Hadron Engine',
        tags: '[Spe +1]',
        autoActive: false,
        summary: 'Increases Special on Electric Terrain or with Booster Energy.',
        benefitDisplay: '+1 SPE (Terrain/Booster)'
    },
    'Orichalcum Pulse': {
        name: 'Orichalcum Pulse',
        tags: '[Str +1]',
        autoActive: false,
        summary: 'Increases Strength in Sun or with Booster Energy.',
        benefitDisplay: '+1 STR (Sun/Booster)'
    },
    Protosynthesis: {
        name: 'Protosynthesis',
        tags: '[Str +1] [Spe +1]',
        autoActive: false,
        summary: 'Increases highest attribute in Sun or with Booster Energy.',
        benefitDisplay: '+1 Offense (Sun/Booster)'
    },
    'Quark Drive': {
        name: 'Quark Drive',
        tags: '[Str +1] [Spe +1]',
        autoActive: false,
        summary: 'Increases highest attribute on Electric Terrain or with Booster Energy.',
        benefitDisplay: '+1 Offense (Terrain/Booster)'
    },

    // --- Situational: Status Buffs (Auto-gated by Status Condition) ---
    Guts: {
        name: 'Guts',
        tags: '[Str +2 @ Status]',
        autoActive: true,
        summary: 'Boosts Strength when inflicted with a status condition.',
        benefitDisplay: '+2 STR (Statused)'
    },
    'Marvel Scale': {
        name: 'Marvel Scale',
        tags: '[Def +2 @ Status]',
        autoActive: true,
        summary: 'Boosts Defense when inflicted with a status condition.',
        benefitDisplay: '+2 DEF (Statused)'
    },
    'Quick Feet': {
        name: 'Quick Feet',
        tags: '[Dex +2 @ Status]',
        autoActive: true,
        summary: 'Boosts agility when inflicted with a status condition.',
        benefitDisplay: '+2 DEX (Statused)'
    },
    'Toxic Boost': {
        name: 'Toxic Boost',
        tags: '[Str +2 @ Poison]',
        autoActive: true,
        summary: 'Boosts Strength when poisoned.',
        benefitDisplay: '+2 STR (Poisoned)'
    },
    'Flare Boost': {
        name: 'Flare Boost',
        tags: '[Spe +2 @ Burn]',
        autoActive: true,
        summary: 'Boosts Special when burned.',
        benefitDisplay: '+2 SPE (Burned)'
    },
    'Poison Heal': {
        name: 'Poison Heal',
        tags: '[Heal 1 Round End @ Poison]',
        autoActive: true,
        summary: 'Restores HP each round instead of taking poison damage.',
        benefitDisplay: 'Heal 1 Round End (Poisoned)'
    },

    // --- Situational: Type Absorption & Immunities (Persistent Immunity + Trigger Boost) ---
    'Flash Fire': {
        name: 'Flash Fire',
        tags: '[Immune: Fire] [Dmg +1: Fire @ Boost]',
        autoActive: true,
        summary: 'Immune to Fire damage; activates +1 Fire damage when struck.',
        benefitDisplay: 'Immune: Fire (+1 Fire Dmg Boost)'
    },
    'Volt Absorb': {
        name: 'Volt Absorb',
        tags: '[Immune: Electric]',
        autoActive: true,
        summary: 'Immunity to Electric-type attacks and absorbs them.',
        benefitDisplay: 'Immune: Electric'
    },
    'Water Absorb': {
        name: 'Water Absorb',
        tags: '[Immune: Water]',
        autoActive: true,
        summary: 'Immunity to Water-type attacks and absorbs them.',
        benefitDisplay: 'Immune: Water'
    },
    'Sap Sipper': {
        name: 'Sap Sipper',
        tags: '[Immune: Grass] [Str +1 @ Boost]',
        autoActive: true,
        summary: 'Immunity to Grass moves; boosts Strength when struck.',
        benefitDisplay: 'Immune: Grass (+1 STR Boost)'
    },
    'Earth Eater': {
        name: 'Earth Eater',
        tags: '[Immune: Ground]',
        autoActive: true,
        summary: 'Immunity to Ground-type attacks and absorbs them.',
        benefitDisplay: 'Immune: Ground'
    },
    'Motor Drive': {
        name: 'Motor Drive',
        tags: '[Immune: Electric] [Dex +1 @ Boost]',
        autoActive: true,
        summary: 'Immunity to Electric moves; boosts Dexterity when struck.',
        benefitDisplay: 'Immune: Electric (+1 DEX Boost)'
    },
    'Lightning Rod': {
        name: 'Lightning Rod',
        tags: '[Immune: Electric] [Spe +1 @ Boost]',
        autoActive: true,
        summary: 'Draws and negates Electric moves; boosts Special.',
        benefitDisplay: 'Immune: Electric (+1 SPE Boost)'
    },
    'Storm Drain': {
        name: 'Storm Drain',
        tags: '[Immune: Water] [Spe +1 @ Boost]',
        autoActive: true,
        summary: 'Draws and negates Water moves; boosts Special.',
        benefitDisplay: 'Immune: Water (+1 SPE Boost)'
    },
    'Well-Baked Body': {
        name: 'Well-Baked Body',
        tags: '[Immune: Fire] [Def +2 @ Boost]',
        autoActive: true,
        summary: 'Takes no damage from Fire attacks and raises Defense.',
        benefitDisplay: 'Immune: Fire (+2 DEF Boost)'
    },

    // --- Situational: Escalation & Combat Events (Toggleable Boost) ---
    Moxie: {
        name: 'Moxie',
        tags: '[Str +1 @ Stacking Boost]',
        autoActive: true,
        maxBoost: 3,
        summary: 'Increases Strength when knocking out an opponent (up to +3).',
        benefitDisplay: '+1 STR (Boost)'
    },
    'Beast Boost': {
        name: 'Beast Boost',
        tags: '[Str +1 @ Stacking Boost]',
        autoActive: true,
        maxBoost: 3,
        summary: 'Increases highest offensive stat upon scoring a knockout (up to +3).',
        benefitDisplay: '+1 Offense (Boost)'
    },
    'Soul-Heart': {
        name: 'Soul-Heart',
        tags: '[Spe +1 @ Stacking Boost]',
        autoActive: true,
        maxBoost: 3,
        summary: 'Increases Special whenever any Pokemon faints (up to +3).',
        benefitDisplay: '+1 SPE (Boost)'
    },
    'Soul Heart': {
        name: 'Soul Heart',
        tags: '[Spe +1 @ Stacking Boost]',
        autoActive: true,
        maxBoost: 3,
        summary: 'Increases Special whenever any Pokemon faints (up to +3).',
        benefitDisplay: '+1 SPE (Boost)'
    },
    'Sheer Force': {
        name: 'Sheer Force',
        tags: '[Dmg +2]',
        autoActive: false,
        summary: 'Adds 2 extra dice to moves by forgoing added secondary effects.',
        benefitDisplay: '+2 Dmg (Sheer Force)'
    },
    'Gorilla Tactics': {
        name: 'Gorilla Tactics',
        tags: '[Dmg +2]',
        autoActive: false,
        summary: 'Adds 2 extra dice to move damage while locked into chosen move.',
        benefitDisplay: '+2 Dmg (Gorilla Tactics)'
    },
    'Speed Boost': {
        name: 'Speed Boost',
        tags: '[Dex +1 @ Stacking Boost]',
        autoActive: true,
        maxBoost: 3,
        summary: 'Increases Dexterity each round (up to +3).',
        benefitDisplay: '+1 DEX (Boost)'
    },
    Stamina: {
        name: 'Stamina',
        tags: '[Def +1 @ Boost] [Spd +1 @ Boost]',
        autoActive: true,
        summary: 'Increases Defense and Special Defense when struck.',
        benefitDisplay: '+1 DEF/SPD (Boost)'
    },
    Justified: {
        name: 'Justified',
        tags: '[Str +1 @ Stacking Boost]',
        autoActive: true,
        maxBoost: 3,
        summary: 'Increases Strength when struck by Dark-type attacks (up to +3).',
        benefitDisplay: '+1 STR (Boost)'
    },
    Rattled: {
        name: 'Rattled',
        tags: '[Dex +1 @ Boost]',
        autoActive: true,
        summary: 'Increases Dexterity when struck by Bug, Dark, Ghost, or Intimidate.',
        benefitDisplay: '+1 DEX (Boost)'
    },
    'Chilling Neigh': {
        name: 'Chilling Neigh',
        tags: '[Str +1 @ Stacking Boost]',
        autoActive: true,
        maxBoost: 3,
        summary: 'Increases Strength upon scoring a knockout (up to +3).',
        benefitDisplay: '+1 STR (Boost)'
    },
    'Grim Neigh': {
        name: 'Grim Neigh',
        tags: '[Spe +1 @ Stacking Boost]',
        autoActive: true,
        maxBoost: 3,
        summary: 'Increases Special upon scoring a knockout (up to +3).',
        benefitDisplay: '+1 SPE (Boost)'
    },
    'Supreme Overlord': {
        name: 'Supreme Overlord',
        tags: '[Str +1 @ Stacking Boost] [Spe +1 @ Stacking Boost]',
        autoActive: true,
        maxBoost: 3,
        summary: 'Increases stats for each fallen ally in battle (up to +3).',
        benefitDisplay: '+1 Offense (Boost)'
    },
    Defiant: {
        name: 'Defiant',
        tags: '[Str +2 @ Boost]',
        autoActive: true,
        summary: 'Increases Strength by 2 when an attribute is lowered by a foe.',
        benefitDisplay: '+2 STR (Boost)'
    },
    Competitive: {
        name: 'Competitive',
        tags: '[Spe +2 @ Boost]',
        autoActive: true,
        summary: 'Increases Special by 2 when an attribute is lowered by a foe.',
        benefitDisplay: '+2 SPE (Boost)'
    },
    Unburden: {
        name: 'Unburden',
        tags: '[Dex +2 @ Boost]',
        autoActive: true,
        summary: 'Increases Dexterity upon consuming or losing held item.',
        benefitDisplay: '+2 DEX (Boost)'
    },

    // --- Range, Aura, & Entry Abilities ---
    'Neutralizing Gas': {
        name: 'Neutralizing Gas',
        tags: '',
        autoActive: true,
        summary: 'Negates the effects of abilities of all foes in range while on the field.',
        benefitDisplay: "Aura: Negate Foes' Abilities"
    },
    Intimidate: {
        name: 'Intimidate',
        tags: '',
        autoActive: true,
        summary: 'Reduces the Strength of all foes in range by 1 while on the field.',
        benefitDisplay: 'Aura: -1 Foe STR'
    },
    'Victory Star': {
        name: 'Victory Star',
        tags: '',
        autoActive: true,
        summary: 'All Physical and Special Moves of user and allies in range cannot miss.',
        benefitDisplay: 'Aura: Never Miss (Physical & Special)'
    },
    'Armor Tail': {
        name: 'Armor Tail',
        tags: '',
        autoActive: true,
        summary: 'User and allies in range cannot be targeted by moves with the Reaction Added Effect.',
        benefitDisplay: 'Aura: Reaction Immune'
    },
    'Sweet Veil': {
        name: 'Sweet Veil',
        tags: '',
        autoActive: true,
        summary: 'User and allies in range are immune to the Sleep status condition.',
        benefitDisplay: 'Aura: Sleep Immune'
    },
    'Pastel Veil': {
        name: 'Pastel Veil',
        tags: '',
        autoActive: true,
        summary: 'User and allies in range are immune to Poison and Badly Poisoned.',
        benefitDisplay: 'Aura: Poison Immune'
    },
    'Aroma Veil': {
        name: 'Aroma Veil',
        tags: '',
        autoActive: true,
        summary: 'User and allies in range are immune to Love status, Taunt, Torment, Spite, Attract, Disable, Encore, and Heal Block.',
        benefitDisplay: 'Aura: Mental Immune'
    },
    'Supersweet Syrup': {
        name: 'Supersweet Syrup',
        tags: '',
        autoActive: true,
        summary: 'All foes in range cannot evade moves performed by this Pokémon.',
        benefitDisplay: 'Aura: Foes Cannot Evade'
    },
    Battery: {
        name: 'Battery',
        tags: '',
        autoActive: true,
        summary: 'Increase Special Attribute of allies in range by 1 and adds 1 extra die to their Special damage pools.',
        benefitDisplay: 'Aura: +1 Ally SPE & Sp.Dmg'
    },
    'Power Spot': {
        name: 'Power Spot',
        tags: '',
        autoActive: true,
        summary: 'Add 1 extra die to Physical and Special damage pools of allies in range. Does not stack with multiple Power Spots.',
        benefitDisplay: 'Aura: +1 Ally Dmg'
    },
    'Flower Veil': {
        name: 'Flower Veil',
        tags: '',
        autoActive: true,
        summary: 'User and allies in range cannot have Attributes reduced or Status Ailments inflicted.',
        benefitDisplay: 'Aura: Stat & Status Immune'
    },
    Pressure: {
        name: 'Pressure',
        tags: '',
        autoActive: true,
        summary: 'When entering battle, all foes in range spend half (rounded up) of their remaining Will Points.',
        benefitDisplay: 'Entry: Drain 50% Foe Will'
    },
    'Curious Medicine': {
        name: 'Curious Medicine',
        tags: '',
        autoActive: true,
        summary: 'When entering battle, removes all attribute increases and reductions on all allies in range.',
        benefitDisplay: "Entry: Reset Allies' Buffs/Debuffs"
    }
};

export function isHighRank(rank?: string): boolean {
    if (!rank) return false;
    const cleanRank = rank.toLowerCase().trim();
    return cleanRank === 'expert' || cleanRank === 'ace' || cleanRank === 'master' || cleanRank === 'champion';
}

export function getKnownAbility(name: string, rank?: string): KnownAbility | undefined {
    if (!name) return undefined;
    const cleanName = name.replace(/\s*\(HA\)$/i, '').trim();
    let base = KNOWN_ABILITIES[cleanName];
    if (!base) {
        const lower = cleanName.toLowerCase();
        const foundKey = Object.keys(KNOWN_ABILITIES).find((k) => k.toLowerCase() === lower);
        if (foundKey) base = KNOWN_ABILITIES[foundKey];
    }
    if (!base) {
        const simplified = cleanName.replace(/[-_\s]+/g, '').toLowerCase();
        const foundKey = Object.keys(KNOWN_ABILITIES).find(
            (k) => k.replace(/[-_\s]+/g, '').toLowerCase() === simplified
        );
        if (foundKey) base = KNOWN_ABILITIES[foundKey];
    }
    if (!base) return undefined;

    const baseName = base.name || cleanName;
    if (baseName === 'Huge Power' || baseName === 'Pure Power') {
        const high = isHighRank(rank);
        return {
            ...base,
            tags: high ? '[Str +2]' : '[Str +1]',
            benefitDisplay: high ? '+2 STR' : '+1 STR'
        };
    }

    return base;
}

export function getMaxBoost(name?: string, tags?: string, descOrEffect?: string): number {
    const tagStr = (tags || '').trim();
    const cleanName = (name || '').replace(/\s*\(HA\)$/i, '').trim();

    // 1. Explicit max limit in tags, e.g. "@ Stacking Boost: 5" or "@ Stacks: 4" or "@ Max Boost: 6"
    const explicitLimitMatch =
        tagStr.match(/@\s*(?:stacking\s+)?boost\s*:\s*(\d+)/i) ||
        tagStr.match(/@\s*stacks?\s*:\s*(\d+)/i) ||
        tagStr.match(/@\s*(?:max\s+boost|boost\s+max)\s*:\s*(\d+)/i) ||
        tagStr.match(/\[\s*(?:max\s+boost|max\s+stacks?)\s*(\d+)\s*\]/i);
    if (explicitLimitMatch && explicitLimitMatch[1]) {
        return Math.max(1, parseInt(explicitLimitMatch[1], 10));
    }

    // 2. Generic Stacking Boost tag: "@ Stacking Boost" or "@ Stacks"
    const isStackingTag = /@\s*stacking\s+boost\b/i.test(tagStr) || /@\s*stacks?\b/i.test(tagStr);

    // 3. Known ability definition
    const known = getKnownAbility(cleanName);
    if (known?.maxBoost) return known.maxBoost;

    // 4. Description/Effect text checks ("up to X points", "stacks up to X times")
    const text = `${tagStr} ${descOrEffect || ''} ${known?.summary || ''}`.toLowerCase();
    const matchPoints = text.match(/up to\s*(\d+)\s*point/i);
    if (matchPoints && matchPoints[1]) {
        return Math.max(1, parseInt(matchPoints[1], 10));
    }
    const matchStacks = text.match(/stacks?\s*(?:up to)?\s*(\d+)\s*(?:time|round|turn|stack)?/i);
    if (matchStacks && matchStacks[1]) {
        return Math.max(1, parseInt(matchStacks[1], 10));
    }

    // If tag explicitly says "@ Stacking Boost" but no number was specified anywhere, default to 3
    if (isStackingTag) {
        return 3;
    }

    return 1;
}

export function getAbilityBenefitSummary(
    name: string,
    tags?: string,
    rank?: string,
    isHalfHp?: boolean,
    isBoostActive?: boolean,
    boostLevel?: number
): string {
    const cleanName = (name || '').replace(/\s*\(HA\)$/i, '').trim();
    const known = getKnownAbility(cleanName, rank);

    let display = '';
    if (tags) {
        if (cleanName === 'Huge Power' || cleanName === 'Pure Power') {
            if (tags.includes('[Str +2]')) display = '+2 STR';
            else if (tags.includes('[Str +1]')) display = '+1 STR';
            else display = isHighRank(rank) ? '+2 STR' : '+1 STR';
        } else if (known?.benefitDisplay && tags === known.tags) {
            display = known.benefitDisplay;
        } else {
            const bracketed = tags.match(/\[[^\]]+\]/g);
            if (bracketed && bracketed.length > 0) {
                display = bracketed.map((t) => t.replace(/\[|\]/g, '').trim()).join(', ');
            } else {
                display = tags
                    .replace(/\[|\]/g, ' ')
                    .replace(/\s+/g, ' ')
                    .trim();
            }
        }
    } else {
        display = known?.benefitDisplay || '';
    }

    if (isHalfHp !== undefined && display) {
        if (display.includes('@ <=50% HP')) {
            display = isHalfHp ? display.replace('@ <=50% HP', '(Active)') : display;
        } else if (/@\s*half\s*hp/i.test(display)) {
            display = isHalfHp ? display.replace(/@\s*half\s*hp/i, '(Active)') : display;
        }
    }

    if (isBoostActive !== undefined && display) {
        const effectiveLevel = isBoostActive ? Math.max(1, boostLevel ?? 1) : 0;
        if (display.includes('(Boost)')) {
            if (effectiveLevel > 1) {
                display = display.replace(/\+1\b/g, `+${effectiveLevel}`);
                display = display.replace('(Boost)', `(Boost x${effectiveLevel})`);
            } else if (effectiveLevel === 1) {
                display = display.replace('(Boost)', '(Boost Active)');
            }
        } else if (display.includes('Boost)')) {
            if (effectiveLevel > 1) {
                display = display.replace(/\+1\b/g, `+${effectiveLevel}`);
                display = display.replace('Boost)', `Boost x${effectiveLevel})`);
            } else if (effectiveLevel === 1) {
                display = display.replace('Boost)', 'Boost Active)');
            }
        } else {
            const boostTagRegex = /@\s*(?:stacking\s+)?boost(?::\s*\d+)?|@\s*stacks?(?::\s*\d+)?/i;
            if (boostTagRegex.test(display)) {
                if (effectiveLevel > 1) {
                    display = display.replace(/\+(\d+)\b/, (_, baseNum) => `+${parseInt(baseNum, 10) * effectiveLevel}`);
                    display = display.replace(boostTagRegex, `(Boost x${effectiveLevel})`);
                } else if (effectiveLevel === 1) {
                    display = display.replace(boostTagRegex, '(Boost Active)');
                } else {
                    display = display.replace(boostTagRegex, '(Boost)');
                }
            }
        }
    }

    if (display.length > 35) {
        display = `${display.slice(0, 32)}...`;
    }

    return display;
}

