import { XCircle } from 'lucide-react';

interface RulesInfoModalProps {
    title: string;
    content: string;
    onClose: () => void;
}

export function RulesInfoModal({ title, content, onClose }: RulesInfoModalProps) {
    return (
        <div className="rules-info__overlay">
            <div className="rules-info__content">
                <h3 className="rules-info__title text-title-primary">{title}</h3>
                <hr className="rules-info__divider" />
                <div
                    className="rules-info__text text-subtext"
                    style={{ color: 'var(--text-main)', fontSize: '0.95rem' }}
                >
                    {content}
                </div>
                <div className="rules-info__actions">
                    <button
                        type="button"
                        className="action-button action-button--dark rules-modal__close-btn"
                        onClick={onClose}
                    >
                        <XCircle size={18} /> Close
                    </button>
                </div>
            </div>
        </div>
    );
}
