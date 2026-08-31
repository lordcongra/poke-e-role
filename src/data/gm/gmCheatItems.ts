/**
 * Pokerole GM Screen - Full Searchable Cheat Items Dataset
 */
import {
    DIFFICULTY_TABLE
} from './gmCombatData';
import {
    STATUS_EFFECTS_DATA,
    WEATHER_CONDITIONS_DATA,
    ENVIRONMENTAL_HAZARDS_DATA
} from './gmStatusData';
import {
    TRAINER_ACTIONS_TABLE,
    COVER_TABLE,
    HEALING_TABLE,
    RANK_SUMMARY_TABLE,
    CATCH_BALLS_TABLE,
    CATCH_CONDITIONS_TABLE,
    CATCH_RANKS_TABLE,
    BATTLE_TP_TABLE,
    TRAINING_SESSION_RULES,
    RANK_UP_TP_TABLE,
    EVOLUTION_TP_TABLE,
    LEARN_MOVES_TP_TABLE,
    ENCOUNTER_BALANCE_TABLE,
    formatDiscordTable
} from './gmReferenceData';

export interface GmCheatItem {
    id: string;
    title: string;
    category: 'rules' | 'status' | 'weather' | 'catching' | 'training' | 'balance' | 'types';
    categoryLabel: string;
    badge?: string;
    summary: string;
    keywords: string[];
    discordMarkdown: string;
    broadcastText: string;
    tableData?: {
        headers: string[];
        rows: string[][];
    };
    notes?: string[];
}

