import { useState } from 'react';
import { useCharacterStore } from '../../store/useCharacterStore';
import {
    getTrainerItemTargets,
    applyItemToPokemonTarget,
    type ItemTargetCandidate
} from '../../utils/items/itemTargeting';
import type { InventoryItem } from '../../store/storeTypes';

export function useInventoryItemUsage() {
    const useInventoryItem = useCharacterStore((state) => state.useInventoryItem);

    const [targetPrompt, setTargetPrompt] = useState<{
        item: InventoryItem;
        candidates: ItemTargetCandidate[];
    } | null>(null);

    const [statChoicePrompt, setStatChoicePrompt] = useState<{
        item: InventoryItem;
        target?: ItemTargetCandidate;
    } | null>(null);

    const handleUseItem = (item: InventoryItem) => {
        const store = useCharacterStore.getState();
        const candidates = getTrainerItemTargets(store, item);
        if (candidates.length > 1) {
            setTargetPrompt({ item, candidates });
        } else if (item.permanentStatBoost?.stat === 'PlayerChoice') {
            setStatChoicePrompt({ item });
        } else {
            useInventoryItem(item.id);
        }
    };

    const handleSelectTarget = async (target: ItemTargetCandidate) => {
        if (!targetPrompt) return;
        const { item } = targetPrompt;
        setTargetPrompt(null);
        if (item.permanentStatBoost?.stat === 'PlayerChoice') {
            setStatChoicePrompt({ item, target });
            return;
        }
        if (target.isTrainer) {
            useInventoryItem(item.id);
        } else {
            const store = useCharacterStore.getState();
            await applyItemToPokemonTarget(store, item, target);
        }
    };

    const handleConfirmStatChoice = async (
        chosenStat: 'Strength' | 'Dexterity' | 'Vitality' | 'Special' | 'Insight'
    ) => {
        if (!statChoicePrompt) return;
        const { item, target } = statChoicePrompt;
        setStatChoicePrompt(null);
        if (!target || target.isTrainer) {
            useInventoryItem(item.id, { chosenStat });
        } else {
            const store = useCharacterStore.getState();
            await applyItemToPokemonTarget(store, item, target, { chosenStat });
        }
    };

    return {
        targetPrompt,
        setTargetPrompt,
        statChoicePrompt,
        setStatChoicePrompt,
        handleUseItem,
        handleSelectTarget,
        handleConfirmStatChoice
    };
}
