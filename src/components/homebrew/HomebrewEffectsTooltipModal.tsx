import { XCircle } from 'lucide-react';

interface HomebrewEffectsTooltipModalProps {
    tooltip: { title: string; content: string } | null;
    onClose: () => void;
}

export function HomebrewEffectsTooltipModal({ tooltip, onClose }: HomebrewEffectsTooltipModalProps) {
    if (!tooltip) return null;

    return (
        <div
            className="homebrew-item-effects__tooltip-overlay"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div className="homebrew-item-effects__tooltip-modal">
                <h3 className="homebrew-item-effects__tooltip-title text-title-primary">{tooltip.title}</h3>
                <hr className="homebrew-item-effects__tooltip-divider" />
                <p className="homebrew-item-effects__tooltip-text text-subtext">{tooltip.content}</p>
                <div className="homebrew-item-effects__tooltip-actions">
                    <button type="button" className="action-button action-button--dark" onClick={onClose}>
                        <XCircle size={14} /> Close
                    </button>
                </div>
            </div>
        </div>
    );
}
