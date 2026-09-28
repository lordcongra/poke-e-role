import type { ExtraCategory } from '../../../../store/storeTypes';
import { getTargetOptions } from './tagBuilderConstants';

export interface SearchResultItem {
    target: string;
    category: string;
    categoryLabel: string;
    keywords?: string[];
}

const CATEGORY_LABELS: Record<string, string> = {
    stat: 'Attributes',
    skill: 'Skills',
    combat: 'Combat',
    matchup: 'Matchups',
    mechanic: 'Mechanics',
    turn_based: 'Turn-Based',
    status: 'Status',
    move_mechanics: 'Move Modifiers'
};

const TARGET_KEYWORDS: Record<string, string[]> = {
    // Stats / Attributes
    Str: ['strength', 'attack', 'physical', 'atk', 'bonus'],
    Dex: ['dexterity', 'agility', 'reflex', 'acrobatics'],
    Vit: ['vitality', 'health', 'constitution', 'stamina', 'hp'],
    Spe: ['special', 'sp atk', 'sp def', 'special attack'],
    Ins: ['insight', 'will', 'willpower', 'mind', 'perception'],
    Def: ['defense', 'armor', 'guard', 'protection', 'physical defense'],
    Spd: ['speed', 'movement', 'initiative', 'turn order', 'fast'],
    HP: ['health', 'hit points', 'max hp', 'healing', 'life'],
    Will: ['willpower', 'energy', 'points', 'fp', 'focus'],
    Tough: ['toughness', 'contest', 'defense'],
    Cool: ['coolness', 'contest', 'attack'],
    Beauty: ['beauty', 'contest', 'special'],
    Cute: ['cuteness', 'contest', 'speed'],
    Clever: ['cleverness', 'smart', 'contest', 'insight'],

    // Combat
    Dmg: ['damage', 'attack', 'power', 'boost', 'hit', 'strike'],
    Acc: ['accuracy', 'aim', 'precision', 'hit rate', 'target'],
    Init: ['initiative', 'speed', 'turn order', 'quick', 'first'],
    Chance: ['secondary effect', 'status chance', 'rate', 'percentage'],
    'Crit Dmg': ['critical damage', 'critical hit damage', 'crit'],
    'Combo Dmg': ['combo', 'multiple hits', 'chain'],
    'First Hit Dmg': ['opening attack', 'ambush', 'first strike', 'lead'],
    'First Hit Acc': ['opening accuracy', 'first strike aim'],
    'Low Acc Penalty': ['accuracy reduction', 'reduce miss'],

    // Matchup
    Immune: ['immunity', 'zero damage', 'invulnerable', 'type', 'block'],
    Resist: ['resistance', 'half damage', 'tank', 'type'],
    Weak: ['weakness', 'double damage', 'vulnerable', 'type'],
    'Remove Immunities': ['piercing', 'bypass immunity', 'ignore immune', 'break'],

    // Mechanics
    'High Crit': ['critical', 'crit', 'crit on 4', 'keen eye', 'scope lens', 'razor claw'],
    'Stacking High Crit': ['critical', 'crit', 'stack', 'focus energy'],
    'Ignore Low Acc': ['wide lens', 'no miss', 'accurate', 'bypass penalty'],
    'Ignore Pain': ['injury', 'wound', 'pain', 'damage reduction'],
    Recoil: ['self damage', 'life orb', 'recoil damage'],
    'Super Effective': ['expert belt', 'weakness bonus', 'extra damage'],
    Powder: ['spore', 'sleep powder', 'poison powder', 'powder move'],
    'Gain Temp HP': ['temporary health', 'shield', 'barrier', 'temp hp', 'absorption'],
    'Temp HP on Hit': ['life steal', 'vampiric', 'shield on hit'],
    'Temp HP % Dmg': ['spend shield', 'shield bash', 'temp hp damage'],
    'Acc [X]s Add Dmg Limit [Y]': ['accuracy to damage', 'convert', 'aimed strike'],

    // Turn-Based
    'Deal Damage End of Round': ['burn tick', 'poison tick', 'dot', 'damage over time', 'end of turn'],
    'Reduce Will End of Round': ['drain will', 'will loss', 'fatigue'],
    'Heal Round End': ['leftovers', 'regeneration', 'regen', 'passive heal', 'recovery', 'heal'],
    'Restore Will Round End': ['will regen', 'meditation', 'focus recovery'],
    'Lose Action(s)': ['stun', 'flinch', 'skip turn', 'freeze', 'lost action'],
    'No Reactions': ['block reaction', 'stop reaction', 'no response'],
    'Extra Reaction(s)': ['bonus reaction', 'second reaction', 'counter'],

    // Status
    '1st Degree Burn': ['burn', 'fire', 'damage over time', 'flame'],
    '2nd Degree Burn': ['burn', 'fire', 'flame', 'severe burn'],
    '3rd Degree Burn': ['burn', 'fire', 'lethal burn', 'heavy flame'],
    Poison: ['toxic', 'poisoned', 'venom', 'dot'],
    'Badly Poisoned': ['toxic orb', 'toxic', 'severe poison', 'venom'],
    Paralysis: ['paralyze', 'stun', 'electric', 'speed drop'],
    Sleep: ['asleep', 'slumber', 'rest', 'hypnosis'],
    'Frozen Solid': ['ice', 'freeze', 'frost', 'solid'],
    Confusion: ['confused', 'self hit', 'dizzy'],
    'In Love': ['attract', 'infatuation', 'charm', 'seduce'],
    Disable: ['disable', 'blocked move', 'sealed'],
    Flinch: ['flinched', 'scared', 'cower'],

    // Move mechanics
    'High Critical': ['crit', 'high crit', 'critical hit'],
    'Low Accuracy': ['low acc', 'miss chance'],
    'Never Miss': ['aerial ace', 'swift', 'always hits', '100% accuracy'],
    'Successive Actions': ['multihit', 'consecutive', 'repeat'],
    'Set Damage': ['fixed damage', 'dragon rage', 'sonic boom', 'night shade'],
    'Fist Move': ['punch', 'iron fist'],
    'Bite Move': ['fang', 'crunch', 'strong jaw'],
    'Cutter Move': ['slash', 'sharpness', 'blade', 'cut'],
    'Sound Move': ['voice', 'soundproof', 'liquid voice'],
    'Projectile Move': ['bullet', 'ball', 'mega launcher', 'bomb'],
    'Wind Move': ['wind power', 'wind rider', 'gust', 'air'],
    'Basic Heal': ['heal', 'recover', 'roost'],
    'Complete Heal': ['full restore', 'heal all'],
    'Minor Heal': ['small heal', 'drain']
};

