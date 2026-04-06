import { fetchMoveData, fetchItemData } from './api';
import type { LocalIndexItem, LocalDatasetIndex, ItemApiResponse } from './apiTypes';
import type { CustomItem, CustomMove } from '../store/storeTypes';

export type PoolItem =
    | { type: 'homebrew'; bucket: string; data: CustomItem }
    | { type: 'tm'; bucket: string; data: LocalIndexItem }
    | { type: 'item'; bucket: string; data: LocalIndexItem };

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

export function getRarityFromWeight(weight: number): string {
    if (weight >= 100) return 'Common';
    if (weight >= 50) return 'Uncommon';
    if (weight >= 20) return 'Rare';
    if (weight >= 5) return 'Very Rare';
    return 'Legendary';
}

function getCustomMoveWeight(power: number, category: string): number {
    if (category === 'Status') return 50;
    if (power <= 1) return 100;
    if (power === 2) return 50;
    if (power === 3) return 20;
    if (power >= 4) return 5;
    return 20;
}

export function generateLootPool(
    index: LocalDatasetIndex,
    filters: Record<string, boolean>,
    rarityFilters: Record<string, boolean>,
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
                        itemsArr.forEach((i) => {
                            const rarityStr = getRarityFromWeight(i.weight ?? 50);
                            if (rarityFilters[rarityStr])
                                masterPool.push({ type: 'item', bucket: `Base_${pocket}`, data: i });
                        });
                    }
                }
            });
        });
    }

    const visibleCustomItems = roomCustomItems.filter((i) => !i.gmOnly);
    visibleCustomItems.forEach((custom) => {
        const cPocket = custom.pocket || 'Custom';
        const cCategory = custom.category || 'Misc';
        const cRarity = custom.rarity || 'Uncommon';
        if (filters[`custom_item_${cPocket}_${cCategory}`] && rarityFilters[cRarity]) {
            masterPool.push({ type: 'homebrew', bucket: `Custom_${cPocket}`, data: custom });
        }
    });

    const selectedPowers = new Set(tmPowers);

    const isMoveTypeValid = (type: string | undefined) => {
        if (tmTypes.length === 0 || tmTypes.includes('Any')) return true;
        return tmTypes.some((t) => t.toLowerCase() === type?.toLowerCase());
    };

    const processMoveArray = (arr: LocalIndexItem[], bucketName: string) => {
        if (!Array.isArray(arr)) return;
        arr.forEach((m) => {
            if (isMoveTypeValid(m.type)) {
                const rarityStr = getRarityFromWeight(m.weight ?? 20);
                if (rarityFilters[rarityStr]) masterPool.push({ type: 'tm', bucket: bucketName, data: m });
            }
        });
    };

    if (selectedPowers.has('support') && index.moves?.support) {
        processMoveArray(index.moves.support, 'Base_TMs');
    }

    [1, 2, 3].forEach((power) => {
        if (selectedPowers.has(String(power)) && index.moves?.basic?.[`power_${power}`]) {
            processMoveArray(index.moves.basic[`power_${power}`], 'Base_TMs');
        }
    });

    let includesHighPower = false;
    [4, 5, 6, 7, 8, 10].forEach((power) => {
        if (selectedPowers.has(String(power))) {
            includesHighPower = true;
            if (index.moves?.highPower?.[`power_${power}`]) {
                processMoveArray(index.moves.highPower[`power_${power}`], 'Base_TMs');
            }
        }
    });

    if (includesHighPower && index.moves?.highPower?.variable) {
        processMoveArray(index.moves.highPower.variable, 'Base_TMs');
    }

    const visibleCustomMoves = roomCustomMoves.filter((m) => !m.gmOnly);
    visibleCustomMoves.forEach((m) => {
        if (isMoveTypeValid(m.type)) {
            let shouldInclude = false;
            if (m.power === 0 && selectedPowers.has('support')) shouldInclude = true;
            if (m.power >= 1 && m.power <= 10 && selectedPowers.has(String(m.power))) shouldInclude = true;
            if (m.power > 10 && includesHighPower) shouldInclude = true;

            if (shouldInclude) {
                const weight = getCustomMoveWeight(m.power, m.category);
                const rarityStr = getRarityFromWeight(weight);
                if (rarityFilters[rarityStr]) {
                    masterPool.push({
                        type: 'tm',
                        bucket: 'Custom_TMs',
                        data: { name: m.name, path: '', type: m.type, weight }
                    });
                }
            }
        }
    });

    return masterPool;
}

