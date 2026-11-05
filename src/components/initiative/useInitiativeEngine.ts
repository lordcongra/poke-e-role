import { useState, useMemo } from 'react';
import type { Combatant } from '@/utils/combat/initiativeHelpers';
import { useInitiativeLayout } from './useInitiativeLayout';
import { useInitiativeObrSync } from './useInitiativeObrSync';
import { useInitiativeTurnOps } from './useInitiativeTurnOps';

export function useInitiativeEngine() {
    const [combatants, setCombatants] = useState<Combatant[]>([]);
    const [activeTurnId, setActiveTurnId] = useState<string | null>(null);

    // 1. Layout, Theme & Viewport Hook
    const layoutOps = useInitiativeLayout();

    // 2. OBR / Local Persistence & Synchronization Hook
    const {
        isReady,
        isGM,
        availableChars,
        availableObrChars,
        fetchAvailableCharacters
    } = useInitiativeObrSync({
        combatants,
        setCombatants,
        activeTurnId,
        setActiveTurnId,
        setLayout: layoutOps.setLayout,
        setShape: layoutOps.setShape,
        setMaxTrackerWidth: layoutOps.setMaxTrackerWidth,
        setMaxTrackerHeight: layoutOps.setMaxTrackerHeight,
        setViewportMaxWidth: layoutOps.setViewportMaxWidth,
        setTheme: layoutOps.setTheme,
        applyDynamicColors: layoutOps.applyDynamicColors
    });

    // 3. Turn Progression & Combatant Manipulation Hook
    const turnOps = useInitiativeTurnOps({
        combatants,
        setCombatants,
        activeTurnId,
        setActiveTurnId
    });

    // Dynamic Transformers:
    // 1. Process duplicate names and append stable #1, #2 based on internal ID order
    const displayCombatants = useMemo(() => {
        const nameGroups: Record<string, string[]> = {};

        combatants.forEach((c) => {
            if (!nameGroups[c.name]) nameGroups[c.name] = [];
            nameGroups[c.name].push(c.id);
        });

        Object.values(nameGroups).forEach((ids) => ids.sort());

        return combatants.map((c) => {
            const ids = nameGroups[c.name];
            if (ids && ids.length > 1) {
                const number = ids.indexOf(c.id) + 1;
                return { ...c, name: `${c.name} #${number}` };
            }
            return c;
        });
    }, [combatants]);

    // 2. Filter available Standalone characters to remove ones already in the list
    const filteredStandaloneChars = useMemo(() => {
        return availableChars.filter((char) => !combatants.some((c) => c.id === char.id));
    }, [availableChars, combatants]);

    return {
        combatants: displayCombatants,
        activeTurnId,
        isReady,
        isGM,
        layout: layoutOps.layout,
        shape: layoutOps.shape,
        maxTrackerWidth: layoutOps.maxTrackerWidth,
        maxTrackerHeight: layoutOps.maxTrackerHeight,
        viewportMaxWidth: layoutOps.viewportMaxWidth,
        availableChars: filteredStandaloneChars,
        availableObrChars,
        fetchAvailableCharacters,
        updateInit: turnOps.updateInit,
        removeInit: turnOps.removeInit,
        toggleVisibility: turnOps.toggleVisibility,
        nextTurn: turnOps.nextTurn,
        prevTurn: turnOps.prevTurn,
        handleRollAll: turnOps.handleRollAll,
        handleAddStandaloneCombatant: turnOps.handleAddStandaloneCombatant,
        handleAddObrCombatant: turnOps.handleAddObrCombatant,
        handleDrop: turnOps.handleDrop
    };
}
