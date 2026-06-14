import React from 'react';
import type { ReactNode } from 'react';

export const CURRENT_VERSION = '2.8.0';

export interface ChangelogEntry {
    version: string;
    date: string;
    changes: ReactNode[];
}

export const CHANGELOG_DATA: ChangelogEntry[] = [
    {
        version: '2.8.0',
        date: 'June 2026',
        changes: [
            <div
                key="dice-deprecation"
                style={{
                    border: '2px solid #e65100',
                    padding: '12px',
                    borderRadius: '6px',
                    backgroundColor: 'rgba(230, 81, 0, 0.08)',
                    marginBottom: '16px'
                }}
            >
                <strong style={{ color: '#e65100', fontSize: '1.1em' }}>
                    ⚠️ ACTION REQUIRED: Dice+ is retiring!
                </strong>
                <p style={{ marginTop: '6px', marginBottom: '8px', fontSize: '0.9em', lineHeight: '1.4' }}>
                    The legacy <strong>Dice+</strong> engine is being fully deprecated and will be removed in an upcoming release. You MUST switch your room to use <strong>Custom Action Rolls (CAR)</strong> to ensure your dice continue to work. CAR natively supports advanced mechanics like exploding dice!
                </p>
                <p style={{ margin: 0, fontSize: '0.9em', fontWeight: 'bold' }}>
                    🔗 CAR Manifest Link:{' '}
                    <a
                        href="https://action-manager.onrender.com/manifest.json"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: '#1976d2', wordBreak: 'break-all' }}
                    >
                        https://action-manager.onrender.com/manifest.json
                    </a>
                </p>
            </div>,
            <strong key="hb-title" style={{ color: '#00695c', fontSize: '1.1em' }}>
                🛠️ Homebrew Workshop Overhaul (Anti-Crash Update)
            </strong>,
            <ul
                key="hb-list"
                style={{
                    paddingLeft: '20px',
                    marginTop: '6px',
                    marginBottom: '12px',
                    fontSize: '0.9em',
                    lineHeight: '1.5'
                }}
            >
                <li>
                    <strong>Local Storage Migration:</strong> To prevent hitting Owlbear Rodeo's strict 16KB Room Data limit (which was causing room crashes), all Homebrew data is now saved directly to your browser's local storage. Your existing data will port over automatically!
                </li>
                <li>
                    <strong>Peer-to-Peer Syncing:</strong> Added a <strong>📢 Share with Table</strong> button! This uses direct WebRTC broadcasting to send your custom creations to everyone in the room without bloating the OBR database.
                </li>
                <li>
                    <strong>Smart Merging:</strong> Receiving a broadcast from the GM or another player will now safely <em>merge</em> their homebrew with yours, preventing accidental overwrites of your own custom creations.
                </li>
                <li>
                    <strong>Unsaved Changes Indicator:</strong> The "Backup All" button will now turn red and show a warning if you have unexported changes, ensuring you never forget to back up your hard work to a JSON file! For the very first time this extension loads after this update it will tell you that you need to back up even if you've backed up everything prior.
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
                    border: '2px solid #4CAF50',
                    padding: '12px',
                    borderRadius: '6px',
                    backgroundColor: 'rgba(76, 175, 80, 0.05)',
                    marginTop: '8px',
                    marginBottom: '12px'
                }}
            >
                <div
                    style={{
                        backgroundColor: '#f44336',
                        color: 'white',
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
                <strong style={{ color: '#4CAF50', fontSize: '1.1em' }}>🚀 Initiative Tracker Complete Overhaul</strong>
                <p style={{ marginTop: '6px', marginBottom: '8px', fontSize: '0.9em' }}>
                    The built-in tracker has been rebuilt from the ground up to perfectly integrate into your screen
                    without layout bugs.
                </p>
                <ul
                    style={{
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
                <strong style={{ color: '#e65100', fontSize: '1.05em' }}>⚠️ Dice+ Deprecation Notice</strong>
                <p style={{ margin: '4px 0', fontSize: '0.9em' }}>
                    The legacy <strong>Dice+</strong> engine will be deprecated in an upcoming release.{' '}
                    <strong>Custom Action Rolls (CAR)</strong> is now the default and recommended engine for this sheet,
                    as it supports advanced mechanics like exploding dice and dynamic roll logs. Please switch over in
                    the Room Rules (📜) menu! Contact Congra in the Pokerole Discord with any questions about this
                    change.
                </p>
            </div>,
            <strong key="hb-status-title" style={{ color: '#9C27B0' }}>
                ✨ Homebrew Statuses & Exploding Dice
            </strong>,
            <ul key="hb-status-list" style={{ paddingLeft: '20px', margin: '4px 0', fontSize: '0.9em' }}>
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
            'Initiative Tracker completely rebuilt natively into the sheet.',
            'Added Initiative HUD settings to customize placement, size, and layout.',
            'Removed reliance on the Pretty Sordid extension.'
        ]
    },
    {
        version: '2.6.0',
        date: 'Idk there are lots from various versions here',
        changes: [
            'Further improvements to the pokemon generator under the hood.',
            'Added ability to update the image of a token from your OBR images - helpful for evolutions when you want to keep your sheet.',
            'Added new dice-roller engine option in Rules: Custom Action Rolls! Read up on it in the readme on github to learn more.',
            <React.Fragment key="action-manager-link">
                Find Custom Action Rolls manifest link here:{' '}
                <a
                    href="https://action-manager.onrender.com/manifest.json"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="changelog-modal__link"
                >
                    https://action-manager.onrender.com/manifest.json
                </a>
            </React.Fragment>
        ]
    }
];