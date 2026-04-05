import OBR from '@owlbear-rodeo/sdk';
import { useCharacterStore } from '../../store/useCharacterStore';
import './ItemGeneratorResultModal.css';

interface ItemGeneratorResultModalProps {
    item: { name: string; description: string };
    onClose: () => void;
    onReroll: () => void;
}

export function ItemGeneratorResultModal({ item, onClose, onReroll }: ItemGeneratorResultModalProps) {
    const addSpecificInventoryItem = useCharacterStore((state) => state.addSpecificInventoryItem);

    const handleAddToBag = () => {
        addSpecificInventoryItem({
            name: item.name,
            description: item.description,
            quantity: 1,
            active: false
        });
        if (OBR.isAvailable) OBR.notification.show(`✅ Added ${item.name} to inventory!`, 'SUCCESS');
        onClose();
    };

    return (
        <div className="item-generator-result-modal__overlay">
            <div className="item-generator-result-modal__content">
                <div className="item-generator-result-modal__name">{item.name}</div>
                <div className="item-generator-result-modal__desc">{item.description}</div>

                <div className="item-generator-result-modal__actions">
                    <button
                        type="button"
                        onClick={onReroll}
                        className="item-generator-result-modal__btn item-generator-result-modal__btn--reroll"
                    >
                        🎲 Reroll
                    </button>
                    <button
                        type="button"
                        onClick={handleAddToBag}
                        className="item-generator-result-modal__btn item-generator-result-modal__btn--add"
                    >
                        🎒 Add to Bag
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        className="item-generator-result-modal__btn item-generator-result-modal__btn--close"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
