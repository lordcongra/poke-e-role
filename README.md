# Pokerole 3.0 Sheet v1.8 (Owlbear Rodeo Extension)

A highly automated, modular character sheet extension for playing **Pokerole 3.0** campaigns (including **Pokémon Mystery Dungeon / PMD** settings) within the Owlbear Rodeo VTT.

*A massive thank you to the creator of the **Owl Trackers** extension. Their incredible UI work and data management architecture were a massive inspiration for the custom graphics engine for the overhaul of this sheet!*

---

## ⚠️ REQUIRED PLUGINS
To use all the features of this character sheet, you **MUST** install the following Owlbear Rodeo extensions in your room:
1. **[Dice+](https://extensions.owlbear.rodeo/dice-plus):** Handles all 1-click 3D dice rolling (Accuracy, Damage, Evasion, Clashes, etc.).
2. **[Pretty Sordid (Initiative)](https://extensions.owlbear.rodeo/pretty-sordid):** Grabs Initiative rolls from the sheet and automatically sorts the combat order (including decimal tie-breakers!).

## 🎒 RECOMMENDED PLUGINS (Optional)
While these extensions do not tie directly into the character sheet, they are highly recommended for running immersive Pokerole campaigns:
* **[Persistent Tokens](https://extensions.owlbear.rodeo/persistent-tokens):** Makes your tokens and their character sheets persist between scenes! Extremely helpful so you don't have to constantly export and import JSONs when switching maps.
* **[Bag It!](https://extensions.owlbear.rodeo/bag-it):** Provides a real, visual inventory system for players to store, move, and trade items directly on the tabletop.
* **[Embers](https://extensions.owlbear.rodeo/embers):** An amazing tool for setting up visual spell and attack effects on the map. 
  > **Pro Tip:** Want a head start on your move animations? Reach out to **`@congra`** in the Pokerole Discord to get a copy of his custom Embers spell effects JSON!

---

## 📚 How to Use This Sheet (Quick Start Guide)
If you are new to the Pokerole Extension, here are a few core concepts to get you started:

1. **Selecting Tokens:** The sheet is entirely tied to the Owlbear Rodeo token system. Click on a token on the map to load its data. If you click away, the sheet will clear. 
2. **Token Scale Warning:** The visual UI (HP/Will bars, Defense badges) that hovers over your tokens works best on standard-sized or larger tokens. **Shrinking tokens to incredibly small scales can cause the UI graphics to break or overlap.**
3. **Pokémon vs. Trainer Mode:** Near the top of the sheet is a dropdown to swap between "Pokémon" and "Trainer". Swapping to Trainer will safely back up your Pokémon's stats, limits, and typing into memory, change your skills (e.g., "Channel" becomes "Throw"), and clear your typing. Swapping back to Pokémon perfectly restores all your saved data! Perfect for campaigns where players frequently jump between controlling a trainer and sending out a Pokémon.
4. **Refreshing Data:** If your moves or abilities ever look blank or are missing their tooltips (usually on older tokens), click the `🔄 Refresh` button at the top of the sheet to force the system to ping the database and backfill the missing descriptions.

---

## 🌟 Features

### 📊 Fully Automated Stat Calculation
* Enter your Base Stats, Ranks, Buffs, and Debuffs, and the sheet automatically calculates all Derived Stats (HP, Will, Defenses, Evasion, Clashes).
* **Lag-Free UI:** Stat calculations are debounced, meaning you can rapidly click the spinner arrows without the browser freezing or dropping frames!
* Also supports tracking for **Happiness** and **Loyalty**.
* **Form & Evolution Safe:** Change a Pokémon's species to update their base stats and typing *without* wiping their invested skills and moves!

### 🎲 Custom Action Rolls & Auto-Generator
* **Out-of-Combat Roleplay:** Create up to 10 Custom Action Rolls (e.g., *Investigate*, *Persuade*, *Climb*) using any combination of Core Attributes and Skills.
* **Smart Auto-Generator:** Instantly draft Wild, Average, or Min-Max builds based on your Rank. The "Waterfall Algorithm" intelligently caps your core attacking and defending stats before allocating remaining points, dynamically adjusting to your combat bias (Tank, Physical, Special, etc.).

### 📈 Soft Caps, Limits, & PMD Overrides
* Automatically calculates your maximum Attribute, Social, and Skill point limits based on your currently selected Rank and Age.
* Tracks your spent points and warns you if you exceed standard limits.
* **Auto-Fetches Stat Caps:** Automatically queries the API to display the maximum Attribute limits for your specific Pokémon species. 
* **PMD / Homebrew Friendly:** Includes "Extra Pts" override boxes, allowing GMs to reward extra stats for completing dungeons/quests/events, using special items, etc. without breaking the sheet's logic.

### ⏱️ Dynamic Status, Pain, & Timers (w/ Map Sync)
* **Pain Penalization:** The sheet automatically monitors your HP and deducts -1 or -2 successes from your rolls when you are badly hurt (automatically skipping Vitality/Will rolls). There is a toggle to disable pain penalizations if you are playing a homebrew without these rules.
* **Status Penalties:** Automatically applies mechanical penalties for Confusion (success drops scaling with Rank) and Paralysis (-2 Dice to Dex rolls), and prevents actions if Asleep or Frozen.
* **Smart Ability Overrides:** Hardcoded exceptions for abilities like Limber, Comatose, Insomnia, Vital Spirit, and Sweet Veil so they properly bypass status penalties! Not all abilities are accounted for. If an ability simply does a stat increase, just account for that with the + dmg/acc/etc through the sheet in the Moves section.
* **Auto-Ticking Effects:** Track terrain, weather, or screens (like Tailwind or Reflect) in the "Timers" box. Clicking the "Reset Round" button automatically ticks these timers down by 1.
* **1-Click Status Recovery:** Click the 🎲 icon next to a status to automatically calculate and roll your recovery pool. 
* **Visual Map Trackers:** Any active timer, status, or HP/Will change automatically updates the highly visible, color-coded custom UI graphics natively drawn over your token on the map so the GM never loses track of combat!
* **Roleplay Mode:** Click the "⚙️" icon on the Trackers bar at the top of the sheet to fully customize exactly which UI elements (Bars, Text, Badges) render over your token, allowing you to instantly hide map rings during intense roleplay moments. The checkbox on the Trackers button itself will fully disable all UI trackers on the token in one click as well.

### ⚔️ Willpower & Combat Economy
* **Willpower Mechanics:** Dedicated 1-click buttons to spend Willpower for "Pushing Fate" (+1 Auto Success), "Take Your Chances" (gain reroll stacks), and "Power Through the Pain" (ignore Pain Penalties for the scene).
* **Interactive Rerolls:** A dedicated reroll prompt lets you choose exactly how many failed dice to pick back up and reroll using your active "Take Your Chances" stacks.
* **Action Tracking:** Automatically increases your Action count and checks off your Evasion/Clash trackers when rolling attacks or maneuvers.
* **Generic Maneuvers:** 1-click dropdown for combat maneuvers (Grapple, Cover Ally, Ambush, etc.).
* Dim your used moves with the inline **(✔)** checkbox to track your action economy, then click the **Reset** button to clear the board for the next turn.

### 🎒 Inventory, Tags, & Progression
* **The Tag Builder:** Click the `🏷️` icon next to any item in your inventory or move in your move list to open the Tag Builder. This tool lets you easily attach mechanical modifiers (e.g., `[Dmg +2]`, `[Acc -1: Fire]`, `[Str +1]`, `[Status: Poison]`, `[High Crit]`). 
* **Smart Item Auto-Fill:** The sheet automatically recognizes standard items! Type "Life Orb", "Choice Scarf", or "Eviolite" into the name box, and the engine will automatically fetch the description and inject the perfect mechanical tags for you! Homebrew items are supported through the tag builder, simply add the tags you'd like the item to have and the sheet will handle the rest.
* **Important Note on Complex Items:** Some items (like *Safety Goggles* or *White Herb*) rely on highly specific triggers or keywords that cannot be safely automated without massive technical debt. These items must be handled manually by the GM and Players using the honor system. Always read your item descriptions! If an item does not explicitly have a `[Bracketed]` tag generated for it, the engine is relying on you to remember its effects.
* **Training Points (TP) & Poké (PD):** Keep track of your character's progression currency and wealth with dedicated, auto-saving trackers at the bottom of the sheet.

### 🎲 1-Click Dice+ & Broadcast Integration
* **OBR Notifications:** Every roll triggers a beautiful Owlbear Rodeo broadcast notification announcing the move, pain penalties, active item buffs, and required successes to the whole table!
* **Pure Math Routing:** Dice+ and the sheet handles most of the math for you! *Note: Most abilities that grant specific statistical increases (like +1 damage dice to Fire moves) still need to be accounted for manually using the global modifier boxes on the Moves panel.*
* **Smart Combat:** Automatically accounts for global Accuracy/Damage modifiers, STAB bonuses, Protean/Libero, and even grants +3 dice on Critical Hits for the *Sniper* ability.

### 🌐 Live Database Fetching & Offline Resilience
* **Lazy Caching (Rate Limit Protection):** The app automatically saves a local copy of Pokémon, Moves, and Abilities as you load them. If the GitHub API goes down or you hit a network rate limit, the sheet will seamlessly degrade to your local cache, allowing you to keep playing uninterrupted!
* Type in the name of a Pokémon species, and the sheet securely fetches its Base Stats, Typings, and Abilities directly from the official Pokerole 3.0 GitHub Database.
* **Hybrid Ability Datalist:** The Ability box automatically suggests a Pokémon's native abilities first, but acts as a fully searchable, editable text box. Perfect for global searches, homebrew, or mid-battle ability changes like *Mummy* or *Skill Swap*!
* **Global Move Library:** Start typing a move name to instantly search the entire Pokerole global library to pull the move's Base Power, Category, Accuracy stats, and mechanical Effects. For moves with unique scaling behaviors, it is recommended to just change the Power of the move to the appropriate amount of dice it should roll.
* **Homebrew Moves:** Type in a custom move name, set the typing, the stats it scales with, and the sheet will do the rest of the math for you!

### 🛡️ Auto-Calculating Type Matchups
* Never stop combat to check a type chart again. The sheet automatically calculates and displays a Pokémon's defensive weaknesses and resistances (4x, 2x, 0.5x, 0.25x, 0x) based on their current typing or dual-typing. You will still need to account for the extra/reduced damage from type advantages yourself when calculating damage. This sheet handles the dice rolls, but does not automatically apply damage as that can lead to syncing issues.
* Fully supports items like the *Ring Target* or *Iron Ball* to dynamically rewrite the type chart on the fly!

### 📖 Built-In Learnset Pokédex
* Scroll to the bottom of your moves to find the **View Learnset** button. Instantly builds a collapsible, rank-ordered list of every move your Pokémon can learn.

### 💡 Dynamic Tooltips & Modifiers
* No more digging through PDFs during combat! Hover your mouse over your equipped Ability or any Move on your sheet to see a native tooltip explaining its exact mechanical effect. Click the ? if you are on a touchscreen device to get the same description!

### 📝 Custom Homebrew Fields
* Click the `+ Add Custom Field` button at the top to inject custom labels and text inputs. Perfect for tracking campaign-specific mechanics or character traits.
* **Renamable Skills:** Every base skill on the sheet (like Brawl, Evasion, or Charm) can be clicked and renamed to perfectly fit your table's custom rules or setting!

### 🔒 GM Tools
* **Built-in NPC Toggle:** Mark a sheet as a "Private NPC" to instantly hide the sheet's contents from players, preventing meta-gaming during boss fights. *(Note: Players cannot see this button, preventing them from accidentally locking themselves out of their own sheets!)*

---

## 🛠️ Installation
To install this extension into your Owlbear Rodeo room, copy the Manifest URL below and paste it into your Owlbear Rodeo extension manager:

`https://lordcongra.github.io/poke-e-role/manifest.json`

*(Note: If the sheet updates, you can force Owlbear to fetch the newest version by adding a version tag to the end of the URL, like `?v=1.8.0`)*