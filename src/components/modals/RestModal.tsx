import { Tent, XCircle } from 'lucide-react';
import { useCharacterStore } from '../../store/useCharacterStore';
import './RestModal.css';

interface RestModalProps {
    onClose: () => void;
}

export function RestModal({ onClose }: RestModalProps) {
    const longRest = useCharacterStore((state) => state.longRest);

    const handleConfirm = () => {
        longRest();
        onClose();
    };

    return (
        <div className="rest-modal__overlay">
            <div className="rest-modal__content">
                <h3 className="rest-modal__title modal-title-with-icon">
                    <Tent size={22} /> Take a Long Rest?
                </h3>
                <p className="rest-modal__description">
                    This will fully heal HP and Will, clear all Status Conditions, and reset Ignored Pain.
                </p>
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