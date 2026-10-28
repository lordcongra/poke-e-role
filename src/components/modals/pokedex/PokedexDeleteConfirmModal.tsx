import { AlertTriangle, Trash2, XCircle } from 'lucide-react';

export interface PokedexDeleteConfirmModalProps {
    pokemonName: string;
    onCancel: () => void;
    onConfirm: () => void;
}

export function PokedexDeleteConfirmModal({ pokemonName, onCancel, onConfirm }: PokedexDeleteConfirmModalProps) {
    return (
        <div className="pokedex-confirm-modal__overlay" onClick={onCancel}>
            <div className="pokedex-confirm-modal__content" onClick={(e) => e.stopPropagation()}>
                <h3
                    className="pokedex-confirm-modal__title modal-title-with-icon text-title-primary"
                    style={{ color: 'var(--semantic-danger)' }}
                >
                    <AlertTriangle size={20} /> Confirm Deletion
                </h3>
                <p
                    className="pokedex-confirm-modal__text text-subtext"
                    style={{ color: 'var(--text-main)', fontSize: '0.9rem' }}
                >
                    Are you sure you want to remove &ldquo;{pokemonName}&rdquo; from your Pokédex?
                </p>
                <div className="pokedex-confirm-modal__actions">
                    <button
                        type="button"
                        className="action-button action-button--dark pokedex-confirm-modal__btn text-theme-header"
                        onClick={onCancel}
                    >
                        <XCircle size={16} /> Cancel
                    </button>
                    <button
                        type="button"
                        className="action-button action-button--red pokedex-confirm-modal__btn text-theme-header"
                        onClick={onConfirm}
                    >
                        <Trash2 size={16} /> Delete
                    </button>
                </div>
            </div>
        </div>
    );
}

