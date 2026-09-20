export interface VisualBounds {
    bottomFraction: number;
    contentWidthFraction: number;
}

const boundsCache = new Map<string, Promise<VisualBounds | null>>();
const resolvedBoundsCache = new Map<string, VisualBounds>();

export function getCachedVisualBounds(url: string): VisualBounds | null {
    return resolvedBoundsCache.get(url) || null;
}

/**
 * Inspects the transparent pixels of a token image URL using an offscreen canvas
 * to determine:
 * 1. bottomFraction: where the lowest non-transparent pixel is located vertically (0 to 1).
 * 2. contentWidthFraction: the proportion of width actually occupied by visible pixels.
 *
 * This allows automatic placement right under character feet and correct grid-square
 * sizing for sprites with transparent canvas margins (such as Pikachu and Cyndaquil).
 */
export function detectImageVisualBounds(url: string): Promise<VisualBounds | null> {
    if (!url || typeof document === 'undefined') return Promise.resolve(null);

    const cached = boundsCache.get(url);
    if (cached) return cached;

    const promise = new Promise<VisualBounds | null>((resolve) => {
        try {
            const img = new Image();
            img.crossOrigin = 'anonymous';

            const timer = setTimeout(() => {
                resolve(null);
            }, 3000);

            img.onload = () => {
                clearTimeout(timer);
                try {
                    const width = img.naturalWidth || img.width;
                    const height = img.naturalHeight || img.height;
                    if (!width || !height) {
                        resolve(null);
                        return;
                    }

                    // Downsample large images to max 256px for lightning-fast scanning
                    const sampleWidth = Math.min(width, 256);
                    const sampleHeight = Math.min(height, 256);

                    const canvas = document.createElement('canvas');
                    canvas.width = sampleWidth;
                    canvas.height = sampleHeight;
                    const ctx = canvas.getContext('2d', { willReadFrequently: true });
                    if (!ctx) {
                        resolve(null);
                        return;
                    }

                    ctx.drawImage(img, 0, 0, sampleWidth, sampleHeight);
                    const imageData = ctx.getImageData(0, 0, sampleWidth, sampleHeight);
                    const data = imageData.data;

                    let minX = sampleWidth;
                    let maxX = 0;
                    let maxY = 0;
                    let found = false;

                    for (let y = 0; y < sampleHeight; y++) {
                        const rowStart = y * sampleWidth * 4;
                        for (let x = 0; x < sampleWidth; x++) {
                            const alpha = data[rowStart + x * 4 + 3];
                            if (alpha > 20) {
                                found = true;
                                if (x < minX) minX = x;
                                if (x > maxX) maxX = x;
                                if (y > maxY) maxY = y;
                            }
                        }
                    }

                    if (!found) {
                        const result = { bottomFraction: 1.0, contentWidthFraction: 1.0 };
                        resolvedBoundsCache.set(url, result);
                        resolve(result);
                        return;
                    }

                    const bottomFraction = (maxY + 1) / sampleHeight;
                    const contentWidthFraction = Math.max(0.1, (maxX - minX + 1) / sampleWidth);
                    const result = { bottomFraction, contentWidthFraction };
                    resolvedBoundsCache.set(url, result);
                    resolve(result);
                } catch {
                    // Gracefully fallback on any canvas or security/CORS error
                    resolve(null);
                }
            };

            img.onerror = () => {
                clearTimeout(timer);
                resolve(null);
            };

            img.src = url;
        } catch {
            resolve(null);
        }
    });

    boundsCache.set(url, promise);
    return promise;
}
