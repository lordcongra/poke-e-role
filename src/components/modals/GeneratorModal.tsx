// src/components/GeneratorModal.tsx
import { useState } from 'react';
import { useCharacterStore } from '../../store/useCharacterStore';
import { generateBuild } from '../../utils/generatorUtils';
import type { TempBuild } from '../../store/storeTypes';
import { GeneratorPreviewModal } from './GeneratorPreviewModal';

export function GeneratorModal({ onClose }: { onClose: () => void }) {
    const state = useCharacterStore();
    const config = useCharacterStore((s) => s.generatorConfig);
    const setConfig = useCharacterStore((s) => s.setGeneratorConfig);
    const speciesName = state.identity.species;

    const [isGenerating, setIsGenerating] = useState(false);
    const [previewBuild, setPreviewBuild] = useState<TempBuild | null>(null);

    const handleGenerate = async () => {
        setIsGenerating(true);
        try {
            const result = await generateBuild(config, state);
            if (result) {
                setPreviewBuild(result);
            } else {
                alert(`Failed to generate build for ${speciesName}.`);
            }
        } catch (error) {
            console.error('Auto-Build Error:', error);
            alert(
                `An error occurred while generating the build: ${error instanceof Error ? error.message : 'Unknown Error'}`
            );
        } finally {
            setIsGenerating(false);
        }
    };

    if (previewBuild) {
        return (
            <GeneratorPreviewModal
                build={previewBuild}
                onClose={() => {
                    setPreviewBuild(null);
                    onClose();
                }}
                onReroll={handleGenerate}
            />
        );
    }

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                background: 'rgba(0,0,0,0.6)',
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
                    width: '340px',
                    border: '2px solid var(--primary)',
                    color: 'var(--text-main)'
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
                    🎲 Auto-Build Pokémon
                </h3>
                <p
                    style={{
                        fontSize: '0.85rem',
                        textAlign: 'center',
                        marginBottom: '15px',
                        color: 'var(--text-muted)'
                    }}
                >
                    Generate stats, skills, and moves based on current Rank.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '15px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <div style={{ flex: 1 }}>
                            <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>
                                Build Tier:
                            </label>
                            <select
                                value={config.buildType}
                                onChange={(e) => setConfig({ buildType: e.target.value })}
                                style={{
                                    width: '100%',
                                    padding: '4px',
                                    border: '1px solid var(--border)',
                                    borderRadius: '4px',
                                    background: 'var(--input-bg)',
                                    color: 'var(--text-main)'
                                }}
                            >
                                <option value="wild">Wild (Random)</option>
                                <option value="average">Average</option>
                                <option value="minmax">Min-Max</option>
                            </select>
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>
                                Combat Bias:
                            </label>
                            <select
                                value={config.combatBias}
                                onChange={(e) => setConfig({ combatBias: e.target.value })}
                                style={{
                                    width: '100%',
                                    padding: '4px',
                                    border: '1px solid var(--border)',
                                    borderRadius: '4px',
                                    background: 'var(--input-bg)',
                                    color: 'var(--text-main)'
                                }}
                            >
                                <option value="balanced">Balanced</option>
                                <option value="physical">Physical Attacker</option>
                                <option value="special">Special Attacker</option>
                                <option value="tank">Tank / Defender</option>
                                {/* AUDIT FIX: Restored Support option to match V1.8! */}
                                <option value="support">Status / Support</option>
                            </select>
                        </div>
                    </div>

                    <div
                        style={{
                            background: 'var(--panel-alt)',
                            padding: '8px',
                            borderRadius: '4px',
                            border: '1px solid var(--border)',
                            marginTop: '4px'
                        }}
                    >
                        <label
                            style={{
                                fontSize: '0.8rem',
                                fontWeight: 'bold',
                                color: 'var(--primary)',
                                display: 'block',
                                marginBottom: '6px',
                                textAlign: 'center'
                            }}
                        >
                            Move Composition
                        </label>
                        <p
                            style={{
                                fontSize: '0.7rem',
                                color: 'var(--text-muted)',
                                textAlign: 'center',
                                margin: '0 0 8px 0',
                                lineHeight: '1.2'
                            }}
                        >
                            Insight will automatically scale to fit this total.
                        </p>
                        <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                <span style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>Attacks</span>
                                <input
                                    type="number"
                                    value={config.targetAtkCount}
                                    onChange={(e) => setConfig({ targetAtkCount: Number(e.target.value) })}
                                    min="0"
                                    max="6"
                                    style={{
                                        width: '40px',
                                        textAlign: 'center',
                                        padding: '2px',
                                        border: '1px solid var(--border)',
                                        borderRadius: '3px',
                                        background: 'var(--input-bg)',
                                        color: 'var(--text-main)'
                                    }}
                                />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                <span style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>Support</span>
                                <input
                                    type="number"
                                    value={config.targetSupCount}
                                    onChange={(e) => setConfig({ targetSupCount: Number(e.target.value) })}
                                    min="0"
                                    max="6"
                                    style={{
                                        width: '40px',
                                        textAlign: 'center',
                                        padding: '2px',
                                        border: '1px solid var(--border)',
                                        borderRadius: '3px',
                                        background: 'var(--input-bg)',
                                        color: 'var(--text-main)'
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    <div style={{ marginTop: '5px', paddingTop: '10px', borderTop: '1px solid var(--border)' }}>
                        <label
                            style={{
                                fontSize: '0.8rem',
                                cursor: 'pointer',
                                color: 'var(--text-main)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                            }}
                        >
                            <input
                                type="checkbox"
                                checked={config.includePmd}
                                onChange={(e) => setConfig({ includePmd: e.target.checked })}
                                style={{ transform: 'scale(1.1)', cursor: 'pointer' }}
                            />
                            Include Knowledge Skills (Lore, Medicine, etc.)
                        </label>
                        <label
                            style={{
                                fontSize: '0.8rem',
                                cursor: 'pointer',
                                color: 'var(--text-main)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                marginTop: '6px'
                            }}
                        >
                            <input
                                type="checkbox"
                                checked={config.includeCustom}
                                onChange={(e) => setConfig({ includeCustom: e.target.checked })}
                                style={{ transform: 'scale(1.1)', cursor: 'pointer' }}
                            />
                            Include Custom Homebrew Skills
                        </label>
                    </div>
                </div>

                <div
                    style={{
                        marginBottom: '15px',
                        padding: '8px',
                        background: '#ffcdd2',
                        color: '#c62828',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 'bold',
                        textAlign: 'center'
                    }}
                >
                    ⚠️ WARNING: This will completely overwrite this token's current stats, skills, and moves!
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                    <button
                        type="button"
                        onClick={onClose}
                        className="action-button action-button--dark"
                        style={{ flex: 1, padding: '6px' }}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleGenerate}
                        disabled={isGenerating}
                        className="action-button action-button--red"
                        style={{ flex: 1, padding: '6px' }}
                    >
                        {isGenerating ? '⏳' : '🎲 Generate'}
                    </button>
                </div>
            </div>
        </div>
    );
}
