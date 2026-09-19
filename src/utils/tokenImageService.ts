import OBR, { type ImageDownload } from '@owlbear-rodeo/sdk';
import { imageManager, autoCropTransparency } from './imageManager';
import { saveToOwlbear, METADATA_ID } from './obr';
import { buildGraphicsFromMeta, renderTokenGraphics } from './graphicsManager';

/**
 * Updates an Owlbear Rodeo token image by opening the OBR asset browser or prompt,
 * adjusting scale/offset/dpi, and re-rendering token graphics.
 */
export async function updateObrTokenImage(
    tokenId: string,
    setIdentity: (field: 'tokenImageUrl', value: string) => void
): Promise<void> {
    if (!OBR.isAvailable || !tokenId) {
        const url = window.prompt('Enter an Image URL:');
        if (url) {
            setIdentity('tokenImageUrl', url);
        }
        return;
    }

    try {
        let images: ImageDownload[] | null = null;

        if (typeof OBR.assets?.downloadImages === 'function') {
            images = await OBR.assets.downloadImages();
        } else {
            const url = window.prompt('Enter an Image URL:');
            if (url) {
                setIdentity('tokenImageUrl', url);
                saveToOwlbear({ 'token-image-url': url });
                const dim = await measureImageDimensions(url);
                await updateSceneItemImage(tokenId, url, dim.width, dim.height);
            }
            return;
        }

        if (images && images.length > 0) {
            const img = images[0];
            const selectedUrl = img.image?.url || '';
            let selectedWidth = img.image?.width || 0;
            let selectedHeight = img.image?.height || 0;

            if (selectedUrl) {
                setIdentity('tokenImageUrl', selectedUrl);
                saveToOwlbear({ 'token-image-url': selectedUrl });

                if (!selectedWidth || !selectedHeight) {
                    const dim = await measureImageDimensions(selectedUrl);
                    selectedWidth = dim.width;
                    selectedHeight = dim.height;
                }

                await updateSceneItemImage(tokenId, selectedUrl, selectedWidth, selectedHeight);
            } else if (OBR.isAvailable) {
                OBR.notification.show('Could not extract URL. Please check F12 Console!', 'ERROR');
            }
        }
    } catch (error) {
        console.error('[tokenImageService] Failed to pick manual token image:', error);
    }
}

/**
 * Saves a standalone local file to IndexedDB with transparency auto-crop.
 */
export async function saveStandaloneTokenFile(
    file: File,
    tokenId: string | null,
    currentImageUrl: string,
    setIdentity: (field: 'tokenImageUrl', value: string) => void
): Promise<void> {
    const croppedBlob = await autoCropTransparency(file);
    const croppedFile = new File([croppedBlob], file.name, { type: croppedBlob.type });
    const imgId = await imageManager.saveImage(croppedFile);

    if (currentImageUrl && currentImageUrl.startsWith('local-img:')) {
        await imageManager.deleteImage(currentImageUrl, tokenId || undefined);
    }

    setIdentity('tokenImageUrl', imgId);
    saveToOwlbear({ 'token-image-url': imgId });
}

/**
 * Saves a standalone web image URL.
 */
export async function saveStandaloneTokenUrl(
    url: string,
    tokenId: string | null,
    currentImageUrl: string,
    setIdentity: (field: 'tokenImageUrl', value: string) => void
): Promise<void> {
    if (currentImageUrl && currentImageUrl.startsWith('local-img:')) {
        await imageManager.deleteImage(currentImageUrl, tokenId || undefined);
    }

    setIdentity('tokenImageUrl', url);
    try {
        saveToOwlbear({ 'token-image-url': url });
    } catch (e) {
        console.error('[tokenImageService] Failed to save token image URL to Owlbear:', e);
    }
}

/**
 * Deletes current avatar from storage and IndexedDB.
 */
export async function deleteStandaloneTokenImage(
    tokenId: string | null,
    currentImageUrl: string,
    setIdentity: (field: 'tokenImageUrl', value: string) => void
): Promise<void> {
    if (currentImageUrl && currentImageUrl.startsWith('local-img:')) {
        try {
            await imageManager.deleteImage(currentImageUrl, tokenId || undefined);
        } catch (error) {
            console.error('[tokenImageService] Failed to delete image from IndexedDB:', error);
        }
    }

    setIdentity('tokenImageUrl', '');
    try {
        saveToOwlbear({ 'token-image-url': '' });
        window.dispatchEvent(new Event('pkr-character-list-update'));
    } catch (error) {
        console.error('[tokenImageService] Failed to clear token image URL in storage:', error);
    }
}

/**
 * Helper to measure natural dimensions of an image URL.
 */
function measureImageDimensions(url: string): Promise<{ width: number; height: number }> {
    return new Promise((resolve) => {
        const domImg = new window.Image();
        domImg.onload = () => resolve({ width: domImg.naturalWidth || 300, height: domImg.naturalHeight || 300 });
        domImg.onerror = () => resolve({ width: 300, height: 300 });
        domImg.src = url;
    });
}

/**
 * Helper to update OBR scene item image properties and re-render token graphics.
 */
async function updateSceneItemImage(tokenId: string, url: string, width: number, height: number): Promise<void> {
    await OBR.scene.items.updateItems([tokenId], (items) => {
        for (const item of items) {
            const imgItem = item as Record<string, unknown>;
            if (imgItem.image) {
                const imageRecord = imgItem.image as Record<string, unknown>;
                imageRecord.url = url;
                imageRecord.width = width;
                imageRecord.height = height;

                const imgGrid = (item as Record<string, unknown>).grid as Record<string, unknown> | undefined;
                if (imgGrid) {
                    imgGrid.dpi = width;
                    imgGrid.offset = {
                        x: width / 2,
                        y: height / 2
                    };
                }

                const signX = (item.scale.x || 1) < 0 ? -1 : 1;
                const signY = (item.scale.y || 1) < 0 ? -1 : 1;
                item.scale.x = signX;
                item.scale.y = signY;
            }
        }
    });

    const updatedItems = await OBR.scene.items.getItems([tokenId]);
    if (updatedItems.length > 0) {
        const meta = (updatedItems[0].metadata[METADATA_ID] as Record<string, unknown>) || {};
        const gData = buildGraphicsFromMeta(meta);
        const currentRole = await OBR.player.getRole();
        await renderTokenGraphics(updatedItems[0], gData, currentRole, true);
    }
}
