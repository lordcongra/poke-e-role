import { useState, useMemo } from 'react';
import { useCharacterStore } from '../../../store/useCharacterStore';
import { TYPE_COLORS, POKEMON_TYPES } from '../../../data/constants';
import { isStandaloneMode } from '../../../utils/sync/storageAdapter';
import { usePokemonLookup } from '../pokemonLookup/usePokemonLookup';
import { PokemonLookupCard } from '../pokemonLookup/PokemonLookupCard';
import { TrainerPokedexHeader, type PokedexStatusFilter } from './TrainerPokedexHeader';
import { PokedexDeleteConfirmModal } from './PokedexDeleteConfirmModal';
import {
    countPokedexTotals,
    getPokedexEntry,
    resolvePokedexEntryToLookup,
    findCanonicalSpeciesName
} from '../../board/trainerPokedexUtils';
import { Eye, Check, Sparkles, Loader2, AlertCircle, Search, XCircle, Trash2, BookOpen } from 'lucide-react';
import './TrainerPokedexModal.css';

export interface TrainerPokedexModalProps {
    onClose: () => void;
    initialPokemonName?: string;
}

export function TrainerPokedexModal({ onClose, initialPokemonName }: TrainerPokedexModalProps) {
    const pokedex = useCharacterStore((state) => state.identity.pokedex) || {};
    const addPokedexEntry = useCharacterStore((state) => state.addPokedexEntry);
    const removePokedexEntry = useCharacterStore((state) => state.removePokedexEntry);
    const togglePokedexSeen = useCharacterStore((state) => state.togglePokedexSeen);
    const togglePokedexCaught = useCharacterStore((state) => state.togglePokedexCaught);
    const togglePokedexShiny = useCharacterStore((state) => state.togglePokedexShiny);
    const roomCustomTypes = useCharacterStore((state) => state.roomCustomTypes) || [];
    const role = useCharacterStore((state) => state.role);

    const [statusFilter, setStatusFilter] = useState<PokedexStatusFilter>('all');
    const [searchInput, setSearchInput] = useState<string>(initialPokemonName || '');
    const [type1Filter, setType1Filter] = useState<string>('');
    const [type2Filter, setType2Filter] = useState<string>('');
    const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

    const allTypeColors: Record<string, string> = useMemo(() => {
        const visibleTypes = roomCustomTypes.filter((t) => isStandaloneMode || role === 'GM' || !t.gmOnly);
        const customTypeMap = Object.fromEntries(visibleTypes.map((t) => [t.name, t.color]));
        return { ...TYPE_COLORS, ...customTypeMap };
    }, [roomCustomTypes, role]);

    const allTypeNames = useMemo(() => {
        const customNames = roomCustomTypes
            .filter((t) => isStandaloneMode || role === 'GM' || !t.gmOnly)
            .map((t) => t.name);
        return Array.from(new Set([...POKEMON_TYPES, ...customNames]));
    }, [roomCustomTypes, role]);

    const {
        lookupData,
        isLoading,
        loadError,
        displayLimit,
        setDisplayLimit,
        expandedPokemon,
        fullDataCache,
        loadingDetails,
        copiedName,
        copiedCardLink,
        tooltipInfo,
        setTooltipInfo,
        appliedMove,
        moveRank,
        availablePokemonNames,
        handleToggleExpand,
        handleCopyDiscord,
        handleDownloadMarkdown,
        handleBroadcast,
        handleCopyCardLink,
        handleOpenTooltip
    } = usePokemonLookup(initialPokemonName);

    const totals = useMemo(() => {
        return countPokedexTotals(pokedex);
    }, [pokedex]);

    const lookupMap = useMemo(() => {
        return new Map(lookupData.map((p) => [p.name.toLowerCase(), p]));
    }, [lookupData]);

    // Only Pokémon registered by the trainer
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

    // Search and filter within the registered Pokémon list
    const finalFilteredPokemon = useMemo(() => {
        let list = registeredPokemon;

        if (searchInput.trim()) {
            const q = searchInput.trim().toLowerCase();
            list = list.filter((p) => p.name.toLowerCase().includes(q) || p.dexId.toLowerCase().includes(q));
        }

        if (type1Filter) {
            const t1 = type1Filter.toLowerCase();
            list = list.filter((p) => p.type1.toLowerCase() === t1 || p.type2?.toLowerCase() === t1);
        }

        if (type2Filter) {
            const t2 = type2Filter.toLowerCase();
            list = list.filter((p) => p.type1.toLowerCase() === t2 || p.type2?.toLowerCase() === t2);
        }

        if (statusFilter !== 'all') {
            list = list.filter((p) => {
                const entry = getPokedexEntry(pokedex, p.name);
                if (statusFilter === 'seen') {
                    return Boolean(entry.seen || entry.caught || entry.shiny);
                }
                if (statusFilter === 'caught') {
                    return Boolean(entry.caught);
                }
                if (statusFilter === 'shiny') {
                    return Boolean(entry.shiny);
                }
                return true;
            });
        }

        return list;
    }, [registeredPokemon, searchInput, type1Filter, type2Filter, statusFilter, pokedex]);

    const handleRegisterPokemon = (name: string) => {
        const canonical = findCanonicalSpeciesName(name, lookupData);
        addPokedexEntry(canonical);
    };

    const handleResetAll = () => {
        setSearchInput('');
        setType1Filter('');
        setType2Filter('');
        setStatusFilter('all');
    };

    return (
        <div className="trainer-pokedex-modal__overlay" onClick={onClose}>
            <div className="trainer-pokedex-modal__container" onClick={(e) => e.stopPropagation()}>
                <TrainerPokedexHeader
                    totals={totals}
                    totalPokemon={lookupData.length || 0}
                    registeredCount={registeredPokemon.length}
                    statusFilter={statusFilter}
                    onStatusFilterChange={setStatusFilter}
                    nameInput={searchInput}
                    onNameInputChange={setSearchInput}
                    onClearName={() => setSearchInput('')}
                    type1={type1Filter}
                    onType1Change={setType1Filter}
                    type2={type2Filter}
                    onType2Change={setType2Filter}
                    allTypeNames={allTypeNames}
                    availableSpeciesNames={availablePokemonNames}
                    onRegisterPokemon={handleRegisterPokemon}
                    onResetFilters={handleResetAll}
                    onClose={onClose}
                />

                <div className="trainer-pokedex-modal__body">
                    {isLoading ? (
                        <div className="trainer-pokedex-modal__empty">
                            <Loader2 size={36} className="animate-spin" />
                            <p className="text-subtext">Loading Pokédex database...</p>
                        </div>
                    ) : loadError ? (
                        <div className="trainer-pokedex-modal__empty">
                            <AlertCircle size={36} color="var(--semantic-danger)" />
                            <p className="text-subtext">{loadError}</p>
                        </div>
                    ) : registeredPokemon.length === 0 ? (
                        <div className="trainer-pokedex-modal__empty">
                            <BookOpen size={48} style={{ opacity: 0.4, color: 'var(--primary)' }} />
                            <h4 className="text-title-primary" style={{ margin: 0 }}>
                                Your Pokédex is Empty
                            </h4>
                            <p className="text-subtext" style={{ maxWidth: '420px', lineHeight: 1.5 }}>
                                Record Pokémon your trainer encounters or captures in the wild! Type a Pokémon name in
                                the registration bar above to add your first entry.
                            </p>
                        </div>
                    ) : finalFilteredPokemon.length === 0 ? (
                        <div className="trainer-pokedex-modal__empty">
                            <Search size={36} style={{ opacity: 0.5 }} />
                            <p className="text-subtext">No registered Pokémon match your search or filter criteria.</p>
                            <button
                                type="button"
                                className="action-button action-button--dark"
                                onClick={handleResetAll}
                            >
                                Reset Filters
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className="trainer-pokedex-modal__results-meta">
                                <span>
                                    Displaying{' '}
                                    <strong className="text-value-highlight">
                                        {Math.min(displayLimit, finalFilteredPokemon.length)}
                                    </strong>{' '}
                                    of <strong className="text-value-highlight">{finalFilteredPokemon.length}</strong>{' '}
                                    registered Pokémon
                                </span>
                            </div>

                            {finalFilteredPokemon.slice(0, displayLimit).map((p) => {
                                const entry = getPokedexEntry(pokedex, p.name);
                                const isSeen = Boolean(entry.seen || entry.caught || entry.shiny);
                                const isCaught = Boolean(entry.caught);
                                const isShiny = Boolean(entry.shiny);

                                const trainerControls = (
                                    <div className="trainer-pokedex-card-controls">
                                        <button
                                            type="button"
                                            className={`trainer-pokedex-toggle-btn ${isSeen ? 'trainer-pokedex-toggle-btn--seen-active' : ''}`}
                                            onClick={() => togglePokedexSeen(p.name)}
                                            title={isSeen ? 'Mark as Unseen' : 'Mark as Seen'}
                                        >
                                            <Eye size={12} /> {isSeen ? 'Seen' : 'Unseen'}
                                        </button>

                                        <button
                                            type="button"
                                            className={`trainer-pokedex-toggle-btn ${isCaught ? 'trainer-pokedex-toggle-btn--caught-active' : ''}`}
                                            onClick={() => togglePokedexCaught(p.name)}
                                            title={isCaught ? 'Mark as Uncaught' : 'Mark as Caught'}
                                        >
                                            <Check size={12} strokeWidth={3} /> {isCaught ? 'Caught' : 'Catch'}
                                        </button>

                                        <button
                                            type="button"
                                            className={`trainer-pokedex-toggle-btn ${isShiny ? 'trainer-pokedex-toggle-btn--shiny-active' : ''}`}
                                            onClick={() => togglePokedexShiny(p.name)}
                                            title={isShiny ? 'Remove Shiny Mark' : 'Mark as Shiny'}
                                        >
                                            <Sparkles size={12} /> {isShiny ? 'Shiny' : 'Normal'}
                                        </button>

                                        <button
                                            type="button"
                                            className="action-button action-button--red trainer-pokedex-toggle-btn--remove"
                                            onClick={() => setDeleteTarget(p.name)}
                                            title={`Remove ${p.name} from Pokédex`}
                                            aria-label={`Remove ${p.name} from Pokédex`}
                                        >
                                            <Trash2 size={13} />
                                        </button>
                                    </div>
                                );

                                return (
                                    <PokemonLookupCard
                                        key={`pokedex-card-${p.name}`}
                                        pokemon={p}
                                        isExpanded={expandedPokemon === p.name}
                                        fullData={fullDataCache[p.name]}
                                        isLoadingFull={loadingDetails === p.name}
                                        copiedName={copiedName}
                                        copiedCardLink={copiedCardLink}
                                        allTypeColors={allTypeColors}
                                        appliedAbility=""
                                        appliedMove={appliedMove}
                                        moveRank={moveRank}
                                        trainerControls={trainerControls}
                                        onToggleExpand={handleToggleExpand}
                                        onCopyDiscord={handleCopyDiscord}
                                        onDownloadMarkdown={handleDownloadMarkdown}
                                        onCopyCardLink={handleCopyCardLink}
                                        onBroadcast={handleBroadcast}
                                        onOpenTooltip={handleOpenTooltip}
                                    />
                                );
                            })}

                            {finalFilteredPokemon.length > displayLimit && (
                                <div style={{ display: 'flex', justifyContent: 'center', padding: '16px 0' }}>
                                    <button
                                        type="button"
                                        className="action-button action-button--dark"
                                        onClick={() => setDisplayLimit((prev) => prev + 50)}
                                    >
                                        Show More (+50 of {finalFilteredPokemon.length - displayLimit} remaining)
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {tooltipInfo && (
                    <div className="gm-pokemon-lookup__modal-overlay" onClick={() => setTooltipInfo(null)}>
                        <div className="gm-pokemon-lookup__modal-content" onClick={(e) => e.stopPropagation()}>
                            <h3 className="gm-pokemon-lookup__modal-title text-title-primary">{tooltipInfo.title}</h3>
                            <p className="gm-pokemon-lookup__modal-desc text-subtext">{tooltipInfo.desc}</p>
                            <div className="gm-pokemon-lookup__modal-btn-container">
                                <button
                                    type="button"
                                    className="action-button action-button--dark gm-pokemon-lookup__modal-btn"
                                    onClick={() => setTooltipInfo(null)}
                                >
                                    <XCircle size={16} /> Close
                                </button>
                            </div>
                        </div>
                    </div>
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
            </div>
        </div>
    );
}
