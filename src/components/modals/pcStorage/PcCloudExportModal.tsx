import React, { useState } from 'react';
import type { PcBox, CampaignProfile, PcPokemonSummary } from '../../../types/pcStorageTypes';
import { CloudUpload, FolderHeart, X } from 'lucide-react';
import './PcCloudExportModal.css';

interface PcCloudExportModalProps {
    box: PcBox;
    campaign: CampaignProfile;
    pokemonSummaries: Record<string, PcPokemonSummary>;
    onConfirm: (customSceneName: string) => void;
    onClose: () => void;
}

export const PcCloudExportModal: React.FC<PcCloudExportModalProps> = ({
    box,
    campaign,
    pokemonSummaries,
    onConfirm,
    onClose
}) => {
    const defaultName = `PKR [${campaign.name}] - ${box.name}`;
    const [sceneName, setSceneName] = useState(defaultName);

    const boxPokemon = box.slots
        .filter((id): id is string => Boolean(id))
        .map((id) => pokemonSummaries[id])
        .filter(Boolean);

    return (
        <div className="modal-backdrop pc-cloud-modal-backdrop" onClick={onClose}>
            <div className="modal-container pc-cloud-modal" onClick={(e) => e.stopPropagation()}>
                <header className="modal-header pc-cloud-modal__header">
                    <div className="pc-cloud-modal__title-group">
                        <CloudUpload size={20} className="pc-cloud-modal__icon" />
                        <div>
                            <h3 className="modal-title text-title-primary">Save Box to Owlbear Cloud</h3>
                            <p className="text-subtext">Creates an Owlbear Rodeo Scene Asset in your cloud library</p>
                        </div>
                    </div>
                    <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
                        <X size={16} />
                    </button>
                </header>

                <div className="pc-cloud-modal__body">
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

                    <div className="pc-cloud-modal__hint-box">
                        <FolderHeart size={18} className="pc-cloud-modal__hint-icon" />
                        <div className="pc-cloud-modal__hint-text text-subtext">
                            <strong>Owlbear Asset Library Location:</strong> When you click &quot;Save to Cloud&quot;,
                            Owlbear Rodeo will register the Scene and open your Scene Library. You can drag and drop it
                            into any folder (e.g. &quot;Pokémon PC&quot;, &quot;Party Presets&quot;, or &quot;NPC
                            Vault&quot;).
                        </div>
                    </div>

                    <div className="pc-cloud-modal__preview">
                        <span className="text-label">Included Pokémon ({boxPokemon.length} / 30 slots):</span>
                        {boxPokemon.length === 0 ? (
                            <p className="text-subtext" style={{ fontStyle: 'italic', margin: '4px 0' }}>
                                This box is currently empty. An empty placeholder box template will be saved.
                            </p>
                        ) : (
                            <div className="pc-cloud-modal__tag-list">
                                {boxPokemon.map((p) => (
                                    <span key={p.entityId} className="pc-cloud-modal__pkmn-tag text-subtext">
                                        {p.name || p.species} ({p.species})
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <footer className="modal-footer pc-cloud-modal__footer">
                    <button type="button" className="action-button action-button--dark" onClick={onClose}>
                        Cancel
                    </button>
                    <button
                        type="button"
                        className="action-button action-button--theme"
                        onClick={() => onConfirm(sceneName.trim() || defaultName)}
                    >
                        <CloudUpload size={14} /> Save to Owlbear Cloud
                    </button>
                </footer>
            </div>
        </div>
    );
};
