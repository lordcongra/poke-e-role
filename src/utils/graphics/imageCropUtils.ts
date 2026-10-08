/**
 * Utility to detect the bounding box of non-transparent pixels in an image URL,
 * and dynamically crop away transparent margins using an offscreen canvas.
 * This makes character sprites with large transparent margins fill their icon containers cleanly.
 */

const croppedCache = new Map<string, Promise<string>>();

export async function cropImageTransparencyUrl(url: string, square = true): Promise<string> {
    if (!url || typeof document === 'undefined') return url;

    // Do not attempt to pixel-scan SVG icons (like pokeball-token.svg or pokeball.svg) or empty strings
    if (
        url.endsWith('.svg') ||
        url.includes('pokeball.svg') ||
        url.includes('pokeball-token.svg') ||
        url.startsWith('data:image/svg+xml')
    ) {
        return url;
    }

    if (croppedCache.has(url)) {
        return croppedCache.get(url)!;
    }

    const promise = new Promise<string>((resolve) => {
        try {
            const img = new Image();
            img.crossOrigin = 'anonymous';

            // Safety timeout: if image takes >2.5s to load, return original URL
            const timer = setTimeout(() => {
                resolve(url);
            }, 2500);

            img.onload = () => {
                clearTimeout(timer);
                try {
                    const width = img.naturalWidth || img.width;
                    const height = img.naturalHeight || img.height;
                    if (!width || !height) {
                        resolve(url);
                        return;
                    }

                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d', { willReadFrequently: true });
                    if (!ctx) {
                        resolve(url);
                        return;
                    }

                    ctx.drawImage(img, 0, 0);
                    const imageData = ctx.getImageData(0, 0, width, height);
                    const data = imageData.data;

                    let top: number | null = null;
                    let bottom: number | null = null;
                    let left: number | null = null;
                    let right: number | null = null;

                    for (let y = 0; y < height; y++) {
                        const rowOffset = y * width * 4;
                        for (let x = 0; x < width; x++) {
                            const alpha = data[rowOffset + x * 4 + 3];
                            if (alpha > 15) {
                                if (top === null) top = y;
                                bottom = y;
                                if (left === null || x < left) left = x;
                                if (right === null || x > right) right = x;
                            }
                        }
                    }

                    // If empty or non-transparent bounds not found, return original
                    if (top === null || bottom === null || left === null || right === null) {
                        resolve(url);
                        return;
                    }

                    const contentWidth = right - left + 1;
                    const contentHeight = bottom - top + 1;

                    // If content already fills >92% of the canvas, no cropping needed
                    if (contentWidth >= width * 0.92 && contentHeight >= height * 0.92) {
                        resolve(url);
                        return;
                    }

                    // Add a tasteful 10% padding margin so the sprite breathes naturally without edge distortion
                    const padding = Math.max(2, Math.round(Math.max(contentWidth, contentHeight) * 0.1));

                    let cropW: number;
                    let cropH: number;
                    let destX: number;
                    let destY: number;

                    if (square) {
                        const maxDim = Math.max(contentWidth, contentHeight);
                        cropW = maxDim + padding * 2;
                        cropH = maxDim + padding * 2;
                        destX = padding + Math.round((maxDim - contentWidth) / 2);
                        destY = padding + Math.round((maxDim - contentHeight) / 2);
                    } else {
                        cropW = contentWidth + padding * 2;
                        cropH = contentHeight + padding * 2;
                        destX = padding;
                        destY = padding;
                    }

                    const cropCanvas = document.createElement('canvas');
                    cropCanvas.width = cropW;
                    cropCanvas.height = cropH;
                    const cropCtx = cropCanvas.getContext('2d');
                    if (!cropCtx) {
                        resolve(url);
                        return;
                    }

                    cropCtx.drawImage(
                        canvas,
                        left,
                        top,
                        contentWidth,
                        contentHeight,
                        destX,
                        destY,
                        contentWidth,
                        contentHeight
                    );

                    const croppedDataUrl = cropCanvas.toDataURL('image/png');
                    resolve(croppedDataUrl);
                } catch {
                    // Graceful fallback for cross-origin or canvas security errors
                    resolve(url);
                }
            };

            img.onerror = () => {
                clearTimeout(timer);
                resolve(url);
            };

            img.src = url;
        } catch {
            resolve(url);
        }
    });

    croppedCache.set(url, promise);
    return promise;
}
