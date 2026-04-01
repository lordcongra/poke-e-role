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
                </div>
            </div>
        </div>
    );
}
