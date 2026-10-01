import React from 'react';
import type { PcPokemonSummary } from '../../../types/pcStorageTypes';
import { getAbsolutePokeballUrl } from '../../../utils/generators/trainerTokenSpawner';
import { useResolvedImageUrl } from '../../../utils/graphics/useResolvedImageUrl';
import { AlertTriangle, Trash2, X, Unlink } from 'lucide-react';
import './PcReleaseConfirmModal.css';

interface PcReleaseConfirmModalProps {
    pokemon: PcPokemonSummary;
    onConfirm: () => void;
    onUnlink?: () => void;
    onClose: () => void;
}

export const PcReleaseConfirmModal: React.FC<PcReleaseConfirmModalProps> = ({
    pokemon,
    onConfirm,
    onUnlink,
    onClose
}) => {
    const displayName = pokemon.name || pokemon.species;
    const resolvedAvatar = useResolvedImageUrl(pokemon.tokenImageUrl, getAbsolutePokeballUrl());

    return (
        <div className="pc-release-modal-backdrop" onClick={onClose}>
            <div className="pc-release-modal" onClick={(e) => e.stopPropagation()}>
                <header className="pc-release-modal__header">
                    <div className="pc-release-modal__title-group">
                        <AlertTriangle size={18} />
                        <h3 className="pc-release-modal__title">Release {displayName}?</h3>
                    </div>
                    <button type="button" className="pc-release-modal__close-btn" onClick={onClose} aria-label="Close">
                        <X size={16} />
                    </button>
                </header>

                <div className="pc-release-modal__body">
                    <div className="pc-release-modal__card">
                        <img
                            src={resolvedAvatar}
                            alt={displayName}
                            className="pc-release-modal__avatar"
                            onError={(e) => {
                                e.currentTarget.src = getAbsolutePokeballUrl();
                            }}
                        />
                        <div className="pc-release-modal__card-info">
                            <span className="pc-release-modal__card-name">{displayName}</span>
                            <span className="pc-release-modal__card-meta text-subtext">
                                {pokemon.species} • {pokemon.rank || 'Starter'}
                                {pokemon.type1
                                    ? ` • ${pokemon.type1}${pokemon.type2 ? ` / ${pokemon.type2}` : ''}`
                                    : ''}
                            </span>
                            <span className="pc-release-modal__card-meta text-subtext">
                                HP: {pokemon.hp} / {pokemon.maxHp} | Will: {pokemon.will} / {pokemon.maxWill}
                            </span>
                        </div>
                    </div>

                    <div className="pc-release-modal__warning-box">
                        <span>
                            Are you sure you want to release <strong>{displayName}</strong> into the wild? This will
                            permanently remove their data from your PC and Trainer Belts.
                        </span>
                        {pokemon.isOnMap ? (
                            <span className="pc-release-modal__map-note">
                                <strong>Map Token Note:</strong> This Pokémon is currently on the battle map. Releasing
                                will <strong>NOT</strong> delete their token from the map, so you can choose to keep or
                                delete the map token separately.
                            </span>
                        ) : (
                            <span className="pc-release-modal__map-note">
                                This action is permanent and cannot be undone.
                            </span>
                        )}
                    </div>
                </div>

                <footer className="pc-release-modal__footer">
                    <button type="button" className="action-button action-button--dark" onClick={onClose}>
                        Keep Pokémon
                    </button>
                    {onUnlink && (
                        <button
                            type="button"
                            className="action-button action-button--secondary"
                            onClick={() => {
                                onUnlink();
                                onClose();
                            }}
                            title="Unlink from PC/Party and leave on the battle map"
                        >
                            <Unlink size={13} /> Unlink to Map
                        </button>
                    )}
                    <button
                        type="button"
                        className="action-button action-button--red pc-release-modal__confirm-btn"
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                    >
                        <Trash2 size={14} /> Release Pokémon
                    </button>
                </footer>
            </div>
        </div>
    );
};
