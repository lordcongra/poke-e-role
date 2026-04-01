// src/components/SpeciesChangeModal.tsx
import { useState } from 'react';
import { useCharacterStore } from '../../store/useCharacterStore';

interface SpeciesChangeModalProps {
    pendingSpeciesData: Record<string, unknown>;
    onClose: () => void;
}

export function SpeciesChangeModal({ pendingSpeciesData, onClose }: SpeciesChangeModalProps) {
    const applySpeciesData = useCharacterStore((state) => state.applySpeciesData);
    const [swapUpdateStats, setSwapUpdateStats] = useState(true);

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.6)',
                zIndex: 1000,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center'
            }}
        >
            <div
                style={{
                    background: 'var(--panel-bg)',
                    padding: '15px',
                    borderRadius: '8px',
                    width: '320px',
                    border: '2px solid var(--primary)',
                    color: 'var(--text-main)',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.5)'
                }}
            >
                <h3
                    style={{
                        marginTop: 0,
                        color: 'var(--primary)',
                        fontSize: '1.1rem',
                        borderBottom: '1px solid var(--border)',
                        paddingBottom: '4px',
                        textAlign: 'center'
                    }}
                >
                    🧬 Species Changed
                </h3>
                <p
                    style={{
                        fontSize: '0.85rem',
                        textAlign: 'center',
                        marginBottom: '15px',
                        color: 'var(--text-muted)'
                    }}
                >
                    You loaded a new Pokémon. How do you want to handle existing data?
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <button
                        type="button"
                        onClick={() => {
                            applySpeciesData(pendingSpeciesData, false, swapUpdateStats);
                            onClose();
                        }}
                        className="action-button action-button--dark"
                        style={{ background: '#1976d2', borderColor: '#1976d2', padding: '8px', fontSize: '0.9rem' }}
                    >
                        🔄 Form Change / Mega Evolve
                        <br />
                        <span style={{ fontSize: '0.7rem', fontWeight: 'normal' }}>
                            (Updates Typing/Ability, Keeps Moves/Skills)
                        </span>
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            applySpeciesData(pendingSpeciesData, true, swapUpdateStats);
                            onClose();
                        }}
                        className="action-button action-button--red"
                        style={{ padding: '8px', fontSize: '0.9rem' }}
                    >
                        ⚠️ Brand New Pokémon
                        <br />
                        <span style={{ fontSize: '0.7rem', fontWeight: 'normal' }}>
                            (Wipes Moves & Skills completely)
                        </span>
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        className="action-button action-button--dark"
                        style={{ padding: '6px', marginTop: '4px' }}
                    >
                        Cancel Change
                    </button>
                </div>

                <div
                    style={{
                        marginTop: '15px',
                        paddingTop: '10px',
                        borderTop: '1px solid var(--border)',
                        textAlign: 'center'
                    }}
                >
                    <label
                        style={{
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                            color: 'var(--text-main)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px'
                        }}
                    >
                        <input
                            type="checkbox"
                            checked={swapUpdateStats}
                            onChange={(e) => setSwapUpdateStats(e.target.checked)}
                            style={{ transform: 'scale(1.1)', cursor: 'pointer' }}
                        />
                        Overwrite Base Stats & Limits
                    </label>
                </div>
            </div>
        </div>
    );
}
