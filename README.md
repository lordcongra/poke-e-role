# Pokerole 3.0 Sheet (Owlbear Rodeo Extension)

A highly automated, modular character sheet extension for playing **Pokerole 3.0** and **Pokémon Mystery Dungeon (PMD)** campaigns within the Owlbear Rodeo VTT.

## ⚠️ REQUIRED PLUGINS
To use all the features of this character sheet, you **MUST** install the following Owlbear Rodeo extensions in your room:
1. **[Dice+](https://extensions.owlbear.rodeo/dice-plus):** Handles all 1-click 3D dice rolling (Accuracy, Damage, Evasion, Clashes, etc.).
2. **[Owl Trackers](https://extensions.owlbear.rodeo/owl-trackers):** Syncs the token's HP, Willpower, Defenses, and Action economy directly to the Owlbear map rings.
3. **[Pretty Sordid (Initiative)](https://extensions.owlbear.rodeo/pretty-sordid):** Grabs Initiative rolls from the sheet and automatically sorts the combat order (including decimal tie-breakers!).

## 🎒 RECOMMENDED PLUGINS (Optional)
While these extensions do not tie directly into the character sheet, they are highly recommended for running immersive Pokerole/PMD campaigns:
* **[Bag It!](https://extensions.owlbear.rodeo/bag-it):** Provides a real, visual inventory system for players to store, move, and trade items directly on the tabletop.
* **[Embers](https://extensions.owlbear.rodeo/embers):** An amazing tool for setting up visual spell and attack effects on the map. 
  > **Pro Tip:** Want a massive head start on your move animations? Reach out to **`@congra`** in the official Pokerole Discord to get a copy of his custom Embers spell effects JSON!

---

## 🌟 Features

### 📊 Fully Automated Stat Calculation
* Enter your Base Stats, Ranks, Buffs, and Debuffs, and the sheet automatically calculates all Derived Stats (HP, Will, Defenses, Evasion, Clashes).
* Supports both **Pokémon** and **Trainer** modes, dynamically toggling relevant skills and clashes.
* **Form & Evolution Safe:** Change a Pokémon's species to update their base stats and typing *without* wiping their invested skills and moves!

### 🛡️ Auto-Calculating Type Matchups
* Never stop combat to check a type chart again. The sheet automatically calculates and displays a Pokémon's defensive weaknesses and resistances (4x, 2x, 0.5x, 0.25x, 0x) based on their current dual-typing.

### 🩺 Dynamic Multi-Status System
* Easily track multiple debilitating conditions at once. Stack Burn, Confusion, Paralysis, and more on a single token using the dynamic dropdown interface.

### 🌐 Live Database Fetching
* Type in the name of a Pokémon species, and the sheet securely fetches its Base Stats, Typings, and Abilities directly from the official Pokerole 3.0 GitHub Database.
* Automatically color-codes your Typings with beautiful CSS gradients.
* Type in a Move name to automatically pull its Base Power, Category, Accuracy stats, and mechanical Effects.

### 💡 Dynamic Tooltips & Modifiers
* No more digging through PDFs during combat! Hover your mouse over your equipped Ability or any Move on your sheet to see a native tooltip explaining its exact mechanical effect. 
* Click the **"🔄 Refresh Token Data"** button to automatically backfill missing descriptions on older tokens!
* Easily add global Accuracy, Damage, or Success modifiers for weather, terrain, or buffs. Hover over the modifier inputs for quick rule reminders.

### 🎲 1-Click Dice+ Integration
* Click the 🎯 or 💥 icons next to a move to instantly roll Accuracy or Damage.
* Automatically accounts for global Accuracy/Damage modifiers, STAB bonuses, and even the Protean/Libero abilities!
* Need a flat modifier to your successes? Use the "Succ" global modifier box for things like the *Low Accuracy* penalty.

### ⚔️ Combat Economy Tracking
* Keep track of your actions in the "Round Tracker" panel. 
* Automatically increases your Action count when rolling attacks or maneuvers.
* Includes 1-click buttons for generic combat maneuvers (Grapple, Cover Ally, Ambush, etc.).

### 📝 Custom Homebrew Fields
* Click the `+ Add Custom Field` button at the top to inject custom labels and text inputs. Perfect for tracking campaign-specific mechanics, distinct PMD traits, or homebrew rules.

### 🔒 GM Tools
* Built-in NPC Toggle. Mark a sheet as a "Private NPC" to instantly hide the sheet's contents from players, preventing meta-gaming during boss fights.

---

## 🛠️ Installation
To install this extension into your Owlbear Rodeo room, copy the Manifest URL below and paste it into your Owlbear Rodeo extension manager:
```text
[https://lordcongra.github.io/poke-e-role/manifest.json](https://lordcongra.github.io/poke-e-role/manifest.json)