import { useEffect, useState } from 'react';
import { useCharacterStore } from '../../store/useCharacterStore';
import { imageManager } from '../../utils/imageManager';
import './StandaloneAvatar.css';

export function StandaloneAvatar() {
    const tokenImageUrl = useCharacterStore((state) => state.identity.tokenImageUrl);
    const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;

        const fetchImage = async () => {
            if (!tokenImageUrl) {
                setResolvedUrl(null);
                return;
            }

            try {
                // If it's an IndexedDB ID, this converts it to a temporary blob URL.
                // If it's a standard web URL, it passes it straight through!
                const url = await imageManager.getImageUrl(tokenImageUrl);
                if (isMounted) setResolvedUrl(url);
            } catch (error) {
                console.error('[StandaloneAvatar] Failed to load image', error);
                if (isMounted) setResolvedUrl(null);
            }
        };

        fetchImage();

        return () => {
            isMounted = false;
        };
    }, [tokenImageUrl]);

    return (
        <div className="standalone-avatar">
            {resolvedUrl ? (
                <img src={resolvedUrl} alt="Character Portrait" className="standalone-avatar__img" />
            ) : (
                <div className="standalone-avatar__placeholder">
                    {/* Fallback to the pokeball.svg in your public folder */}
                    <img
                        src={`${import.meta.env.BASE_URL || '/'}pokeball.svg`}
                        alt="No Image"
                        className="standalone-avatar__fallback-icon"
                    />
                </div>
            )}
        </div>
    );
}
