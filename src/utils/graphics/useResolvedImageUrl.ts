import { useEffect, useState } from 'react';
import { imageManager } from './imageManager';
import { cropImageTransparencyUrl } from './imageCropUtils';

/**
 * Resolves a token/avatar image URL.
 * If the URL is an IndexedDB reference ('local-img:'), it fetches the Blob from IndexedDB
 * and returns a temporary blob URL for the browser to render.
 * When autoCrop is true (default), automatically trims transparent canvas margins around
 * Pokémon sprites using offscreen canvas scanning so sprites cleanly fill their icon boxes.
 * Otherwise, returns the raw URL or fallback directly.
 */
export function useResolvedImageUrl(rawUrl?: string | null, fallback?: string, autoCrop = true): string {
    const isUnsafeFile = (url?: string | null) => !url || url.startsWith('file:') || url.startsWith('file:///');

    const [resolvedUrl, setResolvedUrl] = useState<string>(() => {
        if (isUnsafeFile(rawUrl)) return fallback || '';
        if (rawUrl!.startsWith('local-img:')) return fallback || '';
        return rawUrl!;
    });

    useEffect(() => {
        let mounted = true;
        let activeBlobUrl: string | null = null;

        const revokeBlobUrl = (url: string | null) => {
            if (url && url.startsWith('blob:')) {
                URL.revokeObjectURL(url);
            }
        };

        const processUrl = async (url: string) => {
            if (!url) {
                if (mounted) setResolvedUrl(fallback || '');
                return;
            }
            if (
                autoCrop &&
                !url.endsWith('.svg') &&
                !url.includes('pokeball.svg') &&
                !url.includes('pokeball-token.svg') &&
                !url.startsWith('data:image/svg+xml')
            ) {
                try {
                    const cropped = await cropImageTransparencyUrl(url, true);
                    if (mounted) {
                        const nextUrl = cropped || url;
                        setResolvedUrl(nextUrl);
                        if (nextUrl !== url && url.startsWith('blob:')) {
                            revokeBlobUrl(url);
                            if (activeBlobUrl === url) activeBlobUrl = null;
                        }
                    }
                    return;
                } catch {
                    // Fallback to uncropped url on error
                }
            }
            if (mounted) setResolvedUrl(url);
        };

        if (isUnsafeFile(rawUrl)) {
            setResolvedUrl(fallback || '');
            return;
        }

        if (rawUrl!.startsWith('local-img:')) {
            imageManager
                .getImageUrl(rawUrl!)
                .then((url) => {
                    if (!mounted) {
                        revokeBlobUrl(url);
                        return;
                    }
                    if (url) {
                        if (activeBlobUrl && activeBlobUrl !== url) {
                            revokeBlobUrl(activeBlobUrl);
                        }
                        activeBlobUrl = url.startsWith('blob:') ? url : null;
                        processUrl(url);
                    } else {
                        setResolvedUrl(fallback || '');
                    }
                })
                .catch(() => {
                    if (mounted) {
                        setResolvedUrl(fallback || '');
                    }
                });
        } else {
            processUrl(rawUrl!);
        }

        return () => {
            mounted = false;
            revokeBlobUrl(activeBlobUrl);
            activeBlobUrl = null;
        };
    }, [rawUrl, fallback, autoCrop]);

    return resolvedUrl;
}
