import { Megaphone, XCircle } from 'lucide-react';
import { broadcastInfo } from '../../utils/diceRoller';
import './ItemInfoModal.css';

interface ItemInfoModalProps {
    infoModal: { title: string; desc: string };
    onClose: () => void;
}

export function ItemInfoModal({ infoModal, onClose }: ItemInfoModalProps) {
    return (
        <div className="item-info__overlay">
            <div className="item-info__content">
                <h3 className="item-info__title">{infoModal.title}</h3>
                <p className="item-info__desc">{infoModal.desc}</p>
                <div className="item-info__actions">
                    <button className="action-button action-button--dark item-info__btn-close" onClick={onClose}>
                        <XCircle size={16} /> Close
                    </button>
                    <button
                        className="action-button action-button--theme item-info__btn-broadcast"
                        onClick={() => {
                            broadcastInfo(infoModal.title, infoModal.desc || 'No description provided.');
                            onClose();
                        }}
                    >
                        <Megaphone size={16} /> Broadcast
                    </button>
                </div>
            </div>
        </div>
    );
}
