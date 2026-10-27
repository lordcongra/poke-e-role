import { useState, useRef, useEffect } from 'react';
import { TooltipIcon } from '../ui/TooltipIcon';
import { AlertTriangle, List, LayoutGrid, ChevronUp, ChevronDown, Search, X } from 'lucide-react';

interface InventoryHeaderActionsProps {
    viewMode: 'list' | 'card';
    onSetViewMode: (mode: 'list' | 'card') => void;
    cardSize: 'sm' | 'md' | 'lg';
    onSetCardSize: (size: 'sm' | 'md' | 'lg') => void;
    onShowTagsGuide: () => void;
    activeCount: number;
    trainingPoints: number;
    pokedollars: number;
    onSetTrainingPoints: (tp: number) => void;
    onSetPokedollars: (pd: number) => void;
    showFilters: boolean;
    onToggleFilters: () => void;
    searchQuery: string;
    onSearchQueryChange: (query: string) => void;
}

export function InventoryHeaderActions({
    viewMode,
    onSetViewMode,
    cardSize,
    onSetCardSize,
    onShowTagsGuide,
    activeCount,
    trainingPoints,
    pokedollars,
    onSetTrainingPoints,
    onSetPokedollars,
    showFilters,
    onToggleFilters,
    searchQuery,
    onSearchQueryChange
}: InventoryHeaderActionsProps) {
    const [isSearchOpen, setIsSearchOpen] = useState(Boolean(searchQuery));
    const searchInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (searchQuery && !isSearchOpen) {
            setIsSearchOpen(true);
        }
    }, [searchQuery, isSearchOpen]);

    const handleToggleSearch = () => {
        if (isSearchOpen) {
            if (searchQuery) {
                onSearchQueryChange('');
            }
            setIsSearchOpen(false);
        } else {
            setIsSearchOpen(true);
            setTimeout(() => {
                searchInputRef.current?.focus();
            }, 50);
        }
    };

    const handleClearSearch = () => {
        onSearchQueryChange('');
        searchInputRef.current?.focus();
    };
    return (
        <>
            <TooltipIcon onClick={onShowTagsGuide} />
            <div className="inventory-table__view-toggle">
                <button
                    type="button"
                    className={`inventory-table__view-toggle-btn ${
                        viewMode === 'list' ? 'inventory-table__view-toggle-btn--active text-theme-header' : ''
                    }`}
                    onClick={() => onSetViewMode('list')}
                    title="List View"
                    aria-label="List View"
                >
                    <List size={13} />
                </button>
                <button
                    type="button"
                    className={`inventory-table__view-toggle-btn ${
                        viewMode === 'card' ? 'inventory-table__view-toggle-btn--active text-theme-header' : ''
                    }`}
                    onClick={() => onSetViewMode('card')}
                    title="Card Grid View"
                    aria-label="Card Grid View"
                >
                    <LayoutGrid size={13} />
                </button>
            </div>
            {viewMode === 'card' && (
                <div className="inventory-table__size-toggle" title="Card Sizing">
                    {(['sm', 'md', 'lg'] as const).map((sz) => (
                        <button
                            key={sz}
                            type="button"
                            className={`inventory-table__size-toggle-btn ${
                                cardSize === sz ? 'inventory-table__size-toggle-btn--active text-theme-header' : ''
                            }`}
                            onClick={() => onSetCardSize(sz)}
                            title={`${sz === 'sm' ? 'Compact' : sz === 'md' ? 'Regular' : 'Spacious'} Card Size`}
                        >
                            {sz.toUpperCase()}
                        </button>
                    ))}
                </div>
            )}
            <button
                type="button"
                className={`inventory-table__toolbar-btn ${
                    showFilters ? 'inventory-table__toolbar-btn--active text-theme-header' : ''
                }`}
                onClick={onToggleFilters}
                title={showFilters ? 'Hide Category Filters' : 'Show Category Filters'}
                aria-label={showFilters ? 'Hide Category Filters' : 'Show Category Filters'}
            >
                {showFilters ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
            <div className="inventory-table__search-container">
                <button
                    type="button"
                    className={`inventory-table__toolbar-btn ${
                        isSearchOpen || searchQuery ? 'inventory-table__toolbar-btn--active text-theme-header' : ''
                    }`}
                    onClick={handleToggleSearch}
                    title={isSearchOpen ? 'Close Search' : 'Search Items'}
                    aria-label={isSearchOpen ? 'Close Search' : 'Search Items'}
                >
                    <Search size={13} />
                </button>
                {isSearchOpen && (
                    <div className="inventory-table__search-input-wrapper">
                        <input
                            ref={searchInputRef}
                            type="text"
                            className="inventory-table__search-input text-subtext"
                            placeholder="Search items..."
                            value={searchQuery}
                            onChange={(event) => onSearchQueryChange(event.target.value)}
                            onKeyDown={(event) => {
                                if (event.key === 'Escape') {
                                    if (searchQuery) {
                                        onSearchQueryChange('');
                                    } else {
                                        setIsSearchOpen(false);
                                    }
                                }
                            }}
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                className="inventory-table__search-clear-btn"
                                onClick={handleClearSearch}
                                title="Clear Search"
                                aria-label="Clear Search"
                            >
                                <X size={12} />
                            </button>
                        )}
                    </div>
                )}
            </div>
            {activeCount > 1 && (
                <div
                    className="inventory-table__warning text-label"
                    style={{
                        color: 'var(--semantic-danger)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                    }}
                >
                    <AlertTriangle size={14} color="var(--semantic-danger)" /> Multiple items active
                </div>
            )}
            <div className="inventory-table__currency-container">
                <span
                    className="inventory-table__currency-tp text-label"
                    style={{ color: 'var(--secondary)' }}
                    title="Training Points"
                >
                    TP:{' '}
                    <input
                        type="number"
                        value={trainingPoints}
                        onChange={(event) => onSetTrainingPoints(Number(event.target.value) || 0)}
                        className="no-spinners inventory-table__currency-input inventory-table__currency-input--tp text-subtext"
                        style={{ color: 'var(--text-main)' }}
                    />
                </span>
                <span className="inventory-table__currency-pd text-label" style={{ color: 'var(--primary)' }}>
                    PD:{' '}
                    <input
                        type="number"
                        value={pokedollars}
                        onChange={(event) => onSetPokedollars(Number(event.target.value) || 0)}
                        className="no-spinners inventory-table__currency-input text-subtext"
                        style={{ color: 'var(--text-main)' }}
                    />
                </span>
            </div>
        </>
    );
}
