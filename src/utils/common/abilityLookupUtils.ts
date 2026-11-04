import { useCharacterStore } from '@/store/useCharacterStore';
import { getKnownAbility } from '@/data/abilities/knownAbilities';
import { fetchAbilityData } from '@/utils/api/api';

export interface AbilityLookupResult {
    name: string;
    effect?: string;
    description?: string;
    summary?: string;
    tags?: string;
}

/**
 * Looks up ability details by name across custom abilities, known rules constants,
 * and the local/remote PokéRole dataset.
 */
export async function lookupAbilityDetails(
    abilityName: string,
    rank?: string,
    initialTags?: string
): Promise<AbilityLookupResult> {
    const rawName = (abilityName || '').trim();
    if (!rawName) {
        return {
            name: '',
            effect: '',
            description: '',
            summary: '',
            tags: initialTags?.trim() || ''
        };
    }

    const cleanName = rawName.replace(/\s*\(HA\)$/i, '').trim();

    // 1. Check custom abilities in store first
    let customAbility: { name: string; description?: string; effect?: string } | undefined;
    try {
        const customAbilities = useCharacterStore.getState().roomCustomAbilities || [];
        customAbility = customAbilities.find(
            (ca) => ca.name.trim().toLowerCase() === cleanName.toLowerCase()
        );
    } catch {
        // Ignore store access errors in isolated environments
    }

    // 2. Check known ability definition for rule summary and canonical tags
    const known = getKnownAbility(cleanName, rank);

    // 3. Fetch official dataset description and effect
    let apiData = null;
    try {
        apiData = await fetchAbilityData(cleanName);
    } catch {
        // Fallback gracefully if API fetch fails
    }

    const name = customAbility?.name || apiData?.Name || known?.name || cleanName;
    const effect = (customAbility?.effect || apiData?.Effect || '').trim();
    const description = (customAbility?.description || apiData?.Description || '').trim();
    const summary = (known?.summary || '').trim();

    // 4. Resolve tags
    let tags = (initialTags || '').trim();
    if (!tags) {
        tags = (known?.tags || '').trim();
    } else if (known?.tags) {
        const knownTagsTrimmed = known.tags.trim();
        if (knownTagsTrimmed && !tags.toLowerCase().includes(knownTagsTrimmed.toLowerCase())) {
            tags = `${tags} ${knownTagsTrimmed}`.trim();
        }
    }

    return {
        name,
        effect,
        description,
        summary,
        tags
    };
}

