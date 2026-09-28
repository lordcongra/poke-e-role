import React from 'react';
import { RotateCcw } from 'lucide-react';
import OBR from '@owlbear-rodeo/sdk';

interface BattleOrganizerFooterProps {
    confirmClear: boolean;
    onSetConfirmClear: (val: boolean) => void;
    onClearAll: () => void;
    onClose: () => void;
    onWheel: (e: React.WheelEvent) => void;
}

export function BattleOrganizerFooter({
    confirmClear,
    onSetConfirmClear,
    onClearAll,
    onClose,
    onWheel
}: BattleOrganizerFooterProps) {
    const handleConfirmReset = () => {
        onClearAll();
        onSetConfirmClear(false);
        if (OBR.isAvailable) {
            OBR.notification.show('Battle Organizer sheet has been reset.', 'INFO');
        }
    };

    return (
        <div className="bo-modal__footer" onWheel={onWheel}>
            <div className="bo-modal__footer-left">
                {confirmClear ? (
                    <div className="bo-confirm-clear">
                        <span className="text-subtext">Clear entire Battle Organizer?</span>
                        <button
                            type="button"
                            className="action-button action-button--dark bo-footer-btn"
                            onClick={() => onSetConfirmClear(false)}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            className="action-button action-button--red bo-footer-btn"
                            onClick={handleConfirmReset}
                        >
                            Confirm Reset
                        </button>
                    </div>
                ) : (
                    <button
                        type="button"
                        className="action-button action-button--dark bo-footer-btn"
                        onClick={() => onSetConfirmClear(true)}
                        title="Reset all battlefield and round data"
                    >
                        <RotateCcw size={14} /> Reset Sheet
                    </button>
                )}
            </div>

            <div className="bo-modal__footer-right">
                <button type="button" className="action-button action-button--dark bo-footer-btn" onClick={onClose}>
                    Close
                </button>
            </div>
        </div>
    );
}
