import { useState, useEffect } from 'react';
import { useCharacterStore } from '../store/useCharacterStore';
import type { CustomPokemon } from '../store/storeTypes';
import { NumberSpinner } from './NumberSpinner';
import { LearnsetMoveRow } from './LearnsetMoveRow';
import { RANKS } from '../data/constants';

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
    const [localAbility1, setLocalAbility1] = useState(pokemon.Ability1);
    const [localAbility2, setLocalAbility2] = useState(pokemon.Ability2);
    const [localHiddenAbility, setLocalHiddenAbility] = useState(pokemon.HiddenAbility);
    const [localEventAbilities, setLocalEventAbilities] = useState(pokemon.EventAbilities);
    const [localGameMasterOnly, setLocalGameMasterOnly] = useState(pokemon.gmOnly || false);

    const [isCollapsed, setIsCollapsed] = useState(pokemon.Name !== 'New Pokemon');

    useEffect(() => {
        setLocalName(pokemon.Name);
        setLocalAbility1(pokemon.Ability1);
        setLocalAbility2(pokemon.Ability2);
        setLocalHiddenAbility(pokemon.HiddenAbility);
        setLocalEventAbilities(pokemon.EventAbilities);
        setLocalGameMasterOnly(pokemon.gmOnly || false);
    }, [pokemon]);

    const addLearnsetMove = (rank: string) => {
        updateCustomPokemon(pokemon.id, 'Moves', [...pokemon.Moves, { Learned: rank, Name: '' }]);
    };

    const renderStatInput = (
        label: string,
        baseField: keyof CustomPokemon,
        maxField: keyof CustomPokemon,
        baseValue: number,
        maxValue: number
    ) => {
        const isHp = baseField === maxField;
        return (
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'var(--row-even)',
                    padding: '6px 8px',
                    borderRadius: '6px',
                    border: '1px solid var(--border)'
                }}
            >
                <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>{label}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <span
                            style={{
                                fontSize: '0.6rem',
                                color: 'var(--text-muted)',
                                marginBottom: '2px',
                                fontWeight: 'bold'
                            }}
                        >
                            Base
                        </span>
                        <div style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.5)', borderRadius: '4px' }}>
                            <NumberSpinner
                                value={baseValue}
                                onChange={(value) => canEdit && updateCustomPokemon(pokemon.id, baseField, value)}
                                min={0}
                                disabled={!canEdit}
                            />
                        </div>
                    </div>
                    {!isHp && (
                        <>
                            <span style={{ color: 'var(--text-muted)', marginTop: '10px', fontWeight: 'bold' }}>/</span>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <span
                                    style={{
                                        fontSize: '0.6rem',
                                        color: 'var(--text-muted)',
                                        marginBottom: '2px',
                                        fontWeight: 'bold'
                                    }}
                                >
                                    Limit
                                </span>
                                <div style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.5)', borderRadius: '4px' }}>
                                    <NumberSpinner
                                        value={maxValue}
                                        onChange={(value) =>
                                            canEdit && updateCustomPokemon(pokemon.id, maxField, value)
                                        }
                                        min={0}
                                        disabled={!canEdit}
                                    />
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div
            style={{
                background: 'var(--panel-alt)',
                border: '2px solid var(--primary)',
                borderRadius: '6px',
                padding: '10px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                flexShrink: 0
            }}
        >
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
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
                    style={{
                        flex: 1,
                        padding: '6px',
                        fontWeight: 'bold',
                        background: 'var(--input-bg)',
                        color: 'var(--text-main)',
                        border: '1px solid var(--border)',
                        borderRadius: '4px'
                    }}
                />
                {role === 'GM' && (
                    <label
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '0.7rem',
                            color: '#c62828',
                            fontWeight: 'bold'
                        }}
                    >
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
                        className="action-button action-button--red"
                        style={{ padding: '6px 12px' }}
                    >
                        Delete
                    </button>
                )}
            </div>

            {!isCollapsed && (
                <>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <select
                            value={pokemon.Type1}
                            onChange={(event) =>
                                canEdit && updateCustomPokemon(pokemon.id, 'Type1', event.target.value)
                            }
                            disabled={!canEdit}
                            style={{
                                flex: 1,
                                padding: '4px',
                                background: allTypeColors[pokemon.Type1] || 'var(--input-bg)',
                                color: pokemon.Type1 && pokemon.Type1 !== 'None' ? 'white' : 'var(--text-main)',
                                border: '1px solid var(--border)',
                                borderRadius: '4px',
                                fontWeight: 'bold',
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
                            style={{
                                flex: 1,
                                padding: '4px',
                                background: allTypeColors[pokemon.Type2] || 'var(--input-bg)',
                                color: pokemon.Type2 && pokemon.Type2 !== 'None' ? 'white' : 'var(--text-main)',
                                border: '1px solid var(--border)',
                                borderRadius: '4px',
                                fontWeight: 'bold',
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

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                        {renderStatInput('HP', 'BaseHP', 'BaseHP', pokemon.BaseHP, pokemon.BaseHP)}
                        {renderStatInput('STR', 'Strength', 'MaxStrength', pokemon.Strength, pokemon.MaxStrength)}
                        {renderStatInput('DEX', 'Dexterity', 'MaxDexterity', pokemon.Dexterity, pokemon.MaxDexterity)}
                        {renderStatInput('VIT', 'Vitality', 'MaxVitality', pokemon.Vitality, pokemon.MaxVitality)}
                        {renderStatInput('SPE', 'Special', 'MaxSpecial', pokemon.Special, pokemon.MaxSpecial)}
                        {renderStatInput('INS', 'Insight', 'MaxInsight', pokemon.Insight, pokemon.MaxInsight)}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
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
                            style={{
                                padding: '4px',
                                background: 'var(--input-bg)',
                                color: 'var(--text-main)',
                                border: '1px solid var(--border)',
                                borderRadius: '4px',
                                fontSize: '0.8rem'
                            }}
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
                            style={{
                                padding: '4px',
                                background: 'var(--input-bg)',
                                color: 'var(--text-main)',
                                border: '1px solid var(--border)',
                                borderRadius: '4px',
                                fontSize: '0.8rem'
                            }}
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
                            style={{
                                padding: '4px',
                                background: 'var(--input-bg)',
                                color: 'var(--text-main)',
                                border: '1px solid var(--border)',
                                borderRadius: '4px',
                                fontSize: '0.8rem'
                            }}
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
                            style={{
                                padding: '4px',
                                background: 'var(--input-bg)',
                                color: 'var(--text-main)',
                                border: '1px solid var(--border)',
                                borderRadius: '4px',
                                fontSize: '0.8rem'
                            }}
                        />
                    </div>

                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: '10px' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--primary)' }}>
                            Learnset Categories
                        </span>
                        <div
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px',
                                marginTop: '6px',
                                maxHeight: '200px',
                                overflowY: 'auto',
                                paddingRight: '4px'
                            }}
                        >
                            {[...RANKS, 'Other'].map((rankOption) => {
                                const movesInRank = pokemon.Moves.map((move, index) => ({ move, index })).filter(
                                    (item) => item.move.Learned === rankOption
                                );
                                return (
                                    <div
                                        key={rankOption}
                                        style={{
                                            background: 'var(--row-odd)',
                                            padding: '6px',
                                            borderRadius: '4px',
                                            border: '1px solid var(--border)'
                                        }}
                                    >
                                        <div
                                            style={{
                                                fontSize: '0.8rem',
                                                fontWeight: 'bold',
                                                color: 'var(--primary)',
                                                marginBottom: '4px'
                                            }}
                                        >
                                            {rankOption}
                                        </div>
                                        {movesInRank.map(({ move, index }) => (
                                            <LearnsetMoveRow
                                                key={index}
                                                pokemonId={pokemon.id}
                                                moveIndex={index}
                                                move={move}
                                                currentMoves={pokemon.Moves}
                                                canEdit={canEdit}
                                            />
                                        ))}
                                        {canEdit && (
                                            <button
                                                onClick={() => addLearnsetMove(rankOption)}
                                                className="action-button action-button--dark"
                                                style={{ padding: '2px 6px', fontSize: '0.75rem', marginTop: '2px' }}
                                            >
                                                + Add {rankOption} Move
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
