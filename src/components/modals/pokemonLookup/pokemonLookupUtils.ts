import type { PokemonLookupEntry, PokemonApiResponse, AbilitySlotFilter, TypeMatchMode } from '../../../utils/apiTypes';
import type { CustomPokemon } from '../../../store/storeTypes';

export const LEARN_RANKS = ['Starter', 'Rookie', 'Standard', 'Advanced', 'Expert', 'Ace', 'Master'];
export const RANK_ORDER = ['Starter', 'Rookie', 'Standard', 'Advanced', 'Expert', 'Ace', 'Master', 'Champion', 'Other'];

export function groupMovesByRank(moves: [string, string][]): { rank: string; moves: string[] }[] {
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

export interface PokemonFilterCriteria {
    appliedName: string;
    type1: string;
    type2: string;
    typeMatchMode: TypeMatchMode;
    appliedAbility: string;
    abilitySlot: AbilitySlotFilter;
    appliedMove: string;
    moveRank: string;
    onlyStarters: boolean;
    onlyLegendary: boolean;
    hasActiveFilters: boolean;
}

export function filterPokemonLookup(
    lookupData: PokemonLookupEntry[],
    criteria: PokemonFilterCriteria
): PokemonLookupEntry[] {
    const {
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
    } = criteria;

    if (!lookupData.length || !hasActiveFilters) return [];

    const q = appliedName.toLowerCase();
    const ab = appliedAbility.toLowerCase();
    const mv = appliedMove.toLowerCase();

    return lookupData.filter((p) => {
        if (q) {
            const nameMatch = p.name.toLowerCase().includes(q);
            const dexMatch = p.dexId.toLowerCase().includes(q);
            if (!nameMatch && !dexMatch) return false;
        }

        if (type1 || type2) {
            const pTypes = [p.type1.toLowerCase(), p.type2.toLowerCase()].filter(Boolean);
            const t1 = type1.toLowerCase();
            const t2 = type2.toLowerCase();

            if (typeMatchMode === 'exact') {
                if (t1 && !pTypes.includes(t1)) return false;
                if (t2 && !pTypes.includes(t2)) return false;
                if (t1 && t2 && pTypes.length !== 2) return false;
            } else {
                if (t1 && t2) {
                    if (!pTypes.includes(t1) && !pTypes.includes(t2)) return false;
                } else if (t1 && !pTypes.includes(t1)) {
                    return false;
                } else if (t2 && !pTypes.includes(t2)) {
                    return false;
                }
            }
        }

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
            if (!p.hiddenAbility) return false;
        }

        if (mv || moveRank) {
            const hasMoveMatch = p.moves.some(([mName, mRank]) => {
                const nameMatches = !mv || mName.toLowerCase().includes(mv);
                const rankMatches = !moveRank || mRank.toLowerCase() === moveRank.toLowerCase();
                return nameMatches && rankMatches;
            });
            if (!hasMoveMatch) return false;
        }

        if (onlyStarters && !p.starter) return false;
        if (onlyLegendary && !p.legendary) return false;

        return true;
    });
}

export function buildPokemonDiscordMarkdown(
    pokemon: PokemonLookupEntry,
    fullData?: PokemonApiResponse | CustomPokemon,
    appliedMove?: string,
    moveRank?: string
): string {
    const typesStr = pokemon.type2 ? `${pokemon.type1} / ${pokemon.type2}` : pokemon.type1;
    const standardAbilities = [pokemon.ability1, pokemon.ability2].filter(Boolean).join(', ') || 'None';
    const haText = pokemon.hiddenAbility ? `\n> **Hidden Ability (Homebrew):** ${pokemon.hiddenAbility}` : '';

    const statsStr = fullData
        ? `\n> **Base Stats:** HP: ${fullData.BaseHP ?? 0} | Str: ${fullData.Strength ?? 0} | Dex: ${fullData.Dexterity ?? 0} | Vit: ${fullData.Vitality ?? 0} | Spe: ${fullData.Special ?? 0} | Ins: ${fullData.Insight ?? 0}`
        : '';

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

    return `## 📖 **#${pokemon.dexId} ${pokemon.name}**
> **Type:** ${typesStr}
> **Abilities:** ${standardAbilities}${haText}${statsStr}${matchedMoveInfo}

**Move Learnset:**
${movesText || '• None'}`;
}

export function buildPokemonBroadcast(
    pokemon: PokemonLookupEntry,
    fullData?: PokemonApiResponse | CustomPokemon,
    appliedMove?: string,
    moveRank?: string
): { title: string; desc: string } {
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

    return {
        title: `📖 #${pokemon.dexId} ${pokemon.name}`,
        desc: `Type: ${typesStr} | Abilities: ${standardAbilities}${haText}${statsText}${extraMove}`
    };
}
