import React from 'react';
import { Mountain, Shield, Swords, Users, X } from 'lucide-react';
import './BattleOrganizerSettingsModal.css';

export type GrassySideChoice = 'player' | 'foe' | 'both';

export interface GrassyTerrainSideModalProps {
    isOpen: boolean;
    onClose: () => void;
    onApply: (sideChoice: GrassySideChoice) => void;
}

export function GrassyTerrainSideModal({ isOpen, onClose, onApply }: GrassyTerrainSideModalProps) {
    if (!isOpen) return null;

    const options: Array<{
        choice: GrassySideChoice;
        title: string;
        description: string;
        icon: React.ReactNode;
        borderColor: string;
    }> = [
        {
            choice: 'player',
            title: "Player's Side",
            description:
                "Applies to Player's Side (+1 Grass Damage & end-of-round 1 HP recovery). Displays in global Terrain slot.",
            icon: <Shield size={18} color="var(--primary, #3b82f6)" />,
            borderColor: 'var(--primary, #3b82f6)'
        },
        {
            choice: 'foe',
            title: "Foe's Side",
            description:
                "Applies to Foe's Side (+1 Grass Damage & end-of-round 1 HP recovery). Displays in global Terrain slot.",
            icon: <Swords size={18} color="#ef4444" />,
            borderColor: '#ef4444'
        },
        {
            choice: 'both',
            title: 'Both Sides',
            description: 'Applies to Both Sides if both sides used it. Displays in global Terrain slot.',
            icon: <Users size={18} color="#10b981" />,
            borderColor: '#10b981'
        }
    ];

    return (
        <div className="bo-settings__overlay" role="dialog" aria-modal="true" onClick={onClose}>
            <div
                className="bo-settings__content"
                onClick={(e) => e.stopPropagation()}
                style={{ maxWidth: '440px', gap: '14px' }}
            >
                <div className="bo-settings__header-row">
                    <h3 className="bo-settings__title text-title-primary">
                        <Mountain size={18} color="var(--primary)" />
                        Apply Grassy Terrain
                    </h3>
                    <button
                        type="button"
                        className="bo-settings__close-x"
                        onClick={onClose}
                        title="Close"
                        aria-label="Close"
                    >
                        <X size={16} />
                    </button>
                </div>

                <div
                    style={{
                        fontSize: '0.82rem',
                        lineHeight: '1.4',
                        color: 'var(--text-muted, #aaa)'
                    }}
                >
                    In Pokérole, Grassy Terrain's mathematical benefits (+1 Grass Damage & end-of-round 1 HP recovery)
                    only apply to the side that used it, while displaying in the global Terrain slot. Choose which side
                    receives Grassy Terrain:
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {options.map((opt) => (
                        <button
                            key={opt.choice}
                            type="button"
                            onClick={() => {
                                onApply(opt.choice);
                                onClose();
                            }}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                padding: '10px 12px',
                                borderRadius: '8px',
                                background: 'color-mix(in srgb, var(--panel-alt, #262626) 70%, transparent)',
                                border: `1px solid ${opt.borderColor}`,
                                cursor: 'pointer',
                                textAlign: 'left',
                                transition: 'transform 0.1s ease, background 0.15s ease'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background =
                                    'color-mix(in srgb, var(--primary) 15%, var(--panel-alt, #262626))';
                                e.currentTarget.style.transform = 'translateY(-1px)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background =
                                    'color-mix(in srgb, var(--panel-alt, #262626) 70%, transparent)';
                                e.currentTarget.style.transform = 'none';
                            }}
                        >
                            <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>{opt.icon}</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--text-main, #fff)' }}>
                                    {opt.title}
                                </div>
                                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted, #999)', lineHeight: 1.3 }}>
                                    {opt.description}
                                </div>
                            </div>
                        </button>
                    ))}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                    <button
                        type="button"
                        className="action-button action-button--dark"
                        onClick={onClose}
                        style={{ padding: '6px 14px', fontSize: '0.8rem' }}
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}
