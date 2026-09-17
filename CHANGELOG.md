# Pokerole 3.0 Sheet - Changelog Archive (v2.x)

This document archives older release notes and migration history from the **v2.x** era of the Pokerole 3.0 Sheet. For current release notes, refer to the in-app changelog modal or release tags on GitHub.

---

## v2.8.1 (August 2026)

- **⚠️ Custom Action Rolls URL Change:** The **Custom Action Rolls (CAR)** extension moved to a new host (`https://custom-action-rolls.narcolepticdracu.com/manifest.json`).

---

## v2.8.0 (June 2026)

- **⚠️ ACTION REQUIRED: Dice+ Retirement Notice:** The legacy Dice+ engine was deprecated in favor of **Custom Action Rolls (CAR)** to support advanced features like exploding dice and dynamic roll logs.
- **🛠️ Homebrew Workshop Overhaul (Anti-Crash Update):**
    - **Local Storage Migration:** To prevent hitting Owlbear Rodeo's strict 16KB Room Data limit, Homebrew data was migrated directly to browser local storage with automatic porting.
    - **Peer-to-Peer Syncing:** Added a **📢 Share with Table** button using direct WebRTC broadcasting to send custom creations to everyone in the room without bloating OBR room metadata.
    - **Smart Merging:** Receiving a broadcast safely merges shared homebrew without overwriting existing creations.
    - **Unsaved Changes Indicator:** Added visual indicators when unexported changes are pending backup.

---

## v2.7.5 (May 2026)

- **🚨 Pretty Sordid Uninstallation:** Native initiative overhaul eliminated the requirement for the external "Pretty Sordid" extension.
- **🚀 Initiative Tracker Complete Overhaul:**
    - Built-in tracker rebuilt from the ground up natively into the sheet UI.
    - **Per-Player HUD:** Tracker placement, layout, and size bounds save locally to individual browser storage.
    - **Horizontal & Vertical Modes:** Seamless toggling between vertical list and horizontal bar tracker modes.
    - **Smart Bounds & Auto-Scrolling:** Scrollable tracker boundaries with smooth auto-scroll to the active turn combatant.
- **✨ Homebrew Statuses & Exploding Dice:**
    - **Custom Statuses:** Added ability to build custom status conditions with custom end-of-round damage/healing, action loss, and stat penalties.
    - **Exploding Dice Tag:** Introduced `[Acc Xs Add Dmg Limit Y]` tag syntax for CAR.
    - **Dual Scaling Moves:** Support for moves scaling off split stats (e.g. _Photon Geyser_).
    - **Workshop Duplication:** Added 📋 Duplicate buttons to Homebrew items.

---

## v2.7.0 (May 2026)

- Native Initiative Tracker rebuilt directly into the sheet.
- Added Initiative HUD settings for placement, dimension sizing, and layout customization.
- Deprecated reliance on the external Pretty Sordid extension.

---

## v2.6.0 (Legacy)

- Core improvements to the Pokémon generator logic under the hood.
- Added token image updater to re-link token graphics directly from the OBR image library on evolution.
- Introduced Custom Action Rolls (CAR) dice engine integration.
