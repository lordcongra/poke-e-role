import { useEffect, useState } from 'react';
import { isStandaloneMode } from '../../utils/storageAdapter';
import { imageManager } from '../../utils/imageManager';
import { extractTokenImage } from '../../utils/initiativeHelpers';
import { File } from 'lucide-react';

interface SidebarAvatarProps {
    meta?: Record<string, unknown>;
}

export function SidebarAvatar({ meta }: SidebarAvatarProps) {
    const [resolvedImage, setResolvedImage] = useState<string>('');

    useEffect(() => {
        let isMounted = true;

        const resolveImage = async () => {
            const imageString = extractTokenImage(meta);

            if (!imageString) {
                if (isMounted) setResolvedImage('');
                return;
            }

            if (isStandaloneMode && imageString.startsWith('local-img:')) {
                try {
                    const url = await imageManager.getImageUrl(imageString);
                    if (isMounted) setResolvedImage(url || '');
                } catch (error) {
                    console.warn('[SidebarAvatar] Failed to resolve local image:', error);
                    if (isMounted) setResolvedImage('');
                }
            } else {
                if (isMounted) setResolvedImage(imageString);
            }
        };

        resolveImage();
        return () => {
            isMounted = false;
        };
    }, [meta]);

    if (!resolvedImage) {
        return (
            <span
                className="sidebar__item-icon"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
                <File size={16} color="var(--text-muted)" />
            </span>
        );
    }

    return <img src={resolvedImage} alt="Character Avatar" className="sidebar__item-avatar" loading="lazy" />;
}
