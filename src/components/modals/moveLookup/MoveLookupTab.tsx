import { useMemo } from 'react';
import { Loader2, AlertCircle, Search } from 'lucide-react';
import { useCharacterStore } from '../../../store/useCharacterStore';
import { TYPE_COLORS, POKEMON_TYPES } from '../../../data/constants';
import { useMoveLookup } from './useMoveLookup';
import { MoveLookupFilterPanel } from './MoveLookupFilterPanel';
import { MoveLookupCard } from './MoveLookupCard';

interface MoveLookupTabProps {
    initialMoveName?: string;
    onSelectPokemon?: (pokemonName: string) => void;
    onFilterPokemonByMove?: (moveName: string) => void;
}

export function MoveLookupTab({ initialMoveName, onSelectPokemon, onFilterPokemonByMove }: MoveLookupTabProps) {
    const roomCustomTypes = useCharacterStore((state) => state.roomCustomTypes);

    const allTypes = useMemo(() => {
        const standard = POKEMON_TYPES.filter(Boolean);
        const custom = roomCustomTypes.map((t) => t.name);
        return [...standard, ...custom];
    }, [roomCustomTypes]);

    const allTypeColors: Record<string, string> = useMemo(() => {
        const customMap = Object.fromEntries(roomCustomTypes.map((t) => [t.name, t.color]));
        return { ...TYPE_COLORS, ...customMap };
    }, [roomCustomTypes]);

    const {
        movesData,
        filteredMoves,
        movesLearnedByMap,
        availableMoveNames,
        isLoading,
        loadError,
        displayLimit,
        setDisplayLimit,
        nameInput,
        setNameInput,
        appliedName,
        typeFilter,
        setTypeFilter,
        categoryFilter,
        setCategoryFilter,
        powerFilters,
        setPowerFilters,
        hasActiveFilters,
        expandedMove,
        copiedDiscordName,
        copiedCardLink,
        copiedLookupLink,
        isLoadingLearnedBy,
        loadLearnedByData,
        handleApplySearch,
        handleClearName,
        handleResetFilters,
        handleToggleExpand,
        handleCopyDiscord,
        handleBroadcast,
        handleCopyLookupLink,
        handleCopyCardLink
    } = useMoveLookup(initialMoveName);

    if (isLoading) {
        return (
            <div className="gm-pokemon-lookup__loading">
                <Loader2 size={32} className="animate-spin" />
                <p className="text-subtext">Loading Move Database...</p>
            </div>
        );
    }

    if (loadError) {
        return (
            <div className="gm-pokemon-lookup__empty">
                <AlertCircle size={32} color="var(--semantic-danger)" />
                <p className="text-subtext">{loadError}</p>
                <button
                    type="button"
                    className="action-button action-button--theme"
                    onClick={() => window.location.reload()}
                >
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="gm-move-lookup-tab">
            <MoveLookupFilterPanel
                nameInput={nameInput}
                setNameInput={setNameInput}
                appliedName={appliedName}
                typeFilter={typeFilter}
                setTypeFilter={setTypeFilter}
                categoryFilter={categoryFilter}
                setCategoryFilter={setCategoryFilter}
                powerFilters={powerFilters}
                setPowerFilters={setPowerFilters}
                hasActiveFilters={hasActiveFilters}
                availableMoveNames={availableMoveNames}
                allTypes={allTypes}
                copiedLookupLink={copiedLookupLink}
                onApplySearch={handleApplySearch}
                onClearName={handleClearName}
                onResetFilters={handleResetFilters}
                onCopyLookupLink={handleCopyLookupLink}
            />

            {/* Results Meta Header */}
            {hasActiveFilters && (
                <div className="gm-pokemon-lookup__results-meta">
                    <span>
                        Found <strong className="text-value-highlight">{filteredMoves.length}</strong> moves
                        {filteredMoves.length > displayLimit && ` (showing first ${displayLimit})`}
                    </span>
                </div>
            )}

            {/* Results List */}
            {!hasActiveFilters ? (
                <div className="gm-pokemon-lookup__empty">
                    <Search size={32} style={{ opacity: 0.6 }} />
                    <p className="text-subtext">
                        Enter a search term or select filter criteria above to look up moves ({movesData.length}{' '}
                        available).
                    </p>
                </div>
            ) : filteredMoves.length === 0 ? (
                <div className="gm-pokemon-lookup__empty">
                    <Search size={32} />
                    <p className="text-subtext">No moves match the current filter criteria.</p>
                    <button type="button" className="action-button action-button--dark" onClick={handleResetFilters}>
                        Clear All Filters
                    </button>
                </div>
            ) : (
                <div className="gm-pokemon-lookup__results-list">
                    {filteredMoves.slice(0, displayLimit).map((move) => {
                        const learned = movesLearnedByMap[move.name.toLowerCase()] || [];
                        return (
                            <MoveLookupCard
                                key={`move-card-item-${move.name}`}
                                move={move}
                                isExpanded={expandedMove === move.name}
                                allTypeColors={allTypeColors}
                                learnedBy={learned}
                                copiedDiscord={copiedDiscordName === move.name}
                                copiedLink={copiedCardLink === move.name}
                                onToggleExpand={handleToggleExpand}
                                onCopyDiscord={handleCopyDiscord}
                                onCopyCardLink={handleCopyCardLink}
                                onBroadcast={handleBroadcast}
                                onSelectPokemon={onSelectPokemon}
                                onFilterPokemonByMove={onFilterPokemonByMove}
                                isLoadingLearnedBy={isLoadingLearnedBy}
                                onLoadLearnedBy={loadLearnedByData}
                            />
                        );
                    })}

                    {/* Pagination / Show More */}
                    {filteredMoves.length > displayLimit && (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0' }}>
                            <button
                                type="button"
                                className="action-button action-button--dark"
                                onClick={() => setDisplayLimit((prev) => prev + 50)}
                            >
                                Show More (+50 of {filteredMoves.length - displayLimit} remaining)
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
