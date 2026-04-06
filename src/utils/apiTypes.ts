export interface LocalIndexItem {
    name: string;
    path: string;
    type?: string;
    pmd?: boolean;
    weight?: number;
}

export interface LocalDatasetIndex {
    moves: {
        support: LocalIndexItem[];
        variable: LocalIndexItem[];
        basic: Record<string, LocalIndexItem[]>;
        highPower: Record<string, LocalIndexItem[]>;
    };
    items: Record<string, Record<string, LocalIndexItem[]>>;
}

export interface GitHubFileNode {
    path: string;
}

export interface GitHubTreeResponse {
    tree: GitHubFileNode[];
}

export interface PokemonApiResponse {
    Name?: string;
    Type1?: string;
    Type2?: string;
    BaseStats?: { HP?: number };
    BaseHP?: number;
    Strength?: number | string;
    Dexterity?: number | string;
    Vitality?: number | string;
    Special?: number | string;
    Insight?: number | string;
    MaxAttributes?: Record<string, number | string>;
    MaxStats?: Record<string, number | string>;
    Ability1?: string;
    Ability2?: string;
    HiddenAbility?: string;
    EventAbilities?: string;
    Abilities?: string[] | { Name: string }[];
    Moves?:
        | Record<string, string[] | { Name?: string; Move?: string }[]>
        | { Learned?: string; Learn?: string; Level?: string; Rank?: string; Name?: string; Move?: string }[];
}

export interface MoveApiResponse {
    Name?: string;
    Type?: string;
    Category?: string;
    Power?: number | string;
    Accuracy1?: string;
    Accuracy2?: string;
    Damage1?: string;
    Effect?: string;
    Description?: string;
}

export interface AbilityApiResponse {
    Name?: string;
    Description?: string;
    Effect?: string;
}

export interface ItemApiResponse {
    Name?: string;
    Description?: string;
    Effect?: string;
    HealthRestored?: number;
    Cures?: string | string[];
    Boost?: string;
    Value?: number;
    ForPokemon?: string;
    ForTypes?: string;
}

export interface NatureApiResponse {
    Name?: string;
    Nature?: string;
    Confidence?: number;
    Keywords?: string;
    Description?: string;
}