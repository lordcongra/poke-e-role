import { Search, Sparkles, X, Check, RotateCcw, Link2 } from 'lucide-react';
import type { AbilityLookupFilterPanelProps } from './abilityLookupTypes';

export function AbilityLookupFilterPanel({
    nameInput,
    setNameInput,
    hasActiveFilters,
    availableAbilityNames,
    copiedLookupLink,
    onApplySearch,
    onClearName,
    onResetFilters,
    onCopyLookupLink
}: AbilityLookupFilterPanelProps) {
    return (
        <>
            <datalist id="gm-lookup-all-abilities-list">
                {availableAbilityNames.map((name) => (
                    <option key={name} value={name} />
                ))}
            </datalist>

            <div className="gm-pokemon-lookup__filters">
                <div className="gm-pokemon-lookup__filters-header">
                    <div className="gm-pokemon-lookup__filters-title text-title-primary">
                        <Sparkles size={18} /> Ability Search & Filter
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
                            title="Copy direct shareable link to Ability Lookup"
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
                                title="Reset search filters"
                            >
                                <RotateCcw size={13} /> Reset Filters
                            </button>
                        )}
                    </div>
                </div>

                <div className="gm-pokemon-lookup__filter-grid">
                    <div className="gm-pokemon-lookup__field">
                        <label className="gm-pokemon-lookup__field-label text-label">
                            <Search size={14} /> Ability Name or Effect
                        </label>
                        <div className="gm-pokemon-lookup__input-wrapper">
                            <input
                                type="text"
                                list="gm-lookup-all-abilities-list"
                                className="gm-pokemon-lookup__input text-subtext"
                                placeholder="Search ability (e.g. Adaptability, Intimidate, Blaze)..."
                                value={nameInput}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setNameInput(val);
                                    if (
                                        availableAbilityNames.some((n) => n.toLowerCase() === val.trim().toLowerCase())
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
                                        title="Clear ability name"
                                    >
                                        <X size={14} />
                                    </button>
                                )}
                                <button
                                    type="button"
                                    className="gm-pokemon-lookup__icon-btn"
                                    onClick={() => onApplySearch()}
                                    title="Search"
                                >
                                    <Search size={14} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
