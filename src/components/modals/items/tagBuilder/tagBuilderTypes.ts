export type TagTargetType =
    | 'ability'
    | 'item'
    | 'move'
    | 'homebrew_ability'
    | 'homebrew_move'
    | 'homebrew_item'
    | 'homebrew_form'
    | 'homebrew_status';

export interface TagBuilderModalProps {
    targetId: string;
    targetType: TagTargetType;
    onClose: () => void;
}

export type RequirementGroup = 'none' | 'type' | 'category' | 'modifier' | 'misc';

export interface TagBuilderConfig {
    category: string;
    target: string;
    value: number;
    value2: number;
    reqGroup: RequirementGroup;
    typeOption: string;
    condition: string;
    customMaxStacks: number;
}

export interface PresetConfig {
    category: string;
    target: string;
    value: number;
    value2?: number;
    reqGroup: RequirementGroup;
    typeOption: string;
    condition: string;
    customMaxStacks?: number;
}
