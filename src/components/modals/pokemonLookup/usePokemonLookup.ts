import { useState, useEffect, useMemo, useCallback } from 'react';
import type { PokemonLookupEntry, AbilitySlotFilter, TypeMatchMode, PokemonApiResponse } from '../../../utils/apiTypes';
import type { CustomPokemon } from '../../../store/storeTypes';
import { fetchPokemonLookupIndex, fetchPokemonData } from '../../../utils/api';
import { broadcastInfo } from '../../../utils/diceRoller';
import { getBaseShareUrl } from '../../../utils/helper';
import { filterPokemonLookup, buildPokemonDiscordMarkdown, buildPokemonBroadcast } from './pokemonLookupUtils';

export function usePokemonLookup(initialPokemonName?: string, initialMoveFilter?: string) {
    // Data State
    const [lookupData, setLookupData] = useState<PokemonLookupEntry[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [loadError, setLoadError] = useState<string | null>(null);

    // Filter Draft Inputs
    const [nameInput, setNameInput] = useState<string>(initialPokemonName || '');
    const [abilityInput, setAbilityInput] = useState<string>('');
    const [moveInput, setMoveInput] = useState<string>(initialMoveFilter || '');

    // Committed Text Search Parameters
    const [appliedName, setAppliedName] = useState<string>(initialPokemonName || '');
    const [appliedAbility, setAppliedAbility] = useState<string>('');
    const [appliedMove, setAppliedMove] = useState<string>(initialMoveFilter || '');

    // Dropdown & Toggle Filters
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
    const [expandedPokemon, setExpandedPokemon] = useState<string | null>(initialPokemonName || null);
    const [fullDataCache, setFullDataCache] = useState<Record<string, PokemonApiResponse | CustomPokemon>>({});
    const [loadingDetails, setLoadingDetails] = useState<string | null>(null);
    const [copiedName, setCopiedName] = useState<string | null>(null);
    const [copiedLookupLink, setCopiedLookupLink] = useState<boolean>(false);
    const [copiedCardLink, setCopiedCardLink] = useState<string | null>(null);

    // Initial Fetch & URL deep link reading
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
                console.error('[usePokemonLookup] Failed to fetch lookup index:', err);
                if (isMounted) {
                    setLoadError('Failed to load Pokémon database. Please try again.');
                    setIsLoading(false);
                }
            });

        try {
            const urlParams = new URLSearchParams(window.location.search);
            const rawHash = decodeURIComponent(window.location.hash.replace(/^#/, ''));
            const pokemonParam =
                urlParams.get('pokemon') ||
                urlParams.get('name') ||
                (rawHash &&
                rawHash !== 'lookup' &&
                rawHash !== 'pokemon-lookup' &&
                !rawHash.startsWith('gm-') &&
                !rawHash.startsWith('move-')
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
            if (type1Param) setType1(type1Param);
            if (type2Param) setType2(type2Param);
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
            if (rankParam) setMoveRank(rankParam);
            if (starterParam === '1' || starterParam === 'true') setOnlyStarters(true);
            if (legendaryParam === '1' || legendaryParam === 'true') setOnlyLegendary(true);
        } catch (e) {
            console.warn('[usePokemonLookup] Could not parse URL parameters:', e);
        }

        return () => {
            isMounted = false;
        };
    }, []);

    // Sync external props
    useEffect(() => {
        if (initialPokemonName) {
            setNameInput(initialPokemonName);
            setAppliedName(initialPokemonName);
            setExpandedPokemon(initialPokemonName);
        }
    }, [initialPokemonName]);

    useEffect(() => {
        if (initialMoveFilter) {
            setMoveInput(initialMoveFilter);
            setAppliedMove(initialMoveFilter);
        }
    }, [initialMoveFilter]);

    // Autocomplete datasets
    const availablePokemonNames = useMemo(() => {
        const set = new Set<string>();
        lookupData.forEach((p) => {
            if (p.name) set.add(p.name);
        });
        return Array.from(set).sort((a, b) => a.localeCompare(b));
    }, [lookupData]);

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

    // Apply Search
    const handleApplySearch = useCallback(
        (overrideName?: string, overrideAbility?: string, overrideMove?: string) => {
            setAppliedName((overrideName !== undefined ? overrideName : nameInput).trim());
            setAppliedAbility((overrideAbility !== undefined ? overrideAbility : abilityInput).trim());
            setAppliedMove((overrideMove !== undefined ? overrideMove : moveInput).trim());
            setDisplayLimit(50);
        },
        [nameInput, abilityInput, moveInput]
    );

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

    // Filter Logic using extracted pure function
    const filteredPokemon = useMemo(() => {
        return filterPokemonLookup(lookupData, {
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

    // Expand & Detail Fetching
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
                console.error(`[usePokemonLookup] Failed to load full details for ${pokemonName}:`, err);
            } finally {
                setLoadingDetails(null);
            }
        }
    };

    // Copy Discord
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
                console.error(`[usePokemonLookup] Failed to fetch full data for Discord copy of ${pokemon.name}:`, err);
            }
        }

        const text = buildPokemonDiscordMarkdown(pokemon, fullData, appliedMove, moveRank);

        try {
            await navigator.clipboard.writeText(text);
            setCopiedName(pokemon.name);
            setTimeout(() => setCopiedName(null), 2000);
        } catch (err) {
            console.error('[usePokemonLookup] Failed to copy text to clipboard:', err);
        }
    };

    // Broadcast
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
                console.error(`[usePokemonLookup] Failed to fetch full data for broadcast of ${pokemon.name}:`, err);
            }
        }

        const { title, desc } = buildPokemonBroadcast(pokemon, fullData, appliedMove, moveRank);
        await broadcastInfo(title, desc);
    };

    // Copy Lookup Link
    const handleCopyLookupLink = async () => {
        try {
            const base = getBaseShareUrl();
            const params = new URLSearchParams();
            params.set('lookup', 'pokemon');
            if (appliedName) params.set('pokemon', appliedName);
            if (type1) params.set('type1', type1);
            if (type2) params.set('type2', type2);
            if (typeMatchMode !== 'any') params.set('mode', typeMatchMode);
            if (appliedAbility) params.set('ability', appliedAbility);
            if (abilitySlot !== 'all') params.set('slot', abilitySlot);
            if (appliedMove) params.set('move', appliedMove);
            if (moveRank) params.set('rank', moveRank);
            if (onlyStarters) params.set('starter', '1');
            if (onlyLegendary) params.set('legendary', '1');

            const shareUrl = `${base}?${params.toString()}`;
            await navigator.clipboard.writeText(shareUrl);
            setCopiedLookupLink(true);
            setTimeout(() => setCopiedLookupLink(false), 2000);
        } catch (err) {
            console.error('[usePokemonLookup] Failed to copy lookup link:', err);
        }
    };

    // Copy Card Link
    const handleCopyCardLink = async (pokemonName: string) => {
        try {
            const base = getBaseShareUrl();
            const params = new URLSearchParams();
            params.set('lookup', 'pokemon');
            params.set('pokemon', pokemonName);

            const shareUrl = `${base}?${params.toString()}#pokemon-card-${pokemonName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
            await navigator.clipboard.writeText(shareUrl);
            setCopiedCardLink(pokemonName);
            setTimeout(() => setCopiedCardLink(null), 2000);
        } catch (err) {
            console.error('[usePokemonLookup] Failed to copy pokemon card link:', err);
        }
    };

    const handleOpenTooltip = (title: string, desc: string) => {
        setTooltipInfo({ title, desc });
    };

    return {
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
        appliedName,
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
    };
}
