import { useState, useEffect } from 'react';
import { useCharacterStore } from '../store/useCharacterStore';
import type { CustomPokemon } from '../store/storeTypes';
import './HomebrewPokemonCard.css';

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

    useEffect(() => {
        setLocalAbility1(pokemon.Ability1);
        setLocalAbility2(pokemon.Ability2);
        setLocalHiddenAbility(pokemon.HiddenAbility);
        setLocalEventAbilities(pokemon.EventAbilities);
    }, [pokemon]);

    return (
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
                className="homebrew-pokemon-card__ability-input"
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
                className="homebrew-pokemon-card__ability-input"
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
                className="homebrew-pokemon-card__ability-input"
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
                className="homebrew-pokemon-card__ability-input"
            />
        </div>
    );
}
