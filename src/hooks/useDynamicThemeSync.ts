import { useState, useEffect } from 'react';
import OBR from '@owlbear-rodeo/sdk';
import { useCharacterStore } from '../store/useCharacterStore';
import { getContrastColor, updateThemeColorMeta } from '../utils/common/colorUtils';

const STANDARD_TYPE_COLORS: Record<string, string> = {
    Normal: '#A8A878',
    Fire: '#F08030',
    Water: '#6890F0',
    Electric: '#F8D030',
    Grass: '#78C850',
    Ice: '#98D8D8',
    Fighting: '#C03028',
    Poison: '#A040A0',
    Ground: '#E0C068',
    Flying: '#A890F0',
    Psychic: '#F85888',
    Bug: '#A8B820',
    Rock: '#B8A038',
    Ghost: '#705898',
    Dragon: '#7038F8',
    Dark: '#705848',
    Steel: '#B8B8D0',
    Fairy: '#EE99AC',
    Stellar: '#4FB1D2'
};

/**
 * Orchestrates dynamic theme color resolution, contrast accessibility,
 * font/dyslexia scaling, popover sync, and Android PWA status bar meta updates.
 */
export function useDynamicThemeSync(): void {
    const activeTokenId = useCharacterStore((state) => state.tokenId);
    const type1 = useCharacterStore((state) => state.identity.type1);
    const roomCustomTypes = useCharacterStore((state) => state.roomCustomTypes || []);
    const themePrimaryOverride = useCharacterStore((state) => state.identity.themePrimaryOverride);
    const themeSecondaryOverride = useCharacterStore((state) => state.identity.themeSecondaryOverride);
    const isPcModalOpen = useCharacterStore((state) => state.isPcModalOpen);

    const [globalOverride, setGlobalOverride] = useState<{ p: string; s: string } | null>(null);
    const [unselectedOverride, setUnselectedOverride] = useState<{ p: string; s: string } | null>(null);
    const [themeUpdateCount, setThemeUpdateCount] = useState(0);

    // Accessibility States
    const [isHighContrast, setIsHighContrast] = useState<boolean>(() => {
        const saved = localStorage.getItem('pkr_high_contrast');
        return saved === null ? true : saved === 'true';
    });

    const [contrastPrimary, setContrastPrimary] = useState<number>(() => {
        const saved = localStorage.getItem('pkr_contrast_primary');
        return saved ? parseFloat(saved) : 0.2;
    });

    const [contrastSecondary, setContrastSecondary] = useState<number>(() => {
        const saved = localStorage.getItem('pkr_contrast_secondary');
        return saved ? parseFloat(saved) : 0.2;
    });

    const [contrastForceAll, setContrastForceAll] = useState<boolean>(() => {
        return localStorage.getItem('pkr_contrast_force') === 'true';
    });

    const [contrastSpecificTypes, setContrastSpecificTypes] = useState<string[]>(() => {
        const saved = localStorage.getItem('pkr_contrast_types');
        return saved ? JSON.parse(saved) : [];
    });

    const [fontScale, setFontScale] = useState<number>(() => {
        const saved = localStorage.getItem('pkr_font_scale');
        return saved ? parseInt(saved, 10) : 100;
    });

    const [dyslexiaFont, setDyslexiaFont] = useState<boolean>(() => {
        return localStorage.getItem('pkr_dyslexia') === 'true';
    });

    // Font Scaling & Dyslexia Application
    useEffect(() => {
        document.documentElement.style.fontSize = fontScale === 100 ? '' : `${fontScale}%`;

        if (dyslexiaFont) {
            document.body.classList.add('dyslexia-mode');
        } else {
            document.body.classList.remove('dyslexia-mode');
        }
    }, [fontScale, dyslexiaFont]);

    // Mutation observer & listeners for accessibility and mode changes
    useEffect(() => {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.attributeName === 'data-high-contrast') {
                    setIsHighContrast(document.body.hasAttribute('data-high-contrast'));
                } else if (mutation.attributeName === 'data-theme' || mutation.attributeName === 'class') {
                    setThemeUpdateCount((prev) => prev + 1);
                }
            });
        });
        observer.observe(document.body, { attributes: true });
        observer.observe(document.documentElement, { attributes: true });

        const handleAccessibilityUpdate = () => {
            setContrastPrimary(parseFloat(localStorage.getItem('pkr_contrast_primary') || '0.20'));
            setContrastSecondary(parseFloat(localStorage.getItem('pkr_contrast_secondary') || '0.20'));
            setContrastForceAll(localStorage.getItem('pkr_contrast_force') === 'true');
            setFontScale(parseInt(localStorage.getItem('pkr_font_scale') || '100', 10));
            setDyslexiaFont(localStorage.getItem('pkr_dyslexia') === 'true');

            const types = localStorage.getItem('pkr_contrast_types');
            setContrastSpecificTypes(types ? JSON.parse(types) : []);
        };
        window.addEventListener('accessibility-settings-updated', handleAccessibilityUpdate);

        return () => {
            observer.disconnect();
            window.removeEventListener('accessibility-settings-updated', handleAccessibilityUpdate);
        };
    }, []);

    // Global and unselected theme overrides
    useEffect(() => {
        const checkGlobalTheme = () => {
            try {
                const p = localStorage.getItem('pkr_global_theme_primary');
                const s = localStorage.getItem('pkr_global_theme_secondary');
                if (p) setGlobalOverride({ p, s: s || '' });
                else setGlobalOverride(null);

                const up = localStorage.getItem('pkr_unselected_theme_primary');
                const us = localStorage.getItem('pkr_unselected_theme_secondary');
                if (up) setUnselectedOverride({ p: up, s: us || '' });
                else setUnselectedOverride(null);
            } catch (e) {
                console.warn('[useDynamicThemeSync] Failed to access local storage for global theme.', e);
            }
            setThemeUpdateCount((prev) => prev + 1);
        };

        checkGlobalTheme();
        window.addEventListener('theme-override-updated', checkGlobalTheme);
        return () => window.removeEventListener('theme-override-updated', checkGlobalTheme);
    }, []);

    // Reactive Theme Computation & Application
    useEffect(() => {
        let finalPrimary = '';
        let finalSecondary = '';

        if (!activeTokenId) {
            if (globalOverride) {
                finalPrimary = globalOverride.p;
                finalSecondary = globalOverride.s || '';
            } else if (unselectedOverride) {
                finalPrimary = unselectedOverride.p;
                finalSecondary = unselectedOverride.s || '';
            }
        } else if (themePrimaryOverride) {
            finalPrimary = themePrimaryOverride;
            finalSecondary = themeSecondaryOverride || '';
        } else if (globalOverride) {
            finalPrimary = globalOverride.p;
            finalSecondary = globalOverride.s || '';
        } else if (type1) {
            let typeColor = '';
            if (STANDARD_TYPE_COLORS[type1]) {
                typeColor = STANDARD_TYPE_COLORS[type1];
            } else {
                const customType = roomCustomTypes.find((t) => t.name === type1);
                if (customType && customType.color) typeColor = customType.color;
            }

            if (typeColor) {
                finalPrimary = typeColor;
                finalSecondary = '';
            }
        } else if (unselectedOverride) {
            finalPrimary = unselectedOverride.p;
            finalSecondary = unselectedOverride.s || '';
        }

        // Apply final resolved theme to DOM
        let accessiblePrimary = '';
        let accessibleSecondary = '';

        if (finalPrimary) {
            const isForceDarkened = contrastForceAll || (type1 ? contrastSpecificTypes.includes(type1) : false);

            accessiblePrimary = isHighContrast
                ? getContrastColor(finalPrimary, 0.65, contrastPrimary, isForceDarkened)
                : finalPrimary;

            document.body.style.setProperty('--dynamic-type-color', accessiblePrimary);
            document.documentElement.style.setProperty('--dynamic-type-color', accessiblePrimary);
        } else {
            document.body.style.removeProperty('--dynamic-type-color');
            document.documentElement.style.removeProperty('--dynamic-type-color');
        }

        if (finalSecondary) {
            const isForceDarkened = contrastForceAll || (type1 ? contrastSpecificTypes.includes(type1) : false);

            accessibleSecondary = isHighContrast
                ? getContrastColor(finalSecondary, 0.65, contrastSecondary, isForceDarkened)
                : finalSecondary;

            document.body.style.setProperty('--dynamic-secondary-color', accessibleSecondary);
            document.documentElement.style.setProperty('--dynamic-secondary-color', accessibleSecondary);
        } else {
            document.body.style.removeProperty('--dynamic-secondary-color');
            document.documentElement.style.removeProperty('--dynamic-secondary-color');
        }

        // Synchronize Android PWA top bar meta tag (unless PC storage modal has active theme precedence)
        if (!isPcModalOpen && !document.body.classList.contains('pc-modal-open')) {
            updateThemeColorMeta(accessiblePrimary || finalPrimary);
        }

        // Always persist the active sheet's theme colors for pop-out windows and cross-tab sync
        try {
            localStorage.setItem(
                'pkr_sheet_theme_colors',
                JSON.stringify({
                    primary: accessiblePrimary || finalPrimary || '',
                    secondary: accessibleSecondary || finalSecondary || ''
                })
            );
        } catch (e) {
            console.warn('[useDynamicThemeSync] Failed to cache sheet theme colors:', e);
        }

        // Broadcast / persist popover theme colors if sync is enabled
        try {
            const isSyncPopovers = localStorage.getItem('pkr_sync_popover_theme') === 'true';
            const themePayload = {
                enabled: isSyncPopovers,
                primary: isSyncPopovers ? accessiblePrimary || finalPrimary : '',
                secondary: isSyncPopovers ? accessibleSecondary || finalSecondary : ''
            };
            localStorage.setItem('pkr_active_theme_colors', JSON.stringify(themePayload));

            if (OBR.isAvailable) {
                OBR.broadcast.sendMessage('pokerole-pmd-extension/popover-theme-sync', themePayload, {
                    destination: 'LOCAL'
                });
            }
        } catch (err) {
            console.warn('[useDynamicThemeSync] Failed to sync popover theme colors', err);
        }
    }, [
        activeTokenId,
        isPcModalOpen,
        unselectedOverride,
        type1,
        roomCustomTypes,
        themePrimaryOverride,
        themeSecondaryOverride,
        globalOverride,
        themeUpdateCount,
        isHighContrast,
        contrastPrimary,
        contrastSecondary,
        contrastForceAll,
        contrastSpecificTypes
    ]);
}
