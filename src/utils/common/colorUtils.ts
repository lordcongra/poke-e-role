/**
 * Calculates the relative luminance of a given hex color.
 * Returns true if the color is considered bright/high-luminance.
 *
 * @param hexColor - The hex color string (e.g., "#FFCC00" or "#FC0")
 * @param threshold - The luminance breakpoint (default: 0.65)
 * @returns boolean indicating if the color is bright
 */
export const isColorTooBright = (hexColor: string, threshold: number = 0.65): boolean => {
    let hex = hexColor.replace('#', '');

    if (hex.length === 3) {
        hex = hex
            .split('')
            .map((char) => char + char)
            .join('');
    }

    if (hex.length !== 6) return false;

    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

    return luminance > threshold;
};

/**
 * Calculates the relative luminance of a given hex color and returns
 * a darkened thematic version if it is too bright to ensure white text is legible.
 *
 * @param hexColor - The hex color string (e.g., "#FFCC00" or "#FC0")
 * @param threshold - The luminance breakpoint (default: 0.65)
 * @param intensity - Float representing darkness intensity (default 0.20 for 20% darker)
 * @param forceDarken - Bypass luminance check and force darken (default false)
 * @returns A hex string for the theme background color
 */
export const getContrastColor = (
    hexColor: string,
    threshold: number = 0.65,
    intensity: number = 0.2,
    forceDarken: boolean = false
): string => {
    let hex = hexColor.replace('#', '');

    if (hex.length === 3) {
        hex = hex
            .split('')
            .map((char) => char + char)
            .join('');
    }

    if (hex.length !== 6) return hexColor;

    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

    // Trigger if forced OR if the color naturally breaks the luminance threshold
    if (forceDarken || luminance > threshold) {
        // Multiplier limits to prevent pitch black (e.g., intensity 0.2 means 80% color remains)
        const mult = Math.max(0, 1 - intensity);

        const darkR = Math.floor(r * mult)
            .toString(16)
            .padStart(2, '0');
        const darkG = Math.floor(g * mult)
            .toString(16)
            .padStart(2, '0');
        const darkB = Math.floor(b * mult)
            .toString(16)
            .padStart(2, '0');

        return `#${darkR}${darkG}${darkB}`;
    }

    return `#${hex}`;
};

import { TYPE_COLORS } from '../../data/constants';

export interface ThemeIdentity {
    type1?: string;
    type2?: string;
    themePrimaryOverride?: string;
    themeSecondaryOverride?: string;
}

/**
 * Synchronizes the Android PWA status bar / top bar color (<meta name="theme-color">)
 * with the active theme color, resolving CSS variables and falling back to the current
 * dynamic type color or default mode colors.
 *
 * @param color - The hex/CSS color string or CSS variable (e.g. "var(--dynamic-type-color)")
 */
export const updateThemeColorMeta = (color?: string | null): void => {
    if (typeof document === 'undefined') return;

    let targetColor = color ? color.trim() : '';

    // Strip / resolve var(...) if passed a CSS variable
    if (targetColor.startsWith('var(') && targetColor.endsWith(')')) {
        const inner = targetColor.slice(4, -1).trim();
        const [varName, ...fallbackParts] = inner.split(',');
        const cleanVar = varName.trim();
        const fallback = fallbackParts.join(',').trim();

        const resolved =
            (typeof window !== 'undefined'
                ? window.getComputedStyle(document.documentElement).getPropertyValue(cleanVar).trim() ||
                  window.getComputedStyle(document.body).getPropertyValue(cleanVar).trim()
                : '') ||
            document.documentElement.style.getPropertyValue(cleanVar).trim() ||
            document.body.style.getPropertyValue(cleanVar).trim();

        targetColor = resolved || fallback || '';
    }

    // Fall back to --dynamic-type-color or dark/light mode defaults
    if (!targetColor) {
        targetColor =
            document.documentElement.style.getPropertyValue('--dynamic-type-color').trim() ||
            document.body.style.getPropertyValue('--dynamic-type-color').trim();
    }

    if (!targetColor) {
        const isDarkMode =
            document.body.classList.contains('dark-mode') ||
            document.documentElement.getAttribute('data-theme') === 'dark' ||
            document.body.getAttribute('data-theme') === 'dark' ||
            (typeof localStorage !== 'undefined' && localStorage.getItem('pokerole-theme') !== 'light');

        targetColor = isDarkMode ? '#8b1c1c' : '#b92518';
    }

    try {
        let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
        if (!meta) {
            meta = document.createElement('meta');
            meta.setAttribute('name', 'theme-color');
            document.head.appendChild(meta);
        }
        meta.setAttribute('content', targetColor);
    } catch (e) {
        console.warn('[colorUtils] Failed to update theme-color meta tag:', e);
    }
};

