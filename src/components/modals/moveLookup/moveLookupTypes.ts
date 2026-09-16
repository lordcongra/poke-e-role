import type { MoveLookupEntry } from '../../../utils/apiTypes';

export type MoveCategoryFilter = 'all' | 'Physical' | 'Special' | 'Status';

export interface MoveLookupFilters {
    name: string;
    type: string;
    category: MoveCategoryFilter;
    powers: string[]; // e.g. ['support', 'variable', '1', '2', ...]
}

export interface LearnedByPokemon {
    name: string;
    dexId: string;
    rank: string;
    isCustom?: boolean;
}

export interface MoveLookupCardProps {
    move: MoveLookupEntry;
    isExpanded: boolean;
    allTypeColors: Record<string, string>;
    learnedBy: LearnedByPokemon[];
    copiedDiscord: boolean;
    copiedLink: boolean;
    onToggleExpand: (name: string) => void;
    onCopyDiscord: (move: MoveLookupEntry) => void;
    onCopyCardLink: (name: string) => void;
    onBroadcast: (move: MoveLookupEntry) => void;
    onSelectPokemon?: (pokemonName: string) => void;
    onFilterPokemonByMove?: (moveName: string) => void;
    isLoadingLearnedBy?: boolean;
    onLoadLearnedBy?: () => void;
}
