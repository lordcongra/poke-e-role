import type { ReactNode } from 'react';
import {
    Users,
    Map,
    Scroll,
    Search,
    Swords,
    Shield,
    ImageIcon,
    Palette,
    Dices,
    Crown,
    Link2,
    Accessibility,
    Smartphone,
    BookOpen,
    Zap,
    Layers,
    Sliders,
    Lock
} from 'lucide-react';

export const CURRENT_VERSION = '3.6.4';

export interface ChangelogEntry {
    version: string;
    date: string;
    changes: ReactNode[];
}

export const CHANGELOG_DATA: ChangelogEntry[] = [
    {
        version: '3.6.4',
        date: 'September 2026',
        changes: [
            <strong key="hud-refinement-title" className="text-title-primary" style={{ fontSize: '1.1em', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <Sliders size={16} /> Global & Room HUD Offsets & Tracker Calibration
            </strong>,
            <ul
                key="hud-refinement-list"
                className="text-subtext"
                style={{
                    color: 'var(--text-main)',
                    paddingLeft: '20px',
                    marginTop: '6px',
                    marginBottom: '16px',
                    fontSize: '0.9em',
                    lineHeight: '1.5'
                }}
            >
                <li>
                    <strong>Tracker Recalibration Notice:</strong> A quick heads-up and apology - I changed up how the token trackers for HP, Will, etc auto-scale in this update, so you may need to retool or nudge your existing token trackers slightly (using the <strong>Autoscale UI</strong> button or offset spinners in Tracker Settings). Overall, HUDs should now scale and position themselves far more naturally and reliably across tokens of all shapes, sizes, and aspect ratios without awkward clipping or manual guesswork. It ain't perfect but it's better than it was for sure.
                </li>
                <li>
                    <strong>Global & Room X/Y Offset Controls:</strong> Added dedicated <strong>Global Offsets (X / Y)</strong> and <strong>Room Offset Override (X / Y)</strong> controls to the <strong>Room Rules & Permissions</strong> menu. GMs can now set baseline X and Y pixel shifts for all tokens across the entire room or override them per scene map, with quick -10/+10 stepping buttons and 1-click resets.
                </li>
            </ul>,
            <strong key="attribute-locking-title" className="text-title-primary" style={{ fontSize: '1.1em', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <Lock size={16} /> Core & Social Attribute Locking
            </strong>,
            <ul
                key="attribute-locking-list"
                className="text-subtext"
                style={{
                    color: 'var(--text-main)',
                    paddingLeft: '20px',
                    marginTop: '6px',
                    marginBottom: '16px',
                    fontSize: '0.9em',
                    lineHeight: '1.5'
                }}
            >
                <li>
                    <strong>Attribute Sheet Locking:</strong> Added interactive lock toggles to the headers of both the Core Attributes and Social Attributes tables. When locked (the default state), Base and Limit spinners are disabled to prevent players from accidentally incrementing base stats instead of allocating ranks with their stat points. Players can still freely allocate rank points while locked.
                </li>
                <li>
                    <strong>GM-Only Attribute Lock Rule:</strong> Added a new permission setting in <strong>Room Rules & Permissions</strong> (<strong>Attribute Locking</strong>, defaulting to GM-Only). When enabled, players cannot unlock their sheet's base attributes unless the GM unlocks it for them or sets the rule to Everyone.
                </li>
            </ul>
        ]
    },
    {
        version: '3.6.3',
        date: 'September 2026',
        changes: [
            <strong key="token-ui-autoscale-title" className="text-title-primary" style={{ fontSize: '1.1em', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <Layers size={16} /> Token UI Scaling, Render Layers & HUD Controls
            </strong>,
            <ul
                key="token-ui-autoscale-list"
                className="text-subtext"
                style={{
                    color: 'var(--text-main)',
                    paddingLeft: '20px',
                    marginTop: '6px',
                    marginBottom: '16px',
                    fontSize: '0.9em',
                    lineHeight: '1.5'
                }}
            >
                <li>
                    <strong>Updated Token UI Scaling:</strong> I've updated how tracker HUD elements and badges scale across different grid DPIs and token resolutions. Overall, this improves initial token scaling out of the box so you won't need to make manual size adjustments as often in the future.
                </li>
                <li>
                    <strong>Autoscale UI Button:</strong> If an existing token's HUD appears misaligned or needs recalibration after the update, open Tracker Settings and click the new <strong>Autoscale UI</strong> button (or <strong>Autoscale All</strong> for GMs) to instantly calibrate and fix token UI scaling and vertical offsets.
                </li>
                <li>
                    <strong>Custom HUD Render Layers:</strong> Added a new <strong>HUD Layer</strong> option in Tracker Settings! You can now choose whether a token's HUD renders above token attachments like weapons and hats (<em>Above Attachments / Popover</em>), on the standard attachment layer (<em>With Attachments</em>), on the character plane (<em>Character Layer</em>), or tucked underneath the sprite (<em>Behind Token / Mount</em>).
                </li>
                <li>
                    <strong>Room-Wide Default HUD Scale:</strong> GMs can now set a room-level baseline HUD scale in the <strong>Room Rules</strong> modal. This room setting automatically scales all token HUDs across the scene, while individual tokens can still adjust their relative scale in Tracker Settings.
                </li>
                <li>
                    <strong>Sync Offsets & Coordinates Tool:</strong> GMs can now sync token HUD coordinates, layer preferences, and fine-tune placements across all tokens on the map with a single click using the new <strong>Sync Offsets</strong> button in Tracker Settings (and <strong>Sync All</strong> in the Fine-Tune Placements modal).
                </li>
            </ul>,
            <strong key="ability-automation-title" className="text-title-primary" style={{ fontSize: '1.1em', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <Zap size={16} /> Automated Ability Integration & Smart Tags
            </strong>,
            <ul
                key="ability-automation-list"
                className="text-subtext"
                style={{
                    color: 'var(--text-main)',
                    paddingLeft: '20px',
                    marginTop: '6px',
                    marginBottom: '16px',
                    fontSize: '0.9em',
                    lineHeight: '1.5'
                }}
            >
                <li>
                    <strong>Reactive Ability Automation:</strong> Integrated dozens of canonical abilities (Blaze, Overgrow, Torrent, Swarm, Huge Power, Pure Power, Hustle, Keen Eye, Super Luck, Sniper, Compound Eyes, Guts, Marvel Scale, Quick Feet, Poison Heal, Toxic Boost, Flare Boost, and more) into the sheet's reactive Tag engine without cumbersome hardcoding.
                </li>
                <li>
                    <strong>Dynamic Rank Scaling:</strong> Abilities with rank-dependent bonuses like Huge Power and Pure Power automatically scale their stat boosts based on the Pokémon's current Rank (from Starter through Master).
                </li>
                <li>
                    <strong>Move Category Modifiers:</strong> Added system-wide support for move category damage tags including <code>[Dmg +X: Fist Move]</code>, <code>[Dmg +X: Pulse Move]</code>, <code>[Dmg +X: Sound Move]</code>, <code>[Dmg +X: Ballistics Move]</code>, <code>[Dmg +X: Blade Move]</code>, and <code>[Dmg +X: Contact]</code>.
                </li>
                <li>
                    <strong>Accuracy & Critical Tags:</strong> Added <code>[Crit Dmg +X]</code> for clean critical hit damage calculation (e.g. Sniper) without tampering with dice pools, as well as <code>[Acc +X: Low Accuracy]</code> and <code>[Low Acc +X: Physical/Special]</code> to properly aid moves with the mechanical Low Accuracy tag (e.g. Compound Eyes).
                </li>
                <li>
                    <strong>Comprehensive Status Triggers:</strong> Added the universal <code>@ Status</code> trigger tag and dedicated triggers for every condition (<code>@ Burn</code>, <code>@ Frozen Solid</code>, <code>@ Poison</code>, <code>@ Badly Poisoned</code>, <code>@ Paralysis</code>, <code>@ Asleep</code>, <code>@ Confusion</code>, <code>@ Blind</code>, <code>@ Infatuated</code>, etc.) for cross-system use on abilities, items, moves, and custom forms.
                </li>
                <li>
                    <strong>Conditional Round-End Healing:</strong> Added support for conditional round-end regeneration tags like <code>[Heal X Round End @ Condition]</code> (e.g. <code>[Heal 1 Round End @ Poison]</code> for Poison Heal).
                </li>
                <li>
                    <strong>Interactive Ability Boost Tracking:</strong> Added an inline Ability Boost toggle in the Round Tracker condition drawer and Ability Menu modal for manual and absorption abilities (Sap Sipper, Lightning Rod, Motor Drive, Storm Drain, Flash Fire, Well-Baked Body, Moxie, Beast Boost, Defiant, Competitive, Unburden) using the <code>@ Boost</code> tag.
                </li>
            </ul>,
            <strong key="trainer-generator-title" className="text-title-primary" style={{ fontSize: '1.1em', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <Users size={16} /> Trainer & Team Generator
            </strong>,
            <ul
                key="trainer-generator-list"
                className="text-subtext"
                style={{
                    color: 'var(--text-main)',
                    paddingLeft: '20px',
                    marginTop: '6px',
                    marginBottom: '16px',
                    fontSize: '0.9em',
                    lineHeight: '1.5'
                }}
            >
                <li>
                    <strong>Complete Trainer & Team Generation:</strong> Instantly generate standalone NPC Trainers or complete battle-ready teams of 0–6 Pokémon with Pokerole-accurate ranks, attributes, skills, and suggested gym badges.
                </li>
                <li>
                    <strong>Streamlined Team Size Selector:</strong> Dedicated quick-toggle buttons for 0 through 6 Pokémon (<em>None</em>, <em>Solo</em>, <em>Duo</em>, <em>Trio</em>, <em>Squad</em>, <em>Team</em>, <em>Full</em>) replacing sliders for instant party configuration.
                </li>
                <li>
                    <strong>50+ Curated Trainer Classes:</strong> Select or randomize from over 50 thematic trainer concepts across 7 categories (Wild & Nature, Martial & Combat, Urban & Specialist, Scholar & Tech, Social & Show, Villains & Grunts, Elite & Universal) with tailored type preferences, Supernatural tags, and suggested stat archetypes.
                </li>
                <li>
                    <strong>Smart Pokémon Build Tiers:</strong> Defaulted to <em>Min-Max (Competent)</em>, which auto-detects each Pokémon species' natural attack bias (Physical vs Special) and defensive bias (Evasion vs Clash) to cap primary offensive and defensive stats first. Options also available for <em>Average (Balanced)</em> and <em>Wild (Untrained)</em>.
                </li>
                <li>
                    <strong>Granular Pokémon Rank Rules:</strong> Choose between matching the Trainer's rank, randomized ranks (with obedience cap), or <em>Specify Per Pokémon</em> with individual rank dropdowns for each team slot.
                </li>
                <li>
                    <strong>Unique Species by Default:</strong> Automatically guarantees no duplicate Pokémon on the team (e.g. preventing multiple Lapras on a Skier's roster), with an optional checkbox to allow duplicates.
                </li>
                <li>
                    <strong>OBR Token Spawning & Formations:</strong> Batch-spawns the Trainer and their party onto the Owlbear Rodeo map in an organized tactical formation, pre-calculating tracker graphics for HP and Will bars. In Standalone mode, creates the Trainer and nests their party members in the sidebar directory.
                </li>
                <li>
                    <strong>Artwork Picker & Map Auto-Detection:</strong> Supports selecting a default image from your OBR library, prompting for each token with species pre-filled in search, or auto-matching artwork from existing tokens on the active map.
                </li>
                <li>
                    <strong>Token Image Centering & Fallback Fixes:</strong> Fixed token pivot offsets when updating images from the OBR library so HUD graphics remain centered, and ensured fallback Pokéball icons resolve absolute URLs to eliminate broken image icons.
                </li>
            </ul>,
            <strong key="biome-ecosystems-title" className="text-title-primary" style={{ fontSize: '1.1em', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <Map size={16} /> 25-Biome Ecosystems & Habitat Filtering
            </strong>,
            <ul
                key="biome-ecosystems-list"
                className="text-subtext"
                style={{
                    color: 'var(--text-main)',
                    paddingLeft: '20px',
                    marginTop: '6px',
                    marginBottom: '16px',
                    fontSize: '0.9em',
                    lineHeight: '1.5'
                }}
            >
                <li>
                    <strong>Official 25-Biome Ecology System:</strong> Integrated 25 canonical Pokémon habitats—including Cities, Temperate Forests, Caves, Glaciers, Oceans, Deserts, Volcanoes, Swamps, Mountains, and more—mapping natural type affinities and encounter pools.
                </li>
                <li>
                    <strong>Location Filtering in Pokémon Generator:</strong> Filter single or batch Pokémon generation by any of the 25 biomes, constraining candidate species to their ecological type pools.
                </li>
                <li>
                    <strong>Trainer Origin Biomes & Thematic Classes:</strong> Select or roll an environmental origin in the Trainer Generator with quick-pick chips and a <em>"Random from Biome Match"</em> option to generate iconic local classes (e.g. Bug Catcher in a Forest, Hiker in a Cave, Diver in an Ocean).
                </li>
                <li>
                    <strong>Decoupled Team Habitats:</strong> Pokémon team ecosystems are decoupled from the trainer origin by default (allowing trainers to carry Pokémon from outside their native biome), with a <em>"Match Trainer Biome"</em> option available whenever you want a 100% local roster.
                </li>
                <li>
                    <strong>Concept-Type Protection:</strong> Specialist trainers (like Bug Catchers or Swimmers) always retain their signature typing even when encountered in atypical habitats.
                </li>
                <li>
                    <strong>Categorized Skills & Previews:</strong> Grouped Pokémon and Trainer skills under canonical categories (Fight, Survive, Social, Knowledge) in Title Case, with interactive preview modals to tinker stats, reroll individual members, and verify rosters before spawning.
                </li>
            </ul>,
            <strong key="learnset-modal-title" className="text-title-primary" style={{ fontSize: '1.1em', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <BookOpen size={16} /> Interactive Move Learnsets & 1-Click Quick-Add
            </strong>,
            <ul
                key="learnset-modal-list"
                className="text-subtext"
                style={{
                    color: 'var(--text-main)',
                    paddingLeft: '20px',
                    marginTop: '6px',
                    marginBottom: '16px',
                    fontSize: '0.9em',
                    lineHeight: '1.5'
                }}
            >
                <li>
                    <strong>Interactive Learnset Pills:</strong> All rank-grouped learnset pills nested under the character sheet's moves table are now interactive buttons. Clicking any move name opens a comprehensive Move Detail Modal with its typing, category, damage/accuracy formulas, power, target, active tags, mechanical rules, and flavor text.
                </li>
                <li>
                    <strong>1-Click Quick-Add (+) Buttons:</strong> Each unlearned move features a dedicated <code>+</code> button directly on the pill to instantly learn and equip the move into an empty or new move slot—bypassing the modal for rapid character building.
                </li>
                <li>
                    <strong>Smart Move Deduplication:</strong> The sheet automatically cross-checks your equipped moves in real time; moves already learned display an equipped checkmark (✓) and hide the quick-add button to prevent accidental duplicate slots.
                </li>
                <li>
                    <strong>In-Modal Discord Markdown & Table Broadcast:</strong> Move Detail Modals include 1-click buttons to copy clean Discord-formatted Markdown or broadcast move details directly to the Owlbear Rodeo tabletop or Standalone Roll Log.
                </li>
            </ul>,
            <strong key="room-rules-permissions-title" className="text-title-primary" style={{ fontSize: '1.1em', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <Scroll size={16} /> Room Rules & GM Permissions
            </strong>,
            <ul
                key="room-rules-permissions-list"
                className="text-subtext"
                style={{
                    color: 'var(--text-main)',
                    paddingLeft: '20px',
                    marginTop: '6px',
                    marginBottom: '16px',
                    fontSize: '0.9em',
                    lineHeight: '1.5'
                }}
            >
                <li>
                    <strong>Room Rules Hidden for Non-GMs:</strong> The Room Rules button on the global toolbar is now strictly restricted to GMs and hidden from players (was meant to always be that way, oops).
                </li>
                <li>
                    <strong>Generators Locked Behind Room Rules:</strong> The Pokémon and Trainer generators are now locked behind Room Rules permissions and defaulted to <strong>GM Only</strong>. GMs can choose to grant access to <strong>Everyone</strong> from the Room Rules menu whenever desired.
                </li>
                <li>
                    <strong>Clean Trainer Sheets:</strong> Removed the Pokémon autocomplete dropdown from the Trainer and Special Trainer "Concept" field to allow seamless freeform class entry.
                </li>
            </ul>,
            <strong key="lookup-tool-title" className="text-title-primary" style={{ fontSize: '1.1em', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <Search size={16} /> Unified Lookup Tool: Moves & Cross-Referencing
            </strong>,
            <ul
                key="lookup-tool-list"
                className="text-subtext"
                style={{
                    color: 'var(--text-main)',
                    paddingLeft: '20px',
                    marginTop: '6px',
                    marginBottom: '16px',
                    fontSize: '0.9em',
                    lineHeight: '1.5'
                }}
            >
                <li>
                    <strong>Renamed to "Lookup Tool":</strong> What was originally the Pokémon Lookup tool in the GM Screen has been expanded into the unified <strong>Lookup Tool</strong>, now featuring dual tabs to seamlessly search both Pokémon and Moves!
                </li>
                <li>
                    <strong>Full Move Database Search:</strong> Added a comprehensive Move Lookup tab allowing GMs and players to search and filter every move by Typing, Damage Category (Physical, Special, Support), Targets, Power, Accuracy, Rank requirements, and mechanical effects.
                </li>
                <li>
                    <strong>Interactive Click-Through Cross-Referencing:</strong> Integrated smooth bidirectional navigation between Pokémon and Moves. When viewing a Pokémon's learnset (e.g. Charizard), click on any move (like <em>Flamethrower</em>) to instantly jump straight into its complete move card details.
                </li>
                <li>
                    <strong>Move Learnset Reverse Lookup:</strong> While viewing any move in Move Lookup, expand the learnset section to see a full list of every Pokémon capable of learning it and at what ranks, with 1-click links to jump directly to that Pokémon's profile!
                </li>
            </ul>
        ]
    },
    {
        version: '3.5.0',
        date: 'September 2026',
        changes: [
            <strong key="pokedex-lookup-title" className="text-title-primary" style={{ fontSize: '1.1em', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <Search size={16} /> GM Screen: Pokédex Lookup Tool
            </strong>,
            <ul
                key="pokedex-lookup-list"
                className="text-subtext"
                style={{
                    color: 'var(--text-main)',
                    paddingLeft: '20px',
                    marginTop: '6px',
                    marginBottom: '16px',
                    fontSize: '0.9em',
                    lineHeight: '1.5'
                }}
            >
                <li>
                    <strong>Multi-Factor Pokédex Search:</strong> A lightning-fast, offline-ready search tool built directly into the GM Screen to look up Pokémon across the entire 1,200+ database with zero network lag via a pre-compiled search index.
                </li>
                <li>
                    <strong>Comprehensive Filtering:</strong> Filter by Type and Dual-Typing (with "Either Type" vs "Exact Dual Match" modes), Ability name and slot (Standard 1/2 vs Hidden Ability), Move name and Learned Rank (Starter through Master), Good Starter status, and Legendary/Mythical status.
                </li>
                <li>
                    <strong>Rank-Categorized Move Learnsets:</strong> The expandable Details drawer breaks down the Pokémon's entire move learnset chronologically by Rank (Starter, Rookie, Standard, Advanced, Expert, Ace, Master) with search-matched moves clearly highlighted.
                </li>
                <li>
                    <strong>Homebrew Hidden Ability Tooltip:</strong> Standardized with the app's native TooltipIcon, clearly noting that Hidden Abilities are community homebrew additions and not official canon Pokerole rules (GM discretion advised).
                </li>
                <li>
                    <strong>Expanded Discord Quick-Reference:</strong> One-click "Discord" button formats a complete GM quick-reference sheet including Types, Abilities, Base Stats (HP, Str, Dex, Vit, Spe, Ins), and full rank-grouped move learnsets.
                </li>
                <li>
                    <strong>Homebrew Workshop Integration:</strong> Automatically includes custom Pokémon created in your Homebrew Workshop alongside canon Pokémon in all searches.
                </li>
            </ul>,
            <strong key="battle-organizer-sync-title" className="text-title-primary" style={{ fontSize: '1.1em', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <Swords size={16} /> Battle Organizer: Full Round Reset & Action Sync
            </strong>,
            <ul
                key="battle-organizer-sync-list"
                className="text-subtext"
                style={{
                    color: 'var(--text-main)',
                    paddingLeft: '20px',
                    marginTop: '6px',
                    marginBottom: '16px',
                    fontSize: '0.9em',
                    lineHeight: '1.5'
                }}
            >
                <li>
                    <strong>Full Round Reset & Live Action Sync:</strong> The Battle Organizer now acts as a complete round reset engine! Syncs all actions directly to map tokens in Owlbear Rodeo, or to each character sheet in Standalone mode.
                </li>
                <li>
                    <strong>Automatic Action & Hit/Miss Tracking:</strong> Automatically ticks off actions rolled within the Organizer itself by accessing the Pokémon's sheet, and allows users to mark hit or miss with automatic application to the Organizer.
                </li>
                <li>
                    <strong>"Push Actions to Sheet":</strong> Click the "Push Actions to Sheet" button to instantly sync all action economy states from the Organizer directly to applicable tokens and character sheets.
                </li>
                <li>
                    <strong>"Refresh Stats" Button:</strong> Easily resolve any stat desynchronization across combatants with a single click.
                </li>
                <li>
                    <strong>Live HP & Will Resource Display:</strong> Added compact HP and Will indicators for each combatant directly in the Organizer view so GMs and players can monitor vital resources at a glance during combat.
                </li>
            </ul>
        ]
    },
    {
        version: '3.4.0',
        date: 'September 2026',
        changes: [
            <strong key="battle-organizer-title" className="text-title-primary" style={{ fontSize: '1.1em', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <Swords size={16} /> Battle Organizer Sheet & Encounter Manager
            </strong>,
            <ul
                key="battle-organizer-list"
                className="text-subtext"
                style={{
                    color: 'var(--text-main)',
                    paddingLeft: '20px',
                    marginTop: '6px',
                    marginBottom: '16px',
                    fontSize: '0.9em',
                    lineHeight: '1.5'
                }}
            >
                <li>
                    <strong>Interactive Battlefield & Arena Conditions:</strong> Track stadium pitch layout, active weather conditions, terrain types, environmental hazards, and Player/Foe Force Fields (Reflect/Light Screen/Safeguard/Mist) with automatic 1–4 round duration boxes that decrement seamlessly when advancing rounds.
                </li>
                <li>
                    <strong>Multi-Round Combat Tracking:</strong> Organize combat round-by-round with multi-round planning. Add, duplicate, reorder, or delete rounds, and easily advance combat rounds with one click.
                </li>
                <li>
                    <strong>Combatant Action Management:</strong> Track individual action slots per combatant with completion marks (✓), clash/fail indicators (✗), active held items, and persistent status condition tags.
                </li>
                <li>
                    <strong>1-Click Initiative Sync:</strong> Pull combatants, nicknames, held items, statuses, and rolled initiatives straight from the Initiative Order into your active battle round.
                </li>
                <li>
                    <strong>Owlbear Rodeo Popout Modal & Standalone Multi-Window Support:</strong> Open the Battle Organizer as a dedicated full-size modal iframe in Owlbear Rodeo (up to 95% of viewport width) or pop it out into an independent browser window in Standalone mode for multi-monitor setups with live two-way synchronization.
                </li>
                <li>
                    <strong>Print-to-PDF Battle Sheet:</strong> Export comprehensive, print-ready battle sheets with full stadium graphics, combatant stat lines, and action tracking grids.
                </li>
            </ul>,
            <strong key="gm-screen-update-title" className="text-title-primary" style={{ fontSize: '1.1em', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <Shield size={16} /> GM Screen & Reference Guide
            </strong>,
            <ul
                key="gm-screen-update-list"
                className="text-subtext"
                style={{
                    color: 'var(--text-main)',
                    paddingLeft: '20px',
                    marginTop: '6px',
                    marginBottom: '16px',
                    fontSize: '0.9em',
                    lineHeight: '1.5'
                }}
            >
                <li>
                    <strong>Core Rules & Reference Tables:</strong> Includes all essential information from the corebook for quick reference—combat flow, difficulty, will points, trainer actions, cover, healing, status stacking, rank balance, and the interactive Catching Calculator.
                </li>
                <li>
                    <strong>Homebrew & Expansion Mechanics:</strong> Includes reference guides for PMD (dungeon items, food, weapons, switchers) and Pokémon Rangers (Styler, styles, maneuvers, partner bonds).
                </li>
                <li>
                    <strong>Community Requests & Feedback:</strong> Have suggestions or want specific reference rules added? Reach out to <strong>@congra</strong> on the Pokérole Discord!
                </li>
            </ul>,
            <strong key="avatar-delete-title" className="text-title-primary" style={{ fontSize: '1.1em', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <ImageIcon size={16} /> Artwork & Display Image Management
            </strong>,
            <ul
                key="avatar-delete-list"
                className="text-subtext"
                style={{
                    color: 'var(--text-main)',
                    paddingLeft: '20px',
                    marginTop: '6px',
                    marginBottom: '16px',
                    fontSize: '0.9em',
                    lineHeight: '1.5'
                }}
            >
                <li>
                    <strong>Double-Confirmed Image Deletion:</strong> Easily remove character portrait artwork with a safe double-confirmation prompt, instantly clearing the image from browser storage and IndexedDB.
                </li>
                <li>
                    <strong>Interactive Portrait Click:</strong> Click directly on the character portrait on the sheet to manage or update character artwork.
                </li>
            </ul>
        ]
    },
    {
        version: '3.3.0',
        date: 'August 2026',
        changes: [
            <strong key="gm-screen-title" className="text-title-primary" style={{ fontSize: '1.1em', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <Shield size={16} /> GM Screen & Rules Cheat Sheet Modal
            </strong>,
            <ul
                key="gm-screen-list"
                className="text-subtext"
                style={{
                    color: 'var(--text-main)',
                    paddingLeft: '20px',
                    marginTop: '6px',
                    marginBottom: '16px',
                    fontSize: '0.9em',
                    lineHeight: '1.5'
                }}
            >
                <li>
                    <strong>Comprehensive In-App GM Screen:</strong> Added a dedicated GM Screen & Rules Cheat Sheet accessible directly from the Global Toolbar. Features instant real-time search across 16 core mechanic cards, category filters, and collapsible accordion sections.
                </li>
                <li>
                    <strong>1-Click Discord Markdown & Table Broadcasts:</strong> Every rule, table, status condition, and calculator features dedicated buttons to copy clean Discord-formatted Markdown to your clipboard or broadcast directly to the Owlbear Rodeo table / Standalone Roll History widget.
                </li>
                <li>
                    <strong>Deep Linking & Shareable URLs:</strong> Easily grab quick links to the GM Screen or specific sections (e.g. status conditions, weather, catching) to share quick-access rules with players in Discord.
                </li>
                <li>
                    <strong>Interactive Catching Calculator:</strong> Calculate catching probabilities in real time with Pokéball, Greatball, Ultraball, and customizable Seal Power fill-in dice support along with condition and rank multipliers.
                </li>
                <li>
                    <strong>Encounter Balancing Difficulty Matrix:</strong> Full 5-column challenge evaluation matrix with color-coded badges matching the official cheat sheet.
                </li>
                <li>
                    <strong>Special Thanks & Credit:</strong> Huge thanks and credit to Willowlark for putting together and compiling the reference information for this cheat sheet!
                </li>
            </ul>,
            <strong key="toolbar-theme-title" className="text-title-primary" style={{ fontSize: '1.1em', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <Palette size={16} /> Global Toolbar Theme & UI Polish
            </strong>,
            <ul
                key="toolbar-theme-list"
                className="text-subtext"
                style={{
                    color: 'var(--text-main)',
                    paddingLeft: '20px',
                    marginTop: '6px',
                    marginBottom: '16px',
                    fontSize: '0.9em',
                    lineHeight: '1.5'
                }}
            >
                <li>
                    <strong>Themed Toolbar Icons:</strong> The Theme, What's New, and Accessibility buttons now dynamically inherit the sheet's active primary theme color and hover tint.
                </li>
            </ul>
        ]
    },
    {
        version: '3.2.0',
        date: 'August 2026',
        changes: [
            <strong key="gen-token-title" className="text-title-primary" style={{ fontSize: '1.1em', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <Dices size={16} /> Auto-Build Pokémon: Owlbear Rodeo Token Spawning
            </strong>,
            <ul
                key="gen-token-list"
                className="text-subtext"
                style={{
                    color: 'var(--text-main)',
                    paddingLeft: '20px',
                    marginTop: '6px',
                    marginBottom: '16px',
                    fontSize: '0.9em',
                    lineHeight: '1.5'
                }}
            >
                <li>
                    <strong>Direct Token Creation on OBR:</strong> You can now spawn brand new Pokémon character tokens
                    directly onto the Owlbear Rodeo map from the Pokémon Generator! It prompts image selection directly
                    from your Owlbear asset library, places the token at the center of your screen, and selects it
                    immediately.
                </li>
                <li>
                    <strong>Destination Selector:</strong> Choose between "Generate New Token" and "Overwrite Selected
                    Token" (or "Generate New Sheet" in Standalone mode). Overwrite is safely disabled when no token is
                    selected.
                </li>
            </ul>,
            <strong key="master-champ-title" className="text-title-primary" style={{ fontSize: '1.1em', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <Crown size={16} /> Master & Champion Rank Passive Automation
            </strong>,
            <ul
                key="master-champ-list"
                className="text-subtext"
                style={{
                    color: 'var(--text-main)',
                    paddingLeft: '20px',
                    marginTop: '6px',
                    marginBottom: '16px',
                    fontSize: '0.9em',
                    lineHeight: '1.5'
                }}
            >
                <li>
                    <strong>+3 Stat & Resource Bonuses:</strong> Master and Champion characters automatically receive +3
                    Max HP, +3 Max Will, +3 Base Initiative, +3 Defense, and +3 Special Defense across the sheet,
                    derived panels, and token badges.
                </li>
                <li>
                    <strong>+2 Dice on All Skill Rolls:</strong> Move Accuracy rolls, Action Rolls, Skill Checks,
                    Evasion, Clash, Maneuvers, and Skill-based Status Recoveries automatically gain +2 dice and are
                    tagged in the roll log.
                </li>
                <li>
                    <strong>Real-Time Move Accuracy Display:</strong> Move cards and table rows now dynamically display
                    your full Accuracy dice pool in real time.
                </li>
            </ul>,
            <div
                key="car-reminder-320"
                style={{
                    border: '2px solid var(--primary)',
                    padding: '12px',
                    borderRadius: '6px',
                    backgroundColor: 'color-mix(in srgb, var(--primary) 10%, transparent)',
                    marginBottom: '16px'
                }}
            >
                <strong className="text-title-primary" style={{ fontSize: '1.1em', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <Link2 size={16} /> Custom Action Rolls (CAR) Manifest Helper
                </strong>
                <p
                    className="text-subtext"
                    style={{
                        color: 'var(--text-main)',
                        marginTop: '6px',
                        marginBottom: '8px',
                        fontSize: '0.9em',
                        lineHeight: '1.4'
                    }}
                >
                    Added built-in detection to warn if an outdated/retired hosting link for Custom Action Rolls is
                    detected. The active manifest URL is also directly available in the Room Rules modal.
                </p>
                <p style={{ margin: 0, fontSize: '0.9em', fontWeight: 'bold', color: 'var(--text-main)', display: 'inline-flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
                    <Link2 size={14} /> Current CAR Manifest Link:{' '}
                    <a
                        href="https://custom-action-rolls.narcolepticdracu.com/manifest.json"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-value-highlight"
                        style={{ wordBreak: 'break-all' }}
                    >
                        https://custom-action-rolls.narcolepticdracu.com/manifest.json
                    </a>
                </p>
            </div>
        ]
    },
    {
        version: '3.1.0',
        date: 'August 2026',
        changes: [
            <strong key="ui-title" className="text-title-primary" style={{ fontSize: '1.1em', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <Palette size={16} /> Dynamic Theming UI Overhaul
            </strong>,
            <ul
                key="ui-list"
                className="text-subtext"
                style={{
                    color: 'var(--text-main)',
                    paddingLeft: '20px',
                    marginTop: '6px',
                    marginBottom: '16px',
                    fontSize: '0.9em',
                    lineHeight: '1.5'
                }}
            >
                <li>
                    <strong>Dynamic Type Themes:</strong> The entire character sheet now dynamically styles its buttons,
                    highlights, and accents based on your Pokémon's primary typing! No more flat gray sheets—every
                    Pokémon feels unique.
                </li>
                <li>
                    <strong>Global Theme Overrides:</strong> Don't like your Pokémon's default type color? You can now
                    click the "Theme" button in the Global Toolbar to enforce a completely custom color scheme for your
                    sheet!
                </li>
                <li>
                    <strong>Project Demojification:</strong> Replaced the old, inconsistent raw emojis across the app
                    with clean, professionally-styled SVG icons (courtesy of Lucide React).
                </li>
                <li>
                    <strong>Standardized Typography:</strong> Completely rebuilt the CSS architecture under the hood to
                    use unified, accessible text scaling across the board.
                </li>
            </ul>,
            <strong key="a11y-title" className="text-title-primary" style={{ fontSize: '1.1em', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <Accessibility size={16} /> Accessibility Settings
            </strong>,
            <ul
                key="a11y-list"
                className="text-subtext"
                style={{
                    color: 'var(--text-main)',
                    paddingLeft: '20px',
                    marginTop: '6px',
                    marginBottom: '16px',
                    fontSize: '0.9em',
                    lineHeight: '1.5'
                }}
            >
                <li>
                    <strong>Theme Contrast:</strong> You can now dynamically adjust the visual contrast of the sheet's
                    colors (either globally or per-type) to fit your specific visual needs.
                </li>
                <li>
                    <strong>Dyslexic-Friendly Font:</strong> A new toggle allows you to swap the entire sheet to a
                    dyslexic-friendly font for drastically improved readability.
                </li>
                <li>
                    <strong>Adjustable Font Size:</strong> Need larger text? You can now scale the global font size up
                    or down directly from the Accessibility settings.
                </li>
            </ul>,
            <div
                key="pwa-update"
                style={{
                    border: '2px solid var(--primary)',
                    padding: '12px',
                    borderRadius: '6px',
                    backgroundColor: 'color-mix(in srgb, var(--primary) 10%, transparent)',
                    marginBottom: '16px'
                }}
            >
                <strong className="text-title-primary" style={{ fontSize: '1.1em', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <Smartphone size={16} /> Standalone App & Offline Mode (PWA)
                </strong>
                <p
                    className="text-subtext"
                    style={{
                        color: 'var(--text-main)',
                        marginTop: '6px',
                        marginBottom: '0',
                        fontSize: '0.9em',
                        lineHeight: '1.4'
                    }}
                >
                    The sheet is now fully accessible as a <strong>Progressive Web App (PWA)</strong> outside of Owlbear
                    Rodeo! You can visit the live site, install it directly to your phone or desktop home screen, and
                    use it entirely offline. Standalone mode features a brand new local directory sidebar to easily
                    organize all your characters and encounters into folders.
                </p>
            </div>,
            <strong key="combat-title" className="text-title-primary" style={{ fontSize: '1.1em', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <Swords size={16} /> Combat Engine & Targeting Upgrades
            </strong>,
            <ul
                key="combat-list"
                className="text-subtext"
                style={{
                    color: 'var(--text-main)',
                    paddingLeft: '20px',
                    marginTop: '6px',
                    marginBottom: '16px',
                    fontSize: '0.9em',
                    lineHeight: '1.5'
                }}
            >
                <li>
                    <strong>Damage Overrides:</strong> GMs (and permitted players) can now manually override damage
                    directly in the Targeting Modal! Select between Dice Pool (Vs Def), Dice Pool (Ignore Def), or True
                    Damage (Flat).
                </li>
                <li>
                    <strong>Advanced Matchups & Effectiveness:</strong> The Targeting Modal now features options for 4x,
                    2x, 0.5x, and 0.25x effectiveness! Damage modifications are automatically calculated into the chat
                    log and gracefully drop if the base attack rolls 0 successes.
                </li>
                <li>
                    <strong>Expanded Smart Tags:</strong> You can now attach explicit move keywords to your combat tags
                    to trigger conditionally! For example: <code>[Dmg +1: Projectile Move]</code> or{' '}
                    <code>[Acc +2: Sound Move]</code>.
                </li>
            </ul>,
            <ul
                key="init-bugfix-list"
                className="text-subtext"
                style={{
                    color: 'var(--text-main)',
                    paddingLeft: '20px',
                    marginTop: '6px',
                    marginBottom: '16px',
                    fontSize: '0.9em',
                    lineHeight: '1.5'
                }}
            >
                <li>
                    Fixed a race condition bug in the Initiative Tracker that caused the UI to glitch when rapidly skipping
                    turns.
                </li>
            </ul>
        ]
    }
];
