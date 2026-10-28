export interface ItemEffectDefinition {
    healHp?: number;
    healWill?: number;
    cures?: string[];
    permanentStatBoost?: {
        stat: string;
        value: number;
    };
    statBuff?: { stat: string; value: number };
    statDebuff?: { stat: string; value: number };
    gainTempHp?: number;
    gainTempWill?: number;
    dungeonPassive?: string;
    inflictsStatus?: string[];
}

/**
 * Registry of base Pokérole items with their default usage effects.
 */
export const BASE_ITEM_EFFECTS: Record<string, ItemEffectDefinition> = {
    // Multi-unit potions & drinks: heal 1 HP per charge used
    Potion: { healHp: 1 },
    'Super Potion': { healHp: 1 },
    'Hyper Potion': { healHp: 1 },
    Remedy: { healHp: 1 },
    'Energy Root': { healHp: 1 },
    'Fresh Water': { healHp: 1 },
    'Soda Pop': { healHp: 1 },
    Lemonade: { healHp: 1 },
    'MooMoo Milk': { healHp: 1 },
    'Berry Juice': { healHp: 1 },

    // Flat heals
    'Sitrus Berry': { healHp: 3 },
    'Oran Berry': { healHp: 1 },
    Chocolate: { healHp: 1 },
    Honey: { healHp: 1 },

    // Full heals & revives
    'Max Potion': { healHp: 99 },
    'Full Restore': { healHp: 99, cures: ['All Status'] },
    'Revival Herb': { healHp: 99, cures: ['Fainted'] },
    'Max Revive': { healHp: 99, cures: ['Fainted'] },
    Revive: { healHp: 1, cures: ['Fainted'] },

    // Status cures
    'Burn Heal': { cures: ['Burn'] },
    Antidote: { cures: ['Poison'] },
    Awakening: { cures: ['Sleep'] },
    'Paralyze Heal': { cures: ['Paralysis'] },
    'Ice Heal': { cures: ['Frozen Solid'] },
    'Baked Goods': { cures: ['Sleep', 'Poison', 'Frozen Solid', 'Paralysis'] },
    'Full Heal': { cures: ['All Status'] },
    'Lum Berry': { cures: ['All Status'] },

    // Stat items & Rare Candy
    'Rare Candy': { permanentStatBoost: { stat: 'PlayerChoice', value: 1 } },
    Protein: { permanentStatBoost: { stat: 'Strength', value: 1 } },
    Iron: { statBuff: { stat: 'Defense', value: 1 } },
    Carbos: { permanentStatBoost: { stat: 'Dexterity', value: 1 } },
    Calcium: { permanentStatBoost: { stat: 'Special', value: 1 } },
    'HP Up': { permanentStatBoost: { stat: 'Vitality', value: 1 } }
};

/**
 * Looks up default item usage effects for a base item by name (case-insensitive).
 */
export function getBaseItemEffect(name: string): ItemEffectDefinition | undefined {
    if (!name) return undefined;
    const trimmed = name.trim().toLowerCase();
    for (const [key, val] of Object.entries(BASE_ITEM_EFFECTS)) {
        if (key.toLowerCase() === trimmed) {
            return val;
        }
    }
    return undefined;
}
