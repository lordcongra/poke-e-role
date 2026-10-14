export type TagTargetType =
    | 'ability'
    | 'item'
    | 'move'
    | 'homebrew_ability'
    | 'homebrew_move'
    | 'homebrew_item'
    | 'homebrew_form'
    | 'homebrew_status'
    | 'homebrew_field_effect'
    | 'passive';

export interface TagBuilderModalProps {
    targetId: string;
    targetType: TagTargetType;
    initialTag?: string;
    onClose: () => void;
}

export type TagCategory =
    | 'stat'
    | 'skill'
    | 'combat'
    | 'matchup'
    | 'mechanic'
    | 'turn_based'
    | 'status'
    | 'move_mechanics'
    | 'battlefield';

export type RequirementGroup = 'none' | 'type' | 'category' | 'modifier' | 'misc';

export interface TagBuilderConfig {
    category: TagCategory | string;
    target: string;
    value: number;
    value2: number;
    reqGroup: RequirementGroup;
    typeOption: string;
    condition: string;
    customMaxStacks: number;
}

export interface PresetConfig {
    category: TagCategory | string;
    target: string;
    value: number;
    value2?: number;
    reqGroup: RequirementGroup;
    typeOption: string;
    condition: string;
    customMaxStacks?: number;
}
