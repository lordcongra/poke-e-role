import { useState } from 'react';
import { Tent, XCircle } from 'lucide-react';
import { useCharacterStore } from '../../../store/useCharacterStore';
import './RestModal.css';

interface RestModalProps {
    onClose: () => void;
}

export function RestModal({ onClose }: RestModalProps) {
    const longRest = useCharacterStore((state) => state.longRest);
    const [resetBuffs, setResetBuffs] = useState(true);

    const handleConfirm = () => {
        longRest(resetBuffs);
        onClose();
    };

    return (
        <div className="rest-modal__overlay">
            <div className="rest-modal__content">
                <h3 className="rest-modal__title modal-title-with-icon text-title-primary">
                    <Tent size={22} /> Take a Long Rest?
                </h3>
                <p className="rest-modal__description text-subtext">
                    This will fully heal HP and Will, reset Trackers and Temp HP/Will, and clear all Status Conditions.
                </p>
                <label className="rest-modal__checkbox-label text-subtext">
                    <input type="checkbox" checked={resetBuffs} onChange={(e) => setResetBuffs(e.target.checked)} />
                    Reset Buffs &amp; Debuffs (Stats, Def &amp; Sp. Def)
                </label>
                <div className="rest-modal__actions">
                    <button
                        type="button"
                        onClick={onClose}
                        className="action-button action-button--dark rest-modal__btn"
                    >
                        <XCircle size={16} /> Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleConfirm}
                        className="action-button action-button--theme rest-modal__btn"
                    >
                        <Tent size={16} /> Rest
                    </button>
                </div>
            </div>
        </div>
    );
}
