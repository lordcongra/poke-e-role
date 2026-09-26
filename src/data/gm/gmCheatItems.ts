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
import {
    TRAINER_ACTIONS_TABLE
} from './gmTrainerData';
import {
    CORE_MANEUVERS_DATA,
    formatManeuverBroadcast
} from './gmManeuversData';
import {
    PMD_BAG_CAPACITY_TABLE,
    PMD_ITEM_WEIGHT_TABLE
} from './gmHomebrewData';
import {
    RANGER_STYLERS
} from './gmRangersData';
import {
    STRENGTH_LIFTING_CHART,
    DEXTERITY_SPEED_CHART
} from './gmAttributeBenchmarksData';
import {
    FLING_DAMAGE_TABLE,
    ENVIRONMENT_POWER_TABLE
} from './gmMoveClarificationsData';

export interface GmCheatItem {
    id: string;
    title: string;
    category:
        | 'rules'
        | 'trainer'
        | 'maneuvers'
        | 'environment'
        | 'progression'
        | 'homebrew';
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
        id: 'attribute-benchmarks-lifting-speed',
        title: 'Attribute Benchmarks: Strength & Dexterity',
        category: 'rules',
        categoryLabel: 'Combat & Rules',
        badge: 'Narrative Charts',
        summary: 'Narrative benchmarks for maximum lifting capacity (Strength, 40 to 1500 lbs) and top running speed (Dexterity, 6 to 99 mph) for humans and Pokémon.',
        keywords: [
            'strength',
            'lifting',
            'capacity',
            'weight',
            'dexterity',
            'speed',
            'mph',
            'kmph',
            'km/h',
            'athletic',
            'carrying',
            'benchmarks',
            'running',
            'crawl',
            'walk',
            'narrative',
            'lbs',
            'kg'
        ],
        broadcastText:
            'Strength & Dexterity Narrative Benchmarks:\n' +
            '• Strength Lifting Capacity:\n' +
            STRENGTH_LIFTING_CHART.map((s) => `  ${s.score} dots: ${s.valueImperial} (${s.valueMetric})`).join('\n') +
            '\n  * Each Athletic point adds 8 lb / 4 kg. Reduced by Pain Penalties.\n\n' +
            '• Dexterity Top Speed:\n' +
            DEXTERITY_SPEED_CHART.map((d) => `  ${d.score} dots: ${d.valueImperial} (${d.valueMetric})`).join('\n') +
            '\n  * Each Athletic point adds 1.4 mph / 2 km/h. At Half HP walk only, at 1 HP crawl only. Carrying weight halves speed unless lifting 2x weight.',
        discordMarkdown: `## 🏋️‍♂️ **Attribute Benchmarks: Lifting & Speed**
> *Narrative guidelines for humans and most Pokémon. Storytellers may adjust for specific species sizes and physiologies.*

### **Strength: Narrative Lifting Capacity**
${formatDiscordTable(
    ['Score', 'Rating', 'Imperial (lb)', 'Metric (kg)'],
    STRENGTH_LIFTING_CHART.map((s) => [String(s.score), s.dots, s.valueImperial, s.valueMetric])
)}
• **Athletic Skill:** Each point in your Athletic Skill adds **8 lb / 4 kg** to your Lifting Capacity.
• **Pain Penalties:** Lifting Capacity is reduced by Pain Penalties.

---

### **Dexterity: Narrative Maximum Speed**
${formatDiscordTable(
    ['Score', 'Rating', 'Imperial (mph)', 'Metric (km/h)'],
    DEXTERITY_SPEED_CHART.map((d) => [String(d.score), d.dots, d.valueImperial, d.valueMetric])
)}
• **Athletic Skill:** Each point in your Athletic Skill adds **1.4 mph / 2 km/h** to your maximum speed.
• **Pain Penalties:** At **Half HP** you can only walk; at **1 HP** remaining you can only crawl.
• **Carrying Weight:** Lifting someone or something **halves your Speed**, unless you can lift twice the weight of what you are carrying.`
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
        title: 'Will Points (Spending, Recovery & Rolling)',
        category: 'rules',
        categoryLabel: 'Combat & Rules',
        badge: 'Core Mechanic',
        summary: 'Power Through Pain, Take Your Chances, Pushing Fate, recovery conditions, and rolling Max Will Stat vs. spendable Will Points.',
        keywords: [
            'will',
            'will points',
            'power through the pain',
            'take your chances',
            'pushing fate',
            'faint',
            'reroll',
            're-roll',
            'will recovery',
            'rolling will',
            'max will',
            'will score'
        ],
        broadcastText:
            'Will Points Spending & Rolling:\n• Power Through Pain: Ignore 1 Pain Penalty for scene\n• Take Your Chances: Reroll 1 failure from all Action Rolls this round\n• Pushing Fate: +1 Success to a single roll (not dmg/chance)\n⚠️ Cannot use Take Your Chances & Pushing Fate in same round! Spending all Will causes fainting at scene end.\n• Rolling Will: When an Action Roll requires rolling "Will" (such as mental resistance, withstanding terror, social resilience, or special checks), roll your MAXIMUM Will Score (Insight + Rank/Bonus), NOT your remaining Will Points!',
        discordMarkdown: `## 🌟 **Will Points: Spending & Recovery**
**Spending Will:**
• **Power Through the Pain:** Spend **1 Will** to ignore one Pain Penalty for the rest of the scene.
• **Take Your Chances:** Spend **1 Will** to re-roll one unsuccessful die from all Action Rolls this round.
• **Pushing Fate:** Spend **1 Will** to add one automatic success to a single roll *(Does not work for Damage or Chance rolls)*.

> ⚠️ **Important Rules:**
> • In a single round, you may only use *Take Your Chances* OR *Pushing Fate*—you cannot use both in the same round!
> • Spending all your Will Points in a scene causes that character to **faint** at the end of the scene!

> 🎲 **Rolling Will (Stat vs. Resource Pool):**
> Whenever an Action Roll requires rolling **"Will"** (such as mental resistance, withstanding terror, social resilience, or special checks), roll your **Maximum Will Score** dice pool (\`Insight + Rank/Bonus\`), **not** your currently remaining Will Points. Will Points are a spendable resource, while the Max Will score is your attribute dice pool.

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
        summary: 'Step-by-step combat order: Initiative, Action Turns, Round End, Trainer Turns, and Optimal Switching.',
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
            'ability',
            'switching',
            'replacing fainted'
        ],
        broadcastText:
            'Combat Flow:\n1. Combat Starts: Roll Initiative (1d6+Dex+Alert) for Pokémon & Trainers in the Fray; declare Abilities & Weather/Terrain.\n2. Round Starts: Take turns in init order (Action or Pass). Max 5 actions. Trainers in Area command & act on Pokémon turns.\n3. Round Ends: When all pass. Trainers not in the fray take their turn. (Optimal time to switch Pokémon or deploy fainted replacements without mid-round lockout!).\n4. Next Round: Reset action counts and repeat.',
        discordMarkdown: `## ⚔️ **Pokerole Combat Flow**
1. **Combat Starts!** Roll Initiative for each combatant: \`1d6 + Dexterity + Alert\`
   • Trainers *In the Fray* roll initiative alongside Pokémon (Trainers in the Trainer Area do not roll initiative).
   • Each Pokémon declares which Ability is active.
   • Storyteller announces active Weather and Terrain effects.
2. **Round Starts!** Take turns in initiative order. On each Pokémon's turn:
   • Use a Move or another action.
   • Choose to Pass and do nothing (Mandatory pass if 5 actions already taken this round).
   • Trainers in the Trainer Area issue commands and take trainer actions during their Pokémon’s turn.
3. **Round Ends!** When every Pokémon in Initiative order Passes, the round ends.
   • Trainers who are *not In the Fray* may now take their dedicated Trainer turn.
   • **Optimal Switching Window:** Switching mid-round causes the new Pokémon to forfeit all actions until next round. The end of the round is the ideal time to switch or send out fainted replacements!
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
        id: 'move-clarifications-core',
        title: 'Move Clarifications: Core Moves & Mechanics',
        category: 'rules',
        categoryLabel: 'Combat & Rules',
        badge: 'Core Clarifications',
        summary: 'Official core clarifications for Encore, Fling, Hidden Power (Unown), Nature/Secret Power, Natural Gift, Snatch, Substitute Decoys, and Narrative Move use.',
        keywords: [
            'moves',
            'move clarifications',
            'clarifications',
            'encore',
            'fling',
            'held item',
            'berries',
            'natural gift',
            'nature power',
            'secret power',
            'snatch',
            'substitute',
            'decoy',
            'shed tail',
            'unown',
            'hidden power',
            'narrative',
            'creative moves',
            'odor sleuth',
            'reflect'
        ],
        broadcastText:
            'Move Clarifications:\n' +
            '• Encore: Repeats exact action sequence with same targets. Failed evasion repeats even if unattacked; clash repeats as pretend-clash. 1 round cooldown after.\n' +
            '• Fling: Throws held item: Common Berry (+1 die), Uncommon (+2 dice), Rare (+3 dice), Held Item (+4 dice). Lost for battle unless retrieved or stolen.\n' +
            '• Hidden Power: Unown sole movepool exception—can repeat Hidden Power multiple times in same round without penalty.\n' +
            '• Nature & Secret Power: Nature Power matches environmental energy/terrain type. Secret Power stays Normal type and inflicts environmental status (e.g. Water = -2 Strength). Free choice if multiple sources.\n' +
            '• Natural Gift: Changes Move Type based on berry flavor (Bitter=Dark, Dry=Ground, Effervescent=Flying, Fresh=Grass, Frozen=Ice, Half-eaten=Bug, Juicy=Water, Numbing=Psychic, Oily=Fight, Rotten=Poison, Salty=Steel, Spicy=Fire, Sour=Electric, Sugary=Fairy, Tough=Rock, Uneatable=Dragon, Withered=Ghost).\n' +
            '• Snatch: Steals target buffs/debuffs (resets target), Shield moves, Healing moves, Substitute Decoys, and field hazards/terrains/tailwind. Cannot snatch Z-Moves or Max Moves.\n' +
            '• Substitute Decoys: Costs 2 HP, creates 2 HP decoy with user defenses. Only Physical/Special attacks hit decoy; ignores added/support effects. Hazards & ongoing poison bypass to user directly.\n' +
            '• Narrative Moves: Creative non-combat problem solving (Odor Sleuth tracking, Keen Eye aerial scouting, Reflect floating bridges, Electric powering machinery).',
        discordMarkdown: `## 📖 **Pokerole Core Move Clarifications**
> *Official rules clarifications from the Pokerole Corebook for nuanced moves, environmental interactions, and creative narrative usage.*

---

### 🔁 **Encore**
*Added Effect: Target repeats exact same action sequence from previous round with identical targets. Duration 1 round. If used on previous round, this Move fails.*
• **Target Lock:** Repeats actions against same targets. Only if original target is removed can they pick another.
• **Reactions & Clashes:** If a failed Evasion occurred, repeats a failed Evasion even if no one attacks! If a Clash occurred, performs a pretend-clash if no attack is incoming.
• **Turn Order:** If the target acted before Encore was cast, it only repeats its remaining prior actions until depleted. Once ended, user must wait 1 Round before reusing.

---

### 🎒 **Fling (Held Item Damage)**
*Pokémon throws held item as weapon. Item lost for remainder of combat unless an action is spent to retrieve it.*
${formatDiscordTable(
    ['Held Item Category', 'Bonus Damage Dice'],
    FLING_DAMAGE_TABLE.map((f) => [f.itemType, f.extraDice])
)}

---

### 👁️ **Hidden Power (#201 Unown Exception)**
• Because Unown’s entire Move pool consists solely of **Hidden Power**, Unown is uniquely able to **repeat Hidden Power several times in the same Round** without penalty.

---

### 🌿 **Nature Power & Secret Power**
• **Nature Power:** Changes its Type to match the environment or Active Terrain.
• **Secret Power:** Remains Normal-type, but inflicts the environmental Status Ailment/Condition below.
• **Multiple Energy Sources:** If multiple environments apply (e.g. snowy mountain building with Psychic Terrain), Trainer/Pokémon chooses which energy to align to.

${formatDiscordTable(
    ['Environment / Terrain', 'Energy Type', 'Secret Power Status Effect'],
    ENVIRONMENT_POWER_TABLE.map((e) => [e.environment, e.energyType, e.statusAilment])
)}

---

### 🍓 **Natural Gift (Berry Flavors & Types)**
*Natural Gift changes its Move Type according to the flavor of the berry eaten or held.*
${formatDiscordTable(
    ['Flavor', 'Type', 'Flavor', 'Type'],
    [
        ['Bitter', 'Dark', 'Rotten', 'Poison'],
        ['Dry', 'Ground', 'Salty', 'Steel'],
        ['Effervescent', 'Flying', 'Spicy', 'Fire'],
        ['Fresh', 'Grass', 'Sour', 'Electric'],
        ['Frozen', 'Ice', 'Sugary', 'Fairy'],
        ['Half-eaten', 'Bug', 'Tough', 'Rock'],
        ['Juicy', 'Water', 'Uneatable', 'Dragon'],
        ['Numbing', 'Psychic', 'Withered', 'Ghost'],
        ['Oily', 'Fight', '—', '—']
    ]
)}

---

### 🧤 **Snatch (Effect Theft)**
• **Buffs & Debuffs:** User steals all buffs and debuffs; target’s Attributes and Traits reset.
• **Shield & Healing Moves:** If target is using or targeted by a Shield or Healing move, effect applies to user instead.
• **Substitute Decoys:** Transferred to user (adopts user defenses, keeps current decoy HP).
• **Side-of-Field Effects:** Transfers Force Fields, Entry Hazards, Terrains, Tailwind, etc., to user’s side (duration unchanged).
• **Restrictions:** Cannot Snatch from Z-Moves, Max Moves, or if target already used Snatch that round.

---

### 🛡️ **Substitute Decoys (Substitute & Shed Tail)**
• **Cost & HP:** Costs **2 HP** to cast; creates a Decoy with **2 HP**.
• **Defenses:** Inherits user's exact Defense & Special Defense at moment of casting (including buffs/debuffs).
• **Protection:** All Physical & Special attacks target decoy. **Added effects do NOT apply to decoy or user.**
• **Support Moves:** Support moves do not affect the decoy or the user.
• **Bypasses:** Hazards (Sandstorm 1 dmg) and ongoing poison still hit user directly at round end. Decoys cannot be healed or buffed.
• **Tactics:** Decoys can receive **Cover**, and user Shield Moves can reduce incoming decoy damage.

---

### 🎭 **Narrative Approaches to Moves**
• **Odor Sleuth:** Track suspects and scent trails across the city or wilderness.
• **Keen Eye:** Scout ahead from the skies to spot ambushers or terrain features.
• **Reflect / Light Screen:** Form temporary invisible bridges over ravines or emergency barricades.
• **Electric Moves:** Jump-start generators, recharge drained batteries, or short-circuit security doors.
• **Vine Whip:** Anchor precarious platforms, tether falling allies, or swing across gaps.`
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

> **In Love Status Condition (Storyteller Discretion):**
> When a Pokémon is **In Love**, they are trying to earn their beloved's favor. At the Storyteller's discretion, this can mean dealing **Half Damage**, or applying **all Holding Back options** (forfeiting poison/added effects and critical hits)—because landing a critical hit or poisoning your crush is definitely not going to win you any dates (huge red flag!).
> *Can attack at full power by succeeding on a Loyalty or Insight roll (3+ successes).*`
    },
    {
        id: 'reactions-late-reactions',
        title: 'Reactions & Late Reactions',
        category: 'rules',
        categoryLabel: 'Combat & Rules',
        badge: 'Priority & Timing',
        summary: 'Reactions (↑) resolve BEFORE incoming actions (highest speed first). Late Reactions (↓) resolve AFTER incoming actions (lowest speed first).',
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
            'Reactions & Late Reactions:\n• Reactions (↑): Instant movements used when it’s not your turn. Resolve BEFORE the incoming action hits. Higher numbers resolve FIRST (e.g. Extreme Speed ↑2 resolves before Quick Attack ↑1).\n• Late Reactions (↓): Retaliations/traps that resolve AFTER the incoming action hits. Higher numbers resolve LATER (Lower numbers resolve first: Main Action ➔ Avalanche ↓4 ➔ Dragon Tail ↓6).\n• Interactivity: You CANNOT react (↑) to a Late Reaction (↓), but you CAN Late React (↓) to a Reaction (↑).\n• Action Cost: Rolling any Reaction or Late Reaction consumes 1 Action for the Round (bound to Multi-Action chart). Max 1 reaction per turn.\n• Trigger Rule: Cannot use a reaction without an incoming trigger/target (support moves like Wide Guard / Cover an Ally can protect allies).',
        discordMarkdown: `## ⚡ **Reactions & Late Reactions**
> *Reactions are fast, tactical maneuvers and moves used when it is not your turn yet.*

### ↑ **Reactions [1..6] (Fast - Resolve Before Main Action)**
• **Timing:** Resolve **BEFORE** the incoming main action hits (speeds range from 1 to 6).
• **Speed Order:** **Higher numbers resolve FIRST** *(e.g. Protect ↑5 resolves before Upper Hand ↑3, which resolves before Quick Attack ↑1)*.
• **Examples by Speed:** Quick Attack / Water Shuriken (↑1), Extreme Speed (↑2), Upper Hand (↑3), King’s Shield (↑4), Protect (↑5), Evade / Clash maneuvers (↑6).
• **Preemption:** You **cannot** answer a higher reaction number with a lower reaction number.

### ↓ **Late Reactions [1..6] (Delayed - Resolve After Main Action)**
• **Timing:** Resolve **AFTER** the incoming main action hits (speeds range from 1 to 6, like enduring a blow to trigger a counter or trap).
• **Speed Order (Reverse):** **Higher numbers resolve LATER** *(e.g. Main Slash ➔ Late Reaction 1 Circle Throw ➔ Late Reaction 3 Shell Trap ➔ Late Reaction 4 Avalanche ➔ Late Reaction 5 Counter ➔ Late Reaction 6 Dragon Tail)*.
• **Examples by Speed:** Circle Throw / Feint (↓1), Shell Trap (↓3), Avalanche (↓4), Counter / Mirror Coat / Metal Burst (↓5), Dragon Tail / Roar / Whirlwind (↓6).
• **Interaction Rule:** You **CANNOT** use a standard Reaction (↑) against a Late Reaction (↓). Late Reactions can only be answered by another Late Reaction.
• **Late Reacting to a Reaction:** You **CAN** use a Late Reaction against a Reaction *(e.g. ↑1 Quick Attack ➔ Main Action ➔ ↓4 Avalanche)*.

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
    // TRAINER RULES CATEGORY
    {
        id: 'trainer-actions-table',
        title: 'Trainer Action Economy & Limits',
        category: 'trainer',
        categoryLabel: 'Trainer Rules',
        badge: 'Action Economy',
        summary: 'Actions available to trainers inside the Trainer Area vs In the Fray, and the 5 Actions per Round limit.',
        keywords: [
            'trainer actions',
            'trainer area',
            'in the fray',
            'action economy',
            'action limit',
            '5 actions',
            'cover',
            'run away'
        ],
        broadcastText:
            'Trainer Actions (Area vs Fray):\n• Giving Commands: Free (Area) / +1 Action Count (Fray)\n• Switching Pokémon: Twice Free then Action (Area) / Action on your turn (Fray)\n• Use an Item: Action on Pokémon’s turn (Area) / Action on your turn (Fray)\n• Enter the Fray: End of Round or Battle Start\n• Search / Move to Cover: Action on your turn (Fray only)\n• Run Away: End of Round Action\n(Trainers can take up to 5 Actions per Round, bound to Multiple Action Difficulty).',
        discordMarkdown: `## 🧢 **Trainer Actions (By Position)**
${formatDiscordTable(
    ['Action', 'In a Trainer Area', 'In the Fray'],
    TRAINER_ACTIONS_TABLE.map((t) => [t.action, t.trainerArea, t.inFray])
)}

> ℹ️ **Action Economy Limit:** Just like Pokémon, a Trainer can take up to **5 Actions per Round** (bound to the Multiple Action Difficulty chart).`
    },
    {
        id: 'trainer-initiative',
        title: 'Trainer Initiative & Turn Structure',
        category: 'trainer',
        categoryLabel: 'Trainer Rules',
        badge: 'Turn Timing',
        summary: 'In the Fray (rolls 1d6 + Dex + Alert) vs Trainer Area (acts on Pokémon turns + dedicated round-end turn).',
        keywords: [
            'trainer initiative',
            'turn structure',
            'turn timing',
            'in the fray',
            'trainer area',
            'end of round',
            '5 actions'
        ],
        broadcastText:
            'Trainer Initiative & Turn Timing:\n• In the Fray: Rolls Initiative (1d6 + Dexterity + Alert) alongside Pokémon and acts on their specific initiative step.\n• Trainer Area: Does NOT roll initiative. Instead, acts during each Pokémon’s turn, and also gets a dedicated Trainer turn right before the end of the round.\n• 5 Actions Max: Can take up to 5 Actions per Round (bound to Multiple Action Difficulty).',
        discordMarkdown: `## ⏱️ **Trainer Initiative & Turn Structure**
• **In the Fray:** The Trainer rolls Initiative (\`1d6 + Dexterity + Alert\`) alongside the Pokémon and takes their turn on their specific initiative step.
• **Inside the Trainer Area:** The Trainer does **NOT** roll initiative. Instead, they can take an action during each of their Pokémon’s turns, and also receive a dedicated Trainer turn right before the end of the round.
• **5 Actions per Round:** Just like Pokémon, a Trainer can take up to 5 Actions per Round (bound to the Multiple Action Difficulty chart).`
    },
    {
        id: 'trainer-commanding',
        title: 'Commanding Pokémon in Battle',
        category: 'trainer',
        categoryLabel: 'Trainer Rules',
        badge: 'Commands',
        summary: 'Commands happen on Pokémon’s turn (RAW costs 1 action in fray, free in area; some homebrew as free).',
        keywords: [
            'commanding',
            'commands',
            'order',
            'pokemon turn',
            'trainer turn',
            'action cost',
            'fray',
            'uncommanded',
            'instinct'
        ],
        broadcastText:
            'Commanding Pokémon in Battle:\n• Commands happen on Pokémon’s Turn: Verbal or gestural commands are issued during the Pokémon’s turn, NOT on the Trainer’s turn.\n• No Direct Attacks on Trainer Turn: A Trainer cannot spend a Trainer Action on their own turn to make a Pokémon attack immediately.\n• Action Cost (RAW): Free Action in the Trainer Area. In the Fray, RAW states commanding costs 1 Trainer Action (adds to multiple action count).\n• Homebrew Note: Some Storytellers homebrew this to keep commanding as a Free Action even in the fray so trainers in combat aren’t heavily penalized.\n• Uncommanded: Acts on its own instincts and loyalty.',
        discordMarkdown: `## 🗣️ **Commanding Pokémon in Battle**
• **Commands happen on the Pokémon’s Turn:** Verbal or gestural commands are issued during the Pokémon’s turn, **NOT** on the Trainer’s turn.
• **No Direct Attacks on Trainer Turn:** A Trainer cannot spend a Trainer Action on their own turn to make a Pokémon attack immediately.
• **Action Cost (RAW):** Free Action in the Trainer Area. In the Fray, RAW states commanding costs 1 Trainer Action (adds to the Trainer’s multiple action count).
• *Homebrew Note:* Some Storytellers homebrew this to keep commanding as a Free Action even in the fray so trainers in combat aren’t heavily penalized.
• **Uncommanded Pokémon:** If a Trainer cannot or chooses not to command their Pokémon, the Pokémon acts on its own instincts and loyalty.`
    },
    {
        id: 'trainer-switching',
        title: 'Switching & Replacing Pokémon (Mid-Round Warning)',
        category: 'trainer',
        categoryLabel: 'Trainer Rules',
        badge: 'Tactical Warning',
        summary: 'Mid-round switch lockout causes incoming Pokémon to forfeit actions until next round. Lore & tactical explanation.',
        keywords: [
            'switch',
            'switching',
            'replace',
            'fainted',
            'swap out',
            'mid-round',
            'lockout',
            'panicked',
            'tactical warning',
            'free actions'
        ],
        broadcastText:
            '⚠️ Switching & Replacing Pokémon (Mid-Round Warning):\n• Mid-Round Lockout: If you switch out a Pokémon mid-round (or deploy a replacement for a fainted Pokémon mid-round), the incoming Pokémon CANNOT take any actions until the new round begins!\n• In-Universe Lore: The replacement Pokémon is disoriented and panicked from being suddenly thrust into the heat of active combat; it needs a moment to assess the situation and come to its senses (which happens at round end).\n• Tactical Vulnerability: Switching mid-round gives the opponent "free" remaining actions where they can attack or set up without the newly deployed Pokémon being able to act or retaliate.\n• Best Practice: It is almost always ideal to wait until the End of the Round (during the Trainer’s end-of-round turn) to switch Pokémon or deploy replacements.',
        discordMarkdown: `## ⚠️ **Switching & Replacing Pokémon (Mid-Round Warning)**
> **Warning:** Swapping mid-round causes the incoming Pokémon to forfeit all actions until the new round begins!

• **Mid-Round Lockout:** If you switch out a Pokémon mid-round (or deploy a replacement for a fainted Pokémon mid-round), the incoming Pokémon **CANNOT** take any actions until the new round begins!
• **In-Universe Lore:** The replacement Pokémon is disoriented and panicked from being suddenly thrust into the heat of active combat; it needs a moment to assess the situation and come to its senses (which happens at the end of the round).
• **Tactical Vulnerability:** Switching mid-round gives the opponent **"free" remaining actions** where they can attack or set up without the newly deployed Pokémon being able to act or retaliate.
• **Best Practice:** It is almost always ideal to wait until the **End of the Round** (during the Trainer’s end-of-round turn) to switch Pokémon or deploy replacements.`
    },
    {
        id: 'humans-in-combat',
        title: 'Humans & Trainers in Combat (Defenses & Clashing)',
        category: 'trainer',
        categoryLabel: 'Trainer Rules',
        badge: 'Human Combat',
        summary: 'Human Defenses (Def & Sp.Def), Evasion, unarmed Struggle, and why humans CANNOT Clash (requires a Move).',
        keywords: [
            'human',
            'trainer',
            'defenses',
            'vitality',
            'insight',
            'evasion',
            'struggle',
            'clash',
            'unarmed',
            'brawl'
        ],
        broadcastText:
            'Humans & Trainers in Combat:\n• Defenses: Humans calculate both Defense (from Vitality) and Special Defense (from Insight) normally to reduce incoming physical and special damage.\n• Evasion: Humans CAN Evade attacks by rolling Dexterity + Evasion (Evasion is a universal Maneuver).\n• Struggle (p. 528): Humans can use Struggle as an unarmed physical attack (Pool: Strength + Brawl | Damage: Strength | Type: Normal, Physical).\n• CANNOT Clash: Clashing strictly requires using a Move. Because humans do not learn Moves and Struggle is classified as a Maneuver, humans CANNOT Clash against incoming attacks!',
        discordMarkdown: `## 🥊 **Humans & Trainers in Combat (Defenses, Struggle & Clashing)**
• **Defenses:** Humans calculate both Defense (from Vitality) and Special Defense (from Insight) normally to reduce incoming physical and special damage.
• **Evasion:** Humans **CAN Evade** attacks by rolling \`Dexterity + Evasion\` (Evasion is a universal Maneuver).
• **Struggle Maneuver (p. 528):** Humans can use Struggle as an unarmed physical attack (Pool: \`Strength + Brawl\` | Damage: \`Strength\` | Type: Normal, Physical).
• **CANNOT Clash:** Clashing strictly requires using a **Move**. Because humans do not learn Moves and Struggle is classified as a **Maneuver**, humans **CANNOT Clash** against incoming attacks!`
    },

    // MANEUVERS CATEGORY
    {
        id: 'maneuvers-core-rules',
        title: 'Typeless Maneuvers Core Rules & Clashing Restriction',
        category: 'maneuvers',
        categoryLabel: 'Maneuvers',
        badge: 'Core Rules',
        summary: 'Typeless maneuvers do not use energy, ignore type matchups, are once per round, and CANNOT clash nor be clashed.',
        keywords: [
            'maneuvers',
            'typeless',
            'core rules',
            'clash',
            'cannot clash',
            'struggle',
            'energy',
            'once per round'
        ],
        broadcastText:
            'Typeless Maneuvers Core Rules:\n• Not every attack is a Move! Simple Typeless Maneuvers don’t consume energy and are not bound by type weakness, resistance, or immunities.\n• Once per Round: Each Maneuver can only be used once per Round by a character.\n• CANNOT Clash nor be Clashed: Maneuvers can NEVER be used to Clash against an opponent, nor can an opponent Clash against a Maneuver! (This is why Struggle cannot be used to Clash).\n• Typeless Damage: Maneuvers that deal damage inflict Typeless Damage, ignoring type charts.\n• Universal Access: Anyone (Humans and Pokémon) can perform them.',
        discordMarkdown: `## 🌀 **Typeless Maneuvers Core Rules**
> *Not every attack is a Move. Sometimes, you will use simple Typeless Maneuvers. They don’t use energy. So, they are not bound by weakness, resistance, or immunities that Types hold around each other.*

• **Once per Round:** Each Maneuver can only be used once per Round.
• **CANNOT Clash nor be Clashed:** Maneuvers **can NEVER clash nor be clashed**! (This is why **Struggle** cannot be used to Clash).
• **Typeless Damage:** Maneuvers that deal damage inflict Typeless Damage.
• **Universal Access:** Since anyone can perform them, both Humans and Pokémon can enrich their strategy. Feel free to create your own.`
    },
    {
        id: 'maneuvers-list-all',
        title: 'All 9 Official Typeless Maneuvers Quick Reference',
        category: 'maneuvers',
        categoryLabel: 'Maneuvers',
        badge: 'Quick Reference',
        summary: 'Ambush, Clash, Cover an Ally, Evasion, Grapple, Help Another, Run Away, Stabilize an Ally, Struggle.',
        keywords: [
            'maneuvers',
            'all maneuvers',
            'ambush',
            'clash',
            'cover an ally',
            'evasion',
            'grapple',
            'help another',
            'run away',
            'stabilize an ally',
            'struggle'
        ],
        broadcastText:
            'Official Typeless Maneuvers:\n' +
            CORE_MANEUVERS_DATA.map((m) => `• ${m.name} [${m.category}] (Acc: ${m.accuracy} | Target: ${m.target})`).join('\n') +
            '\n*Note: Maneuvers can only be used once per round and CANNOT clash nor be clashed!*',
        discordMarkdown: `## 📜 **Official Typeless Maneuvers (All 9)**
${CORE_MANEUVERS_DATA.map(
    (m) => `### **${m.name}** [${m.category} | Power: ${m.power}]
• **Accuracy:** \`${m.accuracy}\` | **Damage Pool:** \`${m.damagePool}\` | **Target:** \`${m.target}\`${m.reaction ? ` | **${m.reaction}**` : ''}
• **Effect:** ${m.addedEffect}
• *"${m.flavor}"*`
).join('\n\n')}`
    },
    {
        id: 'maneuver-ambush',
        title: 'Maneuver: Ambush',
        category: 'maneuvers',
        categoryLabel: 'Maneuvers',
        badge: 'Maneuver',
        summary: 'Dexterity + Stealth to act before Initiatives are rolled. Single target resists with Insight + Alert.',
        keywords: ['ambush', 'stealth', 'surprise', 'initiative', 'pre-battle', 'maneuver'],
        broadcastText: formatManeuverBroadcast(CORE_MANEUVERS_DATA[0]),
        discordMarkdown: `## 👤 **Maneuver: Ambush** [Category: Support | Power: —]
