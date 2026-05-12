import { useCharacterStore } from '../../store/useCharacterStore';
import { NumberSpinner } from '../ui/NumberSpinner';
import './InitiativeSettingsModal.css';

export function InitiativeSettingsModal({ onClose }: { onClose: () => void }) {
    const identityStore = useCharacterStore((state) => state.identity);
    const setIdentity = useCharacterStore((state) => state.setIdentity);

    return (
        <div className="init-settings__overlay">
            <div className="init-settings__content">
                <div className="init-settings__header-row">
                    <h3 className="init-settings__title">⚙️ Initiative Settings</h3>
                    <button onClick={onClose} className="init-settings__close-x" title="Close">
                        X
                    </button>
                </div>
                <p className="init-settings__description">
                    Customize how and where the Initiative Tracker appears on your screen.
                </p>

                <div className="init-settings__section">
                    <div className="init-settings__row">
                        <span className="init-settings__label">Anchor Corner:</span>
                        <select
                            className="init-settings__input"
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

                    <div className="init-settings__row">
                        <span className="init-settings__label">Layout Style:</span>
                        <select
                            className="init-settings__input"
                            value={identityStore.initiativeTrackerLayout || 'vertical'}
                            onChange={(e) =>
                                setIdentity('initiativeTrackerLayout', e.target.value as 'vertical' | 'horizontal')
                            }
                        >
                            <option value="vertical">Vertical List</option>
                            <option value="horizontal">Horizontal Row</option>
                        </select>
                    </div>

                    <div className="init-settings__row">
                        <span className="init-settings__label">Token Image:</span>
                        <select
                            className="init-settings__input"
                            value={identityStore.initiativeTrackerAvatarShape || 'circle'}
                            onChange={(e) =>
                                setIdentity(
                                    'initiativeTrackerAvatarShape',
                                    e.target.value as 'circle' | 'square' | 'none'
                                )
                            }
                        >
                            <option value="circle">Circle</option>
                            <option value="square">Square</option>
                            <option value="none">None (No Border)</option>
                        </select>
                    </div>

                    <div className="init-settings__offset-container">
                        <div className="init-settings__offset-group">
                            <span className="init-settings__offset-text">X-Offset:</span>
                            <div className="init-settings__offset-controls">
                                <button
                                    className="init-settings__step-btn"
                                    onClick={() =>
                                        setIdentity(
                                            'initiativeTrackerOffsetX',
                                            (identityStore.initiativeTrackerOffsetX || 0) - 10
                                        )
                                    }
                                >
                                    -10
                                </button>
                                <NumberSpinner
                                    value={identityStore.initiativeTrackerOffsetX || 0}
                                    onChange={(value) => setIdentity('initiativeTrackerOffsetX', value)}
                                    min={-9999}
                                    max={9999}
                                />
                                <button
                                    className="init-settings__step-btn"
                                    onClick={() =>
                                        setIdentity(
                                            'initiativeTrackerOffsetX',
                                            (identityStore.initiativeTrackerOffsetX || 0) + 10
                                        )
                                    }
                                >
                                    +10
                                </button>
                            </div>
                        </div>
                        <div className="init-settings__offset-group">
                            <span className="init-settings__offset-text">Y-Offset:</span>
                            <div className="init-settings__offset-controls">
                                <button
                                    className="init-settings__step-btn"
                                    onClick={() =>
                                        setIdentity(
                                            'initiativeTrackerOffsetY',
                                            (identityStore.initiativeTrackerOffsetY || 0) - 10
                                        )
                                    }
                                >
                                    -10
                                </button>
                                <NumberSpinner
                                    value={identityStore.initiativeTrackerOffsetY || 0}
                                    onChange={(value) => setIdentity('initiativeTrackerOffsetY', value)}
                                    min={-9999}
                                    max={9999}
                                />
                                <button
                                    className="init-settings__step-btn"
                                    onClick={() =>
                                        setIdentity(
                                            'initiativeTrackerOffsetY',
                                            (identityStore.initiativeTrackerOffsetY || 0) + 10
                                        )
                                    }
                                >
                                    +10
                                </button>
                            </div>
                        </div>
                    </div>

                    <hr className="init-settings__divider" />

                    <p className="init-settings__hint" style={{ marginBottom: 0, paddingBottom: 0 }}>
                        Frame Max Size Boundaries (0 = Auto)
                    </p>
                    <div className="init-settings__offset-container" style={{ marginTop: '0' }}>
                        <div className="init-settings__offset-group">
                            <span className="init-settings__offset-text">Max Width (px):</span>
                            <div className="init-settings__offset-controls">
                                <button
                                    className="init-settings__step-btn"
                                    onClick={() =>
                                        setIdentity(
                                            'initiativeTrackerMaxWidth',
                                            Math.max(0, (identityStore.initiativeTrackerMaxWidth || 0) - 50)
                                        )
                                    }
                                >
                                    -50
                                </button>
                                <NumberSpinner
                                    value={identityStore.initiativeTrackerMaxWidth || 0}
                                    onChange={(value) => setIdentity('initiativeTrackerMaxWidth', value)}
                                    min={0}
                                    max={4000}
                                />
                                <button
                                    className="init-settings__step-btn"
                                    onClick={() =>
                                        setIdentity(
                                            'initiativeTrackerMaxWidth',
                                            (identityStore.initiativeTrackerMaxWidth || 0) + 50
                                        )
                                    }
                                >
                                    +50
                                </button>
                            </div>
                        </div>
                        <div className="init-settings__offset-group">
                            <span className="init-settings__offset-text">Max Height (px):</span>
                            <div className="init-settings__offset-controls">
                                <button
                                    className="init-settings__step-btn"
                                    onClick={() =>
                                        setIdentity(
                                            'initiativeTrackerMaxHeight',
                                            Math.max(0, (identityStore.initiativeTrackerMaxHeight || 0) - 50)
                                        )
                                    }
                                >
                                    -50
                                </button>
                                <NumberSpinner
                                    value={identityStore.initiativeTrackerMaxHeight || 0}
                                    onChange={(value) => setIdentity('initiativeTrackerMaxHeight', value)}
                                    min={0}
                                    max={4000}
                                />
                                <button
                                    className="init-settings__step-btn"
                                    onClick={() =>
                                        setIdentity(
                                            'initiativeTrackerMaxHeight',
                                            (identityStore.initiativeTrackerMaxHeight || 0) + 50
                                        )
                                    }
                                >
                                    +50
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
