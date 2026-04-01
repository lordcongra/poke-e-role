import { useCharacterStore } from '../../store/useCharacterStore';

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
        <div className="tracker-modal__overlay">
            <div className="tracker-modal__content tracker-modal__content--rest">
                <h3 className="tracker-modal__title tracker-modal__title--rest">🏕️ Take a Long Rest?</h3>
                <p className="tracker-modal__description">
                    This will fully heal HP and Will, clear all Status Conditions, and reset Ignored Pain.
                </p>
                <div className="tracker-modal__actions">
                    <button
                        type="button"
                        onClick={onClose}
                        className="action-button action-button--dark tracker-modal__btn-cancel"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleConfirm}
                        className="action-button tracker-modal__btn-confirm tracker-modal__btn-rest"
                    >
                        🏕️ Rest
                    </button>
                </div>
            </div>
        </div>
    );
}