export const GM_CHEAT_ITEMS: GmCheatItem[] = [
    {
        id: 'skills-and-attributes',
        title: 'Skills & Attributes Overview',
        category: 'rules',
        categoryLabel: 'Combat & Rules',
        badge: 'Core Reference',
        summary: 'All 5 Core Attributes, Fight, Survival, Social, Knowledge skills, and Social Attributes.',
        keywords: [
            'skills',
            'attributes',
            'strength',
            'dexterity',
            'vitality',
            'special',
            'insight',
            'brawl',
            'throw',
            'weapons',
            'evasion',
            'clash',
            'channel',
            'alert',
            'athletic',
            'nature',
            'stealth',
            'charm',
            'empathy',
            'etiquette',
            'intimidate',
            'perform',
            'crafts',
            'lore',
            'medicine',
            'science',
            'tough',
            'cool',
            'clever',
            'beauty',
            'cute'
        ],
        broadcastText:
            'Attributes: Strength, Dexterity, Vitality, Special, Insight\nSocial Attributes: Tough, Cool, Clever, Beauty, Cute\nFight: Brawl, Throw*, Weapons*, Evasion, Clash^, Channel^\nSurvival: Alert, Athletic, Nature, Stealth\nSocial: Charm, Empathy, Etiquette, Intimidate, Perform\nKnowledge: Crafts, Lore, Medicine, Science (*Human, ^Pokemon)',
        discordMarkdown: `## 📜 **Pokerole 3.0: Skills & Attributes**
> *Reference list of Core Attributes, Social Attributes, Combat Skills, and Non-Combat Competencies.*

**Core Attributes:**
• **Strength:** Physical power, lifting, melee force
• **Dexterity:** Agility, reflexes, speed, precision
• **Vitality:** Stamina, HP, physical resilience
• **Special:** Elemental mastery, aura, energy output
• **Insight:** Mental acuity, perception, tactical wit

**Social Attributes:**
• **Tough:** Grit, determination, withstanding stress
• **Cool:** Style, composure, charismatic confidence
• **Clever:** Wit, fast thinking, cunning
• **Beauty:** Grace, visual aesthetic, magnetic presence
• **Cute:** Innocence, endearing charm

**Fight Skills:**
• **Brawl:** Unarmed melee combat
• **Throw*:** Throwing Pokéballs & projectiles
• **Weapons*:** Wielding weapons
• **Evasion:** Dodging, ducking, diving for cover
• **Clash^:** Contesting enemy attacks
• **Channel^:** Projecting special energy

**Survival Skills:** \`Alert\`, \`Athletic\`, \`Nature\`, \`Stealth\`
**Social Skills:** \`Charm\`, \`Empathy\`, \`Etiquette\`, \`Intimidate\`, \`Perform\`
**Knowledge Skills:** \`Crafts\`, \`Lore\`, \`Medicine\`, \`Science\`

*(* Typically a human skill | ^ Typically a Pokémon skill)*`
    },
    {
        id: 'successes-required',
        title: 'Action Difficulty & Successes Required',
        category: 'rules',
        categoryLabel: 'Combat & Rules',
        badge: 'Dice Table',
        summary: 'Target successes required for consecutive actions in a single round (1st to 5th action).',
        keywords: [
            'successes',
            'difficulty',
            'actions',
            'multiple actions',
            'action economy',
            'troublesome',
            'challenging',
            'hard',
            'very hard',
            'almost impossible'
        ],
        broadcastText:
            'Action Difficulty:\n• 1st Action: 1 Success (Troublesome)\n• 2nd Action: 2 Successes (Challenging)\n• 3rd Action: 3 Successes (Hard)\n• 4th Action: 4 Successes (Very Hard)\n• 5th Action: 5 Successes (Almost Impossible)',
        discordMarkdown: `## 🎲 **Action Difficulty / Multiple Actions**
> *Required successes increase for each additional action taken in the same round (Max 5 actions).*

${formatDiscordTable(
    ['Action This Round', 'Required Successes', 'Difficulty Level'],
    DIFFICULTY_TABLE.map((d) => [d.action, d.successes, d.difficulty])
)}`
    },
    {
        id: 'will-points',
        title: 'Will Points (Spending & Recovery)',
        category: 'rules',
        categoryLabel: 'Combat & Rules',
        badge: 'Core Mechanic',
        summary: 'Power Through Pain, Take Your Chances, Pushing Fate, and recovery conditions.',
        keywords: [
            'will',
            'will points',
            'power through the pain',
            'take your chances',
            'pushing fate',
            'faint',
            'reroll',
            're-roll',
            'will recovery'
        ],
        broadcastText:
            'Will Points Spending:\n• Power Through Pain: Ignore 1 Pain Penalty for scene\n• Take Your Chances: Reroll 1 failure from all Action Rolls this round\n• Pushing Fate: +1 Success to a single roll (not dmg/chance)\n⚠️ Cannot use Take Your Chances & Pushing Fate in same round! Spending all Will causes fainting at scene end.',
        discordMarkdown: `## 🌟 **Will Points: Spending & Recovery**
**Spending Will:**
• **Power Through the Pain:** Spend **1 Will** to ignore one Pain Penalty for the rest of the scene.
• **Take Your Chances:** Spend **1 Will** to re-roll one unsuccessful die from all Action Rolls this round.
• **Pushing Fate:** Spend **1 Will** to add one automatic success to a single roll *(Does not work for Damage or Chance rolls)*.

> ⚠️ **Important Rules:**
> • In a single round, you may only use *Take Your Chances* OR *Pushing Fate*—you cannot use both in the same round!
> • Spending all your Will Points in a scene causes that character to **faint** at the end of the scene!

**Recovering Will:**
• Rest for a few days in safety
• Complete an important story achievement
• Win a battle
• Train with your Pokémon (2-hour training session)`
    },
    {
        id: 'combat-flow',
        title: 'Combat Flow & Round Structure',
        category: 'rules',
        categoryLabel: 'Combat & Rules',
        badge: 'Round Sequence',
        summary: 'Step-by-step combat order: Initiative, Action Turns, Round End, and Trainer Actions.',
        keywords: [
            'combat flow',
            'round',
            'initiative',
            'pass',
            'turns',
            'trainer area',
            'in the fray',
            'weather',
            'terrain',
            'ability'
        ],
        broadcastText:
            'Combat Flow:\n1. Combat Starts: Roll Initiative (1d6+Dex+Alert), declare Abilities & Weather/Terrain.\n2. Round Starts: Take turns in init order (Action or Pass). Max 5 actions.\n3. Round Ends: When all pass. Trainers not in the fray may take an action.\n4. Repeat for next round.',
        discordMarkdown: `## ⚔️ **Pokerole Combat Flow**
1. **Combat Starts!** Roll Initiative for each combatant: \`1d6 + Dexterity + Alert\`
   • Each Pokémon declares which Ability is active.
   • Storyteller announces active Weather and Terrain effects.
2. **Round Starts!** Take turns in initiative order. On each Pokémon's turn:
   • Use a Move or another action.
   • Choose to Pass and do nothing (Mandatory pass if 5 actions already taken this round).
3. **Round Ends!** When every Pokémon in Initiative order Passes, the round ends.
   • Trainers who are *not In the Fray* may now take an action.
4. **Next Round:** If combat continues, reset action counts and start the next round.`
    },
    {
        id: 'using-a-move',
        title: 'Using a Move & Damage Resolution',
        category: 'rules',
        categoryLabel: 'Combat & Rules',
        badge: 'Attack Flow',
        summary: 'Accuracy rolls, Reactions, Late Reactions, Damage, 0-success minimum damage, Critical Hits (+2 dice), Added Effects activation, and Type Modifiers.',
        keywords: [
            'move',
            'accuracy',
            'reaction',
            'late reaction',
            'damage',
            'critical hit',
            'weakness',
            'resistance',
            'lethal damage',
            'evade',
            'clash',
            'minimum damage',
            '0 successes',
            'added effects',
            'super effective'
        ],
        broadcastText:
            'Attack Resolution:\n1. Accuracy: Roll Move Acc (Check Action Difficulty). Subtract Pain Penalties.\n2. Reactions: Defender may declare Reaction (Evade/Clash) or Late Reaction.\n3. Damage: Roll (Power + Str/Sp - Def/Sp.Def). Crit: 3+ extra Acc successes = +2 Damage Dice! (0 successes still deals 1 base damage unless Resisted).\n4. Modifiers & Effects: Weakness (+1 for 2x, +2 for 4x) & Added Effects ONLY apply if >=1 damage success is rolled! Resistance: -1 dmg.\n5. Apply Damage & resolve Late Reactions.',
        discordMarkdown: `## 💥 **Using a Move & Combat Resolution**
1. **Accuracy Roll:** Attacker rolls Move Accuracy (Attribute + Fight/Skill). Target successes based on Action Difficulty. Subtract Pain Penalties. If successes < required, move misses.
2. **Defender Reactions:**
   • **Reaction:** Executes *before* damage rolls (Evade, Clash). Attacker can react if their Reaction speed is *higher*.
   • **Late Reaction:** Executes *after* damage resolves. Attacker can Late React (lowest number first). Standard Reactions cannot be used against Late Reactions.
3. **Damage Roll:** Damage Dice = Move Power + Str/Special - Defender's Def/Sp.Def.
   • **Critical Hit:** If Accuracy scored **3+ successes higher** than required, add **+2 dice** to the damage pool!
   • **Minimum 1 Damage (0 Successes):** Even if you roll **0 successes** on the damage roll, a successful attack still inflicts **1 base damage** (unless the target has **Resistance** or **Immunity** to the move's type).
4. **Weakness, Resistance & Added Effects:**
   • **Added Effects:** Require **at least 1 success** on the damage dice to activate and apply to the target.
   • **Weakness Bonus:** Requires **at least 1 success** on the damage dice to activate. Adds **+1 flat damage** for Super Effective (2x) or **+2 flat damage** for Extremely Effective (4x).
   • **Resistance:** Each Resistance subtracts **-1 flat damage** (reducing 1 base damage down to 0).
   • **Immunity:** The target takes 0 damage and ignores all effects.
5. **Resolve:** Apply damage, then resolve any declared Late Reactions.`
    },
    {
        id: 'holding-back-attack',
        title: 'Holding Back an Attack',
        category: 'rules',
        categoryLabel: 'Combat & Rules',
        badge: 'Tactical Option',
        summary: 'Command your Pokémon to contain their strength: deal half damage, forfeit target added effects, or forfeit critical hit bonus dice.',
        keywords: [
            'holding back',
            'hold back',
            'restrain',
            'half damage',
            'forfeit added effects',
            'forfeit crit',
            'critical hit',
            'shinies',
            'catching',
            'mercy',
            'in love'
        ],
        broadcastText:
            'Holding Back an Attack:\nCommand your Pokémon to hold back ("Hold Back!", "Restrain yourself!", "Don’t use full force!") and choose one or more:\n• Deal Half Damage: Inflict half damage rounded down.\n• Forfeit Added Effects on Target: Target ignores added effects (User self-effects still apply).\n• Forfeit Critical Bonus Dice: Skip the +2 bonus damage dice (still counts as a Crit landed).\n\n(Storyteller Note: When "In Love", Pokémon try to earn their beloved’s favor. At Storyteller discretion, this can mean Half Damage or applying all Holding Back options—landing crits or poisoning your crush is a massive red flag!)',
        discordMarkdown: `## ✋ **Holding Back an Attack**
> *Sometimes it will be more convenient to contain the full force of your Pokémon attacks (e.g. avoiding fainting wild shinies or sparring).*
> 
> Give the command to *"Hold Back"*, *"Restrain yourself!"*, *"Don’t use full force!"* or similar to choose **one or a combination** of the following options:

• **Deal Half Damage:** You make your damage roll normally but only inflict **half of the damage rounded down** to those affected by your Move.
• **Forfeit Added Effects on the Target:** Your Move hits but you don’t want it to have lasting effects on those affected, so any **Added effect that would apply to the target is forfeited**. Added Effects that affect the User still apply.
• **Forfeit Critical Hit Bonus Dice:** Your Accuracy roll may have been impeccable, but you **do not add the extra damage dice (+2 dice)** on your roll. Even so, the Move still counts as a Critical Hit landed, but we are not gonna be fainting shinies here!

> 💕 **In Love Status Condition (Storyteller Discretion):**
> When a Pokémon is **In Love**, they are trying to earn their beloved's favor. At the Storyteller's discretion, this can mean dealing **Half Damage**, or applying **all Holding Back options** (forfeiting poison/added effects and critical hits)—because landing a critical hit or poisoning your crush is definitely not going to win you any dates (huge red flag!).
> *Can attack at full power by succeeding on a Loyalty or Insight roll (3+ successes).*`
    },
    {
        id: 'reactions-late-reactions',
        title: 'Reactions & Late Reactions',
        category: 'rules',
        categoryLabel: 'Combat & Rules',
        badge: 'Priority & Timing',
        summary: 'Reactions (⬆️) resolve BEFORE incoming actions (highest speed first). Late Reactions (⬇️) resolve AFTER incoming actions (lowest speed first).',
        keywords: [
            'reactions',
            'reaction',
            'late reactions',
            'late reaction',
            'priority',
            'speed',
            'order',
            'resolution',
            'quick attack',
            'extreme speed',
            'avalanche',
            'dragon tail',
            'timing',
            'interrupt'
        ],
        broadcastText:
            'Reactions & Late Reactions:\n• Reactions (⬆️): Instant movements used when it’s not your turn. Resolve BEFORE the incoming action hits. Higher numbers resolve FIRST (e.g. Extreme Speed ⬆️2 resolves before Quick Attack ⬆️1).\n• Late Reactions (⬇️): Retaliations/traps that resolve AFTER the incoming action hits. Higher numbers resolve LATER (Lower numbers resolve first: Main Action ➔ Avalanche ⬇️4 ➔ Dragon Tail ⬇️6).\n• Interactivity: You CANNOT react (⬆️) to a Late Reaction (⬇️), but you CAN Late React (⬇️) to a Reaction (⬆️).\n• Action Cost: Rolling any Reaction or Late Reaction consumes 1 Action for the Round (bound to Multi-Action chart). Max 1 reaction per turn.\n• Trigger Rule: Cannot use a reaction without an incoming trigger/target (support moves like Wide Guard / Cover an Ally can protect allies).',
        discordMarkdown: `## ⚡ **Reactions & Late Reactions**
> *Reactions are fast, tactical maneuvers and moves used when it is not your turn yet.*

### ⬆️ **Reactions [1..6] (Fast - Resolve Before Main Action)**
• **Timing:** Resolve **BEFORE** the incoming main action hits (speeds range from 1 to 6).
• **Speed Order:** **Higher numbers resolve FIRST** *(e.g. Protect ⬆️5 resolves before Upper Hand ⬆️3, which resolves before Quick Attack ⬆️1)*.
• **Examples by Speed:** Quick Attack / Water Shuriken (⬆️1), Extreme Speed (⬆️2), Upper Hand (⬆️3), King’s Shield (⬆️4), Protect (⬆️5), Evade / Clash maneuvers (⬆️6).
• **Preemption:** You **cannot** answer a higher reaction number with a lower reaction number.

### ⬇️ **Late Reactions [1..6] (Delayed - Resolve After Main Action)**
• **Timing:** Resolve **AFTER** the incoming main action hits (speeds range from 1 to 6, like enduring a blow to trigger a counter or trap).
• **Speed Order (Reverse):** **Higher numbers resolve LATER** *(e.g. Main Slash ➔ Late Reaction 1 Circle Throw ➔ Late Reaction 3 Shell Trap ➔ Late Reaction 4 Avalanche ➔ Late Reaction 5 Counter ➔ Late Reaction 6 Dragon Tail)*.
• **Examples by Speed:** Circle Throw / Feint (⬇️1), Shell Trap (⬇️3), Avalanche (⬇️4), Counter / Mirror Coat / Metal Burst (⬇️5), Dragon Tail / Roar / Whirlwind (⬇️6).
• **Interaction Rule:** You **CANNOT** use a standard Reaction (⬆️) against a Late Reaction (⬇️). Late Reactions can only be answered by another Late Reaction.
• **Late Reacting to a Reaction:** You **CAN** use a Late Reaction against a Reaction *(e.g. ⬆️1 Quick Attack ➔ Main Action ➔ ⬇️4 Avalanche)*.

---
### ⚠️ **Key Rules & Limitations**
1. **Action Cost:** Every Reaction or Late Reaction consumes **1 Action** from your pool for the Round (bound to the Multiple Action difficulty chart).
2. **1 Reaction per Turn:** You can use at most **one reaction per turn** (including enemy turns or your own turn when answering a reaction).
3. **No Reaction Without a Reason:** You cannot react without an incoming trigger/target attacking you *(e.g. in multi-battles, you cannot Quick Attack an enemy attacking an ally)*.
4. **Support Moves Exception:** Defensive support moves *(e.g. Wide Guard)* and intercept maneuvers *(e.g. Cover an Ally)* CAN be used to defend teammates.`
    },
    {
        id: 'pain-penalties',
        title: 'Pain Penalties',
        category: 'rules',
        categoryLabel: 'Combat & Rules',
        badge: 'Injury Penalty',
        summary: 'Thresholds for pain penalties (-1 success at <= half HP, -1 at 1 HP) and Will point negation.',
        keywords: [
            'pain penalties',
            'pain',
            'half hp',
            '1 hp',
            'penalty',
            'power through the pain',
            'will'
        ],
        broadcastText:
            'Pain Penalties:\n• <= Half HP: 1st Pain Penalty (-1 success to all rolls)\n• 1 HP: 2nd Pain Penalty (-1 additional success to all rolls)\n• Negate for scene by paying 1 Will Point (Power Through the Pain).',
        discordMarkdown: `## 🩸 **Pain Penalties**
• **1st Pain Penalty:** Triggered when reaching **<= Half Total HP**. Subtracts **1 success** from all Action Rolls.
• **2nd Pain Penalty:** Triggered when reaching **1 HP**. Subtracts an additional **1 success** (Total -2).
• *Can be negated for the rest of the scene by paying 1 Will Point (Power Through the Pain).*`
    },
    {
        id: 'lethal-damage',
        title: 'Lethal Damage (Optional Rule)',
        category: 'rules',
        categoryLabel: 'Combat & Rules',
        badge: 'Optional Rule',
        summary: 'Permanent death risk, bleeding out/unattended worsening (+1/hour), medical stabilization, and 2x potion costs.',
        keywords: [
            'lethal damage',
            'lethal',
            'death',
            'unconscious',
            'unattended',
            'stabilize',
            'potions',
            'league banned',
            'injuries'
        ],
        broadcastText:
            'Lethal Damage (Optional Rule):\n• Damage to unconscious characters becomes Lethal Damage. Some moves can also deal Lethal Damage directly.\n• Lethal Damage equal to Total HP = at risk of dying (1 more damage = Death!).\n• Left unattended: Suffers +1 Lethal Damage every hour until death or stabilized.\n• Healing: Requires 2 Potion Units per 1 Lethal Damage. Stabilized rest heals 1 Lethal Damage / 16 Hours.\n• Banned from official Pokémon League matches.',
        discordMarkdown: `## 💀 **Lethal Damage (Optional Rule)**
> *Used for darker tones or higher stakes to introduce the possibility of permanent death.*

• **Trigger:** If you or a Pokémon fall unconscious and keep receiving damage, that damage becomes **Lethal Damage**. Some Pokémon can also learn moves that deal Lethal Damage directly when used with lethal intent.
• **Risk of Dying & Death:** If you suffer Lethal Damage equal to your **Total HP**, you are at risk of dying. **1 more Damage and the character dies!**
• **Unattended Worsening:** If a character suffers 1+ lethal damage and is left unattended, they suffer **another lethal damage every hour** until their body can no longer hold on.
• **Healing & Medicine:** Requires **twice as much time and resources** to heal:
  - **Potions:** Requires **2 Potion Units** to heal 1 point of Lethal Damage (instead of 1 unit).
  - **Natural Recovery:** With medical care or wound stabilization, heals **1 Lethal Damage / 16 Hours** (instead of 8 hours).
• **Setting Note:** Banned from official Pokémon League matches; used by ruthless trainers or dangerous wild Pokémon.`
    },
    {
        id: 'trainer-actions',
        title: 'Trainer Actions (Area vs In the Fray)',
        category: 'rules',
        categoryLabel: 'Combat & Rules',
        badge: 'Action Economy',
        summary: 'Action economy for Giving Commands, Switching, Item usage, Entering the Fray, and Escaping.',
        keywords: [
            'trainer actions',
            'trainer area',
            'in the fray',
            'giving commands',
            'switching',
            'use item',
            'enter fray',
            'run away'
        ],
        broadcastText:
            'Trainer Actions:\n• Commands: Free (Area) / +1 Action Count (Fray)\n• Switch: 2x Free anytime, then Action on PKMN turn (Area) / Action on Turn (Fray)\n• Item: PKMN Turn (Area) / Your Turn (Fray)\n• Enter Fray: End of Round or Start of Battle (Area) / End of Round (Fray)\n• Search/Move into Cover: Action on Turn (Fray)\n• Run Away: End of Round Action',
        discordMarkdown: `## 🧢 **Trainer Actions (By Position)**
${formatDiscordTable(
    ['Action', 'In a Trainer Area', 'In the Fray'],
    TRAINER_ACTIONS_TABLE.map((t) => [t.action, t.trainerArea, t.inFray])
)}`
    },
    {
        id: 'cover-mechanics',
        title: 'Cover Mechanics & Defense Bonuses',
        category: 'rules',
        categoryLabel: 'Combat & Rules',
        badge: 'Tactical Defense',
        summary: 'Body coverage defense bonuses (1/4 to FULL) and protection against added attack effects.',
        keywords: [
            'cover',
            'body coverage',
            'defense bonus',
            'full cover',
            'cover table',
            'tactical'
        ],
        broadcastText:
            'Cover Bonuses:\n• 1/4 Coverage: +1 Def/Sp.Def vs Attacks (Takes added effects)\n• 1/2 Coverage: +2 Def/Sp.Def vs Attacks (Takes added effects)\n• 3/4 Coverage: +3 Def/Sp.Def vs Attacks (Takes added effects)\n• FULL Coverage: Cover must be destroyed first (Immune to added effects)',
        discordMarkdown: `## 🛡️ **Cover Mechanics & Defense Bonuses**
${formatDiscordTable(
    ['Body Coverage', 'Bonus Def / Sp.Def vs Attacks', 'Takes Added Effects'],
    COVER_TABLE.map((c) => [c.coverage, c.defBonus, c.addedEffects])
)}`
    },
    {
        id: 'healing-rates',
        title: 'Healing Rates (Natural & Potions)',
        category: 'rules',
        categoryLabel: 'Combat & Rules',
        badge: 'Recovery',
        summary: 'Natural recovery time vs Potion unit requirements for Regular and Lethal damage.',
        keywords: ['healing', 'rest', 'potions', 'regular damage', 'lethal damage', 'recovery time', 'hours'],
        broadcastText:
            'Healing Rates:\n• Regular Damage: 1 HP / 8 Hours resting | 1 HP / 1 Potion Unit\n• Lethal Damage: 1 HP / 16 Hours resting | 1 HP / 2 Potion Units',
        discordMarkdown: `## 💊 **Healing & Damage Recovery Rates**
${formatDiscordTable(
    ['Damage Type', 'Natural Healing (Rest)', 'Potion Units'],
    HEALING_TABLE.map((h) => [h.damageType, h.natural, h.potion])
)}`
    },
    {
        id: 'status-effects-all',
        title: 'Status Effects & Conditions Guide',
        category: 'status',
        categoryLabel: 'Status Effects',
        badge: 'All Statuses',
        summary: 'Comprehensive guide to Aggravating, Fixed, and Volatile status categories, stacking rules, cure items, and all individual status conditions.',
        keywords: [
            'status',
            'status effects',
            'status conditions',
            'ailments',
            'aggravating',
            'fixed',
            'volatile',
            'stacking',
            'full heal',
            'lum berry',
            'burn',
            '1st degree burn',
            '2nd degree burn',
            '3rd degree burn',
            'confused',
            'confusion',
            'disabled',
            'disable',
            'paralysis',
            'flinch',
            'flinched',
            'poison',
            'badly poisoned',
            'toxic',
            'frozen',
            'freeze',
            'in love',
            'sleep'
        ],
        broadcastText:
            'Status Categories & Rules:\n• Aggravating: Worsens over time if untreated (3rd Burn, Badly Poisoned).\n• Fixed: Constant effect; needs items/care to heal (1st/2nd Burn, Poison, Paralysis).\n• Volatile: Temporary; heals after time/switching out (Confused, Disabled, Flinch, Frozen, In Love, Sleep).\n• Stacking: Statuses stack! Inflicting burn/poison again bumps to next degree. Only Full Heal/Restore & Lum Berry cure multiple conditions at once.',
        discordMarkdown: `## 🧪 **Pokerole Status Ailments & Conditions**
> *Status conditions impair Pokémon and humans. They fall into three primary categories:*

### 📊 **Status Categories**
• **Aggravating:** The condition will worsen, dealing more damage over time if left untreated *(3rd Degree Burn, Badly Poisoned)*.
• **Fixed:** The condition remains as is; it does not worsen over time, but it does not heal on its own *(1st & 2nd Degree Burn, Poison, Paralysis)*.
• **Volatile:** The condition is temporary and can heal on its own after a few minutes or by switching out *(Confused, Sleep, Flinched, Disabled, In Love, Frozen)*.

> ⚠️ **Status Stacking & Curing:**
> • Statuses **can stack** (e.g. Asleep + Poisoned + Confused at once). Re-inflicting Burn or Poison bumps it to the next degree!
> • **Only Full Heal, Full Restore, and Lum Berry** cure more than one condition at a time.
> • Official League matches may enforce single-condition or sleep clauses.

---
### 📋 **Individual Status Reference**
${STATUS_EFFECTS_DATA.map(
    (s) => `#### **${s.name}** [${s.badge} | ${s.categoryType}]
• **Effect:** ${s.effect}
• **Resist / Cure:** ${s.resist}
• **Duration:** ${s.duration}`
).join('\n\n')}`
    },
    {
        id: 'weather-conditions-all',
        title: 'Weather Conditions Reference',
        category: 'weather',
        categoryLabel: 'Weather & Environment',
        badge: 'Weather',
        summary: 'Sunny, Rain, Sandstorm, Snowy, Hail, Desolate Weather, Typhoon, Strong Winds.',
        keywords: [
            'weather',
            'sunny',
            'rain',
            'sandstorm',
            'snowy',
            'snow',
            'hail',
            'desolate weather',
            'typhoon',
            'strong winds',
            'harsh sunlight',
            'heavy rain',
            'weather effects'
        ],
        broadcastText:
            'Weather:\n• Sunny: +1 Fire Pwr, -1 Water Dmg, No Freeze\n• Rain: +1 Water Pwr, -1 Fire Dmg, No 2nd/3rd Burn\n• Sandstorm: 1 Typeless dmg to non Rock/Grd/Stl, +1 SpD Rock\n• Snowy: +1 Ice Pwr, +1 Def Ice, +1 Freeze chance\n• Hail: 1 dmg to non-Ice, +1 Freeze chance\n• Desolate: +2 Fire Pwr, Water banned, Vit check or 2 fire dmg\n• Typhoon: +2 Water Pwr, Fire banned, Vit check or 2 water dmg\n• Strong Winds: +2 Flying Dmg, Neutral weaknesses, Dex check or 2 typeless dmg',
        discordMarkdown: `## ☀️ **Battlefield Weather Conditions**
${WEATHER_CONDITIONS_DATA.map(
    (w) => `### **${w.name}** [${w.badge}]
${w.effects.map((e) => `• ${e}`).join('\n')}`
).join('\n\n')}`
    },
    {
        id: 'environmental-hazards-all',
        title: 'Environmental Hazards & Battlefield Conditions',
        category: 'weather',
        categoryLabel: 'Weather & Environment',
        badge: 'Hazards',
        summary: 'Fog, Muddy, Underwater, On Fire, Electric Poles, Lovely Flowers, Sewers, Jungle, High Poles, Sprinklers, Cemetery, Minefield, Healing Pits, Torn World, Final Destination.',
        keywords: [
            'environment',
            'hazards',
            'fog',
            'muddy',
            'underwater',
            'on fire',
            'electric poles',
            'flowers',
            'sewers',
            'jungle',
            'high poles',
            'sprinklers',
            'pkmn cemetery',
            'cemetery',
            'semantary',
            'minefield',
            'healing pits',
            'torn world',
            'final destination'
        ],
        broadcastText:
            'Hazards: Fog (-1 Acc), Muddy (Blocked, -1 Dex), Underwater (Vit roll or faint), On Fire (3 Chance dice 2nd Burn), Electric Poles (+1 Elec dmg), Flowers (-2 Dmg, no evade), Sewers (3 Chance dice Poison), Jungle (+2 Nature/Stealth), High Poles (Dex+Athletic or 2 dmg), Sprinklers (Water type), PKMN Cemetery (+2 Intimidate, Run Away), Minefield (1 entry dmg), Healing Pits (+1 HP), Torn World (random target), Final Destination (No items/evasion/clash).',
        discordMarkdown: `## 🌋 **Environmental Hazards & Conditions**
${formatDiscordTable(
    ['Condition', 'Battlefield Effect'],
    ENVIRONMENTAL_HAZARDS_DATA.map((h) => [h.name, h.effect])
)}`
    },
    {
        id: 'catching-mechanics',
        title: 'Catching Pokémon Rules & Calculator',
        category: 'catching',
        categoryLabel: 'Catching & Training',
        badge: 'Catching',
        summary: 'Seal Potency dice, HP bonuses, Status bonuses, and Target Success requirements by Rank.',
        keywords: [
            'catching',
            'pokeball',
            'greatball',
            'ultraball',
            'seal potency',
            'capture',
            'wild pokemon',
            'catch roll',
            'status bonus'
        ],
        broadcastText:
            'Catching Formula: Seal Potency Dice + Bonus Successes vs Required Successes.\nBalls: Poké (4d), Great (6d), Ultra (8d), Custom (Up to 9d)\nBonuses: Half HP (+1), 1 HP (+2), Status Ailment (+1 per status)\nRequired: Starter (3), Rookie (4), Standard (6), Advanced (8), Expert (9), Ace (10)',
        discordMarkdown: `## 🔴 **Catching Pokémon Rules**
> **Formula:** \`Seal Potency Dice Roll + Bonus Successes\` >= \`Required Successes\`

**Pokéballs (Seal Potency):**
${formatDiscordTable(
    ['Item', 'Seal Potency'],
    CATCH_BALLS_TABLE.map((b) => [b.item, b.sealPotency])
)}

**Wild Pokémon Condition Bonuses:**
${formatDiscordTable(
    ['Condition', 'Bonus'],
    CATCH_CONDITIONS_TABLE.map((c) => [c.condition, c.bonus])
)}

**Wild Pokémon Target Successes:**
${formatDiscordTable(
    ['Wild Rank', 'Required Successes'],
    CATCH_RANKS_TABLE.map((r) => [r.rank, r.required])
)}`
    },
    {
        id: 'training-points-guide',
        title: 'Training Points (TP), Sessions & Spending',
        category: 'training',
        categoryLabel: 'Catching & Training',
        badge: 'Progression',
        summary: 'Battle TP calculation, 2-hour daily training sessions, Rank Up costs, Evolution, and Move learning.',
        keywords: [
            'tp',
            'training points',
            'training session',
            'rank up',
            'retraining',
            'evolution',
            'learn moves',
            'evolution speed',
            'overrank'
        ],
        broadcastText:
            'TP Rewards:\n• Battle TP: Rank diff (0-3 TP) + Win (+2) + Outnumbered (+2) + Fainted (+1)\n• Training: 2 hr/day. Trainer rolls difficulty roll -> PKMN gets TP = Trainer successes!\n• Rank Up TP: Starter->Rookie (5), Rookie->Std (15), Std->Adv (25), Adv->Exp (30), Exp->Ace (35), Ace->Master (40), Master->Champ (50)\n• Evolve: Fast (10), Medium (30), Slow (50)',
        discordMarkdown: `## 📈 **Training Points (TP) & Progression**
**Battle TP Rewards:**
${formatDiscordTable(
    ['After a Battle...', 'TP Earned'],
    BATTLE_TP_TABLE.map((b) => [b.circumstance, b.tp])
)}

**Daily Training Session (2 Hours):**
${TRAINING_SESSION_RULES.map((r) => `• ${r}`).join('\n')}

**Rank Up & Retraining Costs:**
${formatDiscordTable(
    ['Rank', 'TP to Next Rank', 'Retraining'],
    RANK_UP_TP_TABLE.map((r) => [r.rank, r.tpNextRank, r.retraining])
)}

**Evolution Costs:**
${formatDiscordTable(
    ['Evolution Speed', 'TP to Evolve'],
    EVOLUTION_TP_TABLE.map((e) => [e.speed, e.tp])
)}

**Learning Moves Costs:**
${formatDiscordTable(
    ['Stage', 'Current Rank Move', 'Prior Rank Move', 'Pre-Evo Move', 'TM', 'Overrank Move'],
    LEARN_MOVES_TP_TABLE.map((l) => [l.stage, l.currentRank, l.priorRank, l.preEvo, l.tm, l.overrank])
)}`
    },
    {
        id: 'rank-summary-table',
        title: 'Rank Summary & Attribute/Skill Caps',
        category: 'balance',
        categoryLabel: 'Ranks & Balance',
        badge: 'Balance Matrix',
        summary: 'Max Targets, Skill Maximums, Attribute Points, Skill Points, and All Foes Target Max by Rank.',
        keywords: [
            'rank summary',
            'skill max',
            'attribute points',
            'skill points',
            'max targets',
            'all foes',
            'starter',
            'rookie',
            'standard',
            'advanced',
            'expert',
            'ace',
            'master',
            'champion'
        ],
        broadcastText:
            'Rank Summary:\nStarter (1 tgt, max skill 1, 0 attr, 5 sk)\nRookie (2 tgt, max skill 2, 2 attr, 10 sk)\nStandard (3 tgt, max skill 3, 4 attr, 14 sk)\nAdvanced (4 tgt, max skill 4, 6 attr, 17 sk)\nExpert (5 tgt, max skill 5, 8 attr, 19 sk)\nAce (6 tgt, max skill 5, 10 attr, 20 sk)\nMaster (8 tgt, max skill 5, 10 attr, 22 sk)\nChampion (10 tgt, max skill 5, 14 attr, 25 sk)',
        discordMarkdown: `## 🏆 **Pokerole Rank Summary Table**
${formatDiscordTable(
    ['Rank', 'Max Targets', 'Skill Max', 'Attribute Pts', 'Skill Pts', 'All Foes Max'],
    RANK_SUMMARY_TABLE.map((r) => [
        r.rank,
        String(r.maxTargets),
        String(r.skillMax),
        String(r.attrPoints),
        String(r.skillPoints),
        String(r.allFoesMax)
    ])
)}`
    },
    {
        id: 'encounter-balancing-chart',
        title: 'Encounter Balancing Difficulty Matrix',
        category: 'balance',
        categoryLabel: 'Ranks & Balance',
        badge: 'GM Tool',
        summary: 'Encounter difficulty assessment based on damage effectiveness and target rank differential.',
        keywords: [
            'encounter balancing',
            'encounter difficulty',
            'balance',
            'effortless',
            'too easy',
            'easy',
            'normal',
            'challenging',
            'hard',
            'very hard',
            'extreme',
            'super effective',
            'not very effective'
        ],
        broadcastText:
            'Encounter Balance (Foe Damage vs Rank Differential):\n• Extremely Effective (+2 dmg): Lower (Effortless), Same (Too Easy), +1 Rank (Easy), +2 Ranks (Normal)\n• Super Effective (+1 dmg): Lower (Too Easy), Same (Easy), +1 Rank (Normal), +2 Ranks (Challenging)\n• Neutral: Lower (Easy), Same (Normal), +1 Rank (Challenging), +2 Ranks (Hard)\n• Not-Very Effective (-1 dmg): Lower (Normal), Same (Challenging), +1 Rank (Hard), +2 Ranks (Very Hard)\n• Barely Effective (-2 dmg): Lower (Challenging), Same (Hard), +1 Rank (Very Hard), +2 Ranks (Extreme)\n• Immune: Lower (Hard), Same (Very Hard), +1 Rank (Extreme), +2 Ranks (Punishing)',
        discordMarkdown: `## ⚖️ **Encounter Balancing Difficulty Matrix**
> *Estimate encounter challenge rating based on move effectiveness and foe rank differential.*

${formatDiscordTable(
    ['Foe Receives Damage', 'Lower Rank', 'Same Rank', 'One Rank Higher', 'Two + Ranks Higher'],
    ENCOUNTER_BALANCE_TABLE.map((e) => [e.effectiveness, e.lower, e.same, e.oneHigher, e.twoHigher])
)}`
    },
    {
        id: 'type-matchup-chart',
        title: 'Type Matchup & Effectiveness Chart',
        category: 'types',
        categoryLabel: 'Type Matchups',
        badge: 'Type Chart',
        summary: 'All 18 Pokémon type weaknesses, resistances, and immunities with interactive filter.',
        keywords: [
            'types',
            'type matchups',
            'weakness',
            'resistance',
            'immunity',
            'super effective',
            'normal',
            'fire',
            'water',
            'electric',
            'grass',
            'ice',
            'fighting',
            'poison',
            'ground',
            'flying',
            'psychic',
            'bug',
            'rock',
            'ghost',
            'dragon',
            'dark',
            'steel',
            'fairy',
            'stellar'
        ],
        broadcastText:
            'Type Matchups: Check resistances and weaknesses for all 18 Pokémon types.',
        discordMarkdown: `## 🛡️ **Type Matchup & Resistance Reference**
• **Normal:** Weak to Fighting. Immune to Ghost.
• **Fire:** Resists Fire, Grass, Ice, Bug, Steel, Fairy. Weak to Water, Ground, Rock.
• **Water:** Resists Fire, Water, Ice, Steel. Weak to Electric, Grass.
• **Electric:** Resists Electric, Flying, Steel. Weak to Ground.
• **Grass:** Resists Water, Electric, Grass, Ground. Weak to Fire, Ice, Poison, Flying, Bug.
• **Ice:** Resists Ice. Weak to Fire, Fighting, Rock, Steel.
• **Fighting:** Resists Bug, Rock, Dark. Weak to Flying, Psychic, Fairy.
• **Poison:** Resists Grass, Fighting, Poison, Bug, Fairy. Weak to Ground, Psychic.
• **Ground:** Resists Poison, Rock. Immune to Electric. Weak to Water, Grass, Ice.
• **Flying:** Resists Grass, Fighting, Bug. Immune to Ground. Weak to Electric, Ice, Rock.
• **Psychic:** Resists Fighting, Psychic. Weak to Bug, Ghost, Dark.
• **Bug:** Resists Grass, Fighting, Ground. Weak to Fire, Flying, Rock.
• **Rock:** Resists Normal, Fire, Poison, Flying. Weak to Water, Grass, Fighting, Ground, Steel.
• **Ghost:** Resists Poison, Bug. Immune to Normal, Fighting. Weak to Ghost, Dark.
• **Dragon:** Resists Fire, Water, Electric, Grass. Weak to Ice, Dragon, Fairy.
• **Dark:** Resists Ghost, Dark. Immune to Psychic. Weak to Fighting, Bug, Fairy.
• **Steel:** Resists Normal, Grass, Ice, Flying, Psychic, Bug, Rock, Dragon, Steel, Fairy. Immune to Poison. Weak to Fire, Fighting, Ground.
• **Fairy:** Resists Fighting, Bug, Dark. Immune to Dragon. Weak to Poison, Steel.`
    }
];
