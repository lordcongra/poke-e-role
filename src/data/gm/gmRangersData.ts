/**
 * Pokerole GM Screen - Pokémon Rangers Homebrew Data
 * Based on Prof. Drake's Pokémon Rangers Supplement for Pokerole.
 */

export const DRAKE_RANGERS_DOC_URL =
    'https://docs.google.com/document/d/1GSn8Ms94vxTi86Lfh6rGXMVQ4huZ4W3Ik_F5v-FJJfw/edit?tab=t.0#heading=h.2d4gnxfspgm4';

export const RANGERS_HOMEBREW_DISCLAIMER =
    'Note: These rules, stylers, maneuvers, and assist systems are from Prof. Drake’s optional Pokémon Rangers supplement for Pokerole, not official corebook requirements. GMs and tables are encouraged to adapt or modify them for their campaign!';

export interface RangerDispositionRank {
    rank: string;
    bonus: number;
    maneuversCount: number;
    assistsCount: number;
}

export interface RangerStyler {
    name: string;
    cost: string;
    charge: number;
    effect: string;
    flavor: string;
}

export interface RangerStyle {
    name: string;
    stat: string;
    description: string;
}

export interface RangerDangerousBuff {
    name: string;
    effect: string;
}

export interface RangerManeuver {
    name: string;
    category: 'Basic' | 'Advanced' | 'Agile' | 'Brute' | 'Tricky' | 'Master';
    accuracy: string;
    power: string;
    description: string;
    flavor?: string;
}

export interface RangerFieldAssist {
    name: string;
    effect: string;
}

export interface RangerPartnerBondLevel {
    level: number;
    requirement: string;
    ability: string;
}

// 1. DISPOSITION METER & PROGRESSION BY RANK
export const RANGER_RANK_PROGRESSION: RangerDispositionRank[] = [
    { rank: 'Starter', bonus: 2, maneuversCount: 2, assistsCount: 2 },
    { rank: 'Rookie', bonus: 3, maneuversCount: 3, assistsCount: 3 },
    { rank: 'Standard', bonus: 4, maneuversCount: 4, assistsCount: 4 },
    { rank: 'Advanced', bonus: 5, maneuversCount: 5, assistsCount: 5 },
    { rank: 'Expert', bonus: 6, maneuversCount: 6, assistsCount: 6 },
    { rank: 'Ace', bonus: 7, maneuversCount: 7, assistsCount: 7 },
    { rank: 'Master', bonus: 8, maneuversCount: 8, assistsCount: 8 },
    { rank: 'Champion', bonus: 10, maneuversCount: 10, assistsCount: 10 }
];

// 2. RANGER STYLES
export const RANGER_STYLES: RangerStyle[] = [
    {
        name: 'Agile Style',
        stat: 'Dexterity',
        description: 'Maneuver your line with swiftness and grace. Focuses on fast reactive movements, evasion, and rapid combos.'
    },
    {
        name: 'Brute Style',
        stat: 'Strength or Vitality',
        description: 'Tough and sturdy, maneuvering your line without a care in the world. Focuses on durability, heavy impact, and shielding allies.'
    },
    {
        name: 'Tricky Style',
        stat: 'Insight',
        description: 'Calculating and cunning, maneuvering lines with timed attacks and environmental trickery to catch foes off-guard.'
    }
];

