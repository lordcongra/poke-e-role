import { CHANGELOG_DATA, CURRENT_VERSION } from '../../data/changelog';
import './ChangelogModal.css';

interface ChangelogModalProps {
    onClose: () => void;
}

export function ChangelogModal({ onClose }: ChangelogModalProps) {
    return (
        <div className="changelog-modal__overlay">
            <div className="changelog-modal__content">
                <div className="changelog-modal__header">
                    <h3 className="changelog-modal__title">📢 What's New in v{CURRENT_VERSION}</h3>
                    <button onClick={onClose} className="changelog-modal__close-x" title="Close">
                        X
                    </button>
                </div>

                <div className="changelog-modal__body">
                    {CHANGELOG_DATA.map((log) => (
                        <div key={log.version} className="changelog-modal__version-block">
                            <h4 className="changelog-modal__version-title">
                                v{log.version} <span className="changelog-modal__date">- {log.date}</span>
                            </h4>
                            <ul className="changelog-modal__list">
                                {log.changes.map((change, idx) => (
                                    <li key={idx}>{change}</li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                <div className="changelog-modal__actions">
                    <button
                        type="button"
                        className="action-button action-button--dark changelog-modal__btn"
                        onClick={onClose}
                    >
                        Wahoo!
                    </button>
                </div>
            </div>
        </div>
    );
}
