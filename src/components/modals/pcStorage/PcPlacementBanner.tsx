import React, { useEffect, useState } from 'react';
import { Crosshair, X } from 'lucide-react';
import {
    subscribePlacementState,
    cancelPointPlacement,
    type ActivePlacementState
} from '../../../utils/pc/pcPlacementInteraction';

export const PcPlacementBanner: React.FC = () => {
    const [placement, setPlacement] = useState<ActivePlacementState | null>(null);

    useEffect(() => {
        return subscribePlacementState(setPlacement);
    }, []);

    if (!placement) return null;

    return (
        <div className="pc-modal__placement-banner" role="status" aria-live="polite">
            <div className="pc-modal__placement-content">
                <Crosshair size={16} className="pc-modal__placement-icon" />
                <span className="pc-modal__placement-text text-subtext">
                    <strong>Click on the map</strong> to place <strong>{placement.name}</strong> (or press{' '}
                    <kbd className="pc-modal__kbd">Esc</kbd>)
                </span>
            </div>
            <button
                type="button"
                className="pc-modal__placement-cancel-btn action-button --dark"
                onClick={() => cancelPointPlacement()}
                title="Cancel placement mode"
                aria-label="Cancel placement mode"
            >
                <X size={14} />
                <span>Cancel</span>
            </button>
        </div>
    );
};
