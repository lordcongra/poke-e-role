import type { Dispatch, SetStateAction, ChangeEvent } from 'react';
import { Search, Filter, X, Check, Shield, Swords, Zap, RotateCcw, Link2 } from 'lucide-react';
import type { MoveCategoryFilter } from './moveLookupTypes';
import { BASIC_POWERS, HIGH_POWERS } from './moveLookupUtils';

export interface MoveLookupFilterPanelProps {
    nameInput: string;
    setNameInput: (val: string) => void;
    appliedName: string;
    typeFilter: string;
    setTypeFilter: (val: string) => void;
    categoryFilter: MoveCategoryFilter;
    setCategoryFilter: (val: MoveCategoryFilter) => void;
    powerFilters: string[];
    setPowerFilters: Dispatch<SetStateAction<string[]>>;
    hasActiveFilters: boolean;
    availableMoveNames: string[];
    allTypes: string[];
    copiedLookupLink: boolean;
    onApplySearch: (overrideName?: string) => void;
    onClearName: () => void;
    onResetFilters: () => void;
    onCopyLookupLink: () => void;
}

export function MoveLookupFilterPanel({
    nameInput,
    setNameInput,
    typeFilter,
    setTypeFilter,
    categoryFilter,
    setCategoryFilter,
    powerFilters,
    setPowerFilters,
    hasActiveFilters,
    availableMoveNames,
    allTypes,
    copiedLookupLink,
    onApplySearch,
    onClearName,
    onResetFilters,
    onCopyLookupLink
}: MoveLookupFilterPanelProps) {
    const hasBasic = BASIC_POWERS.every((p) => powerFilters.includes(p));
    const hasHigh = HIGH_POWERS.every((p) => powerFilters.includes(p));
    const hasSupport = powerFilters.includes('support');
    const hasVariable = powerFilters.includes('variable');

    const toggleSupport = () => {
        setPowerFilters((prev) =>
            prev.includes('support') ? prev.filter((p) => p !== 'support') : [...prev, 'support']
        );
    };

    const toggleBasic = () => {
        if (hasBasic) {
            setPowerFilters((prev) => prev.filter((p) => !BASIC_POWERS.includes(p)));
        } else {
            setPowerFilters((prev) => Array.from(new Set([...prev, ...BASIC_POWERS])));
        }
    };

    const toggleHigh = () => {
        if (hasHigh) {
            setPowerFilters((prev) => prev.filter((p) => !HIGH_POWERS.includes(p)));
        } else {
            setPowerFilters((prev) => Array.from(new Set([...prev, ...HIGH_POWERS])));
        }
    };

    const toggleVariable = () => {
        setPowerFilters((prev) =>
            prev.includes('variable') ? prev.filter((p) => p !== 'variable') : [...prev, 'variable']
        );
    };

    const handlePowerDropdown = (e: ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value;
        if (val && !powerFilters.includes(val)) {
            setPowerFilters((prev) => [...prev, val]);
        }
    };

    const removePowerPill = (powerToRemove: string) => {
        setPowerFilters((prev) => prev.filter((p) => p !== powerToRemove));
    };

    return (
        <>
            <datalist id="gm-lookup-all-moves-list">
                {availableMoveNames.map((m) => (
                    <option key={m} value={m} />
                ))}
            </datalist>

            <div className="gm-pokemon-lookup__filters">
                <div className="gm-pokemon-lookup__filters-header">
                    <div className="gm-pokemon-lookup__filters-title text-title-primary">
                        <Filter size={18} /> Move Search & Filter
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
                            title="Copy direct shareable link to Move Lookup"
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
                            <Search size={14} /> Move Name
                        </label>
                        <div className="gm-pokemon-lookup__input-wrapper">
                            <input
                                type="text"
                                list="gm-lookup-all-moves-list"
                                className="gm-pokemon-lookup__input text-subtext"
                                placeholder="Search move (e.g. Absorb, Thunderbolt)..."
                                value={nameInput}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setNameInput(val);
                                    if (availableMoveNames.some((n) => n.toLowerCase() === val.trim().toLowerCase())) {
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
                                        title="Clear move name"
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

                    {/* 2. Type Filter */}
                    <div className="gm-pokemon-lookup__field">
                        <label className="gm-pokemon-lookup__field-label text-label">
                            <Shield size={14} /> Move Type
                        </label>
                        <select
                            className="gm-pokemon-lookup__select text-subtext"
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                        >
                            <option value="">All Types</option>
                            {allTypes.map((t) => (
                                <option key={`type-${t}`} value={t}>
                                    {t}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* 3. Category Filter */}
                    <div className="gm-pokemon-lookup__field">
                        <label className="gm-pokemon-lookup__field-label text-label">
                            <Swords size={14} /> Category
                        </label>
                        <select
                            className="gm-pokemon-lookup__select text-subtext"
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value as MoveCategoryFilter)}
                        >
                            <option value="all">All Categories</option>
                            <option value="Physical">Physical</option>
                            <option value="Special">Special</option>
                            <option value="Status">Status / Support</option>
                        </select>
                    </div>

                    {/* 4. Power Filters */}
                    <div className="gm-pokemon-lookup__field" style={{ gridColumn: 'span 2' }}>
                        <div className="gm-pokemon-lookup__field-label text-label">
                            <Zap size={14} /> Power Level
                        </div>

                        <div className="gm-move-lookup__power-presets">
                            <button
                                type="button"
                                className={`gm-pokemon-lookup__button-group-item ${
                                    powerFilters.length === 0 ? 'gm-pokemon-lookup__button-group-item--active' : ''
                                }`}
                                onClick={() => setPowerFilters([])}
                                title="Show moves with any power"
                            >
                                All
                            </button>
                            <button
                                type="button"
                                className={`gm-pokemon-lookup__button-group-item ${
                                    hasSupport ? 'gm-pokemon-lookup__button-group-item--active' : ''
                                }`}
                                onClick={toggleSupport}
                                title="Support / Status moves (Power 0)"
                            >
                                Support (0)
                            </button>
                            <button
                                type="button"
                                className={`gm-pokemon-lookup__button-group-item ${
                                    hasBasic ? 'gm-pokemon-lookup__button-group-item--active' : ''
                                }`}
                                onClick={toggleBasic}
                                title="Basic Moves (Power 1 - 3)"
                            >
                                Basic (1–3)
                            </button>
                            <button
                                type="button"
                                className={`gm-pokemon-lookup__button-group-item ${
                                    hasHigh ? 'gm-pokemon-lookup__button-group-item--active' : ''
                                }`}
                                onClick={toggleHigh}
                                title="High Power Moves (Power 4+)"
                            >
                                High (4+)
                            </button>
                            <button
                                type="button"
                                className={`gm-pokemon-lookup__button-group-item ${
                                    hasVariable ? 'gm-pokemon-lookup__button-group-item--active' : ''
                                }`}
                                onClick={toggleVariable}
                                title="Variable Power Moves"
                            >
                                Variable
                            </button>

                            <select
                                className="gm-pokemon-lookup__select gm-move-lookup__power-select text-subtext"
                                value=""
                                onChange={handlePowerDropdown}
                                title="Add a specific power filter"
                            >
                                <option value="" disabled>
                                    + Add Specific Power...
                                </option>
                                {!powerFilters.includes('support') && <option value="support">Support (0)</option>}
                                {!powerFilters.includes('variable') && <option value="variable">Variable</option>}
                                {[1, 2, 3, 4, 5, 6, 7, 8, 10].map(
                                    (p) =>
                                        !powerFilters.includes(String(p)) && (
                                            <option key={`opt-pow-${p}`} value={String(p)}>
                                                Power {p}
                                            </option>
                                        )
                                )}
                            </select>
                        </div>

                        {powerFilters.length > 0 && (
                            <div className="gm-move-lookup__pills-row">
                                {powerFilters.map((p) => (
                                    <span
                                        key={`power-pill-${p}`}
                                        className="gm-pokemon-lookup__move-pill gm-move-lookup__power-pill"
                                        onClick={() => removePowerPill(p)}
                                        title={`Remove Power ${p} filter`}
                                    >
                                        {p === 'support' ? 'Support' : p === 'variable' ? 'Variable' : `Power ${p}`}
                                        <X size={12} style={{ marginLeft: 4 }} />
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
