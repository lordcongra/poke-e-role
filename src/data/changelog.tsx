import type { ReactNode } from 'react';

export const CURRENT_VERSION = '2.5.2';

export interface ChangelogEntry {
    version: string;
    date: string;
    changes: ReactNode[];
}

export const CHANGELOG_DATA: ChangelogEntry[] = [
    {
        version: '2.4.5',
        date: 'Recently',
        changes: [
            'Added in Rules toggle for hiding Type Matchups from locked NPC tokens.',
            'Added new dice-roller engine option in Rules: Custom Action Rolls! Read up on it in the readme on github to learn more.',
            'The default dice roller for the room will be whichever one the DM sets it to, it cannot be set per-player.',
            'Added in GM Demo Mode to Rules where GM can control dice rolls.',
            <>
                Find Custom Action Rolls manifest link here:{' '}
                <a
                    href="https://action-manager.onrender.com/manifest.json"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: 'var(--primary)', fontWeight: 'bold', wordBreak: 'break-all' }}
                >
                    https://action-manager.onrender.com/manifest.json
                </a>
            </>
        ]
    }
];
