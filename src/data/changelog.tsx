import React from 'react';
import type { ReactNode } from 'react';

export const CURRENT_VERSION = '2.7.0';

export interface ChangelogEntry {
    version: string;
    date: string;
    changes: ReactNode[];
}

export const CHANGELOG_DATA: ChangelogEntry[] = [
    {
        version: '2.7.0',
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
                    marginBottom: '8px'
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
                </ul>
            </div>
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
