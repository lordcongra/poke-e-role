import { useState, useEffect, useMemo, useCallback } from 'react';
import {
    Search,
    Filter,
    Sparkles,
    X,
    ChevronDown,
    ChevronUp,
    Copy,
    Megaphone,
    Check,
    Loader2,
    Shield,
    Zap,
    RotateCcw,
    AlertCircle,
    XCircle,
    Link2
} from 'lucide-react';
import type { PokemonLookupEntry, AbilitySlotFilter, TypeMatchMode, PokemonApiResponse } from '../../utils/apiTypes';
import type { CustomPokemon } from '../../store/storeTypes';
import { fetchPokemonLookupIndex, fetchPokemonData } from '../../utils/api';
import { useCharacterStore } from '../../store/useCharacterStore';
import { POKEMON_TYPES, TYPE_COLORS } from '../../data/constants';
import { TooltipIcon } from '../ui/TooltipIcon';
import { broadcastInfo } from '../../utils/diceRoller';
import { getBaseShareUrl } from '../../utils/helper';
import './GmPokemonLookup.css';

const LEARN_RANKS = ['Starter', 'Rookie', 'Standard', 'Advanced', 'Expert', 'Ace', 'Master'];
const RANK_ORDER = ['Starter', 'Rookie', 'Standard', 'Advanced', 'Expert', 'Ace', 'Master', 'Champion', 'Other'];

function groupMovesByRank(moves: [string, string][]): { rank: string; moves: string[] }[] {
    const grouped: Record<string, string[]> = {};
    moves.forEach(([name, rank]) => {
        const r = rank || 'Other';
        if (!grouped[r]) grouped[r] = [];
        grouped[r].push(name);
    });

    const sortedRanks = Object.keys(grouped).sort((a, b) => {
        let indexA = RANK_ORDER.indexOf(a);
        let indexB = RANK_ORDER.indexOf(b);
        if (indexA === -1) indexA = 99;
        if (indexB === -1) indexB = 99;
        return indexA - indexB;
    });

    return sortedRanks.map((rank) => ({
        rank,
        moves: grouped[rank]
    }));
}

