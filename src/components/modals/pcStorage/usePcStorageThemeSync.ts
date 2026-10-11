import { useEffect } from 'react';
import { updateThemeColorMeta } from '../../../utils/common/colorUtils';
import { TYPE_COLORS } from '../../../data/constants';
import type { PcPokemonSummary } from '../../../types/pcStorageTypes';

/**
 * Synchronizes the Android PWA status bar / top bar color with the active PC Storage box color
 * when no character sheet is open. When a character sheet inside PC storage is open, syncs to that
 * character's type color, and smoothly returns to the box color when the sheet is closed.
 */
export function usePcStorageThemeSync(
    boxThemeColor: string | undefined,
    activeSheetSummary: PcPokemonSummary | null
): void {
    useEffect(() => {
        if (activeSheetSummary) {
            const rawType = activeSheetSummary.type1 || '';
            const typeColor = TYPE_COLORS[rawType];
            updateThemeColorMeta(typeColor || boxThemeColor || '#3b82f6');
        } else {
            updateThemeColorMeta(boxThemeColor || '#3b82f6');
        }
        return () => {
            updateThemeColorMeta();
        };
    }, [boxThemeColor, activeSheetSummary]);
}
