# Pokerole PMD Owlbear Rodeo Extension

## Tech Stack
* Vite + Vanilla TypeScript
* Owlbear Rodeo SDK (`@owlbear-rodeo/sdk`)
* No frontend frameworks (No React/Vue). Pure DOM manipulation.

## Architecture & Data Flow
1. **App State:** The source of truth is `appState.currentTokenData` inside `src/state.ts`.
2. **Reactivity:** UI changes update `appState`, which then triggers `saveBatchDataToToken()` to sync with the Owlbear Rodeo token metadata.
3. **Token Load:** When a token is clicked, `loadDataFromToken()` reads the OBR metadata and populates the UI and `appState`.
4. **Modularity:** UI generation is split into `src/components/`, and Event Listeners are split into `src/listeners/`. `src/ui.ts` and `src/listeners.ts` act as Barrel Files.

## Core Types
\`\`\`typescript
export interface Move { id: string; name: string; attr: string; skill: string; type: string; cat: string; dmg: string; power: number; dmgStat: string; desc?: string; used?: boolean; }
export interface SkillCheck { id: string; name: string; attr: string; skill: string; }
export interface InventoryItem { id: string; qty: number; name: string; desc: string; active?: boolean; }
export interface ExtraSkill { id: string; name: string; base: number; buff: number; }
export interface ExtraCategory { id: string; name: string; skills: ExtraSkill[]; }
export interface StatusItem { id: string; name: string; customName: string; rounds: number; }
export interface EffectItem { id: string; name: string; rounds: number; }
export interface CustomInfo { id: string; label: string; value: string; }
\`\`\`

## File Tree
* `src/`
  * `@types/index.ts` (Strict type definitions)
  * `components/` (DOM utilities, Moves, Inventory, Action Rolls, Skills, Status, Matchups)
  * `listeners/` (UI, Manager, and Character listener setups)
  * `api.ts` (Regex-based fetching from GitHub DBs)
  * `combat.ts` (Dice math, pain penalties, and Dice+ integration)
  * `math.ts` (Stat derivation and limits)
  * `obr.ts` (Owlbear Rodeo SDK wrappers and debounced saving)
  * `state.ts` (Global appState and syncDerivedStats)
  * `sync.ts` (Token loading and Room metadata sync)