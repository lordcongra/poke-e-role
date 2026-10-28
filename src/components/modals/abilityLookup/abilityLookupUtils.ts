import type { PokemonLookupEntry } from '../../../utils/api/apiTypes';
import type { CustomAbility } from '../../../store/storeTypes';
import type { AbilityItem, AbilityPokemonHolder } from './abilityLookupTypes';

/**
 * Generate formatted Discord Markdown text for an ability.
 */
export function buildAbilityDiscordMarkdown(ability: AbilityItem): string {
    const lines: string[] = [
        `## **${ability.name}**${ability.isCustom ? ' *(Homebrew)*' : ''}`,
        '',
        '**Effect:**',
        ability.effect || 'No effect provided.'
    ];

    if (ability.description) {
        lines.push('', `*${ability.description}*`);
    }

    lines.push('', '-# Powered by Pokérole Autosheet');

    return lines.join('\n');
}

/**
 * Generate broadcast description for Owlbear Rodeo chat.
 */
export function buildAbilityBroadcast(ability: AbilityItem): { title: string; desc: string } {
    const title = `${ability.name}${ability.isCustom ? ' (Homebrew Ability)' : ' (Ability)'}`;
    const descParts = [`**Effect:**\n${ability.effect || 'None'}`];

    if (ability.description) {
        descParts.push(`*${ability.description}*`);
    }

    return {
        title,
        desc: descParts.join('\n\n')
    };
}

/**
 * Filter ability entries by search query.
 */
export function filterAbilities(abilities: AbilityItem[], searchQuery: string): AbilityItem[] {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return abilities;

    return abilities.filter((a) => {
        const nameMatch = a.name.toLowerCase().includes(q);
        const effectMatch = a.effect ? a.effect.toLowerCase().includes(q) : false;
        return nameMatch || effectMatch;
    });
}

/**
 * Extracts a sorted unique list of abilities from the loaded Pokédex lookup and custom abilities.
 */
export function extractAbilitiesFromPokedex(
    pokemonList: PokemonLookupEntry[],
    roomCustomAbilities: CustomAbility[] = [],
    role?: string
): AbilityItem[] {
    const map = new Map<string, { name: string; isCustom?: boolean; effect?: string; description?: string }>();

    pokemonList.forEach((p) => {
        const check = (name?: string) => {
            if (!name) return;
            const trimmed = name.trim();
            const key = trimmed.toLowerCase();
            if (key && !map.has(key)) {
                map.set(key, { name: trimmed, isCustom: false });
            }
        };
        check(p.ability1);
        check(p.ability2);
        check(p.hiddenAbility);
        if (p.eventAbilities) {
            p.eventAbilities.split(/[,;]/).forEach(check);
        }
    });

    const isGm = role === 'GM';
    roomCustomAbilities.forEach((ca) => {
        if (!isGm && ca.gmOnly) return;
        const trimmed = ca.name.trim();
        const key = trimmed.toLowerCase();
        if (key) {
            map.set(key, {
                name: trimmed,
                isCustom: true,
                effect: ca.effect,
                description: ca.description
            });
        }
    });

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Index Pokémon from Pokédex by the abilities they have access to.
 * Maps clean lowercase ability names to an array of AbilityPokemonHolder entries.
 */
export function mapPokemonByAbility(pokemonList: PokemonLookupEntry[]): Record<string, AbilityPokemonHolder[]> {
    const map: Record<string, AbilityPokemonHolder[]> = {};

    const addHolder = (abilityName: string, p: PokemonLookupEntry, slotLabel: string) => {
        if (!abilityName || typeof abilityName !== 'string') return;
        const clean = abilityName.trim().toLowerCase();
        if (!clean) return;

        if (!map[clean]) {
            map[clean] = [];
        }

        const alreadyExists = map[clean].some(
            (h) => h.name.toLowerCase() === p.name.toLowerCase() && h.slotLabel === slotLabel
        );
        if (!alreadyExists) {
            map[clean].push({
                name: p.name,
                dexId: p.dexId,
                slotLabel,
                isCustom: p.isCustom
            });
        }
    };

    pokemonList.forEach((p) => {
        if (p.ability1) {
            addHolder(p.ability1, p, 'Ability 1');
        }
        if (p.ability2) {
            addHolder(p.ability2, p, 'Ability 2');
        }
        if (p.hiddenAbility) {
            addHolder(p.hiddenAbility, p, 'Hidden Ability');
        }
        if (p.eventAbilities) {
            const events = p.eventAbilities.split(/[,;]/);
            events.forEach((eName) => addHolder(eName, p, 'Event'));
        }
    });

    return map;
}
