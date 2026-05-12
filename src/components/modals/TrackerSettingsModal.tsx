import { useState } from 'react';
import { useCharacterStore } from '../../store/useCharacterStore';
import { TrackerVisibilityToggles } from './TrackerVisibilityToggles';
import { TrackerBadgeColors } from './TrackerBadgeColors';
import { TrackerPlacementModal } from './TrackerPlacementModal';
import { NumberSpinner } from '../ui/NumberSpinner';
import './TrackerSettings.css';

export function TrackerSettingsModal({ onClose }: { onClose: () => void }) {
    const [showPlacementModal, setShowPlacementModal] = useState(false);

    // Wire up the HUD layout configs
    const identityStore = useCharacterStore((state) => state.identity);
    const setIdentity = useCharacterStore((state) => state.setIdentity);

    return (
        <div className="tracker-settings__overlay">
            <div className="tracker-settings__content">
                <div className="tracker-settings__header-row">
                    <h3 className="tracker-settings__title">⚙️ Tracker Settings</h3>
                    <button onClick={onClose} className="tracker-settings__close-x" title="Close">
                        X
                    </button>
                </div>
                <p className="tracker-settings__description">Customize what this token displays on the map.</p>

                <div className="tracker-settings__section">
                    <TrackerVisibilityToggles />
                    <hr className="tracker-settings__divider tracker-settings__divider--large" />
                    <TrackerBadgeColors onOpenPlacementModal={() => setShowPlacementModal(true)} />

                    <hr className="tracker-settings__divider tracker-settings__divider--large" />
                    <div className="tracker-settings__color-group">
                        <label className="tracker-settings__subtitle">Initiative HUD Preferences</label>

                        <div className="tracker-settings__color-row">
                            <span className="tracker-settings__color-label" style={{ width: 'auto' }}>
                                Preset:
                            </span>
                            <select
                                className="tracker-settings__color-input"
                                value={identityStore.initiativeTrackerPreset || 'center-right'}
                                onChange={(e) => setIdentity('initiativeTrackerPreset', e.target.value)}
                            >
                                <option value="top-left">Top Left</option>
                                <option value="top-center">Top Center</option>
                                <option value="top-right">Top Right</option>
                                <option value="center-left">Center Left</option>
                                <option value="center-right">Center Right</option>
                                <option value="bottom-left">Bottom Left</option>
                                <option value="bottom-center">Bottom Center</option>
                                <option value="bottom-right">Bottom Right</option>
                            </select>
                        </div>

                        <div className="tracker-settings__color-row">
                            <span className="tracker-settings__color-label" style={{ width: 'auto' }}>
                                Layout:
                            </span>
                            <select
                                className="tracker-settings__color-input"
                                value={identityStore.initiativeTrackerLayout || 'vertical'}
                                onChange={(e) =>
                                    setIdentity('initiativeTrackerLayout', e.target.value as 'vertical' | 'horizontal')
                                }
                            >
                                <option value="vertical">Vertical List</option>
                                <option value="horizontal">Horizontal Row</option>
                            </select>
                        </div>

                        <div className="tracker-settings__offset-container" style={{ marginTop: '5px' }}>
                            <label className="tracker-settings__offset-label">
                                <span className="tracker-settings__offset-text">X:</span>
                                <NumberSpinner
                                    value={identityStore.initiativeTrackerOffsetX || 0}
                                    onChange={(value) => setIdentity('initiativeTrackerOffsetX', value)}
                                    min={-9999}
                                    max={9999}
                                />
                            </label>
                            <label className="tracker-settings__offset-label">
                                <span className="tracker-settings__offset-text">Y:</span>
                                <NumberSpinner
                                    value={identityStore.initiativeTrackerOffsetY || 0}
                                    onChange={(value) => setIdentity('initiativeTrackerOffsetY', value)}
                                    min={-9999}
                                    max={9999}
                                />
                            </label>
                        </div>
                    </div>
                </div>
            </div>

            {showPlacementModal && <TrackerPlacementModal onClose={() => setShowPlacementModal(false)} />}
        </div>
    );
}