export function getAllSearchableEffects(isMove: boolean, extraCategories: ExtraCategory[]): SearchResultItem[] {
    const categories = [
        'stat',
        'skill',
        'combat',
        'matchup',
        'mechanic',
        'turn_based',
        'status',
        ...(isMove ? ['move_mechanics'] : [])
    ];

    const results: SearchResultItem[] = [];

    for (const cat of categories) {
        const targets = getTargetOptions(cat, extraCategories);
        const catLabel = CATEGORY_LABELS[cat] || cat;

        for (const target of targets) {
            results.push({
                target,
                category: cat,
                categoryLabel: catLabel,
                keywords: TARGET_KEYWORDS[target] || []
            });
        }
    }

    return results;
}

export function searchEffects(query: string, isMove: boolean, extraCategories: ExtraCategory[]): SearchResultItem[] {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const all = getAllSearchableEffects(isMove, extraCategories);
    const words = q.split(/\s+/).filter(Boolean);

    const scored = all.map((item) => {
        const targetLower = item.target.toLowerCase();
        const catLower = item.categoryLabel.toLowerCase();
        const keywords = item.keywords || [];

        let score = 0;

        // Exact match
        if (targetLower === q) {
            score += 100;
        } else if (targetLower.startsWith(q)) {
            score += 60;
        } else if (targetLower.includes(q)) {
            score += 40;
        }

        // Category match
        if (catLower === q) {
            score += 20;
        } else if (catLower.includes(q)) {
            score += 10;
        }

        // Keyword matches
        for (const kw of keywords) {
            const kwLower = kw.toLowerCase();
            if (kwLower === q) {
                score += 50;
            } else if (kwLower.startsWith(q)) {
                score += 30;
            } else if (kwLower.includes(q)) {
                score += 20;
            }
        }

        // Multi-word check
        if (words.length > 1) {
            const allWordsMatch = words.every(
                (w) =>
                    targetLower.includes(w) ||
                    catLower.includes(w) ||
                    keywords.some((kw) => kw.toLowerCase().includes(w))
            );
            if (allWordsMatch) {
                score += 35;
            }
        }

        return { item, score };
    });

    return scored
        .filter((s) => s.score > 0)
        .sort((a, b) => b.score - a.score)
        .map((s) => s.item);
}
