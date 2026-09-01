import React from 'react';
import type { ReactNode } from 'react';

export const CURRENT_VERSION = '3.4.0';

export interface ChangelogEntry {
    version: string;
    date: string;
    changes: ReactNode[];
}

export const CHANGELOG_DATA: ChangelogEntry[] = [
    {
        version: '3.4.0',
        date: 'September 2026',
        changes: [
            <strong key="battle-organizer-title" className="text-title-primary" style={{ fontSize: '1.1em' }}>
                ⚔️ Battle Organizer Sheet & Encounter Manager
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
            <strong key="gm-screen-update-title" className="text-title-primary" style={{ fontSize: '1.1em' }}>
                🛡️ GM Screen & Reference Guide
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
            <strong key="avatar-delete-title" className="text-title-primary" style={{ fontSize: '1.1em' }}>
                🖼️ Artwork & Display Image Management
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
            <strong key="gm-screen-title" className="text-title-primary" style={{ fontSize: '1.1em' }}>
                🛡️ GM Screen & Rules Cheat Sheet Modal
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
            <strong key="toolbar-theme-title" className="text-title-primary" style={{ fontSize: '1.1em' }}>
                🎨 Global Toolbar Theme & UI Polish
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
            <strong key="gen-token-title" className="text-title-primary" style={{ fontSize: '1.1em' }}>
                🎲 Auto-Build Pokémon: Owlbear Rodeo Token Spawning
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
            <strong key="master-champ-title" className="text-title-primary" style={{ fontSize: '1.1em' }}>
                👑 Master & Champion Rank Passive Automation
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
                <strong className="text-title-primary" style={{ fontSize: '1.1em' }}>
                    🔗 Custom Action Rolls (CAR) Manifest Helper
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
                <p style={{ margin: 0, fontSize: '0.9em', fontWeight: 'bold', color: 'var(--text-main)' }}>
                    🔗 Current CAR Manifest Link:{' '}
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
            <strong key="ui-title" className="text-title-primary" style={{ fontSize: '1.1em' }}>
                🎨 Dynamic Theming UI Overhaul
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
            <strong key="a11y-title" className="text-title-primary" style={{ fontSize: '1.1em' }}>
                ♿ Accessibility Settings
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
                <strong className="text-title-primary" style={{ fontSize: '1.1em' }}>
                    📱 Standalone App & Offline Mode (PWA)
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
            <strong key="combat-title" className="text-title-primary" style={{ fontSize: '1.1em' }}>
                ⚔️ Combat Engine & Targeting Upgrades
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
            <div
                key="car-reminder-310"
                style={{
                    border: '2px solid var(--semantic-danger)',
                    padding: '12px',
                    borderRadius: '6px',
                    backgroundColor: 'color-mix(in srgb, var(--semantic-danger) 10%, transparent)',
                    marginBottom: '12px'
                }}
            >
                <strong style={{ color: 'var(--semantic-danger)', fontSize: '1.1em' }}>
                    ⚠️ Reminder: Custom Action Rolls URL Change
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
                    If you haven't updated yet, the <strong>Custom Action Rolls (CAR)</strong> extension has moved!
                    Please update your VTT room to use the new manifest link below to keep your dice rolling smoothly:
                </p>
                <p style={{ margin: 0, fontSize: '0.9em', fontWeight: 'bold', color: 'var(--text-main)' }}>
                    🔗 New CAR Link:{' '}
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
            </div>,
            <span key="init-bugfix" className="text-subtext" style={{ color: 'var(--text-main)' }}>
                Fixed a race condition bug in the Initiative Tracker that caused the UI to glitch when rapidly skipping
                turns.
            </span>
        ]
    },
    {
        version: '2.8.1',
        date: 'August 2026',
        changes: [
            <div
                key="car-link-update"
                style={{
                    border: '2px solid var(--semantic-danger)',
                    padding: '12px',
                    borderRadius: '6px',
                    backgroundColor: 'color-mix(in srgb, var(--semantic-danger) 10%, transparent)',
                    marginBottom: '16px'
                }}
            >
                <strong style={{ color: 'var(--semantic-danger)', fontSize: '1.1em' }}>
                    ⚠️ Custom Action Rolls URL Change
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
                    The <strong>Custom Action Rolls (CAR)</strong> extension has moved to a new host! If your dice rolls
                    have stopped working, or if you are installing it for the first time, please use the new manifest
                    link below:
                </p>
                <p style={{ margin: 0, fontSize: '0.9em', fontWeight: 'bold', color: 'var(--text-main)' }}>
                    🔗 New CAR Manifest Link:{' '}
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
        version: '2.8.0',
        date: 'June 2026',
        changes: [
            <div
                key="dice-deprecation"
                style={{
                    border: '2px solid var(--semantic-danger)',
                    padding: '12px',
                    borderRadius: '6px',
                    backgroundColor: 'color-mix(in srgb, var(--semantic-danger) 10%, transparent)',
                    marginBottom: '16px'
                }}
            >
                <strong style={{ color: 'var(--semantic-danger)', fontSize: '1.1em' }}>
                    ⚠️ ACTION REQUIRED: Dice+ is retiring!
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
                    The legacy <strong>Dice+</strong> engine is being fully deprecated and will be removed in an
                    upcoming release. You MUST switch your room to use <strong>Custom Action Rolls (CAR)</strong> to
                    ensure your dice continue to work. CAR natively supports advanced mechanics like exploding dice!
                </p>
                <p style={{ margin: 0, fontSize: '0.9em', fontWeight: 'bold', color: 'var(--text-main)' }}>
                    🔗 CAR Manifest Link:{' '}
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
            </div>,
            <strong key="hb-title" className="text-title-primary" style={{ fontSize: '1.1em' }}>
                🛠️ Homebrew Workshop Overhaul (Anti-Crash Update)
            </strong>,
            <ul
                key="hb-list"
                className="text-subtext"
                style={{
                    color: 'var(--text-main)',
                    paddingLeft: '20px',
                    marginTop: '6px',
                    marginBottom: '12px',
                    fontSize: '0.9em',
                    lineHeight: '1.5'
                }}
            >
                <li>
                    <strong>Local Storage Migration:</strong> To prevent hitting Owlbear Rodeo's strict 16KB Room Data
                    limit (which was causing room crashes), all Homebrew data is now saved directly to your browser's
                    local storage. Your existing data will port over automatically!
                </li>
                <li>
                    <strong>Peer-to-Peer Syncing:</strong> Added a <strong>📢 Share with Table</strong> button! This
                    uses direct WebRTC broadcasting to send your custom creations to everyone in the room without
                    bloating the OBR database.
                </li>
                <li>
                    <strong>Smart Merging:</strong> Receiving a broadcast from the GM or another player will now safely{' '}
                    <em>merge</em> their homebrew with yours, preventing accidental overwrites of your own custom
                    creations.
                </li>
                <li>
                    <strong>Unsaved Changes Indicator:</strong> The "Backup All" button will now turn red and show a
                    warning if you have unexported changes, ensuring you never forget to back up your hard work to a
                    JSON file! For the very first time this extension loads after this update it will tell you that you
                    need to back up even if you've backed up everything prior.
                </li>
            </ul>
        ]
    },
    {
        version: '2.7.5',
        date: 'May 2026',
        changes: [
            <div
                key="init-update"
                style={{
                    border: '2px solid var(--secondary)',
                    padding: '12px',
                    borderRadius: '6px',
                    backgroundColor: 'color-mix(in srgb, var(--secondary) 10%, transparent)',
                    marginTop: '8px',
                    marginBottom: '12px'
                }}
            >
                <div
                    className="text-theme-header"
                    style={{
                        backgroundColor: 'var(--semantic-danger)',
                        padding: '10px',
                        borderRadius: '4px',
                        marginBottom: '12px',
                        fontWeight: 'bold',
                        textAlign: 'center',
                        boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
                    }}
                >
                    🚨 IMPORTANT: You can now safely uninstall the "Pretty Sordid" extension! 🚨
                </div>
                <strong style={{ color: 'var(--secondary)', fontSize: '1.1em' }}>
                    🚀 Initiative Tracker Complete Overhaul
                </strong>
                <p
                    className="text-subtext"
                    style={{ color: 'var(--text-main)', marginTop: '6px', marginBottom: '8px', fontSize: '0.9em' }}
                >
                    The built-in tracker has been rebuilt from the ground up to perfectly integrate into your screen
                    without layout bugs.
                </p>
                <ul
                    className="text-subtext"
                    style={{
                        color: 'var(--text-main)',
                        paddingLeft: '20px',
                        marginTop: '4px',
                        marginBottom: 0,
                        lineHeight: '1.5',
                        fontSize: '0.9em'
                    }}
                >
                    <li>
                        <strong>Per-Player HUD:</strong> Tracker location, layout, and size limits now save locally to
                        your personal browser.
                    </li>
                    <li>
                        <strong>Horizontal & Vertical Modes:</strong> Switch between a vertical list or a horizontal
                        bar.
                    </li>
                    <li>
                        <strong>Smart Bounds:</strong> Set max width/height limits. The list scrolls if you limit the
                        height/width.
                    </li>
                    <li>
                        <strong>Auto-Scrolling:</strong> The tracker automatically smooth-scrolls to the active Pokémon
                        when turns pass!
                    </li>
                    <li>
                        <strong>Find any bugs?:</strong> Please let @congra know in the Pokerole Discord or report an
                        issue on Github!
                    </li>
                </ul>
            </div>,
            <div key="dice-deprecation" style={{ marginBottom: '12px' }}>
                <strong style={{ color: 'var(--semantic-danger)', fontSize: '1.05em' }}>
                    ⚠️ Dice+ Deprecation Notice
                </strong>
                <p className="text-subtext" style={{ color: 'var(--text-main)', margin: '4px 0', fontSize: '0.9em' }}>
                    The legacy <strong>Dice+</strong> engine will be deprecated in an upcoming release.{' '}
                    <strong>Custom Action Rolls (CAR)</strong> is now the default and recommended engine for this sheet,
                    as it supports advanced mechanics like exploding dice and dynamic roll logs. Please switch over in
                    the Room Rules (📜) menu! Contact Congra in the Pokerole Discord with any questions about this
                    change.
                </p>
            </div>,
            <strong key="hb-status-title" className="text-title-primary" style={{ fontSize: '1.1em' }}>
                ✨ Homebrew Statuses & Exploding Dice
            </strong>,
            <ul
                key="hb-status-list"
                className="text-subtext"
                style={{ color: 'var(--text-main)', paddingLeft: '20px', margin: '4px 0', fontSize: '0.9em' }}
            >
                <li>
                    <strong>Custom Statuses:</strong> You can now create custom status conditions in the Homebrew
                    Workshop! They integrate natively into the sheet's tracker dropdowns, allowing for dynamic
                    end-of-round damage/healing, action loss, and stat penalties.
                </li>
                <li>
                    <strong>Exploding Dice Tag:</strong> Added the <code>[Acc Xs Add Dmg Limit Y]</code> tag to the Tag
                    Builder. Roll a specific number on your accuracy dice to bank bonus damage for your attack!{' '}
                    <em>(Requires the CAR engine)</em>
                </li>
                <li>
                    <strong>Dual Scaling Moves:</strong> You can now properly configure alternative scaling options
                    (like <em>Photon Geyser</em>) when creating custom moves in the Homebrew Workshop.
                </li>
                <li>
                    <strong>Workshop Duplication:</strong> Added a handy Duplicate (📋 Copy) button to all Workshop
                    items to speed up your homebrew creation!
                </li>
            </ul>
        ]
    },
    {
        version: '2.7.0',
        date: 'May 2026',
        changes: [
            <span key="init-rebuild" className="text-subtext" style={{ color: 'var(--text-main)' }}>
                Initiative Tracker completely rebuilt natively into the sheet.
            </span>,
            <span key="init-hud" className="text-subtext" style={{ color: 'var(--text-main)' }}>
                Added Initiative HUD settings to customize placement, size, and layout.
            </span>,
            <span key="init-sordid" className="text-subtext" style={{ color: 'var(--text-main)' }}>
                Removed reliance on the Pretty Sordid extension.
            </span>
        ]
    },
    {
        version: '2.6.0',
        date: 'Idk there are lots from various versions here',
        changes: [
            <span key="gen-update" className="text-subtext" style={{ color: 'var(--text-main)' }}>
                Further improvements to the pokemon generator under the hood.
            </span>,
            <span key="img-update" className="text-subtext" style={{ color: 'var(--text-main)' }}>
                Added ability to update the image of a token from your OBR images - helpful for evolutions when you want
                to keep your sheet.
            </span>,
            <span key="car-update" className="text-subtext" style={{ color: 'var(--text-main)' }}>
                Added new dice-roller engine option in Rules: Custom Action Rolls! Read up on it in the readme on github
                to learn more.
            </span>,
            <React.Fragment key="action-manager-link">
                <span className="text-subtext" style={{ color: 'var(--text-main)' }}>
                    Find Custom Action Rolls manifest link here:{' '}
                </span>
                <a
                    href="https://custom-action-rolls.narcolepticdracu.com/manifest.json"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-value-highlight"
                >
                    https://custom-action-rolls.narcolepticdracu.com/manifest.json
                </a>
            </React.Fragment>
        ]
    }
];
