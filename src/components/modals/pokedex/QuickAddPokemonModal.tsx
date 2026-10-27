import { useState, useRef, useEffect } from 'react';
import { useCharacterStore } from '../../../store/useCharacterStore';
import { fetchPokemonLookupIndex } from '../../../utils/api/api';
import type { PokemonLookupEntry } from '../../../utils/api/apiTypes';
import { BookPlus, Eye, Check, Sparkles, Plus, X } from 'lucide-react';
import './QuickAddPokemonModal.css';

export interface QuickAddPokemonModalProps {
    isOpen: boolean;
    onClose: () => void;
    lookupData?: PokemonLookupEntry[];
}

export function QuickAddPokemonModal({ isOpen, onClose, lookupData: externalLookup }: QuickAddPokemonModalProps) {
    const addPokedexEntry = useCharacterStore((state) => state.addPokedexEntry);

    const [pokemonName, setPokemonName] = useState<string>('');
    const [status, setStatus] = useState<'seen' | 'caught'>('caught');
    const [isShiny, setIsShiny] = useState<boolean>(false);
    const [availableLookup, setAvailableLookup] = useState<PokemonLookupEntry[]>(externalLookup || []);

    const inputRef = useRef<HTMLInputElement>(null);

    // Fetch lookup index if not provided by parent
    useEffect(() => {
        if (externalLookup && externalLookup.length > 0) {
            setAvailableLookup(externalLookup);
            return;
        }

        let isMounted = true;
        fetchPokemonLookupIndex()
            .then((data) => {
                if (isMounted) setAvailableLookup(data);
            })
            .catch((err) => {
                console.error('[QuickAddPokemonModal] Failed to fetch lookup index:', err);
            });

        return () => {
            isMounted = false;
        };
    }, [externalLookup]);

    // Auto-focus input on open
    useEffect(() => {
        if (isOpen) {
            inputRef.current?.focus();
        }
    }, [isOpen]);

    // Handle Escape key to close
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const clean = pokemonName.trim();
        if (!clean) return;

        addPokedexEntry(clean, {
            seen: true,
            caught: status === 'caught',
            shiny: isShiny
        });

        onClose();
    };

    return (
        <div
            className="quick-add-modal__overlay"
            onClick={(e) => {
                if (e.target === e.currentTarget) {
                    onClose();
                }
            }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="quick-add-pokemon-title"
        >
            <div className="quick-add-modal__content">
                <div className="quick-add-modal__header">
                    <h3 id="quick-add-pokemon-title" className="quick-add-modal__title text-title-primary">
                        <BookPlus size={18} /> Register Pokémon
                    </h3>
                    <button
                        type="button"
                        className="quick-add-modal__close-btn"
                        onClick={onClose}
                        title="Close"
                        aria-label="Close"
                    >
                        <X size={18} />
                    </button>
                </div>

                <form className="quick-add-modal__form" onSubmit={handleSubmit}>
                    <div className="quick-add-modal__field">
                        <label htmlFor="quick-add-pokemon-input" className="text-label">
                            Pokémon Name
                        </label>
                        <input
                            ref={inputRef}
                            id="quick-add-pokemon-input"
                            type="text"
                            list="quick-add-pokemon-datalist"
                            className="quick-add-modal__input"
                            placeholder="e.g. Bulbasaur, Quagsire..."
                            value={pokemonName}
                            onChange={(e) => setPokemonName(e.target.value)}
                            autoComplete="off"
                            autoFocus
                        />
                        <datalist id="quick-add-pokemon-datalist">
                            {availableLookup.map((p) => (
                                <option key={`quick-add-opt-${p.name}`} value={p.name} />
                            ))}
                        </datalist>
                    </div>

                    <div className="quick-add-modal__field">
                        <span className="text-label">Registration Status</span>
                        <div className="quick-add-modal__status-group" role="group" aria-label="Registration status">
                            <button
                                type="button"
                                className={`quick-add-modal__status-btn ${status === 'seen' ? 'is-active is-seen' : ''}`}
                                onClick={() => setStatus('seen')}
                                title="Mark as Seen only"
                            >
                                <Eye size={14} /> Seen
                            </button>
                            <button
                                type="button"
                                className={`quick-add-modal__status-btn ${status === 'caught' ? 'is-active is-caught' : ''}`}
                                onClick={() => setStatus('caught')}
                                title="Mark as Caught (and Seen)"
                            >
                                <Check size={14} strokeWidth={2.5} /> Caught
                            </button>
                        </div>
                    </div>

                    <label className={`quick-add-modal__checkbox-label ${isShiny ? 'is-shiny-active' : ''}`}>
                        <input type="checkbox" checked={isShiny} onChange={(e) => setIsShiny(e.target.checked)} />
                        <Sparkles size={14} /> Shiny Discovery
                    </label>

                    <div className="quick-add-modal__actions">
                        <button
                            type="button"
                            className="action-button action-button--dark quick-add-modal__btn"
                            onClick={onClose}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="action-button action-button--theme quick-add-modal__btn"
                            disabled={!pokemonName.trim()}
                        >
                            <Plus size={14} /> Register
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
