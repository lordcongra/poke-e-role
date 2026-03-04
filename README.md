# Owlbear Rodeo: PokéRole PMD Extension

A custom character sheet extension for Owlbear Rodeo designed specifically for the PokéRole TTRPG system (with full support for Pokémon Mystery Dungeon and standard Trainer campaigns).

## Features
* **Live Token Sync:** Instantly saves all HP, Will, stats, moves, and inventory directly to the selected Owlbear token's metadata.
* **Auto-Calculating Stats:** Automatically derives Max HP, Will, Evasion, Clash, Initiative, and Dice Pools based on Base Stats, Rank, and Buffs/Debuffs.
* **Smart STAB Integration:** Checks the Pokémon's typing (and abilities like Protean/Libero) against the move type to automatically inject STAB dice into damage rolls.
* **Third-Party Integrations:**
  * **Dice+:** Formats and sends all Accuracy, Damage, and Skill rolls directly to the 3D Dice+ extension.
  * **Pretty Sordid (Initiative):** Rolls Initiative, handles automatic 1d6 decimal tie-breakers (e.g., `7.4`), and pushes the final value to the Pretty Sordid turn tracker.
  * **Owl Trackers:** Mirrors the HP, Will, Action, and Defense inputs directly into the floating token stat bubbles.
* **Dynamic UI:** Toggleable "Trainer Mode" swaps skill names and hides the Special stat. Includes a dynamic Custom Skill Category generator.

## Tech Stack
* Vanilla HTML / CSS / TypeScript
* Built with [Vite](https://vitejs.dev/)
* [Owlbear Rodeo SDK](https://docs.owlbear.rodeo/docs/getting-started)

## Running the Extension Locally

To test and modify this extension on your local machine, follow these steps:

### 1. Install Dependencies
Make sure you have [Node.js](https://nodejs.org/) installed. Open your terminal in the project directory and run:
`npm install`

### 2. Start the Local Dev Server
Run the Vite development server:
`npm run dev`
*This will usually host the extension at `http://localhost:5173`.*

### 3. Connect to Owlbear Rodeo
To test the sheet inside an actual VTT environment:
1. Open an [Owlbear Rodeo](https://www.owlbear.rodeo/) room in your browser.
2. Click on your **Profile icon** (bottom left) -> **Extensions**.
3. Click the **+** (Add Extension) button.
4. Paste your local manifest URL: `http://localhost:5173/manifest.json`
5. Click **Add**.

*Note: For the full experience, ensure you also have the **Dice+** and **Pretty Sordid** extensions installed in your Owlbear room.*

## Architecture Notes for Reviewers
* **DOM & Event Listeners:** Because the DOM is rebuilt dynamically (especially in the Moves and Inventory tables), we use a generic `document.querySelectorAll` event listener at the bottom of `main.ts` to attach auto-saving functions to all inputs.
* **Token Memory:** All data is stored in the token metadata under the `pokerole-extension/stats` key.
* **Network Throttling:** To prevent network lag during rapid input (like typing a word or using a number spinner), state calculations happen on the `input` event locally, but the actual OBR metadata sync is deferred to the `change` event.