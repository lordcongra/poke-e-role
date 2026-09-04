import { useState, useRef } from 'react';
import OBR from '@owlbear-rodeo/sdk';
import { useCharacterStore } from '../../store/useCharacterStore';
import type { CustomPokemon } from '../../store/storeTypes';
import { ALL_ABILITIES, ALL_MOVES } from '../../utils/api';
import { HomebrewPokemonCard } from './HomebrewPokemonCard';
import { POKEMON_TYPES, TYPE_COLORS } from '../../data/constants';
import { isStandaloneMode } from '../../utils/storageAdapter';
import { downloadJson } from '../../utils/fileSystemHelpers';
import { Plus, BookOpen, Save, FolderOpen, AlertTriangle } from 'lucide-react';
import { HomebrewPullPokemonModal } from './HomebrewPullPokemonModal';
import './Homebrew.css';

export function HomebrewPokemon() {
    const role = useCharacterStore((state) => state.role);
    const access = useCharacterStore((state) => state.identity.homebrewAccess);
    const canEdit = isStandaloneMode || role === 'GM' || access === 'Full';

    const roomCustomPokemon = useCharacterStore((state) => state.roomCustomPokemon);
    const roomCustomTypes = useCharacterStore((state) => state.roomCustomTypes);
    const roomCustomAbilities = useCharacterStore((state) => state.roomCustomAbilities);
    const roomCustomMoves = useCharacterStore((state) => state.roomCustomMoves);
    const addCustomPokemon = useCharacterStore((state) => state.addCustomPokemon);
    const removeCustomPokemon = useCharacterStore((state) => state.removeCustomPokemon);
    const duplicateCustomPokemon = useCharacterStore((state) => state.duplicateCustomPokemon);
    const overwriteCustomPokemonData = useCharacterStore((state) => state.overwriteCustomPokemonData);
    const mergeCustomPokemonData = useCharacterStore((state) => state.mergeCustomPokemonData);

    const filteredTypes = roomCustomTypes.filter((type) => role === 'GM' || !type.gmOnly);
    const allTypes = [...POKEMON_TYPES, ...filteredTypes.map((type) => type.name)];
    const allTypeColors = {
        ...TYPE_COLORS,
        ...Object.fromEntries(filteredTypes.map((type) => [type.name, type.color]))
    };

    const abilityOptions = Array.from(
        new Set([
            ...ALL_ABILITIES,
            ...roomCustomAbilities.filter((ability) => role === 'GM' || !ability.gmOnly).map((ability) => ability.name)
        ])
    );
    const moveOptions = Array.from(
        new Set([
            ...ALL_MOVES,
            ...roomCustomMoves.filter((move) => role === 'GM' || !move.gmOnly).map((move) => move.name)
        ])
    );

    const fileReference = useRef<HTMLInputElement>(null);
    const [importData, setImportData] = useState<CustomPokemon[] | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [showPullModal, setShowPullModal] = useState(false);

    const visiblePokemon = roomCustomPokemon.filter((pokemon) => role === 'GM' || !pokemon.gmOnly);
    const filteredPokemonList = visiblePokemon.filter((pokemon) =>
        pokemon.Name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleExport = () => {
        downloadJson(visiblePokemon, 'pokerole_custom_pokemon.json');
    };

    const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (fileEvent) => {
            try {
                const imported = JSON.parse(fileEvent.target?.result as string);
                if (Array.isArray(imported)) {
                    setImportData(imported);
                } else if (OBR.isAvailable) {
                    OBR.notification.show('Invalid Custom Pokémon file.', 'ERROR');
                }
            } catch {
                if (OBR.isAvailable) OBR.notification.show('Failed to parse JSON.', 'ERROR');
            }
            if (fileReference.current) fileReference.current.value = '';
        };
        reader.readAsText(file);
    };

    return (
        <div className="homebrew-list__container">
            <p className="homebrew-list__desc text-subtext">
                Create custom Pokémon or Boss monsters. Entering their name in the Character Identity panel will
                automatically build their sheet.
            </p>

            <div className="homebrew-list__search-row">
                <input
                    type="text"
                    placeholder="Search Pokémon..."
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    className="homebrew-list__search-input"
                />
                {canEdit && (
                    <>
                        <button
                            onClick={() => setShowPullModal(true)}
                            className="action-button action-button--theme homebrew-list__create-btn"
                            title="Pull an existing Pokémon from the Pokédex to customize its Learnset, Abilities, or Stats"
                        >
                            <BookOpen size={16} /> Pull from Pokédex
                        </button>
                        <button
                            onClick={() => {
                                setSearchQuery('');
                                addCustomPokemon();
                            }}
                            className="action-button action-button--dark homebrew-list__create-btn"
                        >
                            <Plus size={16} /> Create New
                        </button>
                    </>
                )}
            </div>

            <datalist id="hb-ability-list">
                {abilityOptions.map((ability) => (
                    <option key={ability} value={ability} />
                ))}
            </datalist>
            <datalist id="hb-move-list">
                {moveOptions.map((move) => (
                    <option key={move} value={move} />
                ))}
            </datalist>

            <div className="homebrew-list__scroll-area">
                {filteredPokemonList.length === 0 ? (
                    <div className="homebrew-list__empty text-subtext" style={{ fontStyle: 'italic' }}>
                        {visiblePokemon.length === 0 ? 'No custom Pokémon yet.' : 'No Pokémon match your search.'}
                    </div>
                ) : (
                    filteredPokemonList.map((pokemon) => (
                        <HomebrewPokemonCard
                            key={pokemon.id}
                            pokemon={pokemon}
                            allTypes={allTypes}
                            allTypeColors={allTypeColors}
                            role={role}
                            canEdit={canEdit}
                            onRemove={() => removeCustomPokemon(pokemon.id)}
                            onDuplicate={() => duplicateCustomPokemon(pokemon.id)}
                        />
                    ))
                )}
            </div>

            <div className="homebrew-list__footer">
                <button onClick={handleExport} className="action-button action-button--dark homebrew-list__footer-btn">
                    <Save size={16} /> Export Pokémon
                </button>
                {canEdit && (
                    <>
                        <button
                            onClick={() => fileReference.current?.click()}
                            className="action-button action-button--dark homebrew-list__footer-btn"
                        >
                            <FolderOpen size={16} /> Import Pokémon
                        </button>
                        <input
                            type="file"
                            ref={fileReference}
                            onChange={handleImport}
                            className="homebrew-file-input"
                            accept=".json"
                        />
                    </>
                )}
            </div>

            {importData && (
                <div className="homebrew-import__overlay">
                    <div className="homebrew-import__content">
                        <h3
                            className="homebrew-import__title text-title-primary"
                            style={{
                                color: 'var(--semantic-danger)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px'
                            }}
                        >
                            <AlertTriangle size={20} /> Confirm Import
                        </h3>
                        <p className="homebrew-import__text text-subtext">
                            How would you like to import this data? <b>Overwrite</b> will delete your existing Pokémon.{' '}
                            <b>Add / Merge</b> will safely combine them, updating any items with matching names.
                        </p>
                        <div className="homebrew-import__actions">
                            <button
                                onClick={() => setImportData(null)}
                                className="action-button action-button--dark homebrew-import__btn"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    mergeCustomPokemonData(importData);
                                    setImportData(null);
                                }}
                                className="action-button homebrew-import__btn homebrew-import__btn--merge"
                            >
                                Add / Merge
                            </button>
                            <button
                                onClick={() => {
                                    overwriteCustomPokemonData(importData);
                                    setImportData(null);
                                }}
                                className="action-button action-button--red homebrew-import__btn"
                            >
                                Overwrite
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <HomebrewPullPokemonModal
                isOpen={showPullModal}
                onClose={() => {
                    setShowPullModal(false);
                }}
            />
        </div>
    );
}
