# Poke-e-Role (Owlbear Rodeo Extension)

A highly automated, modular character sheet extension for playing **Pokerole 3.0** (and Pokemon Mystery Dungeon) within the Owlbear Rodeo VTT.

## ⚠️ REQUIRED PLUGINS
To use all the features of this character sheet, you **MUST** install the following Owlbear Rodeo extensions in your room:
1. **[Dice+](https://extensions.owlbear.rodeo/dice-plus):** Handles all 1-click 3D dice rolling (Accuracy, Damage, Evasion, Clashes, etc.)
2. **[Owl Trackers](https://extensions.owlbear.rodeo/owl-trackers):** Syncs the token's HP, Willpower, Defenses, and Action economy directly to the Owlbear map rings.
3. **[Pretty Sordid (Initiative)](https://extensions.owlbear.rodeo/pretty-sordid):** Grabs Initiative rolls from the sheet and automatically sorts the combat order (including decimal tie-breakers!).

---

## 🌟 Features

### 📊 Fully Automated Stat Calculation
* Enter your Base Stats, Ranks, Buffs, and Debuffs, and the sheet automatically calculates all Derived Stats (HP, Will, Defenses, Evasion, Clashes).
* Supports both **Pokemon** and **Trainer** modes, dynamically toggling relevant skills and clashes.

### ⚔️ Combat Economy Tracking
* Keep track of your actions in the "Round Tracker" panel. 
* Automatically increases your Action count when rolling attacks or maneuvers.
* Includes 1-click buttons for generic combat maneuvers (Grapple, Cover Ally, Ambush, etc.).

### 🌐 Live Database Fetching
* Type in the name of a Pokemon species, and the sheet will securely fetch its Base Stats, Typings, and Abilities directly from the official Pokerole 3.0 GitHub Database.
* Automatically color-codes your Typings with beautiful CSS gradients.
* Type in a Move name to automatically pull its Base Power, Category, Accuracy stats, and mechanical Effects.

### 💡 Dynamic Tooltips
* No more digging through PDFs during combat! Hover your mouse over your equipped Ability or any Move on your sheet to see a native tooltip explaining its exact mechanical effect. 
* Click the **"🔄 Refresh Token Data"** button to automatically backfill missing descriptions on older tokens!

### 🎲 1-Click Dice+ Integration
* Click the 🎯 or 💥 icons next to a move to instantly roll Accuracy or Damage.
* Automatically accounts for global Accuracy/Damage modifiers, STAB bonuses, and even the Protean/Libero abilities!
* Need a flat modifier to your successes? Use the "Succ" global modifier box for things like the *Low Accuracy* penalty.

### 🔒 GM Tools
* Built-in NPC Toggle. Mark a sheet as a "Private NPC" to instantly hide the sheet's contents from players, preventing meta-gaming.

---

## 🛠️ Installation
To install this extension into your Owlbear Rodeo room, use the following Manifest URL:
\`https://lordcongra.github.io/poke-e-role/manifest.json\`
*(Make sure GitHub Pages is enabled in your repository settings!)*