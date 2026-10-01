import React, { useState } from 'react';
import type { PcBox, CampaignProfile, PcPokemonSummary, TrainerRoster } from '../../../types/pcStorageTypes';
import { CloudUpload, FolderHeart, X, RefreshCw } from 'lucide-react';
import './PcCloudExportModal.css';

interface PcCloudExportModalProps {
    box: PcBox;
    campaign: CampaignProfile;
    pokemonSummaries: Record<string, PcPokemonSummary>;
    partySlots?: (string | null)[];
    trainer?: TrainerRoster;
    boxTheme?: string;
    onConfirm: (
        customSceneName: string,
        includeParty: boolean,
        includeTrainer: boolean,
        targetMode: 'activeScene' | 'cloud'
    ) => void;
    onClose: () => void;
}

export const PcCloudExportModal: React.FC<PcCloudExportModalProps> = ({
    box,
    campaign,
    pokemonSummaries,
    partySlots = [],
    trainer,
    boxTheme,
    onConfirm,
    onClose
}) => {
    const defaultName = `PKR [${campaign.name}] - ${box.name}`;
    const [sceneName, setSceneName] = useState(defaultName);
    const [targetMode, setTargetMode] = useState<'activeScene' | 'cloud'>('activeScene');
    const [includeParty, setIncludeParty] = useState(true);
    const [includeTrainer, setIncludeTrainer] = useState(true);

    const boxPokemon = box.slots
        .filter((id): id is string => Boolean(id))
        .map((id) => pokemonSummaries[id])
        .filter(Boolean);

    const partyPokemon = partySlots
        .filter((id): id is string => Boolean(id))
        .map((id) => pokemonSummaries[id])
        .filter(Boolean);

    const totalPokemon = includeParty ? Array.from(new Set([...boxPokemon, ...partyPokemon])) : boxPokemon;

    return (
        <div
            className="modal-backdrop pc-cloud-modal-backdrop"
            style={
                boxTheme
                    ? ({
                          '--box-theme': boxTheme,
                          '--primary': boxTheme,
                          '--panel-bg': `color-mix(in srgb, ${boxTheme} 12%, var(--base-panel-dark, #1e1e1e))`,
                          '--panel-alt': `color-mix(in srgb, ${boxTheme} 18%, var(--base-panel-alt-dark, #2a2a2a))`,
                          '--border': `color-mix(in srgb, ${boxTheme} 35%, var(--base-border-dark, #383838))`
                      } as React.CSSProperties)
                    : undefined
            }
            onClick={onClose}
        >
            <div
                className="modal-container pc-cloud-modal"
                style={
                    boxTheme
                        ? ({
                              '--box-theme': boxTheme,
                              '--primary': boxTheme,
                              '--panel-bg': `color-mix(in srgb, ${boxTheme} 12%, var(--base-panel-dark, #1e1e1e))`,
                              '--panel-alt': `color-mix(in srgb, ${boxTheme} 18%, var(--base-panel-alt-dark, #2a2a2a))`,
                              '--border': `color-mix(in srgb, ${boxTheme} 35%, var(--base-border-dark, #383838))`
                          } as React.CSSProperties)
                        : undefined
                }
                onClick={(e) => e.stopPropagation()}
            >
                <header className="modal-header pc-cloud-modal__header">
                    <div className="pc-cloud-modal__title-group">
                        <CloudUpload size={20} className="pc-cloud-modal__icon" />
                        <div>
                            <h3 className="modal-title text-title-primary">Backup Box to Owlbear Scene</h3>
                            <p className="text-subtext">
                                Update your open backup scene or create a new Scene Asset in cloud library
                            </p>
                        </div>
                    </div>
                    <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
                        <X size={16} />
                    </button>
                </header>

                <div className="pc-cloud-modal__body">
                    {/* Destination Mode Selector */}
                    <div className="pc-cloud-modal__field">
                        <label className="text-label">Backup Target</label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                                type="button"
                                className={`action-button ${targetMode === 'activeScene' ? 'action-button--theme' : 'action-button--dark'}`}
                                style={{ flex: 1, padding: '7px 10px', fontSize: '0.78rem' }}
                                onClick={() => setTargetMode('activeScene')}
                            >
                                <RefreshCw size={13} /> Update Open Scene
                            </button>
                            <button
                                type="button"
                                className={`action-button ${targetMode === 'cloud' ? 'action-button--theme' : 'action-button--dark'}`}
                                style={{ flex: 1, padding: '7px 10px', fontSize: '0.78rem' }}
                                onClick={() => setTargetMode('cloud')}
                            >
                                <CloudUpload size={13} /> Upload New Scene Asset
                            </button>
                        </div>
                        <span className="text-subtext">
                            {targetMode === 'activeScene'
                                ? 'Updates the token grid directly on the scene you have open right now without creating duplicate scene assets.'
                                : 'Uploads a brand new Scene file into your Owlbear Rodeo Cloud Asset Library.'}
                        </span>
                    </div>

                    {targetMode === 'cloud' && (
                        <div className="pc-cloud-modal__field">
                            <label className="text-label">Scene Asset Name</label>
                            <input
                                type="text"
                                className="pc-cloud-modal__input text-label"
                                value={sceneName}
                                onChange={(e) => setSceneName(e.target.value)}
                                placeholder="e.g. PKR [Kanto] - Box 1 (Grassland)"
                            />
                            <span className="text-subtext">
                                Prefixed with <code>PKR</code> so it is auto-discovered by the Cloud Import picker.
                            </span>
                        </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {trainer && (
                            <label
                                className="text-subtext"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    cursor: 'pointer',
                                    padding: '6px 8px',
                                    background: 'rgba(0, 0, 0, 0.25)',
                                    borderRadius: '6px'
                                }}
                            >
                                <input
                                    type="checkbox"
                                    checked={includeTrainer}
                                    onChange={(e) => setIncludeTrainer(e.target.checked)}
                                    style={{ cursor: 'pointer' }}
                                />
                                <span>
                                    Include Trainer <strong>{trainer.name}</strong> at the head of the backup grid
                                </span>
                            </label>
                        )}

                        {partyPokemon.length > 0 && (
                            <label
                                className="text-subtext"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    cursor: 'pointer',
                                    padding: '6px 8px',
                                    background: 'rgba(0, 0, 0, 0.25)',
                                    borderRadius: '6px'
                                }}
                            >
                                <input
                                    type="checkbox"
                                    checked={includeParty}
                                    onChange={(e) => setIncludeParty(e.target.checked)}
                                    style={{ cursor: 'pointer' }}
                                />
                                <span>
                                    Also include active Trainer Belt (<strong>{partyPokemon.length} Pokémon</strong>) in
                                    backup
                                </span>
                            </label>
                        )}
                    </div>

                    <div className="pc-cloud-modal__hint-box">
                        <FolderHeart size={18} className="pc-cloud-modal__hint-icon" />
                        <div className="pc-cloud-modal__hint-text text-subtext">
                            {targetMode === 'activeScene' ? (
                                <span>
                                    <strong>In-Place Scene Sync:</strong> All tokens for this Box (and Belt) will be
                                    arranged in a clean 300px grid on your open Owlbear map without stacking.
                                </span>
                            ) : (
                                <span>
                                    <strong>Owlbear Asset Library:</strong> A new Scene asset will be saved to your
                                    Owlbear Cloud library with all tokens spaced out.
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="pc-cloud-modal__preview">
                        <span className="text-label">
                            Included in Backup ({totalPokemon.length + (trainer && includeTrainer ? 1 : 0)} items):
                        </span>
                        <div className="pc-cloud-modal__tag-list">
                            {trainer && includeTrainer && (
                                <span
                                    className="pc-cloud-modal__pkmn-tag text-subtext"
                                    style={{
                                        borderColor: 'var(--primary, #3b82f6)',
                                        color: 'var(--primary, #3b82f6)'
                                    }}
                                >
                                    ★ Trainer: {trainer.name}
                                </span>
                            )}
                            {totalPokemon.map((p) => (
                                <span key={p.entityId} className="pc-cloud-modal__pkmn-tag text-subtext">
                                    {p.name || p.species} ({p.species})
                                </span>
                            ))}
                        </div>
                    </div>
                </div>

                <footer className="modal-footer pc-cloud-modal__footer">
                    <button type="button" className="action-button action-button--dark" onClick={onClose}>
                        Cancel
                    </button>
                    <button
                        type="button"
                        className="action-button action-button--theme"
                        onClick={() =>
                            onConfirm(sceneName.trim() || defaultName, includeParty, includeTrainer, targetMode)
                        }
                    >
                        {targetMode === 'activeScene' ? (
                            <>
                                <RefreshCw size={14} /> Update Open Scene
                            </>
                        ) : (
                            <>
                                <CloudUpload size={14} /> Save to Owlbear Cloud
                            </>
                        )}
                    </button>
                </footer>
            </div>
        </div>
    );
};