// 3. CAPTURE STYLER CATALOG
export const RANGER_STYLERS: RangerStyler[] = [
    {
        name: 'School Styler',
        cost: '—',
        charge: 10,
        effect: 'Simple to use Styler perfect for trainees who have never handled one before.',
        flavor: 'A lightweight training model issued to Ranger School cadets.'
    },
    {
        name: 'Basic Styler',
        cost: '—',
        charge: 15,
        effect: 'Standard Styler issued by the Ranger Union upon graduation. Durable and maneuverable.',
        flavor: 'The reliable baseline tool of all active field Rangers.'
    },
    {
        name: 'Specialty Styler',
        cost: '3,000',
        charge: 20,
        effect: 'At the start of combat, increase one of your Style Stats by 1 (stacks with moves).',
        flavor: 'A Basic Styler upgraded to work best with a Ranger’s chosen Specialty.'
    },
    {
        name: 'Fine Styler',
        cost: '5,000',
        charge: 25,
        effect: 'All techniques performed with this Stylus gain +1 die to Accuracy and Damage (does not apply to Pokemon Assists).',
        flavor: 'Designed to refine aura faster and portray stronger emotions.'
    },
    {
        name: 'Tempo Styler',
        cost: '7,000',
        charge: 25,
        effect: 'If user has Agile Style and performs a Maneuver using Dexterity in Damage roll, increase Dexterity by 1 (stacks up to 3 times).',
        flavor: 'Modified for rapid precision wrist movements to swiftly capture all Pokémon.'
    },
    {
        name: 'Durable Styler',
        cost: '7,000',
        charge: 30,
        effect: 'If user has Brute Style, reduce all damage taken by 1 while holding this Styler (stacks with moves).',
        flavor: 'Modified to reinforce aura defense and withstand the hardest blows.'
    },
    {
        name: 'Wily Styler',
        cost: '7,000',
        charge: 20,
        effect: 'If user has Tricky Style, perform 1 "Basic Loop" after each maneuver used.',
        flavor: 'Capable of rapid tactical shifts to ensnare foes in unexpected traps.'
    },
    {
        name: 'Lasso Styler',
        cost: '6,000',
        charge: 20,
        effect: 'Usable like a grappling rope. Athletic skill checks made with this Stylus gain 1 extra die.',
        flavor: 'Binds aura into a tensile rope capable of latching onto terrain and targets.'
    }
];

// 4. DANGEROUS ENCOUNTERS (BOSS BUFFS)
export const RANGER_DANGEROUS_BUFFS: RangerDangerousBuff[] = [
    {
        name: 'Strength Enhancement',
        effect: 'This Pokémon increases all of its Attributes and Traits by 1.'
    },
    {
        name: 'Super Damage',
        effect: 'All damage this Pokémon inflicts is considered Super Effective.'
    },
    {
        name: 'Enhanced Movement',
        effect: 'At Initiative 0 this Pokémon can perform 1 more Action, ignoring move restrictions and Action Value limits.'
    }
];

