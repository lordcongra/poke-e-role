// src/utils/colorUtils.ts

/**
 * Calculates the relative luminance of a given hex color and returns
 * a high-contrast text color for readability.
 *
 * Instead of returning stark black, it returns a deeply shaded
 * thematic version of the original color for better aesthetics.
 *
 * @param hexColor - The hex color string (e.g., "#FFCC00" or "#FC0")
 * @param threshold - The luminance breakpoint (default: 0.55)
 * @returns A hex string for the foreground text color
 */
export const getContrastColor = (hexColor: string, threshold: number = 0.55): string => {
    // 1. Strip the hash if present
    let hex = hexColor.replace('#', '');

    // 2. Expand shorthand hex (e.g., "03F" -> "0033FF")
    if (hex.length === 3) {
        hex = hex
            .split('')
            .map((char) => char + char)
            .join('');
    }

    // 3. Fallback to white text if the hex is invalid
    if (hex.length !== 6) {
        return '#ffffff';
    }

    // 4. Parse RGB values
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    // 5. Calculate relative luminance and normalize to a 0-1 scale
    const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

    // 6. Return high-contrast text color based on the threshold
    if (luminance > threshold) {
        // Blend 30% of the original color with a soft dark grey base
        // This ensures a rich, harmonious dark color instead of stark black.
        const darkR = Math.floor(r * 0.3 + 30)
            .toString(16)
            .padStart(2, '0');
        const darkG = Math.floor(g * 0.3 + 30)
            .toString(16)
            .padStart(2, '0');
        const darkB = Math.floor(b * 0.3 + 30)
            .toString(16)
            .padStart(2, '0');

        return `#${darkR}${darkG}${darkB}`;
    }

    // Otherwise, the background is dark enough to safely use white
    return '#ffffff';
};
