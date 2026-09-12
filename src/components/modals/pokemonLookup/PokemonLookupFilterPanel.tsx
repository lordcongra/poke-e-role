import { Search, Filter, Sparkles, X, Check, Shield, Zap, RotateCcw, Link2 } from 'lucide-react';
import type { AbilitySlotFilter, TypeMatchMode } from '../../../utils/apiTypes';
import { POKEMON_TYPES } from '../../../data/constants';
import { TooltipIcon } from '../../ui/TooltipIcon';
import { LEARN_RANKS } from './pokemonLookupUtils';

export interface PokemonLookupFilterPanelProps {
    nameInput: string;
    setNameInput: (val: string) => void;
    abilityInput: string;
    setAbilityInput: (val: string) => void;
    moveInput: string;
    setMoveInput: (val: string) => void;
    type1: string;
    setType1: (val: string) => void;
    type2: string;
    setType2: (val: string) => void;
    typeMatchMode: TypeMatchMode;
    setTypeMatchMode: (val: TypeMatchMode) => void;
    abilitySlot: AbilitySlotFilter;
    setAbilitySlot: (val: AbilitySlotFilter) => void;
    moveRank: string;
    setMoveRank: (val: string) => void;
    onlyStarters: boolean;
    setOnlyStarters: (val: boolean) => void;
    onlyLegendary: boolean;
    setOnlyLegendary: (val: boolean) => void;
    hasActiveFilters: boolean;
    availablePokemonNames: string[];
    availableAbilities: string[];
    availableMoves: string[];
    copiedLookupLink: boolean;
    onApplySearch: (overrideName?: string, overrideAbility?: string, overrideMove?: string) => void;
    onResetFilters: () => void;
    onClearName: () => void;
    onClearAbility: () => void;
    onClearMove: () => void;
    onCopyLookupLink: () => void;
    onOpenTooltip: (title: string, desc: string) => void;
}

