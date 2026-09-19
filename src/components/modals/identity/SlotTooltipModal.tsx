import { XCircle } from 'lucide-react';

interface SlotTooltipModalProps {
    title: string;
    desc: string;
    onClose: () => void;
}

export function SlotTooltipModal({ title, desc, onClose }: SlotTooltipModalProps) {
    return (
        <div className="identity-header__modal-overlay">
            <div className="identity-header__modal-content" style={{ color: 'var(--text-main)' }}>
                <h3 className="identity-header__modal-title text-title-primary">{title}</h3>
                <p className="identity-header__modal-text identity-header__modal-text--pre-wrap text-subtext">{desc}</p>
                <div className="identity-header__modal-actions">
                    <button
                        type="button"
                        className="action-button action-button--dark identity-header__modal-btn"
                        onClick={onClose}
                    >
                        <XCircle size={16} /> Close
                    </button>
                </div>
            </div>
        </div>
    );
}
