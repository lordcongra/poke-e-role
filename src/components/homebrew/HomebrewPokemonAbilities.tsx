import { useState, useEffect } from 'react';
import { useCharacterStore } from '../../store/useCharacterStore';
import type { CustomPokemon } from '../../store/storeTypes';
import { Plus, X } from 'lucide-react';
import './HomebrewPokemonCard.css';
import './HomebrewFormCard.css';

interface HomebrewPokemonAbilitiesProps {
    pokemon: CustomPokemon;
    canEdit: boolean;
}

export function HomebrewPokemonAbilities({ pokemon, canEdit }: HomebrewPokemonAbilitiesProps) {
    const updateCustomPokemon = useCharacterStore((state) => state.updateCustomPokemon);

    const [localAbility1, setLocalAbility1] = useState(pokemon.Ability1);
    const [localAbility2, setLocalAbility2] = useState(pokemon.Ability2);
    const [localHiddenAbility, setLocalHiddenAbility] = useState(pokemon.HiddenAbility);
    const [localEventAbilities, setLocalEventAbilities] = useState(pokemon.EventAbilities);
    const [newExtraAbility, setNewExtraAbility] = useState('');

    useEffect(() => {
        setLocalAbility1(pokemon.Ability1);
        setLocalAbility2(pokemon.Ability2);
        setLocalHiddenAbility(pokemon.HiddenAbility);
        setLocalEventAbilities(pokemon.EventAbilities);
    }, [pokemon]);

    const handleAddExtraAbility = () => {
        if (!canEdit || !newExtraAbility.trim()) return;
        const currentExtras = pokemon.ExtraAbilities || [];
        if (!currentExtras.includes(newExtraAbility.trim())) {
            updateCustomPokemon(pokemon.id, 'ExtraAbilities', [...currentExtras, newExtraAbility.trim()]);
        }
        setNewExtraAbility('');
    };

    const handleRemoveExtraAbility = (idx: number) => {
        if (!canEdit) return;
        const currentExtras = pokemon.ExtraAbilities || [];
        updateCustomPokemon(
            pokemon.id,
            'ExtraAbilities',
            currentExtras.filter((_, i) => i !== idx)
        );
    };

    return (
        <div className="homebrew-pokemon-card__abilities-wrapper">
            <div className="homebrew-pokemon-card__abilities-grid">
                <input
                    type="text"
                    list="hb-ability-list"
                    disabled={!canEdit}
                    value={localAbility1}
                    onChange={(event) => canEdit && setLocalAbility1(event.target.value)}
                    onBlur={() =>
                        canEdit &&
                        localAbility1 !== pokemon.Ability1 &&
                        updateCustomPokemon(pokemon.id, 'Ability1', localAbility1)
                    }
                    placeholder="Ability 1"
                    className="homebrew-pokemon-card__ability-input text-label"
                />
                <input
                    type="text"
                    list="hb-ability-list"
                    disabled={!canEdit}
                    value={localAbility2}
                    onChange={(event) => canEdit && setLocalAbility2(event.target.value)}
                    onBlur={() =>
                        canEdit &&
                        localAbility2 !== pokemon.Ability2 &&
                        updateCustomPokemon(pokemon.id, 'Ability2', localAbility2)
                    }
                    placeholder="Ability 2"
                    className="homebrew-pokemon-card__ability-input text-label"
                />
                <input
                    type="text"
                    list="hb-ability-list"
                    disabled={!canEdit}
                    value={localHiddenAbility}
                    onChange={(event) => canEdit && setLocalHiddenAbility(event.target.value)}
                    onBlur={() =>
                        canEdit &&
                        localHiddenAbility !== pokemon.HiddenAbility &&
                        updateCustomPokemon(pokemon.id, 'HiddenAbility', localHiddenAbility)
                    }
                    placeholder="Hidden Ability"
                    className="homebrew-pokemon-card__ability-input text-label"
                />
                <input
                    type="text"
                    list="hb-ability-list"
                    disabled={!canEdit}
                    value={localEventAbilities}
                    onChange={(event) => canEdit && setLocalEventAbilities(event.target.value)}
                    onBlur={() =>
                        canEdit &&
                        localEventAbilities !== pokemon.EventAbilities &&
                        updateCustomPokemon(pokemon.id, 'EventAbilities', localEventAbilities)
                    }
                    placeholder="Event Ability"
                    className="homebrew-pokemon-card__ability-input text-label"
                />
            </div>

            {pokemon.ExtraAbilities && pokemon.ExtraAbilities.length > 0 && (
                <div
                    className="homebrew-pokemon-card__extra-abilities-list"
                    style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}
                >
                    {pokemon.ExtraAbilities.map((ability, idx) => (
                        <span
                            key={idx}
                            className="homebrew-form-card__pill"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                            {ability}
                            {canEdit && (
                                <button
                                    type="button"
                                    className="homebrew-form-card__pill-delete flex-layout--row-center"
                                    onClick={() => handleRemoveExtraAbility(idx)}
                                    title={`Remove ${ability}`}
                                >
                                    <X size={12} />
                                </button>
                            )}
                        </span>
                    ))}
                </div>
            )}

            {canEdit && (
                <div style={{ display: 'flex', gap: '6px', marginTop: '6px', alignItems: 'center' }}>
                    <input
                        type="text"
                        list="hb-ability-list"
                        value={newExtraAbility}
                        onChange={(e) => setNewExtraAbility(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddExtraAbility();
                            }
                        }}
                        placeholder="Add additional ability..."
                        className="homebrew-pokemon-card__ability-input text-label"
                        style={{ flex: 1 }}
                    />
                    <button
                        type="button"
                        className="action-button action-button--dark"
                        onClick={handleAddExtraAbility}
                        style={{ padding: '4px 10px' }}
                    >
                        <Plus size={14} /> Add Ability
                    </button>
                </div>
            )}
        </div>
    );
}
