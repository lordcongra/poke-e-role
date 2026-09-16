import { useMemo } from 'react';
import { Search, Loader2, AlertCircle, XCircle } from 'lucide-react';
import { useCharacterStore } from '../../../store/useCharacterStore';
import { TYPE_COLORS } from '../../../data/constants';
import { usePokemonLookup } from './usePokemonLookup';
import { PokemonLookupFilterPanel } from './PokemonLookupFilterPanel';
import { PokemonLookupCard } from './PokemonLookupCard';

export interface PokemonLookupTabProps {
    initialPokemonName?: string;
    initialMoveFilter?: string;
    onSelectMove?: (moveName: string) => void;
}

export function PokemonLookupTab({ initialPokemonName, initialMoveFilter, onSelectMove }: PokemonLookupTabProps) {
    const roomCustomTypes = useCharacterStore((state) => state.roomCustomTypes);

    const allTypeColors: Record<string, string> = useMemo(() => {
        const customTypeMap = Object.fromEntries(roomCustomTypes.map((t) => [t.name, t.color]));
        return { ...TYPE_COLORS, ...customTypeMap };
    }, [roomCustomTypes]);

    const {
        lookupData,
        filteredPokemon,
        isLoading,
        loadError,
        displayLimit,
        setDisplayLimit,
        expandedPokemon,
        fullDataCache,
        loadingDetails,
        copiedName,
        copiedLookupLink,
        copiedCardLink,
        tooltipInfo,
        setTooltipInfo,
        nameInput,
        setNameInput,
        abilityInput,
        setAbilityInput,
        moveInput,
        setMoveInput,
        appliedAbility,
        appliedMove,
        type1,
        setType1,
        type2,
        setType2,
        typeMatchMode,
        setTypeMatchMode,
        abilitySlot,
        setAbilitySlot,
        moveRank,
        setMoveRank,
        onlyStarters,
        setOnlyStarters,
        onlyLegendary,
        setOnlyLegendary,
        hasActiveFilters,
        availablePokemonNames,
        availableAbilities,
        availableMoves,
        handleApplySearch,
        handleClearName,
        handleClearAbility,
        handleClearMove,
        handleResetFilters,
        handleToggleExpand,
        handleCopyDiscord,
        handleBroadcast,
        handleCopyLookupLink,
        handleCopyCardLink,
        handleOpenTooltip
    } = usePokemonLookup(initialPokemonName, initialMoveFilter);

    if (isLoading) {
        return (
            <div className="gm-pokemon-lookup__loading">
                <Loader2 size={32} className="animate-spin" />
                <p className="text-subtext">Loading Pokédex Lookup Index...</p>
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
        <div className="gm-pokemon-lookup-tab">
            <PokemonLookupFilterPanel
                nameInput={nameInput}
                setNameInput={setNameInput}
                abilityInput={abilityInput}
                setAbilityInput={setAbilityInput}
                moveInput={moveInput}
                setMoveInput={setMoveInput}
                type1={type1}
                setType1={setType1}
                type2={type2}
                setType2={setType2}
                typeMatchMode={typeMatchMode}
                setTypeMatchMode={setTypeMatchMode}
                abilitySlot={abilitySlot}
                setAbilitySlot={setAbilitySlot}
                moveRank={moveRank}
                setMoveRank={setMoveRank}
                onlyStarters={onlyStarters}
                setOnlyStarters={setOnlyStarters}
                onlyLegendary={onlyLegendary}
                setOnlyLegendary={setOnlyLegendary}
                hasActiveFilters={hasActiveFilters}
                availablePokemonNames={availablePokemonNames}
                availableAbilities={availableAbilities}
                availableMoves={availableMoves}
                copiedLookupLink={copiedLookupLink}
                onApplySearch={handleApplySearch}
                onResetFilters={handleResetFilters}
                onClearName={handleClearName}
                onClearAbility={handleClearAbility}
                onClearMove={handleClearMove}
                onCopyLookupLink={handleCopyLookupLink}
                onOpenTooltip={handleOpenTooltip}
            />

            {/* --- Results Header Meta --- */}
            {hasActiveFilters && (
                <div className="gm-pokemon-lookup__results-meta">
                    <span>
                        Found <strong className="text-value-highlight">{filteredPokemon.length}</strong> Pokémon
                        {filteredPokemon.length > displayLimit && ` (showing first ${displayLimit})`}
                    </span>
                </div>
            )}

            {/* --- Results List --- */}
            {!hasActiveFilters ? (
                <div className="gm-pokemon-lookup__empty">
                    <Search size={32} style={{ opacity: 0.6 }} />
                    <p className="text-subtext">
                        Enter a search term or select filter criteria above to look up Pokémon ({lookupData.length}{' '}
                        available).
                    </p>
                </div>
            ) : filteredPokemon.length === 0 ? (
                <div className="gm-pokemon-lookup__empty">
                    <Search size={32} />
                    <p className="text-subtext">No Pokémon match the current filter criteria.</p>
                    <button type="button" className="action-button action-button--dark" onClick={handleResetFilters}>
                        Clear All Filters
                    </button>
                </div>
            ) : (
                <div className="gm-pokemon-lookup__results-list">
                    {filteredPokemon.slice(0, displayLimit).map((p) => (
                        <PokemonLookupCard
                            key={`lookup-poke-${p.name}`}
                            pokemon={p}
                            isExpanded={expandedPokemon === p.name}
                            fullData={fullDataCache[p.name]}
                            isLoadingFull={loadingDetails === p.name}
                            copiedName={copiedName}
                            copiedCardLink={copiedCardLink}
                            allTypeColors={allTypeColors}
                            appliedAbility={appliedAbility}
                            appliedMove={appliedMove}
                            moveRank={moveRank}
                            onToggleExpand={handleToggleExpand}
                            onCopyDiscord={handleCopyDiscord}
                            onCopyCardLink={handleCopyCardLink}
                            onBroadcast={handleBroadcast}
                            onOpenTooltip={handleOpenTooltip}
                            onSelectMove={onSelectMove}
                        />
                    ))}

                    {/* Pagination / Show More */}
                    {filteredPokemon.length > displayLimit && (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0' }}>
                            <button
                                type="button"
                                className="action-button action-button--dark"
                                onClick={() => setDisplayLimit((prev) => prev + 50)}
                            >
                                Show More (+50 of {filteredPokemon.length - displayLimit} remaining)
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Standardized Tooltip Modal Overlay */}
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
        </div>
    );
}
