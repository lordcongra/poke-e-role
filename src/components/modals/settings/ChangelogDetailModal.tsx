import { useEffect } from 'react';
import { X, ArrowLeft } from 'lucide-react';
import type { ChangelogHighlight } from '../../../data/changelog';

interface ChangelogDetailModalProps {
    highlight: ChangelogHighlight;
    onClose: () => void;
}

export function ChangelogDetailModal({ highlight, onClose }: ChangelogDetailModalProps) {
    const Icon = highlight.icon;

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    return (
        <div
            className="changelog-detail-modal__overlay"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="changelog-detail-title"
        >
            <div className="changelog-detail-modal__content" onClick={(e) => e.stopPropagation()}>
                <div className="changelog-detail-modal__header">
                    <div className="changelog-detail-modal__header-info">
                        <div className="changelog-detail-modal__icon-wrap">
                            <Icon size={22} />
                        </div>
                        <div>
                            <div className="changelog-detail-modal__meta-row">
                                <span className="changelog-detail-modal__version-pill">v{highlight.version}</span>
                                {highlight.badge && (
                                    <span className="changelog-detail-modal__badge">{highlight.badge}</span>
                                )}
                            </div>
                            <h3
                                id="changelog-detail-title"
                                className="changelog-detail-modal__title text-title-primary"
                            >
                                {highlight.title}
                            </h3>
                        </div>
                    </div>
                    <button type="button" onClick={onClose} className="changelog-modal__close-x" title="Close detail">
                        <X size={20} strokeWidth={2.5} />
                    </button>
                </div>

                <div className="changelog-detail-modal__body">{highlight.details}</div>

                <div className="changelog-detail-modal__footer">
                    <button
                        type="button"
                        className="action-button action-button--dark changelog-detail-modal__back-btn"
                        onClick={onClose}
                    >
                        <ArrowLeft size={16} /> Back to Changelog
                    </button>
                </div>
            </div>
        </div>
    );
}
