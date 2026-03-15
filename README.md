# Pokerole 3.0 Sheet v1.4 (Owlbear Rodeo Extension)

A highly automated, modular character sheet extension for playing **Pokerole 3.0** campaigns (including **Pokémon Mystery Dungeon / PMD** settings) within the Owlbear Rodeo VTT.

## ⚠️ REQUIRED PLUGINS
To use all the features of this character sheet, you **MUST** install the following Owlbear Rodeo extensions in your room:
1. **[Dice+](https://extensions.owlbear.rodeo/dice-plus):** Handles all 1-click 3D dice rolling (Accuracy, Damage, Evasion, Clashes, etc.).
2. **[Owl Trackers](https://extensions.owlbear.rodeo/owl-trackers):** Syncs the token's HP, Willpower, Defenses, and Action economy directly to trackers on the tokens.
3. **[Pretty Sordid (Initiative)](https://extensions.owlbear.rodeo/pretty-sordid):** Grabs Initiative rolls from the sheet and automatically sorts the combat order (including decimal tie-breakers!).

## 🎒 RECOMMENDED PLUGINS (Optional)
While these extensions do not tie directly into the character sheet, they are highly recommended for running immersive Pokerole campaigns:
* **[Bag It!](https://extensions.owlbear.rodeo/bag-it):** Provides a real, visual inventory system for players to store, move, and trade items directly on the tabletop.
* **[Embers](https://extensions.owlbear.rodeo/embers):** An amazing tool for setting up visual spell and attack effects on the map. 
  > **Pro Tip:** Want a head start on your move animations? Reach out to **`@congra`** in the Pokerole Discord to get a copy of his custom Embers spell effects JSON!

---

## 🌟 Features

### 📊 Fully Automated Stat Calculation
* Enter your Base Stats, Ranks, Buffs, and Debuffs, and the sheet automatically calculates all Derived Stats (HP, Will, Defenses, Evasion, Clashes).
* Also supports tracking for **Happiness** and **Loyalty**.
* Supports both **Pokémon** and **Trainer** modes, dynamically toggling relevant skills and clashes.
* **Form & Evolution Safe:** Change a Pokémon's species to update their base stats and typing *without* wiping their invested skills and moves!

### 📈 Soft Caps, Limits, & PMD Overrides
* Automatically calculates your maximum Attribute, Social, and Skill point limits based on your currently selected Rank and Age.
* Tracks your spent points and warns you if you exceed standard limits.
* **Auto-Fetches Stat Caps:** Automatically queries the API to display the maximum Attribute limits for your specific Pokémon species. 
* **PMD / Homebrew Friendly:** Includes "Extra Pts" override boxes, allowing GMs to reward extra stats for completing dungeons, using special items, etc. without breaking the sheet's logic.

### ⏱️ Dynamic Status, Pain, & Timers (w/ Map Sync)
* **Pain Penalization:** The sheet automatically monitors your HP and deducts -1 or -2 successes from your rolls when you are badly hurt (automatically skipping Vitality/Will rolls).
* **Status Penalties:** Automatically applies mechanical penalties for Confusion (success drops scaling with Rank) and Paralysis (-2 Dice to Dex rolls), and prevents actions if Asleep or Frozen.
* **Smart Ability Overrides:** Hardcoded exceptions for abilities like Limber, Comatose, Insomnia, Vital Spirit, and Sweet Veil so they properly bypass status penalties!
* **Auto-Ticking Effects:** Track terrain, weather, or screens (like Tailwind or Reflect) in the "Timers" box. Clicking the "Reset Round" button automatically ticks these timers down by 1.
* **1-Click Status Recovery:** Click the 🎲 icon next to a status to automatically calculate and roll your recovery pool. 
* **Owl Trackers Integration:** Any active timer or status automatically spawns a highly visible color-coded tracker on your token on the map so the GM never forgets it!
* **Roleplay Mode:** Click the "⭕ Trackers" toggle at the top of the sheet to instantly hide all of your map rings during intense roleplay moments.

### ⚔️ Willpower & Combat Economy
* **Willpower Mechanics:** Dedicated 1-click buttons to spend Willpower for "Pushing Fate" (+1 Auto Success), "Take Your Chances" (gain reroll stacks), and "Power Through the Pain" (ignore Pain Penalties for the scene).
* **Interactive Rerolls:** A dedicated reroll prompt lets you choose exactly how many failed dice to pick back up and reroll using your active "Take Your Chances" stacks.
* **Action Tracking:** Automatically increases your Action count and checks off your Evasion/Clash trackers when rolling attacks or maneuvers.
* **Generic Maneuvers:** 1-click dropdown for combat maneuvers (Grapple, Cover Ally, Ambush, etc.).
* Dim your used moves with the inline **(✔)** checkbox to track your action economy, then click the **Reset** button to clear the board for the next turn.

### 🎒 Inventory, Tags, & Progression
* **Smart Item Tags:** Type bracketed tags like `[Dmg +2]`, `[Acc -1: Fire]`, `[Str +1]`, or `[High Crit]` in your item descriptions. The sheet automatically parses them and applies the math to your rolls while the item is equipped! If there is an effect you would like added, contact @congra in the discord.
* **Training Points (TP) & Poké (PD):** Keep track of your character's progression currency and wealth with dedicated, auto-saving trackers at the bottom of the sheet.

### 🎲 1-Click Dice+ & Broadcast Integration
* **OBR Notifications:** Every roll triggers a beautiful Owlbear Rodeo broadcast notification announcing the move, pain penalties, active item buffs, and required successes to the whole table!
* **Pure Math Routing:** Dice+ and the sheet handles most of the math for you! Only most abilities that just give statistical increases like +1 damage dice to fire moves still need to accounted for with the augments on the moves sheet.
* **Smart Combat:** Automatically accounts for global Accuracy/Damage modifiers, STAB bonuses, Protean/Libero, and even grants +3 dice on Critical Hits for the *Sniper* ability.

### 🌐 Live Database Fetching
* Type in the name of a Pokémon species, and the sheet securely fetches its Base Stats, Typings, and Abilities directly from the official Pokerole 3.0 GitHub Database.
* **Hybrid Ability Datalist:** The Ability box automatically suggests a Pokémon's native abilities first, but acts as a fully searchable, editable text box. Perfect for global searches, homebrew, or mid-battle ability changes like *Mummy* or *Skill Swap*!
* **Global Move Library:** Start typing a move name to instantly search the entire Pokerole global library to pull the move's Base Power, Category, Accuracy stats, and mechanical Effects. For moves with unique scaling behaviors it is recommended to just change the Power of the move to the appropriate amount of dice it should roll.
* **Homebrew Moves:** Type in a custom move name, set the typing, the stats it scales with, and the sheet will do the rest of the math for you!

### 🛡️ Auto-Calculating Type Matchups
* Never stop combat to check a type chart again. The sheet automatically calculates and displays a Pokémon's defensive weaknesses and resistances (4x, 2x, 0.5x, 0.25x, 0x) based on their current typing or dual-typing.

### 📖 Built-In Learnset Pokédex
* Scroll to the bottom of your moves to find the **View Learnset** button. Instantly builds a collapsible, rank-ordered list of every move your Pokémon can learn.

### 💡 Dynamic Tooltips & Modifiers
* No more digging through PDFs during combat! Hover your mouse over your equipped Ability or any Move on your sheet to see a native tooltip explaining its exact mechanical effect. 
* Click the **"🔄 Refresh Token Data"** button to automatically backfill missing descriptions on older tokens!

### 📝 Custom Homebrew Fields
* Click the `+ Add Custom Field` button at the top to inject custom labels and text inputs. Perfect for tracking campaign-specific mechanics or character traits.

### 🔒 GM Tools
* **Built-in NPC Toggle:** Mark a sheet as a "Private NPC" to instantly hide the sheet's contents from players, preventing meta-gaming during boss fights. *(Note: Players cannot see this button, preventing them from accidentally locking themselves out of their own sheets!)*

---

## 🛠️ Installation
To install this extension into your Owlbear Rodeo room, copy the Manifest URL below and paste it into your Owlbear Rodeo extension manager:

`https://lordcongra.github.io/poke-e-role/manifest.json`

*(Note: If the sheet updates, you can force Owlbear to fetch the newest version by adding a version tag to the end of the URL, like `?v=1.4.0`)*