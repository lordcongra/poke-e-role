import type {
    CustomForm,
    CustomPokemon,
    CustomMove,
    CustomItem,
    CustomStatus,
    CustomFieldEffect
} from '@/types/homebrewTypes';

export function findUniqueCopyName(
    existingNames: string[],
    baseName: string,
    startCounter: number = 1,
    caseInsensitive: boolean = false
): string {
    let copyName = `${baseName} (Copy)`;
    let counter = startCounter;
    const match = (n: string, target: string) =>
        caseInsensitive ? n.trim().toLowerCase() === target.trim().toLowerCase() : n === target;

    while (existingNames.some((n) => match(n, copyName))) {
        counter++;
        copyName = `${baseName} (Copy ${counter})`;
    }
    return copyName;
}

export function updateItemField<T extends { id: string }, K extends keyof T>(
    items: T[],
    id: string,
    field: K,
    value: T[K]
): T[] {
    return items.map((item) => (item.id === id ? { ...item, [field]: value } : item));
}

export function filterOutById<T extends { id: string }>(items: T[], id: string): T[] {
    return items.filter((item) => item.id !== id);
}

export function duplicateEntity<T extends { id: string }>(
    items: T[],
    id: string,
    getName: (item: T) => string,
    setNameAndId: (target: T, newName: string, newId: string) => T,
    startCounter: number = 1,
    caseInsensitive: boolean = false
): T[] | null {
    const target = items.find((i) => i.id === id);
    if (!target) return null;
    const copyName = findUniqueCopyName(items.map(getName), getName(target), startCounter, caseInsensitive);
    return [...items, setNameAndId(target, copyName, crypto.randomUUID())];
}

export function normalizeCustomForm(form: CustomForm): CustomForm {
    return {
        ...form,
        swapStatuses: form.swapStatuses ?? false,
        freshStatuses: form.freshStatuses ?? false,
        wipeStatuses: form.wipeStatuses ?? false,
        swapBuffs: form.swapBuffs ?? false,
        swapDebuffs: form.swapDebuffs ?? false,
        freshBuffs: form.freshBuffs ?? false,
        freshDebuffs: form.freshDebuffs ?? false,
        wipeBuffs: form.wipeBuffs ?? false,
        wipeDebuffs: form.wipeDebuffs ?? false,
        restoreHp: form.restoreHp ?? false,
        restoreWill: form.restoreWill ?? false,
        shareHighestHp: form.shareHighestHp ?? false,
        shareHighestWill: form.shareHighestWill ?? false,
        healHp: form.healHp ?? false,
        healWill: form.healWill ?? false,
        activationCostHp: form.activationCostHp ?? 0,
        activationCostWill: form.activationCostWill ?? 0,
        tempHp: form.tempHp ?? 0,
        tempWill: form.tempWill ?? 0,
        targetSpecies: form.targetSpecies ?? '',
        grantedMoves: Array.isArray(form.grantedMoves) ? form.grantedMoves : []
    };
}

export function mergeNamedEntityList<T extends { id: string }>(
    current: T[],
    incoming: T[],
    getName: (item: T) => string,
    transform?: (item: T) => T
): T[] {
    const result = [...current];
    incoming.forEach((item) => {
        const itemWithTransform = transform ? transform(item) : item;
        const name = getName(itemWithTransform).toLowerCase();
        const index = result.findIndex((existing) => getName(existing).toLowerCase() === name);
        if (index !== -1) {
            result[index] = { ...itemWithTransform, id: result[index].id };
        } else {
            result.push({ ...itemWithTransform, id: crypto.randomUUID() });
        }
    });
    return result;
}

