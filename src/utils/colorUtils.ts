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
