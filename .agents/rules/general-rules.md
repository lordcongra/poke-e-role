---
trigger: always_on
---

---
alwaysApply: true
---
# Pokerole Extension & PWA Guidelines

## Project Architecture & Tech Stack
- **Stack:** React + TypeScript + Vite (Owlbear Rodeo VTT Extension & Standalone PWA mode).
- **State Management:** Zustand, split into modular slices (`identitySlice`, `coreSlice`, `macroSlice`, `trackerSlice`, `homebrewSlice`, `syncSlice`, etc.).
- **Data Syncing:** Sync to Owlbear Rodeo or `localStorage` via a debounced adapter. Room settings key: `pokerole-pmd-extension/room-settings`.
- **Data Architecture:** Offline-first with local dataset caching.
- **Formatting:** Enforce Prettier formatting.

## Core Coding Guidelines
- **OBR Integration:** Use `OBR.assets.downloadImages()` for file picking. Use `OBR.scene.items.updateItems()` for token manipulation.
- **Strict Typing:** NO `any` type under any circumstances. Avoid `unknown`. Always reference `storeTypes.ts` and `entityTypes.ts` for exact naming (e.g., `hpMaxDisplay`, not `hpMax`).
- **State Flattening:** OBR metadata must remain flat (key/value strings, numbers, booleans). Never pass raw nested Zustand state to `saveToOwlbear`. Use mapping utilities (or `JSON.stringify()`).
- **Modularity:** 1 component per file. Extract repeated UI behavior into reusable components.
- **DRY Math:** Never hardcode stat/skill arithmetic inline. Always import pure functions from `src/utils/combatMath.ts` (e.g., `calculateStatTotal`).
- **Naming Conventions:** Legacy database keys (`acc1`, `dmg1`, `desc`, `inv`, `attr`) must NOT be refactored as they map to live metadata. NEW variables must use full, descriptive names (no new abbreviations).
- **Defensive Coding:** Wrap all `saveToOwlbear`, storage, and `localStorage` calls in `try/catch`. Catch blocks MUST include bracketed tags (e.g., `console.error('[TrackerSlice] Failed...', e)`).
- **Responsiveness:** Use Flexbox/Grid with `min-width: 0` and `@media (max-width: 768px)` for narrow OBR iframes and mobile viewports.

## v3.0.0 Mechanical Rules
- **Resource Decoupling:** Temp HP and Temp Will are strictly decoupled from Base pools. Activation costs/damage MUST drain Temp resources completely before touching Base pools.
- **Form Shifts:** Defined in `macroSlice.ts`. Base forms are backed up to token metadata. Form shifts can have HP/Will activation costs.
- **First Hit:** `First Hit Dmg` and `First Hit Acc` are global booleans in `trackerSlice.ts`, automatically consumed on attack rolls.

## v3.1.0 Design & UI Rules
- **Styling:** 1 CSS file per component. Semantic kebab-case class names.
- **Dynamic Theming Variables:** NEVER hardcode hex colors.
  - Accents/Borders: `var(--primary)` and `var(--secondary)`
  - Errors/Warnings: `var(--semantic-danger)`
  - Backgrounds: `var(--bg)`, `var(--panel-bg)`, `var(--panel-alt)`, `var(--row-odd)`, `var(--row-even)`
  - Text: `var(--text-main)` and `var(--text-muted)`
  - Buttons: Use `.action-button` paired with `--theme`, `--secondary`, `--red`, or `--dark`.
- **Global Typography Classes (Apply to TSX `className`):**
  - `.text-theme-header` (Headers on dynamic backgrounds)
  - `.text-title-primary` (Modal titles & major section headers)
  - `.text-label` (Input & grid labels)
  - `.text-subtext` (Hints, descriptions, captions)
  - `.text-value-highlight` (Numeric totals)
- **Icons (Lucide React):** Never use OS emojis or raw text characters (`⚠️`, `🗑️`, `X`). Replace with `lucide-react` components (e.g., `<AlertTriangle/>`, `<Trash2/>`) wrapped in a flex container with `gap: 6px`.