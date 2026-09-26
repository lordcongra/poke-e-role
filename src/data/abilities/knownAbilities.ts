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
        tags: '[Dmg +2: Dark]',
        autoActive: true,
        summary: 'Increases damage of Dark-type moves by 2 dice for all on field.',
        benefitDisplay: '+2 Dark Dmg'
    },
    'Fairy Aura': {
        name: 'Fairy Aura',
        tags: '[Dmg +2: Fairy]',
        autoActive: true,
        summary: 'Increases damage of Fairy-type moves by 2 dice for all on field.',
        benefitDisplay: '+2 Fairy Dmg'
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
        tags: '[Dex +1]',
        autoActive: false,
        summary: 'Increases agility in Sandstorm weather by 1.',
        benefitDisplay: '+1 DEX (Sand)'
    },
    'Slush Rush': {
        name: 'Slush Rush',
        tags: '[Dex +1]',
        autoActive: false,
        summary: 'Increases agility in Snow or Hail weather by 1.',
        benefitDisplay: '+1 DEX (Snow)'
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
        tags: '[Spe +2] [Deal 1 Damage at End of Round]',
        autoActive: false,
        summary: 'Increases Special by 2 in Sun but suffers damage each round.',
        benefitDisplay: '+2 SPE / 1 Dmg Round End'
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
        tags: '[Str +1 @ Boost]',
        autoActive: true,
        maxBoost: 3,
        summary: 'Increases Strength when knocking out an opponent (up to +3).',
        benefitDisplay: '+1 STR (Boost)'
    },
    'Beast Boost': {
        name: 'Beast Boost',
        tags: '[Str +1 @ Boost]',
        autoActive: true,
        maxBoost: 3,
        summary: 'Increases highest offensive stat upon scoring a knockout (up to +3).',
        benefitDisplay: '+1 Offense (Boost)'
    },
    'Soul-Heart': {
        name: 'Soul-Heart',
        tags: '[Spe +1 @ Boost]',
        autoActive: true,
        maxBoost: 3,
        summary: 'Increases Special whenever any Pokemon faints (up to +3).',
        benefitDisplay: '+1 SPE (Boost)'
    },
    'Soul Heart': {
        name: 'Soul Heart',
        tags: '[Spe +1 @ Boost]',
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
        tags: '[Dex +1 @ Boost]',
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
        tags: '[Str +1 @ Boost]',
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
        tags: '[Str +1 @ Boost]',
        autoActive: true,
        maxBoost: 3,
        summary: 'Increases Strength upon scoring a knockout (up to +3).',
        benefitDisplay: '+1 STR (Boost)'
    },
    'Grim Neigh': {
        name: 'Grim Neigh',
        tags: '[Spe +1 @ Boost]',
        autoActive: true,
        maxBoost: 3,
        summary: 'Increases Special upon scoring a knockout (up to +3).',
        benefitDisplay: '+1 SPE (Boost)'
    },
    'Supreme Overlord': {
        name: 'Supreme Overlord',
        tags: '[Str +1 @ Boost] [Spe +1 @ Boost]',
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
    if (!name && !tags && !descOrEffect) return 1;
    const cleanName = (name || '').replace(/\s*\(HA\)$/i, '').trim();
    const known = getKnownAbility(cleanName);
    if (known?.maxBoost) return known.maxBoost;

    const text = `${tags || ''} ${descOrEffect || ''} ${known?.summary || ''}`.toLowerCase();
    const matchPoints = text.match(/up to\s*(\d+)\s*point/i);
    if (matchPoints && matchPoints[1]) {
        return Math.max(1, parseInt(matchPoints[1], 10));
    }
    const matchStacks = text.match(/stacks?\s*(?:up to)?\s*(\d+)\s*time/i);
    if (matchStacks && matchStacks[1]) {
        return Math.max(1, parseInt(matchStacks[1], 10));
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
            const cleaned = tags
                .replace(/\[|\]/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();
            display = cleaned.length > 30 ? `${cleaned.slice(0, 27)}...` : cleaned;
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
        } else if (/@\s*boost/i.test(display)) {
            if (effectiveLevel > 1) {
                display = display.replace(/\+1\b/g, `+${effectiveLevel}`);
                display = display.replace(/@\s*boost/i, `(Boost x${effectiveLevel})`);
            } else if (effectiveLevel === 1) {
                display = display.replace(/@\s*boost/i, '(Boost Active)');
            } else {
                display = display.replace(/@\s*boost/i, '(Boost)');
            }
        }
    }

    return display;
}

