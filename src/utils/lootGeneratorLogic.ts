import { fetchMoveData, fetchItemData } from './api';
import type { LocalIndexItem, LocalDatasetIndex, ItemApiResponse } from './api';
import type { CustomItem, CustomMove } from '../store/storeTypes';

export type PoolItem =
    | { type: 'homebrew'; data: CustomItem }
    | { type: 'tm'; data: LocalIndexItem }
    | { type: 'item'; data: LocalIndexItem };

export const formatCamelCase = (text: string) => {
    if (text === 'ZCrystal') return 'Z-Crystal';
    if (text === 'EvolutionItem') return 'Evolution Items';
    if (text === 'TrainerItems') return 'Trainer Items';
    return text.replace(/([a-z])([A-Z])/g, '$1 $2');
};

export const formatPokeballName = (name: string) => {
    if (name.toLowerCase().endsWith('ball') && !name.toLowerCase().endsWith(' ball')) {
        const spaced = name.replace(/ball$/i, ' Ball');
        return spaced.charAt(0).toUpperCase() + spaced.slice(1);
    }
    return name;
};

export const formatItemDescription = (data: ItemApiResponse): string => {
    let extraInfo = '';

    if (data.HealthRestored) {
        extraInfo += `\n\nHealth Restored: ${data.HealthRestored}`;
    }
    if (data.Cures) {
        const curesList = Array.isArray(data.Cures) ? data.Cures.join(', ') : data.Cures;
        extraInfo += `\nCures: ${curesList}`;
    }
    if (data.Boost) {
        const boosts = data.Boost.trim()
            .split(/\s+/)
            .map((b) => formatCamelCase(b))
            .join(', ');
        const val = data.Value ? ` +${data.Value}` : '';
        extraInfo += `\nBoosts: ${boosts}${val}`;
    }
    if (data.ForPokemon) {
        const mons = data.ForPokemon.trim()
            .split(/\s+/)
            .map((p) =>
                p
                    .split('-')
                    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                    .join(' ')
            )
            .join(', ');
        extraInfo += `\nFor Pokémon: ${mons}`;
    }
    if (data.ForTypes) {
        extraInfo += `\nFor Types: ${data.ForTypes}`;
    }

    const baseDescription = data.Description || data.Effect || '';
    return extraInfo ? `${baseDescription}${extraInfo}` : baseDescription;
};

export function generateLootPool(
    index: LocalDatasetIndex,
    filters: Record<string, boolean>,
    tmPowers: string[],
    tmTypes: string[],
    roomCustomItems: CustomItem[],
    roomCustomMoves: CustomMove[]
): PoolItem[] {
    const masterPool: PoolItem[] = [];

    if (index.items) {
        Object.keys(index.items).forEach((pocket) => {
            if (pocket === 'TechnicalMachine') return;
            Object.keys(index.items[pocket]).forEach((category) => {
                if (filters[`base_item_${pocket}_${category}`]) {
                    const itemsArr = index.items[pocket][category];
                    if (Array.isArray(itemsArr)) {
                        itemsArr.forEach((i) => masterPool.push({ type: 'item', data: i }));
                    }
                }
            });
        });
    }

    const visibleCustomItems = roomCustomItems.filter((i) => !i.gmOnly);
    visibleCustomItems.forEach((custom) => {
        const cPocket = custom.pocket || 'Custom';
        const cCategory = custom.category || 'Misc';
        if (filters[`custom_item_${cPocket}_${cCategory}`]) {
            masterPool.push({ type: 'homebrew', data: custom });
        }
    });

    const selectedPowers = new Set(tmPowers);

    const isMoveTypeValid = (type: string | undefined) => {
        if (tmTypes.length === 0 || tmTypes.includes('Any')) return true;
        return tmTypes.some((t) => t.toLowerCase() === type?.toLowerCase());
    };

    const processMoveArray = (arr: LocalIndexItem[]) => {
        if (!Array.isArray(arr)) return;
        arr.forEach((m) => {
            if (isMoveTypeValid(m.type)) {
                masterPool.push({ type: 'tm', data: m });
            }
        });
    };

    if (selectedPowers.has('support') && index.moves?.support) {
        processMoveArray(index.moves.support);
    }

    [1, 2, 3].forEach((power) => {
        if (selectedPowers.has(String(power)) && index.moves?.basic?.[`power_${power}`]) {
            processMoveArray(index.moves.basic[`power_${power}`]);
        }
    });

    let includesHighPower = false;
    [4, 5, 6, 7, 8, 10].forEach((power) => {
        if (selectedPowers.has(String(power))) {
            includesHighPower = true;
            if (index.moves?.highPower?.[`power_${power}`]) {
                processMoveArray(index.moves.highPower[`power_${power}`]);
            }
        }
    });

    if (includesHighPower && index.moves?.highPower?.variable) {
        processMoveArray(index.moves.highPower.variable);
    }

    const visibleCustomMoves = roomCustomMoves.filter((m) => !m.gmOnly);
    visibleCustomMoves.forEach((m) => {
        if (isMoveTypeValid(m.type)) {
            let shouldInclude = false;
            if (m.power === 0 && selectedPowers.has('support')) shouldInclude = true;
            if (m.power >= 1 && m.power <= 10 && selectedPowers.has(String(m.power))) shouldInclude = true;
            if (m.power > 10 && includesHighPower) shouldInclude = true;

            if (shouldInclude) {
                masterPool.push({
                    type: 'tm',
                    data: { name: m.name, path: '', type: m.type }
                });
            }
        }
    });

    return masterPool;
}

export async function rollLootItem(pool: PoolItem[]): Promise<{ name: string; description: string }> {
    const roll = pool[Math.floor(Math.random() * pool.length)];

    let finalItemName = '';
    let finalItemDescription = '';

    if (roll.type === 'homebrew') {
        finalItemName = roll.data.name;
        finalItemDescription = roll.data.description;
    } else if (roll.type === 'tm') {
        const moveData = await fetchMoveData(roll.data.name);
        if (moveData) {
            const accuracyText = [moveData.Accuracy1, moveData.Accuracy2].filter(Boolean).join(' + ');
            const damageText = moveData.Damage1 || 'None';
            const effectText = moveData.Effect ? `\n\nEffect: ${moveData.Effect}` : '';

            finalItemName = `TM: ${roll.data.name}`;
            finalItemDescription = `Teaches the move ${roll.data.name}.\n\nType: ${moveData.Type} | Cat: ${moveData.Category} | Power: ${moveData.Power}\nAcc: ${accuracyText || 'None'} | Dmg: ${damageText}${effectText}\n\n${moveData.Description}`;
        }
    } else if (roll.type === 'item') {
        const itemData = await fetchItemData(roll.data.name);
        finalItemName = formatPokeballName(roll.data.name);
        finalItemDescription = itemData ? formatItemDescription(itemData) : '';
    }

    return { name: finalItemName, description: finalItemDescription };
}
