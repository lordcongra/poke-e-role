# Pokerole 3.0 Sheet v2.4.5 (Owlbear Rodeo Extension)

A highly automated, modular character sheet extension for playing **Pokerole 3.0** campaigns (including **Pokémon Mystery Dungeon / PMD** settings) within the Owlbear Rodeo VTT.

_A massive thank you to the creator of the **Owl Trackers** extension. Their incredible UI work and data management architecture were a massive inspiration for the custom graphics engine for the overhaul of this sheet!_

---

## ⚠️ REQUIRED PLUGINS

To use all the features of this character sheet, you **MUST** install **Pretty Sordid** and **at least one (though having both is recommended to test which you like better)** of the following Dice Engines:

1. **[Custom Action Rolls (CAR)](https://owlbear.rogue.pub/extension/https://action-manager.onrender.com/manifest.json):** Handles 3D dice and features a persistent, pop-out chat log styled like the sheet(more consistent visual theming) to track roll history (found in "Log" button inside the CAR extension). Gives a more detailed breakdown of rolls in the log. Creating your dice visuals can take more time but has more options. This option tends to have better performance on Firefox.
   _- AND/OR -_
2. **[Dice+](https://extensions.owlbear.rodeo/dice-plus):** The classic engine (this was the first integration, Custom Action Rolls is new). Handles 1-click 3D physics dice and has roll history but is somewhat more difficult to find. Is a physics-based engine so it can sometimes lose accuracy at high dice counts (trust the GM roll result). Creating your dice is faster usually but gated with some premium features.

_(Note: You can swap between these engines at any time for the whole room using the "📜 Rules" menu on the sheet!)_

3. **[Pretty Sordid (Initiative)](https://extensions.owlbear.rodeo/pretty-sordid):** Grabs Initiative rolls from the sheet and automatically sorts the combat order (including decimal tie-breakers!).

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

### 🧬 Form Shifts & Transformations

- **Built-In Transformations:** Instantly shift your Pokémon into Mega Evolutions, Dynamax, Gigantamax, or Terastallize states with a single click.
- **Native Image Swapping:** Use the built-in Owlbear Rodeo asset picker to assign specific images to your forms! When you transform, the sheet natively overwrites the token graphic on the map, and perfectly restores your original image when you revert.
- **Automated Memory:** The engine automatically safely backs up your Base Form (Stats, Typing, Moves) into the token's memory and perfectly restores it when you revert!
- **Dynamic Mechanics:** Transformations automatically handle complex mechanics like applying STAB for Tera Types, generating Temporary HP Shields, managing 3-round Max Timers, and converting standard attacks into Max Moves!

### 🛠️ The Homebrew Workshop

- **Fully Custom Database:** Create your own custom Pokémon, Moves, Abilities, Items, and even completely new Typings (with custom weakness/resistance charts).
- **Custom Form Builder:** Design custom transformations (like Boss phases or unique forms). Define exactly what swaps (Base Stats, Typing, Abilities) vs what clears (Statuses, Buffs, Debuffs) and even configure custom HP/Will activation costs!
- **Live Room Sync:** Anything you build in the Workshop instantly syncs to the room database, making it immediately available in the dropdown menus for every player!
- **GM Spoiler Protection:** Check the "GM Only" box on any custom creation to keep it hidden from the players' Workshop and dropdown menus until you are ready to reveal the boss!
- **Backup & Restore:** Easily export your entire Homebrew Workshop as a JSON file to share with other GMs or carry over to a new campaign room.

### 🏅 Trainer Badges & Achievements

- **Trainer Progression:** When using the sheet in "Trainer Mode", players have access to a dedicated Badges section under their Social Attributes.
- **Visual Identity:** Name your badges and use a sleek, native emoji-picker UI to proudly display your hard-earned Gym Badges or campaign achievements directly on your sheet!

### 🎁 The Loot Generator

- **Automated Drop Tables:** Takes the heavy lifting out of session prep and dungeon crawling. Select the pockets/categories you want to pull from (e.g., Berries, Held Items, TMs) and generate instant loot drops.
- **Two-Stage RNG Engine:** Attempts to weight common items (like Potions) against rare items (like Mega Stones) so you don't accidentally over-reward your players. It's not perfect but it gets the job done.
- **Legendary Filtering:** Easily toggle the inclusion of extremely rare, game-breaking legendary items with a single checkbox. This includes things like master balls, rare candy, etc. It will also include anything in the Homebrew Workshop that you tag as Legendary rarity.
- **GM Access Control:** By default, the generator is a GM-exclusive tool, but it can be globally unlocked for players via the Room Rules menu!

### 🌐 Live Database Fetching & Offline Resilience

- **Offline-First Architecture:** The extension now ships with a pre-compiled local database of Pokémon, Abilities, Natures, Moves, and Items. It loads instantly and is completely immune to third-party API rate limits or network outages!
- **Seamless Live Fallback:** If you type in the name of a brand-new Pokémon that isn't in your local database yet, the app intelligently falls back to the live Pokerole-Data repository to fetch the stats, completely bypassing API limits in the process.

### 📊 Fully Automated Stat Calculation

- Enter your Base Stats, Ranks, Buffs, and Debuffs, and the sheet automatically calculates all Derived Stats (HP, Will, Defenses, Evasion, Clashes).
- **Lag-Free UI:** Stat calculations are handled by a hyper-fast React engine, meaning you can rapidly click the spinner arrows without the browser freezing or dropping frames!
- Also supports tracking for **Happiness** and **Loyalty**.
- **Form & Evolution Safe:** Change a Pokémon's species to update their base stats and typing _without_ wiping their invested skills and moves!

### 🎲 Action Rolls & Auto-Generator

- **Out-of-Combat Roleplay:** Create up to 10 custom Action Rolls (e.g., _Investigate_, _Persuade_, _Climb_) using any combination of Core Attributes and Skills.
- **Smart Auto-Generator:** Instantly draft Wild, Average, or Min-Max builds based on your Rank. The algorithm intelligently caps your core attacking and defending stats before allocating remaining points, dynamically adjusting to your combat bias (Tank, Physical, Special, Support, etc.).

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
- **Decoupled Temp Pools:** Independently track and manage Temporary HP and Temporary Willpower. Automated UI bars visually overlay the Temp points directly onto your base resource bars! (Temp Will spends first and Temp HP takes damage first - made for homebrew mechanics, though Temp HP exists for dynamax/gigantamax integration).

### 🎒 Inventory, Tags, & Progression

- **The Tag Builder:** Click the `🏷️` icon next to any item in your inventory or move in your move list to open the Tag Builder. This tool lets you easily attach mechanical modifiers (e.g., `[Dmg +2]`, `[Acc -1: Fire]`, `[Str +1]`, `[Status: Poison]`, `[High Crit]`, `[First Hit Dmg +3]`).
- **Smart Item Auto-Fill:** The sheet automatically recognizes standard items! Type "Life Orb", "Choice Scarf", or "Eviolite" into the name box, and the engine will automatically fetch the description and inject the perfect mechanical tags for you!
- **Training Points (TP) & Poké (PD):** Keep track of your character's progression currency and wealth with dedicated, auto-saving trackers at the bottom of the sheet.

### 🎲 Dice Engine Integration (CAR vs. Dice+)

- **Pure Math Routing:** Our engine handles the math for you! Broadcasts are natively formatted to support both the **Dice+** and **Custom Action Rolls (CAR)** extensions.
- **Which should I choose?**
    - **Custom Action Rolls (CAR):** Uses internal math rather than pure physics, making it more performance-lite (especially on Firefox) and perfectly synced for all players, regardless of how massive the dice pool gets. It also includes a persistent chat log!
    - **Dice+:** A pure 3D physics-based roller. It runs smoothly on Google Chrome, but keep in mind that very large dice pools (12+ dice) might occasionally show visual inaccuracies for non-GMs due to physics desyncs across the network.
- **OBR Notifications:** Every roll triggers an Owlbear Rodeo broadcast notification announcing the move, pain penalties, active item buffs, and required successes to the whole table!
- **Smart Combat:** Automatically accounts for global Accuracy/Damage modifiers, STAB bonuses, Protean/Libero, Super Luck, and even grants +3 dice on Critical Hits for the _Sniper_ ability.

### 🛡️ Auto-Calculating Type Matchups

- Never stop combat to check a type chart again. The sheet automatically calculates and displays a Pokémon's defensive weaknesses and resistances (4x, 2x, 0.5x, 0.25x, 0x) based on their current typing or dual-typing.
- Fully supports items like the _Ring Target_ or _Iron Ball_ to dynamically rewrite the type chart on the fly!

### 🔒 Room Rules & GM Tools

- **Global Room Rules:** GMs can click the "📜 Rules" button to globally configure the active Dice Engine, dictate how HP/Spec Def is calculated for the room, and completely disable/enable Pain Penalties for all players!
- **Homebrew Access Control:** GMs can set Homebrew permissions to "Full Access", "View Only", or completely hide the Workshop from the players' screens.
- **Built-in NPC Toggle:** Mark a sheet as a "Private NPC" to instantly hide the sheet's contents from players, preventing meta-gaming during boss fights.

---

## 🛠️ Installation

To install this extension into your Owlbear Rodeo room, copy the Manifest URL below and paste it into your Owlbear Rodeo extension manager:

`https://lordcongra.github.io/poke-e-role/manifest.json?v=2.4.5`

_(Note: If the sheet updates, you can force Owlbear to fetch the newest version by bumping the version tag at the end of the URL!)_
