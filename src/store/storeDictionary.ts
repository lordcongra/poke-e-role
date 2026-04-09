/**
 * POKEROLE EXTENSION: STATE VARIABLE DICTIONARY
 * This file serves as pure documentation mapping Zustand variables to their Owlbear Rodeo equivalents.
 */

export const STORE_DICTIONARY: Record<string, string> = {
    // Health & Will
    hpCurr: 'Current Hit Points',
    hpMax: 'Maximum Hit Points',
    hpBase: 'Base Hit Points (Before Vitality/Insight scaling)',
    temporaryHitPoints: 'Shield HP granted by Dynamax/Gigantamax or Custom Forms',
    temporaryHitPointsMax: 'Tracks the ceiling of the shield for the visual bar',
    willCurr: 'Current Willpower',
    willMax: 'Maximum Willpower',
    willBase: 'Base Willpower (Before Insight scaling)',

    // Derived Combat Stats
    defBuff: 'Defense Buff',
    defDebuff: 'Defense Debuff',
    sdefBuff: 'Special Defense Buff',
    sdefDebuff: 'Special Defense Debuff',

    // Trackers
    happy: 'Happiness Tracker',
    loyal: 'Loyalty Tracker',
    tp: 'Training Points',
    currency: 'PokéDollars',
    globalAcc: 'Global Accuracy Modifier applied to all rolls',
    globalDmg: 'Global Damage Modifier applied to all rolls',
    globalSucc: 'Global Success Modifier (Flat additions/subtractions to final successes)',
    globalChance: 'Global Chance Dice Modifier',
    ignoredPain: 'How many levels of Pain Penalty the character is currently ignoring',

    // Moves & Combat
    attr: "The core Attribute used for the roll (e.g., 'ins', 'str', 'will')",
    cat: 'Category (Physical, Special, Status)',
    acc1: "Accuracy Attribute (e.g., 'dex', 'str', 'will')",
    acc2: "Accuracy Skill (e.g., 'brawl', 'channel', or 'none')",
    dmg1: "Damage Attribute (e.g., 'str', 'spe', or '' for Status moves)",
    desc: "Description and mechanical tags (e.g., '[High Crit]')",
    dmgStat: 'Damage Attribute (used in generator)',

    // Identity & Transformation
    gmOnly: 'Hides this entity from the player-facing dropdowns',
    activeTransformation: 'Tracks if the character is currently Mega Evolved, Dynamaxed, etc.',
    activeFormId: "Tracks WHICH custom form is active (e.g., 'megax')",
    formSaves: 'Dynamic dictionary storing form backups by ID instead of hardcoded strings',
    customFormConfig: 'Storing Revert Config on the Token natively protects against desyncs/race conditions',
    customFormFirstHitAccActive: 'Independently tracked Accuracy First Hit logic',
    customFormFirstHitDmgActive: 'Independently tracked Damage First Hit logic',

    // Homebrew Types
    maxMoveName: "Custom name for this type's Max Move",
    maxMoveEffect: "Custom effect text for this type's Max Move"
};
