import { useCharacterStore } from '../../../../store/useCharacterStore';
import type { TagTargetType } from './tagBuilderTypes';

export function useTagBuilderTarget(targetId: string, targetType: TagTargetType) {
    const setIdentity = useCharacterStore((state) => state.setIdentity);
    const identityAbility = useCharacterStore((state) => state.identity.ability);
    const identityAbilityTags = useCharacterStore((state) => state.identity.abilityTags);
    const updateInventoryItem = useCharacterStore((state) => state.updateInventoryItem);
    const updateMove = useCharacterStore((state) => state.updateMove);
    const updateCustomAbility = useCharacterStore((state) => state.updateCustomAbility);
    const updateCustomMove = useCharacterStore((state) => state.updateCustomMove);
    const updateCustomItem = useCharacterStore((state) => state.updateCustomItem);
    const updateCustomForm = useCharacterStore((state) => state.updateCustomForm);
    const updateCustomStatus = useCharacterStore((state) => state.updateCustomStatus);
    const updatePassive = useCharacterStore((state) => state.updatePassive);

    const inventory = useCharacterStore((state) => state.inventory);
    const passives = useCharacterStore((state) => state.passives);
    const moves = useCharacterStore((state) => state.moves);
    const customAbilities = useCharacterStore((state) => state.roomCustomAbilities);
    const customMoves = useCharacterStore((state) => state.roomCustomMoves);
    const customItems = useCharacterStore((state) => state.roomCustomItems);
    const customForms = useCharacterStore((state) => state.roomCustomForms);
    const customStatuses = useCharacterStore((state) => state.roomCustomStatuses);

    let targetName = 'Target';
    let currentRawText = '';

    if (targetType === 'ability') {
        targetName = identityAbility || 'Ability';
        currentRawText = identityAbilityTags || '';
    } else if (targetType === 'move') {
        const move = moves.find((m) => m.id === targetId);
        targetName = move?.name || 'Move';
        currentRawText = move?.desc || '';
    } else if (targetType === 'item') {
        const item = inventory.find((i) => i.id === targetId);
        targetName = item?.name || 'Item';
        currentRawText = item?.desc || '';
    } else if (targetType === 'homebrew_ability') {
        const hbAbility = customAbilities.find((a) => a.id === targetId);
        targetName = hbAbility?.name || 'Custom Ability';
        currentRawText = hbAbility?.effect || '';
    } else if (targetType === 'homebrew_move') {
        const hbMove = customMoves.find((m) => m.id === targetId);
        targetName = hbMove?.name || 'Custom Move';
        currentRawText = hbMove?.desc || '';
    } else if (targetType === 'homebrew_item') {
        const hbItem = customItems.find((i) => i.id === targetId);
        targetName = hbItem?.name || 'Custom Item';
        currentRawText = hbItem?.description || '';
    } else if (targetType === 'homebrew_form') {
        const hbForm = customForms.find((f) => f.id === targetId);
        targetName = hbForm?.name || 'Custom Form';
        currentRawText = hbForm?.tags || '';
    } else if (targetType === 'homebrew_status') {
        const hbStatus = customStatuses.find((s) => s.id === targetId);
        targetName = hbStatus?.name || 'Custom Status';
        currentRawText = hbStatus?.effects || '';
    } else if (targetType === 'passive') {
        const passive = passives.find((p) => p.id === targetId);
        targetName = passive?.name || 'Passive';
        currentRawText = passive?.desc || '';
    }

    const saveUpdatedTags = (newRawText: string) => {
        if (targetType === 'ability') {
            setIdentity('abilityTags', newRawText);
        } else if (targetType === 'move') {
            updateMove(targetId, 'desc', newRawText);
        } else if (targetType === 'item') {
            updateInventoryItem(targetId, 'desc', newRawText);
        } else if (targetType === 'passive') {
            updatePassive(targetId, 'desc', newRawText);
        } else if (targetType === 'homebrew_ability') {
            updateCustomAbility(targetId, 'effect', newRawText);
        } else if (targetType === 'homebrew_move') {
            updateCustomMove(targetId, 'desc', newRawText);
        } else if (targetType === 'homebrew_item') {
            updateCustomItem(targetId, 'description', newRawText);
        } else if (targetType === 'homebrew_form') {
            updateCustomForm(targetId, 'tags', newRawText);
        } else if (targetType === 'homebrew_status') {
            updateCustomStatus(targetId, 'effects', newRawText);
        }
    };

    const existingTags = currentRawText.match(/\[[^\]]+\]/g) || [];

    const handleDeleteTag = (tagToDelete: string) => {
        const updated = currentRawText.replace(tagToDelete, '').replace(/\s+/g, ' ').trim();
        saveUpdatedTags(updated);
    };

    const handleAppendTag = (tagToAppend: string) => {
        if (!tagToAppend) return;
        const updated = currentRawText ? `${currentRawText} ${tagToAppend}`.trim() : tagToAppend;
        saveUpdatedTags(updated);
    };

    return {
        targetName,
        currentRawText,
        existingTags,
        handleDeleteTag,
        handleAppendTag
    };
}
