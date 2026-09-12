import { HelpCircle, X } from 'lucide-react';

export interface BattleOrganizerTooltipModalProps {
    tooltipInfo: { title: string; desc: string } | null;
    onClose: () => void;
}

export function BattleOrganizerTooltipModal({ tooltipInfo, onClose }: BattleOrganizerTooltipModalProps) {
    if (!tooltipInfo) return null;

    return (
        <div className="bo-settings__overlay" onClick={onClose} role="dialog" aria-modal="true">
            <div className="bo-settings__content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '460px' }}>
                <div className="bo-settings__header-row">
                    <h3 className="bo-settings__title text-title-primary">
                        <HelpCircle size={18} color="var(--primary)" /> {tooltipInfo.title}
                    </h3>
                    <button
                        type="button"
                        className="bo-settings__close-x"
                        onClick={onClose}
                        title="Close info"
                        aria-label="Close info"
                    >
                        <X size={18} />
                    </button>
                </div>
                <div
                    style={{
                        padding: '10px 0',
                        fontSize: '0.88rem',
                        lineHeight: '1.5',
                        color: 'var(--text-main)',
                        whiteSpace: 'pre-line'
                    }}
                >
                    {tooltipInfo.desc}
                </div>
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        gap: '8px',
                        marginTop: '10px'
                    }}
                >
                    <button type="button" className="action-button action-button--primary" onClick={onClose}>
                        Got It
                    </button>
                </div>
            </div>
        </div>
    );
}
