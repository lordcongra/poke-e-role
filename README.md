# Pokerole 3.0 Sheet v2.2 (Owlbear Rodeo Extension)

A highly automated, modular character sheet extension for playing **Pokerole 3.0** campaigns (including **Pokémon Mystery Dungeon / PMD** settings) within the Owlbear Rodeo VTT.

_A massive thank you to the creator of the **Owl Trackers** extension. Their incredible UI work and data management architecture were a massive inspiration for the custom graphics engine for the overhaul of this sheet!_

---

## ⚠️ REQUIRED PLUGINS

To use all the features of this character sheet, you **MUST** install the following Owlbear Rodeo extensions in your room:

1. **[Dice+](https://extensions.owlbear.rodeo/dice-plus):** Handles all 1-click 3D dice rolling (Accuracy, Damage, Evasion, Clashes, etc.).
2. **[Pretty Sordid (Initiative)](https://extensions.owlbear.rodeo/pretty-sordid):** Grabs Initiative rolls from the sheet and automatically sorts the combat order (including decimal tie-breakers!).

## 🎒 RECOMMENDED PLUGINS (Optional)

While these extensions do not tie directly into the character sheet, they are highly recommended for running immersive Pokerole campaigns:

- **[Persistent Tokens](https://extensions.owlbear.rodeo/persistent-tokens):** Makes your tokens and their character sheets persist between scenes! Extremely helpful so you don't have to constantly export and import JSONs when switching maps.
- **[Bag It!](https://extensions.owlbear.rodeo/bag-it):** Provides a real, visual inventory system for players to store, move, and trade items directly on the tabletop.
- **[Embers](https://extensions.owlbear.rodeo/embers):** An amazing tool for setting up visual spell and attack effects on the map.
    > **Pro Tip:** Want a head start on your move animations? Reach out to **`@congra`** in the Pokerole Discord to get a copy of his custom Embers spell effects JSON!

---

## 📚 How to Use This Sheet (Quick Start Guide)

If you are new to the Pokerole Extension, here are a few core concepts to get you started:

1. **Selecting Tokens:** The sheet is entirely tied to the Owlbear Rodeo token system. Click on a token on the map to load its data. If you click away, the sheet will clear.
2. **Token Scale Warning:** The visual UI (HP/Will bars, Defense badges) that hovers over your tokens works best on standard-sized or larger tokens. **Shrinking tokens to incredibly small scales can cause the UI graphics to break or overlap.**
3. **Pokémon vs. Trainer Mode:** Near the top of the sheet is a dropdown to swap between "Pokémon" and "Trainer". Swapping to Trainer will safely back up your Pokémon's stats, limits, and typing into memory, change your skills (e.g., "Channel" becomes "Throw"), and clear your typing. Swapping back to Pokémon perfectly restores all your saved data!
4. **Refreshing Data:** If your moves or abilities ever look blank or are missing their tooltips, click the `↻ Refresh` button at the top of the sheet to force the system to ping the database and backfill the missing descriptions.

---

## 🌟 Features

### 🛠️ The Homebrew Workshop

- **Fully Custom Database:** Create your own custom Pokémon, Moves, Abilities, Items, and even completely new Typings (with custom weakness/resistance charts).
- **Live Room Sync:** Anything you build in the Workshop instantly syncs to the room database, making it immediately available in the dropdown menus for every player!
- **GM Spoiler Protection:** Check the "GM Only" box on any custom creation to keep it hidden from the players' Workshop and dropdown menus until you are ready to reveal the boss!
- **Backup & Restore:** Easily export your entire Homebrew Workshop as a JSON file to share with other GMs or carry over to a new campaign room.

### 🎁 The Loot Generator (New in V2.2!)

- **Automated Drop Tables:** Takes the heavy lifting out of session prep and dungeon crawling. Select the pockets/categories you want to pull from (e.g., Berries, Held Items, TMs) and generate instant loot drops.
- **Two-Stage RNG Engine:** Attempts to weight common items (like Potions) against rare items (like Mega Stones) so you don't accidentally over-reward your players. It's not perfect but it gets the job done.
- **Legendary Filtering:** Easily toggle the inclusion of extremely rare, game-breaking legendary items with a single checkbox. This includes things like master balls, rare candy, etc. It will also include anything in the Homebrew Workshop that you tag as Legendary rarity.
- **GM Access Control:** By default, the generator is a GM-exclusive tool, but it can be globally unlocked for players via the Room Rules menu!

### 🌐 Live Database Fetching & Offline Resilience (New in V2.2!)

- **Offline-First Architecture:** The extension now ships with a pre-compiled local database of Pokémon, Abilities, Natures, Moves, and Items. It loads instantly and is completely immune to third-party API rate limits or network outages!
- **Seamless Live Fallback:** If you type in the name of a brand-new Pokémon that isn't in your local database yet, the app intelligently falls back to the live Pokerole-Data repository to fetch the stats, completely bypassing API limits in the process.

### 📊 Fully Automated Stat Calculation

- Enter your Base Stats, Ranks, Buffs, and Debuffs, and the sheet automatically calculates all Derived Stats (HP, Will, Defenses, Evasion, Clashes).
- **Lag-Free UI:** Stat calculations are handled by a hyper-fast React engine, meaning you can rapidly click the spinner arrows without the browser freezing or dropping frames!
- Also supports tracking for **Happiness** and **Loyalty**.
- **Form & Evolution Safe:** Change a Pokémon's species to update their base stats and typing _without_ wiping their invested skills and moves!

### 🎲 Custom Action Rolls & Auto-Generator

- **Out-of-Combat Roleplay:** Create up to 10 Custom Action Rolls (e.g., _Investigate_, _Persuade_, _Climb_) using any combination of Core Attributes and Skills.
- **Smart Auto-Generator:** Instantly draft Wild, Average, or Min-Max builds based on your Rank. The algorithm intelligently caps your core attacking and defending stats before allocating remaining points, dynamically adjusting to your combat bias (Tank, Physical, Special, Support, etc.).

### 📈 Soft Caps, Limits, & PMD Overrides

- Automatically calculates your maximum Attribute, Social, and Skill point limits based on your currently selected Rank and Age.
- Tracks your spent points and warns you if you exceed standard limits.
- **Auto-Fetches Stat Caps:** Automatically queries the API to display the maximum Attribute limits for your specific Pokémon species.
- **PMD / Homebrew Friendly:** Includes "Extra Pts" override boxes, allowing GMs to reward extra stats for completing special dungeons/quests/events, using special items, etc. without breaking the sheet's logic.

### ⏱️ Dynamic Status, Pain, & Timers (w/ Map Sync)

- **Pain Penalization:** The sheet automatically monitors your HP and deducts -1 or -2 successes from your rolls when you are badly hurt (automatically skipping Vitality/Will rolls).
- **Status Penalties:** Automatically applies mechanical penalties for Confusion (success drops scaling with Rank) and Paralysis (-2 Dice to Dex rolls), and prevents actions if Asleep or Frozen.
- **Smart Ability Overrides:** Hardcoded exceptions for abilities like Limber, Comatose, Insomnia, Vital Spirit, and Sweet Veil so they properly bypass status penalties!
- **Auto-Ticking Effects:** Track terrain, weather, or screens (like Tailwind or Reflect) in the "Timers" box. Clicking the "Reset Round" button automatically ticks these timers down by 1.
- **1-Click Status Recovery:** Click the 🎲 icon next to a status to automatically calculate and roll your recovery pool.
- **Visual Map Trackers:** Any active timer, status, or HP/Will change automatically updates the highly visible, color-coded custom UI graphics natively drawn over your token on the map so the GM never loses track of combat!
- **Roleplay Mode:** Click the "⚙️" icon on the Trackers bar at the top of the sheet to fully customize exactly which UI elements (Bars, Text, Badges) render over your token, allowing you to instantly hide trackers during intense roleplay moments.

### ⚔️ Willpower & Combat Economy

- **Willpower Mechanics:** Dedicated 1-click buttons to spend Willpower for "Pushing Fate" (+1 Auto Success), "Take Your Chances" (gain reroll stacks), and "Power Through the Pain" (ignore Pain Penalties for the scene).
- **Interactive Rerolls:** A dedicated reroll prompt lets you choose exactly how many failed dice to pick back up and reroll using your active "Take Your Chances" stacks.
- **Action Tracking:** Automatically increases your Action count and checks off your Evasion/Clash trackers when rolling attacks or maneuvers.
- **Generic Maneuvers:** 1-click dropdown for combat maneuvers (Grapple, Cover Ally, Ambush, etc.).
- Dim your used moves with the inline **(✔)** checkbox to track your action economy, then click the **Reset** button to clear the board for the next turn.

### 🎒 Inventory, Tags, & Progression

- **The Tag Builder:** Click the `🏷️` icon next to any item in your inventory or move in your move list to open the Tag Builder. This tool lets you easily attach mechanical modifiers (e.g., `[Dmg +2]`, `[Acc -1: Fire]`, `[Str +1]`, `[Status: Poison]`, `[High Crit]`).
- **Smart Item Auto-Fill:** The sheet automatically recognizes standard items! Type "Life Orb", "Choice Scarf", or "Eviolite" into the name box, and the engine will automatically fetch the description and inject the perfect mechanical tags for you!
- **Training Points (TP) & Poké (PD):** Keep track of your character's progression currency and wealth with dedicated, auto-saving trackers at the bottom of the sheet.

### 🎲 1-Click Dice+ & Broadcast Integration

- **OBR Notifications:** Every roll triggers an Owlbear Rodeo broadcast notification announcing the move, pain penalties, active item buffs, and required successes to the whole table! The goal of this is to give you info on what you have that's affecting your rolls.
- **Pure Math Routing:** Dice+ and the sheet handles most of the math for you!
- **Smart Combat:** Automatically accounts for global Accuracy/Damage modifiers, STAB bonuses, Protean/Libero, Super Luck, and even grants +3 dice on Critical Hits for the _Sniper_ ability.

### 🛡️ Auto-Calculating Type Matchups

- Never stop combat to check a type chart again. The sheet automatically calculates and displays a Pokémon's defensive weaknesses and resistances (4x, 2x, 0.5x, 0.25x, 0x) based on their current typing or dual-typing.
- Fully supports items like the _Ring Target_ or _Iron Ball_ to dynamically rewrite the type chart on the fly!

### 🔒 Room Rules & GM Tools

- **Global Room Rules:** GMs can click the "📜 Rules" button to globally configure how HP/Spec Def is calculated for the room, and completely disable/enable Pain Penalties for all players!
- **Homebrew Access Control:** GMs can set Homebrew permissions to "Full Access", "View Only", or completely hide the Workshop from the players' screens.
- **Built-in NPC Toggle:** Mark a sheet as a "Private NPC" to instantly hide the sheet's contents from players, preventing meta-gaming during boss fights.

---

## 🛠️ Installation

To install this extension into your Owlbear Rodeo room, copy the Manifest URL below and paste it into your Owlbear Rodeo extension manager:

`https://lordcongra.github.io/poke-e-role/manifest.json`

_(Note: If the sheet updates, you can force Owlbear to fetch the newest version by adding a version tag to the end of the URL, like `?v=2.2.0`)_
