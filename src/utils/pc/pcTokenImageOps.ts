import OBR, { buildImage, isImage, type Item } from '@owlbear-rodeo/sdk';
import { METADATA_ID } from '../sync/obr';
import { getAbsolutePokeballUrl, resolveImageDimensions } from '../generators/trainerTokenSpawner';
import { imageManager } from '../graphics/imageManager';
import { updateSceneItemImage } from '../graphics/tokenImageService';
import { useCharacterStore } from '../../store/useCharacterStore';
import type { PcPokemonSummary } from '../../types/pcStorageTypes';

export interface ResolvedTokenImage {
    url: string;
    mime: string;
    width: number;
    height: number;
}

/**
 * Converts a Blob to a base64 data URL string so it can be rendered by Owlbear Rodeo.
 */
function blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            if (typeof reader.result === 'string') {
                resolve(reader.result);
            } else {
                reject(new Error('Failed to convert blob to data URL'));
            }
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
    });
}

/**
 * Searches the active Owlbear Rodeo scene for an existing token with a matching species or name
 * to borrow its image artwork when local image files cannot be loaded.
 */
export function findMatchingScenePokemonImage(
    targetName: string,
    sceneItems: Item[]
): { url: string; width: number; height: number } | null {
    if (!targetName) return null;
    const cleanTarget = targetName.trim().toLowerCase();

    for (const item of sceneItems) {
        if (!isImage(item)) continue;
        const image = item.image;
        if (!image?.url || image.url.includes('pokeball') || image.url.startsWith('local-img:')) continue;

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

/**
 * Resolves a 100% valid, map-safe image URL and dimensions for spawning Pokémon to the canvas.
 * Seamlessly handles:
 * - Direct HTTP/HTTPS URLs
 * - Standalone IndexedDB images ('local-img:...') by converting them to portable base64 Data URLs
 * - Scene image borrowing for matching Pokémon species
 * - SVG Pokeball fallback
 */
export async function resolveTokenImageForMap(
    summary: PcPokemonSummary,
    sceneItems: Item[]
): Promise<ResolvedTokenImage> {
    const rawUrl = summary.tokenImageUrl;

    // 1. Direct Web / Data URLs
    if (rawUrl && (rawUrl.startsWith('http://') || rawUrl.startsWith('https://') || rawUrl.startsWith('data:image/'))) {
        const dims = await resolveImageDimensions(rawUrl);
        return {
            url: rawUrl,
            mime: rawUrl.endsWith('.svg') ? 'image/svg+xml' : 'image/png',
            width: dims.width,
            height: dims.height
        };
    }

    // 2. Standalone IndexedDB References ('local-img:...')
    if (rawUrl && rawUrl.startsWith('local-img:')) {
        try {
            const blobUrl = await imageManager.getImageUrl(rawUrl);
            if (blobUrl) {
                const response = await fetch(blobUrl);
                const blob = await response.blob();
                URL.revokeObjectURL(blobUrl);
                const dataUrl = await blobToDataUrl(blob);
                const dims = await resolveImageDimensions(dataUrl);
                return {
                    url: dataUrl,
                    mime: blob.type || 'image/png',
                    width: dims.width,
                    height: dims.height
                };
            }
        } catch (e) {
            console.warn('[pcTokenImageOps] Failed to convert local-img to data URL:', e);
        }
    }

    // 3. Match from existing scene items
    const searchName = summary.species || summary.name;
    const sceneMatch = findMatchingScenePokemonImage(searchName, sceneItems);
    if (sceneMatch) {
        return {
            url: sceneMatch.url,
            mime: sceneMatch.url.endsWith('.svg') ? 'image/svg+xml' : 'image/png',
            width: sceneMatch.width,
            height: sceneMatch.height
        };
    }

    // 4. Default Pokeball Fallback
    const fallbackUrl = getAbsolutePokeballUrl();
    const dims = await resolveImageDimensions(fallbackUrl);
    return {
        url: fallbackUrl,
        mime: fallbackUrl.endsWith('.svg') ? 'image/svg+xml' : 'image/png',
        width: dims.width,
        height: dims.height
    };
}

/**
 * Relinks or updates artwork for a stored or active Pokémon.
 * Synchronizes:
 * - Summary `tokenImageUrl` and `fullMetadata['token-image-url']`
 * - `savedTokenItem` image, mime, dimensions, grid dpi/offset, and metadata
 * - Live scene token (if currently on map or present in scene items) via `updateSceneItemImage` & `renderTokenGraphics`
 * - Active character sheet store (`useCharacterStore`) if matching
 * - Standalone localStorage (if standalone)
 */
export async function relinkPokemonArtworkOps(
    summary: PcPokemonSummary,
    overrideUrl?: string,
    overrideDimensions?: { width: number; height: number }
): Promise<PcPokemonSummary | null> {
    let selectedUrl = overrideUrl || '';
    let selectedWidth = overrideDimensions?.width || 0;
    let selectedHeight = overrideDimensions?.height || 0;

    if (!selectedUrl) {
        if (OBR.isAvailable && typeof OBR.assets?.downloadImages === 'function') {
            try {
                const images = await OBR.assets.downloadImages(false);
                if (images && images.length > 0) {
                    const img = images[0];
                    selectedUrl = img.image?.url || '';
                    selectedWidth = img.image?.width || 0;
                    selectedHeight = img.image?.height || 0;
                }
            } catch (e) {
                console.error('[pcTokenImageOps] Failed to download images from OBR:', e);
            }
        }

        if (!selectedUrl) {
            const manual = window.prompt('Enter an Image URL:');
            if (manual && manual.trim()) {
                selectedUrl = manual.trim();
            }
        }
    }

    if (!selectedUrl) {
        return null;
    }

    if (!selectedWidth || !selectedHeight) {
        try {
            const dims = await resolveImageDimensions(selectedUrl);
            selectedWidth = dims.width;
            selectedHeight = dims.height;
        } catch {
            selectedWidth = 300;
            selectedHeight = 300;
        }
    }

    const mime = selectedUrl.endsWith('.svg')
        ? 'image/svg+xml'
        : selectedUrl.startsWith('data:image/')
          ? selectedUrl.split(';')[0].replace('data:', '')
          : 'image/png';

    const maxDim = Math.max(selectedWidth, selectedHeight);

    // 1. Update or create savedTokenItem
    let updatedSavedTokenItem = summary.savedTokenItem
        ? (JSON.parse(JSON.stringify(summary.savedTokenItem)) as Item)
        : undefined;

    if (updatedSavedTokenItem && isImage(updatedSavedTokenItem)) {
        updatedSavedTokenItem.image = {
            url: selectedUrl,
            mime,
            width: selectedWidth,
            height: selectedHeight
        };
        if (updatedSavedTokenItem.grid) {
            updatedSavedTokenItem.grid.dpi = maxDim;
            updatedSavedTokenItem.grid.offset = {
                x: selectedWidth / 2,
                y: selectedHeight / 2
            };
        }
        if (updatedSavedTokenItem.metadata) {
            const existingMeta = (updatedSavedTokenItem.metadata[METADATA_ID] as Record<string, unknown>) || {};
            const statsMeta =
                (updatedSavedTokenItem.metadata['pokerole-pmd-extension/stats'] as Record<string, unknown>) || {};
            const cleanMeta: Record<string, unknown> = {
                ...existingMeta,
                'token-image-url': selectedUrl
            };
            delete cleanMeta['is-backup-token'];
            delete cleanMeta['pokerole-pmd-extension/is-backup-token'];
            delete updatedSavedTokenItem.metadata['pokerole-pmd-extension/is-backup-token'];
            delete updatedSavedTokenItem.metadata['is-backup-token'];

            updatedSavedTokenItem.metadata[METADATA_ID] = cleanMeta;
            const cleanStatsMeta: Record<string, unknown> = {
                ...statsMeta,
                'token-image-url': selectedUrl
            };
            delete cleanStatsMeta['is-backup-token'];
            delete cleanStatsMeta['pokerole-pmd-extension/is-backup-token'];
            updatedSavedTokenItem.metadata['pokerole-pmd-extension/stats'] = cleanStatsMeta;
        }
    } else {
        const entityId = summary.entityId || crypto.randomUUID();
        const explicitNick =
            (summary.fullMetadata?.nickname as string) ?? (summary.fullMetadata?.['nickname'] as string);
        const nickToSet =
            explicitNick !== undefined
                ? explicitNick
                : summary.name && summary.species && summary.name !== summary.species
                  ? summary.name
                  : '';

        const metaObj: Record<string, unknown> = {
            ...(summary.fullMetadata || {}),
            entityId,
            name: summary.name || summary.species,
            nickname: nickToSet,
            species: summary.species || summary.name,
            type1: summary.type1 || 'Normal',
            type2: summary.type2,
            'hp-curr': summary.hp,
            'hp-max-display': summary.maxHp,
            'will-curr': summary.will,
            'will-max-display': summary.maxWill,
            rank: summary.rank || 'Starter',
            'token-image-url': selectedUrl,
            lastModified: summary.lastModified || Date.now()
        };
        delete metaObj['is-backup-token'];
        delete metaObj['pokerole-pmd-extension/is-backup-token'];

        const pokeImageContent = {
            url: selectedUrl,
            mime,
            width: selectedWidth,
            height: selectedHeight
        };
        const pokeGrid = {
            dpi: maxDim,
            offset: { x: selectedWidth / 2, y: selectedHeight / 2 }
        };

        updatedSavedTokenItem = buildImage(pokeImageContent, pokeGrid)
            .name(summary.name || summary.species || 'Pokémon')
            .position({ x: 0, y: 0 })
            .layer('CHARACTER')
            .metadata({
                [METADATA_ID]: metaObj,
                'pokerole-pmd-extension/stats': metaObj
            })
            .build();
    }

    // 2. Update fullMetadata
    const updatedFullMetadata: Record<string, unknown> = {
        ...(summary.fullMetadata || {}),
        'token-image-url': selectedUrl
    };
    delete updatedFullMetadata['is-backup-token'];
    delete updatedFullMetadata['pokerole-pmd-extension/is-backup-token'];

    // 3. Update active scene item if present on the map
    let targetTokenId = summary.mapTokenId;
    let isOnMap = !!summary.isOnMap;

    if (OBR.isAvailable) {
        try {
            const sceneItems = await OBR.scene.items.getItems();
            let liveItem: Item | undefined;

            if (targetTokenId) {
                liveItem = sceneItems.find((it) => it.id === targetTokenId);
            }

            if (!liveItem && summary.entityId) {
                liveItem = sceneItems.find((it) => {
                    if (it.layer !== 'CHARACTER') return false;
                    const meta = (it.metadata?.[METADATA_ID] as Record<string, unknown>) || {};
                    const claimMeta = it.metadata?.['pokerole-pmd-extension/claimed-by'] as
                        | { entityId?: string }
                        | undefined;
                    return meta.entityId === summary.entityId || claimMeta?.entityId === summary.entityId;
                });
                if (liveItem) {
                    targetTokenId = liveItem.id;
                }
            }

            if (liveItem) {
                isOnMap = true;
                await updateSceneItemImage(liveItem.id, selectedUrl, selectedWidth, selectedHeight);
            }
        } catch (e) {
            console.error('[pcTokenImageOps] Failed to sync relinked image to scene item:', e);
        }
    }

    // 4. Update active character store if sheet is currently loaded for this Pokémon
    try {
        const store = useCharacterStore.getState();
        const isCurrentToken =
            (targetTokenId && store.tokenId === targetTokenId) ||
            (summary.savedTokenItem?.id && store.tokenId === summary.savedTokenItem.id) ||
            (summary.entityId && store.tokenId === summary.entityId);

        if (isCurrentToken) {
            store.setIdentity('tokenImageUrl', selectedUrl);
        }
    } catch (e) {
        console.warn('[pcTokenImageOps] Failed to sync to character store:', e);
    }

    // 5. Update standalone localStorage if exists
    if (typeof window !== 'undefined' && window.localStorage && summary.entityId) {
        try {
            const key = `pkr_char_${summary.entityId}`;
            const raw = localStorage.getItem(key);
            if (raw) {
                const parsed = JSON.parse(raw);
                parsed.tokenImageUrl = selectedUrl;
                parsed['token-image-url'] = selectedUrl;
                localStorage.setItem(key, JSON.stringify(parsed));
            }
        } catch (e) {
            console.warn('[pcTokenImageOps] Failed to sync to localStorage:', e);
        }
    }

    return {
        ...summary,
        tokenImageUrl: selectedUrl,
        savedTokenItem: updatedSavedTokenItem,
        fullMetadata: updatedFullMetadata,
        mapTokenId: targetTokenId || summary.mapTokenId,
        isOnMap
    };
}