• **Accuracy:** \`Dexterity + Stealth\` | **Damage Pool:** \`—\` | **Target:** \`Single Target\`
• **Effect:** Before the Battle starts, Target may resist by rolling: Insight + Alert and scoring the same or more successes. The User has 1 Action before Initiatives are rolled in which the Target can’t act. Other foes can still Evade or Clash during this time.
• *"Sneak through the shadows, keep low to the ground and prepare to pounce on an unsuspecting foe."*`
    },
    {
        id: 'maneuver-clash',
        title: 'Maneuver: Clash (Reaction 6)',
        category: 'maneuvers',
        categoryLabel: 'Maneuvers',
        badge: 'Reaction 6',
        summary: 'Strength/Special + Clash to contest incoming Move accuracy. Note: Requires using a Move to contest power!',
        keywords: ['clash', 'reaction 6', 'contest', 'move', 'struggle', 'counter', 'maneuver'],
        broadcastText: formatManeuverBroadcast(CORE_MANEUVERS_DATA[1]),
        discordMarkdown: `## 💥 **Maneuver: Clash** [Category: Support | Reaction 6 (↑6)]
• **Accuracy:** \`Strength/Special + Clash\` | **Damage Pool:** \`—\` | **Target:** \`Target Self\`
• **Effect:** Match the number of successes on the Accuracy roll of a Move that targets the User. If successful, the user Clashes (p. 68). This Maneuver is NOT affected by the Multiple Action difficulty chart.
• *Note: Requires using a Move to contest power. Humans cannot Clash because Struggle is a Maneuver, not a Move.*
• *"A power struggle can become a clash of mights, usually with explosive results."*`
    },
    {
        id: 'maneuver-cover-an-ally',
        title: 'Maneuver: Cover an Ally (Reaction 1)',
        category: 'maneuvers',
        categoryLabel: 'Maneuvers',
        badge: 'Reaction 1',
        summary: 'Will reaction to become the target of incoming attacks aimed at an ally. Loyalty 2 or less won’t use.',
        keywords: ['cover an ally', 'cover', 'protect', 'intercept', 'reaction 1', 'will', 'loyalty', 'maneuver'],
        broadcastText: formatManeuverBroadcast(CORE_MANEUVERS_DATA[2]),
        discordMarkdown: `## 🛡️ **Maneuver: Cover an Ally** [Category: Support | Reaction 1 (↑1)]
• **Accuracy:** \`Will\` | **Damage Pool:** \`—\` | **Target:** \`Target One Ally\`
• **Effect:** The User will become the target to incoming attacks towards the Target. This Cover lasts until the User’s Next Turn or until the Target uses a Non-Ranged Physical Move. Pokémon with Loyalty 2 or less won’t use this Maneuver.
• *"Use your body as a shield to protect your friends! Not even 100 Spearows will go through you!"*`
    },
    {
        id: 'maneuver-evasion',
        title: 'Maneuver: Evasion (Reaction 6)',
        category: 'maneuvers',
        categoryLabel: 'Maneuvers',
        badge: 'Reaction 6',
        summary: 'Dexterity + Evasion reaction to dodge incoming attacks. Universal defense for Pokémon and Humans.',
        keywords: ['evasion', 'dodge', 'evade', 'reaction 6', 'dexterity', 'maneuver'],
        broadcastText: formatManeuverBroadcast(CORE_MANEUVERS_DATA[3]),
        discordMarkdown: `## 💨 **Maneuver: Evasion** [Category: Support | Reaction 6 (↑6)]
• **Accuracy:** \`Dexterity + Evasion\` | **Damage Pool:** \`—\` | **Target:** \`Target Self\`
• **Effect:** Match the number of successes on the Accuracy roll of a Move that targets the User. If successful, the user Evades (p. 68). This Maneuver is NOT affected by the Multiple Action difficulty chart.
• *"No time to think! If you hear 'Doooooodge!' You get out of the way A.S.A.P."*`
    },
    {
        id: 'maneuver-grapple',
        title: 'Maneuver: Grapple (Blocks Target)',
        category: 'maneuvers',
        categoryLabel: 'Maneuvers',
        badge: 'Maneuver',
        summary: 'Strength + Athletic/Brawl to block target. Target resists with Str/Dex score. User cannot act while grappling.',
        keywords: ['grapple', 'block', 'wrestling', 'hold', 'strength', 'brawl', 'athletic', 'pin', 'maneuver'],
        broadcastText: formatManeuverBroadcast(CORE_MANEUVERS_DATA[4]),
        discordMarkdown: `## 🤼 **Maneuver: Grapple** [Category: Support | Power: —]
• **Accuracy:** \`Strength + Athletic/Brawl\` | **Damage Pool:** \`—\` | **Target:** \`Single Target (Blocks)\`
• **Effect:** Blocks the target. The Target may resist this Maneuver by rolling Strength or Dexterity score and scoring the same or more successes than the User. The User can’t Act while Grappling. The User can release the Grapple at any point to act.
• *"Force the target into a wrestling lock; use a lasso rodeo-style; or simply cling onto one of their legs — the point is: you won’t let them escape!"*`
    },
    {
        id: 'maneuver-help-another',
        title: 'Maneuver: Help Another (Reaction 1)',
        category: 'maneuvers',
        categoryLabel: 'Maneuvers',
        badge: 'Reaction 1',
        summary: 'Roll accuracy pool as Chance dice. Each 6 adds +1 die to ally’s accuracy (up to 3 helpers / 6 dice max).',
        keywords: ['help another', 'assist', 'reaction 1', 'chance dice', 'teamwork', 'bonus dice', 'maneuver'],
        broadcastText: formatManeuverBroadcast(CORE_MANEUVERS_DATA[5]),
        discordMarkdown: `## 🤝 **Maneuver: Help Another** [Category: Support | Reaction 1 (↑1)]
• **Accuracy:** \`Same as Ally’s Attempted Action\` | **Damage Pool:** \`—\` | **Target:** \`Target One Ally\`
• **Effect:** Roll your Accuracy as if it were Chance dice. Add 1 die to the Accuracy Roll of your Ally for every 6 rolled. Up to 3 Characters may attempt to help a single action. Up to 6 Dice may be added this way.
• *"Not being the best suited for a task doesn’t mean you won’t do your part in helping out. The best teams work together!"*`
    },
    {
        id: 'maneuver-run-away',
        title: 'Maneuver: Run Away',
        category: 'maneuvers',
        categoryLabel: 'Maneuvers',
        badge: 'Maneuver',
        summary: 'Dexterity + Athletic to flee and end battle. Foes contest with Dex + Athletic to block escape.',
        keywords: ['run away', 'flee', 'escape', 'athletic', 'dexterity', 'retreat', 'maneuver'],
        broadcastText: formatManeuverBroadcast(CORE_MANEUVERS_DATA[6]),
        discordMarkdown: `## 🏃 **Maneuver: Run Away** [Category: Support | Power: —]
• **Accuracy:** \`Dexterity + Athletic\` | **Damage Pool:** \`—\` | **Target:** \`Target Self\`
• **Effect:** The User runs away from the battlefield to end the battle. Foes might try to prevent this by rolling: Dexterity + Athletic and scoring the same or more successes. If the user is Blocked this Maneuver fails.
• *"Nope. Nope. Nope."*`
    },
    {
        id: 'maneuver-stabilize-an-ally',
        title: 'Maneuver: Stabilize an Ally (First Aid & CPR)',
        category: 'maneuvers',
        categoryLabel: 'Maneuvers',
        badge: 'Maneuver',
        summary: 'Clever + Medicine first aid to halt hourly lethal damage. Once per hour; each lethal damage on ally reduces 1 success.',
        keywords: ['stabilize', 'first aid', 'cpr', 'medicine', 'clever', 'lethal damage', 'wound', 'maneuver'],
        broadcastText: formatManeuverBroadcast(CORE_MANEUVERS_DATA[7]),
        discordMarkdown: `## 🩹 **Maneuver: Stabilize an Ally** [Category: Support | Power: —]
• **Accuracy:** \`Clever + Medicine\` | **Damage Pool:** \`—\` | **Target:** \`Single Target\`
• **Effect:** The User applies CPR and/or first aid to an Ally. Target won’t receive Lethal Damage each hour anymore. Each Lethal Damage on the Ally reduces 1 Success to the Accuracy Pool of this Maneuver. This Maneuver can only be used once per hour.
• *"Apply pressure! Give chest compressions! Suck out the venom! You are not losing anyone today!"*`
    },
    {
        id: 'maneuver-struggle',
        title: 'Maneuver: Struggle (Why Struggle Cannot Clash)',
        category: 'maneuvers',
        categoryLabel: 'Maneuvers',
        badge: 'Maneuver',
        summary: 'Universal unarmed/fallback strike. Inflicts Typeless Damage. Crucial: Because Struggle is a Maneuver, it CANNOT clash nor be clashed!',
        keywords: [
            'struggle',
            'clash',
            'cannot clash',
            'unarmed',
            'fallback strike',
            'brawl',
            'channel',
            'throw',
            'typeless damage',
            'maneuver'
        ],
        broadcastText: formatManeuverBroadcast(CORE_MANEUVERS_DATA[8]),
        discordMarkdown: `## 🥊 **Maneuver: Struggle** [Category: Physical/Special | Power: Strength/Special]
• **Accuracy:** \`Dexterity + Brawl / Channel / Throw\` | **Damage Pool:** \`Strength/Special + 0\` | **Target:** \`Single Target\`
• **Effect:** Universal unarmed / fallback strike. Inflicts Typeless Damage.
• ⚠️ **Why Struggle CANNOT Clash:** Clashing strictly requires using a **Move**. Because Struggle is officially classified as a **Typeless Maneuver** (p. 528), and the core rules state *"Maneuvers can't clash nor be clashed"*, Struggle can **NEVER** be used to Clash against an incoming attack!
• *"Scuffle about and make every effort to deliver a blow."*`
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
        category: 'environment',
        categoryLabel: 'Status & Environment',
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
            'Status Categories & Rules:\n• Aggravating: Worsens over time if untreated (3rd Burn, Badly Poisoned).\n• Fixed: Constant effect; needs items/care to heal (1st/2nd Burn, Poison, Paralysis).\n• Volatile: Temporary; heals after time/switching out (Confused, Disabled, Flinch, Frozen, In Love, Sleep).\n• Stacking: Statuses stack! Inflicting burn/poison again bumps to next degree. Only Full Heal/Restore & Lum Berry cure multiple conditions at once.\n• Burn & Poison Damage: Deals damage upon infliction and again at the end of the round.',
        discordMarkdown: `## 🧪 **Pokerole Status Ailments & Conditions**
> *Status conditions impair Pokémon and humans. They fall into three primary categories:*

### 📊 **Status Categories**
• **Aggravating:** The condition will worsen, dealing more damage over time if left untreated *(3rd Degree Burn, Badly Poisoned)*.
• **Fixed:** The condition remains as is; it does not worsen over time, but it does not heal on its own *(1st & 2nd Degree Burn, Poison, Paralysis)*.
• **Volatile:** The condition is temporary and can heal on its own after a few minutes or by switching out *(Confused, Sleep, Flinched, Disabled, In Love, Frozen)*.

> ⚠️ **Status Stacking & Curing:**
> • Statuses **can stack** (e.g. Asleep + Poisoned + Confused at once). Re-inflicting Burn or Poison bumps it to the next degree!
> • **Only Full Heal, Full Restore, and Lum Berry** cure more than one condition at a time.
> • **Burn & Poison Damage:** Burn and Poison deal damage upon infliction and again at the end of the round.
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
        category: 'environment',
        categoryLabel: 'Status & Environment',
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
        category: 'environment',
        categoryLabel: 'Status & Environment',
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
        category: 'progression',
        categoryLabel: 'Catching & Progression',
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
        id: 'pokeball-throwing-timing',
        title: 'Pokéball Throwing Timing & Economy',
        category: 'progression',
        categoryLabel: 'Catching & Progression',
        badge: 'Throw Timing',
        summary: 'When trainers can throw Pokéballs: In the Fray (on Trainer’s turn) vs Trainer Area (on Pokémon’s turn or end of round).',
        keywords: [
            'pokeball',
            'throw',
            'throwing',
            'timing',
            'action economy',
            'fray',
            'trainer area',
            'turn',
            'catching'
        ],
        broadcastText:
            'Pokéball Throwing Timing & Economy:\n• In the Fray: Throwing a Pokéball is performed on the Trainer’s turn (at their rolled initiative step).\n• In the Trainer Area: A Pokéball can be thrown during their Pokémon’s turn, or on the Trainer’s dedicated turn right before the end of the round.\n• Action Economy: Throwing a Pokéball is an Action and counts toward the Trainer’s 5 actions per round.',
        discordMarkdown: `## 🎯 **Pokéball Throwing Timing & Economy**
• **In the Fray:** Throwing a Pokéball is performed **on the Trainer’s turn** (at their rolled initiative step).
• **In the Trainer Area:** A Pokéball can be thrown **during their Pokémon’s turn**, or on the Trainer’s dedicated turn right before the end of the round.
• **Action Economy:** Throwing a Pokéball is an Action and counts toward the Trainer’s 5 actions per round.`
    },
    {
        id: 'training-points-guide',
        title: 'Training Points (TP), Sessions & Spending',
        category: 'progression',
        categoryLabel: 'Catching & Progression',
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
        category: 'progression',
        categoryLabel: 'Catching & Progression',
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
        category: 'progression',
        categoryLabel: 'Catching & Progression',
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
        category: 'environment',
        categoryLabel: 'Status & Environment',
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
    },
    {
        id: 'pmd-character-creation',
        title: 'PMD Character Rules & Stat Adjustments',
        category: 'homebrew',
        categoryLabel: 'PMD & Community Homebrew',
        badge: 'Optional Rules',
        summary:
            'Trainer/Teen stats (+2 Core/+2 Social), 2x Base HP, Knowledge Skills (Science to Magic), narrative Guild rank-ups, and Prof. Drake’s held items.',
        keywords: [
            'pmd',
            'homebrew',
            'pokemon mystery dungeon',
            'teen',
            'trainer stats',
            'double hp',
            'base hp',
            'magic',
            'knowledge',
            'crafts',
            'lore',
            'medicine',
            'narrative rank up',
            'promotion',
            'rank up',
            'held items',
            'equipment',
            'congra',
            'prof drake',
            'drake'
        ],
        broadcastText:
            'PMD Character Rules:\n• Teen Stats: Pokémon receive +2 Core Attributes & +2 Social Attributes (set Age to "Teen" in app).\n• Base HP: Base HP is doubled to endure multi-encounter dungeon crawls.\n• Knowledge Group: Pokémon gain Crafts, Medicine, Lore, and Magic (swapped from Science).\n• Narrative Rank-Ups: Promotions are awarded by the Guild for completing major expeditions (saving TP for skills & moves).\n• Multiple Held Items: Allows equipping 2-3 held items or looplets. See Prof. Drake’s Held Item Homebrew doc for extensive reference.\n\nNote: These are optional suggestions for PMD, not requirements.',
        discordMarkdown: `## 🏰 **PMD Character Rules & Stat Adjustments**
> *Common Pokémon Mystery Dungeon homebrew rules for character creation and progression.*

• **Trainer / Teen Stats:** Pokémon receive Trainer stat bonuses (usually the **Teen** profile: **+2 Core Attributes & +2 Social Attributes**). *Tip: Setting Age to "Teen" in this app auto-applies these points!*
• **Increased Base HP:** Base HP is doubled to help player Pokémon withstand the gauntlet of consecutive dungeon encounters.
• **Knowledge Skills & Magic:** Pokémon gain access to the Knowledge skill group (**Crafts, Medicine, Lore, and Magic** — Science is swapped to Magic by default in this sheet).
• **Narrative Rank-Ups:** Promotions (Rookie → Standard → Advanced → Expert → Ace → Master) are awarded narratively by the Guild upon completing major expedition missions rather than spending Training Points (TP), preserving TP for skills and moves.
• **Multiple Held Items:** Pokémon can equip 2–3 held items, scarves, or looplets to simulate dungeon preparation loadouts.
• **Prof. Drake's Held Item Compendium:** Check out [Prof. Drake's Held Item Homebrew List (Google Doc)](https://docs.google.com/document/d/1TndU1bcozMWATwB2xxEjbLVITE78Qs6D4fNkV1u0yPc/edit?usp=sharing) for a vast library of custom held items and inspiration!

> 💡 *Note: These rules are optional suggestions for PMD campaigns, not official requirements.*`
    },
    {
        id: 'pmd-treasure-bag-weight',
        title: 'PMD Treasure Bag & Weight System',
        category: 'homebrew',
        categoryLabel: 'PMD & Community Homebrew',
        badge: 'Dungeon Prep',
        summary:
            'Treasure Bag weight capacity scaling by Guild Rank (+5 wt/rank) and item weight reference table.',
        keywords: [
            'pmd',
            'treasure bag',
            'bag',
            'weight',
            'capacity',
            'inventory',
            'spikes',
            'orbs',
            'seeds',
            'berries',
            'wands',
            'congra',
            'homebrew'
        ],
        broadcastText:
            'PMD Treasure Bag Capacity: Starter/Rookie 5 Wt, Standard 10 Wt, Advanced 15 Wt, Expert 20 Wt, Ace 25 Wt, Master 30 Wt (+5 Wt per rank).\nItem Weights: Berries/Apples/Gummis/Orbs (1.0 Wt), Seeds (0.2 Wt / 5 per 1 Wt), Spikes/Throwables (0.1 Wt / 10 per 1 Wt), Weapons/Wands (1.0 Wt), Scarves (0.5-1.0 Wt).\n\nNote: Treasure bag capacity and item weights are optional suggestions for PMD inventory management.',
        discordMarkdown: `## 🎒 **PMD Treasure Bag & Weight System**
> *Congra's Treasure Bag system for inventory management and expedition preparation.*

**Bag Capacity by Rank (+5 Wt per Rank):**
${formatDiscordTable(
    ['Rank', 'Bag Capacity', 'Notes'],
    PMD_BAG_CAPACITY_TABLE.map((b) => [b.rank, `${b.capacity} Wt`, b.notes])
)}

**Item Weight Reference:**
${formatDiscordTable(
    ['Category', 'Weight', 'Stack / Count', 'Examples'],
    PMD_ITEM_WEIGHT_TABLE.map((i) => [i.category, `${i.weight} Wt`, i.stackRate, i.examples])
)}

> 💡 *Note: Treasure Bag capacity and item weights are optional suggestions. Adjust weight limits and item categories as desired for your table.*`
    },
    {
        id: 'pmd-dungeon-economy-food',
        title: 'PMD Dungeon Drops, Food & Gummis',
        category: 'homebrew',
        categoryLabel: 'PMD & Community Homebrew',
        badge: 'Will & Recovery',
        summary:
            'Frequent Oran/Sitrus Berry drops, Apples & Belly snacks for Will recovery, and Gummis for Will / stat boosts.',
        keywords: [
            'pmd',
            'food',
            'will',
            'will points',
            'apple',
            'small apple',
            'big apple',
            'perfect apple',
            'gummi',
            'gummis',
            'four-leaf cookie',
            'chocolate',
            'mega donut',
            'oran berry',
            'sitrus berry',
            'belly',
            'drops',
            'homebrew'
        ],
        broadcastText:
            'PMD Recovery & Food (Will Restoration):\n• Post-Battle Drops: Frequent Oran & Sitrus Berries.\n• Apples: Small Apple (+1 Will), Apple (+2 Will), Big Apple (+3 Will), Perfect Apple (Full Max Will).\n• Gummis: Standard (+1-2 Will), Empowering (+2 Will & +1 Temp Stat buff), Miracle (Permanent +1 Stat upgrade).\n• Belly Treats: Four-Leaf Cookie (+1 Will & Lucky roll), Chocolate (+1 Will & +2 Init), Mega Donut (+2 Will & +2 Temp HP/Def).\n\nNote: Food and berry mechanics are optional suggestions for PMD campaigns.',
        discordMarkdown: `## 🍎 **PMD Dungeon Drops, Food & Gummis**
> *Health restoration drops and food items repurposed for Pokerole Will Points & dungeon buffs.*

• **Post-Battle Health Drops:** Frequent **Oran Berry** (healing) and **Sitrus Berry** (healing / temp HP) drops after dungeon battles to sustain multi-room exploration.
• **Apples (Will Restoration):**
  - **Small Apple:** 1 Will Point (Emergency snack)
  - **Apple (Standard):** 2 Will Points (Standard meal)
  - **Big Apple:** 3 Will Points (Hearty feast)
  - **Perfect Apple:** Fully restores all Will to maximum!
• **Gummis (Will & Stat Enhancements):**
  - **Type Gummi (Standard):** 1–2 Will Points (Flavor/Type matched)
  - **Empowering Gummi:** 2 Will Points + **+1 to matching Stat** for the current floor
  - **Miracle Gummi (Legendary):** Fully restores Will + **Permanent +1 to matching Attribute**
• **Special Belly Treats:**
  - **Four-Leaf Cookie:** 1 Will Point + **Lucky** (+1 bonus success on next roll)
  - **Dungeon Chocolate:** 1 Will Point + **+2 Initiative** for the next fight
  - **Mega Donut:** 2 Will Points + **+2 Temp HP or +1 Defense** for 3 rounds

> 💡 *Note: Food effects, Will restoration numbers, and berry drop rates are optional suggestions to adapt PMD mechanics to Pokerole.*`
    },
    {
        id: 'pmd-weapons-equipment',
        title: 'PMD Weapons & Combat Gear',
        category: 'homebrew',
        categoryLabel: 'PMD & Community Homebrew',
        badge: 'Combat Gear',
        summary:
            'Prof. Drake’s upgradeable Struggle weapons vs Congra’s spellcasting Move-Slot wands/weapons and bag weight rules.',
        keywords: [
            'pmd',
            'weapons',
            'wands',
            'equipment',
            'struggle',
            'prof drake',
            'drake',
            'congra',
            'move slot',
            'staves',
            'hypnosis wand',
            'shadow blade',
            'night slash',
            'homebrew'
        ],
        broadcastText:
            'PMD Weapons Homebrew Models (1.0 Wt in Bag):\n• Prof. Drake Model: Weapons act as an upgradeable system based on the Struggle maneuver that makes the weapon better over time. While made for trainers, it can easily be adapted for Pokémon in PMD. See doc: https://docs.google.com/document/d/1WZvW3wLdlfJ4ECADhm2jFVdKdmtB2pI5jVHOoZzi5N8/edit?usp=sharing\n• Congra Model: Weapons (Wands, Swords, Staves, Bows) act as an extra equipped Move slot without consuming a move slot (e.g. Hypnosis Wand, Shadow Blade with Night Slash). GM determines if it uses move stats or unique weapon stats.\n\nNote: Weapon systems are optional suggestions for PMD campaigns.',
        discordMarkdown: `## ⚔️ **PMD Weapons & Combat Gear**
> *Community weapon models allowing player Pokémon to equip physical arms or spellcasting focuses.*

• **Option A — Upgradeable Struggle Weapons (Prof. Drake's Model):**
  Weapons act as an upgradeable system based on the *Struggle* maneuver that makes the weapon better over time (e.g. improving damage, accuracy, or weapon capabilities). While this was made for trainers, it can easily be adapted for Pokémon in a Mystery Dungeon setting. Check out [Prof. Drake's Weapon Progression Document](https://docs.google.com/document/d/1WZvW3wLdlfJ4ECADhm2jFVdKdmtB2pI5jVHOoZzi5N8/edit?usp=sharing) to see his complete upgrade rules and progression system!
  *Example:* Custom Weapon (1 Wt): Improves upon the base Struggle maneuver over time as the trainer/pokemon invests in upgrades and mastery.

• **Option B — Move-Focus Weapons & Wands (Congra's Model):**
  Weapons (such as Wands, Staves, Swords, or Bows) serve as an extra equipped slot to cast or perform a specific Move without consuming one of the Pokémon’s move slots. Allows players to carry tactical utility, status moves, or coverage into dungeons.
  *Resolution Stats:* The GM can determine whether the weapon uses the same stats as the move itself (e.g. Clever + Channel for *Hypnosis*) or its own unique stats (such as Special + Channel / Special + Magic for a wand, or Strength + Brawl / Strength + Weapons for a blade).
  *Examples: Hypnosis Wand (1 Wt), Shadow Blade granting Night Slash (1 Wt).*

• **Inventory Weight:** Both weapon models typically weigh **1.0 Wt** in the Treasure Bag.

> 💡 *Note: Weapon rules are optional homebrew. GMs should adjust weapon power and availability to suit their campaign.*`
    },
    {
        id: 'pmd-switcher-moves',
        title: 'PMD Switcher Moves & Tactical Repositioning',
        category: 'homebrew',
        categoryLabel: 'PMD & Community Homebrew',
        badge: 'Switcher Moves',
        summary:
            'Community adaptations for Switcher Moves in PMD: Free Cover repositioning (Congra), Ally Switch reactions & Shed Tail decoys (NorthLight), and 1v1 Evasion debuffs (Cylland).',
        keywords: [
            'pmd',
            'switcher',
            'switch',
            'switcher moves',
            'u-turn',
            'volt switch',
            'flip turn',
            'ally switch',
            'shed tail',
            'baton pass',
            'teleport',
            'parting shot',
            'cover',
            'reposition',
            'reaction',
            'congra',
            'northlight',
            'cylland',
            'homebrew'
        ],
        broadcastText:
            'PMD Switcher Moves Community Models:\n• Congra Model: Using a Switcher Move allows the user to Take Cover behind nearby terrain as a Free Action (refer to Cover Mechanics & Defense Bonuses section for +1 to +3 Def bonuses, at GM discretion based on the environment).\n• NorthLight Model: Ally Switch (Reaction 1, can only be used when attacked; redirects attack to a willing ally who gains a free reaction); Shed Tail (Target One Ally, make a substitute decoy for the target).\n• Cylland Model: In 1v1 duels, Switcher moves act as an evasive disengage giving the target -1 Accuracy on their next move.\n\nNote: Optional community suggestions for PMD campaigns.',
        discordMarkdown: `## 🔄 **PMD Switcher Moves & Tactical Repositioning**
> *Community house rules adapting trainer Pokéball Switcher Moves (U-turn, Volt Switch, Ally Switch, Shed Tail) for PMD dungeon exploration.*

• **Option A — Free Tactical Cover & Reposition (Congra's Model):**
  Since PMD lacks Pokéballs, Switcher Moves (e.g. *U-turn, Volt Switch, Flip Turn, Teleport, Baton Pass, Parting Shot*) allow the Pokémon to execute the move's normal effects and immediately duck behind nearby environmental terrain to **Take Cover as a Free Action** (saving the action normally required to find cover).
  *Cover Types:* Refer to the **Cover Mechanics & Defense Bonuses** section in this GM Screen for defense values (+1 to +3 Def), determined at GM discretion based on whatever cover is available in the dungeon environment.

• **Option B — Reaction Swaps & Ally Redirects (NorthLight's Model):**
  Tailors specific tactical pivot moves for team coordination:
  - **Ally Switch:** *Reaction 1*. Can only be used if you’re being attacked. The attack no longer targets you and instead targets one of your allies in range (if they are willing); the chosen ally gains a free action to react to the attack if it has any.
  - **Shed Tail:** *Target One Ally*. Make a substitute decoy for the target (user takes 2 damage and creates a 2 HP Substitute decoy onto an ally in range to shield them).

• **Option C — Tactical Disengage & Evasion Debuff (Cylland's Model):**
  In 1v1 duels or boss encounters where switching is impossible, Switcher moves act as an evasive hit-and-run feint that inflicts **-1 Accuracy on the target's next attack** (or grants temporary evasion).

> 💡 *Note: Switcher adaptations are optional community suggestions for PMD campaigns.*`
    },
    {
        id: 'rangers-core-mechanics',
        title: 'Pokémon Rangers: Core Mechanics & Disposition Meter',
        category: 'homebrew',
        categoryLabel: 'Pokémon Rangers Supplement',
        badge: 'Rangers Core',
        summary:
            'Disposition Meter (Will + Rank bonus) replaces HP damage, Styler Charge rules, and 3 Ranger Styles (Agile/Dex, Brute/Str-Vit, Tricky/Ins).',
        keywords: [
            'rangers',
            'pokemon rangers',
            'ranger',
            'disposition',
            'disposition meter',
            'dm',
            'styler',
            'capture styler',
            'agile style',
            'brute style',
            'tricky style',
            'prof drake',
            'drake',
            'homebrew'
        ],
        broadcastText:
            'Rangers Core Mechanics:\n• Disposition Meter (DM): Will + Rank Bonus (Starter +2, Rookie +3, Standard +4, Adv +5, Expert +6, Ace +7, Master +8, Champ +10). Target DM instead of HP to befriend/calm Pokémon.\n• Capture Styler: Uses Charge as Styler HP. Critical Failure on a maneuver deals 1 damage to Styler.\n• Ranger Styles: Agile (Dexterity), Brute (Strength/Vitality), Tricky (Insight). Replace "Style" in maneuvers with your associated stat.\n• Maneuvers per Rank: Starter 2, Rookie 3, Standard 4, Adv 5, Expert 6+1 Master, Ace 7+1, Master 8+1, Champ 10+1.\n\nNote: From Prof. Drake’s optional Pokémon Rangers supplement for Pokerole.',
        discordMarkdown: `## 🌀 **Pokémon Rangers: Core Mechanics & Disposition Meter**
> *Prof. Drake's Pokémon Rangers supplement replacing HP damage with empathy, aura, and the Capture Styler.*

• **Disposition Meter (DM = Will + Rank Bonus):** Rangers do not lower a Pokémon’s HP. Instead, they target the Pokémon's Disposition Meter to calm raw emotions and befriend them.
${formatDiscordTable(
    ['Rank', 'Starter', 'Rookie', 'Standard', 'Advanced', 'Expert', 'Ace', 'Master', 'Champion'],
    [['DM Bonus', '+2', '+3', '+4', '+5', '+6', '+7', '+8', '+10']]
)}

• **The Capture Styler & Charge:**
  - **Charge = Styler HP:** When a Styler reaches 0 Charge, it must be recharged before it can be used again.
  - **Critical Failure:** Rolling a Critical Failure on a Ranger Maneuver deals **1 point of damage** to the Styler.

• **Ranger Styles:**
  - **Agile Style (Dexterity):** Fast reactive movements, quick loops, and rapid evasion.
  - **Brute Style (Strength or Vitality):** Tough and sturdy, absorbing attacks and powering through barriers.
  - **Tricky Style (Insight):** Timed traps, tactical misdirection, and environmental manipulation.
  *(Whenever a maneuver states "Style" for Accuracy/Damage, use your Style’s associated stat.)*

• **Supplement Link:** [Prof. Drake's Pokémon Rangers Supplement (Google Doc)](https://docs.google.com/document/d/1GSn8Ms94vxTi86Lfh6rGXMVQ4huZ4W3Ik_F5v-FJJfw/edit?tab=t.0#heading=h.2d4gnxfspgm4)

> 💡 *Note: These mechanics are from Prof. Drake’s optional Pokémon Rangers supplement for Pokerole, not official corebook requirements.*`
    },
    {
        id: 'rangers-stylers-gear',
        title: 'Pokémon Rangers: Capture Stylers & Dangerous Encounters',
        category: 'homebrew',
        categoryLabel: 'Pokémon Rangers Supplement',
        badge: 'Rangers Gear',
        summary:
            'Capture Styler models (Charge HP, effects, costs) and Dangerous Encounter boss buffs & extra disposition.',
        keywords: [
            'rangers',
            'styler',
            'capture styler',
            'school styler',
            'basic styler',
            'specialty styler',
            'fine styler',
            'tempo styler',
            'durable styler',
            'wily styler',
            'lasso styler',
            'dangerous encounter',
            'boss',
            'prof drake',
            'drake',
            'homebrew'
        ],
        broadcastText:
            'Ranger Stylers & Boss Encounters:\n• Stylers: School (10 Chg), Basic (15 Chg), Specialty (20 Chg, +1 Style Stat), Fine (25 Chg, +1 Acc/Dmg), Tempo (25 Chg, Agile Dex stack), Durable (30 Chg, Brute -1 Dmg taken), Wily (20 Chg, Tricky free Basic Loop), Lasso (20 Chg, Athletic +1 die).\n• Dangerous Encounters: Low (+10 DM, 1 Buff), Med (+20 DM, 2 Buffs), High (+30 DM, 3 Buffs). Buffs include Strength Enhancement (+1 all stats), Super Damage (all super effective), Enhanced Movement (free action at Init 0).\n\nNote: From Prof. Drake’s optional Pokémon Rangers supplement for Pokerole.',
        discordMarkdown: `## ⚙️ **Pokémon Rangers: Capture Stylers & Dangerous Encounters**
> *Styler catalog and boss encounter scaling from Prof. Drake's Pokémon Rangers supplement.*

**Capture Styler Catalog:**
${formatDiscordTable(
    ['Styler', 'Charge', 'Cost', 'Effect'],
    RANGER_STYLERS.map((s) => [s.name, `${s.charge} HP`, s.cost === '—' ? 'Default' : `${s.cost} P$`, s.effect])
)}

**Dangerous Encounters (Boss / Enraged Pokémon):**
• **Encounter Scaling:** Low (+10 Extra DM, 1 Buff), Medium (+20 Extra DM, 2 Buffs), High (+30 Extra DM, 3 Buffs).
• **Boss Buff Options:**
  - **Strength Enhancement:** +1 to all Attributes and Traits.
  - **Super Damage:** All damage inflicted by this Pokémon is considered Super Effective.
  - **Enhanced Movement:** At Initiative 0, this Pokémon can perform 1 additional Action (ignoring action value / move restrictions).

> 💡 *Note: Styler gear and encounter buffs are optional guidelines from Prof. Drake’s Pokémon Rangers supplement.*`
    },
    {
        id: 'rangers-maneuvers-list',
        title: 'Pokémon Rangers: Maneuvers Reference Guide',
        category: 'homebrew',
        categoryLabel: 'Pokémon Rangers Supplement',
        badge: 'Rangers Techniques',
        summary:
            'Basic Loops (free for all), Advanced techniques, Style-specific maneuvers (Agile, Brute, Tricky), and Master techniques.',
        keywords: [
            'rangers',
            'maneuvers',
            'basic loop',
            'capture on',
            'large loop',
            'aura wheel',
            'swift movement',
            'get down',
            'bait and switch',
            'power charge',
            'master maneuver',
            'prof drake',
            'drake',
            'homebrew'
        ],
        broadcastText:
            'Ranger Maneuvers Summary:\n• Basic (Free for all): Basic Loop (Style+Empathy vs Social), Capture On! (+2 Acc/Dmg next attack), Large Loop (All Foes).\n• Advanced (Any Style): Emotional Shock (Paralyze), Fancy Technique (Dmg stacking), Aura Wheel (Never Miss), Spirit Burst (+5 Social Dmg Recoil), Recall (Shield Move -2 Dmg), Hold On (Remain at 1 HP), etc.\n• Agile: Swift Movement (5 Evasions), Shift Up (+Dex), Hasty Coil, Fast Loop, Rapid Aura.\n• Brute: Get Down! (Shield Ally -3 Dmg), Boost! (+Str on hit), Aura Counterattack, Mighty Blow, Durable Loop (+Def).\n• Tricky: Bait and Switch (Redirect attack), Sneaky Aura, Dizzy Loop (Confuse), Aura Shield (Force Field), Calculate (+2 Acc/Dmg dice).\n• Master: Power Charge! (+3 Dmg), Aura Expulsion, Guardian Assist.\n\nNote: From Prof. Drake’s optional Pokémon Rangers supplement for Pokerole.',
        discordMarkdown: `## 🌀 **Pokémon Rangers: Maneuvers Reference Guide**
> *Ranger techniques and loop maneuvers from Prof. Drake's Pokémon Rangers supplement.*

• **Basic Maneuvers (All Rangers know these for free, do not count toward limit):**
  - **Basic Loop:** *Style + Empathy vs Social* — Single Target. A standard loop connecting around target.
  - **Capture On!:** *Style + Perform vs —* — Target Self. +2 Accuracy and +2 Damage to next attack.
  - **Large Loop:** *Style + Empathy vs Social* — Target All Foes. Low Accuracy 1.

• **Style-Specific Maneuver Highlights:**
  - **Agile:** *Swift Movement* (Up to 5 evasions this round), *Shift Up* (+1 Dex stack), *Fast Loop* (Reaction 2).
  - **Brute:** *Get Down!* (Cover ally and reduce damage by 3), *Boost!* (+1 Str when hit), *Durable Loop* (+1 Def stack).
  - **Tricky:** *Bait and Switch* (Redirect incoming attack to another target), *Aura Shield* (4-round Force Field), *Calculate* (+2 Acc/Dmg dice to user and allies).

• **Master Maneuvers (Expert+ Rank, 1 day training with Top Ranger):**
  - **Power Charge!:** *Will + Empathy* — All attacks deal +3 Damage for the round.
  - **Aura Expulsion:** *Style + Empathy vs Social + 3* — Target All Foes in Range (+3 Power if target ≤ half DM).
  - **Guardian Assist:** *Will + Weapon* — Call forth the legendary aura of a powerful guardian ally.

> 💡 *Note: Maneuvers and technique rules are from Prof. Drake’s optional Pokémon Rangers supplement for Pokerole.*`
    },
    {
        id: 'rangers-assists-bonds',
        title: 'Pokémon Rangers: Field Assists, Combat & Partner Bonds',
        category: 'homebrew',
        categoryLabel: 'Pokémon Rangers Supplement',
        badge: 'Rangers Assists',
        summary:
            'Field assist commands (Recharge, Crush, Cut, etc.), Combat assists (Type/Ability/Move), and Partner Loyalty bond levels (1-5).',
        keywords: [
            'rangers',
            'assists',
            'pokemon assist',
            'partner assist',
            'partner pokemon',
            'recharge',
            'crush',
            'cut',
            'soak',
            'bond',
            'loyalty',
            'friendship',
            'clash',
            'prof drake',
            'drake',
            'homebrew'
        ],
        broadcastText:
            'Ranger Assists & Partner Bonds:\n• Wild Assists Capacity: Starter 2, Rookie 3, Standard 4, Adv 5, Expert 6, Ace 7, Master 8, Champ 10.\n• Field Assists: Crush, Cut, Burn, Soak, Electrify, Tackle, Psy-Power, Recharge (+3 Styler Charge), Fly, Surf.\n• Combat Assists (1/turn before maneuver): Apply Type (Free), Use Ability (Free), Use Move (Full Action).\n• Partner Bonds (Levels 1-5): Lv1 (Apply Partner Type), Lv2 (+Happiness/Loyalty to 1 roll), Lv3 (Partner move alongside Ranger action vs DM), Lv4 (Additional Clash vs Styler attack), Lv5 (Auto-succeed skill check once per session).\n\nNote: From Prof. Drake’s optional Pokémon Rangers supplement for Pokerole.',
        discordMarkdown: `## 🤝 **Pokémon Rangers: Field Assists & Partner Bonds**
> *Calling wild Pokémon assists and unlocking partner bond powers from Prof. Drake's Pokémon Rangers supplement.*

• **Max Wild Assists by Rank:** Starter: 2 | Rookie: 3 | Standard: 4 | Advanced: 5 | Expert: 6 | Ace: 7 | Master: 8 | Champion: 10 *(Partner Pokémon does not count toward this limit).*

• **Field Assists:**
  - **Recharge:** Restores **+3 Charge** directly to your Styler.
  - **Crush, Cut, Burn, Soak, Electrify, Tackle, Psy-Power, Fly, Surf:** Overcome environmental hazards, clear roadblocks, and manipulate puzzles.

• **Combat Assists (1 Assist per turn, directly before a maneuver):**
  - **Apply Type:** Infuse the wild Pokémon's typing into your maneuver *(Free Action)*.
  - **Use Ability:** Trigger the wild Pokémon's ability *(Free Action)*.
  - **Use a Move:** Command the wild Pokémon to use one of its moves *(Full Action)*.

• **Partner Bond Levels (1 to 5 Loyalty / Happiness Progression):**
  - **Level 1 (3/3):** Apply Partner Pokémon's typing to every move for 1 round.
  - **Level 2 (4/3 or 3/4):** Add Happiness or Loyalty dice to any 1 skill check.
  - **Level 3 (4/4):** Partner performs a move at the same time as the Ranger acts (decreases DM instead of damage).
  - **Level 4 (5/4 or 4/5):** Partner attempts an additional Clash when Stylus is targeted, rolling full damage pool.
  - **Level 5 (5/5):** Automatic success on any 1 crucial skill check (GM permission, once per session).

> 💡 *Note: Assist and partner rules are from Prof. Drake’s optional Pokémon Rangers supplement for Pokerole.*`
    }
];
