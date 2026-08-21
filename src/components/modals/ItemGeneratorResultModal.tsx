import OBR from '@owlbear-rodeo/sdk';
import { Dices, Backpack, XCircle } from 'lucide-react';
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
        if (OBR.isAvailable) OBR.notification.show(`Successfully added ${item.name} to inventory!`, 'SUCCESS');
        onClose();
    };

    return (
        <div className="item-generator-result-modal__overlay">
            <div className="item-generator-result-modal__content">
                <div className="item-generator-result-modal__name text-title-primary">{item.name}</div>
                <div
                    className="item-generator-result-modal__desc text-subtext"
                    style={{ color: 'var(--text-main)', fontSize: '0.95rem' }}
                >
                    {item.description}
                </div>

                <div className="item-generator-result-modal__actions">
                    <button
                        type="button"
                        onClick={onReroll}
                        className="action-button item-generator-result-modal__btn item-generator-result-modal__btn--reroll"
                    >
                        <Dices size={16} /> Reroll
                    </button>
                    <button
                        type="button"
                        onClick={handleAddToBag}
                        className="action-button action-button--theme item-generator-result-modal__btn item-generator-result-modal__btn--add"
                    >
                        <Backpack size={16} /> Add to Bag
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        className="action-button item-generator-result-modal__btn item-generator-result-modal__btn--close"
                    >
                        <XCircle size={16} /> Close
                    </button>
                </div>
            </div>
        </div>
    );
}
