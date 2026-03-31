import { useCharacterStore } from '../store/useCharacterStore';
import { NumberSpinner } from './NumberSpinner';

interface TrackerPlacementModalProps {
    onClose: () => void;
}

export function TrackerPlacementModal({ onClose }: TrackerPlacementModalProps) {
    const identityStore = useCharacterStore((state) => state.identity);
    const setIdentity = useCharacterStore((state) => state.setIdentity);

    const resetPlacements = () => {
        setIdentity('hpOffsetX', 0);
        setIdentity('hpOffsetY', 0);
        setIdentity('willOffsetX', 0);
        setIdentity('willOffsetY', 0);
        setIdentity('defOffsetX', 0);
        setIdentity('defOffsetY', 0);
        setIdentity('actOffsetX', 0);
        setIdentity('actOffsetY', 0);
        setIdentity('evaOffsetX', 0);
        setIdentity('evaOffsetY', 0);
        setIdentity('claOffsetX', 0);
        setIdentity('claOffsetY', 0);
    };

    return (
        <div className="tracker-settings__overlay tracker-settings__overlay--high-z">
            <div className="tracker-settings__content tracker-settings__content--placement">
                <h3 className="tracker-settings__title tracker-settings__title--placement">🎯 Fine-Tune Placements</h3>

                <div className="tracker-settings__placement-grid">
                    <div className="tracker-settings__placement-header">Element</div>
                    <div className="tracker-settings__placement-header tracker-settings__placement-header--center">
                        X Shift
                    </div>
                    <div className="tracker-settings__placement-header tracker-settings__placement-header--center">
                        Y Shift
                    </div>

                    <span className="tracker-settings__placement-label">HP Bar</span>
                    <NumberSpinner
                        value={identityStore.hpOffsetX}
                        onChange={(value) => setIdentity('hpOffsetX', value)}
                        min={-9999}
                        max={9999}
                    />
                    <NumberSpinner
                        value={identityStore.hpOffsetY}
                        onChange={(value) => setIdentity('hpOffsetY', value)}
                        min={-9999}
                        max={9999}
                    />

                    <span className="tracker-settings__placement-label">Will Bar</span>
                    <NumberSpinner
                        value={identityStore.willOffsetX}
                        onChange={(value) => setIdentity('willOffsetX', value)}
                        min={-9999}
                        max={9999}
                    />
                    <NumberSpinner
                        value={identityStore.willOffsetY}
                        onChange={(value) => setIdentity('willOffsetY', value)}
                        min={-9999}
                        max={9999}
                    />

                    <span className="tracker-settings__placement-label">Defenses</span>
                    <NumberSpinner
                        value={identityStore.defOffsetX}
                        onChange={(value) => setIdentity('defOffsetX', value)}
                        min={-9999}
                        max={9999}
                    />
                    <NumberSpinner
                        value={identityStore.defOffsetY}
                        onChange={(value) => setIdentity('defOffsetY', value)}
                        min={-9999}
                        max={9999}
                    />

                    <span className="tracker-settings__placement-label">Action Badge</span>
                    <NumberSpinner
                        value={identityStore.actOffsetX}
                        onChange={(value) => setIdentity('actOffsetX', value)}
                        min={-9999}
                        max={9999}
                    />
                    <NumberSpinner
                        value={identityStore.actOffsetY}
                        onChange={(value) => setIdentity('actOffsetY', value)}
                        min={-9999}
                        max={9999}
                    />

                    <span className="tracker-settings__placement-label">Evade Badge</span>
                    <NumberSpinner
                        value={identityStore.evaOffsetX}
                        onChange={(value) => setIdentity('evaOffsetX', value)}
                        min={-9999}
                        max={9999}
                    />
                    <NumberSpinner
                        value={identityStore.evaOffsetY}
                        onChange={(value) => setIdentity('evaOffsetY', value)}
                        min={-9999}
                        max={9999}
                    />

                    <span className="tracker-settings__placement-label">Clash Badge</span>
                    <NumberSpinner
                        value={identityStore.claOffsetX}
                        onChange={(value) => setIdentity('claOffsetX', value)}
                        min={-9999}
                        max={9999}
                    />
                    <NumberSpinner
                        value={identityStore.claOffsetY}
                        onChange={(value) => setIdentity('claOffsetY', value)}
                        min={-9999}
                        max={9999}
                    />
                </div>

                <div className="tracker-settings__button-row">
                    <button
                        type="button"
                        onClick={resetPlacements}
                        className="action-button action-button--dark tracker-settings__modal-btn"
                    >
                        Reset Placements
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        className="action-button action-button--dark tracker-settings__modal-btn tracker-settings__btn-done"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
}
