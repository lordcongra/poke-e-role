import { useEffect, useState } from 'react';
import { useCharacterStore } from '../../store/useCharacterStore';
import type { Rank } from '../../store/storeTypes';
import { loadLocalDataset, ALL_ABILITIES, SPECIES_URLS } from '../../utils/api';
import { POKEMON_TYPES, TYPE_COLORS, NATURES, AGES, RANKS } from '../../data/constants';
import { TooltipIcon } from '../ui/TooltipIcon';
import { CustomInfoRow } from '../ui/CustomInfoRow';
import { SpeciesSelector } from './SpeciesSelector';

interface IdentityGridProps {
    onOpenGenerator: () => void;
    onOpenAbility: () => void;
    onOpenNature: () => void;
}

export function IdentityGrid({ onOpenGenerator, onOpenAbility, onOpenNature }: IdentityGridProps) {
    const identityStore = useCharacterStore((state) => state.identity) || {};
    const setIdentity = useCharacterStore((state) => state.setIdentity);
    const setMode = useCharacterStore((state) => state.setMode);

    const customInfo = useCharacterStore((state) => state.customInfo);
    const removeCustomInfo = useCharacterStore((state) => state.removeCustomInfo);

    const role = useCharacterStore((state) => state.role);
    const roomCustomTypes = useCharacterStore((state) => state.roomCustomTypes);
    const roomCustomAbilities = useCharacterStore((state) => state.roomCustomAbilities);
    const roomCustomPokemon = useCharacterStore((state) => state.roomCustomPokemon);

    const filteredTypes = roomCustomTypes.filter((type) => role === 'GM' || !type.gmOnly);
    const filteredAbilities = roomCustomAbilities.filter((ability) => role === 'GM' || !ability.gmOnly);
    const filteredPokemon = roomCustomPokemon.filter((pokemon) => role === 'GM' || !pokemon.gmOnly);

    const allTypes = [...POKEMON_TYPES, ...filteredTypes.map((type) => type.name)];
    const allTypeColors = {
        ...TYPE_COLORS,
        ...Object.fromEntries(filteredTypes.map((type) => [type.name, type.color]))
    };

    const [allAbilitiesList, setAllAbilitiesList] = useState<string[]>([]);
    const [speciesList, setSpeciesList] = useState<string[]>([]);
    const [deleteCustomInfoId, setDeleteCustomInfoId] = useState<string | null>(null);

    useEffect(() => {
        loadLocalDataset()
            .then(() => {
                setAllAbilitiesList([...ALL_ABILITIES]);
                const formattedSpecies = Object.keys(SPECIES_URLS).map((species) =>
                    species
                        .split('-')
                        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                        .join('-')
                );
                setSpeciesList(formattedSpecies.sort());
            })
            .catch((error: unknown) => console.error('Failed to load local dataset:', error));
    }, []);

    const uniqueSpecies = Array.from(new Set([...speciesList, ...filteredPokemon.map((pokemon) => pokemon.Name)]));
    const uniqueAbilities = Array.from(
        new Set([
            ...(identityStore.availableAbilities || []),
            ...allAbilitiesList,
            ...filteredAbilities.map((ability) => ability.name)
        ])
    );

    return (
        <>
            <div className="identity-grid identity-header__grid">
                <div className="identity-grid__row">
                    <span className="identity-grid__label">Nickname</span>
                    <input
                        type="text"
                        className="identity-grid__input"
                        value={identityStore.nickname || ''}
                        onChange={(event) => setIdentity('nickname', event.target.value)}
                    />
                </div>

                <SpeciesSelector uniqueSpecies={uniqueSpecies} onOpenGenerator={onOpenGenerator} />

                <div className="identity-grid__row">
                    <span className="identity-grid__label">
                        Nature <TooltipIcon onClick={onOpenNature} />
                    </span>
                    <select
                        className="identity-grid__select"
                        value={identityStore.nature || ''}
                        onChange={(event) => setIdentity('nature', event.target.value)}
                    >
                        {NATURES.map((nature) => (
                            <option key={nature} value={nature}>
                                {nature || '-- Select --'}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="identity-grid__row">
                    <span className="identity-grid__label">Rank</span>
                    <select
                        className="identity-grid__select"
                        value={identityStore.rank || 'Starter'}
                        onChange={(event) => setIdentity('rank', event.target.value as Rank)}
                    >
                        {RANKS.map((rank) => (
                            <option key={rank} value={rank}>
                                {rank}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="identity-grid__row">
                    <span className="identity-grid__label">Typing</span>
                    <div className="identity-header__typing-container">
                        <select
                            className="identity-grid__select identity-header__type-select"
                            style={{
                                background: allTypeColors[identityStore.type1] || 'var(--panel-alt)',
                                color: identityStore.type1 ? 'white' : 'inherit'
                            }}
                            value={identityStore.type1 || ''}
                            onChange={(event) => setIdentity('type1', event.target.value)}
                        >
                            {allTypes.map((type) => (
                                <option key={`t1-${type}`} value={type}>
                                    {type || '--'}
                                </option>
                            ))}
                        </select>
                        <select
                            className="identity-grid__select identity-header__type-select"
                            style={{
                                background: allTypeColors[identityStore.type2] || 'var(--panel-alt)',
                                color: identityStore.type2 && identityStore.type2 !== 'None' ? 'white' : 'inherit'
                            }}
                            value={identityStore.type2 || ''}
                            onChange={(event) => setIdentity('type2', event.target.value)}
                        >
                            {allTypes.map((type) => (
                                <option key={`t2-${type}`} value={type}>
                                    {type || '--'}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="identity-grid__row">
                    <span className="identity-grid__label">
                        Ability <TooltipIcon onClick={onOpenAbility} />
                    </span>
                    <input
                        type="text"
                        list="ability-datalist"
                        className="identity-grid__input"
                        value={identityStore.ability || ''}
                        onChange={(event) => setIdentity('ability', event.target.value)}
                        placeholder="Type or select..."
                    />
                    <datalist id="ability-datalist">
                        {uniqueAbilities.map((ability) => (
                            <option key={ability} value={ability} />
                        ))}
                    </datalist>
                </div>

                <div className="identity-grid__row">
                    <span className="identity-grid__label identity-grid__label--blue">Mode</span>
                    <select
                        className="identity-grid__select"
                        value={identityStore.mode || 'Pokémon'}
                        onChange={(event) => setMode(event.target.value as 'Pokémon' | 'Trainer')}
                    >
                        <option value="Pokémon">Pokémon</option>
                        <option value="Trainer">Trainer</option>
                    </select>
                </div>

                <div className="identity-grid__row identity-header__age-gender-row">
                    <span className="identity-grid__label identity-grid__label--blue">Age</span>
                    <select
                        className="identity-grid__select identity-header__age-select"
                        value={identityStore.age || '--'}
                        onChange={(event) => setIdentity('age', event.target.value)}
                    >
                        {AGES.map((age) => (
                            <option key={age} value={age}>
                                {age}
                            </option>
                        ))}
                    </select>
                    <span className="identity-grid__label identity-grid__label--blue identity-header__label-margin">
                        Gender
                    </span>
                    <input
                        type="text"
                        className="identity-grid__input identity-header__gender-input"
                        value={identityStore.gender || ''}
                        onChange={(event) => setIdentity('gender', event.target.value)}
                        placeholder="..."
                    />
                </div>

                <div className="identity-grid__row">
                    <span className="identity-grid__label identity-grid__label--green">Combat</span>
                    <input
                        type="text"
                        className="identity-grid__input"
                        value={identityStore.combat || ''}
                        onChange={(event) => setIdentity('combat', event.target.value)}
                    />
                </div>
                <div className="identity-grid__row">
                    <span className="identity-grid__label identity-grid__label--green">Social</span>
                    <input
                        type="text"
                        className="identity-grid__input"
                        value={identityStore.social || ''}
                        onChange={(event) => setIdentity('social', event.target.value)}
                    />
                </div>
                <div className="identity-grid__row">
                    <span className="identity-grid__label identity-grid__label--green">Hand</span>
                    <input
                        type="text"
                        className="identity-grid__input"
                        value={identityStore.hand || ''}
                        onChange={(event) => setIdentity('hand', event.target.value)}
                    />
                </div>
                <div className="identity-grid__row">
                    <span className="identity-grid__label">Rolls</span>
                    <select
                        className="identity-grid__select"
                        value={identityStore.rolls || 'Public (Everyone)'}
                        onChange={(event) => setIdentity('rolls', event.target.value)}
                    >
                        <option>Public (Everyone)</option>
                        <option>Private (GM)</option>
                    </select>
                </div>

                {customInfo.map((info) => (
                    <CustomInfoRow key={info.id} info={info} onDelete={() => setDeleteCustomInfoId(info.id)} />
                ))}
            </div>

            {deleteCustomInfoId && (
                <div className="identity-header__modal-overlay">
                    <div className="identity-header__modal-content">
                        <h3 className="identity-header__modal-title">⚠️ Confirm Deletion</h3>
                        <p className="identity-header__modal-text">
                            Are you sure you want to delete this Custom Field?
                        </p>
                        <div className="identity-header__modal-actions">
                            <button
                                type="button"
                                className="action-button action-button--dark identity-header__modal-btn"
                                onClick={() => setDeleteCustomInfoId(null)}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="action-button action-button--red identity-header__modal-btn"
                                onClick={() => {
                                    removeCustomInfo(deleteCustomInfoId);
                                    setDeleteCustomInfoId(null);
                                }}
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}