export function PokemonLookupFilterPanel({
    nameInput,
    setNameInput,
    abilityInput,
    setAbilityInput,
    moveInput,
    setMoveInput,
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
    copiedLookupLink,
    onApplySearch,
    onResetFilters,
    onClearName,
    onClearAbility,
    onClearMove,
    onCopyLookupLink,
    onOpenTooltip
}: PokemonLookupFilterPanelProps) {
    return (
        <>
            {/* HTML5 Datalists for Autocomplete */}
            <datalist id="gm-lookup-pokemon-names-list">
                {availablePokemonNames.map((name) => (
                    <option key={name} value={name} />
                ))}
            </datalist>
            <datalist id="gm-lookup-abilities-list">
                {availableAbilities.map((ab) => (
                    <option key={ab} value={ab} />
                ))}
            </datalist>
            <datalist id="gm-lookup-moves-list">
                {availableMoves.map((mv) => (
                    <option key={mv} value={mv} />
                ))}
            </datalist>

            {/* --- Filter Controls --- */}
            <div className="gm-pokemon-lookup__filters">
                <div className="gm-pokemon-lookup__filters-header">
                    <div className="gm-pokemon-lookup__filters-title text-title-primary">
                        <Filter size={18} /> Pokédex Search & Filter
                    </div>
                    <div className="gm-pokemon-lookup__filters-actions">
                        <button
                            type="button"
                            className="action-button action-button--theme"
                            onClick={() => onApplySearch()}
                            title="Apply all search parameters"
                        >
                            <Search size={14} /> Search
                        </button>
                        <button
                            type="button"
                            className="action-button action-button--dark"
                            onClick={onCopyLookupLink}
                            title="Copy direct shareable link to Pokémon Lookup"
                        >
                            {copiedLookupLink ? (
                                <>
                                    <Check size={13} color="var(--primary)" /> Link Copied!
                                </>
                            ) : (
                                <>
                                    <Link2 size={13} /> Copy Link
                                </>
                            )}
                        </button>
                        {hasActiveFilters && (
                            <button
                                type="button"
                                className="gm-pokemon-lookup__reset-btn"
                                onClick={onResetFilters}
                                title="Reset all filters"
                            >
                                <RotateCcw size={13} /> Reset Filters
                            </button>
                        )}
                    </div>
                </div>

                <div className="gm-pokemon-lookup__filter-grid">
                    {/* 1. Name Search */}
                    <div className="gm-pokemon-lookup__field">
                        <label className="gm-pokemon-lookup__field-label text-label">
                            <Search size={14} /> Pokémon Name / Dex #
                        </label>
                        <div className="gm-pokemon-lookup__input-wrapper">
                            <input
                                type="text"
                                list="gm-lookup-pokemon-names-list"
                                className="gm-pokemon-lookup__input text-subtext"
                                placeholder="Search name or number (e.g. Abra, 0063)..."
                                value={nameInput}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setNameInput(val);
                                    if (
                                        availablePokemonNames.some((n) => n.toLowerCase() === val.trim().toLowerCase())
                                    ) {
                                        onApplySearch(val);
                                    }
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') onApplySearch();
                                }}
                                onBlur={() => onApplySearch()}
                            />
                            <div className="gm-pokemon-lookup__input-actions">
                                {nameInput && (
                                    <button
                                        type="button"
                                        className="gm-pokemon-lookup__icon-btn"
                                        onClick={onClearName}
                                        title="Clear name search"
                                    >
                                        <X size={14} />
                                    </button>
                                )}
                                <button
                                    type="button"
                                    className="gm-pokemon-lookup__icon-btn gm-pokemon-lookup__search-trigger-btn"
                                    onClick={() => onApplySearch()}
                                    title="Search"
                                >
                                    <Search size={14} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* 2. Type Filtering */}
                    <div className="gm-pokemon-lookup__field">
                        <div className="gm-pokemon-lookup__field-label text-label">
                            <Shield size={14} /> Type & Dual Type Mode
                        </div>
                        <div className="gm-pokemon-lookup__dual-inputs">
                            <select
                                className="gm-pokemon-lookup__select text-subtext"
                                value={type1}
                                onChange={(e) => setType1(e.target.value)}
                            >
                                <option value="">Primary Type</option>
                                {POKEMON_TYPES.filter(Boolean).map((t) => (
                                    <option key={`type1-${t}`} value={t}>
                                        {t}
                                    </option>
                                ))}
                            </select>

                            <select
                                className="gm-pokemon-lookup__select text-subtext"
                                value={type2}
                                onChange={(e) => setType2(e.target.value)}
                            >
                                <option value="">Secondary Type</option>
                                {POKEMON_TYPES.filter(Boolean).map((t) => (
                                    <option key={`type2-${t}`} value={t}>
                                        {t}
                                    </option>
                                ))}
                            </select>
                        </div>
                        {(type1 || type2) && (
                            <div className="gm-pokemon-lookup__button-group">
                                <button
                                    type="button"
                                    className={`gm-pokemon-lookup__button-group-item ${typeMatchMode === 'any' ? 'gm-pokemon-lookup__button-group-item--active' : ''}`}
                                    onClick={() => setTypeMatchMode('any')}
                                    title="Match Pokémon with either of the selected types"
                                >
                                    Either Type
                                </button>
                                <button
                                    type="button"
                                    className={`gm-pokemon-lookup__button-group-item ${typeMatchMode === 'exact' ? 'gm-pokemon-lookup__button-group-item--active' : ''}`}
                                    onClick={() => setTypeMatchMode('exact')}
                                    title="Must match both types exactly"
                                >
                                    Exact Dual Match
                                </button>
                            </div>
                        )}
                    </div>

                    {/* 3. Move & Learn Rank Filtering */}
                    <div className="gm-pokemon-lookup__field">
                        <label className="gm-pokemon-lookup__field-label text-label">
                            <Zap size={14} /> Move & Rank Learned
                        </label>
                        <div className="gm-pokemon-lookup__dual-inputs">
                            <div className="gm-pokemon-lookup__input-wrapper">
                                <input
                                    type="text"
                                    list="gm-lookup-moves-list"
                                    className="gm-pokemon-lookup__input text-subtext"
                                    placeholder="Move (e.g. Quick Attack)..."
                                    value={moveInput}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setMoveInput(val);
                                        if (availableMoves.some((m) => m.toLowerCase() === val.trim().toLowerCase())) {
                                            onApplySearch(undefined, undefined, val);
                                        }
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') onApplySearch();
                                    }}
                                    onBlur={() => onApplySearch()}
                                />
                                <div className="gm-pokemon-lookup__input-actions">
                                    {moveInput && (
                                        <button
                                            type="button"
                                            className="gm-pokemon-lookup__icon-btn"
                                            onClick={onClearMove}
                                            title="Clear move filter"
                                        >
                                            <X size={14} />
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        className="gm-pokemon-lookup__icon-btn gm-pokemon-lookup__search-trigger-btn"
                                        onClick={() => onApplySearch()}
                                        title="Search move"
                                    >
                                        <Search size={14} />
                                    </button>
                                </div>
                            </div>

                            <select
                                className="gm-pokemon-lookup__select text-subtext"
                                value={moveRank}
                                onChange={(e) => setMoveRank(e.target.value)}
                            >
                                <option value="">Rank: Any Rank</option>
                                {LEARN_RANKS.map((r) => (
                                    <option key={`rank-${r}`} value={r}>
                                        {r}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* 4. Ability Filtering */}
                    <div className="gm-pokemon-lookup__field">
                        <div className="gm-pokemon-lookup__field-label text-label">
                            <Sparkles size={14} /> Ability
                            <TooltipIcon
                                onClick={() =>
                                    onOpenTooltip(
                                        'Hidden Abilities (Homebrew)',
                                        'Hidden Abilities are community homebrew additions in this dataset and are not canon to official Pokerole rules. GM discretion is advised when using them.'
                                    )
                                }
                            />
                        </div>
                        <div className="gm-pokemon-lookup__input-wrapper">
                            <input
                                type="text"
                                list="gm-lookup-abilities-list"
                                className="gm-pokemon-lookup__input text-subtext"
                                placeholder="Filter ability (e.g. Flash Fire)..."
                                value={abilityInput}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setAbilityInput(val);
                                    if (availableAbilities.some((a) => a.toLowerCase() === val.trim().toLowerCase())) {
                                        onApplySearch(undefined, val);
                                    }
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') onApplySearch();
                                }}
                                onBlur={() => onApplySearch()}
                            />
                            <div className="gm-pokemon-lookup__input-actions">
                                {abilityInput && (
                                    <button
                                        type="button"
                                        className="gm-pokemon-lookup__icon-btn"
                                        onClick={onClearAbility}
                                        title="Clear ability filter"
                                    >
                                        <X size={14} />
                                    </button>
                                )}
                                <button
                                    type="button"
                                    className="gm-pokemon-lookup__icon-btn gm-pokemon-lookup__search-trigger-btn"
                                    onClick={() => onApplySearch()}
                                    title="Search ability"
                                >
                                    <Search size={14} />
                                </button>
                            </div>
                        </div>
                        <div className="gm-pokemon-lookup__button-group">
                            <button
                                type="button"
                                className={`gm-pokemon-lookup__button-group-item ${abilitySlot === 'all' ? 'gm-pokemon-lookup__button-group-item--active' : ''}`}
                                onClick={() => setAbilitySlot('all')}
                            >
                                Any Slot
                            </button>
                            <button
                                type="button"
                                className={`gm-pokemon-lookup__button-group-item ${abilitySlot === 'standard' ? 'gm-pokemon-lookup__button-group-item--active' : ''}`}
                                onClick={() => setAbilitySlot('standard')}
                                title="Standard canon abilities (Ability 1 or 2)"
                            >
                                Standard (1/2)
                            </button>
                            <button
                                type="button"
                                className={`gm-pokemon-lookup__button-group-item ${abilitySlot === 'hidden' ? 'gm-pokemon-lookup__button-group-item--active' : ''}`}
                                onClick={() => setAbilitySlot('hidden')}
                                title="Hidden Ability (Homebrew community addition - non-canon)"
                            >
                                Hidden (HA)
                            </button>
                        </div>
                    </div>
                </div>

                {/* 5. Special Checkboxes */}
                <div className="gm-pokemon-lookup__checkbox-row">
                    <label className="gm-pokemon-lookup__checkbox-label">
                        <input
                            type="checkbox"
                            className="gm-pokemon-lookup__checkbox"
                            checked={onlyStarters}
                            onChange={(e) => setOnlyStarters(e.target.checked)}
                        />
                        <span>Good Starters Only</span>
                    </label>

                    <label className="gm-pokemon-lookup__checkbox-label">
                        <input
                            type="checkbox"
                            className="gm-pokemon-lookup__checkbox"
                            checked={onlyLegendary}
                            onChange={(e) => setOnlyLegendary(e.target.checked)}
                        />
                        <span>Legendary / Mythical Only</span>
                    </label>
                </div>
            </div>
        </>
    );
}
