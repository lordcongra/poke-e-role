import type { ReactNode } from 'react';

export const CURRENT_VERSION = '2.5.6';

export interface ChangelogEntry {
    version: string;
    date: string;
    changes: ReactNode[];
}

export const CHANGELOG_DATA: ChangelogEntry[] = [
    {
        version: '2.6.0',
        date: 'Recently',
        changes: [
            'Further improvements to the pokemon generator under the hood.',
            'Added ability to update the image of a token from your OBR images - helpful for evolutions when you want to keep your sheet.',
            'Added new dice-roller engine option in Rules: Custom Action Rolls! Read up on it in the readme on github to learn more.',
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
