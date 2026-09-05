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

import { TYPE_COLORS } from '../data/constants';

export interface ThemeIdentity {
    type1?: string;
    type2?: string;
    themePrimaryOverride?: string;
    themeSecondaryOverride?: string;
}

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
