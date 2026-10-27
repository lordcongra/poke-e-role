import { useState } from 'react';
import type { PokedexTotals } from '../../board/trainerPokedexUtils';
import { calculatePokedexPercentage } from '../../board/trainerPokedexUtils';
import { BookOpen, X, Search, RotateCcw, Eye, Check, Sparkles, Plus } from 'lucide-react';

export type PokedexStatusFilter = 'all' | 'seen' | 'caught' | 'shiny';

export interface TrainerPokedexHeaderProps {
    totals: PokedexTotals;
    totalPokemon: number;
    registeredCount: number;
    statusFilter: PokedexStatusFilter;
    onStatusFilterChange: (filter: PokedexStatusFilter) => void;
    nameInput: string;
    onNameInputChange: (val: string) => void;
    onClearName: () => void;
    type1: string;
    onType1Change: (t: string) => void;
    type2: string;
    onType2Change: (t: string) => void;
    allTypeNames: string[];
    availableSpeciesNames: string[];
    onRegisterPokemon: (name: string) => void;
    onResetFilters: () => void;
    onClose: () => void;
}

export function TrainerPokedexHeader({
    totals,
    totalPokemon,
    registeredCount,
    statusFilter,
    onStatusFilterChange,
    nameInput,
    onNameInputChange,
    onClearName,
    type1,
    onType1Change,
    type2,
    onType2Change,
    allTypeNames,
    availableSpeciesNames,
    onRegisterPokemon,
    onResetFilters,
    onClose
}: TrainerPokedexHeaderProps) {
    const [registerName, setRegisterName] = useState('');
    const seenPct = calculatePokedexPercentage(totals.seen, totalPokemon);
    const caughtPct = calculatePokedexPercentage(totals.caught, totalPokemon);

    const handleRegisterSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const clean = registerName.trim();
        if (!clean) return;
        onRegisterPokemon(clean);
        setRegisterName('');
    };

    return (
        <div className="trainer-pokedex-header">
            {/* Top Bar: Title & Close */}
            <div className="trainer-pokedex-header__top">
                <h3 className="trainer-pokedex-header__title text-title-primary">
                    <BookOpen size={20} /> Trainer Pokédex
                </h3>
                <button
                    type="button"
                    onClick={onClose}
                    className="trainer-pokedex-header__close-btn"
                    title="Close Pokédex"
                    aria-label="Close Pokédex"
                >
                    <X size={20} />
                </button>
            </div>

            {/* Progress Banner */}
            <div className="trainer-pokedex-header__progress-grid">
                <div className="trainer-pokedex-header__stat-card">
                    <div className="trainer-pokedex-header__stat-info">
                        <span className="trainer-pokedex-header__stat-label trainer-pokedex-header__stat-label--seen">
                            <Eye size={13} /> Seen
                        </span>
                        <span className="trainer-pokedex-header__stat-val text-subtext">
                            {totals.seen} / {totalPokemon} ({seenPct}%)
                        </span>
                    </div>
                    <div className="trainer-pokedex-header__progress-track">
                        <div
                            className="trainer-pokedex-header__progress-fill trainer-pokedex-header__progress-fill--seen"
                            style={{ width: `${seenPct}%` }}
                        />
                    </div>
                </div>

                <div className="trainer-pokedex-header__stat-card">
                    <div className="trainer-pokedex-header__stat-info">
                        <span className="trainer-pokedex-header__stat-label trainer-pokedex-header__stat-label--caught">
                            <Check size={13} strokeWidth={3} /> Caught
                        </span>
                        <span className="trainer-pokedex-header__stat-val text-subtext">
                            {totals.caught} / {totalPokemon} ({caughtPct}%)
                        </span>
                    </div>
                    <div className="trainer-pokedex-header__progress-track">
                        <div
                            className="trainer-pokedex-header__progress-fill trainer-pokedex-header__progress-fill--caught"
                            style={{ width: `${caughtPct}%` }}
                        />
                    </div>
                </div>

                <div className="trainer-pokedex-header__stat-card trainer-pokedex-header__shiny-card">
                    <div className="trainer-pokedex-header__stat-info" style={{ justifyContent: 'center', gap: '6px' }}>
                        <span className="trainer-pokedex-header__stat-label trainer-pokedex-header__stat-label--shiny">
                            <Sparkles size={13} /> Shiny
                        </span>
                        <strong className="text-value-highlight">{totals.shiny}</strong>
                    </div>
                </div>
            </div>

            {/* Registration Form Bar */}
            <form className="trainer-pokedex-header__register-form" onSubmit={handleRegisterSubmit}>
                <div className="trainer-pokedex-header__register-input-wrap">
                    <Plus size={16} className="trainer-pokedex-header__register-icon" />
                    <input
                        type="text"
                        list="trainer-pokedex-species-datalist"
                        className="trainer-pokedex-header__register-input"
                        placeholder="Register a new Pokémon entry (e.g. Bulbasaur, Pikachu)..."
                        value={registerName}
                        onChange={(e) => setRegisterName(e.target.value)}
                    />
                    <datalist id="trainer-pokedex-species-datalist">
                        {availableSpeciesNames.map((s) => (
                            <option key={`reg-species-${s}`} value={s} />
                        ))}
                    </datalist>
                </div>
                <button
                    type="submit"
                    className="action-button action-button--theme trainer-pokedex-header__register-btn"
                    disabled={!registerName.trim()}
                >
                    <Plus size={14} />
                    <span className="trainer-pokedex-header__register-btn-text">Register Entry</span>
                    <span className="trainer-pokedex-header__register-btn-text--mobile">Add</span>
                </button>
            </form>

            {/* Filters Row: Search in Pokédex, Type Selects, Status Tabs & Reset */}
            <div className="trainer-pokedex-header__filters-row">
                {/* Search Input */}
                <div className="trainer-pokedex-header__search-wrap">
                    <Search size={14} className="trainer-pokedex-header__search-icon" />
                    <input
                        type="text"
                        className="trainer-pokedex-header__search-input"
                        placeholder="Search your Pokédex..."
                        value={nameInput}
                        onChange={(e) => onNameInputChange(e.target.value)}
                    />
                    {nameInput && (
                        <button
                            type="button"
                            className="trainer-pokedex-header__clear-btn"
                            onClick={onClearName}
                            title="Clear search"
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>

                {/* Type 1 Filter */}
                <select
                    className="trainer-pokedex-header__type-select"
                    value={type1}
                    onChange={(e) => onType1Change(e.target.value)}
                    title="Filter by Type 1"
                >
                    <option value="">Type 1: All</option>
                    {allTypeNames.map((t) => (
                        <option key={`type1-opt-${t}`} value={t}>
                            {t}
                        </option>
                    ))}
                </select>

                {/* Type 2 Filter */}
                <select
                    className="trainer-pokedex-header__type-select"
                    value={type2}
                    onChange={(e) => onType2Change(e.target.value)}
                    title="Filter by Type 2"
                >
                    <option value="">Type 2: All</option>
                    {allTypeNames.map((t) => (
                        <option key={`type2-opt-${t}`} value={t}>
                            {t}
                        </option>
                    ))}
                </select>

                {/* Status Tabs */}
                <div className="trainer-pokedex-header__status-tabs" role="tablist">
                    <button
                        type="button"
                        className={`trainer-pokedex-header__tab-btn ${statusFilter === 'all' ? 'trainer-pokedex-header__tab-btn--active' : ''}`}
                        onClick={() => onStatusFilterChange('all')}
                    >
                        All ({registeredCount})
                    </button>
                    <button
                        type="button"
                        className={`trainer-pokedex-header__tab-btn ${statusFilter === 'seen' ? 'trainer-pokedex-header__tab-btn--active' : ''}`}
                        onClick={() => onStatusFilterChange('seen')}
                    >
                        <Eye size={12} /> Seen ({totals.seen})
                    </button>
                    <button
                        type="button"
                        className={`trainer-pokedex-header__tab-btn ${statusFilter === 'caught' ? 'trainer-pokedex-header__tab-btn--active' : ''}`}
                        onClick={() => onStatusFilterChange('caught')}
                    >
                        <Check size={12} strokeWidth={3} /> Caught ({totals.caught})
                    </button>
                    <button
                        type="button"
                        className={`trainer-pokedex-header__tab-btn ${statusFilter === 'shiny' ? 'trainer-pokedex-header__tab-btn--active' : ''}`}
                        onClick={() => onStatusFilterChange('shiny')}
                    >
                        <Sparkles size={12} /> Shinies ({totals.shiny})
                    </button>
                </div>

                {/* Reset Filters Button */}
                <button
                    type="button"
                    className="action-button action-button--dark trainer-pokedex-header__reset-btn"
                    onClick={onResetFilters}
                    title="Reset all filters"
                >
                    <RotateCcw size={14} />
                </button>
            </div>
        </div>
    );
}