export async function rollLootItem(
    pool: PoolItem[],
    ignoreWeighting: boolean
): Promise<{ name: string; description: string }> {
    if (pool.length === 0) {
        return { name: 'Error', description: 'No items in the pool.' };
    }

    // STAGE 1: Bucket the pool by Meta-Category to prevent massive sets from drowning out tiny sets
    const buckets: Record<string, PoolItem[]> = {};

    pool.forEach((item) => {
        if (!buckets[item.bucket]) {
            buckets[item.bucket] = [];
        }
        buckets[item.bucket].push(item);
    });

    // Remove empty buckets
    const activeBuckets = Object.values(buckets).filter((b) => b.length > 0);

    // Pick a bucket at random (e.g. 50/50 chance between Items and TMs if both are active)
    const selectedBucketIndex = Math.floor(Math.random() * activeBuckets.length);
    const selectedBucket = activeBuckets[selectedBucketIndex];

    // STAGE 2: Normal rarity-weighted roll INSIDE the chosen bucket
    let totalWeight = 0;

    const weightedPool = selectedBucket.map((item) => {
        let itemWeight = 1; // If ignored, everyone gets 1 ticket!

        if (!ignoreWeighting) {
            if (item.type === 'tm' || item.type === 'item') {
                itemWeight = item.data.weight ?? 50;
            } else if (item.type === 'homebrew') {
                const rarityStr = item.data.rarity || 'Uncommon';
                if (rarityStr === 'Common') itemWeight = 100;
                else if (rarityStr === 'Uncommon') itemWeight = 50;
                else if (rarityStr === 'Rare') itemWeight = 20;
                else if (rarityStr === 'Very Rare') itemWeight = 5;
                else itemWeight = 1;
            }
        }

        totalWeight += itemWeight;
        return { ...item, _computedWeight: itemWeight };
    });

    let randomTarget = Math.random() * totalWeight;
    let selectedRoll = weightedPool[0];

    for (const item of weightedPool) {
        randomTarget -= item._computedWeight;
        if (randomTarget <= 0) {
            selectedRoll = item;
            break;
        }
    }

    let finalItemName = '';
    let finalItemDescription = '';

    if (selectedRoll.type === 'homebrew') {
        finalItemName = selectedRoll.data.name;
        finalItemDescription = selectedRoll.data.description;
    } else if (selectedRoll.type === 'tm') {
        const moveData = await fetchMoveData(selectedRoll.data.name);
        if (moveData) {
            const accuracyText = [moveData.Accuracy1, moveData.Accuracy2].filter(Boolean).join(' + ');
            const damageText = moveData.Damage1 || 'None';
            const effectText = moveData.Effect ? `\n\nEffect: ${moveData.Effect}` : '';

            finalItemName = `TM: ${selectedRoll.data.name}`;
            finalItemDescription = `Teaches the move ${selectedRoll.data.name}.\n\nType: ${moveData.Type} | Cat: ${moveData.Category} | Power: ${moveData.Power}\nAcc: ${accuracyText || 'None'} | Dmg: ${damageText}${effectText}\n\n${moveData.Description}`;
        }
    } else if (selectedRoll.type === 'item') {
        const itemData = await fetchItemData(selectedRoll.data.name);
        finalItemName = formatPokeballName(selectedRoll.data.name);
        finalItemDescription = itemData ? formatItemDescription(itemData) : '';
    }

    return { name: finalItemName, description: finalItemDescription };
}