// 5. RANGER MANEUVERS
export const RANGER_MANEUVERS: RangerManeuver[] = [
    // Basic Maneuvers
    {
        name: 'Basic Loop',
        category: 'Basic',
        accuracy: 'Style + Empathy',
        power: 'Social',
        description: 'Single Target. A simple loop that connects around the target.',
        flavor: 'The fundamental capture technique taught to every Ranger.'
    },
    {
        name: 'Capture On!',
        category: 'Basic',
        accuracy: 'Style + Perform',
        power: '—',
        description: 'Target Self. Increase Accuracy and Damage pool of the next attack by 2.',
        flavor: 'A focusing shout passed around experienced Rangers to channel excitement.'
    },
    {
        name: 'Large Loop',
        category: 'Basic',
        accuracy: 'Style + Empathy',
        power: 'Social',
        description: 'Target All Foes. Low Accuracy 1.',
        flavor: 'Without proper technique this wide loop breaks easily.'
    },
    // Advanced Maneuvers
    {
        name: 'Emotional Shock',
        category: 'Advanced',
        accuracy: 'Style + Empathy',
        power: 'Social + 2',
        description: 'Single Target. Roll 2 Chance dice to Paralyze the Target.',
        flavor: 'Overcharges the loop with raw emotion to overwhelm the foe’s senses.'
    },
    {
        name: 'Fancy Technique',
        category: 'Advanced',
        accuracy: 'Style + Perform/Etiquette',
        power: 'Social*',
        description: 'Single Target. Can be used many times in same round. Add +1 die to damage pool each time used (up to +5 dice). Resets if another Maneuver is used.'
    },
    {
        name: 'Aura Wheel',
        category: 'Advanced',
        accuracy: 'Style + Empathy',
        power: 'Social + 2',
        description: 'Single Target. Ranged. Never Miss.',
        flavor: 'Launches a spinning aura loop that unerringly tracks the target.'
    },
    {
        name: 'Spirit Burst',
        category: 'Advanced',
        accuracy: 'Style + Empathy',
        power: 'Social + 5',
        description: 'Single Target. Low Accuracy 2. Recoil.',
        flavor: 'Explodes aura upon contact, heavily chipping both user and target walls.'
    },
    {
        name: 'Target Sighted!',
        category: 'Advanced',
        accuracy: 'Social + Alert',
        power: '—',
        description: 'Single Target. For the rest of the round, all attacks against the target roll 2 extra dice for Accuracy.'
    },
    {
        name: 'Locked and Loaded!',
        category: 'Advanced',
        accuracy: 'Style + Alert',
        power: '—',
        description: 'Target Self. Next attack gains High Critical and Never Miss.'
    },
    {
        name: 'Recall',
        category: 'Advanced',
        accuracy: 'Dexterity + Evasion',
        power: '—',
        description: 'Target Self. Reaction 2. Shield Move. Recall the Stylus to cancel incoming attack and reduce damage taken by 2 (cancels active maneuver if used on your turn).'
    },
    {
        name: 'Release',
        category: 'Advanced',
        accuracy: 'Strength + Brawl/Weapon',
        power: 'Strength',
        description: 'Single Target. Flinch target. Must be first action of the round.'
    },
    {
        name: 'Hold On',
        category: 'Advanced',
        accuracy: 'Vitality + Athletic',
        power: '—',
        description: 'Target Self. Reaction 5. Shield Move. If an attack would cause the user to faint, they remain at 1 HP instead until user’s next turn.'
    },
    {
        name: 'Prepare',
        category: 'Advanced',
        accuracy: 'Insight + Weapon',
        power: '—',
        description: 'Target Self. For the rest of the round, your Ranger Maneuvers have Reaction 1 and you gain +1 Defense.'
    },
    {
        name: 'Expanding Line',
        category: 'Advanced',
        accuracy: 'Vitality/Insight + Weapon',
        power: '—',
        description: 'Target Self. The next move the user performs is treated as "Target All Foes in Range".'
    },
    // Agile Maneuvers
    {
        name: 'Swift Movement',
        category: 'Agile',
        accuracy: 'Dexterity + Evasion',
        power: '—',
        description: 'Target Self. Reaction 1. Counts as Evade action; user can now make up to 5 Evasions this round.'
    },
    {
        name: 'Shift Up',
        category: 'Agile',
        accuracy: 'Insight + Athletic',
        power: '—',
        description: 'Target Self. Triple Action. Increase Dexterity by 1 (stacks up to 3 times).'
    },
    {
        name: 'Hasty Coil',
        category: 'Agile',
        accuracy: 'Dexterity + Athletic/Weapon',
        power: 'Social + 1',
        description: 'Single Target. Successive Action. Low Accuracy 1. Each successful action increases power by 1 until end of round.'
    },
    {
        name: 'Fast Loop',
        category: 'Agile',
        accuracy: 'Dexterity + Empathy',
        power: 'Dexterity + 2',
        description: 'Single Target. Reaction 2. A basic capture loop thrown with blinding speed.'
    },
    {
        name: 'Rapid Aura',
        category: 'Agile',
        accuracy: 'Dexterity + Empathy',
        power: 'Dexterity + 1',
        description: 'Target All Foes in Range. Double Action. Low Accuracy 2. Boost Power by 1 for each Dexterity buff the owner has.'
    },
    // Brute Maneuvers
    {
        name: 'Get Down!',
        category: 'Brute',
        accuracy: 'Will + Athletic',
        power: '—',
        description: 'Target Ally. Reaction 3. Shield Move. User becomes target of incoming attack and reduces all damage taken by 3.'
    },
    {
        name: 'Boost!',
        category: 'Brute',
        accuracy: 'Vitality + Brawl',
        power: '—',
        description: 'Target Self. If damaged by an attack this round, increase Strength by 1 (stacks up to 3 times).'
    },
    {
        name: 'Aura Counterattack',
        category: 'Brute',
        accuracy: 'Strength + Empathy',
        power: '*',
        description: 'Target Foe. Late Reaction 2. Roll damage equal to incoming damage pool + 2, ignoring defenses.'
    },
    {
        name: 'Mighty Blow',
        category: 'Brute',
        accuracy: 'Strength + Brawl/Weapon',
        power: 'Strength + 3',
        description: 'Target Foe. Low Accuracy 1. If it misses, roll 2 dice of typeless damage against user.'
    },
    {
        name: 'Durable Loop',
        category: 'Brute',
        accuracy: 'Vitality + Empathy',
        power: 'Vitality + 2',
        description: 'Target Foe. Increase user’s Defense by 1 (stacks up to 2 times).'
    },
    // Tricky Maneuvers
    {
        name: 'Bait and Switch',
        category: 'Tricky',
        accuracy: 'Insight + Evasion',
        power: '—',
        description: 'Target Foe. Reaction 3. When targeted by an attack, redirect move to another target, allowing them 1 free reaction.'
    },
    {
        name: 'Sneaky Aura',
        category: 'Tricky',
        accuracy: 'Insight + Empathy',
        power: 'Insight + 2',
        description: 'Target Foe. Late Reaction 1. High Critical.'
    },
    {
        name: 'Dizzy Loop',
        category: 'Tricky',
        accuracy: 'Dexterity + Empathy/Weapon',
        power: 'Insight + 2',
        description: 'Target Foe. Roll 3 Chance dice to Confuse the Target.'
    },
    {
        name: 'Aura Shield',
        category: 'Tricky',
        accuracy: 'Insight + Empathy',
        power: '—',
        description: 'Target Battlefield (User side). Force Field against Physical or Special damage for 4 rounds.'
    },
    {
        name: 'Calculate',
        category: 'Tricky',
        accuracy: 'Insight + Alert/Science',
        power: '—',
        description: 'Target User & Allies. Targets gain +2 dice to their next Accuracy check and Damage roll.'
    },
    // Master Maneuvers
    {
        name: 'Power Charge!',
        category: 'Master',
        accuracy: 'Will + Empathy',
        power: '—',
        description: 'Target User. All attacks deal +3 Damage for the round. If user takes damage, roll Will check vs damage taken or lose effect.'
    },
    {
        name: 'Aura Expulsion',
        category: 'Master',
        accuracy: 'Style + Empathy',
        power: 'Social + 3',
        description: 'Target All Foes in Range. If target is at or below half DM, power increases by +3.'
    },
    {
        name: 'Guardian Assist',
        category: 'Master',
        accuracy: 'Will + Weapon',
        power: '*',
        description: 'Target Battlefield. Unique. Call forth a legendary/powerful guardian ally (effect determined by GM).'
    }
];

