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

    // --- Passives: Roll Modifiers & Criticals ---
    'Compound Eyes': {
        name: 'Compound Eyes',
        tags: '[Acc +1]',
        autoActive: true,
        summary: 'Increases accuracy of moves.',
        benefitDisplay: '+1 ACC'
    },
    'Super Luck': {
        name: 'Super Luck',
        tags: '[High Crit]',
        autoActive: true,
        summary: 'Increases critical hit threshold.',
        benefitDisplay: 'High Crit'
    },
    Sniper: {
        name: 'Sniper',
        tags: '[Acc 6s Add Dmg Limit 6]',
        autoActive: true,
        summary: 'Adds extra damage dice on critical hits.',
        benefitDisplay: 'Critical Exploding Dice'
    },
    Hustle: {
        name: 'Hustle',
        tags: '[Low Acc +1: Physical] [Dmg +2: Physical]',
        autoActive: true,
        summary: 'Reduces accuracy but increases physical damage.',
        benefitDisplay: '-1 Acc, +2 Phys Dmg'
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
        tags: '[Dmg +2: Fire @ Half HP]',
        autoActive: true,
        summary: 'Increases Fire-type move damage when at half HP or less.',
        benefitDisplay: '+2 Fire Dmg @ <=50% HP'
    },
    Overgrow: {
        name: 'Overgrow',
        tags: '[Dmg +2: Grass @ Half HP]',
        autoActive: true,
        summary: 'Increases Grass-type move damage when at half HP or less.',
        benefitDisplay: '+2 Grass Dmg @ <=50% HP'
    },
    Torrent: {
        name: 'Torrent',
        tags: '[Dmg +2: Water @ Half HP]',
        autoActive: true,
        summary: 'Increases Water-type move damage when at half HP or less.',
        benefitDisplay: '+2 Water Dmg @ <=50% HP'
    },
    Swarm: {
        name: 'Swarm',
        tags: '[Dmg +2: Bug @ Half HP]',
        autoActive: true,
        summary: 'Increases Bug-type move damage when at half HP or less.',
        benefitDisplay: '+2 Bug Dmg @ <=50% HP'
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
        tags: '[Dmg +1: Projectile Move]',
        autoActive: true,
        summary: 'Increases damage of projectile, aura, and pulse moves.',
        benefitDisplay: '+1 Projectile Dmg'
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
        tags: '[Dmg +1: Recoil]',
        autoActive: true,
        summary: 'Increases damage of moves that cause recoil.',
        benefitDisplay: '+1 Recoil Dmg'
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
        tags: '[Dmg +1: Dragon]',
        autoActive: true,
        summary: 'Increases damage of Dragon-type moves.',
        benefitDisplay: '+1 Dragon Dmg'
    },
    Transistor: {
        name: 'Transistor',
        tags: '[Dmg +1: Electric]',
        autoActive: true,
        summary: 'Increases damage of Electric-type moves.',
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

    // --- Situational: Weather & Terrain (Toggleable) ---
    'Swift Swim': {
        name: 'Swift Swim',
        tags: '[Dex +2]',
        autoActive: false,
        summary: 'Doubles agility in Rain weather.',
        benefitDisplay: '+2 DEX (Rain)'
    },
    Chlorophyll: {
        name: 'Chlorophyll',
        tags: '[Dex +2]',
        autoActive: false,
        summary: 'Doubles agility in Sunny weather.',
        benefitDisplay: '+2 DEX (Sun)'
    },
    'Sand Rush': {
        name: 'Sand Rush',
        tags: '[Dex +2]',
        autoActive: false,
        summary: 'Doubles agility in Sandstorm weather.',
        benefitDisplay: '+2 DEX (Sand)'
    },
    'Slush Rush': {
        name: 'Slush Rush',
        tags: '[Dex +2]',
        autoActive: false,
        summary: 'Doubles agility in Snow or Hail weather.',
        benefitDisplay: '+2 DEX (Snow)'
    },
    'Surge Surfer': {
        name: 'Surge Surfer',
        tags: '[Dex +2]',
        autoActive: false,
        summary: 'Doubles agility on Electric Terrain.',
        benefitDisplay: '+2 DEX (Terrain)'
    },
    'Solar Power': {
        name: 'Solar Power',
        tags: '[Spe +1] [Deal 1 Damage at End of Round]',
        autoActive: false,
        summary: 'Increases Special in Sun but suffers damage each round.',
        benefitDisplay: '+1 SPE / 1 Dmg Round End'
    },
    'Sand Force': {
        name: 'Sand Force',
        tags: '[Dmg +1: Rock] [Dmg +1: Ground] [Dmg +1: Steel]',
        autoActive: false,
        summary: 'Increases Rock, Ground, and Steel damage in Sandstorm.',
        benefitDisplay: '+1 Rock/Ground/Steel Dmg (Sand)'
    },
    'Grass Pelt': {
        name: 'Grass Pelt',
        tags: '[Def +2]',
        autoActive: false,
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

    // --- Situational: Status Buffs (Toggleable) ---
    Guts: {
        name: 'Guts',
        tags: '[Dmg +2: Physical]',
        autoActive: false,
        summary: 'Boosts physical damage when inflicted with a status condition.',
        benefitDisplay: '+2 Phys Dmg (Statused)'
    },
    'Marvel Scale': {
        name: 'Marvel Scale',
        tags: '[Def +2]',
        autoActive: false,
        summary: 'Boosts Defense when inflicted with a status condition.',
        benefitDisplay: '+2 DEF (Statused)'
    },
    'Quick Feet': {
        name: 'Quick Feet',
        tags: '[Dex +2]',
        autoActive: false,
        summary: 'Boosts agility when inflicted with a status condition.',
        benefitDisplay: '+2 DEX (Statused)'
    },
    'Toxic Boost': {
        name: 'Toxic Boost',
        tags: '[Dmg +2: Physical]',
        autoActive: false,
        summary: 'Boosts physical damage when poisoned.',
        benefitDisplay: '+2 Phys Dmg (Poisoned)'
    },
    'Flare Boost': {
        name: 'Flare Boost',
        tags: '[Spe +2]',
        autoActive: false,
        summary: 'Boosts Special when burned.',
        benefitDisplay: '+2 SPE (Burned)'
    },
    'Poison Heal': {
        name: 'Poison Heal',
        tags: '[Heal 1 Round End]',
        autoActive: false,
        summary: 'Restores HP each round instead of taking poison damage.',
        benefitDisplay: 'Heal 1 Round End (Poisoned)'
    },

    // --- Situational: Type Absorption & Immunities (Toggleable) ---
    'Flash Fire': {
        name: 'Flash Fire',
        tags: '[Immune: Fire] [Dmg +1: Fire]',
        autoActive: true,
        summary: 'Immune to Fire damage; activates +1 Fire damage when struck.',
        benefitDisplay: 'Immune: Fire (+1 Fire Dmg)'
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
        tags: '[Immune: Grass] [Str +1]',
        autoActive: true,
        summary: 'Immunity to Grass moves; boosts Strength when struck.',
        benefitDisplay: 'Immune: Grass (+1 STR)'
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
        tags: '[Immune: Electric] [Dex +1]',
        autoActive: true,
        summary: 'Immunity to Electric moves; boosts Dexterity when struck.',
        benefitDisplay: 'Immune: Electric (+1 DEX)'
    },
    'Lightning Rod': {
        name: 'Lightning Rod',
        tags: '[Immune: Electric] [Spe +1]',
        autoActive: true,
        summary: 'Draws and negates Electric moves; boosts Special.',
        benefitDisplay: 'Immune: Electric (+1 SPE)'
    },
    'Storm Drain': {
        name: 'Storm Drain',
        tags: '[Immune: Water] [Spe +1]',
        autoActive: true,
        summary: 'Draws and negates Water moves; boosts Special.',
        benefitDisplay: 'Immune: Water (+1 SPE)'
    },
    'Well-Baked Body': {
        name: 'Well-Baked Body',
        tags: '[Immune: Fire] [Def +2]',
        autoActive: true,
        summary: 'Takes no damage from Fire attacks and raises Defense.',
        benefitDisplay: 'Immune: Fire (+2 DEF)'
    },

    // --- Situational: Escalation & Combat Events (Toggleable) ---
    Moxie: {
        name: 'Moxie',
        tags: '[Str +1]',
        autoActive: false,
        summary: 'Increases Strength when knocking out an opponent.',
        benefitDisplay: '+1 STR (On KO)'
    },
    'Beast Boost': {
        name: 'Beast Boost',
        tags: '[Str +1] [Spe +1]',
        autoActive: false,
        summary: 'Increases highest offensive stat upon scoring a knockout.',
        benefitDisplay: '+1 Offense (On KO)'
    },
    'Soul-Heart': {
        name: 'Soul-Heart',
        tags: '[Spe +1]',
        autoActive: false,
        summary: 'Increases Special whenever any Pokemon faints.',
        benefitDisplay: '+1 SPE (On Faint)'
    },
    'Chilling Neigh': {
        name: 'Chilling Neigh',
        tags: '[Str +1]',
        autoActive: false,
        summary: 'Increases Strength upon scoring a knockout.',
        benefitDisplay: '+1 STR (On KO)'
    },
    'Grim Neigh': {
        name: 'Grim Neigh',
        tags: '[Spe +1]',
        autoActive: false,
        summary: 'Increases Special upon scoring a knockout.',
        benefitDisplay: '+1 SPE (On KO)'
    },
    'Supreme Overlord': {
        name: 'Supreme Overlord',
        tags: '[Str +1] [Spe +1]',
        autoActive: false,
        summary: 'Increases stats for each fallen ally in battle.',
        benefitDisplay: '+1 Offense per Fallen Ally'
    },
    Defiant: {
        name: 'Defiant',
        tags: '[Str +2]',
        autoActive: false,
        summary: 'Increases Strength by 2 when an attribute is lowered by a foe.',
        benefitDisplay: '+2 STR (Stat Lowered)'
    },
    Competitive: {
        name: 'Competitive',
        tags: '[Spe +2]',
        autoActive: false,
        summary: 'Increases Special by 2 when an attribute is lowered by a foe.',
        benefitDisplay: '+2 SPE (Stat Lowered)'
    },
    Unburden: {
        name: 'Unburden',
        tags: '[Dex +2]',
        autoActive: false,
        summary: 'Increases Dexterity upon consuming or losing held item.',
        benefitDisplay: '+2 DEX (No Item)'
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
    const base = KNOWN_ABILITIES[cleanName];
    if (!base) return undefined;

    if (cleanName === 'Huge Power' || cleanName === 'Pure Power') {
        const high = isHighRank(rank);
        return {
            ...base,
            tags: high ? '[Str +2]' : '[Str +1]',
            benefitDisplay: high ? '+2 STR' : '+1 STR'
        };
    }

    return base;
}

export function getAbilityBenefitSummary(name: string, tags?: string, rank?: string): string {
    const cleanName = (name || '').replace(/\s*\(HA\)$/i, '').trim();
    const known = getKnownAbility(cleanName, rank);

    if (tags) {
        if (cleanName === 'Huge Power' || cleanName === 'Pure Power') {
            if (tags.includes('[Str +2]')) return '+2 STR';
            if (tags.includes('[Str +1]')) return '+1 STR';
            return isHighRank(rank) ? '+2 STR' : '+1 STR';
        }
        if (known?.benefitDisplay && tags === known.tags) {
            return known.benefitDisplay;
        }
        const cleaned = tags
            .replace(/\[|\]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        return cleaned.length > 30 ? `${cleaned.slice(0, 27)}...` : cleaned;
    }

    return known?.benefitDisplay || '';
}
