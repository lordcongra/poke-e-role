// src/components/RulesModal.tsx
import { useState } from 'react';
import { useCharacterStore } from '../store/useCharacterStore';

const TooltipIcon = ({ onClick }: { onClick: () => void }) => (
    <span
        onClick={onClick}
        style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#555',
            color: 'white',
            borderRadius: '50%',
            width: '16px',
            height: '16px',
            fontSize: '11px',
            cursor: 'pointer',
            marginLeft: '6px',
            fontWeight: 'bold'
        }}
    >
        ?
    </span>
);

export function RulesModal({ onClose }: { onClose: () => void }) {
    const id = useCharacterStore((state) => state.identity);
    const setIdentity = useCharacterStore((state) => state.setIdentity);
    const [modalConfig, setModalConfig] = useState<{ title: string; content: string } | null>(null);

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.6)',
                zIndex: 1200,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center'
            }}
        >
            <div
                style={{
                    background: 'var(--panel-bg)',
                    padding: '20px',
                    borderRadius: '8px',
                    maxWidth: '350px',
                    width: '90%',
                    border: '2px solid #E65100',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.5)'
                }}
            >
                <h3
                    style={{
                        color: '#E65100',
                        marginTop: 0,
                        fontSize: '1.1rem',
                        textAlign: 'center',
                        borderBottom: '1px solid var(--border)',
                        paddingBottom: '8px'
                    }}
                >
                    📜 Room Rules & Permissions
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', margin: '15px 0' }}>
                    <div>
                        <label
                            style={{
                                fontSize: '0.85rem',
                                fontWeight: 'bold',
                                color: 'var(--text-main)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                            }}
                        >
                            Ruleset{' '}
                            <TooltipIcon
                                onClick={() =>
                                    setModalConfig({
                                        title: 'Ruleset Settings',
                                        content:
                                            'Determines how HP and Spec. Defense are calculated. (Global Room Setting)'
                                    })
                                }
                            />
                        </label>
                        <select
                            className="identity-grid__select"
                            value={id.ruleset || 'vg-vit-hp'}
                            onChange={(e) => setIdentity('ruleset', e.target.value)}
                            style={{
                                width: '100%',
                                padding: '6px',
                                border: '1px solid var(--border)',
                                borderRadius: '4px',
                                background: 'var(--input-bg)',
                                color: 'var(--text-main)',
                                marginTop: '4px'
                            }}
                        >
                            <option value="vg-vit-hp">VIT = DEF/HP, INS = SPD</option>
                            <option value="tabletop">VIT = DEF/SPD/HP</option>
                            <option value="vg-high-hp">VIT = DEF, INS = SPD; either VIT/INS used for HP</option>
                        </select>
                    </div>

                    <div>
                        <label
                            style={{
                                fontSize: '0.85rem',
                                fontWeight: 'bold',
                                color: 'var(--text-main)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                            }}
                        >
                            Pain Penalties{' '}
                            <TooltipIcon
                                onClick={() =>
                                    setModalConfig({
                                        title: 'Pain Penalties',
                                        content:
                                            'Automatically applies -1 or -2 success penalties to rolls when at low HP. (Global Room Setting)'
                                    })
                                }
                            />
                        </label>
                        <select
                            className="identity-grid__select"
                            value={id.pain || 'Enabled'}
                            onChange={(e) => setIdentity('pain', e.target.value)}
                            style={{
                                width: '100%',
                                padding: '6px',
                                border: '1px solid var(--border)',
                                borderRadius: '4px',
                                background: 'var(--input-bg)',
                                color: 'var(--text-main)',
                                marginTop: '4px'
                            }}
                        >
                            <option>Enabled</option>
                            <option>Disabled</option>
                        </select>
                    </div>

                    <div>
                        <label
                            style={{
                                fontSize: '0.85rem',
                                fontWeight: 'bold',
                                color: 'var(--text-main)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                            }}
                        >
                            Homebrew Access{' '}
                            <TooltipIcon
                                onClick={() =>
                                    setModalConfig({
                                        title: 'Homebrew Access',
                                        content:
                                            'Controls if players can view or edit the Homebrew Workshop. (Global Room Setting)'
                                    })
                                }
                            />
                        </label>
                        <select
                            className="identity-grid__select"
                            value={id.homebrewAccess || 'Full'}
                            onChange={(e) => setIdentity('homebrewAccess', e.target.value)}
                            style={{
                                width: '100%',
                                padding: '6px',
                                border: '1px solid var(--border)',
                                borderRadius: '4px',
                                background: 'var(--input-bg)',
                                color: 'var(--text-main)',
                                marginTop: '4px'
                            }}
                        >
                            <option value="Full">Full Access</option>
                            <option value="View Only">View Only</option>
                            <option value="None">None (Hidden)</option>
                        </select>
                    </div>
                </div>

                <button
                    type="button"
                    className="action-button action-button--dark"
                    style={{ width: '100%', padding: '8px', fontSize: '1rem', fontWeight: 'bold' }}
                    onClick={onClose}
                >
                    Close
                </button>
            </div>

            {modalConfig && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.6)',
                        zIndex: 1300,
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center'
                    }}
                >
                    <div
                        style={{
                            background: 'var(--panel-bg)',
                            padding: '20px',
                            borderRadius: '6px',
                            maxWidth: '400px',
                            width: '90%',
                            border: '2px solid #C62828',
                            boxShadow: '0 4px 15px rgba(0,0,0,0.5)'
                        }}
                    >
                        <h3 style={{ color: '#C62828', textAlign: 'center', marginTop: 0, fontSize: '1.2rem' }}>
                            {modalConfig.title}
                        </h3>
                        <hr style={{ borderTop: '1px solid var(--border)', marginBottom: '15px' }} />
                        <div
                            style={{
                                color: 'var(--text-main)',
                                fontSize: '0.95rem',
                                whiteSpace: 'pre-wrap',
                                marginBottom: '20px',
                                lineHeight: '1.4'
                            }}
                        >
                            {modalConfig.content}
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <button
                                className="action-button action-button--dark"
                                style={{ width: '100%', padding: '8px', fontSize: '1rem', fontWeight: 'bold' }}
                                onClick={() => setModalConfig(null)}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