export function createDefaultCustomPokemon(
    currentPokemon: CustomPokemon[],
    initialData?: Partial<CustomPokemon>
): CustomPokemon {
    let baseName = initialData?.Name || 'New Pokemon';
    if (!initialData?.Name) {
        const currentNames = currentPokemon.map((p) => p.Name.trim().toLowerCase());
        if (currentNames.includes(baseName.toLowerCase())) {
            let counter = 2;
            while (currentNames.includes(`new pokemon ${counter}`)) {
                counter++;
            }
            baseName = `New Pokemon ${counter}`;
        }
    }

    return {
        id: crypto.randomUUID(),
        Name: baseName,
        Type1: initialData?.Type1 || 'Normal',
        Type2: initialData?.Type2 || '',
        BaseHP: initialData?.BaseHP ?? 4,
        Strength: initialData?.Strength ?? 2,
        MaxStrength: initialData?.MaxStrength ?? 5,
        Dexterity: initialData?.Dexterity ?? 2,
        MaxDexterity: initialData?.MaxDexterity ?? 5,
        Vitality: initialData?.Vitality ?? 2,
        MaxVitality: initialData?.MaxVitality ?? 5,
        Special: initialData?.Special ?? 2,
        MaxSpecial: initialData?.MaxSpecial ?? 5,
        Insight: initialData?.Insight ?? 1,
        MaxInsight: initialData?.MaxInsight ?? 5,
        Ability1: initialData?.Ability1 || '',
        Ability2: initialData?.Ability2 || '',
        HiddenAbility: initialData?.HiddenAbility || '',
        EventAbilities: initialData?.EventAbilities || '',
        ExtraAbilities: initialData?.ExtraAbilities || [],
        Moves: initialData?.Moves || [],
        DexID: initialData?.DexID || '',
        DexCategory: initialData?.DexCategory || '',
        Height: initialData?.Height || '',
        Weight: initialData?.Weight || '',
        DexDescription: initialData?.DexDescription || '',
        RecommendedRank: initialData?.RecommendedRank || '',
        Legendary: initialData?.Legendary ?? false,
        Mythical: initialData?.Mythical ?? false,
        UltraBeast: initialData?.UltraBeast ?? false,
        Paradox: initialData?.Paradox ?? false,
        gmOnly: initialData?.gmOnly ?? false
    };
}

export function createDefaultCustomForm(
    template: boolean | 'mega' | 'aegislash' | 'stance' = false
): CustomForm {
    const isMega = template === true || template === 'mega';
    const isStance = template === 'aegislash' || template === 'stance';

    let name = 'New Form';
    let description = '';
    if (isMega) {
        name = 'New Mega Evolution';
        description = 'Backs up current stats, restores HP/Will, and clears statuses.';
    } else if (isStance) {
        name = 'Aegislash (Blade Form)';
        description =
            'Stance Change: choose Form at start of round. Sword Stance can only use Damaging Moves; Shield Stance can only use Support Moves. Keeps highest HP shared across forms.';
    }

    return {
        id: crypto.randomUUID(),
        name,
        description,
        swapBaseStats: isMega || isStance,
        swapStatLimits: isMega || isStance,
        swapStatRanks: isMega || isStance,
        swapSkills: isMega,
        swapMoves: isMega,
        swapTyping: isMega,
        swapAbilities: isMega,
        swapBuffs: false,
        swapDebuffs: false,
        freshBuffs: false,
        freshDebuffs: false,
        wipeBuffs: false,
        wipeDebuffs: false,
        swapStatuses: false,
        freshStatuses: isMega,
        wipeStatuses: false,
        restoreHp: isMega,
        restoreWill: isMega,
        shareHighestHp: isStance,
        shareHighestWill: isStance,
        healHp: isMega,
        healWill: isMega,
        activationCostHp: 0,
        activationCostWill: isMega ? 1 : 0,
        grantedMoves: [],
        tags: '',
        targetSpecies: isStance ? 'Aegislash (Blade Form)' : '',
        tempHp: 0,
        tempWill: 0,
        gmOnly: false
    };
}

export function createDefaultCustomMove(): CustomMove {
    return {
        id: crypto.randomUUID(),
        name: 'New Move',
        type: 'Normal',
        category: 'Physical',
        power: 2,
        acc1: 'dex',
        acc2: 'brawl',
        dmg1: 'str',
        desc: '',
        battlefieldCategory: 'none'
    };
}

export function createDefaultCustomItem(): CustomItem {
    return {
        id: crypto.randomUUID(),
        name: 'New Item',
        description: '',
        pocket: 'Custom',
        customGroup: 'Custom',
        category: 'Misc',
        subCategory: '',
        rarity: 'Uncommon'
    };
}

export function createDefaultCustomStatus(): CustomStatus {
    return {
        id: crypto.randomUUID(),
        name: 'New Status',
        shorthand: '',
        description: '',
        effects: '',
        recoveryAttr: 'none',
        recoverySkill: 'none',
        color: '#9C27B0',
        textColor: '#ffffff',
        gmOnly: false
    };
}

export function createDefaultCustomFieldEffect(initialData?: Partial<CustomFieldEffect>): CustomFieldEffect {
    return {
        id: crypto.randomUUID(),
        name: 'New Field Effect',
        category: 'weather',
        defaultRounds: 4,
        color: '#3B82F6',
        icon: 'CloudRain',
        tags: '',
        description: '',
        gmOnly: false,
        triggerMoves: [],
        conditionTag: '',
        ...initialData
    };
}
