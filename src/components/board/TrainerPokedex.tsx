import { useState, useEffect, useMemo } from 'react';
import { useCharacterStore } from '../../store/useCharacterStore';
import { CollapsingSection } from '../ui/CollapsingSection';
import { TrainerPokedexRow } from './TrainerPokedexRow';
import { TrainerPokedexModal } from '../modals/pokedex/TrainerPokedexModal';
import { QuickAddPokemonModal } from '../modals/pokedex/QuickAddPokemonModal';
import { PokedexDeleteConfirmModal } from '../modals/pokedex/PokedexDeleteConfirmModal';
import { countPokedexTotals, getPokedexEntry, resolvePokedexEntryToLookup } from './trainerPokedexUtils';
import { fetchPokemonLookupIndex } from '../../utils/api/api';
import type { PokemonLookupEntry } from '../../utils/api/apiTypes';
import { BookOpen, Plus } from 'lucide-react';
import './TrainerPokedex.css';

export function TrainerPokedex() {
    const pokedex = useCharacterStore((state) => state.identity.pokedex) || {};
    const removePokedexEntry = useCharacterStore((state) => state.removePokedexEntry);
    const togglePokedexSeen = useCharacterStore((state) => state.togglePokedexSeen);
    const togglePokedexCaught = useCharacterStore((state) => state.togglePokedexCaught);
    const roomCustomTypes = useCharacterStore((state) => state.roomCustomTypes) || [];

    const [lookupData, setLookupData] = useState<PokemonLookupEntry[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
    const [inspectedPokemon, setInspectedPokemon] = useState<string | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;
        fetchPokemonLookupIndex()
            .then((data) => {
                if (isMounted) {
                    setLookupData(data);
                    setIsLoading(false);
                }
            })
            .catch((err) => {
                console.error('[TrainerPokedex] Failed to fetch lookup index:', err);
                if (isMounted) setIsLoading(false);
            });

        return () => {
            isMounted = false;
        };
    }, []);

    const customTypeColorMap = useMemo(() => {
        return Object.fromEntries(roomCustomTypes.map((t) => [t.name, t.color]));
    }, [roomCustomTypes]);

    const totals = useMemo(() => {
        return countPokedexTotals(pokedex);
    }, [pokedex]);

    const lookupMap = useMemo(() => {
        return new Map(lookupData.map((p) => [p.name.toLowerCase(), p]));
    }, [lookupData]);

    const registeredPokemon = useMemo(() => {
        const seenLower = new Set<string>();
        const list: ReturnType<typeof resolvePokedexEntryToLookup>[] = [];

        for (const name of Object.keys(pokedex)) {
            const lower = name.trim().toLowerCase();
            if (!lower || seenLower.has(lower)) continue;
            seenLower.add(lower);
            const entry = getPokedexEntry(pokedex, name);
            list.push(resolvePokedexEntryToLookup(name, entry, lookupMap));
        }

        return list.sort((a, b) => {
            const numA = parseInt(a.dexId, 10);
            const numB = parseInt(b.dexId, 10);
            if (!isNaN(numA) && !isNaN(numB) && numA !== numB) return numA - numB;
            return a.name.localeCompare(b.name);
        });
    }, [pokedex, lookupMap]);

    const handleInspect = (name: string) => {
        setInspectedPokemon(name);
        setIsModalOpen(true);
    };

    const handleOpenFull = () => {
        setInspectedPokemon(null);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setInspectedPokemon(null);
    };

    const headerElements = (
        <div className="trainer-pokedex__header-elements">
            <div className="trainer-pokedex__header-counters">
                <span
                    className="trainer-pokedex__counter-pill trainer-pokedex__counter-pill--seen"
                    title="Seen Pokémon"
                >
                    Seen: {totals.seen}
                </span>
                <span
                    className="trainer-pokedex__counter-pill trainer-pokedex__counter-pill--caught"
                    title="Caught Pokémon"
                >
                    Caught: {totals.caught}
                </span>
                <span
                    className="trainer-pokedex__counter-pill trainer-pokedex__counter-pill--shiny"
                    title="Shiny Pokémon"
                >
                    Shiny: {totals.shiny}
                </span>
            </div>
            <div className="trainer-pokedex__header-actions">
                <button
                    type="button"
                    className="action-button action-button--dark trainer-pokedex__header-btn"
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsAddModalOpen(true);
                    }}
                    title="Register Pokémon"
                    aria-label="Register Pokémon"
                >
                    <Plus size={14} />
                </button>
                <button
                    type="button"
                    className="action-button action-button--dark trainer-pokedex__header-btn"
                    onClick={(e) => {
                        e.stopPropagation();
                        handleOpenFull();
                    }}
                    title="Open Full Pokédex"
                    aria-label="Open Full Pokédex"
                >
                    <BookOpen size={14} />
                </button>
            </div>
        </div>
    );

    return (
        <>
            <CollapsingSection title="POKÉDEX" headerElements={headerElements} className="sheet-panel">
                <div className="trainer-pokedex__list">
                    {registeredPokemon.length === 0 ? (
                        <div className="trainer-pokedex__empty text-subtext">
                            {isLoading
                                ? 'Loading Pokédex database...'
                                : 'Your Pokédex is empty. Click + above to register your first discovery!'}
                        </div>
                    ) : (
                        registeredPokemon.map((p) => (
                            <TrainerPokedexRow
                                key={`trainer-pokedex-row-${p.name}`}
                                pokemon={p}
                                entry={getPokedexEntry(pokedex, p.name)}
                                customTypeColors={customTypeColorMap}
                                onInspect={handleInspect}
                                onToggleCaught={togglePokedexCaught}
                                onToggleSeen={togglePokedexSeen}
                                onRemove={(name) => setDeleteTarget(name)}
                            />
                        ))
                    )}
                </div>
            </CollapsingSection>

            {isAddModalOpen && (
                <QuickAddPokemonModal
                    isOpen={isAddModalOpen}
                    onClose={() => setIsAddModalOpen(false)}
                    lookupData={lookupData}
                />
            )}

            {isModalOpen && (
                <TrainerPokedexModal onClose={handleCloseModal} initialPokemonName={inspectedPokemon || undefined} />
            )}

            {deleteTarget && (
                <PokedexDeleteConfirmModal
                    pokemonName={deleteTarget}
                    onCancel={() => setDeleteTarget(null)}
                    onConfirm={() => {
                        removePokedexEntry(deleteTarget);
                        setDeleteTarget(null);
                    }}
                />
            )}
        </>
    );
}
