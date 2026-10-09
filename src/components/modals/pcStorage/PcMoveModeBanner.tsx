import React from 'react';
import { ArrowRightLeft, X } from 'lucide-react';

interface PcMoveModeBannerProps {
    pokemonName: string;
    onCancel: () => void;
}

export const PcMoveModeBanner: React.FC<PcMoveModeBannerProps> = ({ pokemonName, onCancel }) => {
    return (
        <div className="pc-move-mode-banner" role="status" aria-live="polite">
            <div className="pc-move-mode-banner__content">
                <ArrowRightLeft size={16} className="pc-move-mode-banner__icon" />
                <span className="pc-move-mode-banner__text">
                    Moving <strong>{pokemonName}</strong> — Tap destination slot
                </span>
            </div>
            <button
                type="button"
                className="action-button action-button--dark pc-move-mode-banner__cancel-btn"
                onClick={onCancel}
                aria-label="Cancel moving"
            >
                <X size={14} />
                <span>Cancel</span>
            </button>
        </div>
    );
};