export function GmPokemonLookup() {
    const roomCustomTypes = useCharacterStore((state) => state.roomCustomTypes);

    // Merge custom types into color mapping
    const allTypeColors: Record<string, string> = useMemo(() => {
        const customTypeMap = Object.fromEntries(roomCustomTypes.map((t) => [t.name, t.color]));
        return { ...TYPE_COLORS, ...customTypeMap };
    }, [roomCustomTypes]);

    // Data State
    const [lookupData, setLookupData] = useState<PokemonLookupEntry[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [loadError, setLoadError] = useState<string | null>(null);

    // Filter Draft Inputs (typing before committing)
    const [nameInput, setNameInput] = useState<string>('');
    const [abilityInput, setAbilityInput] = useState<string>('');
    const [moveInput, setMoveInput] = useState<string>('');

    // Committed Text Search Parameters (applied when clicking search, pressing Enter, or clicking off)
    const [appliedName, setAppliedName] = useState<string>('');
    const [appliedAbility, setAppliedAbility] = useState<string>('');
    const [appliedMove, setAppliedMove] = useState<string>('');

    // Dropdown & Toggle Filters (commit immediately on change)
    const [type1, setType1] = useState<string>('');
    const [type2, setType2] = useState<string>('');
    const [typeMatchMode, setTypeMatchMode] = useState<TypeMatchMode>('any');
    const [abilitySlot, setAbilitySlot] = useState<AbilitySlotFilter>('all');
    const [moveRank, setMoveRank] = useState<string>('');
    const [onlyStarters, setOnlyStarters] = useState<boolean>(false);
    const [onlyLegendary, setOnlyLegendary] = useState<boolean>(false);

    // Tooltip Modal State
    const [tooltipInfo, setTooltipInfo] = useState<{ title: string; desc: string } | null>(null);

    // UI States
    const [displayLimit, setDisplayLimit] = useState<number>(50);
    const [expandedPokemon, setExpandedPokemon] = useState<string | null>(null);
    const [fullDataCache, setFullDataCache] = useState<Record<string, PokemonApiResponse | CustomPokemon>>({});
    const [loadingDetails, setLoadingDetails] = useState<string | null>(null);
    const [copiedName, setCopiedName] = useState<string | null>(null);
    const [copiedLookupLink, setCopiedLookupLink] = useState<boolean>(false);
    const [copiedCardLink, setCopiedCardLink] = useState<string | null>(null);

    // Fetch Search Index on Mount & Read URL Deep Link Params
    useEffect(() => {
        let isMounted = true;
        setIsLoading(true);
        fetchPokemonLookupIndex()
            .then((data) => {
                if (isMounted) {
                    setLookupData(data);
                    setIsLoading(false);
                }
            })
            .catch((err) => {
                console.error('[GmPokemonLookup] Failed to fetch lookup index:', err);
                if (isMounted) {
                    setLoadError('Failed to load Pokémon database. Please try again.');
                    setIsLoading(false);
                }
            });

        // Parse URL parameters for direct linking
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const rawHash = decodeURIComponent(window.location.hash.replace(/^#/, ''));
            const pokemonParam =
                urlParams.get('pokemon') ||
                urlParams.get('name') ||
                (rawHash && rawHash !== 'lookup' && rawHash !== 'pokemon-lookup' && !rawHash.startsWith('gm-')
                    ? rawHash
                    : null);

            const type1Param = urlParams.get('type1') || urlParams.get('type');
            const type2Param = urlParams.get('type2');
            const typeMatchModeParam = urlParams.get('mode') as TypeMatchMode | null;
            const abilityParam = urlParams.get('ability');
            const slotParam = urlParams.get('slot') as AbilitySlotFilter | null;
            const moveParam = urlParams.get('move');
            const rankParam = urlParams.get('rank');
            const starterParam = urlParams.get('starter');
            const legendaryParam = urlParams.get('legendary');

            if (pokemonParam) {
                setNameInput(pokemonParam);
                setAppliedName(pokemonParam);
                setExpandedPokemon(pokemonParam);
                fetchPokemonData(pokemonParam)
                    .then((full) => {
                        if (full && isMounted) {
                            setFullDataCache((prev) => ({ ...prev, [pokemonParam]: full }));
                        }
                    })
                    .catch(() => {});
            }
            if (type1Param) {
                setType1(type1Param);
            }
            if (type2Param) {
                setType2(type2Param);
            }
            if (typeMatchModeParam === 'exact' || typeMatchModeParam === 'any') {
                setTypeMatchMode(typeMatchModeParam);
            }
            if (abilityParam) {
                setAbilityInput(abilityParam);
                setAppliedAbility(abilityParam);
            }
            if (slotParam && (slotParam === 'standard' || slotParam === 'hidden')) {
                setAbilitySlot(slotParam);
            }
            if (moveParam) {
                setMoveInput(moveParam);
                setAppliedMove(moveParam);
            }
            if (rankParam) {
                setMoveRank(rankParam);
            }
            if (starterParam === '1' || starterParam === 'true') {
                setOnlyStarters(true);
            }
            if (legendaryParam === '1' || legendaryParam === 'true') {
                setOnlyLegendary(true);
            }

            if (pokemonParam) {
                setTimeout(() => {
                    const el = document.getElementById(
                        `pokemon-card-${pokemonParam.toLowerCase().replace(/[^a-z0-9]/g, '-')}`
                    );
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 400);
            }
        } catch (e) {
            console.warn('[GmPokemonLookup] Could not parse URL parameters:', e);
        }

        return () => {
            isMounted = false;
        };
    }, []);

    // Autocomplete datasets for Abilities and Moves
    const availableAbilities = useMemo(() => {
        const set = new Set<string>();
        lookupData.forEach((p) => {
            if (p.ability1) set.add(p.ability1);
            if (p.ability2) set.add(p.ability2);
            if (p.hiddenAbility) set.add(p.hiddenAbility);
        });
        return Array.from(set).sort();
    }, [lookupData]);

    const availableMoves = useMemo(() => {
        const set = new Set<string>();
        lookupData.forEach((p) => {
            p.moves.forEach(([mName]) => {
                if (mName) set.add(mName);
            });
        });
        return Array.from(set).sort();
    }, [lookupData]);

    // Apply / Commit Search
    const handleApplySearch = useCallback(() => {
        setAppliedName(nameInput.trim());
        setAppliedAbility(abilityInput.trim());
        setAppliedMove(moveInput.trim());
        setDisplayLimit(50);
    }, [nameInput, abilityInput, moveInput]);

    // Check if any filter is actively applied
    const hasActiveFilters = useMemo(() => {
        return Boolean(
            appliedName ||
            type1 ||
            type2 ||
            appliedAbility ||
            abilitySlot !== 'all' ||
            appliedMove ||
            moveRank ||
            onlyStarters ||
            onlyLegendary
        );
    }, [appliedName, type1, type2, appliedAbility, abilitySlot, appliedMove, moveRank, onlyStarters, onlyLegendary]);

    // Clear individual inputs
    const handleClearName = () => {
        setNameInput('');
        setAppliedName('');
    };

    const handleClearAbility = () => {
        setAbilityInput('');
        setAppliedAbility('');
    };

    const handleClearMove = () => {
        setMoveInput('');
        setAppliedMove('');
    };

    // Reset all filters
    const handleResetFilters = useCallback(() => {
        setNameInput('');
        setAbilityInput('');
        setMoveInput('');
        setAppliedName('');
        setAppliedAbility('');
        setAppliedMove('');
        setType1('');
        setType2('');
        setTypeMatchMode('any');
        setAbilitySlot('all');
        setMoveRank('');
        setOnlyStarters(false);
        setOnlyLegendary(false);
        setDisplayLimit(50);
    }, []);

    // Filter Logic
    const filteredPokemon = useMemo(() => {
        if (!lookupData.length || !hasActiveFilters) return [];

        const q = appliedName.toLowerCase();
        const ab = appliedAbility.toLowerCase();
        const mv = appliedMove.toLowerCase();

        return lookupData.filter((p) => {
            // 1. Text Search (Name or Dex Number)
            if (q) {
                const nameMatch = p.name.toLowerCase().includes(q);
                const dexMatch = p.dexId.toLowerCase().includes(q);
                if (!nameMatch && !dexMatch) return false;
            }

            // 2. Type Filtering
            if (type1 || type2) {
                const pTypes = [p.type1.toLowerCase(), p.type2.toLowerCase()].filter(Boolean);
                const t1 = type1.toLowerCase();
                const t2 = type2.toLowerCase();

                if (typeMatchMode === 'exact') {
                    if (t1 && !pTypes.includes(t1)) return false;
                    if (t2 && !pTypes.includes(t2)) return false;
                    if (t1 && t2 && pTypes.length !== 2) return false;
                } else {
                    // Mode: 'any'
                    if (t1 && t2) {
                        if (!pTypes.includes(t1) && !pTypes.includes(t2)) return false;
                    } else if (t1 && !pTypes.includes(t1)) {
                        return false;
                    } else if (t2 && !pTypes.includes(t2)) {
                        return false;
                    }
                }
            }

            // 3. Ability Filtering & Slot Restriction
            if (ab) {
                const a1 = p.ability1.toLowerCase();
                const a2 = p.ability2.toLowerCase();
                const ha = p.hiddenAbility.toLowerCase();
                const ea = p.eventAbilities.toLowerCase();

                if (abilitySlot === 'standard') {
                    if (!a1.includes(ab) && !a2.includes(ab)) return false;
                } else if (abilitySlot === 'hidden') {
                    if (!ha.includes(ab)) return false;
                } else {
                    if (!a1.includes(ab) && !a2.includes(ab) && !ha.includes(ab) && !ea.includes(ab)) {
                        return false;
                    }
                }
            } else if (abilitySlot === 'hidden') {
                // If user selected "Hidden Ability Only" without typing an ability name
                if (!p.hiddenAbility) return false;
            }

            // 4. Move and Rank Filtering
            if (mv || moveRank) {
                const hasMoveMatch = p.moves.some(([mName, mRank]) => {
                    const nameMatches = !mv || mName.toLowerCase().includes(mv);
                    const rankMatches = !moveRank || mRank.toLowerCase() === moveRank.toLowerCase();
                    return nameMatches && rankMatches;
                });
                if (!hasMoveMatch) return false;
            }

            // 5. Special Flags
            if (onlyStarters && !p.starter) return false;
            if (onlyLegendary && !p.legendary) return false;

            return true;
        });
    }, [
        lookupData,
        appliedName,
        type1,
        type2,
        typeMatchMode,
        appliedAbility,
        abilitySlot,
        appliedMove,
        moveRank,
        onlyStarters,
        onlyLegendary,
        hasActiveFilters
    ]);

    // Handle Card Expansion & Detail Fetching
    const handleToggleExpand = async (pokemonName: string) => {
        if (expandedPokemon === pokemonName) {
            setExpandedPokemon(null);
            return;
        }

        setExpandedPokemon(pokemonName);

        if (!fullDataCache[pokemonName]) {
            setLoadingDetails(pokemonName);
            try {
                const fullData = await fetchPokemonData(pokemonName);
                if (fullData) {
                    setFullDataCache((prev) => ({ ...prev, [pokemonName]: fullData }));
                }
            } catch (err) {
                console.error(`[GmPokemonLookup] Failed to load full details for ${pokemonName}:`, err);
            } finally {
                setLoadingDetails(null);
            }
        }
    };

    // Copy Discord Summary
    const handleCopyDiscord = async (pokemon: PokemonLookupEntry) => {
        let fullData = fullDataCache[pokemon.name];
        if (!fullData) {
            try {
                const fetched = await fetchPokemonData(pokemon.name);
                if (fetched) {
                    fullData = fetched;
                    setFullDataCache((prev) => ({ ...prev, [pokemon.name]: fetched }));
                }
            } catch (err) {
                console.error(`[GmPokemonLookup] Failed to fetch full data for Discord copy of ${pokemon.name}:`, err);
            }
        }

        const typesStr = pokemon.type2 ? `${pokemon.type1} / ${pokemon.type2}` : pokemon.type1;
        const standardAbilities = [pokemon.ability1, pokemon.ability2].filter(Boolean).join(', ') || 'None';
        const haText = pokemon.hiddenAbility ? `\n> **Hidden Ability (Homebrew):** ${pokemon.hiddenAbility}` : '';

        // Base Stats
        const statsStr = fullData
            ? `\n> **Base Stats:** HP: ${fullData.BaseHP ?? 0} | Str: ${fullData.Strength ?? 0} | Dex: ${fullData.Dexterity ?? 0} | Vit: ${fullData.Vitality ?? 0} | Spe: ${fullData.Special ?? 0} | Ins: ${fullData.Insight ?? 0}`
            : '';

        // Group moves by rank
        const grouped = groupMovesByRank(pokemon.moves);
        const movesText = grouped.map(({ rank, moves }) => `• **${rank}:** ${moves.join(', ')}`).join('\n');

        let matchedMoveInfo = '';
        if (appliedMove || moveRank) {
            const matches = pokemon.moves.filter(([mName, mRank]) => {
                const nameMatches = !appliedMove || mName.toLowerCase().includes(appliedMove.toLowerCase());
                const rankMatches = !moveRank || mRank.toLowerCase() === moveRank.toLowerCase();
                return nameMatches && rankMatches;
            });
            if (matches.length > 0) {
                matchedMoveInfo = `\n> **Matching Filter:** ${matches.map(([n, r]) => `${n} (${r})`).join(', ')}`;
            }
        }

        const text = `## 📖 **#${pokemon.dexId} ${pokemon.name}**
> **Type:** ${typesStr}
> **Abilities:** ${standardAbilities}${haText}${statsStr}${matchedMoveInfo}

**Move Learnset:**
${movesText || '• None'}`;

        try {
            await navigator.clipboard.writeText(text);
            setCopiedName(pokemon.name);
            setTimeout(() => setCopiedName(null), 2000);
        } catch (err) {
            console.error('[GmPokemonLookup] Failed to copy text to clipboard:', err);
        }
    };

    // Broadcast to Owlbear Chat
    const handleBroadcast = async (pokemon: PokemonLookupEntry) => {
        let fullData = fullDataCache[pokemon.name];
        if (!fullData) {
            try {
                const fetched = await fetchPokemonData(pokemon.name);
                if (fetched) {
                    fullData = fetched;
                    setFullDataCache((prev) => ({ ...prev, [pokemon.name]: fetched }));
                }
            } catch (err) {
                console.error(`[GmPokemonLookup] Failed to fetch full data for broadcast of ${pokemon.name}:`, err);
            }
        }

        const typesStr = pokemon.type2 ? `${pokemon.type1} / ${pokemon.type2}` : pokemon.type1;
        const standardAbilities = [pokemon.ability1, pokemon.ability2].filter(Boolean).join(', ') || 'None';
        const haText = pokemon.hiddenAbility ? ` | HA (Homebrew): ${pokemon.hiddenAbility}` : '';
        const statsText = fullData
            ? ` • HP: ${fullData.BaseHP ?? 0} | Str: ${fullData.Strength ?? 0} | Dex: ${fullData.Dexterity ?? 0} | Vit: ${fullData.Vitality ?? 0} | Spe: ${fullData.Special ?? 0} | Ins: ${fullData.Insight ?? 0}`
            : '';

        let extraMove = '';
        if (appliedMove || moveRank) {
            const matches = pokemon.moves.filter(([mName, mRank]) => {
                const nameMatches = !appliedMove || mName.toLowerCase().includes(appliedMove.toLowerCase());
                const rankMatches = !moveRank || mRank.toLowerCase() === moveRank.toLowerCase();
                return nameMatches && rankMatches;
            });
            if (matches.length > 0) {
                extraMove = ` • Filter Match: ${matches.map(([n, r]) => `${n} (${r})`).join(', ')}`;
            }
        }

        const broadcastText = `Pokémon: #${pokemon.dexId} ${pokemon.name} [${typesStr}] • Abilities: ${standardAbilities}${haText}${statsText}${extraMove}`;
        broadcastInfo(`Pokédex Lookup: ${pokemon.name}`, broadcastText);
    };

    // Copy Direct Shareable Link for Pokemon Lookup (includes active filters)
    const handleCopyLookupLink = async () => {
        try {
            const baseUrl = getBaseShareUrl();
            const params = new URLSearchParams();
            params.set('modal', 'gm-screen');
            params.set('section', 'lookup');

            const activeName = appliedName || nameInput.trim();
            const activeAbility = appliedAbility || abilityInput.trim();
            const activeMove = appliedMove || moveInput.trim();

            if (activeName) params.set('pokemon', activeName);
            if (type1) params.set('type1', type1);
            if (type2) params.set('type2', type2);
            if (type1 && type2 && typeMatchMode !== 'any') params.set('mode', typeMatchMode);
            if (activeAbility) params.set('ability', activeAbility);
            if (abilitySlot !== 'all') params.set('slot', abilitySlot);
            if (activeMove) params.set('move', activeMove);
            if (moveRank) params.set('rank', moveRank);
            if (onlyStarters) params.set('starter', '1');
            if (onlyLegendary) params.set('legendary', '1');

            const fullUrl = `${baseUrl}?${params.toString()}`;
            await navigator.clipboard.writeText(fullUrl);
            setCopiedLookupLink(true);
            setTimeout(() => setCopiedLookupLink(false), 2000);
        } catch (err) {
            console.error('[GmPokemonLookup] Failed to copy lookup link:', err);
        }
    };

    // Copy Direct Link to a specific Pokémon
    const handleCopyCardLink = async (pokemonName: string) => {
        try {
            const baseUrl = getBaseShareUrl();
            const fullUrl = `${baseUrl}?modal=gm-screen&section=lookup&pokemon=${encodeURIComponent(pokemonName)}`;
            await navigator.clipboard.writeText(fullUrl);
            setCopiedCardLink(pokemonName);
            setTimeout(() => setCopiedCardLink(null), 2000);
        } catch (err) {
            console.error('[GmPokemonLookup] Failed to copy pokemon card link:', err);
        }
    };

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
        <div className="gm-pokemon-lookup">
            {/* HTML5 Datalists for Autocomplete */}
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
                            onClick={handleApplySearch}
                            title="Apply all search parameters"
                        >
                            <Search size={14} /> Search
                        </button>
                        <button
                            type="button"
                            className="action-button action-button--dark"
                            onClick={handleCopyLookupLink}
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
                                onClick={handleResetFilters}
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
                                className="gm-pokemon-lookup__input text-subtext"
                                placeholder="Search name or number (e.g. Abra, 0063)..."
                                value={nameInput}
                                onChange={(e) => setNameInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleApplySearch();
                                }}
                                onBlur={handleApplySearch}
                            />
                            <div className="gm-pokemon-lookup__input-actions">
                                {nameInput && (
                                    <button
                                        type="button"
                                        className="gm-pokemon-lookup__icon-btn"
                                        onClick={handleClearName}
                                        title="Clear name search"
                                    >
                                        <X size={14} />
                                    </button>
                                )}
                                <button
                                    type="button"
                                    className="gm-pokemon-lookup__icon-btn gm-pokemon-lookup__search-trigger-btn"
                                    onClick={handleApplySearch}
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
                                <option value="">Primary Type: Any</option>
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
                                <option value="">Secondary Type: Any</option>
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

                    {/* 3. Ability Filtering */}
                    <div className="gm-pokemon-lookup__field">
                        <div className="gm-pokemon-lookup__field-label text-label">
                            <Sparkles size={14} /> Ability & Slot
                            <TooltipIcon
                                onClick={() =>
                                    setTooltipInfo({
                                        title: 'Hidden Abilities (Homebrew)',
                                        desc: 'Hidden Abilities are community homebrew additions in this dataset and are not canon to official Pokerole rules. GM discretion is advised when using them.'
                                    })
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
                                onChange={(e) => setAbilityInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleApplySearch();
                                }}
                                onBlur={handleApplySearch}
                            />
                            <div className="gm-pokemon-lookup__input-actions">
                                {abilityInput && (
                                    <button
                                        type="button"
                                        className="gm-pokemon-lookup__icon-btn"
                                        onClick={handleClearAbility}
                                        title="Clear ability filter"
                                    >
                                        <X size={14} />
                                    </button>
                                )}
                                <button
                                    type="button"
                                    className="gm-pokemon-lookup__icon-btn gm-pokemon-lookup__search-trigger-btn"
                                    onClick={handleApplySearch}
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

                    {/* 4. Move & Learn Rank Filtering */}
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
                                    onChange={(e) => setMoveInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleApplySearch();
                                    }}
                                    onBlur={handleApplySearch}
                                />
                                <div className="gm-pokemon-lookup__input-actions">
                                    {moveInput && (
                                        <button
                                            type="button"
                                            className="gm-pokemon-lookup__icon-btn"
                                            onClick={handleClearMove}
                                            title="Clear move filter"
                                        >
                                            <X size={14} />
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        className="gm-pokemon-lookup__icon-btn gm-pokemon-lookup__search-trigger-btn"
                                        onClick={handleApplySearch}
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
                    {filteredPokemon.slice(0, displayLimit).map((p) => {
                        const isExpanded = expandedPokemon === p.name;
                        const fullData = fullDataCache[p.name];
                        const isLoadingFull = loadingDetails === p.name;

                        // Check if move matches filter
                        const matchedMoves =
                            appliedMove || moveRank
                                ? p.moves.filter(([mName, mRank]) => {
                                      const nameMatches =
                                          !appliedMove || mName.toLowerCase().includes(appliedMove.toLowerCase());
                                      const rankMatches = !moveRank || mRank.toLowerCase() === moveRank.toLowerCase();
                                      return nameMatches && rankMatches;
                                  })
                                : [];

                        return (
                            <div
                                key={`lookup-poke-${p.name}`}
                                id={`pokemon-card-${p.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                                className="gm-pokemon-lookup__card"
                            >
                                <div className="gm-pokemon-lookup__card-header">
                                    <div className="gm-pokemon-lookup__card-identity">
                                        <span className="gm-pokemon-lookup__card-dex-id">#{p.dexId}</span>
                                        <span className="gm-pokemon-lookup__card-name">{p.name}</span>
                                        {p.isCustom && <span className="gm-pokemon-lookup__custom-tag">Homebrew</span>}
                                        <div className="gm-pokemon-lookup__card-types">
                                            <span
                                                className="gm-pokemon-lookup__type-badge"
                                                style={{ backgroundColor: allTypeColors[p.type1] || '#888' }}
                                            >
                                                {p.type1}
                                            </span>
                                            {p.type2 && (
                                                <span
                                                    className="gm-pokemon-lookup__type-badge"
                                                    style={{ backgroundColor: allTypeColors[p.type2] || '#888' }}
                                                >
                                                    {p.type2}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="gm-pokemon-lookup__card-actions">
                                        <button
                                            type="button"
                                            className="action-button action-button--dark"
                                            onClick={() => handleCopyDiscord(p)}
                                            title="Copy Discord Markdown summary"
                                        >
                                            {copiedName === p.name ? (
                                                <>
                                                    <Check size={14} color="#4caf50" /> Copied!
                                                </>
                                            ) : (
                                                <>
                                                    <Copy size={14} /> Discord
                                                </>
                                            )}
                                        </button>

                                        <button
                                            type="button"
                                            className="action-button action-button--dark"
                                            onClick={() => handleCopyCardLink(p.name)}
                                            title={`Copy direct link to ${p.name}`}
                                        >
                                            {copiedCardLink === p.name ? (
                                                <>
                                                    <Check size={14} color="#4caf50" /> Link Copied!
                                                </>
                                            ) : (
                                                <>
                                                    <Link2 size={14} /> Link
                                                </>
                                            )}
                                        </button>

                                        <button
                                            type="button"
                                            className="action-button action-button--secondary"
                                            onClick={() => handleBroadcast(p)}
                                            title="Broadcast Pokémon summary to Owlbear Rodeo chat"
                                        >
                                            <Megaphone size={14} /> Broadcast
                                        </button>

                                        <button
                                            type="button"
                                            className="action-button action-button--dark"
                                            onClick={() => handleToggleExpand(p.name)}
                                            title={
                                                isExpanded ? 'Collapse learnset & stats' : 'View full learnset & stats'
                                            }
                                        >
                                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                            {isExpanded ? 'Hide' : 'Details'}
                                        </button>
                                    </div>
                                </div>

                                <div className="gm-pokemon-lookup__card-details">
                                    <div className="gm-pokemon-lookup__abilities-list">
                                        <span className="text-label" style={{ marginRight: '4px' }}>
                                            Abilities:
                                        </span>
                                        {p.ability1 && (
                                            <span
                                                className={`gm-pokemon-lookup__ability-badge ${
                                                    appliedAbility &&
                                                    p.ability1.toLowerCase().includes(appliedAbility.toLowerCase())
                                                        ? 'gm-pokemon-lookup__ability-badge--highlight'
                                                        : ''
                                                }`}
                                            >
                                                {p.ability1}
                                            </span>
                                        )}
                                        {p.ability2 && (
                                            <span
                                                className={`gm-pokemon-lookup__ability-badge ${
                                                    appliedAbility &&
                                                    p.ability2.toLowerCase().includes(appliedAbility.toLowerCase())
                                                        ? 'gm-pokemon-lookup__ability-badge--highlight'
                                                        : ''
                                                }`}
                                            >
                                                {p.ability2}
                                            </span>
                                        )}
                                        {p.hiddenAbility && (
                                            <span
                                                className={`gm-pokemon-lookup__ability-badge gm-pokemon-lookup__ability-badge--hidden ${
                                                    appliedAbility &&
                                                    p.hiddenAbility.toLowerCase().includes(appliedAbility.toLowerCase())
                                                        ? 'gm-pokemon-lookup__ability-badge--highlight'
                                                        : ''
                                                }`}
                                                style={{ cursor: 'pointer' }}
                                                onClick={() =>
                                                    setTooltipInfo({
                                                        title: `${p.hiddenAbility} (Hidden Ability - Homebrew)`,
                                                        desc: 'Hidden Abilities are community homebrew additions in this dataset and are not canon to official Pokerole rules. GM discretion is advised when using them.'
                                                    })
                                                }
                                            >
                                                <Sparkles size={11} /> {p.hiddenAbility}{' '}
                                                <span className="gm-pokemon-lookup__ha-tag">HA</span>
                                            </span>
                                        )}
                                    </div>

                                    {matchedMoves.length > 0 && (
                                        <div className="gm-pokemon-lookup__match-pill">
                                            <Zap size={13} />
                                            {matchedMoves.map(([mName, mRank]) => `${mName} (${mRank})`).join(', ')}
                                        </div>
                                    )}
                                </div>

                                {/* Expandable Detail Drawer */}
                                {isExpanded && (
                                    <div className="gm-pokemon-lookup__drawer">
                                        {isLoadingFull ? (
                                            <div
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '8px',
                                                    padding: '8px 0'
                                                }}
                                            >
                                                <Loader2 size={16} className="animate-spin" />
                                                <span className="text-subtext">Loading full Pokédex entry...</span>
                                            </div>
                                        ) : (
                                            <>
                                                {/* Stats Box if fullData available */}
                                                {fullData && (
                                                    <div className="gm-pokemon-lookup__drawer-stats-grid">
                                                        <div className="gm-pokemon-lookup__stat-box">
                                                            <span className="gm-pokemon-lookup__stat-name">
                                                                Base HP
                                                            </span>
                                                            <span className="gm-pokemon-lookup__stat-val">
                                                                {fullData.BaseHP || 0}
                                                            </span>
                                                        </div>
                                                        <div className="gm-pokemon-lookup__stat-box">
                                                            <span className="gm-pokemon-lookup__stat-name">
                                                                Strength
                                                            </span>
                                                            <span className="gm-pokemon-lookup__stat-val">
                                                                {fullData.Strength || 0}
                                                            </span>
                                                        </div>
                                                        <div className="gm-pokemon-lookup__stat-box">
                                                            <span className="gm-pokemon-lookup__stat-name">
                                                                Dexterity
                                                            </span>
                                                            <span className="gm-pokemon-lookup__stat-val">
                                                                {fullData.Dexterity || 0}
                                                            </span>
                                                        </div>
                                                        <div className="gm-pokemon-lookup__stat-box">
                                                            <span className="gm-pokemon-lookup__stat-name">
                                                                Vitality
                                                            </span>
                                                            <span className="gm-pokemon-lookup__stat-val">
                                                                {fullData.Vitality || 0}
                                                            </span>
                                                        </div>
                                                        <div className="gm-pokemon-lookup__stat-box">
                                                            <span className="gm-pokemon-lookup__stat-name">
                                                                Special
                                                            </span>
                                                            <span className="gm-pokemon-lookup__stat-val">
                                                                {fullData.Special || 0}
                                                            </span>
                                                        </div>
                                                        <div className="gm-pokemon-lookup__stat-box">
                                                            <span className="gm-pokemon-lookup__stat-name">
                                                                Insight
                                                            </span>
                                                            <span className="gm-pokemon-lookup__stat-val">
                                                                {fullData.Insight || 0}
                                                            </span>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Full Move Learnset Grouped by Rank */}
                                                <div className="gm-pokemon-lookup__drawer-moves">
                                                    <div className="gm-pokemon-lookup__drawer-moves-title">
                                                        Move Learnset ({p.moves.length} Moves)
                                                    </div>
                                                    <div className="gm-pokemon-lookup__rank-groups-container">
                                                        {groupMovesByRank(p.moves).map(({ rank, moves }) => (
                                                            <div
                                                                key={`rank-group-${p.name}-${rank}`}
                                                                className="gm-pokemon-lookup__rank-group"
                                                            >
                                                                <div className="gm-pokemon-lookup__rank-group-title text-label">
                                                                    {rank} ({moves.length})
                                                                </div>
                                                                <div className="gm-pokemon-lookup__rank-moves-list">
                                                                    {moves.map((mName, idx) => {
                                                                        const isMoveMatch =
                                                                            appliedMove &&
                                                                            mName
                                                                                .toLowerCase()
                                                                                .includes(appliedMove.toLowerCase());
                                                                        return (
                                                                            <span
                                                                                key={`move-${p.name}-${mName}-${idx}`}
                                                                                className={`gm-pokemon-lookup__move-pill ${
                                                                                    isMoveMatch
                                                                                        ? 'gm-pokemon-lookup__move-pill--highlight'
                                                                                        : ''
                                                                                }`}
                                                                            >
                                                                                {mName}
                                                                            </span>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Dex Description if available */}
                                                {fullData && fullData.DexDescription && (
                                                    <div className="gm-pokemon-lookup__drawer-desc">
                                                        "{fullData.DexDescription}"
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}

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
