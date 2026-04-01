import { useState, useEffect } from 'react';
import { useCharacterStore } from '../../store/useCharacterStore';
import type { CustomPokemon } from '../../store/storeTypes';
import { HomebrewPokemonStats } from './HomebrewPokemonStats';
import { HomebrewPokemonAbilities } from './HomebrewPokemonAbilities';
import { HomebrewPokemonLearnset } from './HomebrewPokemonLearnset';
import './HomebrewPokemonCard.css';

interface HomebrewPokemonCardProps {
    pokemon: CustomPokemon;
    allTypes: string[];
    allTypeColors: Record<string, string>;
    role: string;
    canEdit: boolean;
    onRemove: () => void;
}

export function HomebrewPokemonCard({
    pokemon,
    allTypes,
    allTypeColors,
    role,
    canEdit,
    onRemove
}: HomebrewPokemonCardProps) {
    const updateCustomPokemon = useCharacterStore((state) => state.updateCustomPokemon);

    const [localName, setLocalName] = useState(pokemon.Name);
    const [localGameMasterOnly, setLocalGameMasterOnly] = useState(pokemon.gmOnly || false);
    const [isCollapsed, setIsCollapsed] = useState(pokemon.Name !== 'New Pokemon');

    useEffect(() => {
        setLocalName(pokemon.Name);
        setLocalGameMasterOnly(pokemon.gmOnly || false);
    }, [pokemon]);

    return (
        <div className="homebrew-pokemon-card">
            <div className="homebrew-pokemon-card__header">
                <button
                    type="button"
                    className={`collapse-btn ${isCollapsed ? 'is-collapsed' : ''}`}
                    onClick={() => setIsCollapsed(!isCollapsed)}
                >
                    ▼
                </button>
                <input
                    type="text"
                    value={localName}
                    onChange={(event) => canEdit && setLocalName(event.target.value)}
                    onBlur={() =>
                        canEdit && localName !== pokemon.Name && updateCustomPokemon(pokemon.id, 'Name', localName)
                    }
                    placeholder="Pokémon Species Name"
                    disabled={!canEdit}
                    className="homebrew-pokemon-card__name-input"
                />
                {role === 'GM' && (
                    <label className="homebrew-pokemon-card__gm-label">
                        <input
                            type="checkbox"
                            checked={localGameMasterOnly}
                            onChange={(event) => {
                                setLocalGameMasterOnly(event.target.checked);
                                updateCustomPokemon(pokemon.id, 'gmOnly', event.target.checked);
                            }}
                        />
                        GM Only
                    </label>
                )}
                {canEdit && (
                    <button
                        onClick={onRemove}
                        className="action-button action-button--red homebrew-pokemon-card__delete-btn"
                    >
                        Delete
                    </button>
                )}
            </div>

            {!isCollapsed && (
                <>
                    <div className="homebrew-pokemon-card__types-row">
                        <select
                            value={pokemon.Type1}
                            onChange={(event) =>
                                canEdit && updateCustomPokemon(pokemon.id, 'Type1', event.target.value)
                            }
                            disabled={!canEdit}
                            className="homebrew-pokemon-card__type-select"
                            style={{
                                background: allTypeColors[pokemon.Type1] || 'var(--input-bg)',
                                color: pokemon.Type1 && pokemon.Type1 !== 'None' ? 'white' : 'var(--text-main)',
                                textShadow: pokemon.Type1 ? '1px 1px 1px rgba(0,0,0,0.8)' : 'none'
                            }}
                        >
                            {allTypes.map((typeOption) => (
                                <option key={`t1-${typeOption}`} value={typeOption}>
                                    {typeOption || '-- Type 1 --'}
                                </option>
                            ))}
                        </select>
                        <select
                            value={pokemon.Type2}
                            onChange={(event) =>
                                canEdit && updateCustomPokemon(pokemon.id, 'Type2', event.target.value)
                            }
                            disabled={!canEdit}
                            className="homebrew-pokemon-card__type-select"
                            style={{
                                background: allTypeColors[pokemon.Type2] || 'var(--input-bg)',
                                color: pokemon.Type2 && pokemon.Type2 !== 'None' ? 'white' : 'var(--text-main)',
                                textShadow: pokemon.Type2 ? '1px 1px 1px rgba(0,0,0,0.8)' : 'none'
                            }}
                        >
                            {allTypes.map((typeOption) => (
                                <option key={`t2-${typeOption}`} value={typeOption}>
                                    {typeOption || '-- Type 2 --'}
                                </option>
                            ))}
                        </select>
                    </div>

                    <HomebrewPokemonStats pokemon={pokemon} canEdit={canEdit} />
                    <HomebrewPokemonAbilities pokemon={pokemon} canEdit={canEdit} />
                    <HomebrewPokemonLearnset pokemon={pokemon} canEdit={canEdit} />
                </>
            )}
        </div>
    );
}