// 6. FIELD ASSISTS
export const RANGER_FIELD_ASSISTS: RangerFieldAssist[] = [
    { name: 'Crush', effect: 'Destroy boulders and heavy obstacles using brute force!' },
    { name: 'Cut', effect: 'Slice overgrown vegetation and clear paths with precision!' },
    { name: 'Burn', effect: 'Ignite kindling, melt ice, or clear combustible roadblocks!' },
    { name: 'Soak', effect: 'Blast water onto surfaces, extinguish flames, or hydrate plants.' },
    { name: 'Electrify', effect: 'Send electric current to power generators and activate machinery!' },
    { name: 'Tackle', effect: 'Ram into heavy trees or shove oversized objects out of the way!' },
    { name: 'Psy-Power', effect: 'Levitate and manipulate objects from afar using mystical energies!' },
    { name: 'Recharge', effect: 'Restore +3 Charge directly to your Capture Styler!' },
    { name: 'Fly', effect: 'Soar through the skies across treacherous chasms and terrain!' },
    { name: 'Surf', effect: 'Glide smoothly along water surfaces to navigate aquatic routes!' }
];

// 7. PARTNER BOND LEVELS (1 to 5)
export const RANGER_PARTNER_BOND_LEVELS: RangerPartnerBondLevel[] = [
    {
        level: 1,
        requirement: 'Loyalty/Happiness 3/3',
        ability: 'For 1 round, apply 1 of your Partner Pokémon’s Typings to every maneuver used.'
    },
    {
        level: 2,
        requirement: 'Loyalty/Happiness 4/3 or 3/4',
        ability: 'Add your Partner’s Happiness or Loyalty to the dice pool of 1 skill check (Trainer or Pokémon).'
    },
    {
        level: 3,
        requirement: 'Loyalty/Happiness 4/4',
        ability: 'Partner performs 1 move at the same time as the Ranger acts (decreases Disposition instead of dealing damage).'
    },
    {
        level: 4,
        requirement: 'Loyalty/Happiness 5/4 or 4/5',
        ability: 'Partner can attempt 1 additional Clash when your Stylus is targeted, rolling full move damage pool.'
    },
    {
        level: 5,
        requirement: 'Loyalty/Happiness 5/5',
        ability: 'With GM permission, automatically succeed on any 1 critical skill check (typically once per session).'
    }
];
