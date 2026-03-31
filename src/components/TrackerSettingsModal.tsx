import { useState } from 'react';
import { TrackerVisibilityToggles } from './TrackerVisibilityToggles';
import { TrackerBadgeColors } from './TrackerBadgeColors';
import { TrackerPlacementModal } from './TrackerPlacementModal';
import './TrackerSettings.css';

export function TrackerSettingsModal({ onClose }: { onClose: () => void }) {
    const [showPlacementModal, setShowPlacementModal] = useState(false);

    return (
        <div className="tracker-settings__overlay">
            <div className="tracker-settings__content">
                <h3 className="tracker-settings__title">⚙️ Tracker Settings</h3>
                <p className="tracker-settings__description">Customize what this token displays on the map.</p>

                <div className="tracker-settings__section">
                    <TrackerVisibilityToggles />
                    <hr className="tracker-settings__divider tracker-settings__divider--large" />
                    <TrackerBadgeColors onOpenPlacementModal={() => setShowPlacementModal(true)} />
                </div>

                <div className="tracker-settings__btn-container">
                    <button
                        type="button"
                        onClick={onClose}
                        className="action-button action-button--dark tracker-settings__btn-close"
                    >
                        Close
                    </button>
                </div>
            </div>

            {showPlacementModal && <TrackerPlacementModal onClose={() => setShowPlacementModal(false)} />}
        </div>
    );
}
