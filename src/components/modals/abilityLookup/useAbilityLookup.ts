import { useState, useEffect, useMemo, useCallback } from 'react';
import type { PokemonLookupEntry } from '../../../utils/api/apiTypes';
import { fetchPokemonLookupIndex } from '../../../utils/api/api';
import { useCharacterStore } from '../../../store/useCharacterStore';
import { broadcastInfo } from '../../../utils/combat/diceRoller';
import { getBaseShareUrl } from '../../../utils/common/helper';
import type { AbilityItem } from './abilityLookupTypes';
import {
    filterAbilities,
    mapPokemonByAbility,
    extractAbilitiesFromPokedex,
    buildAbilityDiscordMarkdown,
    buildAbilityBroadcast
} from './abilityLookupUtils';

export function useAbilityLookup(initialAbilityName?: string) {
    const role = useCharacterStore((state) => state.role);
    const roomCustomAbilities = useCharacterStore((state) => state.roomCustomAbilities || []);

    const [pokemonData, setPokemonData] = useState<PokemonLookupEntry[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [loadError, setLoadError] = useState<string | null>(null);

    // Filter Inputs (draft vs committed text search)
    const [nameInput, setNameInput] = useState<string>(initialAbilityName || '');
    const [appliedName, setAppliedName] = useState<string>(initialAbilityName || '');

    // UI States
    const [displayLimit, setDisplayLimit] = useState<number>(50);
    const [expandedAbility, setExpandedAbility] = useState<string | null>(initialAbilityName || null);
    const [copiedDiscordName, setCopiedDiscordName] = useState<string | null>(null);
    const [copiedCardLink, setCopiedCardLink] = useState<string | null>(null);
    const [copiedLookupLink, setCopiedLookupLink] = useState<boolean>(false);

    // Initial Data Fetch: Load existing Pokédex index to extract abilities and Pokémon associations
    useEffect(() => {
        let isMounted = true;
        setIsLoading(true);

        fetchPokemonLookupIndex()
            .then((pokemons) => {
                if (isMounted) {
                    setPokemonData(pokemons);
                    setIsLoading(false);
                }
            })
            .catch((err) => {
                console.error('[useAbilityLookup] Failed to fetch Pokédex index:', err);
                if (isMounted) {
                    setLoadError('Failed to load abilities from Pokédex. Please try again.');
                    setIsLoading(false);
                }
            });

        // Read URL deep links
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const abilityParam = urlParams.get('ability') || urlParams.get('abilityName');

            if (abilityParam) {
                setNameInput(abilityParam);
                setAppliedName(abilityParam);
                setExpandedAbility(abilityParam);
            }
        } catch (e) {
            console.warn('[useAbilityLookup] Could not parse URL parameters:', e);
        }

        return () => {
            isMounted = false;
        };
    }, []);

    // Sync external initialAbilityName prop changes
    useEffect(() => {
        if (initialAbilityName) {
            setNameInput(initialAbilityName);
            setAppliedName(initialAbilityName);
            setExpandedAbility(initialAbilityName);
        }
    }, [initialAbilityName]);

    // Extract sorted unique ability list from Pokédex & room custom abilities
    const abilitiesData = useMemo(() => {
        return extractAbilitiesFromPokedex(pokemonData, roomCustomAbilities, role);
    }, [pokemonData, roomCustomAbilities, role]);

    // Map Pokémon holding each ability
    const pokemonHoldersMap = useMemo(() => {
        return mapPokemonByAbility(pokemonData);
    }, [pokemonData]);

    // Autocomplete Ability Names
    const availableAbilityNames = useMemo(() => {
        return abilitiesData.map((a) => a.name);
    }, [abilitiesData]);

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
        setDisplayLimit(50);
    }, []);

    const hasActiveFilters = useMemo(() => {
        return Boolean(appliedName);
    }, [appliedName]);

    // Filtered Abilities
    const filteredAbilities = useMemo(() => {
        if (!abilitiesData.length || !hasActiveFilters) return [];
        return filterAbilities(abilitiesData, appliedName);
    }, [abilitiesData, appliedName, hasActiveFilters]);

    // Expand Card
    const handleToggleExpand = useCallback((abilityName: string) => {
        setExpandedAbility((prev) => (prev === abilityName ? null : abilityName));
    }, []);

    // Copy Discord Markdown
    const handleCopyDiscord = useCallback(async (ability: AbilityItem) => {
        try {
            const text = buildAbilityDiscordMarkdown(ability);
            await navigator.clipboard.writeText(text);
            setCopiedDiscordName(ability.name);
            setTimeout(() => setCopiedDiscordName(null), 2000);
        } catch (err) {
            console.error('[useAbilityLookup] Failed to copy Discord markdown:', err);
        }
    }, []);

    // Broadcast to Owlbear Chat
    const handleBroadcast = useCallback(async (ability: AbilityItem) => {
        try {
            const { title, desc } = buildAbilityBroadcast(ability);
            await broadcastInfo(title, desc);
        } catch (err) {
            console.error('[useAbilityLookup] Failed to broadcast ability:', err);
        }
    }, []);

    // Copy Direct Share Link for this Ability
    const handleCopyCardLink = useCallback(async (abilityName: string) => {
        try {
            const base = getBaseShareUrl();
            const shareUrl = `${base}?lookup=abilities&ability=${encodeURIComponent(abilityName)}`;
            await navigator.clipboard.writeText(shareUrl);
            setCopiedCardLink(abilityName);
            setTimeout(() => setCopiedCardLink(null), 2000);
        } catch (err) {
            console.error('[useAbilityLookup] Failed to copy ability direct link:', err);
        }
    }, []);

    // Copy Lookup Link (General Abilities Tab)
    const handleCopyLookupLink = useCallback(async () => {
        try {
            const base = getBaseShareUrl();
            const shareUrl = `${base}?lookup=abilities`;
            await navigator.clipboard.writeText(shareUrl);
            setCopiedLookupLink(true);
            setTimeout(() => setCopiedLookupLink(false), 2000);
        } catch (err) {
            console.error('[useAbilityLookup] Failed to copy general lookup link:', err);
        }
    }, []);

    return {
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
        handleCopyCardLink,
        handleCopyLookupLink
    };
}
