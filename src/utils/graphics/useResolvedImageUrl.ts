import { useEffect, useState } from 'react';
import { imageManager } from './imageManager';

/**
 * Resolves a token/avatar image URL.
 * If the URL is an IndexedDB reference ('local-img:'), it fetches the Blob from IndexedDB
 * and returns a temporary blob URL for the browser to render.
 * Otherwise, returns the raw URL or fallback directly.
 */
export function useResolvedImageUrl(rawUrl?: string | null, fallback?: string): string {
    const isUnsafeFile = (url?: string | null) => !url || url.startsWith('file:') || url.startsWith('file:///');

    const [resolvedUrl, setResolvedUrl] = useState<string>(() => {
        if (isUnsafeFile(rawUrl)) return fallback || '';
        if (rawUrl!.startsWith('local-img:')) return fallback || '';
        return rawUrl!;
    });

    useEffect(() => {
        let mounted = true;

        if (isUnsafeFile(rawUrl)) {
            setResolvedUrl(fallback || '');
            return;
        }

        if (rawUrl!.startsWith('local-img:')) {
            imageManager
                .getImageUrl(rawUrl!)
                .then((url) => {
                    if (mounted) {
                        setResolvedUrl(url || fallback || '');
                    }
                })
                .catch(() => {
                    if (mounted) {
                        setResolvedUrl(fallback || '');
                    }
                });
        } else {
            setResolvedUrl(rawUrl!);
        }

        return () => {
            mounted = false;
        };
    }, [rawUrl, fallback]);

    return resolvedUrl;
}
