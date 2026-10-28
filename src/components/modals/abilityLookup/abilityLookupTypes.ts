export interface AbilityItem {
    name: string;
    isCustom?: boolean;
    effect?: string;
    description?: string;
}

export interface AbilityFilterCriteria {
    query: string;
}

export interface AbilityPokemonHolder {
    name: string;
    dexId: string;
    slotLabel: string;
    isCustom?: boolean;
}

export interface AbilityLookupCardProps {
    ability: AbilityItem;
    isExpanded: boolean;
    pokemonHolders: AbilityPokemonHolder[];
    copiedDiscord: boolean;
    copiedLink: boolean;
    onToggleExpand: (abilityName: string) => void;
    onCopyDiscord: (ability: AbilityItem) => void;
    onCopyCardLink: (abilityName: string) => void;
    onBroadcast: (ability: AbilityItem) => void;
    onSelectPokemon?: (pokemonName: string) => void;
    onFilterPokemonByAbility?: (abilityName: string) => void;
}

export interface AbilityLookupFilterPanelProps {
    nameInput: string;
    setNameInput: (val: string) => void;
    appliedName: string;
    hasActiveFilters: boolean;
    availableAbilityNames: string[];
    copiedLookupLink: boolean;
    onApplySearch: (overrideName?: string) => void;
    onClearName: () => void;
    onResetFilters: () => void;
    onCopyLookupLink: () => void;
}

export interface AbilityLookupTabProps {
    initialAbilityName?: string;
    onSelectPokemon?: (pokemonName: string) => void;
    onFilterPokemonByAbility?: (abilityName: string) => void;
}
