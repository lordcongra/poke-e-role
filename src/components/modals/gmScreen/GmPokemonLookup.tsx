import { useState, useEffect } from 'react';
import { BookOpen, Swords } from 'lucide-react';
import { PokemonLookupTab } from '../pokemonLookup/PokemonLookupTab';
import { MoveLookupTab } from '../moveLookup/MoveLookupTab';
import './GmPokemonLookup.css';

export function GmPokemonLookup() {
    const [activeSubTab, setActiveSubTab] = useState<'pokemon' | 'moves'>('pokemon');
    const [selectedPokemonName, setSelectedPokemonName] = useState<string | undefined>(undefined);
    const [selectedMoveFilter, setSelectedMoveFilter] = useState<string | undefined>(undefined);
    const [selectedMoveName, setSelectedMoveName] = useState<string | undefined>(undefined);

    // Read initial deep link query parameters
    useEffect(() => {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const lookupMode = urlParams.get('lookup');
            const moveParam = urlParams.get('move') || urlParams.get('moveName');

            if (lookupMode === 'moves' || moveParam) {
                setActiveSubTab('moves');
                if (moveParam) setSelectedMoveName(moveParam);
            }
        } catch (e) {
            console.warn('[GmPokemonLookup] Could not parse lookup mode from URL:', e);
        }
    }, []);

    // Cross-navigation: Clicking a move in Pokémon lookup jumps to Move Lookup
    const handleSelectMoveFromPokemon = (moveName: string) => {
        setSelectedMoveName(moveName);
        setActiveSubTab('moves');
    };

    // Cross-navigation: Clicking a Pokémon in Move lookup jumps to Pokémon Lookup
    const handleSelectPokemonFromMove = (pokemonName: string) => {
        setSelectedPokemonName(pokemonName);
        setActiveSubTab('pokemon');
    };

    // Cross-navigation: Filter Pokémon by move
    const handleFilterPokemonByMove = (moveName: string) => {
        setSelectedMoveFilter(moveName);
        setActiveSubTab('pokemon');
    };

    return (
        <div className="gm-pokemon-lookup gm-lookup-orchestrator">
            {/* Top Segmented Sub-Tab Switcher */}
            <div className="gm-lookup-orchestrator__switcher-container">
                <div className="gm-lookup-orchestrator__switcher">
                    <button
                        type="button"
                        className={`gm-lookup-orchestrator__switch-btn ${
                            activeSubTab === 'pokemon' ? 'gm-lookup-orchestrator__switch-btn--active' : ''
                        }`}
                        onClick={() => setActiveSubTab('pokemon')}
                        title="Look up Pokémon species, learnsets, stats, and abilities"
                    >
                        <BookOpen size={15} /> Pokémon
                    </button>
                    <button
                        type="button"
                        className={`gm-lookup-orchestrator__switch-btn ${
                            activeSubTab === 'moves' ? 'gm-lookup-orchestrator__switch-btn--active' : ''
                        }`}
                        onClick={() => setActiveSubTab('moves')}
                        title="Look up moves by type, power, category, and effect"
                    >
                        <Swords size={15} /> Moves
                    </button>
                </div>
            </div>

            {/* Active Lookup Content */}
            {activeSubTab === 'pokemon' ? (
                <PokemonLookupTab
                    initialPokemonName={selectedPokemonName}
                    initialMoveFilter={selectedMoveFilter}
                    onSelectMove={handleSelectMoveFromPokemon}
                />
            ) : (
                <MoveLookupTab
                    initialMoveName={selectedMoveName}
                    onSelectPokemon={handleSelectPokemonFromMove}
                    onFilterPokemonByMove={handleFilterPokemonByMove}
                />
            )}
        </div>
    );
}
