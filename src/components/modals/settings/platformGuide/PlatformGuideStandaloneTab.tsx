import React from 'react';
import { Laptop, FileJson, Copy, Check, ExternalLink } from 'lucide-react';
import { STANDALONE_WEB_APP_URL } from './platformGuideConstants';

interface PlatformGuideStandaloneTabProps {
    copiedUrl: string | null;
    onCopy: (url: string) => void;
}

export const PlatformGuideStandaloneTab: React.FC<PlatformGuideStandaloneTabProps> = ({ copiedUrl, onCopy }) => {
    return (
        <>
            <div className="platform-guide-modal__card">
                <h4 className="platform-guide-modal__card-title">
                    <Laptop size={16} color="var(--primary)" /> Launch the Standalone Web App
                </h4>
                <p className="platform-guide-modal__card-desc">
                    Use Pokérole independently on your desktop, laptop, tablet, or smartphone without requiring Owlbear
                    Rodeo.
                </p>
                <div className="platform-guide-modal__code-box">
                    <span className="platform-guide-modal__code-text">{STANDALONE_WEB_APP_URL}</span>
                    <button
                        type="button"
                        className="action-button action-button--theme platform-guide-modal__copy-btn"
                        onClick={() => onCopy(STANDALONE_WEB_APP_URL)}
                    >
                        {copiedUrl === STANDALONE_WEB_APP_URL ? (
                            <>
                                <Check size={14} /> Copied!
                            </>
                        ) : (
                            <>
                                <Copy size={14} /> Copy Link
                            </>
                        )}
                    </button>
                </div>
                <div className="platform-guide-modal__launch-row">
                    <a
                        href={STANDALONE_WEB_APP_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="action-button action-button--theme"
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '6px 14px',
                            textDecoration: 'none'
                        }}
                    >
                        <ExternalLink size={16} /> Open Standalone Web App
                    </a>
                </div>
            </div>

            <div className="platform-guide-modal__card">
                <h4 className="platform-guide-modal__card-title">
                    <Laptop size={16} color="var(--primary)" /> Progressive Web App (PWA) & Offline Play
                </h4>
                <p className="platform-guide-modal__card-desc">
                    Install the sheet directly onto your device for native app performance and 100% offline
                    functionality:
                </p>
                <ul className="platform-guide-modal__step-list">
                    <li>
                        <strong>Desktop (Chrome / Edge / Brave):</strong> Click the install icon (a screen with a
                        downward arrow) in the browser URL bar.
                    </li>
                    <li>
                        <strong>Firefox Users:</strong> Desktop Firefox does not support native PWA installation out of
                        the box without a third-party extension (like <em>Progressive Web Apps for Firefox</em>).
                        However, the <strong>Firefox mobile app</strong> supports <em>Add to Home Screen</em> natively!
                    </li>
                    <li>
                        <strong>iOS (Safari):</strong> Tap the <strong>Share</strong> button, scroll down, and tap{' '}
                        <strong>Add to Home Screen</strong>.
                    </li>
                    <li>
                        <strong>Android (Chrome / Firefox):</strong> Tap the three-dots menu (⋮) in the top right and
                        select <strong>Install App</strong> or <strong>Add to Home Screen</strong>.
                    </li>
                    <li>
                        <strong>100% Offline Database:</strong> All Pokémon species, moves, abilities, and items are
                        cached locally in your browser memory (IndexedDB). Once loaded, the sheet runs completely
                        without Wi-Fi or data connection!
                    </li>
                </ul>
            </div>

            <div className="platform-guide-modal__card">
                <h4 className="platform-guide-modal__card-title">
                    <FileJson size={16} color="var(--primary)" /> Folder Directory & Encounter Planning
                </h4>
                <p className="platform-guide-modal__card-desc">
                    Standalone mode includes an exclusive sidebar directory designed for Game Masters and solo trainers:
                </p>
                <ul className="platform-guide-modal__step-list">
                    <li>
                        <strong>Nested Folders:</strong> Group character sheets into campaigns, gym rosters, rival
                        teams, or wild encounter tables.
                    </li>
                    <li>
                        <strong>Quick Switching:</strong> Switch between multiple active Pokémon or trainers with a
                        single click in the sidebar.
                    </li>
                    <li>
                        <strong>Full Toolkit:</strong> Complete access to the Pokémon Generator, Trainer Generator, Loot
                        Generator, Battle Organizer, and Homebrew Workshop.
                    </li>
                </ul>
            </div>
        </>
    );
};
