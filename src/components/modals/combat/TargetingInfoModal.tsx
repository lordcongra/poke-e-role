import { XCircle } from 'lucide-react';

interface TargetingInfoModalProps {
    config: { title: string; content: string } | null;
    onClose: () => void;
}

export function TargetingInfoModal({ config, onClose }: TargetingInfoModalProps) {
    if (!config) return null;

    return (
        <div className="targeting-info__overlay">
            <div className="targeting-info__content">
                <h3 className="targeting-info__title text-title-primary">{config.title}</h3>
                <hr className="targeting-info__divider" />
                <div
                    className="targeting-info__text text-subtext"
                    style={{ color: 'var(--text-main)', fontSize: '0.95rem' }}
                >
                    {config.content}
                </div>
                <div className="targeting-info__actions">
                    <button
                        type="button"
                        className="action-button action-button--dark targeting-modal__btn text-theme-header"
                        onClick={onClose}
                    >
                        <XCircle size={18} /> Close
                    </button>
                </div>
            </div>
        </div>
    );
}
