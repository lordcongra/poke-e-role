import { Sparkles, X } from 'lucide-react';

export interface BattleOrganizerPullModalProps {
    isOpen: boolean;
    hasExistingCombatants: boolean;
    resetPullTrackers: boolean;
    onToggleResetTrackers: (checked: boolean) => void;
    onConfirm: () => void;
    onClose: () => void;
}

export function BattleOrganizerPullModal({
    isOpen,
    hasExistingCombatants,
    resetPullTrackers,
    onToggleResetTrackers,
    onConfirm,
    onClose
}: BattleOrganizerPullModalProps) {
    if (!isOpen) return null;

    return (
        <div className="bo-settings__overlay" onClick={onClose} role="dialog" aria-modal="true">
            <div className="bo-settings__content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px' }}>
                <div className="bo-settings__header-row">
                    <h3 className="bo-settings__title text-title-primary">
                        <Sparkles size={20} color="var(--primary)" /> Pull From Initiative
                    </h3>
                    <button
                        type="button"
                        className="bo-settings__close-x"
                        onClick={onClose}
                        title="Close dialog"
                        aria-label="Close dialog"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div
                    style={{
                        padding: '8px 0',
                        fontSize: '0.88rem',
                        lineHeight: '1.4',
                        color: 'var(--text-main)'
                    }}
                >
                    {hasExistingCombatants
                        ? 'This will replace the current combatant lineup and initiative in the Battle Organizer with active tokens from the initiative tracker.'
                        : 'Import active tokens and rolled initiatives from the initiative tracker into this round.'}
                </div>

                <div
                    style={{
                        margin: '10px 0 14px',
                        padding: '10px 12px',
                        backgroundColor: 'var(--panel-alt, #282828)',
                        borderRadius: '6px',
                        border: '1px solid var(--border, #333)'
                    }}
                >
                    <label
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            cursor: 'pointer',
                            userSelect: 'none'
                        }}
                    >
                        <input
                            type="checkbox"
                            checked={resetPullTrackers}
                            onChange={(e) => onToggleResetTrackers(e.target.checked)}
                            style={{
                                width: '16px',
                                height: '16px',
                                cursor: 'pointer',
                                accentColor: 'var(--primary)'
                            }}
                        />
                        <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-main)' }}>
                            Reset tokens actions + clash/evade?
                        </span>
                    </label>
                    <div
                        style={{
                            fontSize: '0.78rem',
                            color: 'var(--text-muted, #aaa)',
                            marginLeft: '26px',
                            marginTop: '4px',
                            lineHeight: '1.3'
                        }}
                    >
                        Clears action counts and unchecks Evade / Clash on both the organizer and token sheets.
                    </div>
                </div>

                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        gap: '8px',
                        marginTop: '8px'
                    }}
                >
                    <button type="button" className="action-button action-button--dark" onClick={onClose}>
                        Cancel
                    </button>
                    <button type="button" className="action-button action-button--primary" onClick={onConfirm}>
                        Pull Combatants
                    </button>
                </div>
            </div>
        </div>
    );
}
