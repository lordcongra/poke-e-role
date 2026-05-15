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
                        Close
                    </button>
                    <button
                        className="action-button item-info__btn-broadcast"
                        style={{ backgroundColor: '#1565c0', borderColor: '#1565c0', color: 'white' }}
                        onClick={() => {
                            broadcastInfo(infoModal.title, infoModal.desc || 'No description provided.');
                            onClose();
                        }}
                    >
                        📢 Broadcast
                    </button>
                </div>
            </div>
        </div>
    );
}
