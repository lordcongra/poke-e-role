import { Loader2, AlertCircle, Search } from 'lucide-react';
import { useAbilityLookup } from './useAbilityLookup';
import { AbilityLookupFilterPanel } from './AbilityLookupFilterPanel';
import { AbilityLookupCard } from './AbilityLookupCard';
import type { AbilityLookupTabProps } from './abilityLookupTypes';
import './AbilityLookup.css';

export function AbilityLookupTab({
    initialAbilityName,
    onSelectPokemon,
    onFilterPokemonByAbility
}: AbilityLookupTabProps) {
    const {
        abilitiesData,
        filteredAbilities,
        pokemonHoldersMap,
        availableAbilityNames,
        isLoading,
        loadError,
        displayLimit,
        setDisplayLimit,
        nameInput,
        setNameInput,
        appliedName,
        hasActiveFilters,
        expandedAbility,
        copiedDiscordName,
        copiedCardLink,
        copiedLookupLink,
        handleApplySearch,
        handleClearName,
        handleResetFilters,
        handleToggleExpand,
        handleCopyDiscord,
        handleBroadcast,
        handleCopyLookupLink,
        handleCopyCardLink
    } = useAbilityLookup(initialAbilityName);

    if (isLoading) {
        return (
            <div className="gm-pokemon-lookup__loading">
                <Loader2 size={32} className="animate-spin" />
                <p className="text-subtext">Loading Ability Database...</p>
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
        <div className="gm-ability-lookup-tab">
            <AbilityLookupFilterPanel
                nameInput={nameInput}
                setNameInput={setNameInput}
                appliedName={appliedName}
                hasActiveFilters={hasActiveFilters}
                availableAbilityNames={availableAbilityNames}
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
                        Found <strong className="text-value-highlight">{filteredAbilities.length}</strong> abilities
                        {filteredAbilities.length > displayLimit && ` (showing first ${displayLimit})`}
                    </span>
                </div>
            )}

            {/* Results List */}
            {!hasActiveFilters ? (
                <div className="gm-pokemon-lookup__empty">
                    <Search size={32} style={{ opacity: 0.6 }} />
                    <p className="text-subtext">
                        Enter a search term above to look up abilities ({abilitiesData.length} available).
                    </p>
                </div>
            ) : filteredAbilities.length === 0 ? (
                <div className="gm-pokemon-lookup__empty">
                    <Search size={32} />
                    <p className="text-subtext">No abilities match the current search criteria.</p>
                    <button type="button" className="action-button action-button--dark" onClick={handleResetFilters}>
                        Clear Search
                    </button>
                </div>
            ) : (
                <div className="gm-pokemon-lookup__results-list">
                    {filteredAbilities.slice(0, displayLimit).map((ability) => {
                        const holders = pokemonHoldersMap[ability.name.toLowerCase()] || [];
                        return (
                            <AbilityLookupCard
                                key={`ability-card-item-${ability.name}`}
                                ability={ability}
                                isExpanded={expandedAbility === ability.name}
                                pokemonHolders={holders}
                                copiedDiscord={copiedDiscordName === ability.name}
                                copiedLink={copiedCardLink === ability.name}
                                onToggleExpand={handleToggleExpand}
                                onCopyDiscord={handleCopyDiscord}
                                onCopyCardLink={handleCopyCardLink}
                                onBroadcast={handleBroadcast}
                                onSelectPokemon={onSelectPokemon}
                                onFilterPokemonByAbility={onFilterPokemonByAbility}
                            />
                        );
                    })}

                    {/* Pagination / Show More */}
                    {filteredAbilities.length > displayLimit && (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0' }}>
                            <button
                                type="button"
                                className="action-button action-button--dark"
                                onClick={() => setDisplayLimit((prev) => prev + 50)}
                            >
                                Show More (+50 of {filteredAbilities.length - displayLimit} remaining)
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