export const applyDynamicThemeColors = (primary?: string | null, secondary?: string | null) => {
    if (primary && primary.trim()) {
        const p = primary.trim();
        document.body.style.setProperty('--dynamic-type-color', p);
        document.documentElement.style.setProperty('--dynamic-type-color', p);
    } else {
        document.body.style.removeProperty('--dynamic-type-color');
        document.documentElement.style.removeProperty('--dynamic-type-color');
    }

    if (secondary && secondary.trim()) {
        const s = secondary.trim();
        document.body.style.setProperty('--dynamic-secondary-color', s);
        document.documentElement.style.setProperty('--dynamic-secondary-color', s);
    } else {
        document.body.style.removeProperty('--dynamic-secondary-color');
        document.documentElement.style.removeProperty('--dynamic-secondary-color');
    }

    updateThemeColorMeta(primary);
};

export const resolveCharacterThemeColors = (
    identity: ThemeIdentity,
    roomCustomTypes?: Array<{ name: string; color: string }>
): { primary: string; secondary: string } => {
    let finalPrimary = '';
    let finalSecondary = '';

    if (identity.themePrimaryOverride && identity.themePrimaryOverride.trim()) {
        finalPrimary = identity.themePrimaryOverride.trim();
        finalSecondary = identity.themeSecondaryOverride ? identity.themeSecondaryOverride.trim() : '';
    } else {
        try {
            const globalP = localStorage.getItem('pkr_global_theme_primary');
            const globalS = localStorage.getItem('pkr_global_theme_secondary');
            if (globalP && globalP.trim()) {
                finalPrimary = globalP.trim();
                finalSecondary = globalS ? globalS.trim() : '';
            }
        } catch {
            // ignore
        }

        if (!finalPrimary && identity.type1 && identity.type1.trim()) {
            const rawType = identity.type1.trim();
            const titleType = rawType.charAt(0).toUpperCase() + rawType.slice(1).toLowerCase();

            let typeColor = TYPE_COLORS[rawType] || TYPE_COLORS[titleType] || '';
            if (!typeColor && roomCustomTypes) {
                const customType = roomCustomTypes.find((t) => t.name.toLowerCase().trim() === rawType.toLowerCase());
                if (customType && customType.color) typeColor = customType.color;
            }

            if (typeColor) {
                finalPrimary = typeColor;
                finalSecondary = '';
            }
        }

        // Fallback to unselected / default overview theme (from default screen theme picker)
        if (!finalPrimary) {
            try {
                const unselectedP = localStorage.getItem('pkr_unselected_theme_primary');
                const unselectedS = localStorage.getItem('pkr_unselected_theme_secondary');
                if (unselectedP && unselectedP.trim()) {
                    finalPrimary = unselectedP.trim();
                    finalSecondary = unselectedS ? unselectedS.trim() : '';
                }
            } catch {
                // ignore
            }
        }
    }

    if (!finalPrimary) {
        return { primary: '', secondary: '' };
    }

    try {
        const isHighContrast =
            document.body.hasAttribute('data-high-contrast') || localStorage.getItem('pkr_high_contrast') === 'true';
        const contrastPrimary = parseFloat(localStorage.getItem('pkr_contrast_primary') || '0.20');
        const contrastSecondary = parseFloat(localStorage.getItem('pkr_contrast_secondary') || '0.20');
        const contrastForceAll = localStorage.getItem('pkr_contrast_force') === 'true';
        const typesStr = localStorage.getItem('pkr_contrast_types');
        const contrastSpecificTypes: string[] = typesStr ? JSON.parse(typesStr) : [];

        const isForceDarkened =
            contrastForceAll || (identity.type1 ? contrastSpecificTypes.includes(identity.type1) : false);

        const accessiblePrimary = isHighContrast
            ? getContrastColor(finalPrimary, 0.65, contrastPrimary, isForceDarkened)
            : finalPrimary;

        const accessibleSecondary = finalSecondary
            ? isHighContrast
                ? getContrastColor(finalSecondary, 0.65, contrastSecondary, isForceDarkened)
                : finalSecondary
            : '';

        return {
            primary: accessiblePrimary,
            secondary: accessibleSecondary
        };
    } catch {
        return {
            primary: finalPrimary,
            secondary: finalSecondary
        };
    }
};
