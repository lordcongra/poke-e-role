import { isImage, type Item } from '@owlbear-rodeo/sdk';
import { METADATA_ID } from '../sync/obr';

export function calculateFormationOffsets(count: number, spacing: number): Array<{ dx: number; dy: number }> {
    switch (count) {
        case 1:
            return [{ dx: spacing, dy: 0 }];
        case 2:
            return [
                { dx: -spacing, dy: 0 },
                { dx: spacing, dy: 0 }
            ];
        case 3:
            return [
                { dx: -spacing, dy: spacing },
                { dx: 0, dy: spacing },
                { dx: spacing, dy: spacing }
            ];
        case 4:
            return [
                { dx: -spacing, dy: spacing },
                { dx: spacing, dy: spacing },
                { dx: -spacing, dy: spacing * 2 },
                { dx: spacing, dy: spacing * 2 }
            ];
        case 5:
            return [
                { dx: -spacing, dy: spacing },
                { dx: 0, dy: spacing },
                { dx: spacing, dy: spacing },
                { dx: -spacing * 0.75, dy: spacing * 2 },
                { dx: spacing * 0.75, dy: spacing * 2 }
            ];
        case 6:
            return [
                { dx: -spacing, dy: spacing },
                { dx: 0, dy: spacing },
                { dx: spacing, dy: spacing },
                { dx: -spacing, dy: spacing * 2 },
                { dx: 0, dy: spacing * 2 },
                { dx: spacing, dy: spacing * 2 }
            ];
        default:
            return [];
    }
}

export function getAbsolutePokeballUrl(): string {
    const base = (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) || '/';
    const cleanBase = base.endsWith('/') ? base : `${base}/`;
    const relative = `${cleanBase}pokeball-token.svg`;
    try {
        return new URL(relative, window.location.href).href;
    } catch {
        return relative;
    }
}

export function sanitizeImageUrl(url?: string | null): string {
    if (!url || typeof url !== 'string') return getAbsolutePokeballUrl();
    const trimmed = url.trim();
    if (trimmed.startsWith('file:') || trimmed.startsWith('file:///')) {
        return getAbsolutePokeballUrl();
    }
    return trimmed;
}

export function findMatchingSceneImage(
    targetName: string,
    sceneItems: Item[]
): { url: string; width: number; height: number } | null {
    if (!targetName) return null;
    const cleanTarget = targetName.trim().toLowerCase();

    for (const item of sceneItems) {
        if (!isImage(item)) continue;
        const image = item.image;
        if (!image?.url || image.url.includes('pokeball')) continue;

        const itemName = (item.name || '').trim().toLowerCase();
        const meta = (item.metadata[METADATA_ID] as Record<string, unknown> | undefined) || {};
        const metaSpecies = ((meta.species as string) || '').trim().toLowerCase();
        const metaNickname = ((meta.nickname as string) || '').trim().toLowerCase();

        const matches =
            itemName === cleanTarget ||
            metaSpecies === cleanTarget ||
            metaNickname === cleanTarget ||
            itemName.startsWith(`${cleanTarget} `) ||
            itemName.startsWith(`${cleanTarget}-`) ||
            itemName.startsWith(`${cleanTarget} (`) ||
            metaSpecies.startsWith(`${cleanTarget} `) ||
            metaNickname.startsWith(`${cleanTarget} `);

        if (matches) {
            return {
                url: image.url,
                width: image.width || 300,
                height: image.height || 300
            };
        }
    }
    return null;
}

export async function resolveImageDimensions(url: string): Promise<{ width: number; height: number }> {
    if (url && url.includes('pokeball')) {
        return { width: 300, height: 300 };
    }
    return new Promise((resolve) => {
        const img = new window.Image();
        img.onload = () => resolve({ width: img.naturalWidth || 300, height: img.naturalHeight || 300 });
        img.onerror = () => resolve({ width: 300, height: 300 });
        img.src = url;
    });
}

