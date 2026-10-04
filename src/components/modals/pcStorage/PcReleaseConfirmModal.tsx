import React from 'react';
import type { PcPokemonSummary } from '../../../types/pcStorageTypes';
import { getAbsolutePokeballUrl } from '../../../utils/generators/trainerTokenSpawner';
import { useResolvedImageUrl } from '../../../utils/graphics/useResolvedImageUrl';
import { AlertTriangle, Trash2, X, Unlink } from 'lucide-react';
import './PcReleaseConfirmModal.css';

interface PcReleaseConfirmModalProps {
    pokemon: PcPokemonSummary;
    mode?: 'release' | 'unlink';
    onConfirm: () => void;
    onUnlink?: () => void;
    onClose: () => void;
}

export const PcReleaseConfirmModal: React.FC<PcReleaseConfirmModalProps> = ({
    pokemon,
    mode = 'release',
    onConfirm,
    onUnlink,
    onClose
}) => {
    const displayName = pokemon.name || pokemon.species;
    const resolvedAvatar = useResolvedImageUrl(pokemon.tokenImageUrl, getAbsolutePokeballUrl());
    const isUnlink = mode === 'unlink';

    return (
        <div className="pc-release-modal-backdrop" onClick={onClose}>
            <div className="pc-release-modal" onClick={(e) => e.stopPropagation()}>
                <header className="pc-release-modal__header">
                    <div className="pc-release-modal__title-group">
                        {isUnlink ? <Unlink size={18} /> : <AlertTriangle size={18} />}
                        <h3 className="pc-release-modal__title">
                            {isUnlink ? `Unlink ${displayName} from PC?` : `Release ${displayName}?`}
                        </h3>
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
                                    ? ` • ${pokemon.type1}${
                                          pokemon.type2 &&
                                          pokemon.type2.toLowerCase() !== 'none' &&
                                          pokemon.type2.trim() !== ''
                                              ? ` / ${pokemon.type2}`
                                              : ''
                                      }`
                                    : ''}
                            </span>
                            <span className="pc-release-modal__card-meta text-subtext">
                                HP: {pokemon.hp} / {pokemon.maxHp} | Will: {pokemon.will} / {pokemon.maxWill}
                            </span>
                        </div>
                    </div>

                    <div className="pc-release-modal__warning-box">
                        {isUnlink ? (
                            <span>
                                Are you sure you want to unlink <strong>{displayName}</strong> from your PC and Party?
                                Their character token will remain placed on the battle map.
                            </span>
                        ) : (
                            <span>
                                Are you sure you want to release <strong>{displayName}</strong> into the wild? This will
                                permanently remove their data from your PC and Trainer Belts.
                            </span>
                        )}

                        <span
                            className="pc-release-modal__map-note"
                            style={{
                                color: isUnlink ? 'var(--secondary, #3b82f6)' : 'var(--semantic-danger, #ef4444)',
                                fontWeight: 500,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                marginTop: '6px'
                            }}
                        >
                            <AlertTriangle size={15} style={{ flexShrink: 0 }} />
                            <span>
                                <strong>Table Sync Notice:</strong> This action synchronizes across the table and will
                                also {isUnlink ? 'unlink' : 'release'} this Pokémon on the other player&apos;s /
                                GM&apos;s side.
                            </span>
                        </span>
                    </div>
                </div>

                <footer className="pc-release-modal__footer">
                    <button type="button" className="action-button action-button--dark" onClick={onClose}>
                        {isUnlink ? 'Keep in PC' : 'Keep Pokémon'}
                    </button>
                    {!isUnlink && onUnlink && (
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
                        className={`action-button ${isUnlink ? 'action-button--theme' : 'action-button--red'} pc-release-modal__confirm-btn`}
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                    >
                        {isUnlink ? <Unlink size={14} /> : <Trash2 size={14} />}
                        {isUnlink ? ' Confirm Unlink' : ' Release Pokémon'}
                    </button>
                </footer>
            </div>
        </div>
    );
};
