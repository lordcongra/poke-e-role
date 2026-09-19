import { Megaphone, X, PartyPopper } from 'lucide-react';
import { CHANGELOG_DATA, CURRENT_VERSION } from '../../../data/changelog';
import './ChangelogModal.css';

interface ChangelogModalProps {
    onClose: () => void;
}

export function ChangelogModal({ onClose }: ChangelogModalProps) {
    return (
        <div className="changelog-modal__overlay">
            <div className="changelog-modal__content">
                <div className="changelog-modal__header">
                    <h3 className="changelog-modal__title text-title-primary">
                        <Megaphone size={20} /> What's New in v{CURRENT_VERSION}
                    </h3>
                    <button onClick={onClose} className="changelog-modal__close-x" title="Close">
                        <X size={20} strokeWidth={2.5} />
                    </button>
                </div>

                <div className="changelog-modal__body">
                    {CHANGELOG_DATA.map((log) => (
                        <div key={log.version} className="changelog-modal__version-block">
                            <h4 className="changelog-modal__version-title text-title-primary">
                                v{log.version} <span className="changelog-modal__date text-subtext">- {log.date}</span>
                            </h4>
                            <div className="changelog-modal__changes">
                                {log.changes.map((change, idx) => {
                                    if (
                                        change &&
                                        typeof change === 'object' &&
                                        'type' in change &&
                                        (change.type === 'ul' || change.type === 'div')
                                    ) {
                                        return <div key={idx}>{change}</div>;
                                    }
                                    if (
                                        change &&
                                        typeof change === 'object' &&
                                        'type' in change &&
                                        change.type === 'strong'
                                    ) {
                                        return (
                                            <div key={idx} className="changelog-modal__section-title">
                                                {change}
                                            </div>
                                        );
                                    }
                                    return (
                                        <ul
                                            key={idx}
                                            className="changelog-modal__list text-subtext"
                                            style={{ color: 'var(--text-main)' }}
                                        >
                                            <li>{change}</li>
                                        </ul>
                                    );
                                })}
                            </div>
                        </div>
                    ))}

                    <div className="changelog-modal__archive-note text-subtext">
                        <span>Looking for older version history? </span>
                        <a
                            href="https://github.com/lordcongra/poke-e-role/blob/main/CHANGELOG.md"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="changelog-modal__link"
                        >
                            View v2.x archive on GitHub
                        </a>
                    </div>
                </div>

                <div className="changelog-modal__actions">
                    <button
                        type="button"
                        className="action-button action-button--dark changelog-modal__btn"
                        onClick={onClose}
                    >
                        <PartyPopper size={18} /> Wahoo!
                    </button>
                </div>
            </div>
        </div>
    );
}
