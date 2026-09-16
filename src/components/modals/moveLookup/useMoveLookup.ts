import { useState, useEffect, useMemo, useCallback } from 'react';
import type { MoveLookupEntry, PokemonLookupEntry } from '../../../utils/apiTypes';
import { fetchMoveLookupIndex, fetchPokemonLookupIndex } from '../../../utils/api';
import { broadcastInfo } from '../../../utils/diceRoller';
import { getBaseShareUrl } from '../../../utils/helper';
import type { MoveCategoryFilter, LearnedByPokemon } from './moveLookupTypes';
import { matchesPowerFilter, buildMoveDiscordMarkdown, buildMoveBroadcast } from './moveLookupUtils';

export function useMoveLookup(initialMoveName?: string) {
    const [movesData, setMovesData] = useState<MoveLookupEntry[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [loadError, setLoadError] = useState<string | null>(null);

    // Filter Inputs (draft vs committed text search)
    const [nameInput, setNameInput] = useState<string>(initialMoveName || '');
    const [appliedName, setAppliedName] = useState<string>(initialMoveName || '');
    const [typeFilter, setTypeFilter] = useState<string>('');
    const [categoryFilter, setCategoryFilter] = useState<MoveCategoryFilter>('all');
    const [powerFilters, setPowerFilters] = useState<string[]>([]);

    // UI States
    const [displayLimit, setDisplayLimit] = useState<number>(50);
    const [expandedMove, setExpandedMove] = useState<string | null>(initialMoveName || null);
    const [pokemonData, setPokemonData] = useState<PokemonLookupEntry[]>([]);
    const [isLoadingLearnedBy, setIsLoadingLearnedBy] = useState<boolean>(false);
    const [copiedDiscordName, setCopiedDiscordName] = useState<string | null>(null);
    const [copiedCardLink, setCopiedCardLink] = useState<string | null>(null);
    const [copiedLookupLink, setCopiedLookupLink] = useState<boolean>(false);

    // Initial Data Fetch (Only load moves-lookup.json; Pokédex data is deferred on demand)
    useEffect(() => {
        let isMounted = true;
        setIsLoading(true);

        fetchMoveLookupIndex()
            .then((moves) => {
                if (isMounted) {
                    setMovesData(moves);
                    setIsLoading(false);
                }
            })
            .catch((err) => {
                console.error('[useMoveLookup] Failed to fetch move dataset:', err);
                if (isMounted) {
                    setLoadError('Failed to load move database. Please try again.');
                    setIsLoading(false);
                }
            });

        // Read URL deep links
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const moveParam = urlParams.get('move') || urlParams.get('moveName');
            const typeParam = urlParams.get('type') || urlParams.get('moveType');
            const catParam = urlParams.get('category') as MoveCategoryFilter | null;
            const powerParam = urlParams.get('power');

            if (moveParam) {
                setNameInput(moveParam);
                setAppliedName(moveParam);
                setExpandedMove(moveParam);
            }
            if (typeParam) {
                setTypeFilter(typeParam);
            }
            if (catParam && ['Physical', 'Special', 'Status'].includes(catParam)) {
                setCategoryFilter(catParam);
            }
            if (powerParam) {
                setPowerFilters([powerParam]);
            }
        } catch (e) {
            console.warn('[useMoveLookup] Could not parse URL parameters:', e);
        }

        return () => {
            isMounted = false;
        };
    }, []);

    // Sync external initialMoveName changes
    useEffect(() => {
        if (initialMoveName) {
            setNameInput(initialMoveName);
            setAppliedName(initialMoveName);
            setExpandedMove(initialMoveName);
        }
    }, [initialMoveName]);

    // Map Pokémon learning each move
    const movesLearnedByMap = useMemo(() => {
        const map: Record<string, LearnedByPokemon[]> = {};
        pokemonData.forEach((p) => {
            p.moves.forEach(([mName, rank]) => {
                if (!mName) return;
                const clean = mName.toLowerCase();
                if (!map[clean]) map[clean] = [];
                map[clean].push({
                    name: p.name,
                    dexId: p.dexId,
                    rank: rank || 'Other',
                    isCustom: p.isCustom
                });
            });
        });
        return map;
    }, [pokemonData]);

    // Autocomplete Move Names
    const availableMoveNames = useMemo(() => {
        return movesData.map((m) => m.name).sort((a, b) => a.localeCompare(b));
    }, [movesData]);

    // Commit search (Enter, Blur, Search button, or autocomplete pick)
    const handleApplySearch = useCallback(
        (overrideName?: string) => {
            setAppliedName((overrideName !== undefined ? overrideName : nameInput).trim());
            setDisplayLimit(50);
        },
        [nameInput]
    );

    const handleClearName = useCallback(() => {
        setNameInput('');
        setAppliedName('');
        setDisplayLimit(50);
    }, []);

    const handleResetFilters = useCallback(() => {
        setNameInput('');
        setAppliedName('');
        setTypeFilter('');
        setCategoryFilter('all');
        setPowerFilters([]);
        setDisplayLimit(50);
    }, []);

    const hasActiveFilters = useMemo(() => {
        return Boolean(appliedName || typeFilter || categoryFilter !== 'all' || powerFilters.length > 0);
    }, [appliedName, typeFilter, categoryFilter, powerFilters]);

    // On-demand fetch for Pokémon learnsets
    const loadLearnedByData = useCallback(async () => {
        if (pokemonData.length > 0 || isLoadingLearnedBy) return;
        setIsLoadingLearnedBy(true);
        try {
            const pokemons = await fetchPokemonLookupIndex();
            setPokemonData(pokemons);
        } catch (err) {
            console.warn('[useMoveLookup] Failed to load Pokémon learnset data on demand:', err);
        } finally {
            setIsLoadingLearnedBy(false);
        }
    }, [pokemonData.length, isLoadingLearnedBy]);

    // Filter Logic
    const filteredMoves = useMemo(() => {
        if (!movesData.length || !hasActiveFilters) return [];

        const q = appliedName.toLowerCase();
        const t = typeFilter.toLowerCase();

        return movesData.filter((m) => {
            // 1. Name Match
            if (q && !m.name.toLowerCase().includes(q)) {
                return false;
            }

            // 2. Type Match
            if (t && m.type.toLowerCase() !== t) {
                return false;
            }

            // 3. Category Match
            if (categoryFilter !== 'all') {
                const moveCat = m.category.toLowerCase();
                const targetCat = categoryFilter.toLowerCase();
                if (targetCat === 'status') {
                    if (!moveCat.includes('status') && !moveCat.includes('support') && !moveCat.includes('supp')) {
                        return false;
                    }
                } else if (!moveCat.includes(targetCat)) {
                    return false;
                }
            }

            // 4. Power Match
            if (!matchesPowerFilter(m.power, m.category, powerFilters)) {
                return false;
            }

            return true;
        });
    }, [movesData, appliedName, typeFilter, categoryFilter, powerFilters, hasActiveFilters]);

    // Expand Card
    const handleToggleExpand = useCallback((moveName: string) => {
        setExpandedMove((prev) => (prev === moveName ? null : moveName));
    }, []);

    // Copy Discord Markdown
    const handleCopyDiscord = useCallback(async (move: MoveLookupEntry) => {
        try {
            const text = buildMoveDiscordMarkdown(move);
            await navigator.clipboard.writeText(text);
            setCopiedDiscordName(move.name);
            setTimeout(() => setCopiedDiscordName(null), 2000);
        } catch (err) {
            console.error('[useMoveLookup] Failed to copy Discord markdown:', err);
        }
    }, []);

    // Broadcast to Owlbear Chat
    const handleBroadcast = useCallback(async (move: MoveLookupEntry) => {
        try {
            const { title, desc } = buildMoveBroadcast(move);
            await broadcastInfo(title, desc);
        } catch (err) {
            console.error('[useMoveLookup] Failed to broadcast move:', err);
        }
    }, []);

    // Copy Direct Shareable Link for Move Lookup
    const handleCopyLookupLink = useCallback(async () => {
        try {
            const base = getBaseShareUrl();
            const params = new URLSearchParams();
            params.set('lookup', 'moves');
            if (appliedName) params.set('move', appliedName);
            if (typeFilter) params.set('type', typeFilter);
            if (categoryFilter !== 'all') params.set('category', categoryFilter);
            if (powerFilters.length > 0) params.set('power', powerFilters.join(','));

            const shareUrl = `${base}?${params.toString()}`;
            await navigator.clipboard.writeText(shareUrl);
            setCopiedLookupLink(true);
            setTimeout(() => setCopiedLookupLink(false), 2000);
        } catch (err) {
            console.error('[useMoveLookup] Failed to copy lookup link:', err);
        }
    }, [appliedName, typeFilter, categoryFilter, powerFilters]);

    // Copy Direct Link to Single Move Card
    const handleCopyCardLink = useCallback(async (moveName: string) => {
        try {
            const base = getBaseShareUrl();
            const params = new URLSearchParams();
            params.set('lookup', 'moves');
            params.set('move', moveName);

            const shareUrl = `${base}?${params.toString()}#move-card-${moveName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
            await navigator.clipboard.writeText(shareUrl);
            setCopiedCardLink(moveName);
            setTimeout(() => setCopiedCardLink(null), 2000);
        } catch (err) {
            console.error('[useMoveLookup] Failed to copy move card link:', err);
        }
    }, []);

    return {
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
    };
}
