/**
 * Pokéball presets and pure URL resolver.
 * Supports classic Pokéball SVGs alongside custom OBR library, Web URL, and local uploads.
 */

export interface PokeballPreset {
    id: string;
    name: string;
}

export const POKEBALL_PRESETS: PokeballPreset[] = [
    { id: 'poke', name: 'Poké Ball' },
    { id: 'great', name: 'Great Ball' },
    { id: 'ultra', name: 'Ultra Ball' },
    { id: 'master', name: 'Master Ball' },
    { id: 'safari', name: 'Safari Ball' },
    { id: 'premier', name: 'Premier Ball' },
    { id: 'repeat', name: 'Repeat Ball' },
    { id: 'timer', name: 'Timer Ball' },
    { id: 'nest', name: 'Nest Ball' },
    { id: 'net', name: 'Net Ball' },
    { id: 'dive', name: 'Dive Ball' },
    { id: 'luxury', name: 'Luxury Ball' },
    { id: 'heal', name: 'Heal Ball' },
    { id: 'dusk', name: 'Dusk Ball' },
    { id: 'quick', name: 'Quick Ball' },
    { id: 'cherish', name: 'Cherish Ball' }
];

export const DEFAULT_POKEBALL_ID = 'poke';

export function getBaseUrl(): string {
    return ((typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) || '/').replace(/\/$/, '');
}

/**
 * Resolves a ball identifier (preset ID like 'ultra', or custom URL/local-img key)
 * to a renderable URL.
 */
export function resolvePokeballUrl(ballIdOrUrl?: string): string {
    const baseUrl = getBaseUrl();
    const defaultUrl = `${baseUrl}/pokeballs/poke.svg`;

    if (!ballIdOrUrl || !ballIdOrUrl.trim()) {
        return defaultUrl;
    }

    const clean = ballIdOrUrl.trim();

    // Check custom URL prefixes
    if (
        clean.startsWith('http://') ||
        clean.startsWith('https://') ||
        clean.startsWith('local-img:') ||
        clean.startsWith('data:') ||
        clean.startsWith('blob:')
    ) {
        return clean;
    }

    // Check if it's already an absolute or relative path with slashes
    if (clean.includes('/')) {
        return clean;
    }

    // Match preset ID (with or without .svg)
    const normalized = clean.replace(/\.svg$/i, '').toLowerCase();
    const preset = POKEBALL_PRESETS.find((p) => p.id === normalized);
    if (preset) {
        return `${baseUrl}/pokeballs/${preset.id}.svg`;
    }

    return defaultUrl;
}
