import { Sparkles, X } from 'lucide-react';

export interface BattleOrganizerPullModalProps {
    isOpen: boolean;
    mode?: 'replace' | 'merge';
    hasExistingCombatants: boolean;
    resetPullTrackers: boolean;
    onToggleResetTrackers: (checked: boolean) => void;
    onConfirm: (options?: { mergeOnly?: boolean }) => void;
    onClose: () => void;
}

export function BattleOrganizerPullModal({
    isOpen,
    mode = 'replace',
    hasExistingCombatants,
    resetPullTrackers,
    onToggleResetTrackers,
    onConfirm,
    onClose
}: BattleOrganizerPullModalProps) {
    if (!isOpen) return null;

    const isMergeMode = mode === 'merge';

    return (
        <div className="bo-settings__overlay" onClick={onClose} role="dialog" aria-modal="true">
            <div className="bo-settings__content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
                <div className="bo-settings__header-row">
                    <h3 className="bo-settings__title text-title-primary">
                        <Sparkles size={20} color="var(--primary)" />{' '}
                        {isMergeMode ? 'Add New from Initiative' : 'Pull From Initiative'}
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
                    {isMergeMode
                        ? 'This will import only new additions (such as swapped-out Pokémon) from the initiative tracker into this round without touching existing combatants.'
                        : hasExistingCombatants
                          ? 'Would you like to pull only new additions (such as swapped-out Pokémon) or replace the entire combatant lineup with the initiative list?'
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
                            Reset actions + clash/evade?
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
                        {isMergeMode || hasExistingCombatants
                            ? 'Clears action counts and unchecks Evade / Clash for newly imported tokens only.'
                            : 'Clears action counts and unchecks Evade / Clash on both the organizer and token sheets.'}
                    </div>
                </div>

                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        flexWrap: 'wrap',
                        gap: '8px',
                        marginTop: '8px'
                    }}
                >
                    <button type="button" className="action-button action-button--dark" onClick={onClose}>
                        Cancel
                    </button>
                    {isMergeMode ? (
                        <button
                            type="button"
                            className="action-button action-button--primary"
                            onClick={() => onConfirm({ mergeOnly: true })}
                            title="Appends newly swapped Pokémon into this round without touching existing combatants"
                        >
                            Add New Combatants
                        </button>
                    ) : hasExistingCombatants ? (
                        <>
                            <button
                                type="button"
                                className="action-button action-button--secondary"
                                onClick={() => onConfirm({ mergeOnly: true })}
                                title="Appends newly swapped Pokémon into this round without touching existing combatants"
                            >
                                Add New Only
                            </button>
                            <button
                                type="button"
                                className="action-button action-button--primary"
                                onClick={() => onConfirm({ mergeOnly: false })}
                                title="Replaces the entire lineup in this round with current initiative order"
                            >
                                Replace All
                            </button>
                        </>
                    ) : (
                        <button
                            type="button"
                            className="action-button action-button--primary"
                            onClick={() => onConfirm({ mergeOnly: false })}
                        >
                            Pull Combatants
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
