import { useState } from 'react';
import { isStandaloneMode } from '@/utils/sync/storageAdapter';
import { useCharacterStore } from '@/store/useCharacterStore';
import { useInitiativeThemeSync } from './useInitiativeThemeSync';

export type InitiativeLayoutMode = 'vertical' | 'horizontal';
export type InitiativeAvatarShape = 'circle' | 'square' | 'none';

export function useInitiativeLayout() {
    const storeIdentity = useCharacterStore((state) => state.identity);

    const [layout, setLayout] = useState<InitiativeLayoutMode>(() => {
        if (isStandaloneMode) return (storeIdentity?.initiativeTrackerLayout as InitiativeLayoutMode) || 'vertical';
        const params = new URLSearchParams(window.location.search);
        return params.get('layout') === 'horizontal' ? 'horizontal' : 'vertical';
    });

    const [theme, setTheme] = useState(() => {
        if (isStandaloneMode) return 'light';
        const params = new URLSearchParams(window.location.search);
        return params.get('theme') || 'light';
    });

    const [shape, setShape] = useState<InitiativeAvatarShape>(() => {
        if (isStandaloneMode) return (storeIdentity?.initiativeTrackerAvatarShape as InitiativeAvatarShape) || 'circle';
        const params = new URLSearchParams(window.location.search);
        const paramShape = params.get('shape');
        return paramShape === 'square' || paramShape === 'none' ? paramShape : 'circle';
    });

    const [maxTrackerWidth, setMaxTrackerWidth] = useState(() => {
        if (isStandaloneMode) return storeIdentity?.initiativeTrackerMaxWidth || 0;
        const params = new URLSearchParams(window.location.search);
        return parseInt(params.get('mw') || '0', 10);
    });

    const [maxTrackerHeight, setMaxTrackerHeight] = useState(() => {
        if (isStandaloneMode) return storeIdentity?.initiativeTrackerMaxHeight || 0;
        const params = new URLSearchParams(window.location.search);
        return parseInt(params.get('mh') || '0', 10);
    });

    const [viewportMaxWidth, setViewportMaxWidth] = useState(800);

    // Adjust standalone settings during render if storeIdentity changes
    const [prevIdentity, setPrevIdentity] = useState(storeIdentity);
    if (isStandaloneMode && prevIdentity !== storeIdentity) {
        setPrevIdentity(storeIdentity);
        if (storeIdentity?.initiativeTrackerLayout && storeIdentity.initiativeTrackerLayout !== layout) {
            setLayout(storeIdentity.initiativeTrackerLayout as InitiativeLayoutMode);
        }
        if (storeIdentity?.initiativeTrackerAvatarShape && storeIdentity.initiativeTrackerAvatarShape !== shape) {
            setShape(storeIdentity.initiativeTrackerAvatarShape as InitiativeAvatarShape);
        }
        if (
            storeIdentity?.initiativeTrackerMaxWidth !== undefined &&
            storeIdentity.initiativeTrackerMaxWidth !== maxTrackerWidth
        ) {
            setMaxTrackerWidth(storeIdentity.initiativeTrackerMaxWidth);
        }
        if (
            storeIdentity?.initiativeTrackerMaxHeight !== undefined &&
            storeIdentity.initiativeTrackerMaxHeight !== maxTrackerHeight
        ) {
            setMaxTrackerHeight(storeIdentity.initiativeTrackerMaxHeight);
        }
    }

    const { applyDynamicColors } = useInitiativeThemeSync({ theme, isStandalone: isStandaloneMode });

    return {
        layout,
        setLayout,
        theme,
        setTheme,
        shape,
        setShape,
        maxTrackerWidth,
        setMaxTrackerWidth,
        maxTrackerHeight,
        setMaxTrackerHeight,
        viewportMaxWidth,
        setViewportMaxWidth,
        applyDynamicColors
    };
}

